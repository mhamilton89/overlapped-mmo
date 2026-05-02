import * as THREE from 'three';

const GRASS_BLOCK_ID = 3;
const SCATTER_RADIUS = 48;
const COUNT = 2000;
const FADE_START = 36;
const FADE_END = 52;
const TUFT_SCALE = 0.5;
const RESPAWNS_PER_FRAME = 80;
const SEARCH_Y_MAX = 40;
const SEARCH_Y_MIN = 0;

function makeTuftTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    const blades = [
        { x: 0.30, w: 0.10, h: 0.90, tilt: -0.06 },
        { x: 0.48, w: 0.12, h: 1.00, tilt: 0.00 },
        { x: 0.66, w: 0.10, h: 0.85, tilt: 0.07 },
        { x: 0.18, w: 0.08, h: 0.60, tilt: -0.10 },
        { x: 0.78, w: 0.08, h: 0.65, tilt: 0.10 },
    ];

    for (const b of blades) {
        const baseX = b.x * size;
        const tipX = baseX + b.tilt * size;
        const halfW = (b.w * size) * 0.5;
        const baseY = size;
        const tipY = size * (1 - b.h);

        const g = ctx.createLinearGradient(0, baseY, 0, tipY);
        g.addColorStop(0, '#2a6a20');
        g.addColorStop(0.6, '#4da336');
        g.addColorStop(1, '#8ed85a');
        ctx.fillStyle = g;

        ctx.beginPath();
        ctx.moveTo(baseX - halfW, baseY);
        ctx.quadraticCurveTo(baseX, (baseY + tipY) * 0.5, tipX, tipY);
        ctx.quadraticCurveTo(baseX, (baseY + tipY) * 0.5, baseX + halfW, baseY);
        ctx.closePath();
        ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = 4;
    return tex;
}

export class GrassBillboards {
    constructor(scene, chunkManager) {
        this.scene = scene;
        this.chunkManager = chunkManager;

        this.texture = makeTuftTexture();

        const geo = new THREE.PlaneGeometry(1, 1);
        geo.translate(0, 0.5, 0);

        this.uniforms = {
            uTime: { value: 0 },
            uMap: { value: this.texture },
            uFadeStart: { value: FADE_START },
            uFadeEnd: { value: FADE_END },
            uCamPos: { value: new THREE.Vector3() },
        };

        const mat = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            vertexShader: /* glsl */`
                uniform float uTime;
                attribute float aSeed;
                varying vec2 vUv;
                varying float vFade;
                uniform float uFadeStart;
                uniform float uFadeEnd;
                uniform vec3 uCamPos;

                void main() {
                    vUv = uv;
                    vec4 worldPos = instanceMatrix * vec4(position, 1.0);
                    // Sway only the upper portion of the quad (uv.y)
                    float sway = sin(uTime * 1.6 + aSeed * 6.28) * 0.08 * uv.y;
                    worldPos.x += sway;
                    worldPos.z += sway * 0.5;

                    vec4 mv = modelViewMatrix * worldPos;
                    gl_Position = projectionMatrix * mv;

                    float d = distance(uCamPos, worldPos.xyz);
                    vFade = 1.0 - smoothstep(uFadeStart, uFadeEnd, d);
                }
            `,
            fragmentShader: /* glsl */`
                uniform sampler2D uMap;
                varying vec2 vUv;
                varying float vFade;
                void main() {
                    vec4 c = texture2D(uMap, vUv);
                    float a = c.a * vFade;
                    if (a < 0.15) discard;
                    gl_FragColor = vec4(c.rgb, a);
                }
            `,
        });

        this.mesh = new THREE.InstancedMesh(geo, mat, COUNT);
        this.mesh.frustumCulled = false;
        this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const seeds = new Float32Array(COUNT);
        for (let i = 0; i < COUNT; i++) seeds[i] = Math.random();
        geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(seeds, 1));

        scene.add(this.mesh);

        // Persistent tuft pool: each slot holds a world-position sample, and
        // only slots that drift outside SCATTER_RADIUS around the player get
        // respawned. This avoids wholesale re-shuffle pop-in as the player moves.
        this._tufts = new Array(COUNT);
        for (let i = 0; i < COUNT; i++) {
            this._tufts[i] = { x: 0, y: -9999, z: 0, valid: false };
        }

        this._dummy = new THREE.Object3D();
        this.mesh.count = COUNT;

        // Park every instance off-screen until its first valid spawn
        const parkMat = new THREE.Matrix4().makeTranslation(0, -9999, 0).scale(
            new THREE.Vector3(0, 0, 0)
        );
        for (let i = 0; i < COUNT; i++) this.mesh.setMatrixAt(i, parkMat);
        this.mesh.instanceMatrix.needsUpdate = true;

        this._cursor = 0;
    }

    _findGrassTopY(wx, wz) {
        const ix = Math.floor(wx);
        const iz = Math.floor(wz);
        for (let y = SEARCH_Y_MAX; y >= SEARCH_Y_MIN; y--) {
            const id = this.chunkManager.getBlock(ix, y, iz);
            if (id === GRASS_BLOCK_ID) return y + 1;
            if (id !== 0 && id !== GRASS_BLOCK_ID) return null;
        }
        return null;
    }

    _respawnSlot(i, playerPos) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * SCATTER_RADIUS;
        const wx = playerPos.x + Math.cos(a) * r;
        const wz = playerPos.z + Math.sin(a) * r;
        const topY = this._findGrassTopY(wx, wz);

        const t = this._tufts[i];
        if (topY == null) {
            t.valid = false;
            t.x = 0; t.y = -9999; t.z = 0;
            this._dummy.position.set(0, -9999, 0);
            this._dummy.scale.set(0, 0, 0);
            this._dummy.rotation.set(0, 0, 0);
            this._dummy.updateMatrix();
            this.mesh.setMatrixAt(i, this._dummy.matrix);
            return;
        }
        const jx = (Math.random() - 0.5) * 0.9;
        const jz = (Math.random() - 0.5) * 0.9;
        t.x = wx + jx;
        t.y = topY;
        t.z = wz + jz;
        t.valid = true;

        const s = TUFT_SCALE * (0.8 + Math.random() * 0.5);
        this._dummy.position.set(t.x, t.y, t.z);
        this._dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
        this._dummy.scale.set(s, s, s);
        this._dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this._dummy.matrix);
    }

    update(playerPos, cameraPos, timeSeconds) {
        this.uniforms.uTime.value = timeSeconds;
        this.uniforms.uCamPos.value.copy(cameraPos);

        const maxR2 = SCATTER_RADIUS * SCATTER_RADIUS;
        let budget = RESPAWNS_PER_FRAME;
        let dirty = false;

        // Sweep-scan the pool, respawning slots that are invalid or out-of-range.
        // Cursor persists across frames so we cover every slot over time even
        // if budget is exhausted.
        for (let step = 0; step < COUNT && budget > 0; step++) {
            const i = this._cursor;
            this._cursor = (this._cursor + 1) % COUNT;

            const t = this._tufts[i];
            const dx = t.x - playerPos.x;
            const dz = t.z - playerPos.z;
            const outOfRange = !t.valid || (dx * dx + dz * dz > maxR2);
            if (!outOfRange) continue;

            this._respawnSlot(i, playerPos);
            budget--;
            dirty = true;
        }

        if (dirty) this.mesh.instanceMatrix.needsUpdate = true;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.texture.dispose();
    }
}
