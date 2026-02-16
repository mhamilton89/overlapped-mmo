const WebSocket = require('ws');
const { verifyWsToken } = require('../auth/middleware');
const characterQueries = require('../db/queries/characters');
const config = require('../config');
const { generateId } = require('../utils/ids');

function createWebSocketServer(world) {
    const wss = new WebSocket.Server({ port: config.WS_PORT });

    console.log(`WebSocket server listening on port ${config.WS_PORT}`);

    wss.on('connection', (ws, req) => {
        // Extract token from query string
        const url = new URL(req.url, `http://localhost:${config.WS_PORT}`);
        const token = url.searchParams.get('token');

        const decoded = verifyWsToken(token);
        if (!decoded) {
            ws.send(JSON.stringify({ type: 'error', code: 'AUTH_FAILED', message: 'Invalid token' }));
            ws.close();
            return;
        }

        ws._socketId = generateId();
        ws._accountId = decoded.accountId;
        ws._username = decoded.username;

        console.log(`[WS] Connection from ${decoded.username} (socket: ${ws._socketId})`);

        ws.on('message', async (rawData) => {
            try {
                const message = JSON.parse(rawData.toString());
                await handleMessage(world, ws, message);
            } catch (err) {
                console.error('[WS] Message error:', err.message);
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
            }
        });

        ws.on('close', async () => {
            console.log(`[WS] Disconnected: ${ws._username} (socket: ${ws._socketId})`);
            const player = world.removePlayer(ws._socketId);
            if (player) {
                // Save character state
                try {
                    await characterQueries.saveCharacterState(
                        player.characterId,
                        player.toSaveState()
                    );
                    console.log(`[WS] Saved state for ${player.name}`);
                } catch (err) {
                    console.error('[WS] Error saving character state:', err);
                }

                // Notify other players
                world.broadcast({
                    type: 'playerLeft',
                    id: player.characterId,
                });
            }
        });

        ws.on('error', (err) => {
            console.error('[WS] Socket error:', err.message);
        });
    });

    return wss;
}

async function handleMessage(world, ws, message) {
    const { type } = message;

    // selectCharacter doesn't require an active player
    if (type === 'selectCharacter') {
        return handleSelectCharacter(world, ws, message);
    }

    // All other messages require an active player
    const player = world.getPlayer(ws._socketId);
    if (!player) {
        ws.send(JSON.stringify({ type: 'error', message: 'No character selected' }));
        return;
    }

    switch (type) {
        case 'move':
            world.systems.movement.handleMove(player, message);
            break;

        case 'attack':
        case 'spenderAttack':
        case 'projectileAttack':
            if (world.systems.combat) {
                world.systems.combat.handleAttack(player, message);
            }
            break;

        case 'gatherStart':
            if (world.systems.gathering) {
                world.systems.gathering.handleGatherStart(player, message.resourceId);
            }
            break;

        case 'gatherCancel':
            if (world.systems.gathering) {
                world.systems.gathering.handleGatherCancel(player);
            }
            break;

        case 'lootPickup':
            if (world.systems.loot) {
                world.systems.loot.handlePickup(player, message.lootId);
            }
            break;

        case 'equipItem':
            if (world.systems.inventory) {
                world.systems.inventory.handleEquip(player, message);
            }
            break;

        case 'unequipItem':
            if (world.systems.inventory) {
                world.systems.inventory.handleUnequip(player, message);
            }
            break;

        case 'chatMessage':
            if (message.message && typeof message.message === 'string') {
                const trimmed = message.message.trim().substring(0, 200);
                if (trimmed.length > 0) {
                    world.broadcast({
                        type: 'chatBroadcast',
                        senderId: player.characterId,
                        senderName: player.name,
                        message: trimmed,
                        timestamp: Date.now(),
                    });
                }
            }
            break;

        default:
            ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${type}` }));
    }
}

async function handleSelectCharacter(world, ws, message) {
    const { characterId } = message;

    if (!characterId) {
        ws.send(JSON.stringify({ type: 'error', message: 'characterId required' }));
        return;
    }

    // Check if already has a character selected
    const existing = world.getPlayer(ws._socketId);
    if (existing) {
        ws.send(JSON.stringify({ type: 'error', message: 'Character already selected' }));
        return;
    }

    // Load character from DB
    const characterData = await characterQueries.getCharacterById(characterId);
    if (!characterData) {
        ws.send(JSON.stringify({ type: 'error', message: 'Character not found' }));
        return;
    }

    // Verify ownership
    if (characterData.account_id !== ws._accountId) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not your character' }));
        return;
    }

    // Check if character is already online
    const alreadyOnline = world.getPlayerByCharacterId(characterId);
    if (alreadyOnline) {
        ws.send(JSON.stringify({ type: 'error', message: 'Character already online' }));
        return;
    }

    // Create player in world
    const player = await world.addPlayer(ws, characterData);

    // Send full world state to the joining player
    const worldState = world.getWorldState();
    player.send({
        type: 'characterLoaded',
        character: player.toSelfData(),
        inventory: player.inventory,
        equipment: player.equipment,
        players: worldState.players.filter(p => p.id !== player.characterId),
        resources: worldState.resources,
        enemies: worldState.enemies,
    });

    // Notify other players
    world.broadcastExcept(ws._socketId, {
        type: 'playerJoined',
        ...player.toPublicData(),
    });

    console.log(`[WS] ${player.name} (${player.class} Lv.${player.level}) entered the world`);
}

module.exports = { createWebSocketServer };
