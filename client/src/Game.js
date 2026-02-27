import * as THREE from 'three';
import { Terrain } from './world/Terrain.js';
import { TreeManager } from './world/TreeManager.js';
import { Skybox } from './world/Skybox.js';
import { Player } from './entities/Player.js';
import { OtherPlayer } from './entities/OtherPlayer.js';
import { InputManager } from './controls/InputManager.js';
import { CameraController } from './controls/CameraController.js';
import { WebSocketClient } from './networking/WebSocketClient.js';
import { EnemyManager } from './entities/EnemyManager.js';

const GATHER_INTERACT_RANGE = 5;

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();

        // Modules
        this.terrain = null;
        this.treeManager = null;
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
        this.damageNumbers = [];
        this.lastCombatTime = 0;  // timestamp of last combat action
        this.regenCooldown = 3;   // seconds out of combat before regen starts

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
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Scene
        this.scene = new THREE.Scene();

        // Camera
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            500
        );

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        this.updateLoading(0.05, 'Setting up lighting...');

        // Lighting
        this.setupLighting();

        // Skybox
        this.skybox = new Skybox(this.scene);

        this.updateLoading(0.1, 'Creating terrain...');

        // Terrain
        this.terrain = new Terrain(this.scene);

        this.updateLoading(0.15, 'Loading trees...');

        // Trees
        this.treeManager = new TreeManager(this.scene);
        await this.treeManager.init((progress) => {
            this.updateLoading(0.15 + progress * 0.55, `Loading trees... ${Math.floor(progress * 100)}%`);
        });

        this.updateLoading(0.7, 'Placing trees...');

        // Scatter decorative trees
        this.treeManager.scatterTrees(200, 512, 15);

        this.updateLoading(0.72, 'Loading enemies...');

        // Enemies
        this.enemyManager = new EnemyManager(this.scene);
        await this.enemyManager.init((progress) => {
            this.updateLoading(0.72 + progress * 0.03, `Loading enemies... ${Math.floor(progress * 100)}%`);
        });

        // Input
        this.inputManager = new InputManager();

        // Left-click targeting
        this.renderer.domElement.addEventListener('mousedown', (e) => {
            if (e.button === 0) this.handleLeftClick(e);
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
        // Give the player all tree root objects for collision
        this.player.collisionObjects = this.treeManager.trees;
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
            console.error('Failed to connect to server:', err.message);
            this.updateLoading(0, 'Cannot connect to server. Please start the server and refresh.');
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
            this.player.mesh.position.set(data.character.x, 1, data.character.y);

            // Camera
            this.cameraController = new CameraController(this.camera, this.renderer.domElement);
            this.cameraController.target = this.player.mesh;
            this.cameraController.currentPosition.set(
                data.character.x, 12, data.character.y + 12
            );

            this.updatePlayerHUD(data.character);

            // Check if player loaded in dead (0 HP from previous session)
            if (data.character.hp <= 0) {
                this.isDead = true;
                const deathScreen = document.getElementById('death-screen');
                const deathMessage = document.getElementById('death-message');
                if (deathMessage) deathMessage.textContent = 'You were slain. Click to respawn.';
                if (deathScreen) deathScreen.classList.remove('hidden');
            }

            // Place gatherable trees from server data
            if (data.resources) {
                for (const res of data.resources) {
                    this.treeManager.placeTree(res.x, res.y, res);
                }
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

        this.wsClient.on('resourceDepleted', (data) => {
            this.treeManager.setAvailability(data.resourceId, false);
        });

        this.wsClient.on('resourceRespawned', (data) => {
            this.treeManager.setAvailability(data.resourceId, true);
        });

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
                this.player.mesh.position.set(data.x, 1, data.y);
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
        if (!this.player) return null;

        const px = this.player.mesh.position.x;
        const pz = this.player.mesh.position.z;
        let nearest = null;
        let nearestDist = GATHER_INTERACT_RANGE;

        for (const tree of this.treeManager.trees) {
            if (!tree.userData.gatherable || !tree.userData.available) continue;

            const dx = px - tree.position.x;
            const dz = pz - tree.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = tree;
            }
        }

        return nearest;
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

            if (tree) {
                this.treeManager.fellTree(tree.userData.resourceId);

                // Always give items locally
                const qty = 3 + Math.floor(Math.random() * 5);
                this.addItem('oak_wood', 'Oak Wood', qty);

                // Respawn after 2 minutes
                const resId = tree.userData.resourceId;
                setTimeout(() => {
                    this.treeManager.respawnTree(resId);
                }, 120000);
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

    // ========== COMBAT / TARGETING ==========

    handleLeftClick(event) {
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
        const ambient = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambient);

        const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x3d5c3d, 0.5);
        this.scene.add(hemiLight);

        const sun = new THREE.DirectionalLight(0xffeedd, 1.2);
        sun.position.set(80, 100, 50);
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
    }

    placeGatherableTrees() {
        const gatherablePositions = [
            { x: 6, z: 4 },
            { x: -5, z: 6 },
            { x: 7, z: -5 },
            { x: -7, z: -6 },
            { x: 15, z: 5 },
            { x: -12, z: 8 },
            { x: 8, z: -14 },
            { x: 20, z: -5 },
            { x: -18, z: 2 },
            { x: 5, z: 18 },
            { x: -5, z: -20 },
            { x: 22, z: 15 },
        ];

        gatherablePositions.forEach((pos, i) => {
            this.treeManager.placeTree(pos.x, pos.z, {
                id: `gather_tree_${i}`,
                type: 'oak_tree',
                name: 'Oak Tree',
                x: pos.x,
                y: pos.z
            });
        });
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

        // Update player
        if (this.player) {
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

        // Update tree animations (falling, respawning)
        this.treeManager.update(deltaTime);

        // Update other players
        for (const other of this.otherPlayers.values()) {
            other.update(deltaTime);
        }

        // Update camera
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }

        // Follow sun shadow
        if (this.sun && this.player) {
            const playerPos = this.player.getPosition();
            this.sun.position.set(playerPos.x + 80, 100, playerPos.z + 50);
            this.sun.target.position.copy(playerPos);
            this.sun.target.updateMatrixWorld();
        }

        // Render
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
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
