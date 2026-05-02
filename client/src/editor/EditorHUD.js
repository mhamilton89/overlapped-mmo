/**
 * Editor status HUD overlay — shows current tool, brush, block, coords, camera mode.
 */
export class EditorHUD {
    constructor() {
        this.container = null;
        this.elements = {};
        this.hintsVisible = false;
        this._create();
    }

    _create() {
        this.container = document.createElement('div');
        this.container.id = 'editor-hud';
        this.container.classList.add('hidden');

        this.container.innerHTML = `
            <div class="hud-row">
                <span class="hud-label">Tool</span>
                <span class="hud-value" id="ehud-tool">Place</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Brush</span>
                <span class="hud-value" id="ehud-brush">1x1</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Block</span>
                <span class="hud-value">
                    <span id="ehud-swatch" class="hud-swatch"></span>
                    <span id="ehud-block">grass</span>
                </span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Target</span>
                <span class="hud-value" id="ehud-coords">—</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Camera</span>
                <span class="hud-value" id="ehud-camera">Orbit</span>
            </div>
            <div class="hud-row">
                <span class="hud-label">Undo</span>
                <span class="hud-value" id="ehud-undo">—</span>
            </div>
            <div class="hud-section-title" id="ehud-hints-toggle" style="cursor:pointer">Hotkeys [H]</div>
            <div id="ehud-hints" class="hidden" style="font-size:10px;color:#999;line-height:1.6">
                <div>G - Place &nbsp; X - Break</div>
                <div>C - Paint &nbsp; V - Fill</div>
                <div>B - Asset &nbsp; T - Cycle</div>
                <div>R - Rotate (asset tool)</div>
                <div>[ ] - Brush size</div>
                <div>Ctrl+Z / Y - Undo/Redo</div>
                <div>F - Free-fly camera</div>
                <div>Tab - Palette</div>
                <div>1-9 / Scroll - Hotbar</div>
                <div>N - Voxel Designer</div>
            </div>
        `;

        document.getElementById('hud')?.appendChild(this.container);

        this.elements.tool = document.getElementById('ehud-tool');
        this.elements.brush = document.getElementById('ehud-brush');
        this.elements.swatch = document.getElementById('ehud-swatch');
        this.elements.block = document.getElementById('ehud-block');
        this.elements.coords = document.getElementById('ehud-coords');
        this.elements.camera = document.getElementById('ehud-camera');
        this.elements.undo = document.getElementById('ehud-undo');
        this.elements.hints = document.getElementById('ehud-hints');

        document.getElementById('ehud-hints-toggle')?.addEventListener('click', () => {
            this.toggleHints();
        });
    }

    /**
     * @param {object} state
     * @param {string} state.toolName
     * @param {number} state.brushSize
     * @param {string} state.blockName
     * @param {number[]} state.blockColor - [r, g, b] 0-255
     * @param {number[]|null} state.targetCoords - [x, y, z] or null
     * @param {string} state.cameraMode - 'orbit' | 'freefly'
     * @param {boolean} state.canUndo
     * @param {boolean} state.canRedo
     */
    update(state) {
        if (!this.elements.tool) return;

        this.elements.tool.textContent = state.toolName;
        this.elements.brush.textContent = state.isAssetTool
            ? `R${state.rotation * 90}°`
            : `${state.brushSize}x${state.brushSize}`;

        if (state.isAssetTool && state.structureName) {
            this.elements.block.textContent = state.structureName;
            this.elements.swatch.style.backgroundColor = '#6a6';
        } else {
            this.elements.block.textContent = state.blockName || '?';
            if (state.blockColor) {
                const [r, g, b] = state.blockColor;
                this.elements.swatch.style.backgroundColor = `rgb(${r},${g},${b})`;
            }
        }

        if (state.targetCoords) {
            const [x, y, z] = state.targetCoords;
            this.elements.coords.textContent = `${x}, ${y}, ${z}`;
        } else {
            this.elements.coords.textContent = '—';
        }

        this.elements.camera.textContent = state.cameraMode === 'freefly' ? 'Free-fly' : 'Orbit';

        const undoParts = [];
        if (state.canUndo) undoParts.push('Ctrl+Z');
        if (state.canRedo) undoParts.push('Ctrl+Y');
        this.elements.undo.textContent = undoParts.length > 0 ? undoParts.join(' / ') : '—';
    }

    toggleHints() {
        this.hintsVisible = !this.hintsVisible;
        this.elements.hints?.classList.toggle('hidden', !this.hintsVisible);
    }

    setVisible(visible) {
        this.container?.classList.toggle('hidden', !visible);
    }

    dispose() {
        this.container?.remove();
    }
}
