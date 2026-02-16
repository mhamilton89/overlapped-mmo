const config = require('../../config');
const { distance2D } = require('../../utils/coords');

class MovementSystem {
    constructor(world) {
        this.world = world;
    }

    handleMove(player, payload) {
        const { x, y, rotation } = payload;

        if (typeof x !== 'number' || typeof y !== 'number') return;
        if (!player.isAlive()) return;

        // Cancel gathering if player moves
        if (player.gatherState) {
            player.gatherState = null;
            player.send({ type: 'gatherCancelled' });
        }

        // Validate speed (prevent teleportation)
        const now = Date.now();
        const elapsed = (now - player.lastMoveTime) / 1000;
        const dist = distance2D(x, y, player.lastPositionX, player.lastPositionY);

        if (elapsed > 0.05) { // Ignore if too soon (dedup)
            const maxDist = config.MOVEMENT_SPEED * config.MOVEMENT_TOLERANCE * elapsed;
            if (dist > maxDist && elapsed < 5) {
                // Speed hack detected - snap back
                player.send({
                    type: 'playerMoved',
                    id: player.characterId,
                    x: player.x,
                    y: player.y,
                    rotation: player.rotation,
                });
                return;
            }
        }

        // Apply position
        player.x = x;
        player.y = y;
        player.rotation = typeof rotation === 'number' ? rotation : player.rotation;
        player.lastMoveTime = now;
        player.lastPositionX = x;
        player.lastPositionY = y;
        player.dirty = true;

        // Broadcast to other players
        this.world.broadcastExcept(player.socketId, {
            type: 'playerMoved',
            id: player.characterId,
            x: player.x,
            y: player.y,
            rotation: player.rotation,
        });
    }
}

module.exports = MovementSystem;
