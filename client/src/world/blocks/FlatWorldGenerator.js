/**
 * FlatWorldGenerator — generates a flat grass world.
 * Y=0: bedrock, Y=1-17: stone, Y=18-19: dirt, Y=20: grass, Y>20: air.
 * Same interface as TerrainGenerator so ChunkManager doesn't care which is used.
 */

import { CHUNK_SIZE } from './Chunk.js';

const BEDROCK = 22;
const STONE = 1;
const DIRT = 2;
const GRASS = 3;
const SURFACE_Y = 20;

export class FlatWorldGenerator {
    getHeight() {
        return SURFACE_Y;
    }

    generateChunk(chunk) {
        const wy0 = chunk.cy * CHUNK_SIZE;

        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
            const wy = wy0 + ly;
            if (wy > SURFACE_Y) continue; // all air above surface

            let block;
            if (wy === 0) block = BEDROCK;
            else if (wy <= 17) block = STONE;
            else if (wy <= 19) block = DIRT;
            else block = GRASS; // wy === 20

            // Fill the entire horizontal slice with this block
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    chunk.setBlock(lx, ly, lz, block);
                }
            }
        }
    }

    /** Returns the default block at a world position (for delta comparison) */
    getDefaultBlock(wx, wy, wz) {
        if (wy === 0) return BEDROCK;
        if (wy <= 17) return STONE;
        if (wy <= 19) return DIRT;
        if (wy === 20) return GRASS;
        return 0; // air
    }
}
