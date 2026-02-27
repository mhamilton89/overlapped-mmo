import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { getCharacterVisuals } from './armorVisuals.js';

const PLAYER_RADIUS = 0.5;
const TREE_COLLISION_RADIUS = 1.2;

export class Player {
    constructor(scene, characterData = {}) {
        this.scene = scene;
        this.characterData = characterData;
        this.moveSpeed = 7;
        this.mesh = null;
        this.model = null;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.isMoving = false;

        // Collision obstacles set by Game.js
        this.collisionObjects = [];

        this.createMesh();
    }

    createMesh() {
        this.model = new CharacterModel(this.characterData.class);
        this.mesh = this.model.group;
        this.mesh.position.set(0, 1, 0);
        this.scene.add(this.mesh);

        // Apply armor visuals (class defaults merged with any server equipment)
        const visuals = getCharacterVisuals(
            this.characterData.class,
            this.characterData.equipment
        );
        this.model.applyEquipment(visuals);
    }

    updateEquipment(serverEquipment) {
        const visuals = getCharacterVisuals(this.characterData.class, serverEquipment);
        this.model.applyEquipment(visuals);
    }

    update(deltaTime, keys, cameraYaw) {
        this.direction.set(0, 0, 0);

        if (keys.forward) this.direction.z -= 1;
        if (keys.backward) this.direction.z += 1;
        if (keys.left) this.direction.x -= 1;
        if (keys.right) this.direction.x += 1;

        this.isMoving = this.direction.lengthSq() > 0;

        if (this.isMoving) {
            this.direction.normalize();
            this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
            this.mesh.position.addScaledVector(this.direction, this.moveSpeed * deltaTime);

            const targetRotation = Math.atan2(this.direction.x, this.direction.z);
            let rotDiff = targetRotation - this.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.mesh.rotation.y += rotDiff * Math.min(1, 10 * deltaTime);
        }

        // Tree collision
        this.resolveCollisions();

        // Clamp to terrain bounds
        const bounds = 250;
        this.mesh.position.x = Math.max(-bounds, Math.min(bounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-bounds, Math.min(bounds, this.mesh.position.z));

        // Keep on ground
        this.mesh.position.y = 1;

        // Animate character model
        this.model.update(deltaTime, this.isMoving);
    }

    resolveCollisions() {
        const px = this.mesh.position.x;
        const pz = this.mesh.position.z;

        for (const obj of this.collisionObjects) {
            const ox = obj.position.x;
            const oz = obj.position.z;
            const dx = px - ox;
            const dz = pz - oz;
            const distSq = dx * dx + dz * dz;
            const minDist = PLAYER_RADIUS + TREE_COLLISION_RADIUS;

            if (distSq < minDist * minDist && distSq > 0.0001) {
                const dist = Math.sqrt(distSq);
                const overlap = minDist - dist;
                this.mesh.position.x += (dx / dist) * overlap;
                this.mesh.position.z += (dz / dist) * overlap;
            }
        }
    }

    getPosition() {
        return this.mesh.position;
    }

    getRotation() {
        return this.mesh.rotation.y;
    }
}
