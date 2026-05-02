/**
 * DesignerUI — DOM overlay for the Voxel Designer.
 *
 * Builds the full-screen layout: 3D viewport on the left, tool/color/layer/save
 * panel on the right.  All DOM is created dynamically and cleaned up on dispose().
 */

import { blockRegistry } from '../world/blocks/BlockRegistry.js';
import { structureRegistry } from '../editor/StructureRegistry.js';

const EQUIP_SLOTS = [
    { value: 'head',      label: 'Head' },
    { value: 'chest',     label: 'Chest' },
    { value: 'legs',      label: 'Legs' },
    { value: 'feet',      label: 'Feet' },
    { value: 'hands',     label: 'Hands' },
    { value: 'main_hand', label: 'Main Hand' },
    { value: 'off_hand',  label: 'Off Hand' },
];

const PRESET_COLORS = [
    [200, 60, 60], [220, 120, 40], [220, 200, 50], [60, 180, 60],
    [50, 160, 200], [60, 80, 200], [160, 60, 200], [200, 80, 160],
    [240, 240, 240], [180, 180, 180], [120, 120, 120], [40, 40, 40],
    [140, 100, 60], [80, 60, 40], [206, 206, 210], [244, 208, 48],
    [142, 142, 148], [150, 100, 60], [120, 84, 48], [52, 148, 36],
];

const STAMP_SHAPES = [
    { key: 'single',   label: 'Voxel',    hotkey: '1' },
    { key: 'sphere',   label: 'Sphere',   hotkey: '2' },
    { key: 'cylinder', label: 'Cylinder', hotkey: '3' },
    { key: 'cone',     label: 'Cone',     hotkey: '4' },
    { key: 'box',      label: 'Box',      hotkey: '5' },
    { key: 'wedge',    label: 'Wedge',    hotkey: '6' },
];

const OBJ_SHAPES = [
    { key: 'box',      label: 'Box' },
    { key: 'sphere',   label: 'Sphere' },
    { key: 'cylinder', label: 'Cylinder' },
    { key: 'cone',     label: 'Cone' },
    { key: 'torus',    label: 'Torus' },
    { key: 'wedge',    label: 'Wedge' },
    { key: 'tube',     label: 'Curve' },
];

/** Per-shape parameter definitions for the properties panel. */
const SHAPE_PARAMS = {
    box:      [{ key: 'width', label: 'W', min: 0.1, max: 10, step: 0.1 }, { key: 'height', label: 'H', min: 0.1, max: 10, step: 0.1 }, { key: 'depth', label: 'D', min: 0.1, max: 10, step: 0.1 }],
    sphere:   [{ key: 'radius', label: 'Radius', min: 0.05, max: 5, step: 0.05 }],
    cylinder: [{ key: 'radiusTop', label: 'Top R', min: 0, max: 5, step: 0.05 }, { key: 'radiusBottom', label: 'Bot R', min: 0, max: 5, step: 0.05 }, { key: 'height', label: 'H', min: 0.1, max: 10, step: 0.1 }],
    cone:     [{ key: 'radius', label: 'Radius', min: 0.05, max: 5, step: 0.05 }, { key: 'height', label: 'H', min: 0.1, max: 10, step: 0.1 }],
    torus:    [{ key: 'radius', label: 'Radius', min: 0.1, max: 5, step: 0.05 }, { key: 'tube', label: 'Tube', min: 0.01, max: 2, step: 0.01 }],
    wedge:    [{ key: 'width', label: 'W', min: 0.1, max: 10, step: 0.1 }, { key: 'height', label: 'H', min: 0.1, max: 10, step: 0.1 }, { key: 'depth', label: 'D', min: 0.1, max: 10, step: 0.1 }],
    tube:     [{ key: 'length', label: 'Length', min: 0.1, max: 5, step: 0.05 }, { key: 'radius', label: 'Radius', min: 0.01, max: 1, step: 0.01 }, { key: 'bend', label: 'Bend', min: -1.5, max: 1.5, step: 0.05 }, { key: 'taper', label: 'Taper', min: 0, max: 1, step: 0.05 }],
};

export class DesignerUI {
    constructor(designer) {
        this.designer = designer;
        this.overlay = null;
        this.viewport = null;
        this.els = {};
        this._build();
    }

    getViewport() { return this.viewport; }

    // ── Build DOM ───────────────────────────────────────────

    _build() {
        this.overlay = document.createElement('div');
        this.overlay.id = 'voxel-designer-overlay';

        this.viewport = document.createElement('div');
        this.viewport.id = 'vd-viewport';
        this.overlay.appendChild(this.viewport);

        const panel = document.createElement('div');
        panel.id = 'vd-panel';
        this.overlay.appendChild(panel);

        // Title
        this._addEl(panel, 'div', 'vd-title', 'Asset Designer');

        // ── Mode Toggle ──
        const modeRow = document.createElement('div');
        modeRow.className = 'vd-mode-toggle';
        this.els.modeBtns = {};
        for (const m of ['voxel', 'object']) {
            const btn = document.createElement('button');
            btn.className = 'vd-mode-btn';
            btn.textContent = m === 'voxel' ? 'Voxel' : 'Object';
            btn.title = 'Tab to toggle';
            btn.addEventListener('click', () => this.designer.setEditorMode(m));
            modeRow.appendChild(btn);
            this.els.modeBtns[m] = btn;
        }
        panel.appendChild(modeRow);
        this.updateEditorMode(this.designer.editorMode);

        // ═══════════════════════════════════════════════════════
        //  VOXEL MODE PANEL
        // ═══════════════════════════════════════════════════════
        this.els.voxelPanel = document.createElement('div');
        this.els.voxelPanel.className = 'vd-mode-panel';
        panel.appendChild(this.els.voxelPanel);
        const vp = this.els.voxelPanel;

        // Grid Size
        vp.appendChild(this._sectionTitle('Grid Size'));
        const gridRow = document.createElement('div');
        gridRow.className = 'vd-tool-row';
        this.els.gridBtns = {};
        for (const size of [16, 24, 32]) {
            const btn = document.createElement('button');
            btn.className = 'vd-tool-btn';
            btn.textContent = `${size}`;
            btn.title = `${size}x${size}x${size}`;
            btn.addEventListener('click', () => {
                this.designer.setGridSize(size);
                this._updateGridSize(size);
            });
            gridRow.appendChild(btn);
            this.els.gridBtns[size] = btn;
        }
        vp.appendChild(gridRow);
        this._updateGridSize(this.designer.gridSize);

        // Tools
        vp.appendChild(this._sectionTitle('Tools'));
        const toolRow = document.createElement('div');
        toolRow.className = 'vd-tool-row';
        const tools = [
            { key: 'paint', label: 'Paint (P)' },
            { key: 'erase', label: 'Erase (E)' },
            { key: 'eyedropper', label: 'Pick (I)' },
        ];
        this.els.toolBtns = {};
        for (const t of tools) {
            const btn = document.createElement('button');
            btn.className = 'vd-tool-btn';
            btn.title = t.label;
            btn.textContent = t.key.charAt(0).toUpperCase() + t.key.slice(1);
            btn.addEventListener('click', () => this.designer.setTool(t.key));
            toolRow.appendChild(btn);
            this.els.toolBtns[t.key] = btn;
        }
        vp.appendChild(toolRow);
        this.updateTool(this.designer.currentTool);

        // Shapes (stamps)
        vp.appendChild(this._sectionTitle('Shape Stamp'));
        const shapeRow = document.createElement('div');
        shapeRow.className = 'vd-shape-row';
        this.els.shapeBtns = {};
        for (const s of STAMP_SHAPES) {
            const btn = document.createElement('button');
            btn.className = 'vd-shape-btn';
            btn.title = `${s.label} (${s.hotkey})`;
            btn.textContent = s.label;
            btn.addEventListener('click', () => this.designer.setStampShape(s.key));
            shapeRow.appendChild(btn);
            this.els.shapeBtns[s.key] = btn;
        }
        vp.appendChild(shapeRow);
        this.updateStampShape(this.designer.stampShape);

        const stampSizeBox = document.createElement('div');
        stampSizeBox.className = 'vd-slider-box';
        const rRow = this._buildSliderRow('Radius', 1, 8, this.designer.stampRadius, (v) => {
            this.designer.setStampRadius(v);
        });
        stampSizeBox.appendChild(rRow.row);
        this.els.stampRadiusSlider = rRow;
        const hRow = this._buildSliderRow('Height', 1, 16, this.designer.stampHeight, (v) => {
            this.designer.setStampHeight(v);
        });
        stampSizeBox.appendChild(hRow.row);
        this.els.stampHeightSlider = hRow;
        vp.appendChild(stampSizeBox);

        // Voxel Color Picker
        vp.appendChild(this._sectionTitle('Color'));
        const presets = document.createElement('div');
        presets.className = 'vd-presets';
        for (const [r, g, b] of PRESET_COLORS) {
            const sw = document.createElement('div');
            sw.className = 'vd-preset-swatch';
            sw.style.backgroundColor = `rgb(${r},${g},${b})`;
            sw.addEventListener('click', () => this.designer.setColor(r, g, b));
            presets.appendChild(sw);
        }
        vp.appendChild(presets);

        const sliderBox = document.createElement('div');
        sliderBox.className = 'vd-slider-box';
        this.els.sliders = {};
        for (const ch of ['r', 'g', 'b']) {
            const { row, slider, val } = this._buildSliderRow(
                ch.toUpperCase(), 0, 255, this.designer.currentColor[ch],
                (v) => {
                    const c = this.designer.currentColor;
                    c[ch] = v;
                    this.designer.setColor(c.r, c.g, c.b);
                }
            );
            sliderBox.appendChild(row);
            this.els.sliders[ch] = { slider, val };
        }
        vp.appendChild(sliderBox);

        this.els.colorPreview = document.createElement('div');
        this.els.colorPreview.className = 'vd-color-preview';
        vp.appendChild(this.els.colorPreview);
        this.updateColorPreview(
            this.designer.currentColor.r,
            this.designer.currentColor.g,
            this.designer.currentColor.b
        );

        // Layer Controls
        vp.appendChild(this._sectionTitle('Layer'));
        const layerRow = document.createElement('div');
        layerRow.className = 'vd-layer-row';
        const downBtn = document.createElement('button');
        downBtn.className = 'vd-sm-btn';
        downBtn.textContent = '\u25bc';
        downBtn.addEventListener('click', () => {
            this.designer.setLayer(Math.max(0, this.designer.currentLayer - 1));
        });
        this.els.layerLabel = document.createElement('span');
        this.els.layerLabel.className = 'vd-layer-label';
        this.els.layerLabel.textContent = `Y: ${this.designer.currentLayer}`;
        const upBtn = document.createElement('button');
        upBtn.className = 'vd-sm-btn';
        upBtn.textContent = '\u25b2';
        upBtn.addEventListener('click', () => {
            this.designer.setLayer(
                Math.min(this.designer.model.height - 1, this.designer.currentLayer + 1)
            );
        });
        this.els.layerToggle = document.createElement('button');
        this.els.layerToggle.className = 'vd-sm-btn vd-layer-toggle';
        this.els.layerToggle.textContent = 'All';
        this.els.layerToggle.title = 'Toggle layers (L)';
        this.els.layerToggle.addEventListener('click', () => {
            this.designer.showAllLayers = !this.designer.showAllLayers;
            this.designer._rebuildMesh();
            this.updateLayerToggle(this.designer.showAllLayers);
        });
        layerRow.appendChild(downBtn);
        layerRow.appendChild(this.els.layerLabel);
        layerRow.appendChild(upBtn);
        layerRow.appendChild(this.els.layerToggle);
        vp.appendChild(layerRow);

        // Voxel Info
        vp.appendChild(this._sectionTitle('Info'));
        this.els.voxelCount = document.createElement('div');
        this.els.voxelCount.className = 'vd-info';
        this.els.voxelCount.textContent = `Voxels: ${this.designer.model.count}`;
        vp.appendChild(this.els.voxelCount);

        // ═══════════════════════════════════════════════════════
        //  OBJECT MODE PANEL
        // ═══════════════════════════════════════════════════════
        this.els.objectPanel = document.createElement('div');
        this.els.objectPanel.className = 'vd-mode-panel';
        this.els.objectPanel.style.display = 'none';
        panel.appendChild(this.els.objectPanel);
        const op = this.els.objectPanel;

        // Shape palette
        op.appendChild(this._sectionTitle('Place Shape'));
        const objShapeRow = document.createElement('div');
        objShapeRow.className = 'vd-shape-row';
        this.els.objShapeBtns = {};
        for (const s of OBJ_SHAPES) {
            const btn = document.createElement('button');
            btn.className = 'vd-shape-btn';
            btn.textContent = s.label;
            btn.addEventListener('click', () => this.designer.setSelectedShape(s.key));
            objShapeRow.appendChild(btn);
            this.els.objShapeBtns[s.key] = btn;
        }
        op.appendChild(objShapeRow);
        this.updateSelectedShape(this.designer.selectedShape);

        // Gizmo mode
        op.appendChild(this._sectionTitle('Gizmo'));
        const gizmoRow = document.createElement('div');
        gizmoRow.className = 'vd-tool-row';
        this.els.gizmoBtns = {};
        for (const m of [
            { key: 'translate', label: 'Move (G)' },
            { key: 'rotate', label: 'Rotate (R)' },
            { key: 'scale', label: 'Scale (S)' },
        ]) {
            const btn = document.createElement('button');
            btn.className = 'vd-tool-btn';
            btn.textContent = m.label;
            btn.addEventListener('click', () => {
                this.designer.objectScene.setGizmoMode(m.key);
                this.updateGizmoMode(m.key);
            });
            gizmoRow.appendChild(btn);
            this.els.gizmoBtns[m.key] = btn;
        }
        op.appendChild(gizmoRow);
        this.updateGizmoMode('translate');

        // Group / mirror actions (operate on current selection)
        op.appendChild(this._sectionTitle('Selection'));
        const selRow = document.createElement('div');
        selRow.className = 'vd-tool-row';
        selRow.appendChild(this._button('Group', 'vd-tool-btn', () => this.designer._objGroup()));
        selRow.appendChild(this._button('Ungroup', 'vd-tool-btn', () => this.designer._objUngroup()));
        selRow.appendChild(this._button('Mirror X', 'vd-tool-btn', () => this.designer._objMirrorX()));
        op.appendChild(selRow);

        // Object properties (shown when selected)
        op.appendChild(this._sectionTitle('Properties'));
        this.els.objPropsContainer = document.createElement('div');
        this.els.objPropsContainer.className = 'vd-obj-props';
        this.els.objPropsContainer.innerHTML = '<div class="vd-info" style="opacity:0.5">Click an object to select it</div>';
        op.appendChild(this.els.objPropsContainer);

        // Object list
        op.appendChild(this._sectionTitle('Objects'));
        this.els.objList = document.createElement('div');
        this.els.objList.className = 'vd-obj-list';
        this.els.objList.innerHTML = '<div class="vd-info" style="opacity:0.5">Click in scene to place shapes</div>';
        op.appendChild(this.els.objList);

        // Object count
        this.els.objCount = document.createElement('div');
        this.els.objCount.className = 'vd-info';
        this.els.objCount.textContent = 'Objects: 0';
        op.appendChild(this.els.objCount);

        // ═══════════════════════════════════════════════════════
        //  SHARED SECTIONS
        // ═══════════════════════════════════════════════════════

        // Character Preview
        panel.appendChild(this._sectionTitle('Character Preview'));
        const previewRow = document.createElement('div');
        previewRow.className = 'vd-layer-row';
        this.els.mannequinToggle = document.createElement('button');
        this.els.mannequinToggle.className = 'vd-sm-btn';
        this.els.mannequinToggle.textContent = 'Show (M)';
        this.els.mannequinToggle.addEventListener('click', () => {
            this.designer.toggleMannequin();
            this.updateMannequinToggle(this.designer.showMannequin);
        });
        previewRow.appendChild(this.els.mannequinToggle);
        this.els.previewSlot = document.createElement('select');
        this.els.previewSlot.className = 'vd-select';
        for (const s of EQUIP_SLOTS) {
            const opt = document.createElement('option');
            opt.value = s.value;
            opt.textContent = s.label;
            this.els.previewSlot.appendChild(opt);
        }
        this.els.previewSlot.value = this.designer.exportSlot;
        this.els.previewSlot.addEventListener('change', () => {
            this.designer.setExportSlot(this.els.previewSlot.value);
        });
        previewRow.appendChild(this.els.previewSlot);
        panel.appendChild(previewRow);

        const scaleRow = this._buildSliderRow('Scale', 2, 10, this.designer.voxelScale * 100, (v) => {
            this.designer.setVoxelScale(v / 100);
            this.els.scaleLabel.textContent = `1 unit = ${(v / 100).toFixed(2)}`;
        });
        panel.appendChild(scaleRow.row);
        this.els.scaleSlider = scaleRow;
        this.els.scaleLabel = document.createElement('div');
        this.els.scaleLabel.className = 'vd-info';
        this.els.scaleLabel.textContent = `1 unit = ${this.designer.voxelScale.toFixed(2)}`;
        panel.appendChild(this.els.scaleLabel);

        // Save/Export
        panel.appendChild(this._sectionTitle('Save & Export'));
        const nameRow = document.createElement('div');
        nameRow.className = 'vd-name-row';
        nameRow.appendChild(this._label('Name: '));
        this.els.nameInput = document.createElement('input');
        this.els.nameInput.type = 'text';
        this.els.nameInput.className = 'vd-name-input';
        this.els.nameInput.placeholder = 'My Design';
        this.els.nameInput.value = 'Untitled';
        nameRow.appendChild(this.els.nameInput);
        panel.appendChild(nameRow);

        const typeRow = document.createElement('div');
        typeRow.className = 'vd-type-row';
        typeRow.appendChild(this._label('Export as: '));
        this.els.typeSelect = document.createElement('select');
        this.els.typeSelect.className = 'vd-select';
        const assetOpt = document.createElement('option');
        assetOpt.value = 'asset';
        assetOpt.textContent = 'World Asset';
        this.els.typeSelect.appendChild(assetOpt);
        for (const s of EQUIP_SLOTS) {
            const opt = document.createElement('option');
            opt.value = s.value;
            opt.textContent = `Equipment: ${s.label}`;
            this.els.typeSelect.appendChild(opt);
        }
        typeRow.appendChild(this.els.typeSelect);
        panel.appendChild(typeRow);

        const btnRow = document.createElement('div');
        btnRow.className = 'vd-btn-row';
        btnRow.appendChild(this._button('Save Design', 'vd-btn vd-btn-primary', () => this._onSave()));
        btnRow.appendChild(this._button('Export & Use', 'vd-btn vd-btn-export', () => this._onExport()));
        btnRow.appendChild(this._button('Clear All', 'vd-btn vd-btn-danger', () => this._onClear()));
        panel.appendChild(btnRow);

        // Saved Designs
        panel.appendChild(this._sectionTitle('Saved Designs'));
        this.els.designList = document.createElement('div');
        this.els.designList.className = 'vd-design-list';
        panel.appendChild(this.els.designList);
        this._refreshDesignList();

        // Hotkeys
        panel.appendChild(this._sectionTitle('Hotkeys'));
        this.els.hintsDiv = document.createElement('div');
        this.els.hintsDiv.className = 'vd-hints';
        panel.appendChild(this.els.hintsDiv);
        this._updateHotkeys();

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.className = 'vd-close-btn';
        closeBtn.textContent = '\u00d7';
        closeBtn.title = 'Close (Esc)';
        closeBtn.addEventListener('click', () => this.designer.hide());
        this.overlay.appendChild(closeBtn);

        document.body.appendChild(this.overlay);
    }

    // ── DOM Helpers ──────────────────────────────────────────

    _sectionTitle(text) {
        const el = document.createElement('div');
        el.className = 'vd-section-title';
        el.textContent = text;
        return el;
    }

    _addEl(parent, tag, cls, text) {
        const el = document.createElement(tag);
        el.className = cls;
        if (text) el.textContent = text;
        parent.appendChild(el);
        return el;
    }

    _label(text) {
        const el = document.createElement('label');
        el.textContent = text;
        el.style.fontSize = '11px';
        el.style.color = '#888';
        el.style.whiteSpace = 'nowrap';
        return el;
    }

    _button(text, cls, onClick) {
        const btn = document.createElement('button');
        btn.className = cls;
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        return btn;
    }

    _buildSliderRow(label, min, max, value, onChange) {
        const row = document.createElement('div');
        row.className = 'vd-slider-row';
        const lbl = document.createElement('span');
        lbl.className = 'vd-slider-label';
        lbl.textContent = label;
        lbl.style.width = '40px';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min; slider.max = max;
        slider.value = value;
        slider.className = 'vd-slider';
        const val = document.createElement('span');
        val.className = 'vd-slider-val';
        val.textContent = value;
        slider.addEventListener('input', () => {
            val.textContent = slider.value;
            onChange(parseInt(slider.value));
        });
        row.appendChild(lbl);
        row.appendChild(slider);
        row.appendChild(val);
        return { row, slider, val };
    }

    // ── Updates ──────────────────────────────────────────────

    updateTool(tool) {
        for (const [key, btn] of Object.entries(this.els.toolBtns)) {
            btn.classList.toggle('active', key === tool);
        }
    }

    updateStampShape(shape) {
        for (const [key, btn] of Object.entries(this.els.shapeBtns)) {
            btn.classList.toggle('active', key === shape);
        }
    }

    updateStampSize(radius, height) {
        this.els.stampRadiusSlider.slider.value = radius;
        this.els.stampRadiusSlider.val.textContent = radius;
        this.els.stampHeightSlider.slider.value = height;
        this.els.stampHeightSlider.val.textContent = height;
    }

    updateColorPreview(r, g, b) {
        this.els.colorPreview.style.backgroundColor = `rgb(${r},${g},${b})`;
        for (const ch of ['r', 'g', 'b']) {
            const v = ch === 'r' ? r : ch === 'g' ? g : b;
            this.els.sliders[ch].slider.value = v;
            this.els.sliders[ch].val.textContent = v;
        }
    }

    updateLayer(y) {
        this.els.layerLabel.textContent = `Y: ${y}`;
    }

    updateLayerToggle(showAll) {
        this.els.layerToggle.textContent = showAll ? 'All' : '1';
        this.els.layerToggle.classList.toggle('active', !showAll);
    }

    updateVoxelCount(count) {
        this.els.voxelCount.textContent = `Voxels: ${count}`;
    }

    updateMannequinToggle(visible) {
        this.els.mannequinToggle.textContent = visible ? 'Hide (M)' : 'Show (M)';
        this.els.mannequinToggle.classList.toggle('active', visible);
    }

    _updateGridSize(size) {
        for (const [s, btn] of Object.entries(this.els.gridBtns)) {
            btn.classList.toggle('active', parseInt(s) === size);
        }
    }

    // ── Object Mode Updates ─────────────────────────────────

    updateEditorMode(mode) {
        for (const [key, btn] of Object.entries(this.els.modeBtns)) {
            btn.classList.toggle('active', key === mode);
        }
        if (this.els.voxelPanel) this.els.voxelPanel.style.display = mode === 'voxel' ? '' : 'none';
        if (this.els.objectPanel) this.els.objectPanel.style.display = mode === 'object' ? '' : 'none';
        this._updateHotkeys();
    }

    updateSelectedShape(shape) {
        for (const [key, btn] of Object.entries(this.els.objShapeBtns)) {
            btn.classList.toggle('active', key === shape);
        }
    }

    updateGizmoMode(mode) {
        for (const [key, btn] of Object.entries(this.els.gizmoBtns)) {
            btn.classList.toggle('active', key === mode);
        }
    }

    updateObjectSelection(id, objDef) {
        const container = this.els.objPropsContainer;
        container.innerHTML = '';

        if (!id || !objDef) {
            container.innerHTML = '<div class="vd-info" style="opacity:0.5">Click an object to select it</div>';
            return;
        }

        const selCount = this.designer.objectScene?.selectedIds?.size ?? 1;
        if (selCount > 1) {
            const info = document.createElement('div');
            info.className = 'vd-info';
            info.innerHTML = `<b>${selCount} objects selected</b><br>Leader: ${objDef.type} (${objDef.id.replace('obj_', '#')})${objDef.groupId ? ` &middot; group ${objDef.groupId}` : ''}`;
            info.style.marginBottom = '6px';
            container.appendChild(info);
            const hint = document.createElement('div');
            hint.className = 'vd-info';
            hint.style.opacity = '0.6';
            hint.textContent = 'Per-object properties hidden in multi-select. Use the gizmo to transform together.';
            container.appendChild(hint);
            return;
        }

        // Type label (single-select)
        const typeLabel = document.createElement('div');
        typeLabel.className = 'vd-info';
        typeLabel.textContent = `${objDef.type.charAt(0).toUpperCase() + objDef.type.slice(1)} (${objDef.id})${objDef.groupId ? ` · group ${objDef.groupId}` : ''}${objDef.mirror ? ' · mirrored' : ''}`;
        typeLabel.style.marginBottom = '6px';
        container.appendChild(typeLabel);

        // Geometry params
        const paramDefs = SHAPE_PARAMS[objDef.type] || [];
        for (const p of paramDefs) {
            const { row } = this._buildFloatSliderRow(p.label, p.min, p.max, p.step, objDef.params[p.key] ?? 1, (v) => {
                this.designer.objUpdateParams(id, { [p.key]: v });
            });
            container.appendChild(row);
        }

        // Color
        container.appendChild(this._sectionTitle('Color'));
        const colorPresets = document.createElement('div');
        colorPresets.className = 'vd-presets';
        for (const [r, g, b] of PRESET_COLORS) {
            const sw = document.createElement('div');
            sw.className = 'vd-preset-swatch';
            sw.style.backgroundColor = `rgb(${r},${g},${b})`;
            sw.addEventListener('click', () => {
                this.designer.objUpdateMaterial(id, { color: [r, g, b] });
                this.updateObjectSelection(id, this.designer.objectModel.get(id));
            });
            colorPresets.appendChild(sw);
        }
        container.appendChild(colorPresets);

        // Material sliders
        const { row: metalRow } = this._buildFloatSliderRow('Metal', 0, 1, 0.05, objDef.material.metalness, (v) => {
            this.designer.objUpdateMaterial(id, { metalness: v });
        });
        container.appendChild(metalRow);

        const { row: roughRow } = this._buildFloatSliderRow('Rough', 0, 1, 0.05, objDef.material.roughness, (v) => {
            this.designer.objUpdateMaterial(id, { roughness: v });
        });
        container.appendChild(roughRow);

        // Emissive
        container.appendChild(this._sectionTitle('Emissive (glow)'));
        const emPresets = document.createElement('div');
        emPresets.className = 'vd-presets';
        // Black = no emissive, plus a few common glow colors
        const EMISSIVE_PRESETS = [
            [0, 0, 0], [255, 255, 255], [255, 220, 100], [255, 60, 60],
            [60, 200, 255], [60, 255, 120], [200, 60, 255], [255, 140, 30],
        ];
        for (const [r, g, b] of EMISSIVE_PRESETS) {
            const sw = document.createElement('div');
            sw.className = 'vd-preset-swatch';
            sw.style.backgroundColor = `rgb(${r},${g},${b})`;
            if (r === 0 && g === 0 && b === 0) {
                sw.style.outline = '1px dashed #888';
                sw.title = 'No emissive';
            }
            sw.addEventListener('click', () => {
                this.designer.objUpdateMaterial(id, { emissive: [r, g, b] });
                this.updateObjectSelection(id, this.designer.objectModel.get(id));
            });
            emPresets.appendChild(sw);
        }
        container.appendChild(emPresets);

        const { row: emIntRow } = this._buildFloatSliderRow('Glow', 0, 3, 0.05, objDef.material.emissiveIntensity ?? 0, (v) => {
            this.designer.objUpdateMaterial(id, { emissiveIntensity: v });
        });
        container.appendChild(emIntRow);

        // Per-face colors (box only)
        if (objDef.type === 'box') {
            container.appendChild(this._sectionTitle('Per-Face Colors'));
            const hasFaces = Array.isArray(objDef.material.faceColors) && objDef.material.faceColors.length === 6;
            const FACE_LABELS = ['Right (+X)', 'Left (-X)', 'Top (+Y)', 'Bottom (-Y)', 'Front (+Z)', 'Back (-Z)'];

            const toggleRow = document.createElement('div');
            toggleRow.className = 'vd-tool-row';
            toggleRow.appendChild(this._button(hasFaces ? 'Disable Per-Face' : 'Enable Per-Face', 'vd-tool-btn', () => {
                if (hasFaces) {
                    this.designer.objUpdateMaterial(id, { faceColors: null });
                } else {
                    const c = objDef.material.color;
                    this.designer.objUpdateMaterial(id, { faceColors: [c.slice(), c.slice(), c.slice(), c.slice(), c.slice(), c.slice()] });
                }
                this.updateObjectSelection(id, this.designer.objectModel.get(id));
            }));
            container.appendChild(toggleRow);

            if (hasFaces) {
                const hint = document.createElement('div');
                hint.className = 'vd-info';
                hint.style.opacity = '0.7';
                hint.style.fontSize = '10px';
                hint.textContent = 'Click a face to apply current Color above.';
                container.appendChild(hint);

                const faceGrid = document.createElement('div');
                faceGrid.className = 'vd-shape-row';
                for (let i = 0; i < 6; i++) {
                    const c = objDef.material.faceColors[i];
                    const btn = document.createElement('button');
                    btn.className = 'vd-shape-btn';
                    btn.style.background = `rgb(${c[0]},${c[1]},${c[2]})`;
                    btn.style.color = (c[0] + c[1] + c[2] > 380) ? '#000' : '#fff';
                    btn.style.fontSize = '9px';
                    btn.title = FACE_LABELS[i];
                    btn.textContent = FACE_LABELS[i].split(' ')[0];
                    btn.addEventListener('click', () => {
                        const newFaces = objDef.material.faceColors.map(c => c.slice());
                        newFaces[i] = objDef.material.color.slice();
                        this.designer.objUpdateMaterial(id, { faceColors: newFaces });
                        this.updateObjectSelection(id, this.designer.objectModel.get(id));
                    });
                    faceGrid.appendChild(btn);
                }
                container.appendChild(faceGrid);
            }
        }

        // Action buttons
        const actRow = document.createElement('div');
        actRow.className = 'vd-btn-row';
        actRow.style.marginTop = '6px';
        actRow.appendChild(this._button('Duplicate (D)', 'vd-sm-btn', () => {
            this.designer._objDuplicate(id);
        }));
        actRow.appendChild(this._button('Delete (X)', 'vd-sm-btn vd-btn-danger', () => {
            this.designer._objRemove(id);
        }));
        container.appendChild(actRow);
    }

    updateObjectProperties(objDef) {
        // Called when gizmo moves an object — lightweight update without rebuilding entire panel
        // Full rebuild only on selection change
    }

    updateObjectList(objects) {
        const list = this.els.objList;
        list.innerHTML = '';
        this.els.objCount.textContent = `Objects: ${objects.length}`;

        if (objects.length === 0) {
            list.innerHTML = '<div class="vd-info" style="opacity:0.5">Click in scene to place shapes</div>';
            return;
        }

        for (const obj of objects) {
            const row = document.createElement('div');
            row.className = 'vd-obj-list-item';
            if (this.designer.objectScene?.isSelected(obj.id)) {
                row.classList.add('selected');
            }

            const nameSpan = document.createElement('span');
            nameSpan.className = 'vd-design-name';
            const groupTag = obj.groupId ? ` <span style="opacity:0.6">[${obj.groupId}]</span>` : '';
            const mirrorTag = obj.mirror ? ' <span style="opacity:0.6">⇋</span>' : '';
            nameSpan.innerHTML = `${obj.type} (${obj.id.replace('obj_', '#')})${groupTag}${mirrorTag}`;
            nameSpan.style.cursor = 'pointer';
            nameSpan.addEventListener('click', (ev) => {
                if (ev.shiftKey) {
                    this.designer.objectScene.toggleInSelection(obj.id);
                } else {
                    const ids = obj.groupId
                        ? this.designer.objectModel.getGroupMembers(obj.groupId)
                        : [obj.id];
                    this.designer.objectScene.setSelection(ids, obj.id);
                }
                this.updateObjectSelection(this.designer.objectScene.leaderId, this.designer.objectModel.get(this.designer.objectScene.leaderId));
                this.updateObjectList(this.designer.objectModel.getAll());
            });

            const delBtn = this._button('\u00d7', 'vd-sm-btn vd-btn-danger', () => {
                this.designer._objRemove(obj.id);
            });

            row.appendChild(nameSpan);
            row.appendChild(delBtn);
            list.appendChild(row);
        }
    }

    _updateHotkeys() {
        if (!this.els.hintsDiv) return;
        if (this.designer.editorMode === 'voxel') {
            this.els.hintsDiv.innerHTML = [
                'Tab: Switch to Object mode',
                'Right-drag: Orbit &nbsp; Scroll: Zoom',
                'P / E / I: Paint / Erase / Pick',
                '1-6: Shape stamp',
                '[ ] : Layer up/down &nbsp; L: Toggle layers',
                'M: Mannequin &nbsp; Ctrl+Z/Y: Undo/Redo',
            ].join('<br>');
        } else {
            this.els.hintsDiv.innerHTML = [
                'Tab: Switch to Voxel mode',
                'Left-click: Place / Select &nbsp; <b>Shift+click</b>: Multi-select toggle',
                'Click on grouped: selects whole group',
                '<b>G / R / S</b>: Grab / Rotate / Scale (move mouse, click to confirm)',
                '&nbsp;&nbsp;X / Y / Z while G/R/S: lock to axis &nbsp; Esc: cancel',
                'D: Duplicate &nbsp; <b>Shift+D</b>: Duplicate &amp; grab',
                'X / Del: Delete &nbsp; Right-drag: Orbit &nbsp; Scroll: Zoom',
                '<b>Shift+1/2/3</b>: Mannequin / Door / 5m footprint',
                'M: Mannequin &nbsp; Ctrl+Z/Y: Undo/Redo',
            ].join('<br>');
        }
    }

    /** Slider row for float values (step-based). */
    _buildFloatSliderRow(label, min, max, step, value, onChange) {
        const row = document.createElement('div');
        row.className = 'vd-slider-row';
        const lbl = document.createElement('span');
        lbl.className = 'vd-slider-label';
        lbl.textContent = label;
        lbl.style.width = '40px';
        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = min; slider.max = max; slider.step = step;
        slider.value = value;
        slider.className = 'vd-slider';
        const val = document.createElement('span');
        val.className = 'vd-slider-val';
        val.textContent = parseFloat(value).toFixed(2);
        slider.addEventListener('input', () => {
            val.textContent = parseFloat(slider.value).toFixed(2);
            onChange(parseFloat(slider.value));
        });
        row.appendChild(lbl);
        row.appendChild(slider);
        row.appendChild(val);
        return { row, slider, val };
    }

    // ── Save / Export ───────────────────────────────────────

    _onSave() {
        const name = this.els.nameInput.value.trim() || 'Untitled';
        const type = this.els.typeSelect.value;
        this.designer.saveDesign(name, type);
        this._refreshDesignList();
        this._showToast(`Design "${name}" saved!`);
    }

    _onExport() {
        const name = this.els.nameInput.value.trim() || 'Untitled';
        const type = this.els.typeSelect.value;

        // Check if there's anything to export
        const hasVoxels = this.designer.model.count > 0;
        const hasObjects = this.designer.objectModel.count > 0;
        if (!hasVoxels && !hasObjects) return;

        this.designer.saveDesign(name, type);

        if (this.designer.editorMode === 'object' && hasObjects && type !== 'asset') {
            // Object mode: export as equipment using primitive pieces
            this._exportObjectEquipment(name, type);
        } else if (type === 'asset') {
            this._exportAsAsset(name);
        } else {
            this._exportAsEquipment(name, type);
        }
        this._refreshDesignList();
    }

    _exportAsAsset(name) {
        const blocks = [];
        this.designer.model.forEach((x, y, z, color) => {
            const blockId = this._nearestBlockId(color.r, color.g, color.b);
            blocks.push({ x, y, z, blockId });
        });

        structureRegistry.addUserStructure({
            id: 'user_' + Date.now(),
            name,
            category: 'Custom',
            blocks,
            icon: [blocks[0]?.blockId || 1, blocks[Math.floor(blocks.length / 2)]?.blockId || 1],
        });
        this._showToast(`Asset "${name}" added to structure palette!`);
    }

    _exportAsEquipment(name, slot) {
        const modelData = this.designer.model.serialize();
        const targetMap = {
            head: 'head', chest: 'torso', legs: 'upperRightLeg',
            feet: 'lowerRightLeg', hands: 'lowerRightArm',
            main_hand: 'lowerRightArm', off_hand: 'lowerLeftArm',
        };
        const offsetMap = {
            head: [0, 0.10, 0], chest: [0, 0, 0], legs: [0, 0, 0],
            feet: [0, -0.10, 0], hands: [0, -0.10, 0],
            main_hand: [0, -0.40, 0.06], off_hand: [0, -0.10, 0.12],
        };

        const equipDef = {
            slot,
            voxel: true,
            pieces: [{
                target: targetMap[slot] || 'torso',
                voxel: true,
                modelData,
                voxelScale: this.designer.voxelScale,
                offset: offsetMap[slot] || [0, 0, 0],
                color: 0xffffff,
                metalness: 0.3,
                roughness: 0.5,
            }],
        };

        const customEquip = JSON.parse(localStorage.getItem('custom_equipment') || '{}');
        const key = 'custom_' + Date.now();
        customEquip[key] = { name, def: equipDef };
        localStorage.setItem('custom_equipment', JSON.stringify(customEquip));

        this._showToast(`Equipment "${name}" exported as ${slot}! Key: ${key}`);
    }

    _exportObjectEquipment(name, slot) {
        const pieces = this.designer.getObjectEquipmentPieces(slot);
        if (pieces.length === 0) return;

        const equipDef = { slot, pieces };

        const customEquip = JSON.parse(localStorage.getItem('custom_equipment') || '{}');
        const key = 'custom_' + Date.now();
        customEquip[key] = { name, def: equipDef };
        localStorage.setItem('custom_equipment', JSON.stringify(customEquip));

        this._showToast(`Equipment "${name}" exported (${pieces.length} pieces)! Key: ${key}`);
    }

    _nearestBlockId(r, g, b) {
        let best = 1, bestDist = Infinity;
        for (let id = 1; id < 49; id++) {
            const block = blockRegistry.getBlock(id);
            if (!block || block.transparent) continue;
            const bc = block.color;
            const dr = bc[0] - r, dg = bc[1] - g, db = bc[2] - b;
            const dist = dr * dr + dg * dg + db * db;
            if (dist < bestDist) { bestDist = dist; best = id; }
        }
        return best;
    }

    _onClear() {
        this.designer.model.clear();
        this.designer._undoStack = [];
        this.designer._redoStack = [];
        this.designer._rebuildMesh();
        this.updateVoxelCount(0);

        // Clear objects too
        this.designer.objectModel.clear();
        this.designer._objUndoStack = [];
        this.designer._objRedoStack = [];
        if (this.designer.objectScene) this.designer.objectScene.clear();
        this.updateObjectList([]);
        this.updateObjectSelection(null, null);
    }

    _refreshDesignList() {
        const list = this.els.designList;
        list.innerHTML = '';
        const designs = this.designer.getSavedDesigns();

        if (designs.length === 0) {
            list.innerHTML = '<div class="vd-info" style="opacity:0.5">No saved designs</div>';
            return;
        }

        for (const d of designs.slice().reverse()) {
            const row = document.createElement('div');
            row.className = 'vd-design-row';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'vd-design-name';
            nameSpan.textContent = `${d.name} (${d.type})`;

            const loadBtn = this._button('Load', 'vd-sm-btn', () => {
                const loaded = this.designer.loadDesign(d.id);
                if (loaded) {
                    this.els.nameInput.value = loaded.name;
                    this.els.typeSelect.value = loaded.type;
                }
            });

            const delBtn = this._button('\u00d7', 'vd-sm-btn vd-btn-danger', () => {
                this.designer.deleteDesign(d.id);
                this._refreshDesignList();
            });

            row.appendChild(nameSpan);
            row.appendChild(loadBtn);
            row.appendChild(delBtn);
            list.appendChild(row);
        }
    }

    _showToast(msg) {
        const toast = document.createElement('div');
        toast.className = 'vd-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    dispose() {
        this.overlay?.remove();
        this.overlay = null;
    }
}
