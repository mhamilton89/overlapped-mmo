import { BaseTool } from './BaseTool.js';
import { SetBlocksCommand } from '../CommandHistory.js';

export class PaintTool extends BaseTool {
    get name() { return 'Paint'; }
    get previewMode() { return 'paint'; }

    getPreviewPositions(rayResult) {
        if (!rayResult?.hit) return [];
        const [x, y, z] = rayResult.position;
        return this._filterPaintable(
            this.getBrushPositions(x, y, z, this.editor.brushSize)
        );
    }

    onLeftClick(rayResult) {
        if (!rayResult?.hit) return;

        const [x, y, z] = rayResult.position;
        const positions = this._filterPaintable(
            this.getBrushPositions(x, y, z, this.editor.brushSize)
        );

        const chunkManager = this.editor.game.chunkManager;
        const blockId = this.editor.selectedBlockId;
        const changes = [];

        for (const pos of positions) {
            const oldBlockId = chunkManager.getBlock(pos.x, pos.y, pos.z);
            if (oldBlockId !== blockId) {
                changes.push({ x: pos.x, y: pos.y, z: pos.z, oldBlockId, newBlockId: blockId });
            }
        }

        if (changes.length > 0) {
            const cmd = new SetBlocksCommand(chunkManager, this.editor.game.wsClient, changes);
            this.editor.executeCommand(cmd);
        }
    }

    /** Only paint over existing non-air, non-bedrock blocks */
    _filterPaintable(positions) {
        const chunkManager = this.editor.game.chunkManager;
        return positions.filter(pos => {
            const blockId = chunkManager.getBlock(pos.x, pos.y, pos.z);
            return blockId !== 0 && blockId !== 22;
        });
    }
}
