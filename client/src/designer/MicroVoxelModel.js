/**
 * MicroVoxelModel — sparse 3D voxel grid with RGB colors.
 *
 * Used for designing equipment (armor/weapons) and world assets
 * inside the in-game voxel designer.  Each voxel stores an RGB
 * color; empty cells are simply absent from the map.
 */

export class MicroVoxelModel {
    constructor(width = 16, height = 16, depth = 16) {
        this.width = width;
        this.height = height;
        this.depth = depth;
        this.voxels = new Map(); // "x,y,z" → { r, g, b }
    }

    _key(x, y, z) { return `${x},${y},${z}`; }

    inBounds(x, y, z) {
        return x >= 0 && x < this.width &&
               y >= 0 && y < this.height &&
               z >= 0 && z < this.depth;
    }

    get(x, y, z) {
        return this.voxels.get(this._key(x, y, z)) || null;
    }

    set(x, y, z, r, g, b) {
        if (!this.inBounds(x, y, z)) return;
        this.voxels.set(this._key(x, y, z), { r, g, b });
    }

    remove(x, y, z) {
        this.voxels.delete(this._key(x, y, z));
    }

    clear() {
        this.voxels.clear();
    }

    get count() { return this.voxels.size; }

    /** Iterate all filled voxels: callback(x, y, z, {r, g, b}) */
    forEach(cb) {
        for (const [key, color] of this.voxels) {
            const [x, y, z] = key.split(',').map(Number);
            cb(x, y, z, color);
        }
    }

    clone() {
        const m = new MicroVoxelModel(this.width, this.height, this.depth);
        for (const [key, color] of this.voxels) {
            m.voxels.set(key, { ...color });
        }
        return m;
    }

    /** Serialize to a plain object (sparse voxel list). */
    serialize() {
        const voxels = [];
        for (const [key, c] of this.voxels) {
            const [x, y, z] = key.split(',').map(Number);
            voxels.push([x, y, z, c.r, c.g, c.b]);
        }
        return {
            width: this.width,
            height: this.height,
            depth: this.depth,
            voxels,
        };
    }

    static deserialize(data) {
        const m = new MicroVoxelModel(data.width, data.height, data.depth);
        for (const v of data.voxels) {
            m.set(v[0], v[1], v[2], v[3], v[4], v[5]);
        }
        return m;
    }
}
