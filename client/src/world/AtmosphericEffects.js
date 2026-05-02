import * as THREE from 'three';

/**
 * Light atmospheric particles for the daytime world editor.
 */
export class AtmosphericEffects {
    constructor(scene) {
        this.scene = scene;
        this.systems = [];
        this.radius = 60;

        this.createDustMotes();
    }

    createDustMotes() {
        const count = 40;
        const positions = new Float32Array(count * 3);
        const state = new Float32Array(count * 3); // speed, swayPhase, swayAmp

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * this.radius * 2;
            positions[i * 3 + 1] = 22 + Math.random() * 8;
            positions[i * 3 + 2] = (Math.random() - 0.5) * this.radius * 2;

            state[i * 3] = 0.1 + Math.random() * 0.2;
            state[i * 3 + 1] = Math.random() * Math.PI * 2;
            state[i * 3 + 2] = 0.2 + Math.random() * 0.4;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.06,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
            sizeAttenuation: true
        });

        const points = new THREE.Points(geometry, material);
        this.scene.add(points);

        this.systems.push({
            type: 'dustMotes',
            points,
            state,
            count,
            time: 0
        });
    }

    update(deltaTime, playerPosition) {
        const px = playerPosition.x;
        const pz = playerPosition.z;

        for (const sys of this.systems) {
            sys.time += deltaTime;
            const posAttr = sys.points.geometry.getAttribute('position');
            const positions = posAttr.array;

            for (let i = 0; i < sys.count; i++) {
                const speed = sys.state[i * 3];
                const swayPhase = sys.state[i * 3 + 1];
                const swayAmp = sys.state[i * 3 + 2];

                positions[i * 3 + 1] += speed * deltaTime;
                positions[i * 3] += Math.sin(sys.time * 0.8 + swayPhase) * swayAmp * deltaTime;
                positions[i * 3 + 2] += Math.cos(sys.time * 0.6 + swayPhase) * swayAmp * deltaTime * 0.5;

                if (positions[i * 3 + 1] > 35) {
                    positions[i * 3 + 1] = 22;
                    positions[i * 3] = px + (Math.random() - 0.5) * this.radius * 2;
                    positions[i * 3 + 2] = pz + (Math.random() - 0.5) * this.radius * 2;
                }

                // Recycle far particles
                const dx = positions[i * 3] - px;
                const dz = positions[i * 3 + 2] - pz;
                if (dx * dx + dz * dz > this.radius * this.radius) {
                    const angle = Math.random() * Math.PI * 2;
                    const r = this.radius * (0.3 + Math.random() * 0.7);
                    positions[i * 3] = px + Math.cos(angle) * r;
                    positions[i * 3 + 1] = 22 + Math.random() * 8;
                    positions[i * 3 + 2] = pz + Math.sin(angle) * r;
                }
            }

            posAttr.needsUpdate = true;
        }
    }
}
