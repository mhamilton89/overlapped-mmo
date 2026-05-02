/**
 * AssetPalette — structure selection UI with categories.
 * Mirrors BlockPalette's visual style but selects multi-block structures.
 */

import { structureRegistry } from './StructureRegistry.js';
import { blockRegistry } from '../world/blocks/BlockRegistry.js';

export class AssetPalette {
    constructor(editorSystem) {
        this.editor = editorSystem;

        this.paletteEl = document.getElementById('asset-palette');
        if (!this.paletteEl) {
            // Create dynamically if not in HTML yet
            this.paletteEl = document.createElement('div');
            this.paletteEl.id = 'asset-palette';
            this.paletteEl.className = 'hidden';
            document.getElementById('hud')?.appendChild(this.paletteEl);
        }

        this._build();
    }

    _build() {
        this.paletteEl.innerHTML = '';

        const categories = structureRegistry.getCategories();

        for (const [catName, structures] of Object.entries(categories)) {
            const cat = document.createElement('div');
            cat.className = 'palette-category';

            const title = document.createElement('div');
            title.className = 'palette-category-title';
            title.textContent = catName;
            cat.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'palette-grid';

            for (const s of structures) {
                const entry = document.createElement('div');
                entry.className = 'palette-block asset-entry';
                entry.dataset.structureId = s.id;
                if (s.id === this.editor.selectedStructure) {
                    entry.classList.add('selected');
                }

                // Two-tone swatch from icon block colors
                const swatch = document.createElement('div');
                swatch.className = 'asset-swatch';

                const [iconA, iconB] = s.icon || [1, 1];
                const defA = blockRegistry.getBlock(iconA);
                const defB = blockRegistry.getBlock(iconB);

                const halfA = document.createElement('div');
                halfA.className = 'asset-swatch-half';
                halfA.style.backgroundColor = `rgb(${defA.color[0]}, ${defA.color[1]}, ${defA.color[2]})`;

                const halfB = document.createElement('div');
                halfB.className = 'asset-swatch-half';
                halfB.style.backgroundColor = `rgb(${defB.color[0]}, ${defB.color[1]}, ${defB.color[2]})`;

                swatch.appendChild(halfA);
                swatch.appendChild(halfB);
                entry.appendChild(swatch);

                const name = document.createElement('span');
                name.className = 'palette-name';
                name.textContent = s.name;
                entry.appendChild(name);

                entry.addEventListener('click', () => {
                    this.editor.selectStructure(s.id);
                });

                grid.appendChild(entry);
            }

            cat.appendChild(grid);
            this.paletteEl.appendChild(cat);
        }
    }

    updateSelection(structureId) {
        const entries = this.paletteEl.querySelectorAll('.asset-entry');
        entries.forEach(e => {
            e.classList.toggle('selected', e.dataset.structureId === structureId);
        });
    }

    setVisible(visible) {
        if (visible) {
            this.paletteEl.classList.remove('hidden');
        } else {
            this.paletteEl.classList.add('hidden');
        }
    }
}
