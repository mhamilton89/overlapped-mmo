/**
 * Command pattern for undo/redo of block operations.
 */

export class SetBlocksCommand {
    /**
     * @param {object} chunkManager
     * @param {object|null} wsClient
     * @param {Array<{x:number, y:number, z:number, oldBlockId:number, newBlockId:number}>} changes
     */
    constructor(chunkManager, wsClient, changes) {
        this.chunkManager = chunkManager;
        this.wsClient = wsClient;
        this.changes = changes;
    }

    execute() {
        const ops = [];
        for (const c of this.changes) {
            this.chunkManager.setBlock(c.x, c.y, c.z, c.newBlockId);
            ops.push({ x: c.x, y: c.y, z: c.z, blockId: c.newBlockId });
        }
        this._sendBatch(ops);
    }

    undo() {
        const ops = [];
        for (const c of this.changes) {
            this.chunkManager.setBlock(c.x, c.y, c.z, c.oldBlockId);
            ops.push({ x: c.x, y: c.y, z: c.z, blockId: c.oldBlockId });
        }
        this._sendBatch(ops);
    }

    _sendBatch(ops) {
        if (this.wsClient && this.wsClient.connected) {
            this.wsClient.send('blockBatch', { ops });
        }
    }
}

export class CommandHistory {
    constructor(maxSize = 200) {
        this.undoStack = [];
        this.redoStack = [];
        this.maxSize = maxSize;
    }

    execute(command) {
        command.execute();
        this.undoStack.push(command);
        if (this.undoStack.length > this.maxSize) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    undo() {
        const cmd = this.undoStack.pop();
        if (!cmd) return false;
        cmd.undo();
        this.redoStack.push(cmd);
        return true;
    }

    redo() {
        const cmd = this.redoStack.pop();
        if (!cmd) return false;
        cmd.execute();
        this.undoStack.push(cmd);
        return true;
    }

    canUndo() { return this.undoStack.length > 0; }
    canRedo() { return this.redoStack.length > 0; }

    clear() {
        this.undoStack = [];
        this.redoStack = [];
    }
}
