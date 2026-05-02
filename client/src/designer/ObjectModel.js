/**
 * ObjectModel — data model for Object Mode in the Voxel Designer.
 *
 * Stores an array of 3D primitive definitions (position, rotation, scale,
 * geometry params, material).  Serializable to JSON for save/load.
 */

// Default geometry params per shape type
const SHAPE_DEFAULTS = {
    box:      { width: 1, height: 1, depth: 1 },
    sphere:   { radius: 0.5, widthSegments: 14, heightSegments: 10 },
    cylinder: { radiusTop: 0.5, radiusBottom: 0.5, height: 1, segments: 14 },
    cone:     { radius: 0.5, height: 1, segments: 14 },
    torus:    { radius: 0.5, tube: 0.15, radialSegments: 12, tubularSegments: 24 },
    wedge:    { width: 1, height: 1, depth: 1 },
    tube:     { length: 1.2, radius: 0.08, bend: 0.15, taper: 0.6, tubularSegments: 24, radialSegments: 8 },
};

const DEFAULT_MATERIAL = {
    color: [142, 142, 148],
    metalness: 0.6,
    roughness: 0.4,
    emissive: [0, 0, 0],
    emissiveIntensity: 0,
    faceColors: null,  // null OR [r,g,b][6] — only respected for box
    glowFaces: null,   // null OR bool[6] — which faces apply the emissive (box only)
};

export { SHAPE_DEFAULTS, DEFAULT_MATERIAL };

export class ObjectModel {
    constructor() {
        this.objects = [];
        this._nextId = 1;
        this._nextGroupId = 1;
    }

    /** Allocate a new unique group id, e.g. "g_3". */
    nextGroupId() {
        return `g_${this._nextGroupId++}`;
    }

    /** Add a new object definition and return it (with generated id). */
    add(type, overrides = {}) {
        const obj = {
            id: `obj_${this._nextId++}`,
            type,
            params: { ...SHAPE_DEFAULTS[type] },
            position: [0, 0, 0],
            rotation: [0, 0, 0],
            scale: [1, 1, 1],
            material: { ...DEFAULT_MATERIAL },
            mirror: false,
            groupId: null,
            ...overrides,
        };
        // Ensure nested objects are copies
        if (overrides.params) obj.params = { ...SHAPE_DEFAULTS[type], ...overrides.params };
        if (overrides.material) obj.material = { ...DEFAULT_MATERIAL, ...overrides.material };
        if (overrides.position) obj.position = [...overrides.position];
        if (overrides.rotation) obj.rotation = [...overrides.rotation];
        if (overrides.scale) obj.scale = [...overrides.scale];

        this.objects.push(obj);
        return obj;
    }

    /** Remove an object by id. Returns the removed def or null. */
    remove(id) {
        const idx = this.objects.findIndex(o => o.id === id);
        if (idx === -1) return null;
        return this.objects.splice(idx, 1)[0];
    }

    /** Get object def by id. */
    get(id) {
        return this.objects.find(o => o.id === id) || null;
    }

    /** Merge partial changes into an existing object. */
    update(id, changes) {
        const obj = this.get(id);
        if (!obj) return;
        if (changes.position) obj.position = [...changes.position];
        if (changes.rotation) obj.rotation = [...changes.rotation];
        if (changes.scale) obj.scale = [...changes.scale];
        if (changes.params) Object.assign(obj.params, changes.params);
        if (changes.material) Object.assign(obj.material, changes.material);
        if (changes.mirror !== undefined) obj.mirror = !!changes.mirror;
        if (changes.groupId !== undefined) obj.groupId = changes.groupId;
    }

    /** Return all object ids that share a given groupId (excluding null). */
    getGroupMembers(groupId) {
        if (!groupId) return [];
        return this.objects.filter(o => o.groupId === groupId).map(o => o.id);
    }

    /** Get count. */
    get count() {
        return this.objects.length;
    }

    /** Get all objects (shallow copy of array). */
    getAll() {
        return this.objects.slice();
    }

    /** Remove all objects. */
    clear() {
        this.objects = [];
    }

    /** Deep clone an object def (with new id). */
    clone(id) {
        const src = this.get(id);
        if (!src) return null;
        const clonedMat = { ...src.material };
        if (Array.isArray(src.material.faceColors)) {
            clonedMat.faceColors = src.material.faceColors.map(c => c.slice());
        }
        if (Array.isArray(src.material.glowFaces)) {
            clonedMat.glowFaces = src.material.glowFaces.slice();
        }
        if (Array.isArray(src.material.emissive)) clonedMat.emissive = src.material.emissive.slice();
        return this.add(src.type, {
            params: { ...src.params },
            position: [...src.position],
            rotation: [...src.rotation],
            scale: [...src.scale],
            material: clonedMat,
            mirror: src.mirror,
            groupId: src.groupId,
        });
    }

    /** Serialize to JSON-safe data. */
    serialize() {
        return {
            objects: this.objects.map(o => ({
                ...o,
                params: { ...o.params },
                position: [...o.position],
                rotation: [...o.rotation],
                scale: [...o.scale],
                material: { ...o.material },
            })),
        };
    }

    /** Restore from serialized data. */
    static deserialize(data) {
        const model = new ObjectModel();
        if (!data?.objects) return model;
        for (const o of data.objects) {
            model.objects.push({
                id: o.id,
                type: o.type,
                params: { ...o.params },
                position: [...o.position],
                rotation: [...o.rotation],
                scale: [...o.scale],
                material: { ...o.material },
                mirror: !!o.mirror,
                groupId: o.groupId ?? null,
            });
        }
        // Set nextId past any existing ids
        let maxNum = 0;
        let maxGroup = 0;
        for (const o of model.objects) {
            const n = parseInt(o.id.replace('obj_', ''));
            if (n > maxNum) maxNum = n;
            if (o.groupId) {
                const g = parseInt(String(o.groupId).replace('g_', ''));
                if (Number.isFinite(g) && g > maxGroup) maxGroup = g;
            }
        }
        model._nextId = maxNum + 1;
        model._nextGroupId = maxGroup + 1;
        return model;
    }
}
