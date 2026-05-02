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

        // Create procedural dark forest ground texture
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');

        // Base dark brown earth
        ctx.fillStyle = '#2a1f14';
        ctx.fillRect(0, 0, 512, 512);

        // Add noise variation — dead grass, dry mud, dark dirt, withered moss
        const noiseColors = [
            { r: 26, g: 21, b: 8 },    // dark dirt
            { r: 45, g: 58, b: 26 },   // dead olive-green
            { r: 58, g: 42, b: 26 },   // dry mud
            { r: 26, g: 42, b: 21 },   // withered moss
            { r: 35, g: 25, b: 15 },   // dark brown
            { r: 20, g: 15, b: 10 },   // near-black soil
        ];

        for (let i = 0; i < 25000; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            const c = noiseColors[Math.floor(Math.random() * noiseColors.length)];
            const shade = Math.random() * 20 - 10;
            ctx.fillStyle = `rgb(${Math.max(0, c.r + shade)}, ${Math.max(0, c.g + shade)}, ${Math.max(0, c.b + shade)})`;
            ctx.fillRect(x, y, 2 + Math.random() * 3, 2 + Math.random() * 3);
        }

        // Darker patches — dead spots
        for (let i = 0; i < 250; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.fillStyle = `rgba(10, 5, 0, ${0.1 + Math.random() * 0.25})`;
            ctx.beginPath();
            ctx.arc(x, y, 5 + Math.random() * 18, 0, Math.PI * 2);
            ctx.fill();
        }

        // Thin crack lines for dead/cracked earth
        ctx.strokeStyle = 'rgba(5, 3, 0, 0.3)';
        for (let i = 0; i < 80; i++) {
            const x = Math.random() * 512;
            const y = Math.random() * 512;
            ctx.lineWidth = 0.5 + Math.random() * 1.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            // Jagged line with 2-4 segments
            let cx = x, cy = y;
            const segs = 2 + Math.floor(Math.random() * 3);
            for (let s = 0; s < segs; s++) {
                cx += (Math.random() - 0.5) * 30;
                cy += (Math.random() - 0.5) * 30;
                ctx.lineTo(cx, cy);
            }
            ctx.stroke();
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(32, 32);

        const material = new THREE.MeshStandardMaterial({
            map: texture,
            roughness: 0.95,
            metalness: 0.0
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
    }

    getHeightAt(x, z) {
        return 0;
    }
}
