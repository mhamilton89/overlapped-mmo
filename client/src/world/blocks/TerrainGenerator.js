/**
 * TerrainGenerator — deterministic simplex-noise terrain.
 * Starts simple: gentle rolling grass hills with scattered trees.
 * More features (caves, ores, structures) added in later phases.
 */

import { createNoise2D } from 'simplex-noise';
import { CHUNK_SIZE } from './Chunk.js';

// Block IDs (must match BlockRegistry)
const AIR = 0;
const STONE = 1;
const DIRT = 2;
const GRASS = 3;
const DARK_OAK_LOG = 4;
const DARK_OAK_LEAVES = 5;
const BEDROCK = 22;

// Terrain parameters — gentle rolling hills
const BASE_HEIGHT = 20;
const AMPLITUDE = 6;
const SCALE = 0.02;

export class TerrainGenerator {
    constructor(seed = 12345) {
        this.seed = seed;
        const prng = this._createPRNG(seed);
        this.noise2D = createNoise2D(prng);
    }

    _createPRNG(seed) {
        let s = seed;
        return () => {
            s = (s * 1664525 + 1013904223) & 0xFFFFFFFF;
            return (s >>> 0) / 0xFFFFFFFF;
        };
    }

    /** Hash a world position to a deterministic value 0-1 */
    _hash(x, z) {
        let h = this.seed;
        h = ((h << 5) - h + x) | 0;
        h = ((h << 5) - h + z) | 0;
        h = ((h * 2654435761) >>> 0);
        return (h & 0xFFFF) / 0xFFFF;
    }

    /** Get terrain height at world x,z */
    getHeight(wx, wz) {
        const n = this.noise2D(wx * SCALE, wz * SCALE);
        return Math.floor(BASE_HEIGHT + n * AMPLITUDE);
    }

    /**
     * Fill a chunk with terrain blocks.
     */
    generateChunk(chunk) {
        const { cx, cy, cz } = chunk;
        const wx0 = cx * CHUNK_SIZE;
        const wy0 = cy * CHUNK_SIZE;
        const wz0 = cz * CHUNK_SIZE;

        // Pre-compute heightmap for this chunk's X-Z footprint
        const heights = new Int32Array(CHUNK_SIZE * CHUNK_SIZE);
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
            for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                heights[lz * CHUNK_SIZE + lx] = this.getHeight(wx0 + lx, wz0 + lz);
            }
        }

        for (let ly = 0; ly < CHUNK_SIZE; ly++) {
            const wy = wy0 + ly;
            for (let lz = 0; lz < CHUNK_SIZE; lz++) {
                for (let lx = 0; lx < CHUNK_SIZE; lx++) {
                    const surfaceH = heights[lz * CHUNK_SIZE + lx];

                    let block = AIR;

                    if (wy === 0) {
                        block = BEDROCK;
                    } else if (wy < surfaceH - 3) {
                        block = STONE;
                    } else if (wy < surfaceH) {
                        block = DIRT;
                    } else if (wy === surfaceH) {
                        block = GRASS;
                    }

                    if (block !== AIR) {
                        chunk.setBlock(lx, ly, lz, block);
                    }
                }
            }
        }

        // Scatter a few trees
        this._placeTrees(chunk, heights, wx0, wy0, wz0);
    }

    _setIfInBounds(chunk, x, y, z, block) {
        if (x >= 0 && x < CHUNK_SIZE && y >= 0 && y < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE) {
            chunk.setBlock(x, y, z, block);
        }
    }

    _placeTrees(chunk, heights, wx0, wy0, wz0) {
        for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
            for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
                const wx = wx0 + lx;
                const wz = wz0 + lz;
                const surfaceH = heights[lz * CHUNK_SIZE + lx];
                const baseY = surfaceH - wy0 + 1;

                if (baseY < 0 || baseY >= CHUNK_SIZE - 8) continue;

                const hash = this._hash(wx, wz);

                // ~2% chance of a tree per valid column — sparse scattering
                if (hash > 0.02) continue;

                // Keep spawn area clear
                if (Math.abs(wx) < 10 && Math.abs(wz) < 10) continue;

                // Simple tree: trunk + leaf ball
                const height = 5 + Math.floor(hash * 150) % 3; // 5-7
                for (let i = 0; i < height; i++) {
                    this._setIfInBounds(chunk, lx, baseY + i, lz, DARK_OAK_LOG);
                }

                // Leaf canopy at top
                const top = baseY + height;
                for (let dx = -2; dx <= 2; dx++) {
                    for (let dz = -2; dz <= 2; dz++) {
                        for (let dy = -1; dy <= 1; dy++) {
                            if (Math.abs(dx) + Math.abs(dz) + Math.abs(dy) > 3) continue;
                            if (dx === 0 && dz === 0 && dy <= 0) continue;
                            this._setIfInBounds(chunk, lx + dx, top + dy, lz + dz, DARK_OAK_LEAVES);
                        }
                    }
                }
            }
        }
    }
}
