/**
 * ObjectScene — manages Three.js meshes for Object Mode in the designer.
 *
 * Creates/destroys meshes from ObjectModel definitions, handles selection
 * (single + multi) via raycasting, and owns the TransformControls gizmo for
 * move/rotate/scale.
 *
 * Multi-select: an invisible pivot Object3D sits at the selection centroid;
 * the gizmo attaches to it and a delta transform is applied to each member
 * mesh on every objectChange. Members are NOT re-parented, so existing
 * single-mesh code paths (modal G/R/S) keep working on individual meshes.
 */

import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { createTubeGeometry } from './curveGeometry.js';

export class ObjectScene {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        this.meshMap = new Map();

        // Selection — set of ids + a leader (most-recently-clicked, drives Properties panel)
        this.selectedIds = new Set();
        this.leaderId = null;

        this._raycaster = new THREE.Raycaster();

        this._onDraggingChanged = null;
        this._onObjectTransformed = null;

        this.transformControls = new TransformControls(camera, renderer.domElement);
        this.transformControls.setSize(0.8);
        this.transformControls.addEventListener('dragging-changed', (e) => {
            if (e.value) this._snapshotForDrag();
            else this._dragSnapshot = null;
            if (this._onDraggingChanged) this._onDraggingChanged(e.value);
        });
        this.transformControls.addEventListener('objectChange', () => {
            this._applyMultiTransform();
            this._syncTransformToModel();
        });
        this.scene.add(this.transformControls.getHelper());
        this.transformControls.enabled = false;
        this.transformControls.getHelper().visible = false;

        // Multi-select pivot proxy (invisible Object3D the gizmo attaches to in multi mode)
        this._pivotProxy = new THREE.Object3D();
        this._pivotProxy.name = 'multi-select-pivot';
        this.scene.add(this._pivotProxy);
        this._dragSnapshot = null;

        // Outlines: id -> LineSegments
        this._outlineMeshes = new Map();
    }

    // Backward-compat: some callers still read selectedId expecting a single id.
    get selectedId() { return this.leaderId; }

    // ── Object Lifecycle ────────────────────────────────────

    addObject(objDef) {
        const geo = this._createGeometry(objDef.type, objDef.params);
        const mat = this._createMaterial(objDef.material, !!objDef.mirror, objDef.type);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.userData.objectId = objDef.id;
        mesh.userData.objectType = objDef.type;

        mesh.position.set(...objDef.position);
        mesh.rotation.set(...objDef.rotation);
        const sx = objDef.scale[0] * (objDef.mirror ? -1 : 1);
        mesh.scale.set(sx, objDef.scale[1], objDef.scale[2]);

        this.scene.add(mesh);
        this.meshMap.set(objDef.id, mesh);
    }

    removeObject(id) {
        if (this.selectedIds.has(id)) this.deselectAll();
        const mesh = this.meshMap.get(id);
        if (!mesh) return;
        this.scene.remove(mesh);
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.meshMap.delete(id);
    }

    updateTransform(id, objDef) {
        const mesh = this.meshMap.get(id);
        if (!mesh) return;
        mesh.position.set(...objDef.position);
        mesh.rotation.set(...objDef.rotation);
        const sx = objDef.scale[0] * (objDef.mirror ? -1 : 1);
        mesh.scale.set(sx, objDef.scale[1], objDef.scale[2]);
    }

    /**
     * Replace the material(s) on a mesh from the current obj def.
     * Always rebuilds (cheap) — handles transitions between single-material and
     * Material[] (per-face boxes) cleanly without bookkeeping.
     */
    updateMaterial(id, objDef) {
        const mesh = this.meshMap.get(id);
        if (!mesh) return;
        if (Array.isArray(mesh.material)) {
            for (const m of mesh.material) m.dispose();
        } else {
            mesh.material.dispose();
        }
        mesh.material = this._createMaterial(objDef.material, !!objDef.mirror, objDef.type);
    }

    /** Toggle the mirror flag — adjusts mesh.scale.x sign and material side. */
    updateMirror(id, mirror) {
        const mesh = this.meshMap.get(id);
        if (!mesh) return;
        mesh.scale.x = Math.abs(mesh.scale.x) * (mirror ? -1 : 1);
        const side = mirror ? THREE.DoubleSide : THREE.FrontSide;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) { m.side = side; m.needsUpdate = true; }
    }

    rebuildGeometry(id, type, params) {
        const mesh = this.meshMap.get(id);
        if (!mesh) return;
        mesh.geometry.dispose();
        mesh.geometry = this._createGeometry(type, params);
        if (this._outlineMeshes.has(id)) this._addOutline(mesh);
    }

    clear() {
        this.deselectAll();
        for (const [, mesh] of this.meshMap) {
            this.scene.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
        this.meshMap.clear();
    }

    rebuildAll(objectModel) {
        this.clear();
        for (const obj of objectModel.getAll()) {
            this.addObject(obj);
        }
    }

    // ── Selection ───────────────────────────────────────────

    /** Single-select shorthand. */
    select(id) {
        this.setSelection(id ? [id] : [], id);
    }

    /** Replace the selection set. `leaderId` drives the Properties panel. */
    setSelection(ids, leaderId = null) {
        this.deselectAll();
        if (!ids || ids.length === 0) return;
        const validIds = ids.filter(id => this.meshMap.has(id));
        if (validIds.length === 0) return;

        this.selectedIds = new Set(validIds);
        this.leaderId = (leaderId && validIds.includes(leaderId)) ? leaderId : validIds[0];

        const meshes = validIds.map(id => this.meshMap.get(id));
        for (const m of meshes) this._addOutline(m);

        if (validIds.length === 1) {
            this.transformControls.attach(meshes[0]);
        } else {
            const tmp = new THREE.Vector3();
            const center = new THREE.Vector3();
            for (const m of meshes) center.add(m.getWorldPosition(tmp));
            center.divideScalar(meshes.length);
            this._pivotProxy.position.copy(center);
            this._pivotProxy.quaternion.identity();
            this._pivotProxy.scale.set(1, 1, 1);
            this._pivotProxy.updateMatrixWorld(true);
            this.transformControls.attach(this._pivotProxy);
        }
        this.transformControls.enabled = true;
        this.transformControls.getHelper().visible = true;
    }

    /** Add an id to the current selection (or remove it if already present). */
    toggleInSelection(id) {
        if (!this.meshMap.has(id)) return;
        const next = new Set(this.selectedIds);
        let nextLeader = this.leaderId;
        if (next.has(id)) {
            next.delete(id);
            if (nextLeader === id) nextLeader = next.values().next().value || null;
        } else {
            next.add(id);
            nextLeader = id;
        }
        this.setSelection(Array.from(next), nextLeader);
    }

    deselectAll() {
        if (this.selectedIds.size === 0 && !this.leaderId) return;
        this.transformControls.detach();
        this.transformControls.enabled = false;
        this.transformControls.getHelper().visible = false;
        this.selectedIds.clear();
        this.leaderId = null;
        this._dragSnapshot = null;
        this._clearOutlines();
    }

    // Old API alias
    deselect() { this.deselectAll(); }

    hitTest(ndcX, ndcY) {
        this._raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        const meshes = Array.from(this.meshMap.values());
        const hits = this._raycaster.intersectObjects(meshes);
        if (hits.length > 0) return hits[0].object.userData.objectId;
        return null;
    }

    hitTestFloor(ndcX, ndcY, floorY = 0) {
        this._raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
        const origin = this._raycaster.ray.origin;
        const dir = this._raycaster.ray.direction;
        if (Math.abs(dir.y) < 0.0001) return null;
        const t = (floorY - origin.y) / dir.y;
        if (t < 0) return null;
        return [origin.x + dir.x * t, floorY, origin.z + dir.z * t];
    }

    // ── Gizmo ───────────────────────────────────────────────

    setGizmoMode(mode) { this.transformControls.setMode(mode); }
    getGizmoMode() { return this.transformControls.mode; }

    setGizmoVisible(visible) {
        this.transformControls.enabled = visible;
        this.transformControls.getHelper().visible = visible && !!this.leaderId;
    }

    /** Returns the leader mesh (or null) — what the Properties panel binds to. */
    getSelectedMesh() {
        return this.leaderId ? this.meshMap.get(this.leaderId) : null;
    }

    getSelectedIds() { return Array.from(this.selectedIds); }
    isSelected(id) { return this.selectedIds.has(id); }

    onDraggingChanged(cb) { this._onDraggingChanged = cb; }
    onObjectTransformed(cb) { this._onObjectTransformed = cb; }

    // ── Visibility ──────────────────────────────────────────

    setVisible(visible) {
        for (const mesh of this.meshMap.values()) mesh.visible = visible;
        if (!visible) {
            this.transformControls.getHelper().visible = false;
            this._clearOutlines();
        } else if (this.selectedIds.size > 0) {
            this.transformControls.getHelper().visible = true;
            for (const id of this.selectedIds) {
                const m = this.meshMap.get(id);
                if (m) this._addOutline(m);
            }
        }
    }

    // ── Selection Outline ───────────────────────────────────

    _addOutline(mesh) {
        const id = mesh.userData.objectId;
        const old = this._outlineMeshes.get(id);
        if (old) {
            this.scene.remove(old);
            old.geometry.dispose();
            old.material.dispose();
        }
        const isLeader = id === this.leaderId;
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const outline = new THREE.LineSegments(
            edges,
            new THREE.LineBasicMaterial({ color: isLeader ? 0x00aaff : 0x66ccff, linewidth: 2 })
        );
        outline.userData._isOutline = true;
        outline.userData._linkedId = id;
        this.scene.add(outline);
        this._outlineMeshes.set(id, outline);
    }

    _clearOutlines() {
        for (const ol of this._outlineMeshes.values()) {
            this.scene.remove(ol);
            ol.geometry.dispose();
            ol.material.dispose();
        }
        this._outlineMeshes.clear();
    }

    /** Sync each outline to its linked mesh's transform. Called per-frame. */
    updateOutline() {
        for (const [id, outline] of this._outlineMeshes) {
            const mesh = this.meshMap.get(id);
            if (!mesh) continue;
            outline.position.copy(mesh.position);
            outline.rotation.copy(mesh.rotation);
            outline.scale.copy(mesh.scale);
        }
    }

    // ── Multi-select transform ──────────────────────────────

    _snapshotForDrag() {
        if (this.selectedIds.size <= 1) { this._dragSnapshot = null; return; }
        const members = new Map();
        for (const id of this.selectedIds) {
            const m = this.meshMap.get(id);
            if (!m) continue;
            members.set(id, {
                pos: m.position.clone(),
                quat: m.quaternion.clone(),
                scale: m.scale.clone(),
            });
        }
        this._dragSnapshot = {
            pivotPos: this._pivotProxy.position.clone(),
            pivotQuat: this._pivotProxy.quaternion.clone(),
            pivotScale: this._pivotProxy.scale.clone(),
            members,
        };
    }

    /** Apply the gizmo's transform delta to each member of a multi-selection. */
    _applyMultiTransform() {
        if (!this._dragSnapshot) return;
        if (this.selectedIds.size <= 1) return;

        const snap = this._dragSnapshot;
        const proxy = this._pivotProxy;

        // Translation delta (in world space)
        const dPos = proxy.position.clone().sub(snap.pivotPos);

        // Rotation delta: q_now * q_start^-1
        const dQuat = proxy.quaternion.clone()
            .multiply(snap.pivotQuat.clone().invert());

        // Scale delta (uniform-ish; gizmo emits componentwise)
        const dScale = new THREE.Vector3(
            snap.pivotScale.x === 0 ? 1 : proxy.scale.x / snap.pivotScale.x,
            snap.pivotScale.y === 0 ? 1 : proxy.scale.y / snap.pivotScale.y,
            snap.pivotScale.z === 0 ? 1 : proxy.scale.z / snap.pivotScale.z,
        );

        const tmpVec = new THREE.Vector3();
        for (const id of this.selectedIds) {
            const m = this.meshMap.get(id);
            const start = snap.members.get(id);
            if (!m || !start) continue;

            // newPos = pivotPos_now + dQuat * ((startPos - pivotPos_start) * dScale)
            tmpVec.copy(start.pos).sub(snap.pivotPos);
            tmpVec.multiply(dScale);
            tmpVec.applyQuaternion(dQuat);
            m.position.copy(snap.pivotPos).add(dPos).add(tmpVec);

            // newQuat = dQuat * startQuat
            m.quaternion.copy(dQuat).multiply(start.quat);

            // newScale = startScale * dScale (componentwise)
            m.scale.set(
                start.scale.x * dScale.x,
                start.scale.y * dScale.y,
                start.scale.z * dScale.z,
            );
        }
    }

    /** Push current world transforms back to the ObjectModel via callback. */
    _syncTransformToModel() {
        if (!this._onObjectTransformed) return;
        if (this.selectedIds.size === 0) return;
        const tmpEuler = new THREE.Euler();
        for (const id of this.selectedIds) {
            const m = this.meshMap.get(id);
            if (!m) continue;
            tmpEuler.setFromQuaternion(m.quaternion);
            this._onObjectTransformed(id,
                [m.position.x, m.position.y, m.position.z],
                [tmpEuler.x, tmpEuler.y, tmpEuler.z],
                [m.scale.x, m.scale.y, m.scale.z]);
        }
    }

    // ── Geometry Factory ────────────────────────────────────

    _createGeometry(type, params) {
        switch (type) {
            case 'box':
                return new THREE.BoxGeometry(params.width, params.height, params.depth);
            case 'sphere':
                return new THREE.SphereGeometry(
                    params.radius,
                    params.widthSegments ?? 14,
                    params.heightSegments ?? 10
                );
            case 'cylinder':
                return new THREE.CylinderGeometry(
                    params.radiusTop, params.radiusBottom, params.height, params.segments ?? 14
                );
            case 'cone':
                return new THREE.ConeGeometry(params.radius, params.height, params.segments ?? 14);
            case 'torus':
                return new THREE.TorusGeometry(
                    params.radius, params.tube,
                    params.radialSegments ?? 12, params.tubularSegments ?? 24
                );
            case 'wedge':
                return this._createWedgeGeometry(params.width, params.height, params.depth);
            case 'tube':
                return createTubeGeometry(params);
            default:
                return new THREE.BoxGeometry(1, 1, 1);
        }
    }

    _createWedgeGeometry(width, height, depth) {
        const shape = new THREE.Shape();
        const hw = width / 2;
        const hh = height / 2;
        shape.moveTo(-hw, -hh);
        shape.lineTo(hw, -hh);
        shape.lineTo(-hw, hh);
        shape.closePath();
        return new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    }

    _createMaterial(matDef, mirror = false, type = null) {
        // Per-face materials only apply to box (BoxGeometry has 6 face groups).
        if (type === 'box' && Array.isArray(matDef.faceColors) && matDef.faceColors.length === 6) {
            return matDef.faceColors.map(c => this._buildStandardMat(c, matDef, mirror));
        }
        return this._buildStandardMat(matDef.color, matDef, mirror);
    }

    _buildStandardMat(color, matDef, mirror) {
        const [r, g, b] = color;
        const er = matDef.emissive?.[0] ?? 0;
        const eg = matDef.emissive?.[1] ?? 0;
        const eb = matDef.emissive?.[2] ?? 0;
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(r / 255, g / 255, b / 255),
            metalness: matDef.metalness ?? 0.6,
            roughness: matDef.roughness ?? 0.4,
            emissive: new THREE.Color(er / 255, eg / 255, eb / 255),
            emissiveIntensity: matDef.emissiveIntensity ?? 0,
            side: mirror ? THREE.DoubleSide : THREE.FrontSide,
        });
    }

    // ── Dispose ─────────────────────────────────────────────

    dispose() {
        this.clear();
        this.transformControls.detach();
        this.transformControls.dispose();
        this.scene.remove(this.transformControls.getHelper());
        this.scene.remove(this._pivotProxy);
        this._clearOutlines();
    }
}
