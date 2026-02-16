import * as THREE from 'three';

const CLASS_COLORS = {
    'Warrior': 0xc62828,
    'Wizard': 0x1565c0,
    'Paladin': 0xffd54f,
    'Rogue': 0x6a1b9a
};

export class Player {
    constructor(scene, characterData = {}) {
        this.scene = scene;
        this.characterData = characterData;
        this.moveSpeed = 7;
        this.mesh = null;
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();

        this.createMesh();
    }

    createMesh() {
        const color = CLASS_COLORS[this.characterData.class] || 0x888888;

        // Capsule body
        const bodyGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.6,
            metalness: 0.2
        });
        this.mesh = new THREE.Mesh(bodyGeo, bodyMat);
        this.mesh.castShadow = true;
        this.mesh.position.set(0, 1, 0); // Center of capsule at y=1

        // Simple head sphere
        const headGeo = new THREE.SphereGeometry(0.3, 8, 8);
        const headMat = new THREE.MeshStandardMaterial({
            color: 0xf5d0a9,
            roughness: 0.7
        });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.0;
        head.castShadow = true;
        this.mesh.add(head);

        this.scene.add(this.mesh);
    }

    /**
     * Update player movement based on input
     * @param {number} deltaTime
     * @param {object} keys - Input keys state
     * @param {number} cameraYaw - Camera horizontal rotation
     */
    update(deltaTime, keys, cameraYaw) {
        this.direction.set(0, 0, 0);

        if (keys.forward) this.direction.z -= 1;
        if (keys.backward) this.direction.z += 1;
        if (keys.left) this.direction.x -= 1;
        if (keys.right) this.direction.x += 1;

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();

            // Rotate movement direction relative to camera yaw
            this.direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

            // Apply movement
            this.mesh.position.addScaledVector(this.direction, this.moveSpeed * deltaTime);

            // Face movement direction
            const targetRotation = Math.atan2(this.direction.x, this.direction.z);
            // Smooth rotation
            let rotDiff = targetRotation - this.mesh.rotation.y;
            while (rotDiff > Math.PI) rotDiff -= Math.PI * 2;
            while (rotDiff < -Math.PI) rotDiff += Math.PI * 2;
            this.mesh.rotation.y += rotDiff * Math.min(1, 10 * deltaTime);
        }

        // Clamp to terrain bounds (256 units from center)
        const bounds = 250;
        this.mesh.position.x = Math.max(-bounds, Math.min(bounds, this.mesh.position.x));
        this.mesh.position.z = Math.max(-bounds, Math.min(bounds, this.mesh.position.z));

        // Keep on ground
        this.mesh.position.y = 1;
    }

    getPosition() {
        return this.mesh.position;
    }

    getRotation() {
        return this.mesh.rotation.y;
    }
}
