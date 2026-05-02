import * as THREE from 'three';
import { BaseTool } from './BaseTool.js';
import { SetBlocksCommand } from '../CommandHistory.js';

const MAX_FILL_AXIS = 32;

export class FillTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.cornerA = null;
        this.selectionBox = null; // wireframe showing selection region
    }

    get name() { return 'Fill'; }
    get previewMode() { return 'place'; }

    activate() {
        this.cornerA = null;
    }

    deactivate() {
        this.cornerA = null;
        this._removeSelectionBox();
    }

    getPreviewPositions(rayResult) {
        if (!rayResult?.hit) return [];
        const [x, y, z] = rayResult.position;

        if (!this.cornerA) {
            // Show single block at cursor before first click
            return [{ x, y, z }];
        }

        // Show cuboid preview from cornerA to cursor
        return this._getCuboidPositions(this.cornerA, { x, y, z });
    }

    onLeftClick(rayResult) {
        if (!rayResult?.hit) return;

        const [x, y, z] = rayResult.position;

        if (!this.cornerA) {
            // First click: set corner A
            this.cornerA = { x, y, z };
            this._showSelectionBox(this.cornerA);
            return;
        }

        // Second click: fill the cuboid
        const cornerB = { x, y, z };
        const positions = this._getCuboidPositions(this.cornerA, cornerB);

        if (positions.length === 0) {
            this.cornerA = null;
            this._removeSelectionBox();
            return;
        }

        const chunkManager = this.editor.game.chunkManager;
        const blockId = this.editor.selectedBlockId;
        const changes = [];

        for (const pos of positions) {
            const oldBlockId = chunkManager.getBlock(pos.x, pos.y, pos.z);
            if (pos.y === 0 && blockId === 0) continue; // don't break bedrock layer
            if (oldBlockId === 22) continue; // don't overwrite bedrock
            if (oldBlockId !== blockId) {
                changes.push({ x: pos.x, y: pos.y, z: pos.z, oldBlockId, newBlockId: blockId });
            }
        }

        if (changes.length > 0) {
            const cmd = new SetBlocksCommand(chunkManager, this.editor.game.wsClient, changes);
            this.editor.executeCommand(cmd);
        }

        this.cornerA = null;
        this._removeSelectionBox();
    }

    _getCuboidPositions(a, b) {
        const minX = Math.min(a.x, b.x);
        const maxX = Math.max(a.x, b.x);
        const minY = Math.min(a.y, b.y);
        const maxY = Math.max(a.y, b.y);
        const minZ = Math.min(a.z, b.z);
        const maxZ = Math.max(a.z, b.z);

        // Validate size
        if (maxX - minX >= MAX_FILL_AXIS || maxY - minY >= MAX_FILL_AXIS || maxZ - minZ >= MAX_FILL_AXIS) {
            return [];
        }

        const positions = [];
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                if (y < 0 || y > 255) continue;
                for (let z = minZ; z <= maxZ; z++) {
                    positions.push({ x, y, z });
                }
            }
        }
        return positions;
    }

    _showSelectionBox(pos) {
        this._removeSelectionBox();
        const geo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const edges = new THREE.EdgesGeometry(geo);
        const mat = new THREE.LineBasicMaterial({ color: 0xffff00 });
        this.selectionBox = new THREE.LineSegments(edges, mat);
        this.selectionBox.position.set(pos.x + 0.5, pos.y + 0.5, pos.z + 0.5);
        this.editor.game.scene.add(this.selectionBox);
    }

    _removeSelectionBox() {
        if (this.selectionBox) {
            this.editor.game.scene.remove(this.selectionBox);
            this.selectionBox.geometry.dispose();
            this.selectionBox.material.dispose();
            this.selectionBox = null;
        }
    }
}
