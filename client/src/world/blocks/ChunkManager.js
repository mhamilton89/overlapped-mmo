/**
 * ChunkManager — loads, unloads, and renders chunks around the player.
 * Uses a Web Worker pool for off-thread greedy meshing.
 */

import * as THREE from 'three';
import { Chunk, CHUNK_SIZE } from './Chunk.js';
import { blockRegistry } from './BlockRegistry.js';
import { greedyMesh } from './ChunkMesher.js';
import ChunkMeshWorkerURL from './ChunkMeshWorker.js?worker&url';

const RENDER_DIST_H = 6;  // horizontal chunk radius
const RENDER_DIST_V = 3;  // vertical chunk radius
const WORKER_COUNT = 2;
const MAX_MESHES_PER_FRAME = 4; // limit mesh builds per frame to avoid stutter

export class ChunkManager {
    constructor(scene, terrainGenerator) {
        this.scene = scene;
        this.terrainGenerator = terrainGenerator;
        this.wsClient = null;           // set by Game.js when connected
        this.pendingDeltas = new Set();  // chunk keys awaiting delta response
        this.chunks = new Map();        // "cx,cy,cz" -> Chunk
        this.meshGroup = new THREE.Group();
        this.scene.add(this.meshGroup);

        // MeshBasicMaterial ignores lighting entirely — vertex color IS the
        // pixel color. This guarantees visible output; we bake face-direction
        // shading and AO into the vertex colors themselves.
        this.materialModes = ['basic', 'lambert', 'standard'];
        this.materialModeIndex = 0; // default: basic (unlit, bulletproof)
        this.opaqueMaterial = this._buildOpaqueMaterial(this.materialModes[this.materialModeIndex]);
        this.transparentMaterial = this._buildTransparentMaterial(this.materialModes[this.materialModeIndex]);

        // Diagnostic stats
        this._lastMeshStats = null;

        // Block defs for workers
        this.blockDefs = blockRegistry.toFlatArray();

        // Worker pool
        this.workers = [];
        this.workerBusy = [];
        this.meshQueue = [];      // chunks waiting to be meshed
        this.pendingMeshes = new Map(); // id -> { chunk, resolve }
        this.nextMeshId = 0;
        this._initWorkers();
    }

    _buildOpaqueMaterial(mode) {
        if (mode === 'basic') {
            return new THREE.MeshBasicMaterial({ vertexColors: true });
        }
        if (mode === 'standard') {
            return new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.95,
                metalness: 0.0,
                flatShading: true,
            });
        }
        // lambert (default)
        return new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true });
    }

    _buildTransparentMaterial(mode) {
        const opts = {
            vertexColors: true,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
            depthWrite: false,
        };
        if (mode === 'basic') return new THREE.MeshBasicMaterial(opts);
        if (mode === 'standard') return new THREE.MeshStandardMaterial({ ...opts, roughness: 0.7, metalness: 0.0, flatShading: true });
        return new THREE.MeshLambertMaterial({ ...opts, flatShading: true });
    }

    /** Cycle opaque material between Basic/Lambert/Standard — for diagnostic. */
    cycleMaterial() {
        this.materialModeIndex = (this.materialModeIndex + 1) % this.materialModes.length;
        const mode = this.materialModes[this.materialModeIndex];
        const newOpaque = this._buildOpaqueMaterial(mode);
        const newTrans = this._buildTransparentMaterial(mode);
        // Retarget existing meshes
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh) chunk.mesh.material = newOpaque;
            if (chunk.transparentMesh) chunk.transparentMesh.material = newTrans;
        }
        this.opaqueMaterial.dispose();
        this.transparentMaterial.dispose();
        this.opaqueMaterial = newOpaque;
        this.transparentMaterial = newTrans;
        console.log(`[ChunkManager] Material mode: ${mode}`);
        return mode;
    }

    _initWorkers() {
        for (let i = 0; i < WORKER_COUNT; i++) {
            try {
                const worker = new Worker(ChunkMeshWorkerURL, { type: 'module' });
                worker.onmessage = (e) => this._onWorkerResult(i, e.data);
                worker.onerror = (err) => {
                    console.warn('[ChunkManager] Worker error, falling back to main thread meshing', err);
                    this.workerBusy[i] = false;
                };
                this.workers.push(worker);
                this.workerBusy.push(false);
            } catch (err) {
                console.warn('[ChunkManager] Could not create worker, will mesh on main thread', err);
            }
        }
    }

    _onWorkerResult(workerIdx, data) {
        this.workerBusy[workerIdx] = false;
        const pending = this.pendingMeshes.get(data.id);
        if (pending) {
            this.pendingMeshes.delete(data.id);
            this._applyMeshResult(pending.chunk, data.result);
        }
        this._flushQueue();
    }

    _flushQueue() {
        while (this.meshQueue.length > 0) {
            const freeWorker = this.workerBusy.indexOf(false);
            if (freeWorker === -1) break;
            const chunk = this.meshQueue.shift();
            this._sendToWorker(freeWorker, chunk);
        }
    }

    _sendToWorker(workerIdx, chunk) {
        const neighbors = this._getNeighborArrays(chunk);
        const id = this.nextMeshId++;
        this.pendingMeshes.set(id, { chunk });
        this.workerBusy[workerIdx] = true;

        this.workers[workerIdx].postMessage({
            id,
            blocks: chunk.blocks,
            neighbors,
            blockDefs: this.blockDefs,
        });
    }

    _getNeighborArrays(chunk) {
        const dirs = [[-1,0,0],[1,0,0],[0,-1,0],[0,1,0],[0,0,-1],[0,0,1]];
        return dirs.map(([dx, dy, dz]) => {
            const key = `${chunk.cx + dx},${chunk.cy + dy},${chunk.cz + dz}`;
            const n = this.chunks.get(key);
            return n ? n.blocks : null;
        });
    }

    _applyMeshResult(chunk, result) {
        // Remove old meshes
        if (chunk.mesh) {
            this.meshGroup.remove(chunk.mesh);
            chunk.mesh.geometry.dispose();
            chunk.mesh = null;
        }
        if (chunk.transparentMesh) {
            this.meshGroup.remove(chunk.transparentMesh);
            chunk.transparentMesh.geometry.dispose();
            chunk.transparentMesh = null;
        }

        // Opaque mesh
        if (result.indices.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(result.positions, 3));
            geo.setAttribute('normal', new THREE.BufferAttribute(result.normals, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(result.colors, 3));
            geo.setIndex(new THREE.BufferAttribute(result.indices, 1));
            geo.computeBoundingSphere();

            chunk.mesh = new THREE.Mesh(geo, this.opaqueMaterial);
            chunk.mesh.position.set(chunk.worldX, chunk.worldY, chunk.worldZ);
            this.meshGroup.add(chunk.mesh);

            // Diagnostic: record vertex-color range for the first chunk we mesh
            if (!this._lastMeshStats) {
                const c = result.colors;
                let minR = 1, minG = 1, minB = 1, maxR = 0, maxG = 0, maxB = 0;
                let sumR = 0, sumG = 0, sumB = 0;
                for (let i = 0; i < c.length; i += 3) {
                    if (c[i] < minR) minR = c[i];
                    if (c[i+1] < minG) minG = c[i+1];
                    if (c[i+2] < minB) minB = c[i+2];
                    if (c[i] > maxR) maxR = c[i];
                    if (c[i+1] > maxG) maxG = c[i+1];
                    if (c[i+2] > maxB) maxB = c[i+2];
                    sumR += c[i]; sumG += c[i+1]; sumB += c[i+2];
                }
                const count = c.length / 3;
                this._lastMeshStats = {
                    verts: count,
                    minRGB: [minR, minG, minB].map(v => v.toFixed(3)),
                    maxRGB: [maxR, maxG, maxB].map(v => v.toFixed(3)),
                    avgRGB: [sumR/count, sumG/count, sumB/count].map(v => v.toFixed(3)),
                };
                console.log('[ChunkManager] Vertex color stats (first chunk):', this._lastMeshStats);
            }
        }

        // Transparent mesh
        if (result.tIndices.length > 0) {
            const geo = new THREE.BufferGeometry();
            geo.setAttribute('position', new THREE.BufferAttribute(result.tPositions, 3));
            geo.setAttribute('normal', new THREE.BufferAttribute(result.tNormals, 3));
            geo.setAttribute('color', new THREE.BufferAttribute(result.tColors, 3));
            geo.setIndex(new THREE.BufferAttribute(result.tIndices, 1));
            geo.computeBoundingSphere();

            chunk.transparentMesh = new THREE.Mesh(geo, this.transparentMaterial);
            chunk.transparentMesh.position.set(chunk.worldX, chunk.worldY, chunk.worldZ);
            chunk.transparentMesh.renderOrder = 1;
            this.meshGroup.add(chunk.transparentMesh);
        }

        chunk.dirty = false;
    }

    /** Main-thread fallback meshing (when workers unavailable) */
    _meshOnMainThread(chunk) {
        const neighbors = this._getNeighborArrays(chunk);
        const result = greedyMesh(chunk.blocks, neighbors, this.blockDefs);
        this._applyMeshResult(chunk, result);
    }

    /**
     * Call every frame with current player position.
     * Loads/unloads chunks, queues dirty chunks for meshing.
     */
    update(playerPos) {
        const pcx = Math.floor(playerPos.x / CHUNK_SIZE);
        const pcy = Math.floor(playerPos.y / CHUNK_SIZE);
        const pcz = Math.floor(playerPos.z / CHUNK_SIZE);

        // Load new chunks in range
        for (let dx = -RENDER_DIST_H; dx <= RENDER_DIST_H; dx++) {
            for (let dz = -RENDER_DIST_H; dz <= RENDER_DIST_H; dz++) {
                for (let dy = -RENDER_DIST_V; dy <= RENDER_DIST_V; dy++) {
                    const cx = pcx + dx;
                    const cy = pcy + dy;
                    const cz = pcz + dz;
                    if (cy < 0) continue; // no chunks below world floor

                    const key = `${cx},${cy},${cz}`;
                    if (!this.chunks.has(key)) {
                        const chunk = new Chunk(cx, cy, cz);
                        this.terrainGenerator.generateChunk(chunk);
                        this.chunks.set(key, chunk);
                        // Request persisted block deltas from server
                        if (this.wsClient && !this.pendingDeltas.has(key)) {
                            this.pendingDeltas.add(key);
                            this.wsClient.sendRequestChunkDeltas(cx, cy, cz);
                        }
                    }
                }
            }
        }

        // Unload chunks too far away
        for (const [key, chunk] of this.chunks) {
            const dx = Math.abs(chunk.cx - pcx);
            const dy = Math.abs(chunk.cy - pcy);
            const dz = Math.abs(chunk.cz - pcz);
            if (dx > RENDER_DIST_H + 1 || dy > RENDER_DIST_V + 1 || dz > RENDER_DIST_H + 1) {
                if (chunk.mesh) {
                    this.meshGroup.remove(chunk.mesh);
                    chunk.mesh.geometry.dispose();
                }
                if (chunk.transparentMesh) {
                    this.meshGroup.remove(chunk.transparentMesh);
                    chunk.transparentMesh.geometry.dispose();
                }
                this.chunks.delete(key);
            }
        }

        // Queue dirty chunks for meshing
        let queued = 0;
        for (const chunk of this.chunks.values()) {
            if (chunk.dirty && queued < MAX_MESHES_PER_FRAME) {
                if (this.workers.length > 0) {
                    this.meshQueue.push(chunk);
                    chunk.dirty = false; // prevent re-queuing
                } else {
                    this._meshOnMainThread(chunk);
                }
                queued++;
            }
        }

        if (this.workers.length > 0) {
            this._flushQueue();
        }
    }

    /** Get block at world coordinates */
    getBlock(wx, wy, wz) {
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cy = Math.floor(wy / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const chunk = this.chunks.get(`${cx},${cy},${cz}`);
        if (!chunk) return 0;
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        return chunk.getBlock(lx, ly, lz);
    }

    /** Set block at world coordinates and mark chunk dirty */
    setBlock(wx, wy, wz, blockId) {
        const cx = Math.floor(wx / CHUNK_SIZE);
        const cy = Math.floor(wy / CHUNK_SIZE);
        const cz = Math.floor(wz / CHUNK_SIZE);
        const key = `${cx},${cy},${cz}`;
        const chunk = this.chunks.get(key);
        if (!chunk) return;
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const ly = ((wy % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        chunk.setBlock(lx, ly, lz, blockId);

        // Also mark neighbor chunks dirty if on boundary
        if (lx === 0) this._markDirty(cx - 1, cy, cz);
        if (lx === CHUNK_SIZE - 1) this._markDirty(cx + 1, cy, cz);
        if (ly === 0) this._markDirty(cx, cy - 1, cz);
        if (ly === CHUNK_SIZE - 1) this._markDirty(cx, cy + 1, cz);
        if (lz === 0) this._markDirty(cx, cy, cz - 1);
        if (lz === CHUNK_SIZE - 1) this._markDirty(cx, cy, cz + 1);
    }

    /** Request deltas for all currently loaded chunks (used after connection is established) */
    requestAllChunkDeltas() {
        if (!this.wsClient) return;
        for (const [key, chunk] of this.chunks) {
            if (!this.pendingDeltas.has(key)) {
                this.pendingDeltas.add(key);
                this.wsClient.sendRequestChunkDeltas(chunk.cx, chunk.cy, chunk.cz);
            }
        }
    }

    /** Apply block deltas received from server for a chunk */
    applyChunkDeltas(cx, cy, cz, deltas) {
        const key = `${cx},${cy},${cz}`;
        this.pendingDeltas.delete(key);
        const chunk = this.chunks.get(key);
        if (!chunk || deltas.length === 0) return;

        for (const d of deltas) {
            // d = { x, y, z, b } — world coords and block id
            const lx = ((d.x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const ly = ((d.y % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            const lz = ((d.z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
            chunk.setBlock(lx, ly, lz, d.b);
        }
        // chunk.setBlock marks dirty, so it will get remeshed next frame
    }

    _markDirty(cx, cy, cz) {
        const chunk = this.chunks.get(`${cx},${cy},${cz}`);
        if (chunk) chunk.dirty = true;
    }

    /** Get the Y of the highest solid block at (wx, wz), searching from top down */
    getGroundHeight(wx, wz) {
        const cx = Math.floor(wx / CHUNK_SIZE);
        const lx = ((wx % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const lz = ((wz % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

        // Search from top chunk down
        for (let cy = RENDER_DIST_V; cy >= 0; cy--) {
            const chunk = this.chunks.get(`${cx},${cy},${Math.floor(wz / CHUNK_SIZE)}`);
            if (!chunk) continue;
            for (let ly = CHUNK_SIZE - 1; ly >= 0; ly--) {
                const blockId = chunk.getBlock(lx, ly, lz);
                if (blockId !== 0 && blockRegistry.isSolid(blockId)) {
                    return cy * CHUNK_SIZE + ly + 1; // top of block
                }
            }
        }
        return 0;
    }

    dispose() {
        for (const chunk of this.chunks.values()) {
            if (chunk.mesh) {
                this.meshGroup.remove(chunk.mesh);
                chunk.mesh.geometry.dispose();
            }
            if (chunk.transparentMesh) {
                this.meshGroup.remove(chunk.transparentMesh);
                chunk.transparentMesh.geometry.dispose();
            }
        }
        this.chunks.clear();
        for (const w of this.workers) w.terminate();
        this.scene.remove(this.meshGroup);
    }
}
