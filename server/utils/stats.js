const classRegistry = require('../registries/classRegistry');
const config = require('../config');

/**
 * Get total stats for a character at a given level with equipment bonuses
 */
function getTotalStats(className, level, equipmentBonuses = {}) {
    const classDef = classRegistry[className];
    if (!classDef) throw new Error(`Unknown class: ${className}`);

    const total = {};
    for (const stat of ['str', 'int', 'dex', 'vit', 'sta']) {
        total[stat] = Math.floor(
            classDef.baseStats[stat] +
            classDef.statGrowth[stat] * (level - 1) +
            (equipmentBonuses[stat] || 0)
        );
    }
    return total;
}

/**
 * Calculate derived combat/resource stats from total stats
 */
function calculateDerivedStats(totalStats, level) {
    return {
        maxHp: totalStats.vit * 10 + level * 5,
        maxMana: totalStats.int * 8 + totalStats.sta * 3,
        attack: totalStats.str * 2 + totalStats.dex,
        magicAttack: Math.floor(totalStats.int * 2.5),
        defense: totalStats.vit + Math.floor(totalStats.str * 0.5),
        critChance: Math.floor(totalStats.dex * 0.5), // percent
    };
}

/**
 * Get initial stats for a new character at level 1
 */
function getInitialStats(className) {
    const totalStats = getTotalStats(className, 1);
    const derived = calculateDerivedStats(totalStats, 1);
    return {
        level: 1,
        xp: 0,
        current_hp: derived.maxHp,
        current_mana: derived.maxMana,
    };
}

/**
 * XP required to reach a given level (quadratic curve)
 * Level 2 = 400, Level 10 = 10000, Level 50 = 250000
 */
function xpForLevel(level) {
    return 100 * level * level;
}

/**
 * Total XP needed from level 1 to reach target level
 */
function totalXpForLevel(level) {
    let total = 0;
    for (let i = 2; i <= level; i++) {
        total += xpForLevel(i);
    }
    return total;
}

/**
 * Check if a character should level up and return new level
 */
function checkLevelUp(currentLevel, currentXp) {
    let level = currentLevel;
    let xp = currentXp;

    while (level < config.MAX_LEVEL) {
        const needed = xpForLevel(level + 1);
        if (xp >= needed) {
            xp -= needed;
            level++;
        } else {
            break;
        }
    }

    return { level, xp };
}

/**
 * Calculate XP earned with level scaling
 * Prevents farming low-level content
 */
function scaleXp(baseXp, playerLevel, contentLevel) {
    const diff = playerLevel - contentLevel;
    if (diff <= 0) return baseXp;        // Equal or higher content: 100%
    if (diff <= 2) return Math.floor(baseXp * 0.8);  // 80%
    if (diff <= 4) return Math.floor(baseXp * 0.5);  // 50%
    if (diff <= 6) return Math.floor(baseXp * 0.25); // 25%
    if (diff <= 8) return Math.floor(baseXp * 0.1);  // 10%
    return 0;                             // 9+ levels above: 0%
}

module.exports = {
    getTotalStats,
    calculateDerivedStats,
    getInitialStats,
    xpForLevel,
    totalXpForLevel,
    checkLevelUp,
    scaleXp,
};
