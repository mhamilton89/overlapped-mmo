const worldBlocks = require('../../db/queries/worldBlocks');

class BlockSystem {
    constructor(world) {
        this.world = world;
        // Rate limiting: track last operation time per player
        this.lastOp = new Map();
        this.minInterval = 50; // ms between block ops (20/sec)
    }

    _rateCheck(playerId) {
        const now = Date.now();
        const last = this.lastOp.get(playerId) || 0;
        if (now - last < this.minInterval) return false;
        this.lastOp.set(playerId, now);
        return true;
    }

    async handlePlace(player, message) {
        if (!player.isAdmin) {
            player.send({ type: 'error', message: 'Not authorized to place blocks' });
            return;
        }

        if (!this._rateCheck(player.characterId)) return;

        const { x, y, z, blockId } = message;

        // Validate
        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return;
        if (!Number.isInteger(blockId) || blockId < 0 || blockId > 255) return;
        if (y < 0 || y > 255) return;

        // Don't allow placing bedrock
        if (blockId === 22) return;

        // Persist
        try {
            await worldBlocks.setBlock(x, y, z, blockId, player.characterId);
        } catch (err) {
            console.error('[BlockSystem] DB error on place:', err.message);
            return;
        }

        // Broadcast to all players
        this.world.broadcast({
            type: 'blockUpdate',
            x, y, z, blockId,
        });
    }

    async handleBreak(player, message) {
        if (!player.isAdmin) {
            player.send({ type: 'error', message: 'Not authorized to break blocks' });
            return;
        }

        if (!this._rateCheck(player.characterId)) return;

        const { x, y, z } = message;

        if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) return;
        if (y <= 0) return; // can't break bedrock layer

        // Persist (set to air = 0)
        try {
            await worldBlocks.setBlock(x, y, z, 0, player.characterId);
        } catch (err) {
            console.error('[BlockSystem] DB error on break:', err.message);
            return;
        }

        // Broadcast to all players
        this.world.broadcast({
            type: 'blockUpdate',
            x, y, z, blockId: 0,
        });
    }

    async handleBatch(player, message) {
        if (!player.isAdmin) {
            player.send({ type: 'error', message: 'Not authorized' });
            return;
        }

        const { ops } = message;
        if (!Array.isArray(ops) || ops.length === 0) return;

        const MAX_BATCH = 32768;
        if (ops.length > MAX_BATCH) {
            player.send({ type: 'error', message: `Batch too large (max ${MAX_BATCH})` });
            return;
        }

        // Rate limit scaled by batch size
        const now = Date.now();
        const last = this.lastOp.get(player.characterId) || 0;
        const cooldown = Math.max(50, Math.floor(ops.length / 20) * 50);
        if (now - last < cooldown) return;
        this.lastOp.set(player.characterId, now);

        const validated = [];
        for (const op of ops) {
            const { x, y, z, blockId } = op;
            if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isInteger(z)) continue;
            if (!Number.isInteger(blockId) || blockId < 0 || blockId > 255) continue;
            if (y < 0 || y > 255) continue;
            if (blockId === 22) continue;
            if (y === 0 && blockId === 0) continue;
            validated.push({ x, y, z, blockId });
        }

        if (validated.length === 0) return;

        try {
            await worldBlocks.setBlockBatch(validated, player.characterId);
        } catch (err) {
            console.error('[BlockSystem] Batch DB error:', err.message);
            return;
        }

        // Broadcast each change
        for (const op of validated) {
            this.world.broadcast({
                type: 'blockUpdate',
                x: op.x, y: op.y, z: op.z, blockId: op.blockId,
            });
        }
    }

    async handleChunkRequest(player, message) {
        const { cx, cy, cz } = message;
        if (!Number.isInteger(cx) || !Number.isInteger(cy) || !Number.isInteger(cz)) return;

        try {
            const deltas = await worldBlocks.getBlocksForChunk(cx, cy, cz);
            player.send({
                type: 'chunkDeltas',
                cx, cy, cz,
                deltas: deltas.map(d => ({ x: d.x, y: d.y, z: d.z, b: d.block_id })),
            });
        } catch (err) {
            console.error('[BlockSystem] DB error on chunk request:', err.message);
        }
    }
}

module.exports = BlockSystem;
