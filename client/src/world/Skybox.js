import * as THREE from 'three';

export class Skybox {
    constructor(scene) {
        this.scene = scene;
        this.create();
    }

    create() {
        // Gradient sky using a large sphere
        const skyGeo = new THREE.SphereGeometry(800, 32, 15);

        // Bright daytime sky gradient
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        const gradient = ctx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(0, '#1a6dd4');    // Deep blue at zenith
        gradient.addColorStop(0.3, '#4a9ef5');  // Bright blue
        gradient.addColorStop(0.6, '#87ceeb');  // Sky blue
        gradient.addColorStop(0.85, '#b8ddf0'); // Light blue-white haze
        gradient.addColorStop(1.0, '#ddeef8');  // Pale horizon

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

        // Sun disc
        this.createSun();

        // Also set scene.background as a safety-net: if skybox fails to render
        // for any reason, we at least get a bright sky color instead of black.
        this.scene.background = new THREE.Color(0x87ceeb);

        // No distance fog — keeps colors clear and readable
        // this.scene.fog = new THREE.FogExp2(0xc8e0f0, 0.0025);
    }

    createSun() {
        const sunGeo = new THREE.SphereGeometry(5, 16, 16);
        const sunMat = new THREE.MeshBasicMaterial({
            color: 0xffffcc,
            fog: false
        });
        this.sun = new THREE.Mesh(sunGeo, sunMat);
        this.sun.position.set(200, 400, -100);
        this.scene.add(this.sun);

        // Glow
        const glowGeo = new THREE.SphereGeometry(12, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xffeedd,
            transparent: true,
            opacity: 0.15,
            fog: false
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.copy(this.sun.position);
        this.scene.add(glow);
    }
}
