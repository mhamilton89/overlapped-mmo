require('dotenv').config();

module.exports = Object.freeze({
    HTTP_PORT: parseInt(process.env.HTTP_PORT) || 3002,
    WS_PORT: parseInt(process.env.WS_PORT) || 3001,
    DB_URL: process.env.DATABASE_URL || 'postgresql://localhost:5432/overlapped',
    JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    JWT_EXPIRY: '24h',
    BCRYPT_ROUNDS: 10,

    // Game loop
    TICK_RATE_MS: 100,

    // Characters
    MAX_CHARACTERS_PER_ACCOUNT: 5,
    MAX_LEVEL: 50,

    // Movement (must match client Player.js moveSpeed)
    MOVEMENT_SPEED: 7,
    MOVEMENT_TOLERANCE: 1.5,

    // Combat
    MELEE_RANGE: 2,
    MELEE_COOLDOWN_MS: 1000,
    PROJECTILE_RANGE: 15,
    MAX_POWER_STACKS: 3,
    DAMAGE_VARIANCE: 0.2,

    // Gathering
    GATHER_RANGE: 5,
    GATHER_HIT_TIME_MS: 3000,
    GATHER_HITS_REQUIRED: 3,

    // Resources
    RESOURCE_RESPAWN_MS: 60000,

    // Loot
    LOOT_PICKUP_RANGE: 3,
    LOOT_DESPAWN_MS: 60000,

    // Regen
    MANA_REGEN_PER_SEC: 5,
    HP_REGEN_PER_SEC: 1,
    COMBAT_REGEN_DELAY_MS: 5000,
    POWER_DECAY_DELAY_MS: 10000,

    // Persistence
    SAVE_INTERVAL_MS: 60000,
});
