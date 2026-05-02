import * as THREE from 'three';
import { ChunkManager } from './world/blocks/ChunkManager.js';
import { FlatWorldGenerator } from './world/blocks/FlatWorldGenerator.js';
import { Skybox } from './world/Skybox.js';
import { AtmosphericEffects } from './world/AtmosphericEffects.js';
import { EditorSystem } from './editor/EditorSystem.js';
import { Player } from './entities/Player.js';
import { OtherPlayer } from './entities/OtherPlayer.js';
import { InputManager } from './controls/InputManager.js';
import { CameraController } from './controls/CameraController.js';
import { WebSocketClient } from './networking/WebSocketClient.js';
import { EnemyManager } from './entities/EnemyManager.js';
import { createPostFX } from './rendering/PostFX.js';
import { GrassBillboards } from './world/GrassBillboards.js';
import { stampStarterTown } from './world/StarterTown.js';
import { SPELLS, ACTION_BAR } from './combat/Spells.js';

const GATHER_INTERACT_RANGE = 5;

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Modules
        this.chunkManager = null;
        this.terrainGenerator = null;
        this.skybox = null;
        this.player = null;
        this.inputManager = null;
        this.cameraController = null;
        this.wsClient = new WebSocketClient();

        // Multiplayer
        this.otherPlayers = new Map();

        // Game state
        this.characterData = null;
        this.connected = false;

        // Enemies
        this.enemyManager = null;
        this.targetEnemy = null;
        this.isDead = false;
        this.raycaster = new THREE.Raycaster();
        this.mouseVec = new THREE.Vector2();
        this.mousePx = { x: -9999, y: -9999, inside: false };
        this.hoveredEnemyMesh = null;
        this.aimReticleEl = null;
        this.damageNumbers = [];
        this.lastCombatTime = 0;  // timestamp of last combat action
        this.regenCooldown = 3;   // seconds out of combat before regen starts

        // Spell casting
        this.isCasting = false;
        this.castingSpellId = null;
        this.projectiles = [];
        this.castBarEl = null;
        this.castBarFillEl = null;
        this.castBarTextEl = null;

        // Target frame UI
        this.targetFrame = document.getElementById('target-frame');
        this.targetNameEl = document.getElementById('target-name');
        this.targetHealthBar = document.getElementById('target-health-bar');
        this.targetHealthText = document.getElementById('target-health-text');

        // Gathering state
        this.nearestGatherTree = null;
        this.isGathering = false;
        this.gatherElapsed = 0;
        this.gatherDuration = 3;
        this.gatheringTree = null;

        // FPS tracking
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFps = 0;

        // UI elements
        this.loadingScreen = document.getElementById('loading-screen');
        this.loadingBar = document.getElementById('loading-bar');
        this.loadingText = document.getElementById('loading-text');
        this.fpsCounter = document.getElementById('fps-counter');
        this.positionInfo = document.getElementById('position-info');
        this.playerNameEl = document.getElementById('player-name');
        this.healthBar = document.getElementById('health-bar');
        this.healthText = document.getElementById('health-text');
        this.manaBar = document.getElementById('mana-bar');
        this.manaText = document.getElementById('mana-text');

        // Gather UI
        this.gatherProgressEl = document.getElementById('gather-progress');
        this.gatherFillEl = document.getElementById('gather-fill');
        this.gatherTextEl = document.getElementById('gather-text');

        // Tooltip UI
        this.tooltipEl = document.getElementById('tooltip');
        this.tooltipTextEl = document.getElementById('tooltip-text');
        this.tooltipHintEl = document.getElementById('tooltip-hint');

        // Inventory UI
        this.inventoryPanel = document.getElementById('inventory-panel');
        this.inventorySlotsEl = document.getElementById('inventory-slots');
        this.inventoryOpen = false;
        this.inventory = new Map(); // key → { key, name, icon, quantity }

        // Cast bar UI
        this.castBarEl = document.getElementById('cast-bar');
        this.castBarFillEl = document.getElementById('cast-bar-fill');
        this.castBarTextEl = document.getElementById('cast-bar-text');

        // Action bar + digit hotkeys for spells
        this._buildActionBar();
        window.addEventListener('keydown', (e) => {
            if (!e.code.startsWith('Digit')) return;
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            const slot = parseInt(e.code.slice(5), 10);
            const spell = ACTION_BAR[slot - 1];
            if (spell) this.startCast(spell.id);
        });

        // Inventory toggle via bag button and close button
        document.getElementById('bag-button').addEventListener('click', () => this.toggleInventory());
        document.getElementById('inventory-close').addEventListener('click', () => this.toggleInventory(false));

        // B or I key to toggle inventory
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyB' || e.code === 'KeyI') {
                const active = document.activeElement;
                if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
                this.toggleInventory();
            }
        });

        // Wardrobe (custom designed equipment)
        this.wardrobePanel = document.getElementById('wardrobe-panel');
        this.wardrobeListEl = document.getElementById('wardrobe-list');
        this.wardrobeOpen = false;
        this._equippedCustoms = this._loadEquippedCustoms(); // { slot -> customKey }
        document.getElementById('wardrobe-button').addEventListener('click', () => this.toggleWardrobe());
        document.getElementById('wardrobe-close').addEventListener('click', () => this.toggleWardrobe(false));
        window.addEventListener('keydown', (e) => {
            if (e.code !== 'KeyU') return;
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            if (e.ctrlKey || e.altKey || e.metaKey) return;
            this.toggleWardrobe();
        });

        // === RENDER DIAGNOSTICS ===
        // M: cycle material (Basic / Lambert / Standard)
        // L: cycle lighting presets
        // J: dump current render state to console
        // K: toggle fog on/off
        window.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
            if (e.ctrlKey || e.altKey) return;

            if (e.code === 'KeyM' && this.chunkManager) {
                const mode = this.chunkManager.cycleMaterial();
                this._showDiagMsg(`Material: ${mode}`);
            } else if (e.code === 'KeyL') {
                this._cycleLightingPreset();
            } else if (e.code === 'KeyJ') {
                this._dumpRenderState();
            } else if (e.code === 'KeyK') {
                if (this.scene.fog) {
                    this._savedFog = this.scene.fog;
                    this.scene.fog = null;
                    this._showDiagMsg('Fog: OFF');
                } else if (this._savedFog) {
                    this.scene.fog = this._savedFog;
                    this._showDiagMsg('Fog: ON');
                }
            }
        });
    }

    _showDiagMsg(text) {
        let el = document.getElementById('diag-msg');
        if (!el) {
            el = document.createElement('div');
            el.id = 'diag-msg';
            el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.85);color:#fff;padding:12px 20px;font-family:monospace;font-size:16px;border:2px solid #ffd700;border-radius:6px;z-index:9999;pointer-events:none;';
            document.body.appendChild(el);
        }
        el.textContent = text;
        el.style.opacity = '1';
        clearTimeout(this._diagMsgTimer);
        this._diagMsgTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; }, 1500);
    }

    _cycleLightingPreset() {
        this._lightingPreset = ((this._lightingPreset || 0) + 1) % 4;
        const presets = [
            { name: 'default',   amb: 0.5,  hemi: 0.35, sun: 0.85 },
            { name: 'bright',    amb: 0.8,  hemi: 0.5,  sun: 1.2  },
            { name: 'very-bright', amb: 1.0, hemi: 0.7, sun: 1.5 },
            { name: 'flat-max',  amb: 1.5,  hemi: 0.0,  sun: 0.0 },
        ];
        const p = presets[this._lightingPreset];
        if (this.ambientLight) this.ambientLight.intensity = p.amb;
        if (this.hemiLight) this.hemiLight.intensity = p.hemi;
        if (this.sun) this.sun.intensity = p.sun;
        this._showDiagMsg(`Lights: ${p.name} (amb=${p.amb} hemi=${p.hemi} sun=${p.sun})`);
    }

    _dumpRenderState() {
        const r = this.renderer;
        const info = {
            toneMapping: r.toneMapping,
            toneMappingExposure: r.toneMappingExposure,
            outputColorSpace: r.outputColorSpace,
            pixelRatio: r.getPixelRatio(),
            shadowMap: r.shadowMap.enabled,
            sceneBackground: this.scene.background,
            sceneFog: this.scene.fog ? { type: this.scene.fog.constructor.name, color: this.scene.fog.color?.getHexString(), density: this.scene.fog.density } : null,
            lights: {
                ambient: this.ambientLight?.intensity,
                hemi: this.hemiLight?.intensity,
                sun: this.sun?.intensity,
                sunPos: this.sun ? [this.sun.position.x, this.sun.position.y, this.sun.position.z] : null,
            },
            chunkMeshStats: this.chunkManager?._lastMeshStats,
            materialMode: this.chunkManager?.materialModes[this.chunkManager.materialModeIndex],
            cameraPos: [this.camera.position.x.toFixed(1), this.camera.position.y.toFixed(1), this.camera.position.z.toFixed(1)],
        };
        console.log('=== RENDER STATE ===', info);
        this._showDiagMsg('Render state dumped to console (F12)');
    }

    async init() {
        this.updateLoading(0, 'Initializing renderer...');

        // Renderer
        const canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // NoToneMapping keeps vertex colors at their literal brightness —
        // critical for a bright voxel look. ACES was crushing midtones.
        this.renderer.toneMapping = THREE.NoToneMapping;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        // Scene
        this.scene = new THREE.Scene();
        // Soft atmospheric haze — color matches Skybox.js horizon (pale blue)
        // so distant terrain fades into the sky, not into a gray wall.
        this.scene.fog = new THREE.FogExp2(0xbfdeff, 0.008);

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        // Post-processing composer (bloom + FXAA + outline)
        this.postfx = createPostFX(this.renderer, this.scene, this.camera);

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        this.updateLoading(0.05, 'Setting up lighting...');

        // Lighting
        this.setupLighting();

        // Skybox
        this.skybox = new Skybox(this.scene);

        this.updateLoading(0.1, 'Building world...');

        // Block-based voxel world (flat canvas for editor)
        this.worldGenerator = new FlatWorldGenerator();
        this.chunkManager = new ChunkManager(this.scene, this.worldGenerator);

        // Pre-load chunks around spawn so terrain is ready before player appears
        this.chunkManager.update(new THREE.Vector3(0, 21, 0));

        // Decorative grass tufts on grass blocks near player
        this.grassBillboards = new GrassBillboards(this.scene, this.chunkManager);

        // === DIAGNOSTIC REFERENCE CUBES ===
        // Three side-by-side cubes that should look BRIGHT GREEN no matter what.
        // If they look dark, the problem is gamma/colorspace/tonemapping.
        // If they look bright but chunks don't, problem is our mesher/vertexColors.
        const refBasic = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshBasicMaterial({ color: 0x44ff44 })  // Basic: ignores lights
        );
        refBasic.position.set(3, 22.5, 3);
        this.scene.add(refBasic);

        const refLambert = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshLambertMaterial({ color: 0x44ff44 })  // Lambert: uses lights
        );
        refLambert.position.set(5, 22.5, 3);
        this.scene.add(refLambert);

        const refStandard = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({ color: 0x44ff44, roughness: 0.9 })
        );
        refStandard.position.set(7, 22.5, 3);
        this.scene.add(refStandard);

        this.updateLoading(0.72, 'Loading enemies...');

        // Enemies
        this.enemyManager = new EnemyManager(this.scene);
        await this.enemyManager.init((progress) => {
            this.updateLoading(0.72 + progress * 0.03, `Loading enemies... ${Math.floor(progress * 100)}%`);
        });

        this.updateLoading(0.82, 'Summoning atmosphere...');

        // Atmospheric particles
        this.atmosphericEffects = new AtmosphericEffects(this.scene);

        // World editor (enabled when admin)
        this.editorSystem = new EditorSystem(this);

        // Input
        this.inputManager = new InputManager();

        // Left-click targeting
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.handleLeftClick(e);
        });

        // Cursor-following aim reticle
        this.aimReticleEl = document.getElementById('aim-reticle');
        window.addEventListener('mousemove', (e) => {
            this.mousePx.x = e.clientX;
            this.mousePx.y = e.clientY;
            this.mousePx.inside = true;
            if (this.aimReticleEl) {
                this.aimReticleEl.style.transform =
                    `translate(${e.clientX}px, ${e.clientY}px)`;
            }
        });
        window.addEventListener('mouseout', (e) => {
            if (!e.relatedTarget) this.mousePx.inside = false;
        });

        // Respawn button
        const respawnBtn = document.getElementById('respawn-button');
        if (respawnBtn) {
            respawnBtn.addEventListener('click', () => {
                if (this.isDead && this.connected) {
                    this.wsClient.sendRespawn();
                }
            });
        }

        this.updateLoading(0.78, 'Connecting to server...');

        // Try to connect to server, fall back to offline mode
        await this.connectToServer();

        // Pass tree collision objects to player
        this.setupCollisions();

        this.updateLoading(1.0, 'Ready!');

        // Hide loading screen
        setTimeout(() => {
            this.loadingScreen.classList.add('fade-out');
            setTimeout(() => {
                this.loadingScreen.classList.add('hidden');
            }, 500);
        }, 300);

        // Start game loop
        this.animate();
    }

    setupCollisions() {
        if (!this.player) return;
        // Block-based collision will be handled by VoxelCollision (Phase 3)
        // For now, pass chunkManager reference for ground height queries
        this.player.chunkManager = this.chunkManager;
    }

    async connectToServer() {
        try {
            await Promise.race([
                this._doConnect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                )
            ]);
        } catch (err) {
            console.warn('Server not available, running in offline editor mode:', err.message);
            // Offline mode: spawn local player and enable editor
            this._startOfflineMode();
        }
    }

    _startOfflineMode() {
        if (this.chunkManager) {
            stampStarterTown(this.chunkManager);
        }

        this.player = new Player(this.scene, { class: 'Warrior' });
        this.player.mesh.position.set(0, 21, 0);
        this.player.chunkManager = this.chunkManager;

        this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        this.cameraController.target = this.player.mesh;
        this.cameraController.currentPosition.set(0, 33, 12);

        this.updatePlayerHUD({ name: 'Editor', hp: 100, maxHp: 100, mana: 100, maxMana: 100, level: 1 });

        // Re-apply any persisted custom equipment
        this._applyEquippedCustoms();

        // Enable editor in offline mode
        if (this.editorSystem) {
            this.editorSystem.setEnabled(true);
        }
    }

    async _doConnect() {
        const token = await this.devAutoLogin();

        if (!token) {
            throw new Error('Authentication failed');
        }

        const charRes = await fetch('http://localhost:3002/api/characters', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!charRes.ok) {
            throw new Error(`Character fetch failed: ${charRes.status}`);
        }

        const charData = await charRes.json();

        let characterId;
        if (charData.characters && charData.characters.length > 0) {
            characterId = charData.characters[0].id;
        } else {
            const createRes = await fetch('http://localhost:3002/api/characters', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: 'Hero', className: 'Warrior' })
            });
            const created = await createRes.json();
            if (!created.character) {
                throw new Error(created.error || 'Failed to create character');
            }
            characterId = created.character.id;
        }

        this.setupNetworkHandlers();

        await this.wsClient.connect(token);
        this.connected = true;

        // Give ChunkManager access to wsClient for requesting chunk deltas
        // Also request deltas for chunks that were pre-loaded before connection
        if (this.chunkManager) {
            this.chunkManager.wsClient = this.wsClient;
            this.chunkManager.requestAllChunkDeltas();
        }

        this.wsClient.selectCharacter(characterId);
    }

    async devAutoLogin() {
        try {
            await fetch('http://localhost:3002/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'dev', password: 'dev123' })
            });

            const res = await fetch('http://localhost:3002/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'dev', password: 'dev123' })
            });

            if (!res.ok) {
                console.warn('[Auth] Login failed:', res.status);
                return null;
            }

            const data = await res.json();
            if (data.token) {
                localStorage.setItem('authToken', data.token);
                return data.token;
            }
        } catch (err) {
            console.warn('[Auth] Server not reachable:', err.message);
        }
        return null;
    }

    setupNetworkHandlers() {
        this.wsClient.on('characterLoaded', (data) => {
            this.characterData = data.character;

            this.player = new Player(this.scene, {
                class: data.character.class,
                x: data.character.x,
                y: data.character.y,
                equipment: data.equipment || {},
            });
            const spawnY = this.chunkManager.getGroundHeight(
                Math.floor(data.character.x),
                Math.floor(data.character.y)
            );
            this.player.mesh.position.set(data.character.x, spawnY, data.character.y);

            // Camera
            this.cameraController = new CameraController(this.camera, this.renderer.domElement);
            this.cameraController.target = this.player.mesh;
            this.cameraController.currentPosition.set(
                data.character.x, spawnY + 11, data.character.y + 12
            );

            this.updatePlayerHUD(data.character);

            // Re-apply any persisted custom equipment on top of server equipment
            this._applyEquippedCustoms();

            // Check if player loaded in dead (0 HP from previous session)
            if (data.character.hp <= 0) {
                this.isDead = true;
                const deathScreen = document.getElementById('death-screen');
                const deathMessage = document.getElementById('death-message');
                if (deathMessage) deathMessage.textContent = 'You were slain. Click to respawn.';
                if (deathScreen) deathScreen.classList.remove('hidden');
            }

            // Enable editor if admin
            if (data.character.isAdmin && this.editorSystem) {
                this.editorSystem.setEnabled(true);
            }

            // Spawn existing players
            if (data.players) {
                for (const p of data.players) {
                    this.spawnOtherPlayer(p);
                }
            }

            // Spawn enemies from server state
            if (data.enemies && this.enemyManager) {
                this.enemyManager.applyUpdates(data.enemies);
                this.enemyManager.onLootPickup = (items) => {
                    for (const item of items) {
                        // addItem already shows a loot popup internally
                        this.addItem(item.key, item.name, item.quantity);
                    }
                };
            }

            // Setup tree collisions now that player exists
            this.setupCollisions();
        });

        this.wsClient.on('playerJoined', (data) => {
            this.spawnOtherPlayer(data);
        });

        this.wsClient.on('playerLeft', (data) => {
            this.removeOtherPlayer(data.id);
        });

        this.wsClient.on('playerMoved', (data) => {
            const other = this.otherPlayers.get(data.id);
            if (other) {
                other.setTargetPosition(data.x, data.y, data.rotation);
            }
        });

        this.wsClient.on('playerStats', (data) => {
            if (this.characterData) {
                Object.assign(this.characterData, data);
                this.updatePlayerHUD(this.characterData);
            }
        });

        // Block updates from other players / server
        this.wsClient.on('blockUpdate', (data) => {
            if (this.chunkManager) {
                this.chunkManager.setBlock(data.x, data.y, data.z, data.blockId);
            }
        });

        // Chunk deltas (persisted block changes) from server
        this.wsClient.on('chunkDeltas', (data) => {
            if (this.chunkManager) {
                this.chunkManager.applyChunkDeltas(data.cx, data.cy, data.cz, data.deltas);
            }
        });

        this.wsClient.on('resourceDepleted', (data) => {});
        this.wsClient.on('resourceRespawned', (data) => {});

        // Gathering handlers — server overrides local progress
        this.wsClient.on('gatherProgress', (data) => {
            // Server confirms hit; keep local timer running for smooth bar
        });

        this.wsClient.on('gatherComplete', (data) => {
            this.isGathering = false;
            this.gatherElapsed = 0;
            this.gatheringTree = null;
            this.hideGatherProgress();
            this.player.model.setChopping(false);
            for (const item of data.items) {
                this.addItem(item.key, item.name || item.key, item.quantity);
            }
        });

        this.wsClient.on('gatherCancelled', () => {
            this.isGathering = false;
            this.gatherElapsed = 0;
            this.gatheringTree = null;
            this.hideGatherProgress();
            this.player.model.setChopping(false);
        });

        this.wsClient.on('equipmentChanged', (data) => {
            if (data.characterId && data.equipment) {
                if (this.characterData && data.characterId === this.characterData.id) {
                    this.player.updateEquipment(data.equipment);
                } else {
                    const other = this.otherPlayers.get(data.characterId);
                    if (other) {
                        other.updateEquipment(data.equipment);
                    }
                }
            }
        });

        // Enemy handlers
        this.wsClient.on('enemyUpdate', (data) => {
            if (this.enemyManager) {
                this.enemyManager.applyUpdates(data.enemies);
            }
            // Update target frame with latest server HP
            if (this.targetEnemy) {
                const updated = data.enemies.find(e => e.id === this.targetEnemy.id);
                if (updated) {
                    this.targetEnemy.hp = updated.hp;
                    this.targetEnemy.maxHp = updated.maxHp;
                    this.updateTargetFrame();
                }
            }
        });

        this.wsClient.on('enemyDied', (data) => {
            if (this.enemyManager) {
                this.enemyManager.handleEnemyDied(data.id);
            }
            if (this.targetEnemy && this.targetEnemy.id === data.id) {
                this.clearTarget();
            }
        });

        this.wsClient.on('enemyRespawned', (data) => {
            if (this.enemyManager) {
                this.enemyManager.handleEnemyRespawned(data);
            }
        });

        this.wsClient.on('damageDealt', (data) => {
            if (data.attackerType === 'player') {
                const entry = this.enemyManager?.enemies.get(data.targetId);
                if (entry) {
                    // Update enemy HP from server
                    entry.data.hp = data.targetHp;
                    this.enemyManager.drawHealthBar(entry.healthBar, data.targetHp, entry.data.maxHp);
                    this.showDamageNumber(entry.mesh.position, data.damage);
                    // Update target frame if this is our target
                    if (this.targetEnemy && this.targetEnemy.id === data.targetId) {
                        this.targetEnemy.hp = data.targetHp;
                        this.updateTargetFrame();
                    }
                }
            } else if (data.attackerType === 'enemy') {
                if (this.player) {
                    this.lastCombatTime = performance.now() / 1000;
                    this.showDamageNumber(this.player.mesh.position, data.damage, true);
                    // Trigger lunge animation on the attacking enemy
                    this.enemyManager?.triggerAttackAnim(
                        data.attackerId,
                        this.player.mesh.position.x,
                        this.player.mesh.position.z
                    );
                }
            }
        });

        this.wsClient.on('lootSpawn', (data) => {
            if (this.enemyManager) {
                this.enemyManager.createServerLoot(data);
            }
        });

        this.wsClient.on('xpGain', (data) => {
            if (this.player) {
                this.showXpNumber(this.player.mesh.position, data.amount);
            }
        });

        this.wsClient.on('playerDeath', (data) => {
            console.log(`[Death] Killed by ${data.killerName}`);
            this.isDead = true;
            const deathScreen = document.getElementById('death-screen');
            const deathMessage = document.getElementById('death-message');
            if (deathMessage) deathMessage.textContent = `Killed by ${data.killerName}`;
            if (deathScreen) deathScreen.classList.remove('hidden');
        });

        this.wsClient.on('respawned', (data) => {
            console.log(`[Respawn] Respawned at (${data.x}, ${data.y})`);
            this.isDead = false;
            const deathScreen = document.getElementById('death-screen');
            if (deathScreen) deathScreen.classList.add('hidden');
            if (this.player) {
                const ry = this.chunkManager.getGroundHeight(
                    Math.floor(data.x), Math.floor(data.y)
                );
                this.player.mesh.position.set(data.x, ry, data.y);
            }
            this.clearTarget();
        });

        this.wsClient.on('error', (data) => {
            console.warn('[Server Error]', data.message);
        });

        this.wsClient.on('_disconnected', () => {
            this.connected = false;
        });
    }

    spawnOtherPlayer(data) {
        if (this.otherPlayers.has(data.id)) return;
        const other = new OtherPlayer(this.scene, data);
        this.otherPlayers.set(data.id, other);
    }

    removeOtherPlayer(characterId) {
        const other = this.otherPlayers.get(characterId);
        if (other) {
            other.destroy();
            this.otherPlayers.delete(characterId);
        }
    }

    // ========== INTERACTION / GATHERING ==========

    findNearestGatherableTree() {
        // TODO Phase 8: block-based gathering replaces tree-based gathering
        return null;
    }

    updateInteraction() {
        const nearTree = this.findNearestGatherableTree();

        if (nearTree !== this.nearestGatherTree) {
            this.nearestGatherTree = nearTree;
            if (nearTree && !this.isGathering) {
                this.showTooltip(nearTree.userData.name, 'Hold E to gather');
            } else if (!nearTree) {
                this.hideTooltip();
                if (this.isGathering) {
                    this.cancelGather();
                }
            }
        }

        // Hold E to gather — only start/cancel, not if gather just completed this frame
        if (this.isGathering) {
            // Cancel if E released, moved, or walked out of range
            if (!this.inputManager.keys.interact || !nearTree || this.player.isMoving) {
                this.cancelGather();
            }
        } else if (this.inputManager.keys.interact && nearTree && !this.player.isMoving) {
            this.startGather(nearTree);
        }
    }

    startGather(tree) {
        if (!tree.userData.resourceId) return;

        this.isGathering = true;
        this.gatherElapsed = 0;
        this.gatheringTree = tree;
        this.hideTooltip();

        // Face the tree
        const dx = tree.position.x - this.player.mesh.position.x;
        const dz = tree.position.z - this.player.mesh.position.z;
        this.player.mesh.rotation.y = Math.atan2(dx, dz);

        // Start chopping animation
        this.player.model.setChopping(true);

        if (this.connected) {
            this.wsClient.sendGatherStart(tree.userData.resourceId);
        }
    }

    updateGather(deltaTime) {
        if (!this.isGathering) return;

        this.gatherElapsed += deltaTime;
        const pct = Math.min(100, (this.gatherElapsed / this.gatherDuration) * 100);

        this.showGatherProgress(pct);

        if (this.gatherElapsed >= this.gatherDuration) {
            // Mark complete BEFORE anything else
            const tree = this.gatheringTree;
            this.isGathering = false;
            this.gatheringTree = null;
            this.hideGatherProgress();
            this.player.model.setChopping(false);

            // TODO Phase 8: block-based gathering
            if (tree) {
                const qty = 3 + Math.floor(Math.random() * 5);
                this.addItem('oak_wood', 'Oak Wood', qty);
            }
        }
    }

    cancelGather() {
        if (!this.isGathering) return;
        console.log('[Gather] Cancelled at', this.gatherElapsed.toFixed(2), '/', this.gatherDuration);
        if (this.connected) {
            this.wsClient.sendGatherCancel();
        }
        this.isGathering = false;
        this.gatherElapsed = 0;
        this.gatheringTree = null;
        this.hideGatherProgress();
        this.player.model.setChopping(false);
    }

    showGatherProgress(pct) {
        if (this.gatherProgressEl) {
            this.gatherProgressEl.classList.remove('hidden');
            this.gatherFillEl.style.width = `${pct}%`;
            this.gatherTextEl.textContent = `Gathering...`;
        }
    }

    hideGatherProgress() {
        if (this.gatherProgressEl) {
            this.gatherProgressEl.classList.add('hidden');
            this.gatherFillEl.style.width = '0%';
        }
    }

    showTooltip(name, hint) {
        if (this.tooltipEl) {
            this.tooltipEl.classList.remove('hidden');
            this.tooltipTextEl.textContent = name;
            this.tooltipHintEl.textContent = hint;
        }
    }

    hideTooltip() {
        if (this.tooltipEl) {
            this.tooltipEl.classList.add('hidden');
        }
    }

    // ========== INVENTORY ==========

    toggleInventory(forceState) {
        this.inventoryOpen = forceState !== undefined ? forceState : !this.inventoryOpen;
        if (this.inventoryOpen) {
            this.inventoryPanel.classList.remove('hidden');
            this.renderInventory();
        } else {
            this.inventoryPanel.classList.add('hidden');
        }
    }

    addItem(key, name, quantity = 1, icon = null) {
        const itemIcon = icon || this.getItemIcon(key);
        const existing = this.inventory.get(key);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.inventory.set(key, {
                key,
                name,
                icon: itemIcon,
                quantity
            });
        }
        if (this.inventoryOpen) {
            this.renderInventory();
        }

        // Show floating loot text
        this.showLootPopup(`+${quantity} ${name}`, itemIcon);

        // Flash the bag button
        const bagBtn = document.getElementById('bag-button');
        bagBtn.classList.add('flash');
        setTimeout(() => bagBtn.classList.remove('flash'), 1500);
    }

    showLootPopup(text, icon) {
        const container = document.getElementById('loot-popups');
        if (!container) {
            console.warn('[Loot] No loot-popups container found');
            return;
        }
        const popup = document.createElement('div');
        popup.className = 'loot-popup';
        popup.textContent = `${icon} ${text}`;
        container.appendChild(popup);
        console.log('[Loot] Showing popup:', icon, text);

        setTimeout(() => popup.remove(), 2500);
    }

    getItemIcon(key) {
        const icons = {
            oak_wood: '\u{1FAB5}',     // wood
            oak_log: '\u{1FAB5}',
            wolf_fang: '\u{1F9B7}',    // tooth
            wolf_pelt: '\u{1F43E}',    // paw
            boar_tusk: '\u{1F9B7}',    // tooth
            boar_hide: '\u{1F9BE}',    // hide
            gold_coin: '\u{1FA99}',    // coin
            leather_scraps: '\u{1F9F6}', // yarn/scraps
        };
        return icons[key] || '\u{1F4E6}'; // default package box
    }

    renderInventory() {
        this.inventorySlotsEl.innerHTML = '';
        const totalSlots = 20;
        const items = Array.from(this.inventory.values());

        for (let i = 0; i < totalSlots; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';

            if (i < items.length) {
                const item = items[i];
                slot.classList.add('has-item');
                slot.innerHTML = `
                    <span class="inv-icon">${item.icon}</span>
                    <span class="inv-qty">${item.quantity > 1 ? item.quantity : ''}</span>
                    <span class="inv-name">${item.name}${item.quantity > 1 ? ' x' + item.quantity : ''}</span>
                `;
            }

            this.inventorySlotsEl.appendChild(slot);
        }
    }

    // ========== WARDROBE (custom-designed equipment) ==========

    toggleWardrobe(forceState) {
        this.wardrobeOpen = forceState !== undefined ? forceState : !this.wardrobeOpen;
        if (this.wardrobeOpen) {
            this.wardrobePanel.classList.remove('hidden');
            this.renderWardrobe();
        } else {
            this.wardrobePanel.classList.add('hidden');
        }
    }

    _loadCustomEquipmentMap() {
        try {
            return JSON.parse(localStorage.getItem('custom_equipment') || '{}');
        } catch {
            return {};
        }
    }

    _loadEquippedCustoms() {
        try {
            return JSON.parse(localStorage.getItem('equipped_customs') || '{}');
        } catch {
            return {};
        }
    }

    _saveEquippedCustoms() {
        localStorage.setItem('equipped_customs', JSON.stringify(this._equippedCustoms));
    }

    _applyEquippedCustoms() {
        if (!this.player?.model) return;
        const customs = this._loadCustomEquipmentMap();
        for (const [slot, customKey] of Object.entries(this._equippedCustoms)) {
            const entry = customs[customKey];
            if (!entry?.def) continue;
            this.player.model.equipArmor(slot, entry.def);
        }
    }

    equipCustom(customKey) {
        if (!this.player?.model) return;
        const customs = this._loadCustomEquipmentMap();
        const entry = customs[customKey];
        if (!entry?.def?.slot) return;
        const slot = entry.def.slot;
        this._equippedCustoms[slot] = customKey;
        this._saveEquippedCustoms();
        this.player.model.equipArmor(slot, entry.def);
        if (this.wardrobeOpen) this.renderWardrobe();
    }

    unequipCustom(slot) {
        if (!this.player?.model) return;
        if (!this._equippedCustoms[slot]) return;
        delete this._equippedCustoms[slot];
        this._saveEquippedCustoms();
        this.player.model.unequipArmor(slot);
        if (this.wardrobeOpen) this.renderWardrobe();
    }

    deleteCustom(customKey) {
        const customs = this._loadCustomEquipmentMap();
        const entry = customs[customKey];
        if (!entry) return;
        // Unequip first if currently equipped
        for (const [slot, k] of Object.entries(this._equippedCustoms)) {
            if (k === customKey) this.unequipCustom(slot);
        }
        delete customs[customKey];
        localStorage.setItem('custom_equipment', JSON.stringify(customs));
        if (this.wardrobeOpen) this.renderWardrobe();
    }

    renderWardrobe() {
        const list = this.wardrobeListEl;
        list.innerHTML = '';
        const customs = this._loadCustomEquipmentMap();
        const entries = Object.entries(customs);
        if (entries.length === 0) {
            list.innerHTML = '<div class="ward-empty">No custom designs yet.<br>Open the designer (N in editor mode) to author one.</div>';
            return;
        }
        const SLOT_ORDER = ['head', 'chest', 'legs', 'feet', 'hands', 'main_hand', 'off_hand'];
        const SLOT_LABELS = {
            head: 'Head', chest: 'Chest', legs: 'Legs', feet: 'Feet',
            hands: 'Hands', main_hand: 'Main Hand', off_hand: 'Off Hand',
        };
        const bySlot = {};
        for (const [key, entry] of entries) {
            const slot = entry?.def?.slot || 'unknown';
            (bySlot[slot] ||= []).push({ key, entry });
        }
        for (const slot of SLOT_ORDER) {
            const items = bySlot[slot];
            if (!items?.length) continue;
            const group = document.createElement('div');
            group.className = 'ward-slot-group';
            const label = document.createElement('div');
            label.className = 'ward-slot-label';
            label.textContent = SLOT_LABELS[slot] || slot;
            group.appendChild(label);
            for (const { key, entry } of items) {
                const isEquipped = this._equippedCustoms[slot] === key;
                const row = document.createElement('div');
                row.className = 'ward-item' + (isEquipped ? ' equipped' : '');
                const name = document.createElement('span');
                name.className = 'ward-item-name';
                name.textContent = entry.name || key;
                row.appendChild(name);
                const equipBtn = document.createElement('button');
                equipBtn.className = 'ward-btn' + (isEquipped ? ' unequip' : '');
                equipBtn.textContent = isEquipped ? 'Unequip' : 'Equip';
                equipBtn.addEventListener('click', () => {
                    if (isEquipped) this.unequipCustom(slot);
                    else this.equipCustom(key);
                });
                row.appendChild(equipBtn);
                const delBtn = document.createElement('button');
                delBtn.className = 'ward-btn delete';
                delBtn.textContent = '×';
                delBtn.title = 'Delete this design';
                delBtn.addEventListener('click', () => {
                    if (confirm(`Delete "${entry.name || key}"?`)) this.deleteCustom(key);
                });
                row.appendChild(delBtn);
                group.appendChild(row);
            }
            list.appendChild(group);
        }
    }

    // ========== COMBAT / TARGETING ==========

    handleLeftClick(event) {
        // Editor gets first pass on left-clicks (block breaking)
        if (this.editorSystem?.consumedLeftClick()) return;

        if (!this.player || !this.enemyManager || this.isDead) return;

        this.mouseVec.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouseVec.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouseVec, this.camera);

        const enemyMeshes = this.enemyManager.getAllMeshes();
        const hits = this.raycaster.intersectObjects(enemyMeshes, true);

        if (hits.length > 0) {
            const entry = this.enemyManager.findByMesh(hits[0].object);
            if (entry && !entry.dying) {
                this.selectTarget(entry);
                this.attackTarget(entry);
                return;
            }
        }

        // Check for loot bag clicks
        const lootMeshes = this.enemyManager.getLootMeshes();
        const lootHits = this.raycaster.intersectObjects(lootMeshes, false);
        if (lootHits.length > 0) {
            const playerPos = this.player.mesh.position;
            if (this.enemyManager.tryPickupLoot(playerPos)) {
                return;
            }
        }

        this.clearTarget();
    }

    _updateAimReticle() {
        if (!this.aimReticleEl || !this.postfx) return;
        // Hide during editor mode — editor has its own center-crosshair
        if (this.editorSystem?.enabled) {
            this.aimReticleEl.classList.add('hidden');
            this.postfx.hoverOutlinePass.selectedObjects = [];
            this.hoveredEnemyMesh = null;
            return;
        }
        this.aimReticleEl.classList.remove('hidden');

        let hitType = 'idle';
        let hoveredMesh = null;

        if (this.mousePx.inside && this.enemyManager && !this.isDead) {
            this.mouseVec.x = (this.mousePx.x / window.innerWidth) * 2 - 1;
            this.mouseVec.y = -(this.mousePx.y / window.innerHeight) * 2 + 1;
            this.raycaster.setFromCamera(this.mouseVec, this.camera);

            const enemyMeshes = this.enemyManager.getAllMeshes();
            const hits = this.raycaster.intersectObjects(enemyMeshes, true);
            if (hits.length > 0) {
                const entry = this.enemyManager.findByMesh(hits[0].object);
                if (entry && !entry.dying) {
                    hitType = 'enemy';
                    hoveredMesh = entry.mesh;
                }
            }
            if (hitType === 'idle') {
                const lootMeshes = this.enemyManager.getLootMeshes();
                const lootHits = this.raycaster.intersectObjects(lootMeshes, false);
                if (lootHits.length > 0) hitType = 'loot';
            }
        }

        if (this.aimReticleEl.dataset.state !== hitType) {
            this.aimReticleEl.className = hitType;
            this.aimReticleEl.dataset.state = hitType;
        }

        this.hoveredEnemyMesh = hoveredMesh;
        this.postfx.hoverOutlinePass.selectedObjects = hoveredMesh ? [hoveredMesh] : [];
    }

    selectTarget(entry) {
        this.targetEnemy = {
            id: entry.data.id,
            name: entry.data.name,
            level: entry.data.level,
            hp: entry.data.hp,
            maxHp: entry.data.maxHp,
        };
        this.updateTargetFrame();
        this.targetFrame.classList.remove('hidden');
    }

    attackTarget(entry) {
        const px = this.player.mesh.position.x;
        const pz = this.player.mesh.position.z;
        const ex = entry.mesh.position.x;
        const ez = entry.mesh.position.z;
        const dist = Math.sqrt((px - ex) ** 2 + (pz - ez) ** 2);

        if (dist > 4.0) return;

        // Face the target
        this.player.mesh.rotation.y = Math.atan2(ex - px, ez - pz);

        // Play attack animation
        this.player.model.triggerAttack();
        this.lastCombatTime = performance.now() / 1000;

        // Send attack to server with current position — server handles damage, aggro, death, loot
        this.wsClient.sendAttack(entry.data.id, px, pz);
    }

    clearTarget() {
        this.targetEnemy = null;
        this.targetFrame.classList.add('hidden');
    }

    updateTargetFrame() {
        if (!this.targetEnemy) return;
        this.targetNameEl.textContent = `[${this.targetEnemy.level}] ${this.targetEnemy.name}`;
        const pct = Math.max(0, (this.targetEnemy.hp / this.targetEnemy.maxHp) * 100);
        this.targetHealthBar.style.width = `${pct}%`;
        this.targetHealthText.textContent = `${this.targetEnemy.hp} / ${this.targetEnemy.maxHp}`;
    }

    updateRegen(deltaTime) {
        if (!this.characterData || !this.player) return;
        const now = performance.now() / 1000;
        const timeSinceCombat = now - this.lastCombatTime;
        if (timeSinceCombat < this.regenCooldown) return;
        if (this.characterData.hp >= this.characterData.maxHp) return;

        // Tick once per second
        if (!this._regenAccum) this._regenAccum = 0;
        this._regenAccum += deltaTime;
        if (this._regenAccum < 1.0) return;
        this._regenAccum = 0;

        const heal = 5;
        const oldHp = Math.floor(this.characterData.hp);
        this.characterData.hp = Math.min(this.characterData.maxHp, oldHp + heal);
        const actualHeal = Math.floor(this.characterData.hp) - oldHp;
        if (actualHeal > 0) {
            this.showHealNumber(this.player.mesh.position, actualHeal);
        }
        this.updatePlayerHUD(this.characterData);
    }

    showHealNumber(position, amount) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 24px Arial';
        ctx.fillStyle = '#44ff44';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(`+${amount}`, 64, 40);
        ctx.fillText(`+${amount}`, 64, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.5, 0.75, 1);
        sprite.position.copy(position);
        sprite.position.y += 2.5;
        sprite.position.x += (Math.random() - 0.5) * 0.3;

        this.scene.add(sprite);
        this.damageNumbers.push({ sprite, elapsed: 0, duration: 1.5 });
    }

    showXpNumber(position, amount) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#aa88ff';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(`+${amount} XP`, 64, 40);
        ctx.fillText(`+${amount} XP`, 64, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(1.5, 0.75, 1);
        sprite.position.copy(position);
        sprite.position.y += 3.0;

        this.scene.add(sprite);
        this.damageNumbers.push({ sprite, elapsed: 0, duration: 2.0 });
    }

    showDamageNumber(position, damage, isPlayerHit = false) {
        const canvas = document.createElement('canvas');
        canvas.width = 128;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 28px Arial';
        ctx.fillStyle = isPlayerHit ? '#ff4444' : '#ffff44';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.strokeText(`${damage}`, 64, 40);
        ctx.fillText(`${damage}`, 64, 40);

        const texture = new THREE.CanvasTexture(canvas);
        const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
        const sprite = new THREE.Sprite(mat);
        sprite.scale.set(2, 1, 1);
        sprite.position.copy(position);
        sprite.position.y += 2.5;
        sprite.position.x += (Math.random() - 0.5) * 0.5;

        this.scene.add(sprite);
        this.damageNumbers.push({ sprite, elapsed: 0, duration: 1.2 });
    }

    updateDamageNumbers(deltaTime) {
        for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
            const dn = this.damageNumbers[i];
            dn.elapsed += deltaTime;
            const t = dn.elapsed / dn.duration;

            dn.sprite.position.y += 1.5 * deltaTime;
            dn.sprite.material.opacity = 1 - t;

            if (t >= 1) {
                this.scene.remove(dn.sprite);
                dn.sprite.material.dispose();
                this.damageNumbers.splice(i, 1);
            }
        }
    }

    // ========== Spell casting ==========

    _buildActionBar() {
        const bar = document.getElementById('action-bar');
        if (!bar) return;
        bar.innerHTML = '';
        ACTION_BAR.forEach((spell, i) => {
            const slot = document.createElement('div');
            slot.className = 'action-slot';
            slot.dataset.spellId = spell.id;
            slot.title = `${spell.name} (${i + 1})`;
            slot.innerHTML = `
                <span class="slot-icon">${spell.icon}</span>
                <span class="slot-key">${i + 1}</span>
            `;
            slot.addEventListener('click', () => this.startCast(spell.id));
            bar.appendChild(slot);
        });
    }

    startCast(spellId) {
        if (!this.player || !this.player.model) return;
        if (this.isDead || this.isCasting || this.isGathering) return;
        const spell = SPELLS[spellId];
        if (!spell) return;

        // Face the cursor's world point at cast-start so the projectile flies that way.
        const aimDir = this._getCursorAimDirection();
        if (aimDir) {
            this.player.mesh.rotation.y = Math.atan2(aimDir.x, aimDir.z);
        }

        const started = this.player.model.triggerCast({
            duration: spell.castDuration,
            pose: spell.pose,
            orbColor: spell.orbColor,
            onComplete: () => this.spawnProjectile(spellId),
        });
        if (!started) return;

        this.isCasting = true;
        this.castingSpellId = spellId;
        if (this.castBarEl) this.castBarEl.classList.remove('hidden');
        if (this.castBarTextEl) this.castBarTextEl.textContent = spell.name;
        if (this.castBarFillEl) {
            this.castBarFillEl.style.background = `linear-gradient(to right, ${spell.barColor}, #fff3c0)`;
            this.castBarFillEl.style.width = '0%';
        }
    }

    /**
     * Raycast from cursor screen position into the world and return a normalized
     * horizontal direction from the player toward that point. Falls back to
     * camera-forward if the cursor is outside the window.
     */
    _getCursorAimDirection() {
        const playerPos = this.player.mesh.position;
        const forward = new THREE.Vector3();

        if (this.mousePx && this.mousePx.inside) {
            const rect = this.renderer.domElement.getBoundingClientRect();
            const ndc = new THREE.Vector2(
                ((this.mousePx.x - rect.left) / rect.width) * 2 - 1,
                -((this.mousePx.y - rect.top) / rect.height) * 2 + 1
            );
            this.raycaster.setFromCamera(ndc, this.camera);
            // Intersect a horizontal plane at player chest height
            const plane = new THREE.Plane(
                new THREE.Vector3(0, 1, 0),
                -(playerPos.y + 0.6)
            );
            const hit = new THREE.Vector3();
            if (this.raycaster.ray.intersectPlane(plane, hit)) {
                forward.subVectors(hit, playerPos);
                forward.y = 0;
                if (forward.lengthSq() > 0.001) return forward.normalize();
            }
        }

        // Fallback: camera's horizontal forward direction
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 0.001) return null;
        return forward.normalize();
    }

    spawnProjectile(spellId) {
        this.isCasting = false;
        this.castingSpellId = null;
        if (this.castBarEl) this.castBarEl.classList.add('hidden');

        if (!this.player || !this.player.model) return;
        const spell = SPELLS[spellId];
        if (!spell) return;

        const dir = this._getCursorAimDirection();
        if (!dir) return;

        // Spawn at player's chest height, slightly in front so it doesn't clip the model
        const origin = this.player.mesh.position.clone();
        origin.y += 0.55;
        origin.addScaledVector(dir, 0.6);

        const proj = spell.spawn(this.scene, origin, dir);
        this.projectiles.push(proj);
    }

    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (!p.update(deltaTime)) {
                p.dispose();
                this.projectiles.splice(i, 1);
            }
        }
    }

    updateCastBar() {
        if (!this.castBarFillEl || !this.player || !this.player.model) return;
        if (!this.isCasting) return;
        const p = this.player.model.getCastProgress();
        this.castBarFillEl.style.width = `${(p * 100).toFixed(1)}%`;
        // Model's own update() clears isCasting when done; keep our flag in sync
        if (!this.player.model.isCasting) {
            this.isCasting = false;
            this.castingSpellId = null;
            if (this.castBarEl) this.castBarEl.classList.add('hidden');
        }
    }

    // ========== HUD ==========

    updatePlayerHUD(data) {
        if (this.playerNameEl) {
            this.playerNameEl.textContent = data.name || 'Player';
        }
        if (this.healthBar && data.maxHp) {
            const hpPct = Math.max(0, (data.hp / data.maxHp) * 100);
            this.healthBar.style.width = `${hpPct}%`;
            this.healthText.textContent = `${Math.floor(data.hp)} / ${Math.floor(data.maxHp)}`;
        }
        if (this.manaBar && data.maxMana) {
            const manaPct = Math.max(0, (data.mana / data.maxMana) * 100);
            this.manaBar.style.width = `${manaPct}%`;
            this.manaText.textContent = `${Math.floor(data.mana)} / ${Math.floor(data.maxMana)}`;
        }
    }

    setupLighting() {
        // Bright daytime balanced for NoToneMapping (sum ~= 1.0).
        // Ambient fills shadowed faces so they stay visible but not flat.
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(this.ambientLight);

        // Hemisphere: sky light from above, warm ground bounce from below
        this.hemiLight = new THREE.HemisphereLight(0xbfdeff, 0xa08060, 0.55);
        this.scene.add(this.hemiLight);

        // Sunlight — gives clear directional shading on block faces
        const sun = new THREE.DirectionalLight(0xfff4d6, 0.85);
        sun.position.set(60, 100, 40);
        sun.castShadow = true;

        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.near = 0.5;
        sun.shadow.camera.far = 300;
        sun.shadow.camera.left = -80;
        sun.shadow.camera.right = 80;
        sun.shadow.camera.top = 80;
        sun.shadow.camera.bottom = -80;
        sun.shadow.bias = -0.001;

        this.scene.add(sun);
        this.sun = sun;

        // Player torch — subtle warm fill
        this.playerTorch = new THREE.PointLight(0xffddaa, 0.15, 20);
        this.playerTorch.position.set(0, 2, 0);
        this.scene.add(this.playerTorch);
    }

    placeGatherableTrees() {
        // TODO Phase 8: resources are block types in voxel world
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        const deltaTime = this.clock.getDelta();

        // FPS counter
        this.frameCount++;
        this.fpsTime += deltaTime;
        if (this.fpsTime >= 1.0) {
            this.currentFps = Math.round(this.frameCount / this.fpsTime);
            this.fpsCounter.textContent = `FPS: ${this.currentFps}`;
            this.frameCount = 0;
            this.fpsTime = 0;
        }

        // Update player (skip movement in free-fly camera mode)
        const isFreeFly = this.editorSystem?.cameraMode === 'freefly';
        if (this.player && !isFreeFly) {
            this.player.update(deltaTime, this.inputManager.keys, this.cameraController.getYaw());

            // Send position to server
            const isMoving = this.inputManager.isMoving();
            if (this.connected && isMoving) {
                const pos = this.player.getPosition();
                this.wsClient.sendMove(pos.x, pos.z, this.player.getRotation());
            }
            // Send final resting position when player stops so server has accurate coords
            if (this.connected && !isMoving && this.wasMoving) {
                const pos = this.player.getPosition();
                this.wsClient.sendMove(pos.x, pos.z, this.player.getRotation(), true);
            }
            this.wasMoving = isMoving;

            // Gather progress first (so completion fires before interaction cancels)
            this.updateGather(deltaTime);
            // Interaction checks (tooltip, gather start/cancel)
            this.updateInteraction();

            // Update debug
            const pos = this.player.getPosition();
            this.positionInfo.textContent = `Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        }

        // HP regen when out of combat
        this.updateRegen(deltaTime);

        // Update enemies
        if (this.enemyManager) {
            this.enemyManager.update(deltaTime);
        }

        // Update floating damage numbers
        this.updateDamageNumbers(deltaTime);

        // Update spell projectiles + cast bar UI
        this.updateProjectiles(deltaTime);
        this.updateCastBar();

        // Update chunk world (load/unload/mesh chunks around camera in free-fly, player otherwise)
        if (this.chunkManager) {
            const chunkCenter = isFreeFly ? this.camera.position : this.player?.getPosition();
            if (chunkCenter) this.chunkManager.update(chunkCenter);
        }

        // Update atmospheric particles
        if (this.atmosphericEffects && this.player) {
            this.atmosphericEffects.update(deltaTime, this.player.getPosition());
        }

        // Update other players
        for (const other of this.otherPlayers.values()) {
            other.update(deltaTime);
        }

        // Update camera
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }

        // Update editor (raycast + highlight + tools + HUD)
        if (this.editorSystem) {
            this.editorSystem.update(deltaTime);
        }

        // Follow moon shadow + player torch
        if (this.sun && this.player) {
            const playerPos = this.player.getPosition();
            this.sun.position.set(playerPos.x + 40, 80, playerPos.z + 30);
            this.sun.target.position.copy(playerPos);
            this.sun.target.updateMatrixWorld();

            if (this.playerTorch) {
                this.playerTorch.position.set(playerPos.x, playerPos.y + 2, playerPos.z);
            }
        }

        // Grass tuft billboards follow player + sway
        if (this.grassBillboards && this.player) {
            this.grassBillboards.update(
                this.player.getPosition(),
                this.camera.position,
                this.clock.getElapsedTime()
            );
        }

        // Refresh outlined objects (characters + enemies) so silhouettes pop
        const outlined = [];
        if (this.player?.mesh) outlined.push(this.player.mesh);
        for (const other of this.otherPlayers.values()) {
            if (other.mesh) outlined.push(other.mesh);
        }
        if (this.enemyManager) {
            for (const m of this.enemyManager.getAllMeshes()) outlined.push(m);
        }
        this.postfx.outlinePass.selectedObjects = outlined;

        // Per-frame cursor-aim raycast → hover reticle + hover outline
        this._updateAimReticle();

        // Render through post-processing composer
        this.postfx.composer.render();
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
        if (this.postfx) this.postfx.setSize(width, height);
    }

    updateLoading(progress, text) {
        if (this.loadingBar) {
            this.loadingBar.style.width = `${Math.floor(progress * 100)}%`;
        }
        if (this.loadingText) {
            this.loadingText.textContent = text;
        }
    }
}
