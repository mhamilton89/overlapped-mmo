const config = require('../../config');
const { distance2D } = require('../../utils/coords');
const inventoryQueries = require('../../db/queries/inventory');

class LootSystem {
    constructor(world) {
        this.world = world;
    }

    async handlePickup(player, lootId) {
        const loot = this.world.loot.get(lootId);
        if (!loot) {
            player.send({ type: 'error', message: 'Loot not found' });
            return;
        }

        // Check ownership
        if (loot.ownerId !== player.characterId) {
            player.send({ type: 'error', message: 'Not your loot' });
            return;
        }

        // Check proximity
        const dist = distance2D(player.x, player.y, loot.x, loot.y);
        if (dist > config.LOOT_PICKUP_RANGE) {
            player.send({ type: 'error', message: 'Too far from loot' });
            return;
        }

        // Add items to inventory
        for (const item of loot.items) {
            try {
                await inventoryQueries.addItem(player.characterId, item.itemKey, item.quantity);
            } catch (err) {
                console.error('[Loot] Error adding item:', err);
            }
        }

        // Add gold
        if (loot.gold > 0) {
            player.gold += loot.gold;
            player.dirty = true;
        }

        // Remove loot
        this.world.loot.delete(lootId);

        // Notify player
        player.send({
            type: 'lootPickup',
            lootId,
            items: loot.items,
            gold: loot.gold,
            totalGold: player.gold,
        });

        // Send updated inventory
        const inventory = await inventoryQueries.getInventory(player.characterId);
        player.send({
            type: 'inventoryUpdate',
            inventory,
        });

        // Send updated stats (gold changed)
        player.send({
            type: 'playerStats',
            hp: player.currentHp,
            maxHp: player.maxHp,
            mana: Math.floor(player.currentMana),
            maxMana: player.maxMana,
            xp: player.xp,
            level: player.level,
            gold: player.gold,
            powerStacks: player.powerStacks,
        });

        console.log(`[Loot] ${player.name} picked up ${loot.items.length} items + ${loot.gold} gold`);
    }

    update(deltaMs) {
        // Despawn old loot
        const now = Date.now();
        for (const [id, loot] of this.world.loot) {
            if (now - loot.createdAt >= config.LOOT_DESPAWN_MS) {
                this.world.loot.delete(id);
                this.world.broadcast({
                    type: 'lootDespawned',
                    lootId: id,
                });
            }
        }
    }
}

module.exports = LootSystem;
