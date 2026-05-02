import * as THREE from 'three';
import { MicroVoxelModel } from '../designer/MicroVoxelModel.js';
import { buildEquipmentMesh } from '../designer/MicroVoxelMesher.js';
import { createTubeGeometry } from '../designer/curveGeometry.js';

export const CLASS_COLORS = {
    'Warrior': 0xc62828,
    'Wizard':  0x1565c0,
    'Paladin': 0xffd54f,
    'Ranger':  0x6a1b9a
};

const SKIN_COLOR = 0xf5d0a9;

function darkenColor(hex, factor) {
    const r = ((hex >> 16) & 0xff) * factor;
    const g = ((hex >> 8) & 0xff) * factor;
    const b = (hex & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
}

export class CharacterModel {
    constructor(className) {
        this.group = new THREE.Group();
        this.className = className;

        // Animation state
        this.animTime = 0;
        this.currentSpeed = 0;

        // Base Y positions for idle bob
        this.torsoBaseY = 0.05;
        this.headBaseY = 0.73;

        // Animatable part refs
        this.torso = null;
        this.head = null;
        this.leftArmPivot = null;
        this.rightArmPivot = null;
        this.leftLegPivot = null;
        this.rightLegPivot = null;

        // Body part refs for armor attachment
        this.parts = {
            head: null,
            torso: null,
            upperLeftArm: null,
            lowerLeftArm: null,
            upperRightArm: null,
            lowerRightArm: null,
            upperLeftLeg: null,
            lowerLeftLeg: null,
            upperRightLeg: null,
            lowerRightLeg: null,
        };

        // Currently equipped armor overlays: slot → { meshes: [...] }
        this.armorOverlays = {};

        // Chopping state
        this.isChopping = false;
        this.chopTime = 0;
        this.axe = null;

        // Attack state
        this.isAttacking = false;
        this.attackTime = 0;

        // Cast state (for spells like fireball)
        this.isCasting = false;
        this.castTime = 0;
        this.castDuration = 1.0;
        this._castComplete = null;
        this.castOrb = null;

        this._build();
        this._buildCastOrb();
    }

    _buildCastOrb() {
        // Small glowing sphere that appears near the casting hand(s) during a cast.
        // Hidden by default, color/position updated per-spell on triggerCast.
        const orbMat = new THREE.MeshStandardMaterial({
            color: 0xff8a1a,
            emissive: 0xff6a1a,
            emissiveIntensity: 2.0,
            roughness: 0.3,
            metalness: 0.0,
            transparent: true,
            opacity: 0.9,
        });
        this.castOrb = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 10, 8),
            orbMat
        );
        this.castOrb.visible = false;
        this.group.add(this.castOrb);

        this._castPose = 'two-hand';
        this._castOrbHome = new THREE.Vector3(0, 0.55, -0.55);
    }

    /**
     * Start a cast.
     * @param {object} opts
     *   - duration: seconds (default 1.0)
     *   - pose: 'two-hand' | 'one-hand' (default 'two-hand')
     *   - orbColor: hex color for both color + emissive (default orange)
     *   - onComplete: () => void, fired when animation finishes normally
     * Returns true if started, false if busy (attacking/chopping/casting already).
     */
    triggerCast(opts = {}) {
        if (this.isCasting || this.isAttacking || this.isChopping) return false;

        this.isCasting = true;
        this.castTime = 0;
        this.castDuration = opts.duration ?? 1.0;
        this._castComplete = opts.onComplete ?? null;
        this._castPose = opts.pose ?? 'two-hand';

        const orbColor = opts.orbColor ?? 0xff6a1a;
        this.castOrb.material.color.setHex(orbColor);
        this.castOrb.material.emissive.setHex(orbColor);

        // Position the orb appropriately for the pose
        if (this._castPose === 'one-hand') {
            // Near the raised right hand (arm rotation.x = -2.3, rotation.z = -0.3)
            this._castOrbHome.set(0.55, 1.05, -0.15);
        } else {
            this._castOrbHome.set(0, 0.55, -0.55);
        }
        this.castOrb.position.copy(this._castOrbHome);
        return true;
    }

    /** Cancel an in-progress cast without firing the completion callback. */
    cancelCast() {
        if (!this.isCasting) return;
        this.isCasting = false;
        this.castTime = 0;
        this._castComplete = null;
        if (this.castOrb) this.castOrb.visible = false;
        this.rightArmPivot.rotation.z = 0;
        this.leftArmPivot.rotation.z = 0;
    }

    /** 0..1 fraction of current cast, or 0 if not casting. */
    getCastProgress() {
        if (!this.isCasting) return 0;
        return Math.min(1, this.castTime / this.castDuration);
    }

    _build() {
        const classColor = CLASS_COLORS[this.className] || 0x888888;
        const bootColor = darkenColor(classColor, 0.7);

        const classMat = new THREE.MeshStandardMaterial({
            color: classColor, roughness: 0.6, metalness: 0.2, flatShading: true
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: SKIN_COLOR, roughness: 0.7, flatShading: true
        });
        const bootMat = new THREE.MeshStandardMaterial({
            color: bootColor, roughness: 0.65, metalness: 0.15, flatShading: true
        });

        // Torso
        this.torso = new THREE.Mesh(
            new THREE.BoxGeometry(0.7, 0.7, 0.45),
            classMat
        );
        this.torso.position.y = this.torsoBaseY;
        this.torso.castShadow = true;
        this.group.add(this.torso);
        this.parts.torso = this.torso;

        // Head
        this.head = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            skinMat
        );
        this.head.position.y = this.headBaseY;
        this.head.castShadow = true;
        this.group.add(this.head);
        this.parts.head = this.head;

        // Arms
        this.leftArmPivot = this._buildArm(classMat, skinMat, -0.46, 'Left');
        this.rightArmPivot = this._buildArm(classMat, skinMat, 0.46, 'Right');

        // Legs
        this.leftLegPivot = this._buildLeg(classMat, bootMat, -0.15, 'Left');
        this.rightLegPivot = this._buildLeg(classMat, bootMat, 0.15, 'Right');

        // Axe (hidden by default, shown during chopping)
        this.axe = this._buildAxe();
        this.axe.visible = false;
        this.rightArmPivot.add(this.axe);
    }

    _buildArm(classMat, skinMat, xOffset, side) {
        const pivot = new THREE.Group();
        pivot.position.set(xOffset, 0.25, 0);

        const upper = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.38, 0.22),
            classMat
        );
        upper.position.y = -0.19;
        upper.castShadow = true;
        pivot.add(upper);
        this.parts[`upper${side}Arm`] = upper;

        const lower = new THREE.Mesh(
            new THREE.BoxGeometry(0.18, 0.35, 0.18),
            skinMat
        );
        lower.position.y = -0.555;
        lower.castShadow = true;
        pivot.add(lower);
        this.parts[`lower${side}Arm`] = lower;

        this.group.add(pivot);
        return pivot;
    }

    _buildLeg(classMat, bootMat, xOffset, side) {
        const pivot = new THREE.Group();
        pivot.position.set(xOffset, -0.30, 0);

        const upper = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.38, 0.24),
            classMat
        );
        upper.position.y = -0.19;
        upper.castShadow = true;
        pivot.add(upper);
        this.parts[`upper${side}Leg`] = upper;

        const lower = new THREE.Mesh(
            new THREE.BoxGeometry(0.20, 0.38, 0.20),
            bootMat
        );
        lower.position.y = -0.555;
        lower.castShadow = true;
        pivot.add(lower);
        this.parts[`lower${side}Leg`] = lower;

        this.group.add(pivot);
        return pivot;
    }

    /**
     * Equip armor on a slot. armorDef comes from armorVisuals registry.
     * Each armorDef has: { slot, pieces: [{ target, size, offset, color, metalness, roughness }] }
     */
    /**
     * Create geometry from a piece definition.
     * Supports: box (default), sphere, cylinder, cone
     */
    _createGeo(piece) {
        const g = piece.geo;
        if (!g) {
            // Backwards-compatible: use piece.size as box dimensions
            return new THREE.BoxGeometry(piece.size[0], piece.size[1], piece.size[2]);
        }
        switch (g.type) {
            case 'sphere':
                return new THREE.SphereGeometry(g.radius, g.wSeg ?? 8, g.hSeg ?? 6);
            case 'cylinder':
                return new THREE.CylinderGeometry(g.rTop, g.rBot, g.h, g.seg ?? 8);
            case 'cone':
                return new THREE.ConeGeometry(g.radius, g.height, g.seg ?? 7);
            case 'tube':
                return createTubeGeometry(g);
            case 'box':
            default:
                return new THREE.BoxGeometry(g.size[0], g.size[1], g.size[2]);
        }
    }

    equipArmor(slot, armorDef) {
        // Remove existing armor in this slot
        this.unequipArmor(slot);

        if (!armorDef) return;

        const meshes = [];

        for (const piece of armorDef.pieces) {
            let mesh;

            if (piece.voxel && piece.modelData) {
                // Voxel micro-item: build from MicroVoxelModel data
                const model = MicroVoxelModel.deserialize(piece.modelData);
                mesh = buildEquipmentMesh(model, piece.voxelScale || 0.03, {
                    metalness: piece.metalness ?? 0.3,
                    roughness: piece.roughness ?? 0.5,
                });
            } else {
                const geo = this._createGeo(piece);
                const matOpts = {
                    roughness: piece.roughness ?? 0.4,
                    metalness: piece.metalness ?? 0.6,
                    flatShading: true,
                    side: piece.mirror ? THREE.DoubleSide : THREE.FrontSide,
                };
                if (piece.emissive !== undefined) {
                    matOpts.emissive = piece.emissive;
                    matOpts.emissiveIntensity = piece.emissiveIntensity ?? 1;
                }
                let material;
                const isBox = !piece.geo || piece.geo.type === 'box';
                if (isBox && Array.isArray(piece.faceColors) && piece.faceColors.length === 6) {
                    material = piece.faceColors.map(c => new THREE.MeshStandardMaterial({ ...matOpts, color: c }));
                } else {
                    material = new THREE.MeshStandardMaterial({ ...matOpts, color: piece.color });
                }
                mesh = new THREE.Mesh(geo, material);
                if (piece.mirror) mesh.scale.x = -1;
            }

            // Position the overlay relative to the body part it covers
            const target = this.parts[piece.target];
            if (!target) continue;

            mesh.position.copy(target.position);
            if (piece.offset) {
                mesh.position.x += piece.offset[0] || 0;
                mesh.position.y += piece.offset[1] || 0;
                mesh.position.z += piece.offset[2] || 0;
            }
            if (piece.rotation) {
                mesh.rotation.x = piece.rotation[0] || 0;
                mesh.rotation.y = piece.rotation[1] || 0;
                mesh.rotation.z = piece.rotation[2] || 0;
            }
            mesh.castShadow = true;

            // Add to the same parent as the target (so it animates with limbs)
            target.parent.add(mesh);
            meshes.push(mesh);
        }

        this.armorOverlays[slot] = { meshes };
    }

    /**
     * Remove armor from a slot
     */
    unequipArmor(slot) {
        const overlay = this.armorOverlays[slot];
        if (!overlay) return;

        for (const mesh of overlay.meshes) {
            mesh.parent.remove(mesh);
            mesh.geometry.dispose();
            if (Array.isArray(mesh.material)) {
                for (const m of mesh.material) m.dispose();
            } else {
                mesh.material.dispose();
            }
        }

        delete this.armorOverlays[slot];
    }

    /**
     * Apply a full equipment set: { head: armorDef, chest: armorDef, ... }
     */
    applyEquipment(equipmentMap) {
        // Clear all existing overlays
        for (const slot of Object.keys(this.armorOverlays)) {
            this.unequipArmor(slot);
        }

        // Apply each piece
        for (const [slot, armorDef] of Object.entries(equipmentMap)) {
            this.equipArmor(slot, armorDef);
        }
    }

    _buildAxe() {
        const axeGroup = new THREE.Group();
        // Position at the hand (end of right arm)
        axeGroup.position.set(0, -0.65, 0.12);

        // Handle
        const handleMat = new THREE.MeshStandardMaterial({
            color: 0x8b5a2b, roughness: 0.8, metalness: 0.1, flatShading: true
        });
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.55, 0.06),
            handleMat
        );
        handle.castShadow = true;
        axeGroup.add(handle);

        // Blade
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, roughness: 0.3, metalness: 0.8, flatShading: true
        });
        const blade = new THREE.Mesh(
            new THREE.BoxGeometry(0.22, 0.2, 0.04),
            bladeMat
        );
        blade.position.set(0.11, 0.22, 0);
        blade.castShadow = true;
        axeGroup.add(blade);

        return axeGroup;
    }

    setChopping(active) {
        this.isChopping = active;
        this.axe.visible = active;
        if (!active) {
            this.chopTime = 0;
        }
    }

    triggerAttack() {
        this.isAttacking = true;
        this.attackTime = 0;
    }

    update(deltaTime, isMoving) {
        // Blend between idle and walk
        const targetSpeed = isMoving ? 1.0 : 0.0;
        this.currentSpeed += (targetSpeed - this.currentSpeed) * Math.min(1, 6 * deltaTime);

        this.animTime += deltaTime;

        const walkPhase = this.animTime * 8.0;
        const idlePhase = this.animTime * 2.0;
        const speed = this.currentSpeed;

        // Walk: sinusoidal limb swing scaled by speed
        const armSwing = Math.sin(walkPhase) * 0.6 * speed;
        const legSwing = Math.sin(walkPhase) * 0.5 * speed;

        // Idle: subtle bob and sway scaled by (1 - speed)
        const idle = 1.0 - speed;
        const idleBob = Math.sin(idlePhase) * 0.02 * idle;
        const idleArmL = Math.sin(idlePhase) * 0.03 * idle;
        const idleArmR = Math.sin(idlePhase + 0.5) * 0.03 * idle;

        // Cast animation — pose varies by spell type
        if (this.isCasting) {
            this.castTime += deltaTime;
            const t = Math.min(1, this.castTime / this.castDuration);

            if (this._castPose === 'one-hand') {
                // Right arm raised high and slightly out — palm toward sky
                this.rightArmPivot.rotation.x = -2.3;
                this.rightArmPivot.rotation.z = -0.3;
                this.leftArmPivot.rotation.x = 0.1;
                this.leftArmPivot.rotation.z = 0;
                // Slight torso lean back / chin up
                this.torso.rotation.x = -0.06;
                this.head.rotation.x = -0.12;
            } else {
                // Two-hand: both arms raised forward-up, cupping the orb
                this.rightArmPivot.rotation.x = -1.6;
                this.rightArmPivot.rotation.z = 0;
                this.leftArmPivot.rotation.x = -1.6;
                this.leftArmPivot.rotation.z = 0;
                this.torso.rotation.x = 0.08;
                this.head.rotation.x = 0.08;
            }

            this.torso.position.y = this.torsoBaseY;
            this.head.position.y = this.headBaseY;

            // Legs planted
            this.leftLegPivot.rotation.x = 0;
            this.rightLegPivot.rotation.x = 0;

            // Orb grows and pulses as cast charges
            this.castOrb.visible = true;
            const pulse = 1 + Math.sin(this.castTime * 24) * 0.08;
            const scale = (0.25 + t * 1.8) * pulse;
            this.castOrb.scale.set(scale, scale, scale);
            this.castOrb.material.emissiveIntensity = 1.5 + t * 2.0;

            if (t >= 1) {
                this.isCasting = false;
                this.castTime = 0;
                this.castOrb.visible = false;
                // Reset shoulder z rotation so it doesn't leak into the next frame
                this.rightArmPivot.rotation.z = 0;
                this.leftArmPivot.rotation.z = 0;
                const cb = this._castComplete;
                this._castComplete = null;
                if (cb) cb();
            }
            return;
        }

        // Attack animation (quick punch, auto-completes in 0.4s)
        if (this.isAttacking) {
            this.attackTime += deltaTime;
            const dur = 0.4;
            const t = Math.min(1, this.attackTime / dur);

            // Right arm swings forward then back
            const swing = Math.sin(t * Math.PI) * -1.2;
            this.rightArmPivot.rotation.x = swing;
            this.leftArmPivot.rotation.x = idleArmL;

            // Slight torso lunge
            const lunge = Math.sin(t * Math.PI) * 0.1;
            this.torso.rotation.x = lunge;
            this.head.rotation.x = lunge;
            this.torso.position.y = this.torsoBaseY;
            this.head.position.y = this.headBaseY;

            this.leftLegPivot.rotation.x = 0;
            this.rightLegPivot.rotation.x = 0;

            if (t >= 1) {
                this.isAttacking = false;
                this.attackTime = 0;
            }
            return;
        }

        if (this.isChopping) {
            // Chopping animation — right arm swings down repeatedly
            this.chopTime += deltaTime;
            const chopPhase = this.chopTime * 6.0; // 6 rad/s ~= 1 chop per second
            // Swing from raised (-1.8 rad) to forward (-0.4 rad)
            const chopAngle = -1.1 + Math.sin(chopPhase) * 0.7;

            this.rightArmPivot.rotation.x = chopAngle;
            this.leftArmPivot.rotation.x = idleArmL;
            this.leftLegPivot.rotation.x = 0;
            this.rightLegPivot.rotation.x = 0;

            // Slight torso lean into the chop
            const lean = Math.sin(chopPhase) * 0.08;
            this.torso.position.y = this.torsoBaseY;
            this.head.position.y = this.headBaseY;
            this.torso.rotation.x = lean;
            this.head.rotation.x = lean;
        } else {
            // Normal walk/idle
            this.leftArmPivot.rotation.x = armSwing + idleArmL;
            this.rightArmPivot.rotation.x = -armSwing + idleArmR;
            this.leftLegPivot.rotation.x = -legSwing;
            this.rightLegPivot.rotation.x = legSwing;

            this.torso.position.y = this.torsoBaseY + idleBob;
            this.head.position.y = this.headBaseY + idleBob;
            this.torso.rotation.x = 0;
            this.head.rotation.x = 0;
        }
    }

    dispose() {
        // Remove all armor overlays
        for (const slot of Object.keys(this.armorOverlays)) {
            this.unequipArmor(slot);
        }

        this.group.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                child.material.dispose();
            }
        });
    }
}
