/**
 * Abstract base class for editor tools.
 * All tools receive a reference to the EditorSystem.
 */
export class BaseTool {
    constructor(editor) {
        this.editor = editor;
    }

    /** Display name for HUD */
    get name() { return 'Tool'; }

    /** Called when this tool becomes active */
    activate() {}

    /** Called when switching away from this tool */
    deactivate() {}

    /**
     * Handle left-click at raycast result.
     * @param {object} rayResult - { hit, position, normal, blockId }
     */
    onLeftClick(rayResult) {}

    /**
     * Return array of {x, y, z} positions for ghost preview.
     * @param {object} rayResult
     * @returns {Array<{x:number, y:number, z:number}>}
     */
    getPreviewPositions(rayResult) {
        return [];
    }

    /** Preview mode: 'place', 'break', or 'paint' */
    get previewMode() { return 'place'; }

    /**
     * Generate cubic brush positions around a center point.
     * @param {number} cx - center X
     * @param {number} cy - center Y
     * @param {number} cz - center Z
     * @param {number} size - brush size (1, 3, 5, 7)
     * @returns {Array<{x:number, y:number, z:number}>}
     */
    getBrushPositions(cx, cy, cz, size) {
        const positions = [];
        const half = Math.floor(size / 2);
        for (let dx = -half; dx <= half; dx++) {
            for (let dy = -half; dy <= half; dy++) {
                for (let dz = -half; dz <= half; dz++) {
                    const y = cy + dy;
                    if (y < 0 || y > 255) continue;
                    positions.push({ x: cx + dx, y, z: cz + dz });
                }
            }
        }
        return positions;
    }
}
