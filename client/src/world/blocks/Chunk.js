/**
 * Chunk — 16x16x16 block storage unit.
 * Coordinates: cx, cy, cz are chunk-space coords (world = chunk * 16).
 */

export const CHUNK_SIZE = 16;

export class Chunk {
    constructor(cx, cy, cz) {
        this.cx = cx;
        this.cy = cy;
        this.cz = cz;
        this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE);
        this.dirty = true;   // needs meshing
        this.mesh = null;     // THREE.Mesh once built
        this.transparentMesh = null;
    }

    static index(x, y, z) {
        return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x;
    }

    getBlock(x, y, z) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return 0;
        return this.blocks[Chunk.index(x, y, z)];
    }

    setBlock(x, y, z, id) {
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) return;
        this.blocks[Chunk.index(x, y, z)] = id;
        this.dirty = true;
    }

    /** Convert local chunk coords to world coords */
    toWorldX(lx) { return this.cx * CHUNK_SIZE + lx; }
    toWorldY(ly) { return this.cy * CHUNK_SIZE + ly; }
    toWorldZ(lz) { return this.cz * CHUNK_SIZE + lz; }

    /** World coords of chunk origin */
    get worldX() { return this.cx * CHUNK_SIZE; }
    get worldY() { return this.cy * CHUNK_SIZE; }
    get worldZ() { return this.cz * CHUNK_SIZE; }
}
