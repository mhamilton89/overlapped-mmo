/**
 * VoxelRaycast — DDA (Digital Differential Analyzer) ray-voxel traversal.
 * Walks along a ray through the block grid, returns the first solid block hit.
 */

import { blockRegistry } from './BlockRegistry.js';

/**
 * Cast a ray through the voxel world.
 * @param {ChunkManager} chunkManager
 * @param {THREE.Vector3} origin - ray start (camera position)
 * @param {THREE.Vector3} direction - normalized ray direction
 * @param {number} maxDistance - max blocks to traverse
 * @returns {{ hit: boolean, position?: [number,number,number], normal?: [number,number,number], blockId?: number }}
 */
export function raycastVoxels(chunkManager, origin, direction, maxDistance = 64) {
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);

    const dx = direction.x;
    const dy = direction.y;
    const dz = direction.z;

    // Step direction (+1 or -1)
    const stepX = dx > 0 ? 1 : -1;
    const stepY = dy > 0 ? 1 : -1;
    const stepZ = dz > 0 ? 1 : -1;

    // Distance along ray to cross one voxel boundary on each axis
    const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity;
    const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity;

    // Distance to the next voxel boundary on each axis
    let tMaxX = dx !== 0
        ? ((dx > 0 ? (x + 1 - origin.x) : (origin.x - x)) * tDeltaX)
        : Infinity;
    let tMaxY = dy !== 0
        ? ((dy > 0 ? (y + 1 - origin.y) : (origin.y - y)) * tDeltaY)
        : Infinity;
    let tMaxZ = dz !== 0
        ? ((dz > 0 ? (z + 1 - origin.z) : (origin.z - z)) * tDeltaZ)
        : Infinity;

    // Track which face was last stepped (for normal calculation)
    let lastAxis = -1; // 0=X, 1=Y, 2=Z
    let distance = 0;

    while (distance < maxDistance) {
        // Check current voxel
        const blockId = chunkManager.getBlock(x, y, z);
        if (blockId !== 0 && blockRegistry.isSolid(blockId)) {
            // Compute the face normal (opposite of step direction on last axis)
            const normal = [0, 0, 0];
            if (lastAxis === 0) normal[0] = -stepX;
            else if (lastAxis === 1) normal[1] = -stepY;
            else if (lastAxis === 2) normal[2] = -stepZ;
            else {
                // First check (origin is inside a block) — use upward normal
                normal[1] = 1;
            }

            return {
                hit: true,
                position: [x, y, z],
                normal,
                blockId,
            };
        }

        // Step to next voxel boundary
        if (tMaxX < tMaxY) {
            if (tMaxX < tMaxZ) {
                x += stepX;
                distance = tMaxX;
                tMaxX += tDeltaX;
                lastAxis = 0;
            } else {
                z += stepZ;
                distance = tMaxZ;
                tMaxZ += tDeltaZ;
                lastAxis = 2;
            }
        } else {
            if (tMaxY < tMaxZ) {
                y += stepY;
                distance = tMaxY;
                tMaxY += tDeltaY;
                lastAxis = 1;
            } else {
                z += stepZ;
                distance = tMaxZ;
                tMaxZ += tDeltaZ;
                lastAxis = 2;
            }
        }
    }

    return { hit: false };
}
