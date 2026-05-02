/**
 * MicroVoxelMesher — builds Three.js BufferGeometry from a MicroVoxelModel.
 *
 * Used both inside the designer viewport and when rendering voxel equipment
 * on characters in-game.  Per-face direction shading gives depth cues.
 */

import * as THREE from 'three';

// Face definitions: direction, 4 corner offsets (CCW winding from outside), shading
const FACES = [
    { // -X
        dir: [-1, 0, 0],
        corners: [[0,0,0], [0,0,1], [0,1,1], [0,1,0]],
        shade: 0.80,
    },
    { // +X
        dir: [1, 0, 0],
        corners: [[1,0,1], [1,0,0], [1,1,0], [1,1,1]],
        shade: 0.80,
    },
    { // -Y
        dir: [0, -1, 0],
        corners: [[0,0,0], [1,0,0], [1,0,1], [0,0,1]],
        shade: 0.55,
    },
    { // +Y
        dir: [0, 1, 0],
        corners: [[0,1,1], [1,1,1], [1,1,0], [0,1,0]],
        shade: 1.0,
    },
    { // -Z
        dir: [0, 0, -1],
        corners: [[1,0,0], [0,0,0], [0,1,0], [1,1,0]],
        shade: 0.90,
    },
    { // +Z
        dir: [0, 0, 1],
        corners: [[0,0,1], [1,0,1], [1,1,1], [0,1,1]],
        shade: 0.90,
    },
];

/**
 * Build a BufferGeometry for a MicroVoxelModel.
 * @param {MicroVoxelModel} model
 * @returns {THREE.BufferGeometry}
 */
export function buildVoxelGeometry(model) {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    let vert = 0;

    model.forEach((x, y, z, color) => {
        const r = color.r / 255;
        const g = color.g / 255;
        const b = color.b / 255;

        for (const face of FACES) {
            const nx = x + face.dir[0];
            const ny = y + face.dir[1];
            const nz = z + face.dir[2];

            // Only emit face if neighbor is empty (or out of bounds)
            if (model.inBounds(nx, ny, nz) && model.get(nx, ny, nz)) continue;
            if (!model.inBounds(nx, ny, nz) && false) continue; // always show boundary faces

            const s = face.shade;
            for (const c of face.corners) {
                positions.push(x + c[0], y + c[1], z + c[2]);
                normals.push(face.dir[0], face.dir[1], face.dir[2]);
                colors.push(r * s, g * s, b * s);
            }
            indices.push(vert, vert + 1, vert + 2, vert, vert + 2, vert + 3);
            vert += 4;
        }
    });

    const geo = new THREE.BufferGeometry();
    if (positions.length > 0) {
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
    }
    return geo;
}

/**
 * Create a Three.js Mesh suitable for the designer viewport.
 * Uses MeshStandardMaterial with vertexColors for nice lighting.
 */
export function buildDesignerMesh(model) {
    const geo = buildVoxelGeometry(model);
    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.6,
        metalness: 0.2,
    });
    return new THREE.Mesh(geo, mat);
}

/**
 * Create a Three.js Mesh for use as equipment on a character.
 * @param {MicroVoxelModel} model
 * @param {number} scale - world-space size per voxel (e.g. 0.03)
 * @param {object} [opts] - { metalness, roughness }
 */
export function buildEquipmentMesh(model, scale = 0.03, opts = {}) {
    const geo = buildVoxelGeometry(model);

    // Center the geometry around (0, 0, 0) then scale
    const cx = model.width / 2;
    const cy = model.height / 2;
    const cz = model.depth / 2;
    geo.translate(-cx, -cy, -cz);
    geo.scale(scale, scale, scale);

    const mat = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: opts.roughness ?? 0.5,
        metalness: opts.metalness ?? 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
}
