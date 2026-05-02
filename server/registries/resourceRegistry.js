// Dark Forest resource definitions with spawn positions
// Positions use 2D coords (server x, y) where y = client z

module.exports = [
    // ── Dead Wood — primary gathering node, 10-50 units from center ──
    {
        key: 'dead_wood',
        name: 'Dead Wood',
        gatherTimeMs: 2500,
        hitsRequired: 3,
        yields: [
            { itemKey: 'dead_wood', min: 3, max: 6 },
        ],
        xpReward: 12,
        respawnMs: 90000,
        spawns: [
            { id: 'deadwood_0', x: 12, y: 8 },
            { id: 'deadwood_1', x: -10, y: 14 },
            { id: 'deadwood_2', x: 15, y: -10 },
            { id: 'deadwood_3', x: -15, y: -12 },
            { id: 'deadwood_4', x: 25, y: 5 },
            { id: 'deadwood_5', x: -22, y: 10 },
            { id: 'deadwood_6', x: 8, y: -25 },
            { id: 'deadwood_7', x: 30, y: -18 },
            { id: 'deadwood_8', x: -28, y: -5 },
            { id: 'deadwood_9', x: 20, y: 30 },
            { id: 'deadwood_10', x: -35, y: 20 },
            { id: 'deadwood_11', x: 40, y: -30 },
        ],
    },

    // ── Glowing Mushrooms — mid-range, 30-60 units from center ───────
    {
        key: 'glowing_mushroom',
        name: 'Glowing Mushroom',
        gatherTimeMs: 2000,
        hitsRequired: 2,
        yields: [
            { itemKey: 'glowing_mushroom', min: 2, max: 4 },
            { itemKey: 'luminescent_cap', min: 1, max: 1, chance: 0.15 },
        ],
        xpReward: 18,
        respawnMs: 120000,
        spawns: [
            { id: 'mushroom_0', x: 35, y: 30 },
            { id: 'mushroom_1', x: -30, y: 38 },
            { id: 'mushroom_2', x: 40, y: -35 },
            { id: 'mushroom_3', x: -38, y: -32 },
            { id: 'mushroom_4', x: 50, y: 15 },
            { id: 'mushroom_5', x: -45, y: -10 },
            { id: 'mushroom_6', x: 20, y: 55 },
            { id: 'mushroom_7', x: -55, y: 25 },
        ],
    },

    // ── Grave Dirt — near zombie graveyard, 35-55 units ──────────────
    {
        key: 'grave_dirt',
        name: 'Grave Dirt',
        gatherTimeMs: 3500,
        hitsRequired: 4,
        yields: [
            { itemKey: 'grave_dirt', min: 2, max: 5 },
            { itemKey: 'ancient_bone', min: 1, max: 1, chance: 0.2 },
        ],
        xpReward: 22,
        respawnMs: 180000,
        spawns: [
            { id: 'gravedirt_0', x: 40, y: 45 },
            { id: 'gravedirt_1', x: 46, y: 40 },
            { id: 'gravedirt_2', x: -42, y: 45 },
            { id: 'gravedirt_3', x: 45, y: -42 },
            { id: 'gravedirt_4', x: -40, y: -48 },
            { id: 'gravedirt_5', x: 50, y: -40 },
        ],
    },
];
