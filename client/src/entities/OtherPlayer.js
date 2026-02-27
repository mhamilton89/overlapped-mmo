import * as THREE from 'three';
import { CharacterModel } from './CharacterModel.js';
import { getCharacterVisuals } from './armorVisuals.js';

export class OtherPlayer {
    constructor(scene, playerData) {
        this.scene = scene;
        this.id = playerData.id;
        this.name = playerData.name || 'Player';
        this.className = playerData.class;
        this.mesh = null;
        this.model = null;
        this.nameplate = null;

        // Interpolation
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = 0;
        this.interpSpeed = 8;

        this.createMesh(playerData);
        this.createNameplate();
    }

    createMesh(data) {
        this.model = new CharacterModel(data.class);
        this.mesh = this.model.group;

        // Set initial position (map 2D y to 3D z)
        const x = data.x || 0;
        const z = data.y || 0;
        this.mesh.position.set(x, 1, z);
        this.targetPosition.set(x, 1, z);

        this.scene.add(this.mesh);

        // Apply armor visuals
        const visuals = getCharacterVisuals(data.class, data.equipment);
        this.model.applyEquipment(visuals);
    }

    updateEquipment(serverEquipment) {
        const visuals = getCharacterVisuals(this.className, serverEquipment);
        this.model.applyEquipment(visuals);
    }

    createNameplate() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 16, 256, 32);

        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(this.name, 128, 42);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            depthTest: false
        });
        this.nameplate = new THREE.Sprite(spriteMat);
        this.nameplate.scale.set(3, 0.75, 1);
        this.nameplate.position.y = 2.5;
        this.mesh.add(this.nameplate);
    }

    setTargetPosition(x, y, rotation) {
        // Map 2D y to 3D z
        this.targetPosition.set(x, 1, y);
        this.targetRotation = rotation || 0;
    }

    update(deltaTime) {
        // Detect movement for animation
        const isMoving = this.mesh.position.distanceTo(this.targetPosition) > 0.05;

        // Interpolate position
        this.mesh.position.lerp(this.targetPosition, Math.min(1, this.interpSpeed * deltaTime));

        // Interpolate rotation
        let rotDiff = this.targetRotation - this.mesh.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.mesh.rotation.y += rotDiff * Math.min(1, this.interpSpeed * deltaTime);

        // Animate character
        this.model.update(deltaTime, isMoving);
    }

    destroy() {
        this.model.dispose();
        this.scene.remove(this.mesh);
    }
}
