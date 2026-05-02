// Dark Forest enemy templates with spawn positions
// Positions use 2D coords (server x, y)
// Difficulty gradient: center → edge

module.exports = [
    // ── Skeleton Warriors (Level 1-2) — Inner ring, 15-25 units ───────
    {
        key: 'skeleton_warrior',
        name: 'Skeleton Warrior',
        level: 2,
        baseHp: 40,
        baseDamage: 4,
        attackSpeed: 2200,
        moveSpeed: 2.5,
        aggroRange: 5,
        chaseRange: 16,
        meleeRange: 2,
        xpReward: 12,
        lootTable: [
            { itemKey: 'bone_fragment', chance: 0.6, min: 1, max: 2 },
            { itemKey: 'tattered_cloth', chance: 0.4, min: 1, max: 1 },
        ],
        goldDrop: { min: 1, max: 4 },
        respawnMs: 20000,
        spawns: [
            { x: 18, y: 10 },
            { x: -15, y: 16 },
            { x: 20, y: -12 },
            { x: -20, y: -15 },
            { x: 10, y: 22 },
            { x: -8, y: -22 },
            { x: 24, y: 5 },
            { x: -22, y: 8 },
        ],
    },

    // ── Giant Spiders (Level 2-3) — Inner-mid ring, 20-40 units ──────
    {
        key: 'giant_spider',
        name: 'Giant Spider',
        level: 3,
        baseHp: 65,
        baseDamage: 7,
        attackSpeed: 1800,
        moveSpeed: 3.2,
        aggroRange: 6,
        chaseRange: 18,
        meleeRange: 2,
        xpReward: 18,
        lootTable: [
            { itemKey: 'spider_silk', chance: 0.5, min: 1, max: 3 },
            { itemKey: 'venom_sac', chance: 0.25, min: 1, max: 1 },
        ],
        goldDrop: { min: 2, max: 6 },
        respawnMs: 25000,
        spawns: [
            // Spider nest cluster 1 (NE)
            { x: 30, y: 25 },
            { x: 33, y: 28 },
            // Spider nest cluster 2 (SW)
            { x: -28, y: -30 },
            { x: -32, y: -27 },
            // Scattered
            { x: 25, y: -35 },
            { x: -35, y: 20 },
            { x: 38, y: -10 },
            { x: -20, y: 35 },
        ],
    },

    // ── Restless Zombies (Level 3-4) — Mid ring, 35-55 units ─────────
    {
        key: 'restless_zombie',
        name: 'Restless Zombie',
        level: 4,
        baseHp: 100,
        baseDamage: 9,
        attackSpeed: 2500,
        moveSpeed: 2.0,
        aggroRange: 7,
        chaseRange: 20,
        meleeRange: 2,
        xpReward: 28,
        lootTable: [
            { itemKey: 'rotting_flesh', chance: 0.7, min: 1, max: 2 },
            { itemKey: 'tattered_cloth', chance: 0.5, min: 1, max: 2 },
            { itemKey: 'zombie_tooth', chance: 0.2, min: 1, max: 1 },
        ],
        goldDrop: { min: 4, max: 10 },
        respawnMs: 30000,
        spawns: [
            // Graveyard cluster (near chapel ~45,45)
            { x: 42, y: 42 },
            { x: 48, y: 46 },
            { x: 44, y: 50 },
            // Scattered graveyard
            { x: -45, y: 40 },
            { x: 40, y: -45 },
            { x: -40, y: -50 },
            { x: 50, y: -35 },
        ],
    },

    // ── Shadow Wraiths (Level 4-5) — Outer ring, 50-70 units ─────────
    {
        key: 'shadow_wraith',
        name: 'Shadow Wraith',
        level: 5,
        baseHp: 80,
        baseDamage: 12,
        attackSpeed: 1600,
        moveSpeed: 3.5,
        aggroRange: 8,
        chaseRange: 22,
        meleeRange: 2,
        xpReward: 38,
        lootTable: [
            { itemKey: 'shadow_essence', chance: 0.4, min: 1, max: 1 },
            { itemKey: 'spectral_dust', chance: 0.6, min: 1, max: 2 },
            { itemKey: 'wraith_cloth', chance: 0.3, min: 1, max: 1 },
        ],
        goldDrop: { min: 6, max: 15 },
        respawnMs: 35000,
        spawns: [
            { x: 60, y: 55 },
            { x: -55, y: 60 },
            { x: 65, y: -50 },
            { x: -60, y: -55 },
            { x: 55, y: -65 },
            { x: -65, y: 50 },
        ],
    },

    // ── Grave Golems (Level 5-6) — Zone edge, 70-90 units ────────────
    {
        key: 'grave_golem',
        name: 'Grave Golem',
        level: 6,
        baseHp: 200,
        baseDamage: 15,
        attackSpeed: 3000,
        moveSpeed: 1.8,
        aggroRange: 5,
        chaseRange: 15,
        meleeRange: 2.5,
        xpReward: 55,
        lootTable: [
            { itemKey: 'golem_core', chance: 0.3, min: 1, max: 1 },
            { itemKey: 'enchanted_stone', chance: 0.5, min: 1, max: 2 },
            { itemKey: 'grave_moss', chance: 0.7, min: 1, max: 3 },
        ],
        goldDrop: { min: 10, max: 25 },
        respawnMs: 60000,
        spawns: [
            { x: 80, y: 75 },
            { x: -75, y: -80 },
            { x: -80, y: 70 },
        ],
    },
];
