// Resource definitions with spawn positions
// Positions must match client Game.js placeGatherableTrees()
// Server uses 2D (x, y) where y = client z

module.exports = [
    {
        key: 'oak_tree',
        name: 'Oak Tree',
        gatherTimeMs: 3000,
        hitsRequired: 3,
        yields: [
            { itemKey: 'oak_wood', min: 3, max: 7 },
        ],
        xpReward: 15,
        respawnMs: 120000,
        spawns: [
            { id: 'gather_tree_0', x: 15, y: 5 },
            { id: 'gather_tree_1', x: -12, y: 8 },
            { id: 'gather_tree_2', x: 8, y: -14 },
            { id: 'gather_tree_3', x: -10, y: -10 },
            { id: 'gather_tree_4', x: 20, y: -5 },
            { id: 'gather_tree_5', x: -18, y: 2 },
            { id: 'gather_tree_6', x: 5, y: 18 },
            { id: 'gather_tree_7', x: -5, y: -20 },
            { id: 'gather_tree_8', x: 22, y: 15 },
            { id: 'gather_tree_9', x: -15, y: 18 },
            { id: 'gather_tree_10', x: 25, y: -12 },
            { id: 'gather_tree_11', x: -22, y: -8 },
        ],
    },
];
