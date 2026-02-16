import * as THREE from 'three';

const CLASS_COLORS = {
    'Warrior': 0xc62828,
    'Wizard': 0x1565c0,
    'Paladin': 0xffd54f,
    'Rogue': 0x6a1b9a
};

export class OtherPlayer {
    constructor(scene, playerData) {
        this.scene = scene;
        this.id = playerData.id;
        this.name = playerData.name || 'Player';
        this.mesh = null;
        this.nameplate = null;

        // Interpolation
        this.targetPosition = new THREE.Vector3();
        this.targetRotation = 0;
        this.interpSpeed = 8;

        this.createMesh(playerData);
        this.createNameplate();
    }

    createMesh(data) {
        const color = CLASS_COLORS[data.class] || 0x888888;

        const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.2
        });
        this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.mesh.castShadow = true;

        // Set initial position (map 2D y to 3D z)
        const x = data.x || 0;
        const z = data.y || 0;
        this.mesh.position.set(x, 1, z);
        this.targetPosition.set(x, 1, z);

        // Head
        const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({ color: 0xf5d0a9, roughness: 0.7 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.0;
        this.mesh.add(head);

        this.scene.add(this.mesh);
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
        // Interpolate position
        this.mesh.position.lerp(this.targetPosition, Math.min(1, this.interpSpeed * deltaTime));

        // Interpolate rotation
        let rotDiff = this.targetRotation - this.mesh.rotation.y;
        while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
        while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
        this.mesh.rotation.y += rotDiff * Math.min(1, this.interpSpeed * deltaTime);
    }

    destroy() {
        this.scene.remove(this.mesh);
    }
}
