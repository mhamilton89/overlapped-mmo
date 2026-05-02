/**
 * EditorSystem — coordinates tools, brush, undo/redo, camera modes, palette, HUD.
 * Only active when player is admin.
 */

import * as THREE from 'three';
import { raycastVoxels } from '../world/blocks/VoxelRaycast.js';
import { blockRegistry } from '../world/blocks/BlockRegistry.js';
import { BlockHighlight } from './BlockHighlight.js';
import { BlockPalette } from './BlockPalette.js';
import { CommandHistory } from './CommandHistory.js';
import { GhostPreview } from './GhostPreview.js';
import { EditorHUD } from './EditorHUD.js';
import { FreeFlyCamera } from '../controls/FreeFlyCamera.js';
import { PlaceTool } from './tools/PlaceTool.js';
import { BreakTool } from './tools/BreakTool.js';
import { PaintTool } from './tools/PaintTool.js';
import { FillTool } from './tools/FillTool.js';
import { AssetPlaceTool } from './tools/AssetPlaceTool.js';
import { AssetPalette } from './AssetPalette.js';
import { structureRegistry } from './StructureRegistry.js';
import { VoxelDesigner } from '../designer/VoxelDesigner.js';

export class EditorSystem {
    constructor(game) {
        this.game = game;
        this.enabled = false;
        this.selectedBlockId = 3; // grass
        this.selectedStructure = structureRegistry.getAll()[0]?.id || null;

        // Raycast state
        this.rayResult = null;

        // Brush
        this.brushSize = 1; // 1, 3, 5, 7

        // Command history
        this.commandHistory = new CommandHistory(200);

        // Tools
        this.tools = {
            place: new PlaceTool(this),
            break: new BreakTool(this),
            paint: new PaintTool(this),
            fill: new FillTool(this),
            asset: new AssetPlaceTool(this),
        };
        this.toolOrder = ['place', 'break', 'paint', 'fill', 'asset'];
        this.currentToolKey = 'place';
        this.currentTool = this.tools.place;

        // Visual feedback
        this.highlight = new BlockHighlight(game.scene);
        this.ghostPreview = new GhostPreview(game.scene);
        this.palette = new BlockPalette(this);
        this.paletteOpen = false;
        this.assetPalette = new AssetPalette(this);
        this.assetPaletteOpen = false;
        this.editorHUD = new EditorHUD();

        // Voxel Designer
        this.voxelDesigner = new VoxelDesigner(game);

        // Camera modes
        this.freeFlyCamera = new FreeFlyCamera(game.camera, game.renderer.domElement);
        this.cameraMode = 'orbit'; // 'orbit' | 'freefly'
        this.freeFlyCamera.onExitCallback = () => this._onFreeFlyExit();

        // UI elements
        this.crosshairEl = document.getElementById('crosshair');

        this._setupInput();
    }

    _setupInput() {
        const canvas = this.game.renderer.domElement;

        // Cursor position (NDC) for aiming
        this._cursorNDC = new THREE.Vector2(0, 0);
        this._hasCursor = false;
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this._cursorNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            this._cursorNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            this._hasCursor = true;
        });
        canvas.addEventListener('mouseleave', () => { this._hasCursor = false; });

        // Left-click: execute current tool
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0 && this.enabled && this.rayResult?.hit) {
                this.currentTool.onLeftClick(this.rayResult);
            }
        });

        // Right-click tracking (place in orbit mode for backward compat)
        this._rightMouseDown = false;
        this._rightMouseMoved = false;

        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) {
                this._rightMouseDown = true;
                this._rightMouseMoved = false;
            }
        });

        canvas.addEventListener('mousemove', () => {
            if (this._rightMouseDown) this._rightMouseMoved = true;
        });

        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2 && this._rightMouseDown) {
                // Right-click (no drag) in orbit mode: quick-place with Place tool
                if (!this._rightMouseMoved && this.enabled && this.rayResult?.hit && this.cameraMode === 'orbit') {
                    this.tools.place.onLeftClick(this.rayResult);
                }
                this._rightMouseDown = false;
                this._rightMouseMoved = false;
            }
        });

        // Keyboard
        window.addEventListener('keydown', (e) => {
            if (!this.enabled) return;
            if (this.voxelDesigner?.open) return; // Designer handles its own input
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;

            // Undo/Redo
            if (e.ctrlKey && e.code === 'KeyZ') {
                e.preventDefault();
                if (e.shiftKey) {
                    this.commandHistory.redo();
                } else {
                    this.commandHistory.undo();
                }
                return;
            }
            if (e.ctrlKey && e.code === 'KeyY') {
                e.preventDefault();
                this.commandHistory.redo();
                return;
            }

            // Don't handle tool keys when ctrl is held
            if (e.ctrlKey) return;

            switch (e.code) {
                // Palette
                case 'Tab':
                    e.preventDefault();
                    if (this.currentToolKey === 'asset') {
                        this.toggleAssetPalette();
                    } else {
                        this.togglePalette();
                    }
                    break;

                // Tool selection
                case 'KeyT': this._cycleTool(); break;
                case 'KeyG': this._selectTool('place'); break;
                case 'KeyX': this._selectTool('break'); break;
                case 'KeyC': this._selectTool('paint'); break;
                case 'KeyV': this._selectTool('fill'); break;
                case 'KeyB': this._selectTool('asset'); break;

                // Rotate structure (asset tool only)
                case 'KeyR':
                    if (this.currentToolKey === 'asset') {
                        this.tools.asset.rotate(1);
                    }
                    break;

                // Brush size
                case 'BracketLeft': this._changeBrushSize(-2); break;
                case 'BracketRight': this._changeBrushSize(2); break;

                // Camera toggle
                case 'KeyF': this.toggleCameraMode(); break;

                // Voxel Designer
                case 'KeyN': this.voxelDesigner.show(); break;

                // HUD hints
                case 'KeyH': this.editorHUD.toggleHints(); break;

                // Hotbar 1-9
                default:
                    if (e.code >= 'Digit1' && e.code <= 'Digit9') {
                        const idx = parseInt(e.code.charAt(5)) - 1;
                        this.palette.selectHotbarSlot(idx);
                    }
                    break;
            }
        });

        // Scroll wheel: cycle hotbar
        canvas.addEventListener('wheel', (e) => {
            if (!this.enabled) return;
            if (e.ctrlKey) return; // let camera zoom in orbit mode

            e.preventDefault();
            e.stopPropagation();
            this.palette.cycleHotbar(e.deltaY > 0 ? 1 : -1);
        }, { passive: false });
    }

    // --- Tool Management ---

    _selectTool(key) {
        if (this.currentToolKey === key) return;
        this.currentTool.deactivate();
        this.currentToolKey = key;
        this.currentTool = this.tools[key];
        this.currentTool.activate();
    }

    _cycleTool() {
        const idx = this.toolOrder.indexOf(this.currentToolKey);
        const next = this.toolOrder[(idx + 1) % this.toolOrder.length];
        this._selectTool(next);
    }

    // --- Brush ---

    _changeBrushSize(delta) {
        this.brushSize = Math.max(1, Math.min(7, this.brushSize + delta));
        // Ensure odd
        if (this.brushSize % 2 === 0) this.brushSize += (delta > 0 ? 1 : -1);
        this.brushSize = Math.max(1, Math.min(7, this.brushSize));
    }

    // --- Commands ---

    executeCommand(command) {
        this.commandHistory.execute(command);
    }

    // --- Camera ---

    toggleCameraMode() {
        if (this.cameraMode === 'orbit') {
            // Switch to free-fly
            this.cameraMode = 'freefly';
            const cam = this.game.camera;
            const cc = this.game.cameraController;
            this.freeFlyCamera.enable(cam.position.clone(), cc.yaw, cc.pitch);
            cc.enabled = false;
            if (this.game.inputManager) this.game.inputManager.suppressMovement = true;
            this.crosshairEl?.classList.add('freefly');
        } else {
            this._exitFreeFly();
        }
    }

    _exitFreeFly() {
        this.cameraMode = 'orbit';
        this.freeFlyCamera.disable();
        this.game.cameraController.enabled = true;
        if (this.game.inputManager) this.game.inputManager.suppressMovement = false;
        this.crosshairEl?.classList.remove('freefly');
    }

    _onFreeFlyExit() {
        // Called when pointer lock is lost unexpectedly (Escape key)
        this._exitFreeFly();
    }

    // --- Palette ---

    selectBlock(blockId) {
        this.selectedBlockId = blockId;
        this.palette.updateSelection(blockId);
    }

    selectStructure(structureId) {
        this.selectedStructure = structureId;
        this.assetPalette.updateSelection(structureId);
    }

    togglePalette() {
        this.paletteOpen = !this.paletteOpen;
        this.palette.setVisible(this.paletteOpen);
        // Close asset palette if open
        if (this.paletteOpen && this.assetPaletteOpen) {
            this.assetPaletteOpen = false;
            this.assetPalette.setVisible(false);
        }
    }

    toggleAssetPalette() {
        this.assetPaletteOpen = !this.assetPaletteOpen;
        this.assetPalette.setVisible(this.assetPaletteOpen);
        // Close block palette if open
        if (this.assetPaletteOpen && this.paletteOpen) {
            this.paletteOpen = false;
            this.palette.setVisible(false);
        }
    }

    // --- Enable/Disable ---

    setEnabled(enabled) {
        this.enabled = enabled;
        if (enabled) {
            this.crosshairEl?.classList.remove('hidden');
            this.palette.showHotbar();
            this.editorHUD.setVisible(true);
        } else {
            this.crosshairEl?.classList.add('hidden');
            this.highlight.hide();
            this.ghostPreview.hide();
            this.palette.hideAll();
            this.editorHUD.setVisible(false);
            if (this.cameraMode === 'freefly') {
                this._exitFreeFly();
            }
        }
    }

    // --- Frame Update ---

    update(deltaTime) {
        if (!this.enabled || !this.game.camera || this.voxelDesigner?.open) {
            this.highlight.hide();
            this.ghostPreview.hide();
            return;
        }

        // Update free-fly camera
        if (this.cameraMode === 'freefly') {
            this.freeFlyCamera.update(deltaTime);
        }

        // Raycast from cursor position (falls back to screen center if no cursor yet)
        if (!this._raycaster) this._raycaster = new THREE.Raycaster();
        const ndc = this._hasCursor ? this._cursorNDC : new THREE.Vector2(0, 0);
        this._raycaster.setFromCamera(ndc, this.game.camera);

        this.rayResult = raycastVoxels(
            this.game.chunkManager,
            this._raycaster.ray.origin,
            this._raycaster.ray.direction,
            64
        );

        // Update highlight
        this.highlight.update(this.rayResult, false);

        // Update ghost preview
        if (this.rayResult?.hit) {
            const previewPositions = this.currentTool.getPreviewPositions(this.rayResult);
            this.ghostPreview.update(previewPositions, this.currentTool.previewMode);
        } else {
            this.ghostPreview.hide();
        }

        // Update HUD
        const blockDef = blockRegistry.getBlock(this.selectedBlockId);
        const structDef = this.selectedStructure ? structureRegistry.get(this.selectedStructure) : null;
        this.editorHUD.update({
            toolName: this.currentTool.name,
            brushSize: this.brushSize,
            blockName: blockDef?.name || '?',
            blockColor: blockDef?.color || [128, 128, 128],
            structureName: structDef?.name || null,
            rotation: this.currentToolKey === 'asset' ? this.tools.asset.rotation : 0,
            targetCoords: this.rayResult?.hit ? this.rayResult.position : null,
            cameraMode: this.cameraMode,
            canUndo: this.commandHistory.canUndo(),
            canRedo: this.commandHistory.canRedo(),
            isAssetTool: this.currentToolKey === 'asset',
        });
    }

    /**
     * Returns true if editor consumed a left-click (so Game.js skips enemy targeting).
     */
    consumedLeftClick() {
        return this.enabled && this.rayResult?.hit;
    }
}
