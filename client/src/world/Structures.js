import * as THREE from 'three';

// ── Shared helpers ───────────────────────────────────────────────────

function _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: opts.roughness ?? 0.9,
        metalness: opts.metalness ?? 0.0,
        ...(opts.emissive ? { emissive: opts.emissive, emissiveIntensity: opts.emissiveIntensity ?? 0.5 } : {})
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

function _sphere(r, color, opts) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), _mat(color, opts));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

// ── Colors ───────────────────────────────────────────────────────────

const STONE = 0x4a4a4a;
const DARK_STONE = 0x2a2a2a;
const WOOD = 0x3a2a15;
const DARK_WOOD = 0x251a0a;
const IRON = 0x555555;
const DIRT = 0x3a2a1a;

// ── Gravestone ───────────────────────────────────────────────────────

function createGravestone() {
    const group = new THREE.Group();

    // Main stone slab
    const slab = _box(0.35, 0.8, 0.1, STONE);
    slab.position.y = 0.4;
    // Slight random tilt
    slab.rotation.z = (Math.random() - 0.5) * 0.15;
    slab.rotation.x = (Math.random() - 0.5) * 0.1;
    group.add(slab);

    // Cross on some (50% chance)
    if (Math.random() > 0.5) {
        const crossV = _box(0.06, 0.25, 0.04, DARK_STONE);
        crossV.position.set(0, 0.7, 0.06);
        group.add(crossV);
        const crossH = _box(0.18, 0.05, 0.04, DARK_STONE);
        crossH.position.set(0, 0.75, 0.06);
        group.add(crossH);
    }

    // Dirt mound at base
    const mound = _box(0.5, 0.08, 0.4, DIRT);
    mound.position.set(0, 0.04, 0.15);
    group.add(mound);

    return group;
}

// ── Ruined Wall ──────────────────────────────────────────────────────

function createRuinedWall() {
    const group = new THREE.Group();

    const segCount = 3 + Math.floor(Math.random() * 3);
    const segWidth = 1.2;

    for (let i = 0; i < segCount; i++) {
        const height = 1.0 + Math.random() * 2.0;
        const block = _box(segWidth, height, 0.5, STONE);
        block.position.set(i * segWidth, height / 2, 0);
        // Some blocks tilted for "crumbling" effect
        if (Math.random() > 0.7) {
            block.rotation.z = (Math.random() - 0.5) * 0.15;
        }
        group.add(block);
    }

    // Scattered rubble at base
    for (let i = 0; i < 3; i++) {
        const rubble = _box(0.3, 0.2, 0.3, DARK_STONE);
        rubble.position.set(
            Math.random() * segCount * segWidth,
            0.1,
            0.5 + Math.random() * 0.5
        );
        rubble.rotation.y = Math.random() * Math.PI;
        group.add(rubble);
    }

    return group;
}

// ── Decrepit Chapel ──────────────────────────────────────────────────

function createChapel() {
    const group = new THREE.Group();

    const wallH = 4;
    const wallW = 6;
    const wallD = 0.4;

    // Back wall
    const backWall = _box(wallW, wallH, wallD, STONE);
    backWall.position.set(0, wallH / 2, -3);
    group.add(backWall);

    // Left wall (with window gap)
    const leftWallLower = _box(wallD, wallH * 0.4, 6, STONE);
    leftWallLower.position.set(-wallW / 2, wallH * 0.2, 0);
    group.add(leftWallLower);
    const leftWallUpper = _box(wallD, wallH * 0.3, 6, STONE);
    leftWallUpper.position.set(-wallW / 2, wallH * 0.8, 0);
    group.add(leftWallUpper);

    // Right wall (with window gap)
    const rightWallLower = _box(wallD, wallH * 0.4, 6, STONE);
    rightWallLower.position.set(wallW / 2, wallH * 0.2, 0);
    group.add(rightWallLower);
    const rightWallUpper = _box(wallD, wallH * 0.3, 6, STONE);
    rightWallUpper.position.set(wallW / 2, wallH * 0.8, 0);
    group.add(rightWallUpper);

    // Front wall with doorway (two pillars)
    const frontL = _box(2, wallH, wallD, STONE);
    frontL.position.set(-2, wallH / 2, 3);
    group.add(frontL);
    const frontR = _box(2, wallH, wallD, STONE);
    frontR.position.set(2, wallH / 2, 3);
    group.add(frontR);
    // Lintel above door
    const lintel = _box(2.5, 0.5, wallD, DARK_STONE);
    lintel.position.set(0, wallH * 0.75, 3);
    group.add(lintel);

    // Broken steeple (tilted)
    const steeple = _box(0.6, 3, 0.6, DARK_STONE);
    steeple.position.set(0, wallH + 1.2, -2);
    steeple.rotation.z = 0.15;
    steeple.rotation.x = -0.1;
    group.add(steeple);

    // Broken altar inside
    const altar = _box(1.5, 0.8, 0.8, DARK_STONE);
    altar.position.set(0, 0.4, -1.5);
    group.add(altar);

    // Debris
    for (let i = 0; i < 5; i++) {
        const debris = _box(0.4, 0.2, 0.3, STONE);
        debris.position.set(
            (Math.random() - 0.5) * 4,
            0.1,
            (Math.random() - 0.5) * 4
        );
        debris.rotation.y = Math.random() * Math.PI;
        group.add(debris);
    }

    return group;
}

// ── Witch's Hut ──────────────────────────────────────────────────────

function createWitchHut() {
    const group = new THREE.Group();

    // Walls (4 sides of a small room)
    const wallSize = 2.5;
    const wallH = 2.2;
    const wallT = 0.25;

    const walls = [
        { x: 0, z: -wallSize / 2, w: wallSize, d: wallT },     // back
        { x: 0, z: wallSize / 2, w: wallSize * 0.4, d: wallT }, // front (partial - doorway)
        { x: -wallSize / 2, z: 0, w: wallT, d: wallSize },     // left
        { x: wallSize / 2, z: 0, w: wallT, d: wallSize },      // right
    ];

    for (const w of walls) {
        const wall = _box(w.w, wallH, w.d, DARK_WOOD);
        wall.position.set(w.x, wallH / 2, w.z);
        group.add(wall);
    }

    // Crooked roof (two angled planes)
    const roofL = _box(wallSize * 0.7, 0.15, wallSize + 0.5, DARK_WOOD);
    roofL.position.set(-0.5, wallH + 0.4, 0);
    roofL.rotation.z = 0.6;
    group.add(roofL);
    const roofR = _box(wallSize * 0.7, 0.15, wallSize + 0.5, DARK_WOOD);
    roofR.position.set(0.5, wallH + 0.4, 0);
    roofR.rotation.z = -0.55; // slightly misaligned for "crooked" feel
    group.add(roofR);

    // Cauldron outside (hemisphere shape via squashed sphere)
    const cauldronBody = _sphere(0.4, IRON);
    cauldronBody.scale.y = 0.6;
    cauldronBody.position.set(2.0, 0.25, 1.5);
    group.add(cauldronBody);

    // Green glow inside cauldron
    const glow = _sphere(0.3, 0x00ff33, {
        emissive: 0x00ff33,
        emissiveIntensity: 1.0,
        roughness: 0.3
    });
    glow.position.set(2.0, 0.4, 1.5);
    group.add(glow);

    // Fence posts around hut
    const fenceAngles = [0, 0.8, 1.6, 2.4, 3.2, 4.0, 4.8, 5.6];
    const fenceRadius = 4;
    for (const angle of fenceAngles) {
        const post = _cylinder(0.05, 0.06, 1.2, WOOD);
        const fx = Math.cos(angle) * fenceRadius;
        const fz = Math.sin(angle) * fenceRadius;
        post.position.set(fx, 0.6, fz);
        // Some knocked over
        if (Math.random() > 0.7) {
            post.rotation.z = (Math.random() - 0.5) * 1.5;
            post.position.y = 0.2;
        }
        group.add(post);
    }

    return group;
}

// ── Hanging Cage ─────────────────────────────────────────────────────

function createHangingCage() {
    const group = new THREE.Group();

    // Support beam (horizontal)
    const beam = _cylinder(0.06, 0.06, 2.5, WOOD);
    beam.rotation.z = Math.PI / 2;
    beam.position.set(0, 3.5, 0);
    group.add(beam);

    // Chain (vertical bars)
    const chain = _cylinder(0.02, 0.02, 1.0, IRON);
    chain.position.set(0.8, 3.0, 0);
    group.add(chain);

    // Cage frame (vertical bars in a circle)
    const cageY = 2.0;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const bar = _cylinder(0.02, 0.02, 1.0, IRON);
        bar.position.set(
            0.8 + Math.cos(angle) * 0.3,
            cageY,
            Math.sin(angle) * 0.3
        );
        group.add(bar);
    }

    // Cage top and bottom rings
    const ringTop = _cylinder(0.3, 0.3, 0.04, IRON, 16);
    ringTop.position.set(0.8, cageY + 0.5, 0);
    group.add(ringTop);
    const ringBot = _cylinder(0.3, 0.3, 0.04, IRON, 16);
    ringBot.position.set(0.8, cageY - 0.5, 0);
    group.add(ringBot);

    // Simplified skeleton inside (skull + few bones)
    const skull = _sphere(0.12, 0xe8dcc8);
    skull.position.set(0.8, cageY + 0.1, 0);
    group.add(skull);
    const bone = _cylinder(0.03, 0.03, 0.3, 0xd8cca8);
    bone.position.set(0.8, cageY - 0.2, 0);
    bone.rotation.z = 0.5;
    group.add(bone);

    return group;
}

// ── Lamp Post ────────────────────────────────────────────────────────

function createLampPost(scene) {
    const group = new THREE.Group();

    // Pole
    const pole = _cylinder(0.06, 0.08, 3.0, IRON);
    pole.position.y = 1.5;
    group.add(pole);

    // Base
    const base = _cylinder(0.2, 0.25, 0.15, IRON);
    base.position.y = 0.075;
    group.add(base);

    // Lantern box at top
    const lantern = _box(0.25, 0.3, 0.25, IRON);
    lantern.position.y = 3.15;
    group.add(lantern);

    // Glowing light inside lantern
    const glowMat = new THREE.MeshStandardMaterial({
        color: 0xff8833,
        emissive: 0xff6600,
        emissiveIntensity: 1.5,
        roughness: 0.3
    });
    const glowMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 4), glowMat);
    glowMesh.position.y = 3.15;
    group.add(glowMesh);

    // Warm point light
    const light = new THREE.PointLight(0xff6600, 0.5, 8);
    light.position.y = 3.15;
    group.add(light);

    return group;
}

// ── Main Structures class ────────────────────────────────────────────

export class Structures {
    constructor(scene) {
        this.scene = scene;
        this.meshes = [];
    }

    placeAll() {
        // ── Gravestones (clusters near zombie spawns) ────────────
        const graveyardCenters = [
            { x: 45, z: 45 },   // Near chapel
            { x: -45, z: 40 },
            { x: 40, z: -45 },
            { x: -40, z: -50 },
        ];

        for (const center of graveyardCenters) {
            const count = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < count; i++) {
                const stone = createGravestone();
                stone.position.set(
                    center.x + (Math.random() - 0.5) * 6,
                    0,
                    center.z + (Math.random() - 0.5) * 6
                );
                stone.rotation.y = Math.random() * Math.PI * 2;
                this.scene.add(stone);
                this.meshes.push(stone);
            }
        }

        // A few extra scattered gravestones
        for (let i = 0; i < 5; i++) {
            const stone = createGravestone();
            stone.position.set(
                (Math.random() - 0.5) * 100,
                0,
                (Math.random() - 0.5) * 100
            );
            stone.rotation.y = Math.random() * Math.PI * 2;
            this.scene.add(stone);
            this.meshes.push(stone);
        }

        // ── Ruined Walls ─────────────────────────────────────────
        const wallPositions = [
            { x: 30, z: 15, rot: 0.3 },
            { x: -25, z: 30, rot: 1.2 },
            { x: 35, z: -25, rot: 0.8 },
            { x: -30, z: -35, rot: 2.0 },
            { x: 15, z: 45, rot: 0.5 },
            { x: -40, z: 10, rot: 1.8 },
            { x: 50, z: -15, rot: 0.1 },
            { x: -15, z: -40, rot: 2.5 },
        ];

        for (const pos of wallPositions) {
            const wall = createRuinedWall();
            wall.position.set(pos.x, 0, pos.z);
            wall.rotation.y = pos.rot;
            this.scene.add(wall);
            this.meshes.push(wall);
        }

        // ── Decrepit Chapel (major landmark) ─────────────────────
        const chapel = createChapel();
        chapel.position.set(45, 0, 45);
        chapel.rotation.y = 0.3;
        this.scene.add(chapel);
        this.meshes.push(chapel);

        // ── Witch's Hut ──────────────────────────────────────────
        const hut = createWitchHut();
        hut.position.set(-50, 0, -60);
        hut.rotation.y = 0.8;
        this.scene.add(hut);
        this.meshes.push(hut);

        // ── Hanging Cages (near spider nests) ────────────────────
        const cagePositions = [
            { x: 32, z: 27 },
            { x: -30, z: -28 },
            { x: 27, z: -33 },
        ];

        for (const pos of cagePositions) {
            const cage = createHangingCage();
            cage.position.set(pos.x, 0, pos.z);
            cage.rotation.y = Math.random() * Math.PI;
            this.scene.add(cage);
            this.meshes.push(cage);
        }

        // ── Lamp Posts (along paths between landmarks) ───────────
        const lampPositions = [
            { x: 10, z: 10 },     // Near spawn, toward chapel
            { x: 22, z: 22 },
            { x: 35, z: 35 },
            { x: -10, z: -12 },   // Toward witch hut
            { x: -25, z: -30 },
            { x: -40, z: -48 },
            { x: 15, z: -15 },    // Side path
            { x: -15, z: 20 },
        ];

        for (const pos of lampPositions) {
            const lamp = createLampPost(this.scene);
            lamp.position.set(pos.x, 0, pos.z);
            this.scene.add(lamp);
            this.meshes.push(lamp);
        }

        console.log(`[Structures] Placed ${this.meshes.length} structures`);
    }
}
