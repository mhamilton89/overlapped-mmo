import * as THREE from 'three';

export class Terrain {
    constructor(scene) {
        this.scene = scene;
        this.size = 512;
        this.mesh = null;
        this.create();
    }

    create() {
        const geometry = new THREE.PlaneGeometry(this.size, this.size, 128, 128);

        // Create procedural grass texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Base green
        ctx.fillStyle = '#3d7a2a';
        ctx.fillRect(0, 0, 512, 512);

        // Add noise variation for natural look
        for (let i = 0; i < 20000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const shade = Math.random() * 40 - 20;
            const r = 61 + shade;
            const g = 122 + shade;
            const b = 42 + shade;
            ctx.fillStyle = `rgb(${Math.max(0, r)}, ${Math.max(0, g)}, ${Math.max(0, b)})`;
            ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
        }

        // Add some darker patches
        for (let i = 0; i < 200; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.fillStyle = `rgba(20, 60, 15, ${Math.random() * 0.3})`;
            ctx.beginPath();
            ctx.arc(x, y, 5 + Math.random() * 15, 0, Math.PI * 2);
            ctx.fill();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(32, 32);

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.9,
            metalness: 0.0
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
    }

    getHeightAt(x, z) {
        // Flat terrain for now; return 0
        // Future: sample heightmap for terrain height
        return 0;
    }
}
