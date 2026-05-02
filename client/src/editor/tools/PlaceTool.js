import { BaseTool } from './BaseTool.js';
import { SetBlocksCommand } from '../CommandHistory.js';

export class PlaceTool extends BaseTool {
    get name() { return 'Place'; }
    get previewMode() { return 'place'; }

    getPreviewPositions(rayResult) {
        if (!rayResult?.hit) return [];
        const [x, y, z] = rayResult.position;
        const [nx, ny, nz] = rayResult.normal;
        const px = x + nx;
        const py = y + ny;
        const pz = z + nz;
        return this.getBrushPositions(px, py, pz, this.editor.brushSize);
    }

    onLeftClick(rayResult) {
        if (!rayResult?.hit) return;

        const [x, y, z] = rayResult.position;
        const [nx, ny, nz] = rayResult.normal;
        const px = x + nx;
        const py = y + ny;
        const pz = z + nz;

        const positions = this.getBrushPositions(px, py, pz, this.editor.brushSize);
        const chunkManager = this.editor.game.chunkManager;
        const blockId = this.editor.selectedBlockId;

        // Filter out positions occupied by the player
        const playerPos = this.editor.game.player?.getPosition();
        const changes = [];

        for (const pos of positions) {
            // Skip if player is standing there
            if (playerPos) {
                const pbx = Math.floor(playerPos.x);
                const pbz = Math.floor(playerPos.z);
                const pby = Math.floor(playerPos.y);
                if (pos.x === pbx && pos.z === pbz && (pos.y === pby || pos.y === pby + 1)) {
                    continue;
                }
            }

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
}
