import * as THREE from 'three';

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

        this._build();
    }

    _build() {
        const classColor = CLASS_COLORS[this.className] || 0x888888;
        const bootColor = darkenColor(classColor, 0.7);

        const classMat = new THREE.MeshStandardMaterial({
            color: classColor, roughness: 0.6, metalness: 0.2
        });
        const skinMat = new THREE.MeshStandardMaterial({
            color: SKIN_COLOR, roughness: 0.7
        });
        const bootMat = new THREE.MeshStandardMaterial({
            color: bootColor, roughness: 0.65, metalness: 0.15
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
    equipArmor(slot, armorDef) {
        // Remove existing armor in this slot
        this.unequipArmor(slot);

        if (!armorDef) return;

        const meshes = [];

        for (const piece of armorDef.pieces) {
            const mat = new THREE.MeshStandardMaterial({
                color: piece.color,
                roughness: piece.roughness ?? 0.4,
                metalness: piece.metalness ?? 0.6,
            });

            const geo = new THREE.BoxGeometry(piece.size[0], piece.size[1], piece.size[2]);
            const mesh = new THREE.Mesh(geo, mat);

            // Position the overlay relative to the body part it covers
            const target = this.parts[piece.target];
            if (!target) continue;

            mesh.position.copy(target.position);
            if (piece.offset) {
                mesh.position.x += piece.offset[0] || 0;
                mesh.position.y += piece.offset[1] || 0;
                mesh.position.z += piece.offset[2] || 0;
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
            mesh.material.dispose();
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
            color: 0x8b5a2b, roughness: 0.8, metalness: 0.1
        });
        const handle = new THREE.Mesh(
            new THREE.BoxGeometry(0.06, 0.55, 0.06),
            handleMat
        );
        handle.castShadow = true;
        axeGroup.add(handle);

        // Blade
        const bladeMat = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa, roughness: 0.3, metalness: 0.8
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
