import * as THREE from 'three';

const RANGE = 22;              // how far the bolt reaches along the cast direction
const SEGMENTS = 14;           // main-bolt straight segments
const JITTER = 0.65;           // perpendicular joint displacement
const LIFETIME = 0.38;         // total visible duration
const FLICKER_INTERVAL = 0.05; // path re-roll cadence
const CORE_RADIUS = 0.045;
const GLOW_RADIUS = 0.22;
const FORK_SEGMENTS = 4;
const FORK_LEN_MIN = 2.0;
const FORK_LEN_MAX = 4.5;

const UP = new THREE.Vector3(0, 1, 0);

export class LightningBolt {
    constructor(scene, startPos, direction) {
        this.scene = scene;
        this.age = 0;
        this.flickerTimer = 0;
        this.alive = true;

        const dir = direction.clone().normalize();
        this._origin = startPos.clone();
        this._endpoint = startPos.clone().addScaledVector(dir, RANGE);

        // Two perpendicular axes for lateral displacement at each joint
        const helper = Math.abs(dir.y) > 0.9
            ? new THREE.Vector3(1, 0, 0)
            : new THREE.Vector3(0, 1, 0);
        this._perpA = new THREE.Vector3().crossVectors(dir, helper).normalize();
        this._perpB = new THREE.Vector3().crossVectors(dir, this._perpA).normalize();

        this.group = new THREE.Group();
        scene.add(this.group);

        // Shared materials across all segments — only geometries get rebuilt on flicker
        this.coreMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1.0,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        this.glowMat = new THREE.MeshBasicMaterial({
            color: 0x78b4ff,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });

        // Flash light travels along the strike axis so the whole bolt glows blue
        this.light = new THREE.PointLight(0x78b4ff, 10.0, 16, 2);
        this.light.position.copy(startPos).addScaledVector(dir, 3);
        this.group.add(this.light);

        this.segments = [];
        this._rebuildBolt();
    }

    _clearSegments() {
        for (const m of this.segments) {
            this.group.remove(m);
            m.geometry.dispose();
        }
        this.segments.length = 0;
    }

    _pushSegment(a, b, radius, material) {
        const d = new THREE.Vector3().subVectors(b, a);
        const len = d.length();
        if (len < 1e-4) return;
        const geom = new THREE.CylinderGeometry(radius, radius, len, 6, 1, false);
        const mesh = new THREE.Mesh(geom, material);
        mesh.position.copy(a).lerp(b, 0.5);
        mesh.quaternion.setFromUnitVectors(UP, d.multiplyScalar(1 / len));
        this.group.add(mesh);
        this.segments.push(mesh);
    }

    _pushBranch(points, coreRadius, glowRadius) {
        for (let i = 0; i < points.length - 1; i++) {
            const a = points[i];
            const b = points[i + 1];
            this._pushSegment(a, b, glowRadius, this.glowMat);
            this._pushSegment(a, b, coreRadius, this.coreMat);
        }
    }

    _mainPath() {
        const pts = [this._origin.clone()];
        for (let i = 1; i < SEGMENTS; i++) {
            const t = i / SEGMENTS;
            const p = new THREE.Vector3().lerpVectors(this._origin, this._endpoint, t);
            // Fade jitter at both ends so the bolt actually meets its endpoints
            const edgeFalloff = Math.sin(t * Math.PI);
            const scale = JITTER * edgeFalloff;
            p.addScaledVector(this._perpA, (Math.random() - 0.5) * 2 * scale);
            p.addScaledVector(this._perpB, (Math.random() - 0.5) * 2 * scale);
            pts.push(p);
        }
        pts.push(this._endpoint.clone());
        return pts;
    }

    _forkPath(from) {
        const baseDir = new THREE.Vector3().subVectors(this._endpoint, this._origin).normalize();
        const forkDir = baseDir.clone();
        forkDir.addScaledVector(this._perpA, (Math.random() - 0.5) * 1.6);
        forkDir.addScaledVector(this._perpB, (Math.random() - 0.5) * 1.6);
        forkDir.normalize();
        const forkLen = FORK_LEN_MIN + Math.random() * (FORK_LEN_MAX - FORK_LEN_MIN);
        const pts = [from.clone()];
        for (let i = 1; i <= FORK_SEGMENTS; i++) {
            const t = i / FORK_SEGMENTS;
            const p = from.clone().addScaledVector(forkDir, forkLen * t);
            const scale = JITTER * 0.8 * (1 - t * 0.5);
            p.addScaledVector(this._perpA, (Math.random() - 0.5) * 2 * scale);
            p.addScaledVector(this._perpB, (Math.random() - 0.5) * 2 * scale);
            pts.push(p);
        }
        return pts;
    }

    _rebuildBolt() {
        this._clearSegments();
        const main = this._mainPath();
        this._pushBranch(main, CORE_RADIUS, GLOW_RADIUS);

        // 0-2 forks branching off mid-bolt joints
        const forkCount = Math.random() < 0.85 ? (Math.random() < 0.4 ? 2 : 1) : 0;
        for (let f = 0; f < forkCount; f++) {
            const idx = 2 + Math.floor(Math.random() * Math.max(1, main.length - 4));
            const fork = this._forkPath(main[idx]);
            this._pushBranch(fork, CORE_RADIUS * 0.6, GLOW_RADIUS * 0.55);
        }
    }

    update(deltaTime) {
        if (!this.alive) return false;
        this.age += deltaTime;
        if (this.age >= LIFETIME) {
            this.alive = false;
            return false;
        }

        const t = this.age / LIFETIME;

        this.flickerTimer += deltaTime;
        if (this.flickerTimer >= FLICKER_INTERVAL) {
            this.flickerTimer -= FLICKER_INTERVAL;
            this._rebuildBolt();
        }

        // Hold bright for the first half, then fade out
        const fade = t < 0.5 ? 1.0 : Math.max(0, 1 - (t - 0.5) / 0.5);
        const flash = 0.65 + Math.random() * 0.55;
        this.coreMat.opacity = fade * flash;
        this.glowMat.opacity = 0.8 * fade * flash;
        this.light.intensity = 10.0 * fade * (0.55 + Math.random() * 0.8);

        return true;
    }

    dispose() {
        this._clearSegments();
        this.coreMat.dispose();
        this.glowMat.dispose();
        if (this.group.parent) this.scene.remove(this.group);
    }
}
