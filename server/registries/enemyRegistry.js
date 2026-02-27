// Enemy templates with spawn positions
// Positions use 2D coords (server x, y)

module.exports = [
    {
        key: 'forest_wolf',
        name: 'Forest Wolf',
        level: 3,
        baseHp: 80,
        baseDamage: 8,
        attackSpeed: 2000,    // ms between attacks
        moveSpeed: 3,         // units per second
        aggroRange: 6,        // detect players within
        chaseRange: 20,       // max distance from spawn before leashing
        meleeRange: 2,        // attack range
        xpReward: 25,
        lootTable: [
            { itemKey: 'wolf_pelt', chance: 0.6, min: 1, max: 1 },
            { itemKey: 'wolf_fang', chance: 0.3, min: 1, max: 2 },
        ],
        goldDrop: { min: 3, max: 8 },
        respawnMs: 30000,
        spawns: [
            // Near spawn area
            { x: 12, y: 8 },
            { x: -10, y: 12 },
            { x: 14, y: -9 },
            // Mid range
            { x: 25, y: 20 },
            { x: -25, y: 18 },
            { x: 30, y: -15 },
            // Far range
            { x: 50, y: 25 },
            { x: -50, y: 30 },
            { x: 60, y: -10 },
            { x: -45, y: -45 },
        ],
    },
    {
        key: 'forest_boar',
        name: 'Forest Boar',
        level: 2,
        baseHp: 60,
        baseDamage: 6,
        attackSpeed: 1800,
        moveSpeed: 2.8,
        aggroRange: 6,
        chaseRange: 18,
        meleeRange: 2,
        xpReward: 20,
        lootTable: [
            { itemKey: 'boar_tusk', chance: 0.5, min: 1, max: 2 },
            { itemKey: 'boar_hide', chance: 0.4, min: 1, max: 1 },
        ],
        goldDrop: { min: 2, max: 6 },
        respawnMs: 25000,
        spawns: [
            // Near spawn area
            { x: 8, y: 10 },
            { x: -12, y: 8 },
            { x: -9, y: -10 },
            // Mid range
            { x: 20, y: 15 },
            { x: -18, y: 25 },
            { x: 25, y: -20 },
            // Far range
            { x: 45, y: 30 },
            { x: -40, y: 25 },
            { x: -35, y: -40 },
        ],
    },
];
