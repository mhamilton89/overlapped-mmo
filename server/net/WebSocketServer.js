const WebSocket = require('ws');
const { verifyWsToken } = require('../auth/middleware');
const characterQueries = require('../db/queries/characters');
const equipmentQueries = require('../db/queries/equipment');
const equipmentRegistry = require('../registries/equipmentRegistry');
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

        case 'respawn':
            if (!player.isAlive()) {
                player.currentHp = player.maxHp;
                player.currentMana = player.maxMana;
                player.x = 0;
                player.y = 0;
                player.lastPositionX = 0;
                player.lastPositionY = 0;
                player.lastMoveTime = Date.now();
                player.powerStacks = 0;
                player.dirty = true;
                console.log(`[Respawn] ${player.name} respawned at origin`);

                player.send({
                    type: 'respawned',
                    x: player.x,
                    y: player.y,
                    hp: player.currentHp,
                    maxHp: player.maxHp,
                    mana: player.currentMana,
                    maxMana: player.maxMana,
                });
                player.send({
                    type: 'playerStats',
                    hp: player.currentHp,
                    maxHp: player.maxHp,
                    mana: Math.floor(player.currentMana),
                    maxMana: player.maxMana,
                    xp: player.xp,
                    level: player.level,
                    gold: player.gold,
                    powerStacks: player.powerStacks,
                });
            }
            break;

        case 'equipItem':
            await handleEquipItem(world, player, message);
            break;

        case 'unequipItem':
            await handleUnequipItem(world, player, message);
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

    // If character is already online, kick the old connection and take over
    const alreadyOnline = world.getPlayerByCharacterId(characterId);
    if (alreadyOnline) {
        console.log(`[WS] ${characterData.name} already online on socket ${alreadyOnline.socketId}, replacing with ${ws._socketId}`);
        // Notify old connection
        try {
            alreadyOnline.send({ type: 'error', message: 'Logged in from another session' });
            alreadyOnline.ws.close();
        } catch (e) { /* old socket may already be dead */ }
        // Remove old player
        world.removePlayer(alreadyOnline.socketId);
        world.broadcast({ type: 'playerLeft', id: alreadyOnline.characterId });
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

async function handleEquipItem(world, player, message) {
    const { itemKey } = message;

    if (!itemKey) {
        player.send({ type: 'error', message: 'itemKey required' });
        return;
    }

    // Verify item exists in equipment registry
    const itemDef = equipmentRegistry[itemKey];
    if (!itemDef) {
        player.send({ type: 'error', message: 'Invalid equipment item' });
        return;
    }

    // Check level requirement
    if (itemDef.levelReq && player.level < itemDef.levelReq) {
        player.send({ type: 'error', message: `Requires level ${itemDef.levelReq}` });
        return;
    }

    // Check player has the item in inventory
    const hasItem = player.inventory.find(i => i.item_key === itemKey);
    if (!hasItem) {
        player.send({ type: 'error', message: 'Item not in inventory' });
        return;
    }

    const slot = itemDef.slot;

    try {
        // Equip in DB (upserts, returns any previously equipped item)
        await equipmentQueries.equipItem(player.characterId, slot, itemKey);

        // If there was something in that slot, put it back in inventory
        const oldItem = player.equipment[slot];
        if (oldItem) {
            player.inventory.push({ item_key: oldItem, quantity: 1 });
        }

        // Remove new item from inventory
        const idx = player.inventory.findIndex(i => i.item_key === itemKey);
        if (idx !== -1) player.inventory.splice(idx, 1);

        // Update equipment map
        player.equipment[slot] = itemKey;
        player.recalculateStats();
        player.dirty = true;

        // Notify the player
        player.send({
            type: 'equipmentChanged',
            characterId: player.characterId,
            equipment: player.equipment,
        });
        player.send({
            type: 'playerStats',
            ...player.toSelfData(),
        });

        // Notify other players of visual change
        world.broadcastExcept(player.socketId, {
            type: 'equipmentChanged',
            characterId: player.characterId,
            equipment: player.equipment,
        });
    } catch (err) {
        console.error('[Equip] Error:', err);
        player.send({ type: 'error', message: 'Failed to equip item' });
    }
}

async function handleUnequipItem(world, player, message) {
    const { slot } = message;

    if (!slot) {
        player.send({ type: 'error', message: 'slot required' });
        return;
    }

    const itemKey = player.equipment[slot];
    if (!itemKey) {
        player.send({ type: 'error', message: 'Nothing equipped in that slot' });
        return;
    }

    try {
        await equipmentQueries.unequipItem(player.characterId, slot);

        // Move item back to inventory
        player.inventory.push({ item_key: itemKey, quantity: 1 });
        delete player.equipment[slot];
        player.recalculateStats();
        player.dirty = true;

        // Notify the player
        player.send({
            type: 'equipmentChanged',
            characterId: player.characterId,
            equipment: player.equipment,
        });
        player.send({
            type: 'playerStats',
            ...player.toSelfData(),
        });

        // Notify other players of visual change
        world.broadcastExcept(player.socketId, {
            type: 'equipmentChanged',
            characterId: player.characterId,
            equipment: player.equipment,
        });
    } catch (err) {
        console.error('[Unequip] Error:', err);
        player.send({ type: 'error', message: 'Failed to unequip item' });
    }
}

module.exports = { createWebSocketServer };
