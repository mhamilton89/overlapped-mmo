const express = require('express');
const cors = require('cors');
const config = require('./config');
const authRouter = require('./auth/router');
const characterRouter = require('./api/characterRouter');
const { verifyToken } = require('./auth/middleware');
const GameWorld = require('./game/GameWorld');
const GameLoop = require('./game/GameLoop');
const MovementSystem = require('./game/systems/MovementSystem');
const GatheringSystem = require('./game/systems/GatheringSystem');
const RegenSystem = require('./game/systems/RegenSystem');
const CombatSystem = require('./game/systems/CombatSystem');
const EnemySystem = require('./game/systems/EnemySystem');
const LootSystem = require('./game/systems/LootSystem');
const BlockSystem = require('./game/systems/BlockSystem');
const { seedStarterTown } = require('./game/starterTown');
const { createWebSocketServer } = require('./net/WebSocketServer');

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// REST routes
app.use('/api/auth', authRouter);
app.use('/api/characters', verifyToken, characterRouter);

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        players: world.players.size,
        enemies: world.enemies.size,
        resources: world.resources.size,
    });
});

// Initialize game world
const world = new GameWorld();
world.init();

// Seed the starter town (idempotent — skipped if already present in DB)
seedStarterTown().catch(err => {
    console.error('Failed to seed starter town:', err);
});

// Attach systems
world.systems.movement = new MovementSystem(world);

world.systems.gathering = new GatheringSystem(world);
world.systems.regen = new RegenSystem(world);
world.systems.combat = new CombatSystem(world);
world.systems.enemy = new EnemySystem(world);
world.systems.loot = new LootSystem(world);
world.systems.block = new BlockSystem(world);

// Start game loop
const gameLoop = new GameLoop(world);
gameLoop.start();

// Start HTTP server
app.listen(config.HTTP_PORT, () => {
    console.log(`REST API listening on port ${config.HTTP_PORT}`);
});

// Start WebSocket server
const wss = createWebSocketServer(world);

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    gameLoop.stop();
    wss.close();

    // Save all online players
    const characterQueries = require('./db/queries/characters');
    for (const player of world.players.values()) {
        try {
            await characterQueries.saveCharacterState(
                player.characterId,
                player.toSaveState()
            );
            console.log(`Saved ${player.name}`);
        } catch (err) {
            console.error(`Failed to save ${player.name}:`, err);
        }
    }

    process.exit(0);
});

console.log('Overlapped 3D MMO Server started');
