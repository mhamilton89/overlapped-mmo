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
        aggroRange: 8,        // detect players within
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
            { x: 40, y: 30 },
            { x: 45, y: 35 },
            { x: 50, y: 25 },
            { x: -35, y: 40 },
            { x: -40, y: 45 },
        ],
    },
    {
        key: 'forest_spider',
        name: 'Forest Spider',
        level: 1,
        baseHp: 40,
        baseDamage: 5,
        attackSpeed: 1500,
        moveSpeed: 2.5,
        aggroRange: 6,
        chaseRange: 15,
        meleeRange: 1.5,
        xpReward: 15,
        lootTable: [],
        goldDrop: { min: 1, max: 4 },
        respawnMs: 20000,
        spawns: [
            { x: 25, y: 25 },
            { x: 30, y: 20 },
            { x: -25, y: -25 },
            { x: -30, y: -20 },
        ],
    },
];
