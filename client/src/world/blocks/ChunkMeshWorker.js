/**
 * ChunkMeshWorker — Web Worker that runs greedy meshing off the main thread.
 * Receives chunk data + neighbors, returns geometry buffers via transferable objects.
 */

import { greedyMesh } from './ChunkMesher.js';

self.onmessage = function (e) {
    const { id, blocks, neighbors, blockDefs } = e.data;

    const result = greedyMesh(blocks, neighbors, blockDefs);

    // Transfer ownership of typed arrays back to main thread (zero-copy)
    self.postMessage(
        { id, result },
        [
            result.positions.buffer,
            result.normals.buffer,
            result.colors.buffer,
            result.indices.buffer,
            result.tPositions.buffer,
            result.tNormals.buffer,
            result.tColors.buffer,
            result.tIndices.buffer,
        ]
    );
};
