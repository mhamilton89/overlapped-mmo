/**
 * StructureRegistry — pre-built multi-block structure blueprints.
 * Each structure is an array of relative block positions that can be placed as a unit.
 */

import { blockRegistry } from '../world/blocks/BlockRegistry.js';

/**
 * Rotate block positions around Y axis in 90° increments.
 * Transform per step: (x, y, z) → (-z, y, x)
 * @param {Array} blocks - [{x, y, z, blockId}, ...]
 * @param {number} steps - 0-3 rotation steps (0°, 90°, 180°, 270°)
 * @returns {Array} new rotated block array
 */
function rotateBlocks(blocks, steps) {
    const s = ((steps % 4) + 4) % 4;
    if (s === 0) return blocks;

    return blocks.map(b => {
        let { x, y, z, blockId } = b;
        for (let i = 0; i < s; i++) {
            const nx = -z;
            const nz = x;
            x = nx;
            z = nz;
        }
        return { x, y, z, blockId };
    });
}

// ── Block ID shortcuts ──
const LOG = 4;
const LEAVES = 5;
const PLANKS = 6;
const COBBLE = 7;
const STONE = 1;
const DIRT = 2;
const GRASS = 3;
const SAND = 9;
const TORCH = 19;
const LANTERN = 20;
const STONE_BRICK = 25;
const RED_BRICK = 26;
const DARK_PLANKS = 27;
const BIRCH = 28;
const MOSS = 24;
const FLOWER_RED = 47;
const FLOWER_YELLOW = 48;

// ── Structure definitions ──

const STRUCTURES = [
    // ─── Trees ───
    {
        id: 'oak_tree',
        name: 'Oak Tree',
        category: 'Trees',
        icon: [LOG, LEAVES],
        blocks: [
            // Trunk (4 high)
            { x: 0, y: 0, z: 0, blockId: LOG },
            { x: 0, y: 1, z: 0, blockId: LOG },
            { x: 0, y: 2, z: 0, blockId: LOG },
            { x: 0, y: 3, z: 0, blockId: LOG },
            // Canopy layer 1 (y=3) — ring around trunk
            { x: -1, y: 3, z: -1, blockId: LEAVES },
            { x:  0, y: 3, z: -1, blockId: LEAVES },
            { x:  1, y: 3, z: -1, blockId: LEAVES },
            { x: -1, y: 3, z:  0, blockId: LEAVES },
            { x:  1, y: 3, z:  0, blockId: LEAVES },
            { x: -1, y: 3, z:  1, blockId: LEAVES },
            { x:  0, y: 3, z:  1, blockId: LEAVES },
            { x:  1, y: 3, z:  1, blockId: LEAVES },
            // Canopy layer 2 (y=4) — full 3x3
            { x: -1, y: 4, z: -1, blockId: LEAVES },
            { x:  0, y: 4, z: -1, blockId: LEAVES },
            { x:  1, y: 4, z: -1, blockId: LEAVES },
            { x: -1, y: 4, z:  0, blockId: LEAVES },
            { x:  0, y: 4, z:  0, blockId: LEAVES },
            { x:  1, y: 4, z:  0, blockId: LEAVES },
            { x: -1, y: 4, z:  1, blockId: LEAVES },
            { x:  0, y: 4, z:  1, blockId: LEAVES },
            { x:  1, y: 4, z:  1, blockId: LEAVES },
            // Top (y=5) — cross
            { x:  0, y: 5, z:  0, blockId: LEAVES },
            { x: -1, y: 5, z:  0, blockId: LEAVES },
            { x:  1, y: 5, z:  0, blockId: LEAVES },
            { x:  0, y: 5, z: -1, blockId: LEAVES },
            { x:  0, y: 5, z:  1, blockId: LEAVES },
        ],
    },

    {
        id: 'birch_tree',
        name: 'Birch Tree',
        category: 'Trees',
        icon: [LOG, BIRCH],
        blocks: [
            // Trunk (5 high, thinner canopy)
            { x: 0, y: 0, z: 0, blockId: LOG },
            { x: 0, y: 1, z: 0, blockId: LOG },
            { x: 0, y: 2, z: 0, blockId: LOG },
            { x: 0, y: 3, z: 0, blockId: LOG },
            { x: 0, y: 4, z: 0, blockId: LOG },
            // Canopy (y=3-4 ring, y=5 cross)
            { x: -1, y: 3, z:  0, blockId: LEAVES },
            { x:  1, y: 3, z:  0, blockId: LEAVES },
            { x:  0, y: 3, z: -1, blockId: LEAVES },
            { x:  0, y: 3, z:  1, blockId: LEAVES },
            { x: -1, y: 4, z: -1, blockId: LEAVES },
            { x:  0, y: 4, z: -1, blockId: LEAVES },
            { x:  1, y: 4, z: -1, blockId: LEAVES },
            { x: -1, y: 4, z:  0, blockId: LEAVES },
            { x:  1, y: 4, z:  0, blockId: LEAVES },
            { x: -1, y: 4, z:  1, blockId: LEAVES },
            { x:  0, y: 4, z:  1, blockId: LEAVES },
            { x:  1, y: 4, z:  1, blockId: LEAVES },
            { x:  0, y: 5, z:  0, blockId: LEAVES },
            { x: -1, y: 5, z:  0, blockId: LEAVES },
            { x:  1, y: 5, z:  0, blockId: LEAVES },
            { x:  0, y: 5, z: -1, blockId: LEAVES },
            { x:  0, y: 5, z:  1, blockId: LEAVES },
            { x:  0, y: 6, z:  0, blockId: LEAVES },
        ],
    },

    {
        id: 'pine_tree',
        name: 'Pine Tree',
        category: 'Trees',
        icon: [LOG, LEAVES],
        blocks: [
            // Tall trunk (6 high)
            { x: 0, y: 0, z: 0, blockId: LOG },
            { x: 0, y: 1, z: 0, blockId: LOG },
            { x: 0, y: 2, z: 0, blockId: LOG },
            { x: 0, y: 3, z: 0, blockId: LOG },
            { x: 0, y: 4, z: 0, blockId: LOG },
            { x: 0, y: 5, z: 0, blockId: LOG },
            // Bottom cone layer (y=2) — 5x5 cross
            { x: -2, y: 2, z:  0, blockId: LEAVES },
            { x: -1, y: 2, z: -1, blockId: LEAVES },
            { x: -1, y: 2, z:  0, blockId: LEAVES },
            { x: -1, y: 2, z:  1, blockId: LEAVES },
            { x:  0, y: 2, z: -2, blockId: LEAVES },
            { x:  0, y: 2, z: -1, blockId: LEAVES },
            { x:  0, y: 2, z:  1, blockId: LEAVES },
            { x:  0, y: 2, z:  2, blockId: LEAVES },
            { x:  1, y: 2, z: -1, blockId: LEAVES },
            { x:  1, y: 2, z:  0, blockId: LEAVES },
            { x:  1, y: 2, z:  1, blockId: LEAVES },
            { x:  2, y: 2, z:  0, blockId: LEAVES },
            // Mid cone (y=4) — 3x3
            { x: -1, y: 4, z: -1, blockId: LEAVES },
            { x:  0, y: 4, z: -1, blockId: LEAVES },
            { x:  1, y: 4, z: -1, blockId: LEAVES },
            { x: -1, y: 4, z:  0, blockId: LEAVES },
            { x:  1, y: 4, z:  0, blockId: LEAVES },
            { x: -1, y: 4, z:  1, blockId: LEAVES },
            { x:  0, y: 4, z:  1, blockId: LEAVES },
            { x:  1, y: 4, z:  1, blockId: LEAVES },
            // Top cone (y=5-6)
            { x: -1, y: 5, z:  0, blockId: LEAVES },
            { x:  1, y: 5, z:  0, blockId: LEAVES },
            { x:  0, y: 5, z: -1, blockId: LEAVES },
            { x:  0, y: 5, z:  1, blockId: LEAVES },
            { x:  0, y: 6, z:  0, blockId: LEAVES },
        ],
    },

    {
        id: 'bush',
        name: 'Bush',
        category: 'Trees',
        icon: [LEAVES, LEAVES],
        blocks: [
            // 3x2x3 leaf cluster with a hidden log center
            { x: 0, y: 0, z: 0, blockId: LOG },
            { x: -1, y: 0, z:  0, blockId: LEAVES },
            { x:  1, y: 0, z:  0, blockId: LEAVES },
            { x:  0, y: 0, z: -1, blockId: LEAVES },
            { x:  0, y: 0, z:  1, blockId: LEAVES },
            { x: -1, y: 1, z:  0, blockId: LEAVES },
            { x:  1, y: 1, z:  0, blockId: LEAVES },
            { x:  0, y: 1, z: -1, blockId: LEAVES },
            { x:  0, y: 1, z:  1, blockId: LEAVES },
            { x:  0, y: 1, z:  0, blockId: LEAVES },
        ],
    },

    // ─── Nature ───
    {
        id: 'rock_pile',
        name: 'Rock Pile',
        category: 'Nature',
        icon: [STONE, COBBLE],
        blocks: [
            { x: 0, y: 0, z: 0, blockId: COBBLE },
            { x: 1, y: 0, z: 0, blockId: STONE },
            { x: 0, y: 0, z: 1, blockId: COBBLE },
            { x: 1, y: 0, z: 1, blockId: STONE },
            { x: 0, y: 1, z: 0, blockId: STONE },
            { x: 1, y: 1, z: 1, blockId: COBBLE },
        ],
    },

    {
        id: 'boulder',
        name: 'Boulder',
        category: 'Nature',
        icon: [COBBLE, MOSS],
        blocks: [
            // Base 3x3
            { x: -1, y: 0, z:  0, blockId: COBBLE },
            { x:  0, y: 0, z: -1, blockId: COBBLE },
            { x:  0, y: 0, z:  0, blockId: STONE },
            { x:  0, y: 0, z:  1, blockId: COBBLE },
            { x:  1, y: 0, z:  0, blockId: COBBLE },
            // Mid
            { x: -1, y: 1, z:  0, blockId: COBBLE },
            { x:  0, y: 1, z:  0, blockId: STONE },
            { x:  1, y: 1, z:  0, blockId: COBBLE },
            { x:  0, y: 1, z: -1, blockId: MOSS },
            { x:  0, y: 1, z:  1, blockId: COBBLE },
            // Top
            { x:  0, y: 2, z:  0, blockId: MOSS },
        ],
    },

    {
        id: 'flower_patch',
        name: 'Flower Patch',
        category: 'Nature',
        icon: [FLOWER_RED, FLOWER_YELLOW],
        blocks: [
            { x:  0, y: 0, z:  0, blockId: FLOWER_RED },
            { x:  1, y: 0, z:  0, blockId: FLOWER_YELLOW },
            { x: -1, y: 0, z:  1, blockId: FLOWER_RED },
            { x:  0, y: 0, z: -1, blockId: FLOWER_YELLOW },
            { x:  1, y: 0, z:  1, blockId: FLOWER_RED },
        ],
    },

    // ─── Lighting ───
    {
        id: 'lamp_post',
        name: 'Lamp Post',
        category: 'Lighting',
        icon: [STONE_BRICK, LANTERN],
        blocks: [
            { x: 0, y: 0, z: 0, blockId: STONE_BRICK },
            { x: 0, y: 1, z: 0, blockId: STONE_BRICK },
            { x: 0, y: 2, z: 0, blockId: STONE_BRICK },
            { x: 0, y: 3, z: 0, blockId: LANTERN },
        ],
    },

    {
        id: 'campfire',
        name: 'Campfire',
        category: 'Lighting',
        icon: [LOG, TORCH],
        blocks: [
            // Ring of logs
            { x: -1, y: 0, z:  0, blockId: LOG },
            { x:  1, y: 0, z:  0, blockId: LOG },
            { x:  0, y: 0, z: -1, blockId: LOG },
            { x:  0, y: 0, z:  1, blockId: LOG },
            // Center fire
            { x:  0, y: 0, z:  0, blockId: TORCH },
        ],
    },

    // ─── Buildings ───
    {
        id: 'market_stall',
        name: 'Market Stall',
        category: 'Buildings',
        icon: [PLANKS, LOG],
        blocks: (() => {
            const b = [];
            // 4 log posts at corners (3 high)
            for (const [px, pz] of [[-1, -1], [2, -1], [-1, 2], [2, 2]]) {
                b.push({ x: px, y: 0, z: pz, blockId: LOG });
                b.push({ x: px, y: 1, z: pz, blockId: LOG });
                b.push({ x: px, y: 2, z: pz, blockId: LOG });
            }
            // Counter (y=1, oak planks, 4 wide)
            for (let x = -1; x <= 2; x++) {
                b.push({ x, y: 1, z: -1, blockId: PLANKS });
                b.push({ x, y: 1, z:  2, blockId: PLANKS });
            }
            // Roof (y=3, planks, 4x4)
            for (let x = -1; x <= 2; x++) {
                for (let z = -1; z <= 2; z++) {
                    b.push({ x, y: 3, z, blockId: DARK_PLANKS });
                }
            }
            return b;
        })(),
    },

    {
        id: 'watch_tower',
        name: 'Watch Tower',
        category: 'Buildings',
        icon: [STONE_BRICK, PLANKS],
        blocks: (() => {
            const b = [];
            // Stone brick base (3x3, 2 high)
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    if (x === 0 && z === 0) continue; // hollow center
                    b.push({ x, y: 0, z, blockId: STONE_BRICK });
                    b.push({ x, y: 1, z, blockId: STONE_BRICK });
                }
            }
            // Log pillar corners (y=2 to y=5)
            for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
                for (let y = 2; y <= 5; y++) {
                    b.push({ x: px, y, z: pz, blockId: LOG });
                }
            }
            // Platform floor (y=5, 3x3 planks)
            for (let x = -1; x <= 1; x++) {
                for (let z = -1; z <= 1; z++) {
                    b.push({ x, y: 5, z, blockId: PLANKS });
                }
            }
            // Railing (y=6, edges only)
            for (let x = -1; x <= 1; x++) {
                b.push({ x, y: 6, z: -1, blockId: PLANKS });
                b.push({ x, y: 6, z:  1, blockId: PLANKS });
            }
            b.push({ x: -1, y: 6, z: 0, blockId: PLANKS });
            b.push({ x:  1, y: 6, z: 0, blockId: PLANKS });
            // Torch on top
            b.push({ x: 0, y: 6, z: 0, blockId: LANTERN });
            return b;
        })(),
    },

    {
        id: 'small_house',
        name: 'Small House',
        category: 'Buildings',
        icon: [STONE_BRICK, RED_BRICK],
        blocks: (() => {
            const b = [];
            const W = 5, D = 5, WALL_H = 3;

            // Floor (y=0, planks)
            for (let x = 0; x < W; x++) {
                for (let z = 0; z < D; z++) {
                    b.push({ x, y: 0, z, blockId: PLANKS });
                }
            }

            // Walls (y=1 to WALL_H, stone brick, hollow)
            for (let y = 1; y <= WALL_H; y++) {
                for (let x = 0; x < W; x++) {
                    for (let z = 0; z < D; z++) {
                        const isEdge = x === 0 || x === W - 1 || z === 0 || z === D - 1;
                        if (!isEdge) continue;
                        // Door opening (front center, y=1-2)
                        if (x === Math.floor(W / 2) && z === 0 && y <= 2) continue;
                        b.push({ x, y, z, blockId: STONE_BRICK });
                    }
                }
            }

            // Pitched roof (y=WALL_H+1 upward, red brick)
            for (let layer = 0; layer <= 2; layer++) {
                const y = WALL_H + 1 + layer;
                const inset = layer;
                for (let x = inset; x < W - inset; x++) {
                    b.push({ x, y, z: -1 + inset, blockId: RED_BRICK });
                    b.push({ x, y, z: D - inset, blockId: RED_BRICK });
                }
                // Fill between
                if (inset < Math.floor(D / 2)) {
                    for (let x = inset; x < W - inset; x++) {
                        for (let z = inset; z < D + 1 - inset; z++) {
                            // Only roof surface (edges of this layer)
                            if (z === -1 + inset || z === D - inset) continue; // already placed
                            if (layer < 2) continue; // only top ridge is solid
                            b.push({ x, y, z, blockId: RED_BRICK });
                        }
                    }
                }
            }

            // Lantern inside
            b.push({ x: Math.floor(W / 2), y: WALL_H, z: Math.floor(D / 2), blockId: LANTERN });

            return b;
        })(),
    },
];

class StructureRegistry {
    constructor() {
        this.byId = new Map();
        this.categories = {};
        this.allStructures = [];

        for (const s of STRUCTURES) {
            this.byId.set(s.id, s);
            this.allStructures.push(s);
            if (!this.categories[s.category]) {
                this.categories[s.category] = [];
            }
            this.categories[s.category].push(s);
        }
    }

    get(id) {
        return this.byId.get(id) || null;
    }

    getAll() {
        return this.allStructures;
    }

    getCategories() {
        return this.categories;
    }

    /**
     * Get rotated block positions for a structure.
     * @param {string} id - structure ID
     * @param {number} rotation - 0-3 rotation steps
     * @returns {Array|null} rotated blocks or null if not found
     */
    getRotatedBlocks(id, rotation) {
        const s = this.byId.get(id);
        if (!s) return null;
        return rotateBlocks(s.blocks, rotation);
    }

    /**
     * Add a user-created structure (from the Voxel Designer).
     * @param {object} structure - { id, name, category, blocks, icon }
     */
    addUserStructure(structure) {
        this.byId.set(structure.id, structure);
        this.allStructures.push(structure);
        const cat = structure.category || 'Custom';
        if (!this.categories[cat]) {
            this.categories[cat] = [];
        }
        this.categories[cat].push(structure);
    }
}

export const structureRegistry = new StructureRegistry();
