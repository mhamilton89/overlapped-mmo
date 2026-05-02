/**
 * VoxelDesigner — in-game 3D voxel editor for creating equipment and world assets.
 *
 * Opens as a full-screen overlay with its own Three.js renderer, scene, and orbit
 * camera.  The user sculpts voxels with paint/erase tools, picks colors, navigates
 * layers, and exports the result as equipment (armor/weapon) or a world-asset
 * structure blueprint.
 *
 * Shape stamps let you paint spheres, cylinders, cones, and boxes with one click.
 * A character mannequin provides size reference for equipment designs.
 */

import * as THREE from 'three';
import { MicroVoxelModel } from './MicroVoxelModel.js';
import { buildDesignerMesh } from './MicroVoxelMesher.js';
import { DesignerUI } from './DesignerUI.js';
import { ObjectModel } from './ObjectModel.js';
import { ObjectScene } from './ObjectScene.js';
import { createPostFX } from '../rendering/PostFX.js';

// Body part definitions for the mannequin (game-space coordinates)
const BODY_PARTS = [
    { name: 'torso',       size: [0.70, 0.70, 0.45], pos: [ 0.00,  0.05,  0.00] },
    { name: 'head',        size: [0.60, 0.60, 0.60], pos: [ 0.00,  0.73,  0.00] },
    { name: 'r_upper_arm', size: [0.22, 0.38, 0.22], pos: [ 0.46,  0.06,  0.00] },
    { name: 'r_lower_arm', size: [0.18, 0.35, 0.18], pos: [ 0.46, -0.31,  0.00] },
    { name: 'l_upper_arm', size: [0.22, 0.38, 0.22], pos: [-0.46,  0.06,  0.00] },
    { name: 'l_lower_arm', size: [0.18, 0.35, 0.18], pos: [-0.46, -0.31,  0.00] },
    { name: 'r_upper_leg', size: [0.24, 0.38, 0.24], pos: [ 0.15, -0.49,  0.00] },
    { name: 'r_lower_leg', size: [0.20, 0.38, 0.20], pos: [ 0.15, -0.86,  0.00] },
    { name: 'l_upper_leg', size: [0.24, 0.38, 0.24], pos: [-0.15, -0.49,  0.00] },
    { name: 'l_lower_leg', size: [0.20, 0.38, 0.20], pos: [-0.15, -0.86,  0.00] },
];

// Which body parts are highlighted for each export slot — others get dimmed.
const SLOT_TARGET_PARTS = {
    head:      ['head'],
    chest:     ['torso'],
    legs:      ['r_upper_leg', 'r_lower_leg', 'l_upper_leg', 'l_lower_leg'],
    feet:      ['r_lower_leg', 'l_lower_leg'],
    hands:     ['r_lower_arm', 'l_lower_arm'],
    main_hand: ['r_lower_arm'],
    off_hand:  ['l_lower_arm'],
    asset:     [],
};

// Attachment origin per slot (the body point that aligns with grid center)
const SLOT_ORIGINS = {
    head:      [0.00,  0.73,  0.00],
    chest:     [0.00,  0.05,  0.00],
    legs:      [0.00, -0.49,  0.00],
    feet:      [0.00, -0.86,  0.00],
    hands:     [0.46, -0.31,  0.00],
    main_hand: [0.46, -0.31,  0.00],
    off_hand:  [-0.46, -0.31, 0.00],
    asset:     [0.00,  0.00,  0.00],
};

export class VoxelDesigner {
    constructor(game) {
        this.game = game;
        this.open = false;

        // Model
        this.model = new MicroVoxelModel(16, 16, 16);
        this.gridSize = 16;

        // Tool state
        this.currentTool = 'paint'; // paint | erase | eyedropper
        this.currentColor = { r: 200, g: 60, b: 60 };
        this.currentLayer = 0;
        this.showAllLayers = true;

        // Stamp system
        this.stampShape = 'single'; // single | sphere | cylinder | cone | box | wedge
        this.stampRadius = 2;
        this.stampHeight = 4;

        // Export / preview settings
        this.voxelScale = 0.04;
        this.exportSlot = 'main_hand';

        // Character mannequin
        this.showMannequin = false;
        this.mannequinGroup = null;

        // Three.js
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.voxelMesh = null;
        this.hoverMarker = null;
        this.stampPreview = null;
        this.layerPlane = null;
        this.gridHelper = null;
        this.boundingBox = null;
        this.objectGrid = null;

        // Orbit camera state
        this._theta = Math.PI / 4;
        this._phi = Math.PI / 3;
        this._radius = 24;
        this._center = new THREE.Vector3(8, 4, 8);
        this._dragging = false;
        this._panning = false;
        this._lastMouse = { x: 0, y: 0 };

        // Raycasting
        this._raycaster = new THREE.Raycaster();
        this._mouse = new THREE.Vector2();
        this._hoverPos = null;

        // Undo stack — each entry is an array of changes (batch)
        this._undoStack = [];
        this._redoStack = [];

        // Animation
        this._animId = null;

        // UI
        this.ui = null;

        // ── Object Mode ──
        this.editorMode = 'voxel'; // 'voxel' | 'object'
        this.objectModel = new ObjectModel();
        this.objectScene = null;
        this.selectedShape = 'box'; // shape to place next in object mode
        this._objUndoStack = [];
        this._objRedoStack = [];

        // Modal transform (Blender-style G/R/S)
        this._modal = null;

        // Reference props (Object Mode size guides)
        this._refDoor = null;
        this._refFootprint = null;
        this._refLabels = [];
        this.showDoor = false;
        this.showFootprint = false;
    }

    // ── Lifecycle ────────────────────────────────────────────

    show(existingModel) {
        if (this.open) return;
        this.open = true;

        if (existingModel) {
            this.model = MicroVoxelModel.deserialize(existingModel);
            this.gridSize = this.model.width;
        } else {
            this.model = new MicroVoxelModel(this.gridSize, this.gridSize, this.gridSize);
        }
        this._undoStack = [];
        this._redoStack = [];
        this.objectModel = new ObjectModel();
        this._objUndoStack = [];
        this._objRedoStack = [];
        this.editorMode = 'voxel';
        this._modal = null;
        this._refDoor = null;
        this._refFootprint = null;
        this._refLabels = [];
        this.showDoor = false;
        this.showFootprint = false;

        this._createScene();
        this._createUI();
        this._rebuildMesh();
        this._animate();

        if (this.game.inputManager) this.game.inputManager.suppressMovement = true;
    }

    hide() {
        if (!this.open) return;
        this.open = false;

        if (this._animId) cancelAnimationFrame(this._animId);
        this._animId = null;

        if (this._keyHandler) {
            window.removeEventListener('keydown', this._keyHandler);
            this._keyHandler = null;
        }
        if (this._resizeHandler) {
            window.removeEventListener('resize', this._resizeHandler);
            this._resizeHandler = null;
        }

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
            this.renderer = null;
        }
        this._disposeSceneObjects();

        if (this.ui) { this.ui.dispose(); this.ui = null; }
        if (this.game.inputManager) this.game.inputManager.suppressMovement = false;
    }

    _disposeSceneObjects() {
        if (this.voxelMesh) {
            this.voxelMesh.geometry.dispose();
            this.voxelMesh.material.dispose();
            this.voxelMesh = null;
        }
        if (this.objectScene) {
            this.objectScene.dispose();
            this.objectScene = null;
        }
        // Sprite labels on the object grid own their own canvas textures.
        for (const sprite of this._refLabels) {
            if (sprite.material && sprite.material.map) sprite.material.map.dispose();
            if (sprite.material) sprite.material.dispose();
        }
        this._refLabels = [];
        this._disposeDoorRef();
        this._disposeFootprintRef();
        this._disposeMannequin();
    }

    // ── Grid Size ───────────────────────────────────────────

    setGridSize(size) {
        if (size === this.gridSize) return;
        this.gridSize = size;
        this.model = new MicroVoxelModel(size, size, size);
        this._undoStack = [];
        this._redoStack = [];
        this.currentLayer = 0;
        if (this.editorMode !== 'object') {
            this._center.set(size / 2, size / 4, size / 2);
        }

        // Rebuild scene helpers
        if (this.scene) {
            if (this.gridHelper) this.scene.remove(this.gridHelper);
            this.gridHelper = new THREE.GridHelper(size, size, 0x444466, 0x333355);
            this.gridHelper.position.set(size / 2, 0, size / 2);
            this.scene.add(this.gridHelper);

            if (this.boundingBox) {
                this.scene.remove(this.boundingBox);
                this.boundingBox.geometry.dispose();
            }
            const boxGeo = new THREE.BoxGeometry(size, size, size);
            const boxEdges = new THREE.EdgesGeometry(boxGeo);
            this.boundingBox = new THREE.LineSegments(
                boxEdges,
                new THREE.LineBasicMaterial({ color: 0x5566aa, transparent: true, opacity: 0.4 })
            );
            this.boundingBox.position.set(size / 2, size / 2, size / 2);
            this.scene.add(this.boundingBox);
            boxGeo.dispose();

            if (this.layerPlane) {
                this.layerPlane.geometry.dispose();
                this.scene.remove(this.layerPlane);
            }
            const planeGeo = new THREE.PlaneGeometry(size, size);
            const planeMat = new THREE.MeshBasicMaterial({
                color: 0x4488ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
            });
            this.layerPlane = new THREE.Mesh(planeGeo, planeMat);
            this.layerPlane.rotation.x = -Math.PI / 2;
            this._updateLayerPlane();
            this.scene.add(this.layerPlane);

            // Respect current editor mode visibility
            if (this.editorMode === 'object') {
                this.gridHelper.visible = false;
                this.boundingBox.visible = false;
                this.layerPlane.visible = false;
            }

            this._updateCamera();
            this._updateMannequin();
        }
        this._rebuildMesh();
        if (this.ui) this.ui.updateVoxelCount(0);
    }

    // ── Three.js Scene ──────────────────────────────────────

    _createScene() {
        const canvas = document.createElement('canvas');
        canvas.id = 'designer-canvas';
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x1a1a2e);

        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
        this._updateCamera();

        this.scene = new THREE.Scene();

        // Lights — mirror the in-game rig (warm hemi + keyed directional)
        // so materials read identically here and in the world.
        const hemi = new THREE.HemisphereLight(0xbfdeff, 0xa08060, 0.55);
        this.scene.add(hemi);
        const ambient = new THREE.AmbientLight(0xffffff, 0.25);
        this.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.8);
        dir.position.set(10, 20, 10);
        this.scene.add(dir);
        const backFill = new THREE.DirectionalLight(0x8888ff, 0.3);
        backFill.position.set(-10, 5, -10);
        this.scene.add(backFill);

        const s = this.gridSize;

        // Grid
        this.gridHelper = new THREE.GridHelper(s, s, 0x444466, 0x333355);
        this.gridHelper.position.set(s / 2, 0, s / 2);
        this.scene.add(this.gridHelper);

        // Bounding box
        const boxGeo = new THREE.BoxGeometry(s, s, s);
        const boxEdges = new THREE.EdgesGeometry(boxGeo);
        this.boundingBox = new THREE.LineSegments(
            boxEdges,
            new THREE.LineBasicMaterial({ color: 0x5566aa, transparent: true, opacity: 0.4 })
        );
        this.boundingBox.position.set(s / 2, s / 2, s / 2);
        this.scene.add(this.boundingBox);
        boxGeo.dispose();

        // Layer plane
        const planeGeo = new THREE.PlaneGeometry(s, s);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0x4488ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide,
        });
        this.layerPlane = new THREE.Mesh(planeGeo, planeMat);
        this.layerPlane.rotation.x = -Math.PI / 2;
        this._updateLayerPlane();
        this.scene.add(this.layerPlane);

        // Hover marker
        const markerGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
        const markerEdges = new THREE.EdgesGeometry(markerGeo);
        this.hoverMarker = new THREE.LineSegments(
            markerEdges,
            new THREE.LineBasicMaterial({ color: 0xffffff })
        );
        this.hoverMarker.visible = false;
        this.scene.add(this.hoverMarker);
        markerGeo.dispose();

        // Stamp preview group
        this.stampPreview = new THREE.Group();
        this.stampPreview.visible = false;
        this.scene.add(this.stampPreview);

        // Object Mode floor grid: 6×6m, major lines every 1m, minor every 0.25m,
        // with sprite labels along the +X edge so scale is unambiguous.
        this.objectGrid = new THREE.Group();
        const major = new THREE.GridHelper(6, 6, 0x6677bb, 0x44557a);
        const minor = new THREE.GridHelper(6, 24, 0x2a3450, 0x2a3450);
        minor.position.y = -0.001;
        if (minor.material) {
            const mats = Array.isArray(minor.material) ? minor.material : [minor.material];
            for (const m of mats) { m.transparent = true; m.opacity = 0.35; }
        }
        this.objectGrid.add(major);
        this.objectGrid.add(minor);
        // 1m / 2m / 3m labels along +X axis
        for (const meters of [1, 2, 3]) {
            const sprite = this._makeLabelSprite(`${meters}m`);
            sprite.position.set(meters, 0.02, -3.15);
            sprite.scale.set(0.45, 0.22, 1);
            this.objectGrid.add(sprite);
            this._refLabels.push(sprite);
        }
        this.objectGrid.visible = false;
        this.scene.add(this.objectGrid);

        // Object Mode scene
        this.objectScene = new ObjectScene(this.scene, this.camera, this.renderer);
        this.objectScene.onDraggingChanged((dragging) => {
            // Disable orbit while gizmo is being dragged
            this._gizmoDragging = dragging;
        });
        this.objectScene.onObjectTransformed((id, pos, rot, scl) => {
            this.objectModel.update(id, { position: pos, rotation: rot, scale: scl });
            if (this.ui) this.ui.updateObjectProperties(this.objectModel.get(id));
        });
        this.objectScene.setVisible(false);
        this._gizmoDragging = false;

        // Matching post-processing pipeline so materials read identically
        // here and in the game world. Subtler bloom, subtler outline.
        this.postfx = createPostFX(this.renderer, this.scene, this.camera, {
            bloomStrength: 0.18,
            bloomRadius: 0.3,
            bloomThreshold: 0.9,
            outlineStrength: 1.8,
            outlineThickness: 1.0,
        });

        this._setupCanvasInput(canvas);
    }

    _updateCamera() {
        const sp = Math.sin(this._phi);
        const cp = Math.cos(this._phi);
        const st = Math.sin(this._theta);
        const ct = Math.cos(this._theta);
        this.camera.position.set(
            this._center.x + this._radius * sp * ct,
            this._center.y + this._radius * cp,
            this._center.z + this._radius * sp * st,
        );
        this.camera.lookAt(this._center);
    }

    _updateLayerPlane() {
        this.layerPlane.position.set(
            this.model.width / 2,
            this.currentLayer + 0.005,
            this.model.depth / 2,
        );
    }

    _rebuildMesh() {
        if (this.voxelMesh) {
            this.scene.remove(this.voxelMesh);
            this.voxelMesh.geometry.dispose();
            this.voxelMesh.material.dispose();
        }

        if (this.model.count === 0) {
            this.voxelMesh = null;
            return;
        }

        let meshModel = this.model;
        if (!this.showAllLayers) {
            meshModel = new MicroVoxelModel(this.model.width, this.model.height, this.model.depth);
            this.model.forEach((x, y, z, c) => {
                if (y === this.currentLayer) meshModel.set(x, y, z, c.r, c.g, c.b);
            });
        }

        this.voxelMesh = buildDesignerMesh(meshModel);
        this.scene.add(this.voxelMesh);
    }

    // ── Mannequin ───────────────────────────────────────────

    toggleMannequin() {
        this.showMannequin = !this.showMannequin;
        if (this.showMannequin) {
            this._createMannequin();
        } else {
            this._disposeMannequin();
        }
    }

    setExportSlot(slot) {
        this.exportSlot = slot;
        if (this.showMannequin) {
            this._updateMannequinHighlight();
            this._updateMannequin();
        }
    }

    setVoxelScale(scale) {
        this.voxelScale = scale;
        if (this.showMannequin) this._updateMannequin();
    }

    _createMannequin() {
        this._disposeMannequin();

        this.mannequinGroup = new THREE.Group();

        // Two shared materials so we can highlight target parts cheaply.
        this._mannequinMatDim = new THREE.MeshStandardMaterial({
            color: 0x6688bb,
            transparent: true,
            opacity: 0.12,
            depthWrite: false,
            roughness: 0.8,
            metalness: 0.1,
        });
        this._mannequinMatTarget = new THREE.MeshStandardMaterial({
            color: 0x88ddff,
            transparent: true,
            opacity: 0.45,
            depthWrite: false,
            roughness: 0.7,
            metalness: 0.1,
            emissive: 0x335577,
            emissiveIntensity: 0.4,
        });

        for (const part of BODY_PARTS) {
            const [sx, sy, sz] = part.size;
            const [px, py, pz] = part.pos;
            const geo = new THREE.BoxGeometry(sx, sy, sz);
            const mesh = new THREE.Mesh(geo, this._mannequinMatDim);
            mesh.position.set(px, py, pz);
            mesh.userData.partName = part.name;
            this.mannequinGroup.add(mesh);
        }

        this._updateMannequinHighlight();
        this._updateMannequin();
        this.scene.add(this.mannequinGroup);
    }

    /** Re-assign target/dim materials based on the current export slot. */
    _updateMannequinHighlight() {
        if (!this.mannequinGroup) return;
        const targets = SLOT_TARGET_PARTS[this.exportSlot] || [];
        for (const child of this.mannequinGroup.children) {
            const isTarget = targets.includes(child.userData.partName);
            child.material = isTarget ? this._mannequinMatTarget : this._mannequinMatDim;
        }
    }

    _updateMannequin() {
        if (!this.mannequinGroup) return;

        const origin = SLOT_ORIGINS[this.exportSlot] || SLOT_ORIGINS.main_hand;

        if (this.editorMode === 'object') {
            // Object Mode: real-world scale. Place slot attachment point at world origin.
            this.mannequinGroup.scale.set(1, 1, 1);
            this.mannequinGroup.position.set(-origin[0], -origin[1], -origin[2]);
        } else {
            // Voxel Mode: scale up to match tiny voxels, center attachment in grid.
            const scale = 1 / this.voxelScale;
            this.mannequinGroup.scale.set(scale, scale, scale);
            const gc = this.gridSize / 2;
            this.mannequinGroup.position.set(
                gc - origin[0] * scale,
                gc - origin[1] * scale,
                gc - origin[2] * scale,
            );
        }
    }

    // ── Reference Props (size guides) ───────────────────────

    toggleDoorRef() {
        this.showDoor = !this.showDoor;
        if (this.showDoor) this._createDoorRef();
        else this._disposeDoorRef();
    }

    toggleFootprintRef() {
        this.showFootprint = !this.showFootprint;
        if (this.showFootprint) this._createFootprintRef();
        else this._disposeFootprintRef();
    }

    _createDoorRef() {
        this._disposeDoorRef();
        // Standard door: 1.0m wide × 2.0m tall × 0.05m deep, base at y=0.
        const group = new THREE.Group();
        const geo = new THREE.BoxGeometry(1.0, 2.0, 0.05);
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.8 })
        );
        line.position.set(0, 1.0, 0);
        group.add(line);
        geo.dispose();
        const label = this._makeLabelSprite('Door 1×2m');
        label.position.set(0, 2.15, 0);
        label.scale.set(0.7, 0.28, 1);
        group.add(label);
        this._refDoor = group;
        this.scene.add(group);
    }

    _disposeDoorRef() {
        if (!this._refDoor) return;
        this._refDoor.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material && !c.material.map) c.material.dispose();
            if (c.material && c.material.map) { c.material.map.dispose(); c.material.dispose(); }
        });
        this.scene.remove(this._refDoor);
        this._refDoor = null;
    }

    _createFootprintRef() {
        this._disposeFootprintRef();
        // 5×5m outlined floor square + corner labels.
        const group = new THREE.Group();
        const sz = 5;
        const points = [
            new THREE.Vector3(-sz/2, 0.005, -sz/2),
            new THREE.Vector3( sz/2, 0.005, -sz/2),
            new THREE.Vector3( sz/2, 0.005,  sz/2),
            new THREE.Vector3(-sz/2, 0.005,  sz/2),
            new THREE.Vector3(-sz/2, 0.005, -sz/2),
        ];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(
            lineGeo,
            new THREE.LineBasicMaterial({ color: 0x66ddaa, transparent: true, opacity: 0.85 })
        );
        group.add(line);
        const label = this._makeLabelSprite(`${sz}×${sz}m`);
        label.position.set(0, 0.05, sz/2 + 0.3);
        label.scale.set(0.7, 0.28, 1);
        group.add(label);
        this._refFootprint = group;
        this.scene.add(group);
    }

    _disposeFootprintRef() {
        if (!this._refFootprint) return;
        this._refFootprint.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material && !c.material.map) c.material.dispose();
            if (c.material && c.material.map) { c.material.map.dispose(); c.material.dispose(); }
        });
        this.scene.remove(this._refFootprint);
        this._refFootprint = null;
    }

    /** Canvas-rendered text sprite for grid/ref labels. */
    _makeLabelSprite(text) {
        const canvas = document.createElement('canvas');
        canvas.width = 256; canvas.height = 96;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = 'bold 56px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0a0a14';
        ctx.fillText(text, canvas.width / 2 + 2, canvas.height / 2 + 2);
        ctx.fillStyle = '#cfe6ff';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        return new THREE.Sprite(mat);
    }

    _disposeMannequin() {
        if (this.mannequinGroup) {
            this.mannequinGroup.traverse(child => {
                if (child.isMesh) child.geometry.dispose();
            });
            if (this._mannequinMatDim)    { this._mannequinMatDim.dispose();    this._mannequinMatDim = null; }
            if (this._mannequinMatTarget) { this._mannequinMatTarget.dispose(); this._mannequinMatTarget = null; }
            if (this.scene) this.scene.remove(this.mannequinGroup);
            this.mannequinGroup = null;
        }
    }

    // ── Input ───────────────────────────────────────────────

    _setupCanvasInput(canvas) {
        canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
        canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
        canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._radius = Math.max(5, Math.min(100, this._radius + e.deltaY * 0.03));
            this._updateCamera();
        }, { passive: false });
        canvas.addEventListener('contextmenu', (e) => e.preventDefault());

        this._keyHandler = (e) => this._onKeyDown(e);
        window.addEventListener('keydown', this._keyHandler);
    }

    _onMouseDown(e) {
        this._lastMouse.x = e.clientX;
        this._lastMouse.y = e.clientY;

        // Modal transform consumes mouse buttons: LMB confirms, RMB/MMB cancels.
        if (this._modal && this._modal.active) {
            if (e.button === 0)      this._confirmModal();
            else                     this._cancelModal();
            return;
        }

        if (e.button === 1 || (e.button === 2 && e.shiftKey)) {
            this._panning = true;
        } else if (e.button === 2) {
            this._dragging = true;
        } else if (e.button === 0) {
            if (this._gizmoDragging) return; // TransformControls is handling this

            if (this.editorMode === 'object') {
                this._onObjectModeClick(e);
            } else {
                this._updateMouseCoords(e);
                this._doRaycast();
                if (this._hoverPos) {
                    this._applyTool(this._hoverPos);
                }
            }
        }
    }

    _onMouseMove(e) {
        const dx = e.clientX - this._lastMouse.x;
        const dy = e.clientY - this._lastMouse.y;
        this._lastMouse.x = e.clientX;
        this._lastMouse.y = e.clientY;

        // Modal transform: drive position/rotation/scale from mouse, no orbit/raycast.
        if (this._modal && this._modal.active) {
            this._updateMouseCoords(e);
            this._updateModal();
            return;
        }

        if (this._gizmoDragging) return; // TransformControls handles its own movement

        if (this._dragging) {
            this._theta -= dx * 0.008;
            this._phi = Math.max(0.15, Math.min(Math.PI - 0.15, this._phi - dy * 0.008));
            this._updateCamera();
        } else if (this._panning) {
            const right = new THREE.Vector3();
            const up = new THREE.Vector3();
            this.camera.getWorldDirection(up);
            right.crossVectors(up, this.camera.up).normalize();
            up.copy(this.camera.up).normalize();
            const panSpeed = this._radius * 0.002;
            this._center.addScaledVector(right, -dx * panSpeed);
            this._center.addScaledVector(up, dy * panSpeed);
            this._updateCamera();
        } else if (this.editorMode === 'voxel') {
            this._updateMouseCoords(e);
            this._doRaycast();
        }
    }

    _onMouseUp() {
        this._dragging = false;
        this._panning = false;
    }

    _onKeyDown(e) {
        if (!this.open) return;
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) return;

        if (e.ctrlKey && e.code === 'KeyZ') {
            e.preventDefault();
            if (this.editorMode === 'object') {
                e.shiftKey ? this._objRedo() : this._objUndo();
            } else {
                e.shiftKey ? this._redo() : this._undo();
            }
            return;
        }
        if (e.ctrlKey && e.code === 'KeyY') {
            e.preventDefault();
            if (this.editorMode === 'object') {
                this._objRedo();
            } else {
                this._redo();
            }
            return;
        }

        // Size-reference hotkeys (handled before mode-specific dispatch so plain
        // Digit1-6 still drive voxel-mode stamp shapes).
        if (e.shiftKey) {
            if (e.code === 'Digit1') {
                e.preventDefault();
                this.toggleMannequin();
                if (this.ui) this.ui.updateMannequinToggle(this.showMannequin);
                return;
            }
            if (e.code === 'Digit2' && this.editorMode === 'object') {
                e.preventDefault();
                this.toggleDoorRef();
                return;
            }
            if (e.code === 'Digit3' && this.editorMode === 'object') {
                e.preventDefault();
                this.toggleFootprintRef();
                return;
            }
        }

        switch (e.code) {
            case 'Escape':
                // If a modal transform is active, cancel it instead of closing the editor.
                if (this._modal && this._modal.active) {
                    this._cancelModal();
                } else {
                    this.hide();
                }
                break;

            // Mode toggle
            case 'Tab':
                e.preventDefault();
                this.setEditorMode(this.editorMode === 'voxel' ? 'object' : 'voxel');
                break;

            // Mannequin (shared)
            case 'KeyM':
                this.toggleMannequin();
                if (this.ui) this.ui.updateMannequinToggle(this.showMannequin);
                break;

            default:
                if (this.editorMode === 'object') {
                    this._onObjectKeyDown(e);
                } else {
                    this._onVoxelKeyDown(e);
                }
                break;
        }
    }

    _updateMouseCoords(e) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this._mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        this._mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    }

    // ── Raycasting ──────────────────────────────────────────

    _doRaycast() {
        this._hoverPos = null;
        this.hoverMarker.visible = false;
        this.stampPreview.visible = false;

        this._raycaster.setFromCamera(this._mouse, this.camera);

        // Raycast against existing voxel mesh
        if (this.voxelMesh) {
            const hits = this._raycaster.intersectObject(this.voxelMesh);
            if (hits.length > 0) {
                const hit = hits[0];
                const normal = hit.face.normal;
                const point = hit.point;

                if (this.currentTool === 'erase' || this.currentTool === 'eyedropper') {
                    const vx = Math.floor(point.x - normal.x * 0.01);
                    const vy = Math.floor(point.y - normal.y * 0.01);
                    const vz = Math.floor(point.z - normal.z * 0.01);
                    if (this.model.inBounds(vx, vy, vz)) {
                        this._hoverPos = { x: vx, y: vy, z: vz };
                        this._showHover(vx, vy, vz, this.currentTool === 'erase' ? 0xff4444 : 0x44ff44);
                    }
                } else {
                    const vx = Math.floor(point.x + normal.x * 0.01);
                    const vy = Math.floor(point.y + normal.y * 0.01);
                    const vz = Math.floor(point.z + normal.z * 0.01);
                    if (this.model.inBounds(vx, vy, vz)) {
                        this._hoverPos = { x: vx, y: vy, z: vz };
                        this._showHover(vx, vy, vz, 0xffffff);
                    }
                }
                return;
            }
        }

        // Raycast against layer plane
        const planeY = this.currentLayer + 0.005;
        const origin = this._raycaster.ray.origin;
        const dir = this._raycaster.ray.direction;
        if (Math.abs(dir.y) > 0.0001) {
            const t = (planeY - origin.y) / dir.y;
            if (t > 0) {
                const px = origin.x + dir.x * t;
                const pz = origin.z + dir.z * t;
                const vx = Math.floor(px);
                const vz = Math.floor(pz);
                if (this.model.inBounds(vx, this.currentLayer, vz)) {
                    this._hoverPos = { x: vx, y: this.currentLayer, z: vz };
                    this._showHover(vx, this.currentLayer, vz,
                        this.currentTool === 'erase' ? 0xff4444 : 0xffffff);
                }
            }
        }
    }

    _showHover(x, y, z, color) {
        if (this.stampShape === 'single') {
            this.hoverMarker.position.set(x + 0.5, y + 0.5, z + 0.5);
            this.hoverMarker.material.color.setHex(color);
            this.hoverMarker.visible = true;
        } else {
            // Show stamp preview as wireframe
            this.hoverMarker.visible = false;
            this._updateStampPreview(x, y, z, color);
        }
    }

    _updateStampPreview(cx, cy, cz, color) {
        // Clear old preview meshes
        while (this.stampPreview.children.length > 0) {
            const c = this.stampPreview.children[0];
            c.geometry.dispose();
            this.stampPreview.remove(c);
        }

        const positions = this._getStampPositions({ x: cx, y: cy, z: cz });
        if (positions.length === 0) return;

        // Find bounding box of stamp
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        for (const p of positions) {
            if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
            if (p.z < minZ) minZ = p.z; if (p.z > maxZ) maxZ = p.z;
        }
        const w = maxX - minX + 1;
        const h = maxY - minY + 1;
        const d = maxZ - minZ + 1;

        const geo = new THREE.BoxGeometry(w + 0.04, h + 0.04, d + 0.04);
        const edges = new THREE.EdgesGeometry(geo);
        const line = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 })
        );
        line.position.set(
            minX + w / 2,
            minY + h / 2,
            minZ + d / 2,
        );
        this.stampPreview.add(line);
        geo.dispose();

        this.stampPreview.visible = true;
    }

    // ── Stamp System ────────────────────────────────────────

    setStampShape(shape) {
        this.stampShape = shape;
        if (this.ui) this.ui.updateStampShape(shape);
    }

    setStampRadius(r) {
        this.stampRadius = Math.max(1, Math.min(8, r));
        if (this.ui) this.ui.updateStampSize(this.stampRadius, this.stampHeight);
    }

    setStampHeight(h) {
        this.stampHeight = Math.max(1, Math.min(16, h));
        if (this.ui) this.ui.updateStampSize(this.stampRadius, this.stampHeight);
    }

    /**
     * Get all voxel positions affected by the current stamp shape.
     */
    _getStampPositions(center) {
        const { x: cx, y: cy, z: cz } = center;
        const r = this.stampRadius;
        const h = this.stampHeight;
        const positions = [];

        switch (this.stampShape) {
            case 'single':
                positions.push({ x: cx, y: cy, z: cz });
                break;

            case 'sphere':
                for (let dx = -r; dx <= r; dx++)
                    for (let dy = -r; dy <= r; dy++)
                        for (let dz = -r; dz <= r; dz++)
                            if (dx * dx + dy * dy + dz * dz <= r * r)
                                positions.push({ x: cx + dx, y: cy + dy, z: cz + dz });
                break;

            case 'cylinder':
                for (let dy = 0; dy < h; dy++)
                    for (let dx = -r; dx <= r; dx++)
                        for (let dz = -r; dz <= r; dz++)
                            if (dx * dx + dz * dz <= r * r)
                                positions.push({ x: cx + dx, y: cy + dy, z: cz + dz });
                break;

            case 'cone':
                for (let dy = 0; dy < h; dy++) {
                    const layerR = r * (1 - dy / h);
                    const lr = Math.ceil(layerR);
                    for (let dx = -lr; dx <= lr; dx++)
                        for (let dz = -lr; dz <= lr; dz++)
                            if (dx * dx + dz * dz <= layerR * layerR)
                                positions.push({ x: cx + dx, y: cy + dy, z: cz + dz });
                }
                break;

            case 'box':
                for (let dx = -r; dx <= r; dx++)
                    for (let dy = 0; dy < h; dy++)
                        for (let dz = -r; dz <= r; dz++)
                            positions.push({ x: cx + dx, y: cy + dy, z: cz + dz });
                break;

            case 'wedge':
                // Ramp shape: full at y=0, narrows along +Z
                for (let dy = 0; dy < h; dy++) {
                    const maxZ = Math.floor(r * (1 - dy / h));
                    for (let dx = -r; dx <= r; dx++)
                        for (let dz = -maxZ; dz <= maxZ; dz++)
                            positions.push({ x: cx + dx, y: cy + dy, z: cz + dz });
                }
                break;
        }

        return positions;
    }

    // ── Tools ───────────────────────────────────────────────

    setTool(tool) {
        this.currentTool = tool;
        if (this.ui) this.ui.updateTool(tool);
    }

    setColor(r, g, b) {
        this.currentColor = { r, g, b };
        if (this.ui) this.ui.updateColorPreview(r, g, b);
    }

    setLayer(y) {
        this.currentLayer = y;
        this._updateLayerPlane();
        if (!this.showAllLayers) this._rebuildMesh();
        if (this.ui) this.ui.updateLayer(y);
    }

    _applyTool(pos) {
        // Eyedropper always picks single voxel
        if (this.currentTool === 'eyedropper') {
            const c = this.model.get(pos.x, pos.y, pos.z);
            if (c) {
                this.setColor(c.r, c.g, c.b);
                this.setTool('paint');
            }
            return;
        }

        // Get positions to affect (single voxel or stamp pattern)
        const positions = this._getStampPositions(pos);
        const changes = [];

        for (const { x, y, z } of positions) {
            if (!this.model.inBounds(x, y, z)) continue;

            if (this.currentTool === 'paint') {
                const old = this.model.get(x, y, z);
                const c = this.currentColor;
                changes.push({ x, y, z, oldColor: old, newColor: { r: c.r, g: c.g, b: c.b } });
                this.model.set(x, y, z, c.r, c.g, c.b);
            } else if (this.currentTool === 'erase') {
                const old = this.model.get(x, y, z);
                if (old) {
                    changes.push({ x, y, z, oldColor: old, newColor: null });
                    this.model.remove(x, y, z);
                }
            }
        }

        if (changes.length > 0) {
            this._pushUndoBatch(changes);
            this._rebuildMesh();
        }
        if (this.ui) this.ui.updateVoxelCount(this.model.count);
    }

    // ── Undo/Redo (batch support) ───────────────────────────

    _pushUndoBatch(changes) {
        this._undoStack.push(changes);
        this._redoStack = [];
        if (this._undoStack.length > 300) this._undoStack.shift();
    }

    _undo() {
        const batch = this._undoStack.pop();
        if (!batch) return;
        this._redoStack.push(batch);
        for (const op of batch) {
            if (op.oldColor) {
                this.model.set(op.x, op.y, op.z, op.oldColor.r, op.oldColor.g, op.oldColor.b);
            } else {
                this.model.remove(op.x, op.y, op.z);
            }
        }
        this._rebuildMesh();
        if (this.ui) this.ui.updateVoxelCount(this.model.count);
    }

    _redo() {
        const batch = this._redoStack.pop();
        if (!batch) return;
        this._undoStack.push(batch);
        for (const op of batch) {
            if (op.newColor) {
                this.model.set(op.x, op.y, op.z, op.newColor.r, op.newColor.g, op.newColor.b);
            } else {
                this.model.remove(op.x, op.y, op.z);
            }
        }
        this._rebuildMesh();
        if (this.ui) this.ui.updateVoxelCount(this.model.count);
    }

    // ── Save / Export ───────────────────────────────────────

    getSavedDesigns() {
        try {
            return JSON.parse(localStorage.getItem('voxel_designs') || '[]');
        } catch { return []; }
    }

    saveDesign(name, type, settings = {}) {
        const designs = this.getSavedDesigns();
        const id = 'design_' + Date.now();
        designs.push({
            id,
            name,
            type,
            created: Date.now(),
            editorMode: this.editorMode,
            model: this.model.serialize(),
            objectModel: this.objectModel.serialize(),
            settings: { ...settings, voxelScale: this.voxelScale },
        });
        localStorage.setItem('voxel_designs', JSON.stringify(designs));
        return id;
    }

    deleteDesign(id) {
        const designs = this.getSavedDesigns().filter(d => d.id !== id);
        localStorage.setItem('voxel_designs', JSON.stringify(designs));
    }

    loadDesign(id) {
        const design = this.getSavedDesigns().find(d => d.id === id);
        if (!design) return null;
        this.model = MicroVoxelModel.deserialize(design.model);
        if (design.model.width !== this.gridSize) {
            this.gridSize = design.model.width;
        }
        this._undoStack = [];
        this._redoStack = [];
        if (design.settings?.voxelScale) {
            this.voxelScale = design.settings.voxelScale;
        }
        this._rebuildMesh();

        // Restore object model if present
        if (design.objectModel) {
            this.objectModel = ObjectModel.deserialize(design.objectModel);
            this._objUndoStack = [];
            this._objRedoStack = [];
            if (this.objectScene) {
                this.objectScene.rebuildAll(this.objectModel);
            }
        }

        // Restore editor mode
        if (design.editorMode) {
            this.setEditorMode(design.editorMode);
        }

        if (this.ui) {
            this.ui.updateVoxelCount(this.model.count);
            this.ui.updateObjectList(this.objectModel.getAll());
        }
        return design;
    }

    getModelData() {
        return this.model.serialize();
    }

    // ── UI ──────────────────────────────────────────────────

    _createUI() {
        this.ui = new DesignerUI(this);

        const viewport = this.ui.getViewport();
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        viewport.appendChild(this.renderer.domElement);
        this._resize();

        this._resizeHandler = () => this._resize();
        window.addEventListener('resize', this._resizeHandler);
    }

    _resize() {
        const canvas = this.renderer?.domElement;
        if (!canvas) return;
        const parent = canvas.parentElement;
        if (!parent) return;
        const w = parent.clientWidth;
        const h = parent.clientHeight;
        this.renderer.setSize(w, h);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        if (this.postfx) this.postfx.setSize(w, h);
    }

    // ── Render Loop ─────────────────────────────────────────

    _animate() {
        if (!this.open) return;
        this._animId = requestAnimationFrame(() => this._animate());
        if (this.objectScene) this.objectScene.updateOutline();
        if (this.postfx) this.postfx.composer.render();
        else this.renderer.render(this.scene, this.camera);
    }

    // ── Editor Mode ─────────────────────────────────────────

    setEditorMode(mode) {
        if (mode === this.editorMode) return;
        this.editorMode = mode;

        if (mode === 'voxel') {
            if (this.voxelMesh) this.voxelMesh.visible = true;
            this.layerPlane.visible = true;
            this.gridHelper.visible = true;
            this.boundingBox.visible = true;
            if (this.objectGrid) this.objectGrid.visible = false;
            if (this._refDoor) this._refDoor.visible = false;
            if (this._refFootprint) this._refFootprint.visible = false;
            this.objectScene.setVisible(false);

            // Reframe camera for voxel-space grid
            const s = this.gridSize;
            this._center.set(s / 2, s / 4, s / 2);
            this._radius = s * 1.5;
        } else {
            if (this.voxelMesh) this.voxelMesh.visible = false;
            this.layerPlane.visible = false;
            this.gridHelper.visible = false;
            this.boundingBox.visible = false;
            this.hoverMarker.visible = false;
            this.stampPreview.visible = false;
            if (this.objectGrid) this.objectGrid.visible = true;
            if (this._refDoor) this._refDoor.visible = this.showDoor;
            if (this._refFootprint) this._refFootprint.visible = this.showFootprint;
            this.objectScene.setVisible(true);

            // Reframe camera for real-world scale (~4-unit grid, player ~2 units tall)
            this._center.set(0, 0.6, 0);
            this._radius = 4;
        }

        if (this.showMannequin) this._updateMannequin();
        this._updateCamera();
        if (this.ui) this.ui.updateEditorMode(mode);
    }

    setSelectedShape(shape) {
        this.selectedShape = shape;
        if (this.ui) this.ui.updateSelectedShape(shape);
    }

    // ── Object Mode: Voxel Key Handler ──────────────────────

    _onVoxelKeyDown(e) {
        switch (e.code) {
            case 'BracketRight':
                this.setLayer(Math.min(this.model.height - 1, this.currentLayer + 1));
                break;
            case 'BracketLeft':
                this.setLayer(Math.max(0, this.currentLayer - 1));
                break;
            case 'KeyP':     this.setTool('paint'); break;
            case 'KeyE':     this.setTool('erase'); break;
            case 'KeyI':     this.setTool('eyedropper'); break;
            case 'KeyL':
                this.showAllLayers = !this.showAllLayers;
                this._rebuildMesh();
                if (this.ui) this.ui.updateLayerToggle(this.showAllLayers);
                break;
            case 'Digit1':   this.setStampShape('single'); break;
            case 'Digit2':   this.setStampShape('sphere'); break;
            case 'Digit3':   this.setStampShape('cylinder'); break;
            case 'Digit4':   this.setStampShape('cone'); break;
            case 'Digit5':   this.setStampShape('box'); break;
            case 'Digit6':   this.setStampShape('wedge'); break;
        }
    }

    // ── Object Mode: Key Handler ────────────────────────────

    _onObjectKeyDown(e) {
        // Modal transform in progress — keys steer it (axis lock / cancel).
        if (this._modal && this._modal.active) {
            switch (e.code) {
                case 'KeyX': this._setModalAxis('x'); return;
                case 'KeyY': this._setModalAxis('y'); return;
                case 'KeyZ': this._setModalAxis('z'); return;
                case 'Escape': this._cancelModal(); return;
                case 'Enter': case 'NumpadEnter': this._confirmModal(); return;
            }
            return;
        }

        switch (e.code) {
            // Modal transforms (Blender-style: press, then move mouse, click to confirm)
            case 'KeyG': this._beginModal('translate'); break;
            case 'KeyR': this._beginModal('rotate');    break;
            case 'KeyS': this._beginModal('scale');     break;

            // Delete selected
            case 'Delete':
            case 'KeyX':
                if (this.objectScene.selectedId) {
                    this._objRemove(this.objectScene.selectedId);
                }
                break;

            // Duplicate selected — Shift+D enters modal grab on the copy (no offset)
            case 'KeyD':
                if (this.objectScene.selectedId) {
                    this._objDuplicate(this.objectScene.selectedId, !e.shiftKey);
                    if (e.shiftKey) this._beginModal('translate');
                }
                break;
        }
    }

    // ── Modal Transforms (Blender-style G/R/S) ──────────────

    _beginModal(mode) {
        if (this._modal && this._modal.active) this._cancelModal();
        const mesh = this.objectScene.getSelectedMesh();
        if (!mesh) return;

        // Hide gizmo so it doesn't fight the modal drag visually.
        this.objectScene.setGizmoVisible(false);

        const screenObj = this._worldToNDC(mesh.position);
        this._modal = {
            active: true,
            mode,
            axis: null,
            meshId: this.objectScene.selectedId,
            start: {
                position: mesh.position.clone(),
                rotation: mesh.rotation.clone(),
                scale: mesh.scale.clone(),
            },
            startMouseNDC: this._mouse.clone(),
            startScreenObj: screenObj,
            startVec: new THREE.Vector2(this._mouse.x - screenObj.x, this._mouse.y - screenObj.y),
            startAngle: 0,
            startDist: 0,
            // For translate axis-locked mode, the plane to project mouse onto.
            translatePlane: null,
        };
        this._modal.startAngle = Math.atan2(this._modal.startVec.y, this._modal.startVec.x);
        this._modal.startDist = Math.max(0.001, this._modal.startVec.length());
        this._setupModalPlane();

        if (this.ui && this.ui.updateGizmoMode) this.ui.updateGizmoMode(mode);
    }

    /** Pick a world-space plane through the start position for translate mouse-to-world projection. */
    _setupModalPlane() {
        if (!this._modal || this._modal.mode !== 'translate') return;
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);

        let normal;
        if (this._modal.axis) {
            const axisVec = this._axisVec(this._modal.axis);
            // Plane that contains the axis and is most facing the camera.
            const tmp = new THREE.Vector3().crossVectors(axisVec, camDir);
            normal = new THREE.Vector3().crossVectors(tmp, axisVec).normalize();
            if (normal.lengthSq() < 0.001) normal = camDir.clone().negate();
        } else {
            normal = camDir.clone().negate();
        }
        const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(normal, this._modal.start.position);

        // Capture initial intersection so deltas are well-defined.
        this._raycaster.setFromCamera(this._modal.startMouseNDC, this.camera);
        const start = new THREE.Vector3();
        if (!this._raycaster.ray.intersectPlane(plane, start)) {
            // Fall back to a camera-facing plane.
            const camPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
                camDir.clone().negate(), this._modal.start.position);
            this._raycaster.ray.intersectPlane(camPlane, start);
            this._modal.translatePlane = camPlane;
        } else {
            this._modal.translatePlane = plane;
        }
        this._modal.translateStart = start.clone();
    }

    _setModalAxis(axis) {
        if (!this._modal || !this._modal.active) return;
        this._modal.axis = (this._modal.axis === axis) ? null : axis;
        // Restore start transform; new axis will be applied by next _updateModal call.
        const mesh = this.objectScene.meshMap.get(this._modal.meshId);
        if (mesh) {
            mesh.position.copy(this._modal.start.position);
            mesh.rotation.copy(this._modal.start.rotation);
            mesh.scale.copy(this._modal.start.scale);
        }
        if (this._modal.mode === 'translate') this._setupModalPlane();
        this._updateModal();
    }

    _updateModal() {
        if (!this._modal || !this._modal.active) return;
        const mesh = this.objectScene.meshMap.get(this._modal.meshId);
        if (!mesh) return;

        if (this._modal.mode === 'translate') {
            this._raycaster.setFromCamera(this._mouse, this.camera);
            const hit = new THREE.Vector3();
            if (!this._raycaster.ray.intersectPlane(this._modal.translatePlane, hit)) return;
            const delta = new THREE.Vector3().subVectors(hit, this._modal.translateStart);
            if (this._modal.axis) {
                const axisVec = this._axisVec(this._modal.axis);
                const along = delta.dot(axisVec);
                delta.copy(axisVec).multiplyScalar(along);
            }
            mesh.position.copy(this._modal.start.position).add(delta);
        } else if (this._modal.mode === 'rotate') {
            const v = new THREE.Vector2(
                this._mouse.x - this._modal.startScreenObj.x,
                this._mouse.y - this._modal.startScreenObj.y,
            );
            const angle = Math.atan2(v.y, v.x) - this._modal.startAngle;
            const axis = this._modal.axis ? this._axisVec(this._modal.axis) : (() => {
                const camDir = new THREE.Vector3();
                this.camera.getWorldDirection(camDir);
                return camDir.clone().negate();
            })();
            const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
            mesh.quaternion.copy(
                new THREE.Quaternion().setFromEuler(this._modal.start.rotation).premultiply(q)
            );
        } else if (this._modal.mode === 'scale') {
            const v = new THREE.Vector2(
                this._mouse.x - this._modal.startScreenObj.x,
                this._mouse.y - this._modal.startScreenObj.y,
            );
            const factor = Math.max(0.01, v.length() / this._modal.startDist);
            const s = this._modal.start.scale;
            if (this._modal.axis === 'x') mesh.scale.set(s.x * factor, s.y, s.z);
            else if (this._modal.axis === 'y') mesh.scale.set(s.x, s.y * factor, s.z);
            else if (this._modal.axis === 'z') mesh.scale.set(s.x, s.y, s.z * factor);
            else mesh.scale.set(s.x * factor, s.y * factor, s.z * factor);
        }
    }

    _confirmModal() {
        if (!this._modal || !this._modal.active) return;
        const mesh = this.objectScene.meshMap.get(this._modal.meshId);
        const id = this._modal.meshId;
        this._modal.active = false;
        this._modal = null;

        if (mesh) {
            const p = mesh.position, r = mesh.rotation, s = mesh.scale;
            const oldObj = this.objectModel.get(id);
            this._objPushUndo({
                type: 'transform',
                id,
                oldPos: [...oldObj.position],
                oldRot: [...oldObj.rotation],
                oldScl: [...oldObj.scale],
                newPos: [p.x, p.y, p.z],
                newRot: [r.x, r.y, r.z],
                newScl: [s.x, s.y, s.z],
            });
            this.objectModel.update(id, {
                position: [p.x, p.y, p.z],
                rotation: [r.x, r.y, r.z],
                scale:    [s.x, s.y, s.z],
            });
            if (this.ui) this.ui.updateObjectProperties(this.objectModel.get(id));
        }
        this.objectScene.setGizmoVisible(true);
    }

    _cancelModal() {
        if (!this._modal || !this._modal.active) return;
        const mesh = this.objectScene.meshMap.get(this._modal.meshId);
        if (mesh) {
            mesh.position.copy(this._modal.start.position);
            mesh.rotation.copy(this._modal.start.rotation);
            mesh.scale.copy(this._modal.start.scale);
        }
        this._modal.active = false;
        this._modal = null;
        this.objectScene.setGizmoVisible(true);
    }

    _axisVec(axis) {
        if (axis === 'x') return new THREE.Vector3(1, 0, 0);
        if (axis === 'y') return new THREE.Vector3(0, 1, 0);
        return new THREE.Vector3(0, 0, 1);
    }

    _worldToNDC(v) {
        const p = v.clone().project(this.camera);
        return new THREE.Vector2(p.x, p.y);
    }

    // ── Object Mode: Click Handler ──────────────────────────

    _onObjectModeClick(e) {
        this._updateMouseCoords(e);
        const mx = this._mouse.x;
        const my = this._mouse.y;
        const shift = !!(e && (e.shiftKey || e.shift));

        const hitId = this.objectScene.hitTest(mx, my);
        if (hitId) {
            if (shift) {
                this.objectScene.toggleInSelection(hitId);
            } else {
                // Plain click: if already selected (and not the only thing), keep selection — otherwise select group/single
                if (this.objectScene.isSelected(hitId) && this.objectScene.selectedIds.size > 1) {
                    // No-op: clicking inside an existing multi-selection shouldn't collapse it
                } else {
                    const obj = this.objectModel.get(hitId);
                    const ids = (obj && obj.groupId)
                        ? this.objectModel.getGroupMembers(obj.groupId)
                        : [hitId];
                    this.objectScene.setSelection(ids, hitId);
                }
            }
            if (this.ui) {
                this.ui.updateObjectSelection(this.objectScene.leaderId, this.objectModel.get(this.objectScene.leaderId));
                this.ui.updateObjectList(this.objectModel.getAll());
            }
            return;
        }

        // Empty space: shift = preserve selection, plain = deselect or place
        if (shift) return;

        const floorPos = this.objectScene.hitTestFloor(mx, my, 0);
        if (floorPos) {
            const pos = [
                Math.round(floorPos[0] * 2) / 2,
                floorPos[1],
                Math.round(floorPos[2] * 2) / 2,
            ];
            this._objPlace(this.selectedShape, pos);
        } else {
            this.objectScene.deselectAll();
            if (this.ui) this.ui.updateObjectSelection(null, null);
        }
    }

    // ── Object Mode: Operations (with undo) ─────────────────

    _objPlace(type, position) {
        const obj = this.objectModel.add(type, { position });
        this.objectScene.addObject(obj);
        this._objPushUndo({ type: 'add', obj: { ...obj, params: { ...obj.params }, position: [...obj.position], rotation: [...obj.rotation], scale: [...obj.scale], material: { ...obj.material } } });
        this.objectScene.select(obj.id);
        if (this.ui) {
            this.ui.updateObjectSelection(obj.id, obj);
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    _objRemove(id) {
        const obj = this.objectModel.get(id);
        if (!obj) return;
        const snapshot = { ...obj, params: { ...obj.params }, position: [...obj.position], rotation: [...obj.rotation], scale: [...obj.scale], material: { ...obj.material } };
        this.objectScene.removeObject(id);
        this.objectModel.remove(id);
        this._objPushUndo({ type: 'remove', obj: snapshot });
        if (this.ui) {
            this.ui.updateObjectSelection(null, null);
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    _objDuplicate(id, offset = true) {
        const cloned = this.objectModel.clone(id);
        if (!cloned) return;
        if (offset) {
            // Plain duplicate — offset so the copy is visible on top of the original.
            cloned.position[0] += 1;
            this.objectModel.update(cloned.id, { position: cloned.position });
        }
        this.objectScene.addObject(cloned);
        this._objPushUndo({ type: 'add', obj: { ...cloned, params: { ...cloned.params }, position: [...cloned.position], rotation: [...cloned.rotation], scale: [...cloned.scale], material: { ...cloned.material } } });
        this.objectScene.select(cloned.id);
        if (this.ui) {
            this.ui.updateObjectSelection(cloned.id, cloned);
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    /** Update an object's geometry params from the UI. */
    objUpdateParams(id, params) {
        const obj = this.objectModel.get(id);
        if (!obj) return;
        const oldParams = { ...obj.params };
        this.objectModel.update(id, { params });
        this.objectScene.rebuildGeometry(id, obj.type, obj.params);
        this._objPushUndo({ type: 'params', id, oldParams, newParams: { ...obj.params } });
    }

    /** Update an object's material from the UI. */
    objUpdateMaterial(id, material) {
        const obj = this.objectModel.get(id);
        if (!obj) return;
        const oldMat = { ...obj.material };
        this.objectModel.update(id, { material });
        this.objectScene.updateMaterial(id, obj);
        this._objPushUndo({ type: 'material', id, oldMat, newMat: { ...obj.material } });
    }

    // ── Object Mode: Grouping & Mirror ──────────────────────

    /** Assign a fresh shared groupId to all currently-selected objects. */
    _objGroup() {
        const ids = this.objectScene.getSelectedIds();
        if (ids.length < 2) return;
        const oldGroups = ids.map(id => this.objectModel.get(id)?.groupId ?? null);
        const newGroupId = this.objectModel.nextGroupId();
        for (const id of ids) this.objectModel.update(id, { groupId: newGroupId });
        this._objPushUndo({ type: 'group', ids, oldGroups, newGroup: newGroupId });
        if (this.ui) {
            this.ui.updateObjectSelection(this.objectScene.leaderId, this.objectModel.get(this.objectScene.leaderId));
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    /** Clear groupId on all currently-selected objects. */
    _objUngroup() {
        const ids = this.objectScene.getSelectedIds();
        if (ids.length === 0) return;
        const oldGroups = ids.map(id => this.objectModel.get(id)?.groupId ?? null);
        if (oldGroups.every(g => g === null)) return;
        for (const id of ids) this.objectModel.update(id, { groupId: null });
        this._objPushUndo({ type: 'group', ids, oldGroups, newGroup: null });
        if (this.ui) {
            this.ui.updateObjectSelection(this.objectScene.leaderId, this.objectModel.get(this.objectScene.leaderId));
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    /**
     * Mirror the current selection across the X axis.
     * Each selected object gets a clone with negated x position, X-flipped rotation,
     * and toggled mirror flag. Original + clones share a new groupId.
     */
    _objMirrorX() {
        const ids = this.objectScene.getSelectedIds();
        if (ids.length === 0) return;
        const newGroupId = this.objectModel.nextGroupId();
        const newIds = [];
        for (const id of ids) {
            const src = this.objectModel.get(id);
            if (!src) continue;
            // Original joins the new group
            this.objectModel.update(id, { groupId: newGroupId });
            const clone = this.objectModel.clone(id);
            if (!clone) continue;
            clone.position[0] = -clone.position[0];
            // X-mirror: keep rotation around X, flip Y and Z
            clone.rotation[1] = -clone.rotation[1];
            clone.rotation[2] = -clone.rotation[2];
            clone.mirror = !clone.mirror;
            clone.groupId = newGroupId;
            this.objectModel.update(clone.id, {
                position: clone.position,
                rotation: clone.rotation,
                mirror: clone.mirror,
                groupId: newGroupId,
            });
            this.objectScene.addObject(clone);
            newIds.push(clone.id);
        }
        if (newIds.length === 0) return;
        // Snapshot for undo: a "mirror" action stores added clone ids and the assigned group
        this._objPushUndo({
            type: 'mirror',
            originalIds: ids,
            cloneIds: newIds,
            newGroup: newGroupId,
        });
        // Select originals + mirrors as the new group
        this.objectScene.setSelection([...ids, ...newIds], this.objectScene.leaderId);
        if (this.ui) {
            this.ui.updateObjectSelection(this.objectScene.leaderId, this.objectModel.get(this.objectScene.leaderId));
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    // ── Object Mode: Undo/Redo ──────────────────────────────

    _objPushUndo(action) {
        this._objUndoStack.push(action);
        this._objRedoStack = [];
        if (this._objUndoStack.length > 200) this._objUndoStack.shift();
    }

    _objUndo() {
        const action = this._objUndoStack.pop();
        if (!action) return;
        this._objRedoStack.push(action);

        switch (action.type) {
            case 'add':
                this.objectScene.removeObject(action.obj.id);
                this.objectModel.remove(action.obj.id);
                break;
            case 'remove':
                this.objectModel.objects.push({ ...action.obj, params: { ...action.obj.params }, position: [...action.obj.position], rotation: [...action.obj.rotation], scale: [...action.obj.scale], material: { ...action.obj.material } });
                this.objectScene.addObject(action.obj);
                break;
            case 'params': {
                const obj = this.objectModel.get(action.id);
                if (obj) {
                    this.objectModel.update(action.id, { params: action.oldParams });
                    this.objectScene.rebuildGeometry(action.id, obj.type, obj.params);
                }
                break;
            }
            case 'material': {
                const obj = this.objectModel.get(action.id);
                if (obj) {
                    this.objectModel.update(action.id, { material: action.oldMat });
                    this.objectScene.updateMaterial(action.id, obj.material);
                }
                break;
            }
            case 'transform': {
                this.objectModel.update(action.id, {
                    position: [...action.oldPos],
                    rotation: [...action.oldRot],
                    scale:    [...action.oldScl],
                });
                this.objectScene.updateTransform(action.id, this.objectModel.get(action.id));
                break;
            }
        }
        this.objectScene.deselect();
        if (this.ui) {
            this.ui.updateObjectSelection(null, null);
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    _objRedo() {
        const action = this._objRedoStack.pop();
        if (!action) return;
        this._objUndoStack.push(action);

        switch (action.type) {
            case 'add':
                this.objectModel.objects.push({ ...action.obj, params: { ...action.obj.params }, position: [...action.obj.position], rotation: [...action.obj.rotation], scale: [...action.obj.scale], material: { ...action.obj.material } });
                this.objectScene.addObject(action.obj);
                break;
            case 'remove':
                this.objectScene.removeObject(action.obj.id);
                this.objectModel.remove(action.obj.id);
                break;
            case 'params': {
                const obj = this.objectModel.get(action.id);
                if (obj) {
                    this.objectModel.update(action.id, { params: action.newParams });
                    this.objectScene.rebuildGeometry(action.id, obj.type, obj.params);
                }
                break;
            }
            case 'material': {
                const obj = this.objectModel.get(action.id);
                if (obj) {
                    this.objectModel.update(action.id, { material: action.newMat });
                    this.objectScene.updateMaterial(action.id, obj.material);
                }
                break;
            }
            case 'transform': {
                this.objectModel.update(action.id, {
                    position: [...action.newPos],
                    rotation: [...action.newRot],
                    scale:    [...action.newScl],
                });
                this.objectScene.updateTransform(action.id, this.objectModel.get(action.id));
                break;
            }
        }
        this.objectScene.deselect();
        if (this.ui) {
            this.ui.updateObjectSelection(null, null);
            this.ui.updateObjectList(this.objectModel.getAll());
        }
    }

    // ── Object Mode: Export ─────────────────────────────────

    /** Export object composition as equipment armor definition pieces. */
    getObjectEquipmentPieces(slot) {
        const targetMap = {
            head: 'head', chest: 'torso', legs: 'upperRightLeg',
            feet: 'lowerRightLeg', hands: 'lowerRightArm',
            main_hand: 'lowerRightArm', off_hand: 'lowerLeftArm',
        };
        const target = targetMap[slot] || 'torso';
        const pieces = [];
        for (const obj of this.objectModel.getAll()) {
            const [r, g, b] = obj.material.color;
            const sx = Math.abs(obj.scale[0]);
            const sy = Math.abs(obj.scale[1]);
            const sz = Math.abs(obj.scale[2]);
            const piece = {
                target,
                offset: [...obj.position],
                rotation: [...obj.rotation],
                color: (r << 16) | (g << 8) | b,
                metalness: obj.material.metalness,
                roughness: obj.material.roughness,
            };
            if (obj.mirror) piece.mirror = true;
            const em = obj.material.emissive;
            if (em && (em[0] || em[1] || em[2]) && (obj.material.emissiveIntensity ?? 0) > 0) {
                piece.emissive = (em[0] << 16) | (em[1] << 8) | em[2];
                piece.emissiveIntensity = obj.material.emissiveIntensity;
            }
            if (obj.type === 'box' && Array.isArray(obj.material.faceColors) && obj.material.faceColors.length === 6) {
                piece.faceColors = obj.material.faceColors.map(c => (c[0] << 16) | (c[1] << 8) | c[2]);
            }
            switch (obj.type) {
                case 'box':
                    piece.size = [
                        obj.params.width * sx,
                        obj.params.height * sy,
                        obj.params.depth * sz,
                    ];
                    break;
                case 'sphere':
                    piece.geo = {
                        type: 'sphere',
                        radius: obj.params.radius * sx,
                        wSeg: obj.params.widthSegments,
                        hSeg: obj.params.heightSegments,
                    };
                    break;
                case 'cylinder':
                    piece.geo = {
                        type: 'cylinder',
                        rTop: obj.params.radiusTop * sx,
                        rBot: obj.params.radiusBottom * sx,
                        h: obj.params.height * sy,
                        seg: obj.params.segments,
                    };
                    break;
                case 'cone':
                    piece.geo = {
                        type: 'cone',
                        radius: obj.params.radius * sx,
                        height: obj.params.height * sy,
                        seg: obj.params.segments,
                    };
                    break;
                case 'tube':
                    piece.geo = {
                        type: 'tube',
                        length: obj.params.length * sy,
                        radius: obj.params.radius * sx,
                        bend: obj.params.bend,
                        taper: obj.params.taper,
                        tubularSegments: obj.params.tubularSegments,
                        radialSegments: obj.params.radialSegments,
                    };
                    break;
                default:
                    piece.size = [sx, sy, sz];
                    break;
            }
            pieces.push(piece);
        }
        return pieces;
    }
}
