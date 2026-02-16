const config = require('../../config');

class RegenSystem {
    constructor(world) {
        this.world = world;
    }

    update(deltaMs) {
        const deltaSec = deltaMs / 1000;

        for (const player of this.world.players.values()) {
            if (!player.isAlive()) continue;

            let changed = false;

            // Mana regen (always)
            if (player.currentMana < player.maxMana) {
                const manaGain = config.MANA_REGEN_PER_SEC * deltaSec;
                if (player.regenMana(manaGain)) {
                    changed = true;
                }
            }

            // HP regen (only out of combat)
            if (!player.isInCombat() && player.currentHp < player.maxHp) {
                const hpGain = config.HP_REGEN_PER_SEC * deltaSec;
                if (player.regenHp(hpGain)) {
                    changed = true;
                }
            }

            // Power stack decay (out of combat)
            if (!player.isInCombat() && player.powerStacks > 0) {
                const now = Date.now();
                if (now - player.lastPowerDecayCheck >= config.POWER_DECAY_DELAY_MS) {
                    player.powerStacks = Math.max(0, player.powerStacks - 1);
                    player.lastPowerDecayCheck = now;
                    changed = true;
                }
            }

            // Send stats update if anything changed (throttled to once per second)
            if (changed) {
                player.send({
                    type: 'playerStats',
                    hp: Math.floor(player.currentHp),
                    maxHp: player.maxHp,
                    mana: Math.floor(player.currentMana),
                    maxMana: player.maxMana,
                    xp: player.xp,
                    level: player.level,
                    gold: player.gold,
                    powerStacks: player.powerStacks,
                });
            }
        }
    }
}

module.exports = RegenSystem;
