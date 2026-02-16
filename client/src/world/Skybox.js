import * as THREE from 'three';

export class Skybox {
    constructor(scene) {
        this.scene = scene;
        this.create();
    }

    create() {
        // Gradient sky using a large sphere
        const skyGeo = new THREE.SphereGeometry(400, 32, 15);

        // Create gradient texture
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#1a3a5c');    // Deep blue at top
        gradient.addColorStop(0.3, '#4a90c4');  // Medium blue
        gradient.addColorStop(0.6, '#87CEEB');  // Sky blue
        gradient.addColorStop(0.85, '#b8d8f0'); // Light horizon
        gradient.addColorStop(1.0, '#e8d5a3');  // Warm horizon glow

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1, 256);

        const texture = new THREE.CanvasTexture(canvas);

        const skyMat = new THREE.MeshBasicMaterial({
            map: texture,
            side: THREE.BackSide,
            fog: false
        });

        this.mesh = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(this.mesh);

        // Add fog for distance fade
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.004);
    }
}
