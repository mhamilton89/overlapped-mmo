// Class definitions: base stats at level 1 and growth per level
// Derived stats are calculated in utils/stats.js

module.exports = {
    Warrior: {
        baseStats: { str: 12, int: 4, dex: 6, vit: 10, sta: 8 },
        statGrowth: { str: 3, int: 1, dex: 1.5, vit: 2.5, sta: 2 },
        description: 'A melee fighter excelling in strength and vitality'
    },
    Wizard: {
        baseStats: { str: 4, int: 14, dex: 5, vit: 5, sta: 12 },
        statGrowth: { str: 1, int: 3.5, dex: 1, vit: 1.5, sta: 3 },
        description: 'A spellcaster with powerful ranged attacks'
    },
    Paladin: {
        baseStats: { str: 8, int: 8, dex: 4, vit: 12, sta: 8 },
        statGrowth: { str: 2, int: 2, dex: 1, vit: 3, sta: 2 },
        description: 'A holy warrior balancing strength and magic'
    },
    Rogue: {
        baseStats: { str: 6, int: 4, dex: 14, vit: 6, sta: 10 },
        statGrowth: { str: 1.5, int: 1, dex: 3.5, vit: 1.5, sta: 2.5 },
        description: 'A swift fighter with high critical chance'
    }
};
