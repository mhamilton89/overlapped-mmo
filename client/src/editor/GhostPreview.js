import * as THREE from 'three';
import { blockRegistry } from '../world/blocks/BlockRegistry.js';

/**
 * Renders translucent block previews for multi-block operations.
 * Uses object pooling for performance (brush 7x7x7 = 343 cubes).
 */
export class GhostPreview {
    constructor(scene) {
        this.scene = scene;
        this.meshPool = [];
        this.activeMeshes = 0;

        this.sharedGeo = new THREE.BoxGeometry(1.01, 1.01, 1.01);

        this.placeMaterial = new THREE.MeshBasicMaterial({
            color: 0x44ff44,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
        });

        this.breakMaterial = new THREE.MeshBasicMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
        });

        this.paintMaterial = new THREE.MeshBasicMaterial({
            color: 0x4488ff,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
        });

        // Per-block color materials for asset preview mode
        this._blockMaterialCache = new Map();
    }

    /**
     * Update ghost preview positions.
     * @param {Array<{x:number, y:number, z:number}>} positions
     * @param {'place'|'break'|'paint'} mode
     */
    update(positions, mode) {
        const uniformMat = mode === 'break' ? this.breakMaterial
            : mode === 'paint' ? this.paintMaterial
            : this.placeMaterial;

        // Show meshes for each position
        for (let i = 0; i < positions.length; i++) {
            const mesh = this._getMesh(i);
            // Asset mode: use actual block colors; other modes: uniform color
            if (mode === 'asset' && positions[i].blockId !== undefined) {
                mesh.material = this._getBlockMaterial(positions[i].blockId);
            } else {
                mesh.material = uniformMat;
            }
            mesh.position.set(
                positions[i].x + 0.5,
                positions[i].y + 0.5,
                positions[i].z + 0.5
            );
            mesh.visible = true;
        }

        // Hide excess meshes
        for (let i = positions.length; i < this.activeMeshes; i++) {
            this.meshPool[i].visible = false;
        }

        this.activeMeshes = positions.length;
    }

    _getMesh(index) {
        if (index < this.meshPool.length) {
            return this.meshPool[index];
        }
        const mesh = new THREE.Mesh(this.sharedGeo, this.placeMaterial);
        mesh.visible = false;
        mesh.renderOrder = 2;
        this.meshPool.push(mesh);
        this.scene.add(mesh);
        return mesh;
    }

    hide() {
        for (let i = 0; i < this.activeMeshes; i++) {
            this.meshPool[i].visible = false;
        }
        this.activeMeshes = 0;
    }

    _getBlockMaterial(blockId) {
        if (this._blockMaterialCache.has(blockId)) {
            return this._blockMaterialCache.get(blockId);
        }
        const def = blockRegistry.getBlock(blockId);
        const [r, g, b] = def.color;
        const mat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(r / 255, g / 255, b / 255),
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
        });
        this._blockMaterialCache.set(blockId, mat);
        return mat;
    }

    dispose() {
        for (const mesh of this.meshPool) {
            this.scene.remove(mesh);
        }
        this.meshPool = [];
        this.sharedGeo.dispose();
        this.placeMaterial.dispose();
        this.breakMaterial.dispose();
        this.paintMaterial.dispose();
        for (const mat of this._blockMaterialCache.values()) {
            mat.dispose();
        }
        this._blockMaterialCache.clear();
    }
}
