const config = require('../config');

class GameLoop {
    constructor(world) {
        this.world = world;
        this.interval = null;
        this.lastTick = Date.now();
    }

    start() {
        console.log(`Game loop starting at ${config.TICK_RATE_MS}ms tick rate`);
        this.lastTick = Date.now();

        this.interval = setInterval(() => {
            this.tick();
        }, config.TICK_RATE_MS);
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('Game loop stopped');
        }
    }

    tick() {
        const now = Date.now();
        const deltaMs = now - this.lastTick;
        this.lastTick = now;

        const systems = this.world.systems;

        // Update all active systems
        if (systems.enemy) {
            systems.enemy.update(deltaMs);
        }

        if (systems.regen) {
            systems.regen.update(deltaMs);
        }

        if (systems.gathering) {
            systems.gathering.update(deltaMs);
        }

        if (systems.loot) {
            systems.loot.update(deltaMs);
        }
    }
}

module.exports = GameLoop;
