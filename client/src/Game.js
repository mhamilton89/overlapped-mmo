import * as THREE from 'three';
import { Terrain } from './world/Terrain.js';
import { TreeManager } from './world/TreeManager.js';
import { Skybox } from './world/Skybox.js';
import { Player } from './entities/Player.js';
import { OtherPlayer } from './entities/OtherPlayer.js';
import { InputManager } from './controls/InputManager.js';
import { CameraController } from './controls/CameraController.js';
import { WebSocketClient } from './networking/WebSocketClient.js';

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
        this.otherPlayers = new Map(); // characterId → OtherPlayer

        // Game state
        this.characterData = null;
        this.connected = false;

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

        // Input
        this.inputManager = new InputManager();

        this.updateLoading(0.75, 'Connecting to server...');

        // Try to connect to server, fall back to offline mode
        await this.connectToServer();

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

    async connectToServer() {
        try {
            // Wrap the entire connection in a 5-second timeout
            await Promise.race([
                this._doConnect(),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Connection timeout')), 5000)
                )
            ]);
        } catch (err) {
            console.warn('Failed to connect to server, starting offline:', err.message);
            this.startOffline();
        }
    }

    async _doConnect() {
        // Always get a fresh token (stale tokens from localStorage cause issues)
        console.log('[Auth] Logging in...');
        const token = await this.devAutoLogin();

        if (!token) {
            console.log('[Auth] No token, going offline');
            this.startOffline();
            return;
        }

        // Fetch characters
        console.log('[Auth] Fetching characters...');
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
            console.log('[Auth] Using existing character:', charData.characters[0].name);
        } else {
            // Create a default character
            console.log('[Auth] Creating new character...');
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
            console.log('[Auth] Created character:', created.character.name);
        }

        // Setup WebSocket handlers before connecting
        this.setupNetworkHandlers();

        // Connect WebSocket
        console.log('[WS] Connecting...');
        await this.wsClient.connect(token);
        this.connected = true;
        console.log('[WS] Connected, selecting character...');

        // Select character
        this.wsClient.selectCharacter(characterId);
    }

    async devAutoLogin() {
        try {
            // Try to register (ignore 409 - already exists)
            await fetch('http://localhost:3002/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'dev', password: 'dev123' })
            });

            // Login
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
            console.log('[Game] Character loaded:', data.character.name);
            this.characterData = data.character;

            // Spawn local player at server position
            this.player = new Player(this.scene, {
                class: data.character.class,
                x: data.character.x,
                y: data.character.y
            });
            // Set player at server position (map 2D y to 3D z)
            this.player.mesh.position.set(data.character.x, 1, data.character.y);

            // Camera
            this.cameraController = new CameraController(this.camera, this.renderer.domElement);
            this.cameraController.target = this.player.mesh;
            this.cameraController.currentPosition.set(
                data.character.x, 12, data.character.y + 12
            );

            // Update HUD
            this.updatePlayerHUD(data.character);

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
        });

        this.wsClient.on('playerJoined', (data) => {
            console.log(`[Game] Player joined: ${data.name}`);
            this.spawnOtherPlayer(data);
        });

        this.wsClient.on('playerLeft', (data) => {
            console.log(`[Game] Player left: ${data.id}`);
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

        this.wsClient.on('error', (data) => {
            console.warn('[Server Error]', data.message);
        });

        this.wsClient.on('_disconnected', () => {
            this.connected = false;
            console.log('[Game] Disconnected from server');
        });
    }

    startOffline() {
        // Offline mode - spawn player with placeholder data
        this.player = new Player(this.scene, {
            class: 'Warrior',
            x: 0,
            y: 0
        });

        this.cameraController = new CameraController(this.camera, this.renderer.domElement);
        this.cameraController.target = this.player.mesh;
        this.cameraController.currentPosition.copy(this.camera.position);

        // Place gatherable trees locally
        this.placeGatherableTrees();

        this.updatePlayerHUD({
            name: 'Offline',
            hp: 100, maxHp: 100,
            mana: 100, maxMana: 100
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

    updatePlayerHUD(data) {
        if (this.playerNameEl) {
            this.playerNameEl.textContent = data.name || 'Player';
        }
        if (this.healthBar && data.maxHp) {
            const hpPct = Math.max(0, (data.hp / data.maxHp) * 100);
            this.healthBar.style.width = `${hpPct}%`;
            this.healthText.textContent = `${data.hp} / ${data.maxHp}`;
        }
        if (this.manaBar && data.maxMana) {
            const manaPct = Math.max(0, (data.mana / data.maxMana) * 100);
            this.manaBar.style.width = `${manaPct}%`;
            this.manaText.textContent = `${data.mana} / ${data.maxMana}`;
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
            { x: 15, z: 5 },
            { x: -12, z: 8 },
            { x: 8, z: -14 },
            { x: -10, z: -10 },
            { x: 20, z: -5 },
            { x: -18, z: 2 },
            { x: 5, z: 18 },
            { x: -5, z: -20 },
            { x: 22, z: 15 },
            { x: -15, z: 18 },
            { x: 25, z: -12 },
            { x: -22, z: -8 },
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
            if (this.connected && this.inputManager.isMoving()) {
                const pos = this.player.getPosition();
                this.wsClient.sendMove(pos.x, pos.z, this.player.getRotation());
            }

            // Update debug
            const pos = this.player.getPosition();
            this.positionInfo.textContent = `Pos: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`;
        }

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
