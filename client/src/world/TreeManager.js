import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class TreeManager {
    constructor(scene) {
        this.scene = scene;
        this.loader = new FBXLoader();
        this.treeTemplates = new Map();
        this.trees = [];         // All tree meshes in scene
        this.treeCount = 21;     // Number of tree variations
        this.texture = null;
        this.fallingTrees = [];  // Trees currently animating their fall
    }

    async init(onProgress) {
        // Load shared texture atlas
        const textureLoader = new THREE.TextureLoader();
        this.texture = await textureLoader.loadAsync('assets/textures/T_Trees_temp_climate.png');

        if (onProgress) onProgress(0.1);

        // Load all 21 tree variations
        const promises = [];
        for (let i = 1; i <= this.treeCount; i++) {
            const num = String(i).padStart(3, '0');
            const path = `assets/models/trees/Tree_temp_climate_${num}.FBX`;
            promises.push(
                this.loadTreeModel(path, `tree_${num}`)
                    .then(() => {
                        if (onProgress) onProgress(0.1 + (i / this.treeCount) * 0.8);
                    })
                    .catch(err => {
                        console.warn(`Failed to load tree ${num}:`, err);
                    })
            );
        }

        await Promise.all(promises);
        console.log(`Loaded ${this.treeTemplates.size} tree templates`);

        if (onProgress) onProgress(1.0);
    }

    loadTreeModel(path, id) {
        return new Promise((resolve, reject) => {
            this.loader.load(
                path,
                (fbx) => {
                    // FBX models are often exported at large scale
                    fbx.scale.set(0.02, 0.02, 0.02);

                    // Apply shared texture to all meshes
                    fbx.traverse((child) => {
                        if (child.isMesh) {
                            child.material = new THREE.MeshStandardMaterial({
                                map: this.texture,
                                roughness: 0.8,
                                metalness: 0.0
                            });
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    this.treeTemplates.set(id, fbx);
                    resolve();
                },
                undefined,
                reject
            );
        });
    }

    /**
     * Place a tree at a world position
     * @param {number} x - World X
     * @param {number} z - World Z
     * @param {object} [resourceData] - Optional resource metadata for gathering
     * @param {string} [treeType] - Specific tree template key, or random
     * @returns {THREE.Object3D|null}
     */
    placeTree(x, z, resourceData = null, treeType = null) {
        const templateKeys = Array.from(this.treeTemplates.keys());
        if (templateKeys.length === 0) return null;

        const key = treeType || templateKeys[Math.floor(Math.random() * templateKeys.length)];
        const template = this.treeTemplates.get(key);
        if (!template) return null;

        const tree = template.clone();
        tree.position.set(x, 0, z);

        // Random rotation for variety
        tree.rotation.y = Math.random() * Math.PI * 2;

        // Slight random scale variation (0.8 - 1.2)
        const scaleVar = 0.8 + Math.random() * 0.4;
        tree.scale.multiplyScalar(scaleVar);

        // Store resource/interaction data
        tree.userData = {
            isTree: true,
            resourceId: resourceData?.id || null,
            resourceType: resourceData?.type || 'oak_tree',
            gatherable: !!resourceData,
            available: true,
            name: resourceData?.name || 'Oak Tree'
        };

        // Add glowing ring at base of gatherable trees
        if (resourceData) {
            const ringGeo = new THREE.RingGeometry(1.0, 1.4, 32);
            const ringMat = new THREE.MeshBasicMaterial({
                color: 0x44ff44,
                transparent: true,
                opacity: 0.5,
                side: THREE.DoubleSide
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = -Math.PI / 2;
            ring.position.y = 0.05;
            tree.add(ring);
            tree.userData._ring = ring;
        }

        this.scene.add(tree);
        this.trees.push(tree);
        return tree;
    }

    /**
     * Scatter trees randomly across terrain — all are gatherable
     */
    scatterTrees(count, terrainSize, exclusionRadius = 10) {
        const halfSize = terrainSize / 2;

        let placed = 0;
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * terrainSize * 0.9;
            const z = (Math.random() - 0.5) * terrainSize * 0.9;

            // Skip trees too close to spawn (center)
            const distFromCenter = Math.sqrt(x * x + z * z);
            if (distFromCenter < exclusionRadius) continue;

            this.placeTree(x, z, {
                id: `tree_${placed}`,
                type: 'oak_tree',
                name: 'Oak Tree',
                x, y: z
            });
            placed++;
        }
    }

    /**
     * Place gatherable resource trees from server data
     */
    placeResourceTrees(resources) {
        for (const resource of resources) {
            if (resource.type === 'oak_tree' || resource.type === 'tree') {
                this.placeTree(resource.x, resource.y, resource);
            }
        }
    }

    /**
     * Find a tree by resource ID
     */
    findByResourceId(resourceId) {
        return this.trees.find(t => t.userData.resourceId === resourceId) || null;
    }

    /**
     * Set tree availability (for depletion/respawn) — used by server events
     */
    setAvailability(resourceId, available) {
        if (available) {
            this.respawnTree(resourceId);
        } else {
            this.fellTree(resourceId);
        }
    }

    /**
     * Animate tree falling over, then hide it
     */
    fellTree(resourceId) {
        const tree = this.findByResourceId(resourceId);
        if (!tree || !tree.userData.available) return;

        tree.userData.available = false;

        // Pick a random fall direction
        const fallAngle = Math.random() * Math.PI * 2;
        this.fallingTrees.push({
            tree,
            elapsed: 0,
            duration: 1.2,
            fallAxisX: Math.cos(fallAngle),
            fallAxisZ: Math.sin(fallAngle),
            originalRotX: tree.rotation.x,
            originalRotZ: tree.rotation.z,
            phase: 'falling' // falling → fading → done
        });
    }

    /**
     * Respawn a felled tree with a pop-in scale animation
     */
    respawnTree(resourceId) {
        const tree = this.findByResourceId(resourceId);
        if (!tree) return;

        tree.userData.available = true;
        tree.visible = true;
        tree.rotation.x = 0;
        tree.rotation.z = 0;

        // Restore opacity
        tree.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.transparent = false;
                child.material.opacity = 1.0;
            }
        });

        // Pop-in scale animation
        const baseScale = tree.scale.clone();
        tree.scale.set(0, 0, 0);
        this.fallingTrees.push({
            tree,
            elapsed: 0,
            duration: 0.5,
            baseScale,
            phase: 'respawning'
        });
    }

    /**
     * Call each frame to animate falling/respawning trees
     */
    update(deltaTime) {
        for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
            const anim = this.fallingTrees[i];
            anim.elapsed += deltaTime;
            const t = Math.min(1, anim.elapsed / anim.duration);

            if (anim.phase === 'falling') {
                // Ease-in rotation to ~90 degrees
                const angle = t * t * (Math.PI / 2);
                anim.tree.rotation.x = anim.originalRotX + anim.fallAxisX * angle;
                anim.tree.rotation.z = anim.originalRotZ + anim.fallAxisZ * angle;

                if (t >= 1) {
                    // Start fading out
                    anim.phase = 'fading';
                    anim.elapsed = 0;
                    anim.duration = 0.6;
                }
            } else if (anim.phase === 'fading') {
                const opacity = 1 - t;
                anim.tree.traverse((child) => {
                    if (child.isMesh) {
                        if (!child.material._clonedForFade) {
                            child.material = child.material.clone();
                            child.material.transparent = true;
                            child.material._clonedForFade = true;
                        }
                        child.material.opacity = opacity;
                    }
                });

                if (t >= 1) {
                    anim.tree.visible = false;
                    // Reset rotation for respawn later
                    anim.tree.rotation.x = 0;
                    anim.tree.rotation.z = 0;
                    this.fallingTrees.splice(i, 1);
                }
            } else if (anim.phase === 'respawning') {
                // Elastic pop-in
                const ease = 1 - Math.pow(1 - t, 3);
                anim.tree.scale.copy(anim.baseScale).multiplyScalar(ease);

                if (t >= 1) {
                    anim.tree.scale.copy(anim.baseScale);
                    this.fallingTrees.splice(i, 1);
                }
            }
        }
    }

    /**
     * Get all tree meshes (for raycasting)
     */
    getAllMeshes() {
        const meshes = [];
        for (const tree of this.trees) {
            tree.traverse((child) => {
                if (child.isMesh) meshes.push(child);
            });
        }
        return meshes;
    }
}
