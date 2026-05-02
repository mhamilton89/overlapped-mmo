import * as THREE from 'three';

// ── Shared helpers ───────────────────────────────────────────────────

function _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.85,
        metalness: opts.metalness ?? 0.0,
        flatShading: true,
        ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 0.3 } : {}),
        ...(opts.transparent ? { transparent: true, opacity: opts.opacity ?? 0.5 } : {})
    });
}

function _box(w, h, d, color, opts) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), _mat(color, opts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function _cylinder(rTop, rBot, h, color, segs = 8, opts) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), _mat(color, opts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function _cone(r, h, color, segs = 8) {
    const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), _mat(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function _sphere(r, color, opts) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), _mat(color, opts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// ── Color palette ────────────────────────────────────────────────────

const BARK_DARK = 0x2a1a0a;
const BARK_MED = 0x3d2a15;
const BARK_PALE = 0xc8bfa8;   // bone tree
const MOSS_GREEN = 0x2a3a1a;
const DEAD_GREEN = 0x3a4a2a;
const MUSHROOM_RED = 0xcc3333;
const MUSHROOM_WHITE = 0xeeeedd;
const MUSHROOM_PURPLE = 0x6633aa;
const ROCK_GRAY = 0x3a3a3a;
const ROCK_DARK = 0x2a2a2a;
const WEB_WHITE = 0xcccccc;
const LOG_BROWN = 0x33220f;

// ── Tree builders ────────────────────────────────────────────────────

function createDeadOak() {
    const group = new THREE.Group();

    // Thick trunk
    const trunk = _cylinder(0.25, 0.4, 4.5, BARK_DARK);
    trunk.position.y = 2.25;
    group.add(trunk);

    // 2-3 bare branches
    const branchCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < branchCount; i++) {
        const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 0.5;
        const branch = _cylinder(0.06, 0.12, 2.0 + Math.random() * 1.5, BARK_MED);
        branch.position.set(
            Math.cos(angle) * 0.5,
            3.0 + Math.random() * 1.0,
            Math.sin(angle) * 0.5
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.2;
        branch.rotation.x = (Math.random() - 0.5) * 0.6;
        group.add(branch);

        // Sub-branch (thinner, shorter)
        if (Math.random() > 0.4) {
            const sub = _cylinder(0.03, 0.05, 1.0 + Math.random() * 0.8, BARK_MED);
            sub.position.set(
                branch.position.x + Math.cos(angle) * 0.8,
                branch.position.y + 0.6,
                branch.position.z + Math.sin(angle) * 0.8
            );
            sub.rotation.z = branch.rotation.z + (Math.random() - 0.5) * 0.8;
            sub.rotation.x = (Math.random() - 0.5) * 0.8;
            group.add(sub);
        }
    }

    // Hanging moss strips (thin green-gray boxes)
    if (Math.random() > 0.5) {
        for (let i = 0; i < 2 + Math.floor(Math.random() * 3); i++) {
            const moss = _box(0.04, 0.6 + Math.random() * 0.4, 0.04, MOSS_GREEN, { roughness: 1.0 });
            moss.position.set(
                (Math.random() - 0.5) * 1.5,
                3.0 + Math.random() * 0.8,
                (Math.random() - 0.5) * 1.5
            );
            group.add(moss);
        }
    }

    return group;
}

function createTwistedWillow() {
    const group = new THREE.Group();

    // Tall thin trunk with lean
    const trunk = _cylinder(0.15, 0.3, 5.5, BARK_DARK);
    trunk.position.y = 2.75;
    trunk.rotation.z = (Math.random() - 0.5) * 0.25; // slight lean
    group.add(trunk);

    // Drooping branches
    for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 + Math.random() * 0.4;
        const branch = _cylinder(0.04, 0.08, 1.8, BARK_MED);
        branch.position.set(
            Math.cos(angle) * 0.4,
            4.5 + Math.random() * 0.5,
            Math.sin(angle) * 0.4
        );
        // Angled outward and downward
        branch.rotation.z = Math.cos(angle) * 0.8;
        branch.rotation.x = Math.sin(angle) * 0.8;
        group.add(branch);

        // Hanging curtain strips
        for (let j = 0; j < 2 + Math.floor(Math.random() * 2); j++) {
            const strip = _box(0.03, 1.2 + Math.random() * 1.0, 0.03, 0x3a4a30, { roughness: 1.0 });
            strip.position.set(
                branch.position.x + Math.cos(angle) * (0.6 + j * 0.2),
                branch.position.y - 0.3,
                branch.position.z + Math.sin(angle) * (0.6 + j * 0.2)
            );
            group.add(strip);
        }
    }

    return group;
}

function createGnarledStump() {
    const group = new THREE.Group();

    // Short wide stump
    const stump = _cylinder(0.35, 0.5, 1.0, 0x1f1508);
    stump.position.y = 0.5;
    group.add(stump);

    // Flat top with slight irregularity
    const top = _cylinder(0.38, 0.35, 0.15, 0x1a1205);
    top.position.y = 1.05;
    group.add(top);

    // Mushrooms on sides
    const mushroomCount = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < mushroomCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const isRed = Math.random() > 0.5;

        // Stem
        const stem = _cylinder(0.03, 0.03, 0.15, MUSHROOM_WHITE);
        stem.position.set(
            Math.cos(angle) * 0.4,
            0.4 + Math.random() * 0.4,
            Math.sin(angle) * 0.4
        );
        group.add(stem);

        // Cap
        const cap = _sphere(0.08, isRed ? MUSHROOM_RED : MUSHROOM_PURPLE, {
            emissive: isRed ? 0x330000 : 0x220044,
            emissiveIntensity: 0.4
        });
        cap.position.set(stem.position.x, stem.position.y + 0.1, stem.position.z);
        cap.scale.y = 0.5; // flatten into cap shape
        group.add(cap);

        // White spots on red mushrooms
        if (isRed && Math.random() > 0.3) {
            const spot = _sphere(0.02, MUSHROOM_WHITE);
            spot.position.set(cap.position.x + 0.03, cap.position.y + 0.03, cap.position.z);
            group.add(spot);
        }
    }

    return group;
}

function createSpookyPine() {
    const group = new THREE.Group();

    // Tall narrow trunk
    const trunk = _cylinder(0.12, 0.2, 6.0, BARK_DARK);
    trunk.position.y = 3.0;
    group.add(trunk);

    // Sparse dark-green cone layers (3-4 with gaps)
    const layers = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < layers; i++) {
        const y = 2.5 + i * 1.3;
        const radius = 0.9 - i * 0.18;
        const coneLayer = _cone(radius, 1.2, DEAD_GREEN);
        coneLayer.position.y = y;
        coneLayer.rotation.y = Math.random() * 0.5; // slight rotation for variety
        group.add(coneLayer);
    }

    // Bare top spike
    const spike = _cylinder(0.02, 0.06, 0.8, BARK_MED);
    spike.position.y = 6.2;
    group.add(spike);

    return group;
}

function createBoneTree() {
    const group = new THREE.Group();

    // Pale white-gray trunk
    const trunk = _cylinder(0.18, 0.28, 4.0, BARK_PALE);
    trunk.position.y = 2.0;
    group.add(trunk);

    // Pale branches
    for (let i = 0; i < 3; i++) {
        const angle = (i / 3) * Math.PI * 2 + Math.random() * 0.5;
        const branch = _cylinder(0.04, 0.08, 1.5 + Math.random(), 0xb8a888);
        branch.position.set(
            Math.cos(angle) * 0.3,
            2.8 + Math.random() * 1.0,
            Math.sin(angle) * 0.3
        );
        branch.rotation.z = (Math.random() - 0.5) * 1.0;
        branch.rotation.x = (Math.random() - 0.5) * 0.5;
        group.add(branch);

        // Thinner sub-branches
        if (Math.random() > 0.3) {
            const twig = _cylinder(0.02, 0.03, 0.8, 0xaaa088);
            twig.position.set(
                branch.position.x + Math.cos(angle) * 0.6,
                branch.position.y + 0.5,
                branch.position.z + Math.sin(angle) * 0.6
            );
            twig.rotation.z = branch.rotation.z + (Math.random() - 0.5) * 0.6;
            group.add(twig);
        }
    }

    return group;
}

// ── Environment objects ──────────────────────────────────────────────

function createFallenLog() {
    const group = new THREE.Group();

    const length = 2.0 + Math.random() * 3.0;
    const log = _cylinder(0.2, 0.25, length, LOG_BROWN, 8);
    log.rotation.z = Math.PI / 2; // lay horizontal
    log.position.y = 0.2;
    group.add(log);

    // Broken end
    const endCap = _cylinder(0.18, 0.22, 0.15, 0x221508);
    endCap.rotation.z = Math.PI / 2;
    endCap.position.set(length / 2, 0.2, 0);
    group.add(endCap);

    return group;
}

function createRockCluster() {
    const group = new THREE.Group();

    const count = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
        const size = 0.3 + Math.random() * 0.5;
        const rock = _box(size, size * 0.7, size * 0.9, i === 0 ? ROCK_GRAY : ROCK_DARK);
        rock.position.set(
            (Math.random() - 0.5) * 1.0,
            size * 0.3,
            (Math.random() - 0.5) * 1.0
        );
        rock.rotation.y = Math.random() * Math.PI;
        rock.rotation.x = (Math.random() - 0.5) * 0.3;
        group.add(rock);
    }

    return group;
}

function createMushroomCluster() {
    const group = new THREE.Group();

    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
        const isPurple = Math.random() > 0.5;
        const capColor = isPurple ? MUSHROOM_PURPLE : MUSHROOM_RED;
        const glowColor = isPurple ? 0x220044 : 0x330000;

        const stem = _cylinder(0.03, 0.04, 0.2 + Math.random() * 0.15, 0xccccaa);
        stem.position.set(
            (Math.random() - 0.5) * 0.6,
            0.1,
            (Math.random() - 0.5) * 0.6
        );
        group.add(stem);

        const cap = _sphere(0.08 + Math.random() * 0.05, capColor, {
            emissive: glowColor,
            emissiveIntensity: 0.5
        });
        cap.position.set(stem.position.x, stem.position.y + 0.15, stem.position.z);
        cap.scale.y = 0.5;
        group.add(cap);
    }

    return group;
}

function createCobweb() {
    const group = new THREE.Group();

    const webGeo = new THREE.PlaneGeometry(2.0, 2.0);
    const webMat = new THREE.MeshBasicMaterial({
        color: WEB_WHITE,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    const web = new THREE.Mesh(webGeo, webMat);
    web.position.y = 2.0 + Math.random() * 1.5;
    web.rotation.y = Math.random() * Math.PI;
    web.rotation.x = (Math.random() - 0.5) * 0.3;
    group.add(web);

    return group;
}

// ── Tree type registry ───────────────────────────────────────────────

const TREE_BUILDERS = [
    { builder: createDeadOak, weight: 40 },
    { builder: createTwistedWillow, weight: 20 },
    { builder: createGnarledStump, weight: 15 },
    { builder: createSpookyPine, weight: 15 },
    { builder: createBoneTree, weight: 10 },
];

const TOTAL_WEIGHT = TREE_BUILDERS.reduce((sum, t) => sum + t.weight, 0);

function pickRandomTreeBuilder() {
    let roll = Math.random() * TOTAL_WEIGHT;
    for (const entry of TREE_BUILDERS) {
        roll -= entry.weight;
        if (roll <= 0) return entry.builder;
    }
    return TREE_BUILDERS[0].builder;
}

// ── Main class ───────────────────────────────────────────────────────

export class ProceduralTrees {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];       // decorative tree meshes (for collision)
        this.objects = [];     // environment objects
    }

    /**
     * Scatter decorative spooky trees across terrain
     */
    scatterTrees(count, terrainSize, exclusionRadius = 15) {
        let placed = 0;
        for (let i = 0; i < count * 1.2; i++) { // overshoot to compensate for exclusion
            if (placed >= count) break;

            const x = (Math.random() - 0.5) * terrainSize * 0.9;
            const z = (Math.random() - 0.5) * terrainSize * 0.9;

            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter < exclusionRadius) continue;

            const builder = pickRandomTreeBuilder();
            const tree = builder();

            tree.position.set(x, 0, z);
            tree.rotation.y = Math.random() * Math.PI * 2;

            // Slight scale variation
            const scaleVar = 0.75 + Math.random() * 0.5;
            tree.scale.set(scaleVar, scaleVar, scaleVar);

            tree.userData = { isTree: true, decorative: true };

            this.scene.add(tree);
            this.trees.push(tree);
            placed++;
        }

        console.log(`[ProceduralTrees] Placed ${placed} spooky trees`);
    }

    /**
     * Scatter environment objects: fallen logs, rocks, mushroom clusters, cobwebs
     */
    scatterEnvironment(terrainSize, spiderCampPositions = []) {
        const halfSize = terrainSize / 2;

        // Fallen logs (35)
        for (let i = 0; i < 35; i++) {
            const log = createFallenLog();
            log.position.set(
                (Math.random() - 0.5) * terrainSize * 0.85,
                0,
                (Math.random() - 0.5) * terrainSize * 0.85
            );
            log.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(log);
            this.objects.push(log);
        }

        // Rock clusters (25)
        for (let i = 0; i < 25; i++) {
            const rocks = createRockCluster();
            rocks.position.set(
                (Math.random() - 0.5) * terrainSize * 0.85,
                0,
                (Math.random() - 0.5) * terrainSize * 0.85
            );
            rocks.rotation.y = Math.random() * Math.PI;
            this.scene.add(rocks);
            this.objects.push(rocks);
        }

        // Mushroom clusters (18) — scattered, often near stumps
        for (let i = 0; i < 18; i++) {
            const mushrooms = createMushroomCluster();
            mushrooms.position.set(
                (Math.random() - 0.5) * terrainSize * 0.8,
                0,
                (Math.random() - 0.5) * terrainSize * 0.8
            );
            this.scene.add(mushrooms);
            this.objects.push(mushrooms);
        }

        // Cobwebs (near spider camp positions, or random if none provided)
        const webPositions = spiderCampPositions.length > 0
            ? spiderCampPositions
            : Array.from({ length: 8 }, () => ({
                x: (Math.random() - 0.5) * terrainSize * 0.6,
                z: (Math.random() - 0.5) * terrainSize * 0.6
            }));

        for (const pos of webPositions) {
            // 2-3 webs per camp
            const webCount = 2 + Math.floor(Math.random() * 2);
            for (let j = 0; j < webCount; j++) {
                const web = createCobweb();
                web.position.set(
                    pos.x + (Math.random() - 0.5) * 4,
                    0,
                    pos.z + (Math.random() - 0.5) * 4
                );
                this.scene.add(web);
                this.objects.push(web);
            }
        }

        console.log(`[ProceduralTrees] Placed ${this.objects.length} environment objects`);
    }
}

// Export individual builders for reuse (e.g., TreeManager gatherable nodes)
export { createDeadOak, createTwistedWillow, createBoneTree, createSpookyPine, createGnarledStump };
