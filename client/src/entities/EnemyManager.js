import * as THREE from 'three';

// ── Procedural model builders ──────────────────────────────────────

function _mat(color) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
}

function _box(w, h, d, color) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), _mat(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function _cylinder(rTop, rBot, h, color, segs = 8) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, segs), _mat(color));
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

function _sphere(r, color, wSegs = 8, hSegs = 6) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, wSegs, hSegs), _mat(color));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
}

function createWolf() {
    const group = new THREE.Group();
    const GRAY = 0x666666;
    const DARK = 0x444444;
    const LIGHT = 0x999999;
    const BLACK = 0x222222;
    const WHITE = 0xcccccc;

    // Body
    const body = _box(0.7, 0.6, 1.4, GRAY);
    body.position.set(0, 0.7, 0);
    group.add(body);

    // Head
    const head = _box(0.5, 0.5, 0.5, DARK);
    head.position.set(0, 0.95, 0.85);
    group.add(head);

    // Snout
    const snout = _box(0.25, 0.2, 0.35, LIGHT);
    snout.position.set(0, 0.85, 1.2);
    group.add(snout);

    // Nose
    const nose = _box(0.1, 0.08, 0.05, BLACK);
    nose.position.set(0, 0.88, 1.4);
    group.add(nose);

    // Eyes
    const eyeL = _sphere(0.06, WHITE);
    eyeL.position.set(0.18, 1.02, 1.05);
    group.add(eyeL);
    const pupilL = _sphere(0.035, BLACK);
    pupilL.position.set(0.18, 1.02, 1.08);
    group.add(pupilL);
    const eyeR = _sphere(0.06, WHITE);
    eyeR.position.set(-0.18, 1.02, 1.05);
    group.add(eyeR);
    const pupilR = _sphere(0.035, BLACK);
    pupilR.position.set(-0.18, 1.02, 1.08);
    group.add(pupilR);

    // Ears
    const earL = _cone(0.1, 0.25, DARK);
    earL.position.set(0.18, 1.35, 0.8);
    group.add(earL);
    const earR = _cone(0.1, 0.25, DARK);
    earR.position.set(-0.18, 1.35, 0.8);
    group.add(earR);

    // Legs (front)
    const legFL = _cylinder(0.08, 0.07, 0.55, GRAY);
    legFL.position.set(0.22, 0.28, 0.45);
    group.add(legFL);
    const legFR = _cylinder(0.08, 0.07, 0.55, GRAY);
    legFR.position.set(-0.22, 0.28, 0.45);
    group.add(legFR);

    // Legs (back)
    const legBL = _cylinder(0.09, 0.07, 0.55, GRAY);
    legBL.position.set(0.22, 0.28, -0.45);
    group.add(legBL);
    const legBR = _cylinder(0.09, 0.07, 0.55, GRAY);
    legBR.position.set(-0.22, 0.28, -0.45);
    group.add(legBR);

    // Tail
    const tail = _cylinder(0.06, 0.03, 0.6, DARK);
    tail.position.set(0, 0.85, -0.85);
    tail.rotation.x = -0.6;
    group.add(tail);

    return group;
}

function createBoar() {
    const group = new THREE.Group();
    const BROWN = 0x5c3a1e;
    const DARK_BROWN = 0x3d2512;
    const LIGHT = 0x8b6b4a;
    const BLACK = 0x222222;
    const IVORY = 0xeeddcc;

    // Body (wider, stockier than wolf)
    const body = _box(0.85, 0.65, 1.2, BROWN);
    body.position.set(0, 0.65, 0);
    group.add(body);

    // Belly
    const belly = _box(0.75, 0.3, 1.0, LIGHT);
    belly.position.set(0, 0.42, 0);
    group.add(belly);

    // Head
    const head = _box(0.55, 0.5, 0.45, DARK_BROWN);
    head.position.set(0, 0.75, 0.75);
    group.add(head);

    // Snout (flat and wide)
    const snout = _cylinder(0.15, 0.18, 0.2, LIGHT, 8);
    snout.position.set(0, 0.65, 1.05);
    snout.rotation.x = Math.PI / 2;
    group.add(snout);

    // Nostrils
    const nostrilL = _sphere(0.04, BLACK);
    nostrilL.position.set(0.06, 0.67, 1.16);
    group.add(nostrilL);
    const nostrilR = _sphere(0.04, BLACK);
    nostrilR.position.set(-0.06, 0.67, 1.16);
    group.add(nostrilR);

    // Eyes (small, beady)
    const eyeL = _sphere(0.05, BLACK);
    eyeL.position.set(0.22, 0.85, 0.9);
    group.add(eyeL);
    const eyeR = _sphere(0.05, BLACK);
    eyeR.position.set(-0.22, 0.85, 0.9);
    group.add(eyeR);

    // Ears (small, floppy)
    const earL = _box(0.12, 0.15, 0.08, DARK_BROWN);
    earL.position.set(0.22, 1.05, 0.7);
    earL.rotation.z = 0.3;
    group.add(earL);
    const earR = _box(0.12, 0.15, 0.08, DARK_BROWN);
    earR.position.set(-0.22, 1.05, 0.7);
    earR.rotation.z = -0.3;
    group.add(earR);

    // Tusks
    const tuskL = _cone(0.03, 0.18, IVORY);
    tuskL.position.set(0.15, 0.6, 1.05);
    tuskL.rotation.z = -0.4;
    tuskL.rotation.x = -0.2;
    group.add(tuskL);
    const tuskR = _cone(0.03, 0.18, IVORY);
    tuskR.position.set(-0.15, 0.6, 1.05);
    tuskR.rotation.z = 0.4;
    tuskR.rotation.x = -0.2;
    group.add(tuskR);

    // Legs (short and thick)
    const legFL = _cylinder(0.1, 0.08, 0.4, DARK_BROWN);
    legFL.position.set(0.28, 0.2, 0.35);
    group.add(legFL);
    const legFR = _cylinder(0.1, 0.08, 0.4, DARK_BROWN);
    legFR.position.set(-0.28, 0.2, 0.35);
    group.add(legFR);
    const legBL = _cylinder(0.1, 0.08, 0.4, DARK_BROWN);
    legBL.position.set(0.28, 0.2, -0.35);
    group.add(legBL);
    const legBR = _cylinder(0.1, 0.08, 0.4, DARK_BROWN);
    legBR.position.set(-0.28, 0.2, -0.35);
    group.add(legBR);

    // Short curly tail
    const tail = _sphere(0.06, BROWN);
    tail.position.set(0, 0.75, -0.65);
    group.add(tail);

    return group;
}

const MODEL_BUILDERS = {
    forest_wolf: createWolf,
    forest_boar: createBoar,
};

// ── EnemyManager ───────────────────────────────────────────────────

export class EnemyManager {
    constructor(scene) {
        this.scene = scene;
        this.enemies = new Map();
        this.lootDrops = [];        // Ground loot bags
        this.onLootPickup = null;   // Callback: (lootItems) => {}
    }

    async init(onProgress) {
        // No async loading needed — models are procedural
        if (onProgress) onProgress(1.0);
        console.log(`[EnemyManager] Procedural models ready (${Object.keys(MODEL_BUILDERS).length} types)`);
    }

    _createModel(key) {
        const builder = MODEL_BUILDERS[key];
        if (builder) return builder();

        // Fallback placeholder box
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x885533 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        return mesh;
    }

    applyUpdates(enemies) {
        const seen = new Set();
        let spawned = 0;
        for (const data of enemies) {
            seen.add(data.id);
            if (this.enemies.has(data.id)) {
                this.updateExisting(data);
            } else {
                this.spawnEnemy(data);
                spawned++;
            }
        }
        if (spawned > 0) {
            console.log(`[EnemyManager] Spawned ${spawned} enemies, total: ${this.enemies.size}`);
        }
    }

    spawnEnemy(data) {
        const templateKey = data.key || this._guessKey(data.id);
        const mesh = this._createModel(templateKey);

        mesh.position.set(data.x, 0, data.y);
        mesh.userData.enemyId = data.id;
        mesh.userData.isEnemy = true;

        this.scene.add(mesh);

        const healthBar = this._createHealthBar(data);
        mesh.add(healthBar);

        const nameplate = this._createNameplate(data.name, data.level);
        mesh.add(nameplate);

        this.enemies.set(data.id, {
            mesh,
            data: { ...data },
            targetPos: new THREE.Vector3(data.x, 0, data.y),
            healthBar,
            nameplate,
            dying: false,
            deathTimer: 0,
            aiState: 'idle',
            aiTimer: 0,
            attackTimer: 0,
            spawnX: data.x,
            spawnY: data.y,
            wanderTarget: null,
            moveSpeed: data.moveSpeed || 2.5,
            damage: data.damage || 6,
            attackSpeed: data.attackSpeed || 2.0,
            // Attack animation state
            attackAnim: null, // { elapsed, duration, lungeX, lungeZ, phase }
            lungeOffset: { x: 0, z: 0 }, // current visual offset from lunge
        });
    }

    _guessKey(enemyId) {
        const parts = enemyId.split('_');
        parts.pop();
        return parts.join('_');
    }

    _createHealthBar(data) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 16;
        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2, 0.3, 1);
        sprite.position.y = 2.0;
        sprite.userData.canvas = canvas;
        sprite.userData.texture = texture;
        this.drawHealthBar(sprite, data.hp, data.maxHp);
        return sprite;
    }

    drawHealthBar(sprite, hp, maxHp) {
        const canvas = sprite.userData.canvas;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, 128, 16);

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, 128, 16);

        const pct = Math.max(0, hp / maxHp);
        ctx.fillStyle = pct > 0.5 ? '#44cc44' : pct > 0.25 ? '#cccc44' : '#cc4444';
        ctx.fillRect(2, 2, 124 * pct, 12);

        sprite.userData.texture.needsUpdate = true;
    }

    _createNameplate(name, level) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');

        ctx.font = 'bold 20px Arial';
        ctx.fillStyle = '#ff6666';
        ctx.textAlign = 'center';
        ctx.fillText(`[${level}] ${name}`, 128, 30);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(3, 0.6, 1);
        sprite.position.y = 2.4;
        return sprite;
    }

    updateExisting(data) {
        const entry = this.enemies.get(data.id);
        if (!entry || entry.dying) return;
        entry.targetPos.set(data.x, 0, data.y);
        entry.data.hp = data.hp;
        entry.data.maxHp = data.maxHp;
        entry.data.state = data.state;
        this.drawHealthBar(entry.healthBar, data.hp, data.maxHp);
    }

    handleEnemyDied(enemyId) {
        const entry = this.enemies.get(enemyId);
        if (!entry) return;
        entry.dying = true;
        entry.deathTimer = 0;
        entry.deathPhase = 'falling'; // falling → corpse → removing

        // Hide health bar and nameplate
        entry.healthBar.visible = false;
        entry.nameplate.visible = false;
        // Loot is created via createServerLoot() when server sends lootSpawn
    }

    handleEnemyRespawned(data) {
        this.removeEnemy(data.id);
        this.spawnEnemy(data);
    }

    removeEnemy(enemyId) {
        const entry = this.enemies.get(enemyId);
        if (!entry) return;
        this.scene.remove(entry.mesh);
        this.enemies.delete(enemyId);
    }

    // ── Loot System ────────────────────────────────────────────────

    _dropLoot(entry) {
        const data = entry.data;
        const items = [];

        // Always drop gold
        const goldMin = data.level * 2;
        const goldMax = data.level * 5;
        const gold = goldMin + Math.floor(Math.random() * (goldMax - goldMin + 1));
        items.push({ key: 'gold_coin', name: 'Gold', quantity: gold, icon: '\u{1FA99}' });

        // Random chance for material drops
        if (data.key === 'forest_wolf' || data.id?.includes('wolf')) {
            if (Math.random() < 0.5) items.push({ key: 'wolf_pelt', name: 'Wolf Pelt', quantity: 1, icon: '\u{1F43E}' });
            if (Math.random() < 0.3) items.push({ key: 'wolf_fang', name: 'Wolf Fang', quantity: 1 + Math.floor(Math.random() * 2), icon: '\u{1F9B7}' });
        } else {
            if (Math.random() < 0.5) items.push({ key: 'boar_hide', name: 'Boar Hide', quantity: 1, icon: '\u{1F9BE}' });
            if (Math.random() < 0.3) items.push({ key: 'boar_tusk', name: 'Boar Tusk', quantity: 1 + Math.floor(Math.random() * 2), icon: '\u{1F9B7}' });
        }
        if (Math.random() < 0.4) items.push({ key: 'leather_scraps', name: 'Leather Scraps', quantity: 1 + Math.floor(Math.random() * 3), icon: '\u{1F9F6}' });

        // Create loot bag mesh on the ground
        const pos = entry.mesh.position.clone();
        pos.y = 0.15;

        const bag = this._createLootBag(pos, items);
        this.scene.add(bag);
        this.lootDrops.push({
            mesh: bag,
            items,
            timer: 0,
            maxTime: 120, // disappear after 2 minutes
        });
    }

    createServerLoot(data) {
        const items = [];

        // Add gold
        if (data.gold > 0) {
            items.push({ key: 'gold_coin', name: 'Gold', quantity: data.gold, icon: '\u{1FA99}' });
        }

        // Add items from server loot table
        const ITEM_NAMES = {
            wolf_pelt: 'Wolf Pelt', wolf_fang: 'Wolf Fang',
            boar_tusk: 'Boar Tusk', boar_hide: 'Boar Hide',
            leather_scraps: 'Leather Scraps',
        };
        const ITEM_ICONS = {
            wolf_pelt: '\u{1F43E}', wolf_fang: '\u{1F9B7}',
            boar_tusk: '\u{1F9B7}', boar_hide: '\u{1F9BE}',
            leather_scraps: '\u{1F9F6}',
        };
        for (const item of (data.items || [])) {
            items.push({
                key: item.itemKey,
                name: ITEM_NAMES[item.itemKey] || item.itemKey,
                quantity: item.quantity,
                icon: ITEM_ICONS[item.itemKey] || '\u{1F4E6}',
            });
        }

        if (items.length === 0) return;

        const pos = new THREE.Vector3(data.x, 0.15, data.y);
        const bag = this._createLootBag(pos, items);
        this.scene.add(bag);
        this.lootDrops.push({
            mesh: bag,
            items,
            lootId: data.lootId,
            timer: 0,
            maxTime: 120,
        });
    }

    _createLootBag(position, items) {
        const group = new THREE.Group();

        // Small golden sack
        const sack = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xdaa520, roughness: 0.6 })
        );
        sack.scale.set(1, 0.8, 1);
        sack.position.y = 0.15;
        sack.castShadow = true;
        group.add(sack);

        // Tie at top
        const tie = new THREE.Mesh(
            new THREE.CylinderGeometry(0.06, 0.08, 0.1, 6),
            new THREE.MeshStandardMaterial({ color: 0x8b6914, roughness: 0.5 })
        );
        tie.position.y = 0.32;
        group.add(tie);

        // Sparkle ring to make it noticeable
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.25, 0.4, 16),
            new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.4, side: THREE.DoubleSide })
        );
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.02;
        group.add(ring);

        // Label showing gold amount
        const goldItem = items.find(i => i.key === 'gold_coin');
        if (goldItem) {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 48;
            const ctx = canvas.getContext('2d');
            ctx.font = 'bold 22px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.textAlign = 'center';
            const text = `${goldItem.quantity}g` + (items.length > 1 ? ' +' : '');
            ctx.strokeText(text, 64, 30);
            ctx.fillText(text, 64, 30);

            const texture = new THREE.CanvasTexture(canvas);
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false })
            );
            sprite.scale.set(1.5, 0.5, 1);
            sprite.position.y = 0.7;
            group.add(sprite);
        }

        group.position.copy(position);
        group.userData.isLoot = true;
        group.userData.items = items;

        return group;
    }

    tryPickupLoot(worldPos, pickupRange = 3) {
        for (let i = this.lootDrops.length - 1; i >= 0; i--) {
            const drop = this.lootDrops[i];
            const dx = drop.mesh.position.x - worldPos.x;
            const dz = drop.mesh.position.z - worldPos.z;
            if (Math.sqrt(dx * dx + dz * dz) <= pickupRange) {
                // Pick up this loot
                if (this.onLootPickup) {
                    this.onLootPickup(drop.items);
                }
                this.scene.remove(drop.mesh);
                this.lootDrops.splice(i, 1);
                return true;
            }
        }
        return false;
    }

    getLootMeshes() {
        return this.lootDrops.map(d => {
            const meshes = [];
            d.mesh.traverse(c => { if (c.isMesh) meshes.push(c); });
            return meshes;
        }).flat();
    }

    update(deltaTime) {
        for (const [id, entry] of this.enemies) {
            if (entry.dying) {
                entry.deathTimer += deltaTime;

                if (entry.deathPhase === 'falling') {
                    // Fall over on side over 0.8s
                    const t = Math.min(1, entry.deathTimer / 0.8);
                    entry.mesh.rotation.z = t * (Math.PI / 2);
                    entry.mesh.position.y = -t * 0.15;
                    if (t >= 1) {
                        entry.deathPhase = 'corpse';
                        entry.deathTimer = 0;
                    }
                } else if (entry.deathPhase === 'corpse') {
                    // Stay on ground for 60 seconds, then fade
                    if (entry.deathTimer > 58) {
                        // Fade out over last 2 seconds
                        const fade = (entry.deathTimer - 58) / 2;
                        entry.mesh.traverse((child) => {
                            if (child.isMesh) {
                                if (!child.material._fadedForDeath) {
                                    child.material = child.material.clone();
                                    child.material.transparent = true;
                                    child.material._fadedForDeath = true;
                                }
                                child.material.opacity = 1 - fade;
                            }
                        });
                        if (entry.deathTimer >= 60) {
                            this.removeEnemy(id);
                            continue;
                        }
                    }
                }
            } else {
                // Step 1: Strip previous frame's lunge offset so lerp sees clean position
                entry.mesh.position.x -= entry.lungeOffset.x;
                entry.mesh.position.z -= entry.lungeOffset.z;

                // Step 2: Lerp clean position toward target
                entry.mesh.position.lerp(entry.targetPos, Math.min(1, 8 * deltaTime));

                // Step 3: Face direction
                const dx = entry.targetPos.x - entry.mesh.position.x;
                const dz = entry.targetPos.z - entry.mesh.position.z;
                if (dx * dx + dz * dz > 0.01) {
                    const targetRot = Math.atan2(dx, dz);
                    let diff = targetRot - entry.mesh.rotation.y;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    entry.mesh.rotation.y += diff * Math.min(1, 8 * deltaTime);
                }

                // Step 4: Recalculate lunge offset fresh each frame
                entry.lungeOffset.x = 0;
                entry.lungeOffset.z = 0;
                entry.mesh.rotation.x = 0;

                if (entry.attackAnim) {
                    const anim = entry.attackAnim;
                    anim.elapsed += deltaTime;
                    const halfDur = anim.duration / 2;
                    let offsetT = 0;

                    if (anim.phase === 'lunge') {
                        offsetT = Math.min(1, anim.elapsed / halfDur);
                        if (anim.elapsed >= halfDur) {
                            anim.phase = 'recoil';
                            anim.elapsed = 0;
                        }
                    } else {
                        offsetT = 1 - Math.min(1, anim.elapsed / halfDur);
                        if (anim.elapsed >= halfDur) {
                            entry.attackAnim = null;
                            offsetT = 0;
                        }
                    }

                    entry.lungeOffset.x = anim.lungeX * offsetT;
                    entry.lungeOffset.z = anim.lungeZ * offsetT;
                    entry.mesh.rotation.x = -0.3 * offsetT;
                }

                // Step 5: Apply lunge offset
                entry.mesh.position.x += entry.lungeOffset.x;
                entry.mesh.position.z += entry.lungeOffset.z;
            }
        }

        // Update loot bags (bobbing + timeout)
        for (let i = this.lootDrops.length - 1; i >= 0; i--) {
            const drop = this.lootDrops[i];
            drop.timer += deltaTime;

            // Gentle bob
            drop.mesh.position.y = 0.15 + Math.sin(drop.timer * 2) * 0.05;

            // Remove after timeout
            if (drop.timer >= drop.maxTime) {
                this.scene.remove(drop.mesh);
                this.lootDrops.splice(i, 1);
            }
        }
    }

    /**
     * Trigger a lunge attack animation on an enemy by its ID.
     * Called from Game.js when the server sends a damageDealt event.
     */
    triggerAttackAnim(enemyId, targetX, targetZ) {
        const entry = this.enemies.get(enemyId);
        if (!entry || entry.dying) return;

        const ex = entry.mesh.position.x - entry.lungeOffset.x; // use clean position
        const ez = entry.mesh.position.z - entry.lungeOffset.z;
        const dx = targetX - ex;
        const dz = targetZ - ez;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const lungeAmount = 0.5;
        entry.attackAnim = {
            elapsed: 0,
            duration: 0.3, // 0.15s forward + 0.15s back
            lungeX: (dx / dist) * lungeAmount,
            lungeZ: (dz / dist) * lungeAmount,
            phase: 'lunge',
        };
    }

    getAllMeshes() {
        const meshes = [];
        for (const entry of this.enemies.values()) {
            if (entry.dying) continue;
            meshes.push(entry.mesh); // Push the root group — raycaster uses recursive mode
        }
        return meshes;
    }

    findByMesh(mesh) {
        for (const entry of this.enemies.values()) {
            if (entry.dying) continue;
            let found = false;
            entry.mesh.traverse((child) => {
                if (child === mesh) found = true;
            });
            if (found) return entry;
        }
        return null;
    }

}
