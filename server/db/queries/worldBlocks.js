const pool = require('../pool');

/**
 * Get all block deltas within a chunk.
 * Chunk coords are world coords >> 4 (divide by 16, floor).
 */
async function getBlocksForChunk(cx, cy, cz) {
    const minX = cx * 16, maxX = cx * 16 + 15;
    const minY = cy * 16, maxY = cy * 16 + 15;
    const minZ = cz * 16, maxZ = cz * 16 + 15;

    const result = await pool.query(
        `SELECT x, y, z, block_id FROM world_blocks
         WHERE x >= $1 AND x <= $2
           AND y >= $3 AND y <= $4
           AND z >= $5 AND z <= $6`,
        [minX, maxX, minY, maxY, minZ, maxZ]
    );
    return result.rows;
}

/**
 * Get all block deltas in a region (for initial world loading).
 */
async function getBlocksInRegion(minX, minZ, maxX, maxZ) {
    const result = await pool.query(
        `SELECT x, y, z, block_id FROM world_blocks
         WHERE x >= $1 AND x <= $2
           AND z >= $3 AND z <= $4`,
        [minX, maxX, minZ, maxZ]
    );
    return result.rows;
}

/**
 * Set a block in the world. Uses UPSERT.
 * If blockId matches the flat-world default, deletes the row instead.
 */
async function setBlock(x, y, z, blockId, characterId = null) {
    const defaultBlock = getDefaultBlock(y);

    if (blockId === defaultBlock) {
        // Restoring to default = remove delta
        await pool.query(
            `DELETE FROM world_blocks WHERE x = $1 AND y = $2 AND z = $3`,
            [x, y, z]
        );
    } else {
        await pool.query(
            `INSERT INTO world_blocks (x, y, z, block_id, placed_by)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (x, y, z) DO UPDATE SET block_id = $4, placed_by = $5, placed_at = NOW()`,
            [x, y, z, blockId, characterId]
        );
    }
}

/**
 * Returns the default (flat-world) block ID at a given Y level.
 * Must match FlatWorldGenerator.js exactly.
 */
function getDefaultBlock(y) {
    if (y === 0) return 22;  // bedrock
    if (y <= 17) return 1;   // stone
    if (y <= 19) return 2;   // dirt
    if (y === 20) return 3;  // grass
    return 0;                // air
}

/**
 * Batch set blocks within a single transaction.
 * @param {Array<{x, y, z, blockId}>} blocks
 * @param {string|null} characterId
 */
async function setBlockBatch(blocks, characterId = null) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const b of blocks) {
            const defaultBlock = getDefaultBlock(b.y);
            if (b.blockId === defaultBlock) {
                await client.query(
                    'DELETE FROM world_blocks WHERE x = $1 AND y = $2 AND z = $3',
                    [b.x, b.y, b.z]
                );
            } else {
                await client.query(
                    `INSERT INTO world_blocks (x, y, z, block_id, placed_by)
                     VALUES ($1, $2, $3, $4, $5)
                     ON CONFLICT (x, y, z) DO UPDATE SET block_id = $4, placed_by = $5, placed_at = NOW()`,
                    [b.x, b.y, b.z, b.blockId, characterId]
                );
            }
        }
        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    getBlocksForChunk,
    getBlocksInRegion,
    setBlock,
    setBlockBatch,
    getDefaultBlock,
};
