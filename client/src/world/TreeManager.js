import * as THREE from 'three';
import { createDeadOak, createTwistedWillow, createBoneTree } from './ProceduralTrees.js';

// Procedural tree builders for gatherable resource nodes
const RESOURCE_TREE_BUILDERS = [createDeadOak, createTwistedWillow, createBoneTree];

function pickResourceTreeModel() {
    return RESOURCE_TREE_BUILDERS[Math.floor(Math.random() * RESOURCE_TREE_BUILDERS.length)]();
}

export class TreeManager {
    constructor(scene) {
        this.scene = scene;
        this.trees = [];         // All resource tree meshes in scene
        this.fallingTrees = [];  // Trees currently animating their fall
    }

    async init(onProgress) {
        // No async loading needed — models are procedural
        if (onProgress) onProgress(1.0);
        console.log('[TreeManager] Procedural resource trees ready');
    }

    /**
     * Place a gatherable resource tree at a world position
     */
    placeTree(x, z, resourceData = null, treeType = null) {
        const tree = pickResourceTreeModel();
        tree.position.set(x, 0, z);

        // Random rotation for variety
        tree.rotation.y = Math.random() * Math.PI * 2;

        // Slight random scale variation (0.8 - 1.2)
        const scaleVar = 0.8 + Math.random() * 0.4;
        tree.scale.set(scaleVar, scaleVar, scaleVar);

        // Store resource/interaction data
        tree.userData = {
            isTree: true,
            resourceId: resourceData?.id || null,
            resourceType: resourceData?.type || 'dead_wood',
            gatherable: !!resourceData,
            available: true,
            name: resourceData?.name || 'Dead Wood'
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
     * Place gatherable resource trees from server data
     */
    placeResourceTrees(resources) {
        for (const resource of resources) {
            this.placeTree(resource.x, resource.y, resource);
        }
    }

    findByResourceId(resourceId) {
        return this.trees.find(t => t.userData.resourceId === resourceId) || null;
    }

    setAvailability(resourceId, available) {
        if (available) {
            this.respawnTree(resourceId);
        } else {
            this.fellTree(resourceId);
        }
    }

    fellTree(resourceId) {
        const tree = this.findByResourceId(resourceId);
        if (!tree || !tree.userData.available) return;

        tree.userData.available = false;

        const fallAngle = Math.random() * Math.PI * 2;
        this.fallingTrees.push({
            tree,
            elapsed: 0,
            duration: 1.2,
            fallAxisX: Math.cos(fallAngle),
            fallAxisZ: Math.sin(fallAngle),
            originalRotX: tree.rotation.x,
            originalRotZ: tree.rotation.z,
            phase: 'falling'
        });
    }

    respawnTree(resourceId) {
        const tree = this.findByResourceId(resourceId);
        if (!tree) return;

        tree.userData.available = true;
        tree.visible = true;
        tree.rotation.x = 0;
        tree.rotation.z = 0;

        tree.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material = child.material.clone();
                child.material.transparent = false;
                child.material.opacity = 1.0;
            }
        });

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

    update(deltaTime) {
        for (let i = this.fallingTrees.length - 1; i >= 0; i--) {
            const anim = this.fallingTrees[i];
            anim.elapsed += deltaTime;
            const t = Math.min(1, anim.elapsed / anim.duration);

            if (anim.phase === 'falling') {
                const angle = t * t * (Math.PI / 2);
                anim.tree.rotation.x = anim.originalRotX + anim.fallAxisX * angle;
                anim.tree.rotation.z = anim.originalRotZ + anim.fallAxisZ * angle;

                if (t >= 1) {
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
                    anim.tree.rotation.x = 0;
                    anim.tree.rotation.z = 0;
                    this.fallingTrees.splice(i, 1);
                }
            } else if (anim.phase === 'respawning') {
                const ease = 1 - Math.pow(1 - t, 3);
                anim.tree.scale.copy(anim.baseScale).multiplyScalar(ease);

                if (t >= 1) {
                    anim.tree.scale.copy(anim.baseScale);
                    this.fallingTrees.splice(i, 1);
                }
            }
        }
    }

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
