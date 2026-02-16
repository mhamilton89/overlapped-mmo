const { distance2D } = require('../../utils/coords');

class EnemySystem {
    constructor(world) {
        this.world = world;
        this.batchTimer = 0;
        this.BATCH_INTERVAL = 100; // Send enemy updates every 100ms
    }

    update(deltaMs) {
        const deltaSec = deltaMs / 1000;

        for (const enemy of this.world.enemies.values()) {
            if (!enemy.alive) {
                // Check respawn timer
                if (enemy.respawnTimer && Date.now() >= enemy.respawnTimer) {
                    this.respawnEnemy(enemy);
                }
                continue;
            }

            this.updateEnemy(enemy, deltaSec);
        }

        // Batch broadcast enemy positions
        this.batchTimer += deltaMs;
        if (this.batchTimer >= this.BATCH_INTERVAL) {
            this.batchTimer = 0;
            this.broadcastEnemyUpdates();
        }
    }

    updateEnemy(enemy, deltaSec) {
        switch (enemy.state) {
            case 'idle':
                this.stateIdle(enemy, deltaSec);
                break;
            case 'wander':
                this.stateWander(enemy, deltaSec);
                break;
            case 'chase':
                this.stateChase(enemy, deltaSec);
                break;
            case 'attack':
                this.stateAttack(enemy, deltaSec);
                break;
            case 'return':
                this.stateReturn(enemy, deltaSec);
                break;
        }
    }

    stateIdle(enemy, deltaSec) {
        // Check for players in aggro range
        const target = this.findNearestPlayer(enemy);
        if (target) {
            enemy.target = target.characterId;
            enemy.state = 'chase';
            return;
        }

        // Random chance to wander
        enemy.stateTimer += deltaSec;
        if (enemy.stateTimer > 3 + Math.random() * 4) {
            enemy.stateTimer = 0;
            const angle = Math.random() * Math.PI * 2;
            const dist = 2 + Math.random() * 3;
            enemy.wanderTarget = {
                x: enemy.spawnX + Math.cos(angle) * dist,
                y: enemy.spawnY + Math.sin(angle) * dist,
            };
            enemy.state = 'wander';
        }
    }

    stateWander(enemy, deltaSec) {
        // Check for aggro
        const target = this.findNearestPlayer(enemy);
        if (target) {
            enemy.target = target.characterId;
            enemy.state = 'chase';
            return;
        }

        // Move toward wander target
        if (enemy.wanderTarget) {
            const moved = this.moveToward(enemy, enemy.wanderTarget.x, enemy.wanderTarget.y, enemy.moveSpeed * 0.5, deltaSec);
            if (moved) {
                enemy.wanderTarget = null;
                enemy.state = 'idle';
                enemy.stateTimer = 0;
            }
        } else {
            enemy.state = 'idle';
            enemy.stateTimer = 0;
        }
    }

    stateChase(enemy, deltaSec) {
        const target = this.world.getPlayerByCharacterId(enemy.target);

        // Lost target
        if (!target || !target.isAlive()) {
            enemy.target = null;
            enemy.state = 'return';
            return;
        }

        // Check leash range
        const distFromSpawn = distance2D(enemy.x, enemy.y, enemy.spawnX, enemy.spawnY);
        if (distFromSpawn > enemy.chaseRange) {
            enemy.target = null;
            enemy.state = 'return';
            return;
        }

        // Move toward target
        const distToTarget = distance2D(enemy.x, enemy.y, target.x, target.y);

        if (distToTarget <= enemy.meleeRange) {
            enemy.state = 'attack';
            enemy.attackTimer = 0;
        } else {
            this.moveToward(enemy, target.x, target.y, enemy.moveSpeed, deltaSec);
        }
    }

    stateAttack(enemy, deltaSec) {
        const target = this.world.getPlayerByCharacterId(enemy.target);

        if (!target || !target.isAlive()) {
            enemy.target = null;
            enemy.state = 'return';
            return;
        }

        const dist = distance2D(enemy.x, enemy.y, target.x, target.y);

        // Target moved out of range
        if (dist > enemy.meleeRange + 1) {
            enemy.state = 'chase';
            return;
        }

        // Attack on cooldown
        enemy.attackTimer += deltaSec * 1000;
        if (enemy.attackTimer >= enemy.attackSpeed) {
            enemy.attackTimer = 0;

            // Deal damage
            const variance = 0.8 + Math.random() * 0.4;
            const damage = Math.floor(enemy.damage * variance);
            const result = target.takeDamage(damage);

            // Notify the target
            target.send({
                type: 'damageDealt',
                attackerId: enemy.id,
                targetId: target.characterId,
                damage: result.damage,
                targetHp: target.currentHp,
                attackerType: 'enemy',
            });

            // Send updated stats
            target.send({
                type: 'playerStats',
                hp: target.currentHp,
                maxHp: target.maxHp,
                mana: Math.floor(target.currentMana),
                maxMana: target.maxMana,
                xp: target.xp,
                level: target.level,
                gold: target.gold,
                powerStacks: target.powerStacks,
            });

            if (result.died) {
                // Player died - enemy returns
                enemy.target = null;
                enemy.state = 'return';

                target.send({
                    type: 'playerDeath',
                    killerId: enemy.id,
                    killerName: enemy.name,
                });
            }
        }
    }

    stateReturn(enemy, deltaSec) {
        const arrived = this.moveToward(enemy, enemy.spawnX, enemy.spawnY, enemy.moveSpeed, deltaSec);

        // Regen HP while returning
        enemy.hp = Math.min(enemy.maxHp, enemy.hp + enemy.maxHp * 0.1 * deltaSec);

        if (arrived) {
            enemy.hp = enemy.maxHp;
            enemy.state = 'idle';
            enemy.stateTimer = 0;
        }
    }

    moveToward(enemy, targetX, targetY, speed, deltaSec) {
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) return true; // Arrived

        const moveAmount = speed * deltaSec;
        if (moveAmount >= dist) {
            enemy.x = targetX;
            enemy.y = targetY;
            return true;
        }

        enemy.x += (dx / dist) * moveAmount;
        enemy.y += (dy / dist) * moveAmount;
        return false;
    }

    findNearestPlayer(enemy) {
        let nearest = null;
        let nearestDist = enemy.aggroRange;

        for (const player of this.world.players.values()) {
            if (!player.isAlive()) continue;
            const dist = distance2D(enemy.x, enemy.y, player.x, player.y);
            if (dist < nearestDist) {
                nearest = player;
                nearestDist = dist;
            }
        }
        return nearest;
    }

    respawnEnemy(enemy) {
        enemy.alive = true;
        enemy.hp = enemy.maxHp;
        enemy.x = enemy.spawnX;
        enemy.y = enemy.spawnY;
        enemy.state = 'idle';
        enemy.stateTimer = 0;
        enemy.target = null;
        enemy.respawnTimer = null;

        this.world.broadcast({
            type: 'enemyRespawned',
            id: enemy.id,
            name: enemy.name,
            level: enemy.level,
            x: enemy.x,
            y: enemy.y,
            hp: enemy.hp,
            maxHp: enemy.maxHp,
        });

        console.log(`[Enemy] ${enemy.name} respawned at (${enemy.x}, ${enemy.y})`);
    }

    broadcastEnemyUpdates() {
        const updates = [];
        for (const enemy of this.world.enemies.values()) {
            if (!enemy.alive) continue;
            updates.push({
                id: enemy.id,
                x: enemy.x,
                y: enemy.y,
                hp: enemy.hp,
                maxHp: enemy.maxHp,
                state: enemy.state,
            });
        }

        if (updates.length > 0) {
            this.world.broadcast({
                type: 'enemyUpdate',
                enemies: updates,
            });
        }
    }
}

module.exports = EnemySystem;
