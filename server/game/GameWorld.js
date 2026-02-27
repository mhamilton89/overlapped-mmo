const Player = require('./Player');
const characterQueries = require('../db/queries/characters');
const inventoryQueries = require('../db/queries/inventory');
const equipmentQueries = require('../db/queries/equipment');

class GameWorld {
    constructor() {
        this.players = new Map();     // socketId → Player
        this.enemies = new Map();     // enemyId → EnemyInstance
        this.resources = new Map();   // resourceId → ResourceInstance
        this.loot = new Map();        // lootId → LootBag

        // Systems are set after construction
        this.systems = {};
    }

    init() {
        // Initialize resources from registry
        try {
            const resourceRegistry = require('../registries/resourceRegistry');
            for (const template of resourceRegistry) {
                for (const spawn of template.spawns) {
                    this.resources.set(spawn.id, {
                        id: spawn.id,
                        key: template.key,
                        name: template.name,
                        x: spawn.x,
                        y: spawn.y,
                        gatherTimeMs: template.gatherTimeMs,
                        hitsRequired: template.hitsRequired,
                        yields: template.yields,
                        xpReward: template.xpReward,
                        respawnMs: template.respawnMs,
                        available: true,
                        respawnTimer: null,
                    });
                }
            }
            console.log(`Initialized ${this.resources.size} resources`);
        } catch (e) {
            console.log('No resource registry yet, skipping resource init');
        }

        // Initialize enemies from registry
        try {
            const enemyRegistry = require('../registries/enemyRegistry');
            let enemyCount = 0;
            for (const template of enemyRegistry) {
                for (let i = 0; i < template.spawns.length; i++) {
                    const spawn = template.spawns[i];
                    const enemyId = `${template.key}_${i}`;
                    this.enemies.set(enemyId, {
                        id: enemyId,
                        key: template.key,
                        name: template.name,
                        level: template.level,
                        x: spawn.x,
                        y: spawn.y,
                        spawnX: spawn.x,
                        spawnY: spawn.y,
                        hp: template.baseHp,
                        maxHp: template.baseHp,
                        damage: template.baseDamage,
                        attackSpeed: template.attackSpeed,
                        moveSpeed: template.moveSpeed,
                        aggroRange: template.aggroRange,
                        chaseRange: template.chaseRange,
                        meleeRange: template.meleeRange,
                        xpReward: template.xpReward,
                        lootTable: template.lootTable,
                        goldDrop: template.goldDrop,
                        respawnMs: template.respawnMs,
                        state: 'idle',
                        target: null,
                        stateTimer: 0,
                        attackTimer: 0,
                        wanderTarget: null,
                        alive: true,
                        respawnTimer: null,
                    });
                    enemyCount++;
                }
            }
            console.log(`Initialized ${enemyCount} enemies`);
        } catch (e) {
            console.log('No enemy registry yet, skipping enemy init');
        }
    }

    async addPlayer(ws, characterData) {
        const inventory = await inventoryQueries.getInventory(characterData.id);
        const equipment = await equipmentQueries.getEquipment(characterData.id);
        const player = new Player(ws, characterData, inventory, equipment);
        this.players.set(ws._socketId, player);
        return player;
    }

    removePlayer(socketId) {
        const player = this.players.get(socketId);
        if (player) {
            this.players.delete(socketId);
        }
        return player;
    }

    getPlayer(socketId) {
        return this.players.get(socketId) || null;
    }

    getPlayerByCharacterId(characterId) {
        for (const player of this.players.values()) {
            if (player.characterId === characterId) return player;
        }
        return null;
    }

    broadcast(message) {
        const data = JSON.stringify(message);
        for (const player of this.players.values()) {
            if (player.ws.readyState === 1) {
                player.ws.send(data);
            }
        }
    }

    broadcastExcept(socketId, message) {
        const data = JSON.stringify(message);
        for (const [sid, player] of this.players) {
            if (sid !== socketId && player.ws.readyState === 1) {
                player.ws.send(data);
            }
        }
    }

    getWorldState() {
        return {
            players: Array.from(this.players.values()).map(p => p.toPublicData()),
            resources: Array.from(this.resources.values()).map(r => ({
                id: r.id,
                key: r.key,
                name: r.name,
                x: r.x,
                y: r.y,
                available: r.available,
            })),
            enemies: Array.from(this.enemies.values())
                .filter(e => e.alive)
                .map(e => ({
                    id: e.id,
                    key: e.key,
                    name: e.name,
                    level: e.level,
                    x: e.x,
                    y: e.y,
                    hp: e.hp,
                    maxHp: e.maxHp,
                    state: e.state,
                })),
        };
    }
}

module.exports = GameWorld;
