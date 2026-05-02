/**
 * BlockPalette — block selection UI with categories and a hotbar.
 */

import { blockRegistry, BLOCKS } from '../world/blocks/BlockRegistry.js';

// Block categories for the palette
const CATEGORIES = {
    'Natural':    [1, 2, 3, 9, 8, 10, 11, 12, 24],   // stone, dirt, grass, sand, gravel, clay, sandstone, snow, moss
    'Wood':       [4, 5, 6, 27, 28],                   // oak_log, leaves, oak_planks, dark_oak_planks, birch_planks
    'Stone':      [7, 21, 25, 26, 29, 30],             // cobble, mossy_cobble, stone_brick, red_brick, terracotta, marble
    'Metal':      [13, 14, 43, 44, 45],                // iron_ore, gold_ore, iron_block, gold_block, copper_block
    'Colors':     [31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42], // wool colors
    'Functional': [16, 17, 18],                         // crafting_table, furnace, anvil
    'Lighting':   [19, 20],                             // torch, lantern
    'Decorative': [23, 15, 46, 47, 48],                // glass, water, tall_grass, flowers
};

// Default hotbar (first 9 most useful blocks)
const DEFAULT_HOTBAR = [3, 2, 1, 7, 6, 25, 26, 31, 9]; // grass, dirt, stone, cobble, oak_planks, stone_brick, red_brick, white_wool, sand

export class BlockPalette {
    constructor(editorSystem) {
        this.editor = editorSystem;
        this.hotbar = [...DEFAULT_HOTBAR];
        this.hotbarIndex = 0;

        // DOM refs
        this.paletteEl = document.getElementById('block-palette');
        this.hotbarEl = document.getElementById('editor-hotbar');

        this._buildPalette();
        this._buildHotbar();
    }

    _buildPalette() {
        this.paletteEl.innerHTML = '';

        for (const [catName, blockIds] of Object.entries(CATEGORIES)) {
            const cat = document.createElement('div');
            cat.className = 'palette-category';

            const title = document.createElement('div');
            title.className = 'palette-category-title';
            title.textContent = catName;
            cat.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'palette-grid';

            for (const id of blockIds) {
                const def = blockRegistry.getBlock(id);
                if (!def) continue;

                const block = document.createElement('div');
                block.className = 'palette-block';
                block.dataset.blockId = id;
                if (id === this.editor.selectedBlockId) block.classList.add('selected');

                const color = document.createElement('div');
                color.className = 'palette-color';
                color.style.backgroundColor = `rgb(${def.color[0]}, ${def.color[1]}, ${def.color[2]})`;
                block.appendChild(color);

                const name = document.createElement('span');
                name.className = 'palette-name';
                name.textContent = def.name.replace(/_/g, ' ');
                block.appendChild(name);

                block.addEventListener('click', () => {
                    this.editor.selectBlock(id);
                    this._addToHotbar(id);
                });

                grid.appendChild(block);
            }

            cat.appendChild(grid);
            this.paletteEl.appendChild(cat);
        }
    }

    _buildHotbar() {
        this.hotbarEl.innerHTML = '';

        for (let i = 0; i < 9; i++) {
            const slot = document.createElement('div');
            slot.className = 'hotbar-slot';
            if (i === this.hotbarIndex) slot.classList.add('active');

            const key = document.createElement('span');
            key.className = 'hotbar-key';
            key.textContent = i + 1;
            slot.appendChild(key);

            const blockId = this.hotbar[i];
            if (blockId !== undefined) {
                const def = blockRegistry.getBlock(blockId);
                if (def) {
                    const color = document.createElement('div');
                    color.className = 'hotbar-color';
                    color.style.backgroundColor = `rgb(${def.color[0]}, ${def.color[1]}, ${def.color[2]})`;
                    slot.appendChild(color);
                }
            }

            slot.addEventListener('click', () => {
                this.selectHotbarSlot(i);
            });

            this.hotbarEl.appendChild(slot);
        }
    }

    _addToHotbar(blockId) {
        // If already in hotbar, don't duplicate — just select it
        const existing = this.hotbar.indexOf(blockId);
        if (existing >= 0) {
            this.hotbarIndex = existing;
        } else {
            // Replace current slot
            this.hotbar[this.hotbarIndex] = blockId;
        }
        this._buildHotbar();
    }

    selectHotbarSlot(index) {
        if (index < 0 || index >= 9) return;
        this.hotbarIndex = index;
        const blockId = this.hotbar[index];
        if (blockId !== undefined) {
            this.editor.selectedBlockId = blockId;
        }
        this._buildHotbar();
        this._updatePaletteSelection();
    }

    cycleHotbar(dir) {
        this.hotbarIndex = ((this.hotbarIndex + dir) % 9 + 9) % 9;
        const blockId = this.hotbar[this.hotbarIndex];
        if (blockId !== undefined) {
            this.editor.selectedBlockId = blockId;
        }
        this._buildHotbar();
        this._updatePaletteSelection();
    }

    updateSelection(blockId) {
        this._updatePaletteSelection();
        this._buildHotbar();
    }

    _updatePaletteSelection() {
        const blocks = this.paletteEl.querySelectorAll('.palette-block');
        blocks.forEach(b => {
            b.classList.toggle('selected', parseInt(b.dataset.blockId) === this.editor.selectedBlockId);
        });
    }

    setVisible(visible) {
        if (visible) {
            this.paletteEl.classList.remove('hidden');
        } else {
            this.paletteEl.classList.add('hidden');
        }
    }

    showHotbar() {
        this.hotbarEl.classList.remove('hidden');
    }

    hideAll() {
        this.paletteEl.classList.add('hidden');
        this.hotbarEl.classList.add('hidden');
    }
}
