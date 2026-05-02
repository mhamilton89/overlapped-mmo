/**
 * BlockHighlight — wireframe cube that shows which block the camera is targeting.
 */

import * as THREE from 'three';

export class BlockHighlight {
    constructor(scene) {
        this.scene = scene;

        // Slightly oversized to avoid z-fighting with block faces
        const geo = new THREE.BoxGeometry(1.005, 1.005, 1.005);
        const edges = new THREE.EdgesGeometry(geo);
        this.material = new THREE.LineBasicMaterial({ color: 0xffffff, linewidth: 2 });
        this.mesh = new THREE.LineSegments(edges, this.material);
        this.mesh.visible = false;
        this.scene.add(this.mesh);
    }

    /**
     * @param {object|null} rayResult - from raycastVoxels: { hit, position, normal, blockId }
     * @param {boolean} placeMode - if true, show at place position (green tint)
     */
    update(rayResult, placeMode = false) {
        if (!rayResult || !rayResult.hit) {
            this.mesh.visible = false;
            return;
        }

        const [x, y, z] = rayResult.position;

        if (placeMode) {
            // Show at the adjacent block where placement would go
            this.mesh.position.set(
                x + rayResult.normal[0] + 0.5,
                y + rayResult.normal[1] + 0.5,
                z + rayResult.normal[2] + 0.5
            );
            this.material.color.setHex(0x44ff44);
        } else {
            // Show at the targeted block
            this.mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
            this.material.color.setHex(0xffffff);
        }

        this.mesh.visible = true;
    }

    hide() {
        this.mesh.visible = false;
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}
