import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { getCharacterVisuals } from './armorVisuals.js';

const PLAYER_RADIUS = 0.5;

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

        // ChunkManager reference for ground height queries (set by Game.js)
        this.chunkManager = null;

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

        // Snap to ground height from voxel terrain
        // Model origin is at waist; feet are ~1.05 below origin
        const FOOT_OFFSET = 1.05;
        if (this.chunkManager) {
            const groundY = this.chunkManager.getGroundHeight(
                Math.floor(this.mesh.position.x),
                Math.floor(this.mesh.position.z)
            );
            this.mesh.position.y = groundY + FOOT_OFFSET;
        } else {
            this.mesh.position.y = 1 + FOOT_OFFSET;
        }

        // Animate character model
        this.model.update(deltaTime, this.isMoving);
    }

    getPosition() {
        return this.mesh.position;
    }

    getRotation() {
        return this.mesh.rotation.y;
    }
}
