const config = require('../../config');
const { distance2D } = require('../../utils/coords');
const { scaleXp } = require('../../utils/stats');

class CombatSystem {
    constructor(world) {
        this.world = world;
    }

    handleAttack(player, message) {
        if (!player.isAlive()) {
            player.send({ type: 'error', message: 'Cannot attack while dead' });
            return;
        }

        // Cancel gathering
        if (player.gatherState) {
            player.gatherState = null;
            player.send({ type: 'gatherCancelled' });
        }

        switch (message.type) {
            case 'attack':
                this.handleMeleeAttack(player, message.targetId);
                break;
            case 'spenderAttack':
                this.handleSpenderAttack(player, message.targetId);
                break;
            case 'projectileAttack':
                this.handleProjectileAttack(player, message.targetId);
                break;
        }
    }

    handleMeleeAttack(player, targetId) {
        if (!player.canMeleeAttack()) {
            player.send({ type: 'error', message: 'Attack on cooldown' });
            return;
        }

        const enemy = this.world.enemies.get(targetId);
        if (!enemy || !enemy.alive) {
            player.send({ type: 'error', message: 'Invalid target' });
            return;
        }

        // Range check
        const dist = distance2D(player.x, player.y, enemy.x, enemy.y);
        if (dist > config.MELEE_RANGE + 0.5) {
            player.send({ type: 'error', message: 'Out of range' });
            return;
        }

        // Calculate damage
        const variance = 1 - config.DAMAGE_VARIANCE + Math.random() * config.DAMAGE_VARIANCE * 2;
        const damage = Math.max(1, Math.floor(player.attack * variance));

        // Apply damage
        enemy.hp -= damage;
        player.lastAttackTime = Date.now();
        player.lastCombatTime = Date.now();

        // Build power stack
        if (player.powerStacks < config.MAX_POWER_STACKS) {
            player.powerStacks++;
        }

        // Aggro the enemy
        if (enemy.state !== 'return') {
            enemy.target = player.characterId;
            if (enemy.state === 'idle' || enemy.state === 'wander') {
                enemy.state = 'chase';
            }
        }

        // Broadcast damage
        this.world.broadcast({
            type: 'damageDealt',
            attackerId: player.characterId,
            targetId: enemy.id,
            damage,
            targetHp: Math.max(0, enemy.hp),
            attackerType: 'player',
        });

        // Update player stats (power stacks changed)
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

        // Check enemy death
        if (enemy.hp <= 0) {
            this.handleEnemyDeath(enemy, player);
        }
    }

    handleSpenderAttack(player, targetId) {
        if (player.powerStacks < 1) {
            player.send({ type: 'error', message: 'No power stacks' });
            return;
        }

        const enemy = this.world.enemies.get(targetId);
        if (!enemy || !enemy.alive) {
            player.send({ type: 'error', message: 'Invalid target' });
            return;
        }

        const dist = distance2D(player.x, player.y, enemy.x, enemy.y);
        if (dist > config.MELEE_RANGE + 0.5) {
            player.send({ type: 'error', message: 'Out of range' });
            return;
        }

        // Consume all stacks, deal hits equal to stacks
        const stacks = player.powerStacks;
        player.powerStacks = 0;
        player.lastAttackTime = Date.now();
        player.lastCombatTime = Date.now();

        let totalDamage = 0;
        for (let i = 0; i < stacks; i++) {
            const variance = 1 - config.DAMAGE_VARIANCE + Math.random() * config.DAMAGE_VARIANCE * 2;
            const hitDamage = Math.max(1, Math.floor(player.attack * 1.5 * variance));
            totalDamage += hitDamage;
        }

        enemy.hp -= totalDamage;

        // Aggro
        if (enemy.state !== 'return') {
            enemy.target = player.characterId;
            if (enemy.state === 'idle' || enemy.state === 'wander') {
                enemy.state = 'chase';
            }
        }

        this.world.broadcast({
            type: 'damageDealt',
            attackerId: player.characterId,
            targetId: enemy.id,
            damage: totalDamage,
            targetHp: Math.max(0, enemy.hp),
            attackerType: 'player',
            hits: stacks,
        });

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

        if (enemy.hp <= 0) {
            this.handleEnemyDeath(enemy, player);
        }
    }

    handleProjectileAttack(player, targetId) {
        const manaCost = 20;
        if (!player.useMana(manaCost)) {
            player.send({ type: 'error', message: 'Not enough mana' });
            return;
        }

        const enemy = this.world.enemies.get(targetId);
        if (!enemy || !enemy.alive) {
            player.send({ type: 'error', message: 'Invalid target' });
            return;
        }

        const dist = distance2D(player.x, player.y, enemy.x, enemy.y);
        if (dist > config.PROJECTILE_RANGE) {
            player.send({ type: 'error', message: 'Out of range' });
            return;
        }

        const variance = 1 - config.DAMAGE_VARIANCE + Math.random() * config.DAMAGE_VARIANCE * 2;
        const damage = Math.max(1, Math.floor(player.magicAttack * 1.2 * variance));

        enemy.hp -= damage;
        player.lastCombatTime = Date.now();

        if (enemy.state !== 'return') {
            enemy.target = player.characterId;
            if (enemy.state === 'idle' || enemy.state === 'wander') {
                enemy.state = 'chase';
            }
        }

        this.world.broadcast({
            type: 'damageDealt',
            attackerId: player.characterId,
            targetId: enemy.id,
            damage,
            targetHp: Math.max(0, enemy.hp),
            attackerType: 'player',
        });

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

        if (enemy.hp <= 0) {
            this.handleEnemyDeath(enemy, player);
        }
    }

    handleEnemyDeath(enemy, killer) {
        enemy.alive = false;
        enemy.state = 'dead';
        enemy.target = null;
        enemy.respawnTimer = Date.now() + enemy.respawnMs;

        // Award XP
        const xp = scaleXp(enemy.xpReward, killer.level, enemy.level);
        if (xp > 0) {
            const result = killer.awardXp(xp);

            killer.send({
                type: 'xpGain',
                amount: xp,
                source: enemy.name,
            });

            if (result.leveledUp) {
                killer.send({
                    type: 'levelUp',
                    level: killer.level,
                    stats: killer.toSelfData(),
                });
            }
        }

        // Generate loot
        const lootItems = [];
        for (const drop of enemy.lootTable) {
            if (Math.random() <= drop.chance) {
                const qty = Math.floor(Math.random() * (drop.max - drop.min + 1)) + drop.min;
                lootItems.push({ itemKey: drop.itemKey, quantity: qty });
            }
        }

        const gold = Math.floor(Math.random() * (enemy.goldDrop.max - enemy.goldDrop.min + 1)) + enemy.goldDrop.min;

        // Create loot bag if there's anything
        if (lootItems.length > 0 || gold > 0) {
            const { generateId } = require('../../utils/ids');
            const lootId = generateId();
            this.world.loot.set(lootId, {
                id: lootId,
                ownerId: killer.characterId,
                x: enemy.x,
                y: enemy.y,
                items: lootItems,
                gold,
                createdAt: Date.now(),
            });

            killer.send({
                type: 'lootSpawn',
                lootId,
                x: enemy.x,
                y: enemy.y,
                items: lootItems,
                gold,
            });
        }

        // Broadcast enemy death
        this.world.broadcast({
            type: 'enemyDied',
            id: enemy.id,
        });

        // Send updated player stats
        killer.send({
            type: 'playerStats',
            hp: killer.currentHp,
            maxHp: killer.maxHp,
            mana: Math.floor(killer.currentMana),
            maxMana: killer.maxMana,
            xp: killer.xp,
            level: killer.level,
            gold: killer.gold,
            powerStacks: killer.powerStacks,
        });

        console.log(`[Combat] ${killer.name} killed ${enemy.name} → ${xp} XP, ${gold} gold`);
    }
}

module.exports = CombatSystem;
