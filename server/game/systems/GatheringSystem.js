const config = require('../../config');
const { distance2D } = require('../../utils/coords');
const { scaleXp } = require('../../utils/stats');
const inventoryQueries = require('../../db/queries/inventory');

class GatheringSystem {
    constructor(world) {
        this.world = world;
    }

    handleGatherStart(player, resourceId) {
        if (!player.isAlive()) {
            player.send({ type: 'error', message: 'Cannot gather while dead' });
            return;
        }

        if (player.gatherState) {
            player.send({ type: 'error', message: 'Already gathering' });
            return;
        }

        const resource = this.world.resources.get(resourceId);
        if (!resource) {
            player.send({ type: 'error', message: 'Resource not found' });
            return;
        }

        if (!resource.available) {
            player.send({ type: 'error', message: 'Resource is depleted' });
            return;
        }

        // Validate distance
        const dist = distance2D(player.x, player.y, resource.x, resource.y);
        if (dist > config.GATHER_RANGE) {
            player.send({ type: 'error', message: 'Too far from resource' });
            return;
        }

        // Start gathering
        player.gatherState = {
            resourceId,
            startTime: Date.now(),
            hitsCompleted: 0,
            lastHitTime: Date.now(),
        };

        player.send({
            type: 'gatherProgress',
            resourceId,
            hit: 0,
            totalHits: resource.hitsRequired,
            progress: 0,
        });
    }

    handleGatherCancel(player) {
        if (player.gatherState) {
            player.gatherState = null;
            player.send({ type: 'gatherCancelled' });
        }
    }

    update(deltaMs) {
        for (const player of this.world.players.values()) {
            if (!player.gatherState) continue;

            const state = player.gatherState;
            const resource = this.world.resources.get(state.resourceId);

            // Resource gone or depleted while gathering
            if (!resource || !resource.available) {
                player.gatherState = null;
                player.send({ type: 'gatherCancelled' });
                continue;
            }

            // Check if player moved too far
            const dist = distance2D(player.x, player.y, resource.x, resource.y);
            if (dist > config.GATHER_RANGE + 1) {
                player.gatherState = null;
                player.send({ type: 'gatherCancelled' });
                continue;
            }

            // Check if enough time has passed for a hit
            const elapsed = Date.now() - state.lastHitTime;
            if (elapsed >= resource.gatherTimeMs) {
                state.hitsCompleted++;
                state.lastHitTime = Date.now();

                if (state.hitsCompleted >= resource.hitsRequired) {
                    // Gathering complete
                    this.completeGather(player, resource);
                } else {
                    // Send progress
                    player.send({
                        type: 'gatherProgress',
                        resourceId: resource.id,
                        hit: state.hitsCompleted,
                        totalHits: resource.hitsRequired,
                        progress: state.hitsCompleted / resource.hitsRequired,
                    });
                }
            }
        }

        // Check resource respawn timers
        for (const resource of this.world.resources.values()) {
            if (!resource.available && resource.respawnTimer && Date.now() >= resource.respawnTimer) {
                resource.available = true;
                resource.respawnTimer = null;
                this.world.broadcast({
                    type: 'resourceRespawned',
                    resourceId: resource.id,
                });
                console.log(`[Gather] Resource ${resource.id} respawned`);
            }
        }
    }

    async completeGather(player, resource) {
        // Calculate yields
        const items = [];
        for (const yieldDef of resource.yields) {
            // Skip yield if it has a chance roll and fails
            if (yieldDef.chance !== undefined && Math.random() > yieldDef.chance) continue;

            const quantity = Math.floor(Math.random() * (yieldDef.max - yieldDef.min + 1)) + yieldDef.min;
            items.push({ key: yieldDef.itemKey, quantity });

            // Add to inventory in DB
            try {
                await inventoryQueries.addItem(player.characterId, yieldDef.itemKey, quantity);
            } catch (err) {
                console.error('[Gather] Error adding item:', err);
            }
        }

        // Award XP
        const xp = scaleXp(resource.xpReward, player.level, 1);
        let leveledUp = false;
        if (xp > 0) {
            const result = player.awardXp(xp);
            leveledUp = result.leveledUp;
        }

        // Clear gather state
        player.gatherState = null;

        // Send completion
        player.send({
            type: 'gatherComplete',
            resourceId: resource.id,
            items,
            xp,
        });

        if (leveledUp) {
            player.send({
                type: 'levelUp',
                level: player.level,
                stats: player.toSelfData(),
            });
        }

        // Send updated stats
        player.send({
            type: 'playerStats',
            hp: player.currentHp,
            maxHp: player.maxHp,
            mana: player.currentMana,
            maxMana: player.maxMana,
            xp: player.xp,
            level: player.level,
            gold: player.gold,
            powerStacks: player.powerStacks,
        });

        // Deplete resource
        resource.available = false;
        resource.respawnTimer = Date.now() + resource.respawnMs;

        this.world.broadcast({
            type: 'resourceDepleted',
            resourceId: resource.id,
        });

        console.log(`[Gather] ${player.name} gathered ${resource.name} → ${items.map(i => `${i.key} x${i.quantity}`).join(', ')}`);
    }
}

module.exports = GatheringSystem;
