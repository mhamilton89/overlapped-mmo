import * as THREE from 'three';

const SPEED = 18;
const MAX_LIFETIME = 2.5;
const MAX_DISTANCE = 40;
const TRAIL_SPAWN_INTERVAL = 0.02;     // seconds between ember spawns
const TRAIL_LIFE = 0.55;               // base ember lifetime
const TRAIL_JITTER = 0.18;              // position jitter at spawn

// One shared canvas texture for all ember sprites. Lazily built on first use.
let SPARK_TEXTURE = null;
function getSparkTexture() {
    if (SPARK_TEXTURE) return SPARK_TEXTURE;
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0.0, 'rgba(255, 255, 220, 1.0)');
    g.addColorStop(0.25, 'rgba(255, 200, 120, 0.95)');
    g.addColorStop(0.55, 'rgba(255, 110, 40, 0.55)');
    g.addColorStop(1.0, 'rgba(80, 20, 0, 0.0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    SPARK_TEXTURE = new THREE.CanvasTexture(canvas);
    SPARK_TEXTURE.colorSpace = THREE.SRGBColorSpace;
    return SPARK_TEXTURE;
}

export class Fireball {
    constructor(scene, startPos, direction) {
        this.scene = scene;
        const dir = direction.clone().normalize();
        this.velocity = dir.clone().multiplyScalar(SPEED);
        this.age = 0;
        this.distanceTravelled = 0;
        this.alive = true;

        // Root group holding core + shell. Oriented so +Z local = flight direction,
        // which means the tail (stretched shell) extends into -Z local = behind.
        this.mesh = new THREE.Group();
        this.mesh.position.copy(startPos);
        this.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);

        // Core: small, nearly-white, very hot. Emissive so bloom picks it up strong.
        const coreMat = new THREE.MeshStandardMaterial({
            color: 0xfff1b5,
            emissive: 0xffd27a,
            emissiveIntensity: 4.0,
            roughness: 0.2,
            metalness: 0.0,
        });
        this.core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), coreMat);
        this.mesh.add(this.core);

        // Outer shell: additive orange glow, stretched into a teardrop behind the core
        const shellMat = new THREE.MeshBasicMaterial({
            color: 0xff7a28,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.shell = new THREE.Mesh(new THREE.SphereGeometry(0.45, 14, 10), shellMat);
        this.shell.scale.set(1, 1, 2.2);   // stretch along local Z
        this.shell.position.z = -0.35;     // shift tail backward (behind core)
        this.mesh.add(this.shell);

        this.light = new THREE.PointLight(0xff7a2a, 3.2, 10, 2);
        this.mesh.add(this.light);

        scene.add(this.mesh);

        // Trail particles
        this.sparkTexture = getSparkTexture();
        this.trail = [];
        this.trailTimer = 0;

        // Track last position so we can scatter trail embers along the traveled segment
        this._lastPos = startPos.clone();
    }

    _spawnEmber(pos) {
        const mat = new THREE.SpriteMaterial({
            map: this.sparkTexture,
            color: 0xffc060,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        const sprite = new THREE.Sprite(mat);
        sprite.position.copy(pos);
        sprite.position.x += (Math.random() - 0.5) * TRAIL_JITTER;
        sprite.position.y += (Math.random() - 0.5) * TRAIL_JITTER;
        sprite.position.z += (Math.random() - 0.5) * TRAIL_JITTER;

        const scale = 0.55 + Math.random() * 0.35;
        sprite.scale.set(scale, scale, scale);
        this.scene.add(sprite);

        this.trail.push({
            sprite,
            life: 0,
            maxLife: TRAIL_LIFE * (0.75 + Math.random() * 0.5),
            baseScale: scale,
            riseSpeed: 0.6 + Math.random() * 0.9,
        });
    }

    _updateTrail(deltaTime, currentPos) {
        // Spawn new embers along the segment we just traveled (dense at high speed)
        if (this.alive) {
            this.trailTimer += deltaTime;
            while (this.trailTimer >= TRAIL_SPAWN_INTERVAL) {
                this.trailTimer -= TRAIL_SPAWN_INTERVAL;
                // Interpolate between last and current pos for nice coverage
                const f = this.trailTimer / Math.max(deltaTime, 0.0001);
                const p = new THREE.Vector3().lerpVectors(this._lastPos, currentPos, 1 - f);
                this._spawnEmber(p);
            }
        }

        for (let i = this.trail.length - 1; i >= 0; i--) {
            const e = this.trail[i];
            e.life += deltaTime;
            const t = e.life / e.maxLife;
            if (t >= 1) {
                this.scene.remove(e.sprite);
                e.sprite.material.dispose();
                this.trail.splice(i, 1);
                continue;
            }

            const shrink = 1 - t * 0.6;
            const s = e.baseScale * shrink;
            e.sprite.scale.set(s, s, s);

            // Fade out, with a quick ramp-up at birth to avoid hard pop
            const birth = Math.min(1, t * 8);
            e.sprite.material.opacity = 0.95 * birth * (1 - t * t);

            // Rise like hot air (slower as it cools)
            e.sprite.position.y += e.riseSpeed * deltaTime * (1 - t * 0.7);

            // Color cools over lifetime: pale yellow → orange → deep red
            const col = e.sprite.material.color;
            if (t < 0.25) col.setHex(0xffe6a0);
            else if (t < 0.55) col.setHex(0xff9840);
            else if (t < 0.8) col.setHex(0xd04818);
            else col.setHex(0x6a1a08);
        }
    }

    update(deltaTime) {
        if (this.alive) {
            this.age += deltaTime;
            const step = this.velocity.clone().multiplyScalar(deltaTime);
            this._lastPos.copy(this.mesh.position);
            this.mesh.position.add(step);
            this.distanceTravelled += step.length();

            // Flicker core/shell/light so it feels alive
            const flicker = 0.85 + Math.random() * 0.3;
            this.light.intensity = 3.2 * flicker;
            this.core.material.emissiveIntensity = 4.0 * flicker;
            const breathe = 1 + Math.sin(this.age * 40) * 0.06;
            this.shell.scale.set(breathe, breathe, 2.2 * breathe);

            this._updateTrail(deltaTime, this.mesh.position);

            if (this.age >= MAX_LIFETIME || this.distanceTravelled >= MAX_DISTANCE) {
                this.alive = false;
                this.scene.remove(this.mesh);
            }
            return true;
        }

        // Projectile has ended — let the trail finish dissipating before we die
        this._updateTrail(deltaTime, this._lastPos);
        return this.trail.length > 0;
    }

    dispose() {
        if (this.mesh.parent) this.scene.remove(this.mesh);
        this.core.geometry.dispose();
        this.core.material.dispose();
        this.shell.geometry.dispose();
        this.shell.material.dispose();
        for (const e of this.trail) {
            this.scene.remove(e.sprite);
            e.sprite.material.dispose();
        }
        this.trail.length = 0;
    }
}
