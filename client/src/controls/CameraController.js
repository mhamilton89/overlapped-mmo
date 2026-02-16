import * as THREE from 'three';

export class CameraController {
    constructor(camera, domElement) {
        this.camera = camera;
        this.domElement = domElement;
        this.target = null; // The mesh to follow

        // Orbit parameters
        this.distance = 12;
        this.minDistance = 3;
        this.maxDistance = 30;
        this.yaw = 0;
        this.pitch = -0.4;
        this.minPitch = -1.3;
        this.maxPitch = 0.2;

        // Smoothing
        this.currentPosition = new THREE.Vector3();
        this.targetLookAt = new THREE.Vector3();
        this.smoothSpeed = 8;

        // Offset above player (look at head, not feet)
        this.heightOffset = 2.0;

        // Mouse tracking
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.mouseSensitivity = 0.004;

        this.setupListeners();
    }

    setupListeners() {
        this.domElement.addEventListener('mousemove', (e) => {
            // Only orbit when right mouse is held
            if (e.buttons & 2) {
                const deltaX = e.movementX || (e.clientX - this.lastMouseX);
                const deltaY = e.movementY || (e.clientY - this.lastMouseY);

                this.yaw -= deltaX * this.mouseSensitivity;
                this.pitch -= deltaY * this.mouseSensitivity;
                this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
            }
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
        });

        this.domElement.addEventListener('wheel', (e) => {
            this.distance += e.deltaY * 0.01;
            this.distance = Math.max(this.minDistance, Math.min(this.maxDistance, this.distance));
        });
    }

    update(deltaTime) {
        if (!this.target) return;

        // Where we want the camera to look at (above player)
        const lookTarget = new THREE.Vector3(
            this.target.position.x,
            this.target.position.y + this.heightOffset,
            this.target.position.z
        );

        // Smooth the look-at target
        this.targetLookAt.lerp(lookTarget, Math.min(1, this.smoothSpeed * deltaTime));

        // Calculate camera position on a sphere around the target
        const offsetX = Math.sin(this.yaw) * Math.cos(this.pitch) * this.distance;
        const offsetY = -Math.sin(this.pitch) * this.distance;
        const offsetZ = Math.cos(this.yaw) * Math.cos(this.pitch) * this.distance;

        const desiredPosition = new THREE.Vector3(
            this.targetLookAt.x + offsetX,
            this.targetLookAt.y + offsetY,
            this.targetLookAt.z + offsetZ
        );

        // Prevent camera from going below terrain
        if (desiredPosition.y < 1) desiredPosition.y = 1;

        // Smooth camera position
        this.currentPosition.lerp(desiredPosition, Math.min(1, this.smoothSpeed * deltaTime));

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.targetLookAt);
    }

    getYaw() {
        return this.yaw;
    }
}
