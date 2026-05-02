/**
 * BlockRegistry — defines every block type in the game.
 * Each block has an id (uint8 0-255), visual properties, and gameplay properties.
 */

const BLOCKS = [
    // id 0 — empty space
    { id: 0, name: 'air', color: [0, 0, 0], transparent: true, solid: false, breakable: false },

    // ── Natural ──
    { id: 1, name: 'stone',       color: [142, 142, 148], transparent: false, solid: true, breakable: true, breakTime: 3000, tool: 'pickaxe', drops: 'cobblestone' },
    { id: 2, name: 'dirt',        color: [150, 100, 60],  transparent: false, solid: true, breakable: true, breakTime: 1500, drops: 'dirt' },
    { id: 3, name: 'grass',       color: [118, 88, 54],   transparent: false, solid: true, breakable: true, breakTime: 1500, drops: 'dirt', topColor: [82, 168, 46] },
    { id: 4, name: 'oak_log',     color: [120, 84, 48],   transparent: false, solid: true, breakable: true, breakTime: 2500, tool: 'axe', drops: 'wood' },
    { id: 5, name: 'oak_leaves',  color: [52, 148, 36],   transparent: false, solid: true,  breakable: true, breakTime: 500, drops: null },
    { id: 6, name: 'oak_planks',  color: [186, 144, 84],  transparent: false, solid: true, breakable: true, breakTime: 2000, tool: 'axe', drops: 'oak_planks' },
    { id: 7, name: 'cobblestone', color: [128, 126, 124], transparent: false, solid: true, breakable: true, breakTime: 3000, tool: 'pickaxe', drops: 'cobblestone' },
    { id: 8, name: 'gravel',      color: [156, 148, 140], transparent: false, solid: true, breakable: true, breakTime: 1500, drops: 'gravel' },
    { id: 9, name: 'sand',        color: [230, 214, 160], transparent: false, solid: true, breakable: true, breakTime: 1200, drops: 'sand' },
    { id: 10, name: 'clay',       color: [168, 174, 184], transparent: false, solid: true, breakable: true, breakTime: 1500, drops: 'clay' },
    { id: 11, name: 'sandstone',  color: [224, 208, 156], transparent: false, solid: true, breakable: true, breakTime: 2500, tool: 'pickaxe', drops: 'sandstone' },
    { id: 12, name: 'snow',       color: [245, 248, 252], transparent: false, solid: true, breakable: true, breakTime: 800, drops: null },
    { id: 13, name: 'iron_ore',   color: [148, 136, 126], transparent: false, solid: true, breakable: true, breakTime: 4000, tool: 'pickaxe', drops: 'iron_ore' },
    { id: 14, name: 'gold_ore',   color: [156, 144, 100], transparent: false, solid: true, breakable: true, breakTime: 5000, tool: 'pickaxe', drops: 'gold_ore' },
    { id: 15, name: 'water',      color: [44, 120, 200],  transparent: true,  solid: false, breakable: false, alpha: 0.6 },

    // ── Crafting / functional ──
    { id: 16, name: 'crafting_table', color: [148, 108, 56], transparent: false, solid: true, breakable: true, breakTime: 2000, tool: 'axe', drops: 'crafting_table', station: 'crafting_table' },
    { id: 17, name: 'furnace',        color: [128, 128, 130], transparent: false, solid: true, breakable: true, breakTime: 3000, tool: 'pickaxe', drops: 'furnace', station: 'furnace' },
    { id: 18, name: 'anvil',          color: [80, 80, 86],    transparent: false, solid: true, breakable: true, breakTime: 4000, tool: 'pickaxe', drops: 'anvil', station: 'anvil' },

    // ── Lighting ──
    { id: 19, name: 'torch',   color: [220, 172, 60],  transparent: true, solid: false, breakable: true, breakTime: 200, drops: 'torch', emissive: true, emissiveColor: [255, 170, 50], lightLevel: 10 },
    { id: 20, name: 'lantern', color: [200, 152, 48],  transparent: true, solid: false, breakable: true, breakTime: 500, drops: 'lantern', emissive: true, emissiveColor: [255, 150, 30], lightLevel: 12 },

    // ── Structural / decorative ──
    { id: 21, name: 'mossy_cobblestone', color: [100, 138, 86],  transparent: false, solid: true, breakable: true, breakTime: 3000, tool: 'pickaxe', drops: 'cobblestone' },
    { id: 22, name: 'bedrock',           color: [42, 42, 44],    transparent: false, solid: true, breakable: false },
    { id: 23, name: 'glass',             color: [210, 228, 240], transparent: true,  solid: true,  breakable: true, breakTime: 300, drops: null, alpha: 0.3 },
    { id: 24, name: 'moss',              color: [62, 126, 42],   transparent: false, solid: true, breakable: true, breakTime: 1000, drops: null },

    // ── Building materials ──
    { id: 25, name: 'stone_brick',    color: [152, 152, 156], transparent: false, solid: true, breakable: true, breakTime: 3000, tool: 'pickaxe', drops: 'stone_brick' },
    { id: 26, name: 'red_brick',      color: [178, 82, 58],   transparent: false, solid: true, breakable: true, breakTime: 3000, tool: 'pickaxe', drops: 'red_brick' },
    { id: 27, name: 'dark_oak_planks', color: [84, 54, 30],   transparent: false, solid: true, breakable: true, breakTime: 2000, tool: 'axe', drops: 'dark_oak_planks' },
    { id: 28, name: 'birch_planks',   color: [210, 198, 168], transparent: false, solid: true, breakable: true, breakTime: 2000, tool: 'axe', drops: 'birch_planks' },
    { id: 29, name: 'terracotta',     color: [194, 126, 76],  transparent: false, solid: true, breakable: true, breakTime: 2500, tool: 'pickaxe', drops: 'terracotta' },
    { id: 30, name: 'marble',         color: [238, 236, 232], transparent: false, solid: true, breakable: true, breakTime: 3500, tool: 'pickaxe', drops: 'marble' },

    // ── Colored blocks ──
    { id: 31, name: 'white_wool',   color: [242, 242, 238], transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'white_wool' },
    { id: 32, name: 'red_wool',     color: [200, 46, 42],   transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'red_wool' },
    { id: 33, name: 'orange_wool',  color: [232, 140, 32],  transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'orange_wool' },
    { id: 34, name: 'yellow_wool',  color: [240, 212, 48],  transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'yellow_wool' },
    { id: 35, name: 'green_wool',   color: [60, 168, 48],   transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'green_wool' },
    { id: 36, name: 'blue_wool',    color: [46, 72, 186],   transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'blue_wool' },
    { id: 37, name: 'purple_wool',  color: [140, 52, 184],  transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'purple_wool' },
    { id: 38, name: 'black_wool',   color: [28, 28, 32],    transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'black_wool' },
    { id: 39, name: 'brown_wool',   color: [132, 80, 40],   transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'brown_wool' },
    { id: 40, name: 'cyan_wool',    color: [40, 172, 180],  transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'cyan_wool' },
    { id: 41, name: 'pink_wool',    color: [228, 136, 164], transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'pink_wool' },
    { id: 42, name: 'gray_wool',    color: [116, 116, 120], transparent: false, solid: true, breakable: true, breakTime: 800, drops: 'gray_wool' },

    // ── Metal / precious ──
    { id: 43, name: 'iron_block',   color: [206, 206, 210], transparent: false, solid: true, breakable: true, breakTime: 5000, tool: 'pickaxe', drops: 'iron_block' },
    { id: 44, name: 'gold_block',   color: [244, 208, 48],  transparent: false, solid: true, breakable: true, breakTime: 5000, tool: 'pickaxe', drops: 'gold_block' },
    { id: 45, name: 'copper_block', color: [206, 126, 72],  transparent: false, solid: true, breakable: true, breakTime: 5000, tool: 'pickaxe', drops: 'copper_block' },

    // ── Foliage / nature ──
    { id: 46, name: 'tall_grass',   color: [68, 156, 40], transparent: true, solid: false, breakable: true, breakTime: 100, drops: null },
    { id: 47, name: 'flower_red',   color: [220, 44, 36], transparent: true, solid: false, breakable: true, breakTime: 100, drops: null },
    { id: 48, name: 'flower_yellow', color: [248, 220, 44], transparent: true, solid: false, breakable: true, breakTime: 100, drops: null },
];

// One-time saturation bump (~18%) on block palette for a punchier, painterly look.
// Mutates color and topColor in place at module load.
function _rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return [h, s, l];
}
function _hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) { r = g = b = l; }
    else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
function _saturate(rgb, factor) {
    const [h, s, l] = _rgbToHsl(rgb[0], rgb[1], rgb[2]);
    return _hslToRgb(h, Math.min(1, s * factor), l);
}
for (const def of BLOCKS) {
    if (def.id === 0) continue;
    def.color = _saturate(def.color, 1.18);
    if (def.topColor) def.topColor = _saturate(def.topColor, 1.18);
}

class BlockRegistry {
    constructor() {
        this.byId = new Array(256).fill(null);
        this.byName = {};
        for (const def of BLOCKS) {
            this.byId[def.id] = def;
            this.byName[def.name] = def;
        }
    }

    getBlock(id) {
        return this.byId[id] || this.byId[0];
    }

    getByName(name) {
        return this.byName[name] || null;
    }

    isTransparent(id) {
        const b = this.byId[id];
        return !b || b.transparent;
    }

    isSolid(id) {
        const b = this.byId[id];
        return b ? b.solid : false;
    }

    /** Flat array of [id, r, g, b, transparent, solid, emissive, er, eg, eb] per block for workers */
    toFlatArray() {
        const arr = new Uint8Array(256 * 10);
        for (let i = 0; i < 256; i++) {
            const b = this.byId[i];
            if (!b) continue;
            const off = i * 10;
            arr[off] = b.id;
            arr[off + 1] = b.color[0];
            arr[off + 2] = b.color[1];
            arr[off + 3] = b.color[2];
            arr[off + 4] = b.transparent ? 1 : 0;
            arr[off + 5] = b.solid ? 1 : 0;
            arr[off + 6] = b.emissive ? 1 : 0;
            arr[off + 7] = b.emissiveColor ? b.emissiveColor[0] : 0;
            arr[off + 8] = b.emissiveColor ? b.emissiveColor[1] : 0;
            arr[off + 9] = b.emissiveColor ? b.emissiveColor[2] : 0;
        }
        return arr;
    }
}

// Singleton
export const blockRegistry = new BlockRegistry();

// Re-export raw definitions for worker transfer
export { BLOCKS };
