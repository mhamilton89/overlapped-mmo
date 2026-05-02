import { BaseTool } from './BaseTool.js';
import { SetBlocksCommand } from '../CommandHistory.js';
import { structureRegistry } from '../StructureRegistry.js';

export class AssetPlaceTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.rotation = 0; // 0-3 (90° steps)
    }

    get name() {
        const s = this.editor.selectedStructure;
        const def = s ? structureRegistry.get(s) : null;
        return def ? `Asset: ${def.name}` : 'Asset';
    }

    get previewMode() { return 'asset'; }

    rotate(dir) {
        this.rotation = ((this.rotation + dir) % 4 + 4) % 4;
    }

    _getAnchor(rayResult) {
        const [x, y, z] = rayResult.position;
        const [nx, ny, nz] = rayResult.normal;
        return { x: x + nx, y: y + ny, z: z + nz };
    }

    _getWorldBlocks(rayResult) {
        const structId = this.editor.selectedStructure;
        if (!structId) return [];
        const blocks = structureRegistry.getRotatedBlocks(structId, this.rotation);
        if (!blocks) return [];

        const anchor = this._getAnchor(rayResult);
        return blocks.map(b => ({
            x: anchor.x + b.x,
            y: anchor.y + b.y,
            z: anchor.z + b.z,
            blockId: b.blockId,
        })).filter(b => b.y >= 0 && b.y <= 255);
    }

    getPreviewPositions(rayResult) {
        if (!rayResult?.hit) return [];
        return this._getWorldBlocks(rayResult);
    }

    onLeftClick(rayResult) {
        if (!rayResult?.hit) return;

        const worldBlocks = this._getWorldBlocks(rayResult);
        if (worldBlocks.length === 0) return;

        const chunkManager = this.editor.game.chunkManager;
        const playerPos = this.editor.game.player?.getPosition();
        const changes = [];

        for (const b of worldBlocks) {
            // Skip player-occupied positions
            if (playerPos) {
                const pbx = Math.floor(playerPos.x);
                const pbz = Math.floor(playerPos.z);
                const pby = Math.floor(playerPos.y);
                if (b.x === pbx && b.z === pbz && (b.y === pby || b.y === pby + 1)) {
                    continue;
                }
            }

            const oldBlockId = chunkManager.getBlock(b.x, b.y, b.z);
            // Don't overwrite bedrock
            if (oldBlockId === 22) continue;

            if (oldBlockId !== b.blockId) {
                changes.push({ x: b.x, y: b.y, z: b.z, oldBlockId, newBlockId: b.blockId });
            }
        }

        if (changes.length > 0) {
            const cmd = new SetBlocksCommand(chunkManager, this.editor.game.wsClient, changes);
            this.editor.executeCommand(cmd);
        }
    }
}
