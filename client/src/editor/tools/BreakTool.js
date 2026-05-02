import { BaseTool } from './BaseTool.js';
import { SetBlocksCommand } from '../CommandHistory.js';

export class BreakTool extends BaseTool {
    get name() { return 'Break'; }
    get previewMode() { return 'break'; }

    getPreviewPositions(rayResult) {
        if (!rayResult?.hit) return [];
        const [x, y, z] = rayResult.position;
        return this._filterBreakable(
            this.getBrushPositions(x, y, z, this.editor.brushSize)
        );
    }

    onLeftClick(rayResult) {
        if (!rayResult?.hit) return;

        const [x, y, z] = rayResult.position;
        const positions = this._filterBreakable(
            this.getBrushPositions(x, y, z, this.editor.brushSize)
        );

        const chunkManager = this.editor.game.chunkManager;
        const changes = [];

        for (const pos of positions) {
            const oldBlockId = chunkManager.getBlock(pos.x, pos.y, pos.z);
            if (oldBlockId !== 0) {
                changes.push({ x: pos.x, y: pos.y, z: pos.z, oldBlockId, newBlockId: 0 });
            }
        }

        if (changes.length > 0) {
            const cmd = new SetBlocksCommand(chunkManager, this.editor.game.wsClient, changes);
            this.editor.executeCommand(cmd);
        }
    }

    _filterBreakable(positions) {
        const chunkManager = this.editor.game.chunkManager;
        return positions.filter(pos => {
            const blockId = chunkManager.getBlock(pos.x, pos.y, pos.z);
            return blockId !== 0 && blockId !== 22; // skip air and bedrock
        });
    }
}
