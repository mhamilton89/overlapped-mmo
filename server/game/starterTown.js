// Starter town layout shared between server seed and client offline stamp.
// KEEP IN SYNC with client/src/world/StarterTown.js — same block ids, same
// positions, same layout. Server is CJS, client is ESM — hence the duplication.

const pool = require('../db/pool');
const worldBlocks = require('../db/queries/worldBlocks');

const LOG = 4;
const LEAVES = 5;
const PLANKS = 6;
const COBBLE = 7;
const DIRT = 2;
const GRASS = 3;
const TORCH = 19;
const LANTERN = 20;
const STONE_BRICK = 25;
const RED_BRICK = 26;
const DARK_PLANKS = 27;
const BIRCH = 28;
const FLOWER_RED = 47;
const FLOWER_YELLOW = 48;

// Seed marker: if this (x,y,z) already has a torch, assume the town is seeded.
const MARKER = { x: 0, y: 21, z: 3, blockId: TORCH };

function rotateBlocks(blocks, steps) {
    const s = ((steps % 4) + 4) % 4;
    if (s === 0) return blocks.map(b => ({ ...b }));
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

function stamp(out, ox, oy, oz, blocks, rotation = 0) {
    const rotated = rotateBlocks(blocks, rotation);
    for (const b of rotated) {
        out.push({ x: ox + b.x, y: oy + b.y, z: oz + b.z, blockId: b.blockId });
    }
}

function oakTree() {
    const b = [];
    for (let y = 0; y < 4; y++) b.push({ x: 0, y, z: 0, blockId: LOG });
    for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
            if (x === 0 && z === 0) continue;
            b.push({ x, y: 3, z, blockId: LEAVES });
            b.push({ x, y: 4, z, blockId: LEAVES });
        }
    }
    b.push({ x: 0, y: 4, z: 0, blockId: LEAVES });
    b.push({ x: 0, y: 5, z: 0, blockId: LEAVES });
    b.push({ x: -1, y: 5, z: 0, blockId: LEAVES });
    b.push({ x: 1, y: 5, z: 0, blockId: LEAVES });
    b.push({ x: 0, y: 5, z: -1, blockId: LEAVES });
    b.push({ x: 0, y: 5, z: 1, blockId: LEAVES });
    return b;
}

function birchTree() {
    const b = [];
    for (let y = 0; y < 5; y++) b.push({ x: 0, y, z: 0, blockId: BIRCH });
    b.push({ x: -1, y: 3, z: 0, blockId: LEAVES });
    b.push({ x: 1, y: 3, z: 0, blockId: LEAVES });
    b.push({ x: 0, y: 3, z: -1, blockId: LEAVES });
    b.push({ x: 0, y: 3, z: 1, blockId: LEAVES });
    for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
            if (x === 0 && z === 0) continue;
            b.push({ x, y: 4, z, blockId: LEAVES });
        }
    }
    b.push({ x: 0, y: 5, z: 0, blockId: LEAVES });
    b.push({ x: -1, y: 5, z: 0, blockId: LEAVES });
    b.push({ x: 1, y: 5, z: 0, blockId: LEAVES });
    b.push({ x: 0, y: 5, z: -1, blockId: LEAVES });
    b.push({ x: 0, y: 5, z: 1, blockId: LEAVES });
    b.push({ x: 0, y: 6, z: 0, blockId: LEAVES });
    return b;
}

function bush() {
    return [
        { x: 0, y: 0, z: 0, blockId: LEAVES },
        { x: -1, y: 0, z: 0, blockId: LEAVES },
        { x: 1, y: 0, z: 0, blockId: LEAVES },
        { x: 0, y: 0, z: -1, blockId: LEAVES },
        { x: 0, y: 0, z: 1, blockId: LEAVES },
        { x: 0, y: 1, z: 0, blockId: LEAVES },
    ];
}

function flowerPatch() {
    return [
        { x: 0, y: 0, z: 0, blockId: FLOWER_RED },
        { x: 1, y: 0, z: 0, blockId: FLOWER_YELLOW },
        { x: -1, y: 0, z: 1, blockId: FLOWER_RED },
        { x: 0, y: 0, z: -1, blockId: FLOWER_YELLOW },
        { x: 1, y: 0, z: 1, blockId: FLOWER_RED },
    ];
}

function lampPost() {
    return [
        { x: 0, y: 0, z: 0, blockId: STONE_BRICK },
        { x: 0, y: 1, z: 0, blockId: STONE_BRICK },
        { x: 0, y: 2, z: 0, blockId: STONE_BRICK },
        { x: 0, y: 3, z: 0, blockId: LANTERN },
    ];
}

function campfire() {
    return [
        { x: -1, y: 0, z: 0, blockId: LOG },
        { x: 1, y: 0, z: 0, blockId: LOG },
        { x: 0, y: 0, z: -1, blockId: LOG },
        { x: 0, y: 0, z: 1, blockId: LOG },
        { x: 0, y: 0, z: 0, blockId: TORCH },
    ];
}

function marketStall() {
    const b = [];
    for (const [px, pz] of [[-1, -1], [2, -1], [-1, 2], [2, 2]]) {
        for (let y = 0; y <= 2; y++) b.push({ x: px, y, z: pz, blockId: LOG });
    }
    for (let x = -1; x <= 2; x++) {
        b.push({ x, y: 1, z: -1, blockId: PLANKS });
        b.push({ x, y: 1, z: 2, blockId: PLANKS });
    }
    for (let x = -1; x <= 2; x++) {
        for (let z = -1; z <= 2; z++) {
            b.push({ x, y: 3, z, blockId: DARK_PLANKS });
        }
    }
    return b;
}

function watchTower() {
    const b = [];
    for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
            if (x === 0 && z === 0) continue;
            b.push({ x, y: 0, z, blockId: STONE_BRICK });
            b.push({ x, y: 1, z, blockId: STONE_BRICK });
        }
    }
    for (const [px, pz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        for (let y = 2; y <= 5; y++) b.push({ x: px, y, z: pz, blockId: LOG });
    }
    for (let x = -1; x <= 1; x++) {
        for (let z = -1; z <= 1; z++) {
            b.push({ x, y: 5, z, blockId: PLANKS });
        }
    }
    for (let x = -1; x <= 1; x++) {
        b.push({ x, y: 6, z: -1, blockId: PLANKS });
        b.push({ x, y: 6, z: 1, blockId: PLANKS });
    }
    b.push({ x: -1, y: 6, z: 0, blockId: PLANKS });
    b.push({ x: 1, y: 6, z: 0, blockId: PLANKS });
    b.push({ x: 0, y: 6, z: 0, blockId: LANTERN });
    return b;
}

function smallHouse() {
    const b = [];
    const W = 5, D = 5, WALL_H = 3;
    for (let x = 0; x < W; x++) {
        for (let z = 0; z < D; z++) {
            b.push({ x, y: 0, z, blockId: PLANKS });
        }
    }
    for (let y = 1; y <= WALL_H; y++) {
        for (let x = 0; x < W; x++) {
            for (let z = 0; z < D; z++) {
                const isEdge = x === 0 || x === W - 1 || z === 0 || z === D - 1;
                if (!isEdge) continue;
                if (x === Math.floor(W / 2) && z === 0 && y <= 2) continue; // door
                b.push({ x, y, z, blockId: STONE_BRICK });
            }
        }
    }
    for (let layer = 0; layer <= 2; layer++) {
        const y = WALL_H + 1 + layer;
        const inset = layer;
        for (let x = inset; x < W - inset; x++) {
            b.push({ x, y, z: -1 + inset, blockId: RED_BRICK });
            b.push({ x, y, z: D - inset, blockId: RED_BRICK });
        }
        if (layer === 2) {
            for (let x = inset; x < W - inset; x++) {
                for (let z = inset; z < D + 1 - inset; z++) {
                    if (z === -1 + inset || z === D - inset) continue;
                    b.push({ x, y, z, blockId: RED_BRICK });
                }
            }
        }
    }
    b.push({ x: Math.floor(W / 2), y: WALL_H, z: Math.floor(D / 2), blockId: LANTERN });
    return b;
}

/**
 * Build the complete starter town as a flat list of absolute-positioned blocks.
 * Returns [{x, y, z, blockId}, ...]. Caller deduplicates (last write wins).
 */
function buildStarterTown() {
    const out = [];
    const GROUND = 20;    // top grass layer
    const ABOVE = 21;     // first air layer above grass

    // ── Plaza: 11x11 cobble replacing grass at y=20 ──
    for (let x = -5; x <= 5; x++) {
        for (let z = -5; z <= 5; z++) {
            out.push({ x, y: GROUND, z, blockId: COBBLE });
        }
    }

    // ── Dirt paths in 4 cardinal directions (3 wide, 8 long) ──
    for (let d = 6; d <= 13; d++) {
        for (let w = -1; w <= 1; w++) {
            out.push({ x: w, y: GROUND, z: d, blockId: DIRT });   // north
            out.push({ x: w, y: GROUND, z: -d, blockId: DIRT });  // south
            out.push({ x: d, y: GROUND, z: w, blockId: DIRT });   // east
            out.push({ x: -d, y: GROUND, z: w, blockId: DIRT });  // west
        }
    }

    // ── Campfire at plaza center-north (3 blocks north of spawn) ──
    stamp(out, 0, ABOVE, 3, campfire());

    // ── Lamp posts at 4 plaza corners ──
    stamp(out, -5, ABOVE, -5, lampPost());
    stamp(out,  5, ABOVE, -5, lampPost());
    stamp(out, -5, ABOVE,  5, lampPost());
    stamp(out,  5, ABOVE,  5, lampPost());

    // ── Houses in outer ring, doors facing plaza ──
    // Small house base extent: x=[0,4], z=[-1,D]. Rotate so the z=0 door faces
    // the plaza center, then translate to the quadrant.
    // NE house — door on south face
    stamp(out, 8, ABOVE, 8, smallHouse(), 0);
    // NW house — rotated so door faces east (toward plaza)
    stamp(out, -9, ABOVE, 8, smallHouse(), 1);
    // SW house — door faces north
    stamp(out, -13, ABOVE, -9, smallHouse(), 2);
    // SE house — door faces west
    stamp(out, 13, ABOVE, -9, smallHouse(), 3);

    // ── Market stall along west path ──
    stamp(out, -8, ABOVE, 0, marketStall());

    // ── Watch tower north of town ──
    stamp(out, 0, ABOVE, 16, watchTower());

    // ── Trees in the outer decor ring (avoid paths & buildings) ──
    const trees = [
        [-18, ABOVE, -4, 'oak'],
        [-16, ABOVE, 14, 'birch'],
        [-4, ABOVE, -17, 'oak'],
        [7, ABOVE, -18, 'birch'],
        [17, ABOVE, 4, 'oak'],
        [18, ABOVE, 15, 'birch'],
        [14, ABOVE, -16, 'oak'],
        [-20, ABOVE, 2, 'oak'],
    ];
    for (const [tx, ty, tz, kind] of trees) {
        stamp(out, tx, ty, tz, kind === 'birch' ? birchTree() : oakTree());
    }

    // ── Bushes around town perimeter ──
    const bushes = [[-7, 7], [7, -7], [-7, -7], [7, 7], [12, 3], [-12, 3], [3, 12], [3, -12]];
    for (const [bx, bz] of bushes) stamp(out, bx, ABOVE, bz, bush());

    // ── Flower patches in plaza corners and along paths ──
    const flowers = [[-4, 4], [4, -4], [-4, -4], [4, 4], [0, 8], [0, -8], [8, 0], [-8, 0]];
    for (const [fx, fz] of flowers) stamp(out, fx, ABOVE, fz, flowerPatch());

    return out;
}

async function isSeeded() {
    const res = await pool.query(
        'SELECT block_id FROM world_blocks WHERE x = $1 AND y = $2 AND z = $3',
        [MARKER.x, MARKER.y, MARKER.z]
    );
    return res.rows.length > 0 && res.rows[0].block_id === MARKER.blockId;
}

async function seedStarterTown() {
    if (await isSeeded()) {
        console.log('Starter town already seeded, skipping.');
        return;
    }
    const blocks = buildStarterTown();
    await worldBlocks.setBlockBatch(blocks, null);
    console.log(`Seeded starter town (${blocks.length} blocks).`);
}

module.exports = {
    buildStarterTown,
    seedStarterTown,
    MARKER,
};
