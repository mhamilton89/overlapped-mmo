/**
 * Armor visual definitions: maps item_key -> visual overlay pieces.
 *
 * Each entry has:
 *   slot: which equipment slot it goes in
 *   pieces: array of overlay shapes, each with:
 *     target: which body part to attach to (key in CharacterModel.parts)
 *     geo: { type: 'box'|'sphere'|'cylinder'|'cone', ...params } (optional, defaults to box with size)
 *     size: [w, h, d] for box geometry (legacy, used if no geo)
 *     offset: [x, y, z] offset from body part center (optional)
 *     rotation: [rx, ry, rz] in radians (optional)
 *     color: hex color
 *     metalness: 0-1 (default 0.6)
 *     roughness: 0-1 (default 0.4)
 */

// -- COLORS --
const IRON = 0x8a8a8a;
const DARK_IRON = 0x5a5a5a;
const STEEL = 0xb0b0b0;
const BRIGHT_STEEL = 0xc8c8d0;
const GOLD = 0xd4a843;
const DARK_GOLD = 0xa07828;
const LEATHER = 0x8b5e3c;
const DARK_LEATHER = 0x5c3a1e;
const CLOTH_BLUE = 0x2244aa;
const CLOTH_DARK_BLUE = 0x1a3388;
const CLOTH_PURPLE = 0x6633aa;
const CLOTH_WHITE = 0xccccdd;
const WOOD = 0x6b4226;
const DARK_WOOD = 0x4a2e1a;
const GREEN_LEATHER = 0x4a6b3a;
const DARK_GREEN = 0x2d4a22;
const CRYSTAL_BLUE = 0x44aaff;
const STRING_COLOR = 0xddddcc;

// ============================================================
//  HEAD ARMOR
// ============================================================

const iron_helm = {
    slot: 'head',
    pieces: [
        // Dome
        { target: 'head', geo: { type: 'sphere', radius: 0.36, wSeg: 14, hSeg: 10 }, offset: [0, 0.06, 0], color: IRON, metalness: 0.75, roughness: 0.25 },
        // Visor slit
        { target: 'head', size: [0.44, 0.07, 0.04], offset: [0, -0.06, 0.34], color: DARK_IRON, metalness: 0.8, roughness: 0.2 },
        // Nose guard
        { target: 'head', size: [0.05, 0.18, 0.04], offset: [0, -0.02, 0.34], color: DARK_IRON, metalness: 0.8, roughness: 0.2 },
        // Neck guard ring
        { target: 'head', geo: { type: 'cylinder', rTop: 0.34, rBot: 0.36, h: 0.1, seg: 14 }, offset: [0, -0.22, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        // Crest ridge
        { target: 'head', size: [0.04, 0.12, 0.4], offset: [0, 0.30, -0.02], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const wizard_hat = {
    slot: 'head',
    pieces: [
        // Wide brim (cylinder disc)
        { target: 'head', geo: { type: 'cylinder', rTop: 0.44, rBot: 0.44, h: 0.06, seg: 16 }, offset: [0, 0.22, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.9 },
        // Tall cone
        { target: 'head', geo: { type: 'cone', radius: 0.24, height: 0.6, seg: 14 }, offset: [0, 0.58, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.9 },
        // Tip ornament (sphere)
        { target: 'head', geo: { type: 'sphere', radius: 0.06, wSeg: 8, hSeg: 6 }, offset: [0, 0.90, 0], color: CRYSTAL_BLUE, metalness: 0.4, roughness: 0.2 },
        // Band around hat base
        { target: 'head', geo: { type: 'cylinder', rTop: 0.25, rBot: 0.25, h: 0.05, seg: 14 }, offset: [0, 0.30, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Star/buckle on front
        { target: 'head', size: [0.08, 0.08, 0.03], offset: [0, 0.30, 0.25], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const paladin_helm = {
    slot: 'head',
    pieces: [
        // Dome
        { target: 'head', geo: { type: 'sphere', radius: 0.36, wSeg: 14, hSeg: 10 }, offset: [0, 0.04, 0], color: BRIGHT_STEEL, metalness: 0.8, roughness: 0.2 },
        // Crest ridge (tall fin)
        { target: 'head', size: [0.04, 0.18, 0.36], offset: [0, 0.30, -0.02], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Gold cross - vertical
        { target: 'head', size: [0.05, 0.22, 0.04], offset: [0, 0.02, 0.34], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Gold cross - horizontal
        { target: 'head', size: [0.16, 0.05, 0.04], offset: [0, 0.08, 0.34], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Neck guard
        { target: 'head', geo: { type: 'cylinder', rTop: 0.34, rBot: 0.38, h: 0.12, seg: 14 }, offset: [0, -0.24, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Cheek guards
        { target: 'head', size: [0.08, 0.16, 0.04], offset: [-0.28, -0.10, 0.12], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        { target: 'head', size: [0.08, 0.16, 0.04], offset: [0.28, -0.10, 0.12], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
    ]
};

const ranger_hood = {
    slot: 'head',
    pieces: [
        // Hood shell (sphere)
        { target: 'head', geo: { type: 'sphere', radius: 0.36, wSeg: 12, hSeg: 8 }, offset: [0, 0.04, -0.02], color: GREEN_LEATHER, metalness: 0, roughness: 0.8 },
        // Pointed tip at top-back
        { target: 'head', geo: { type: 'cone', radius: 0.12, height: 0.2, seg: 8 }, offset: [0, 0.30, -0.10], color: DARK_GREEN, metalness: 0, roughness: 0.8 },
        // Face opening frame - top
        { target: 'head', size: [0.38, 0.05, 0.04], offset: [0, 0.14, 0.30], color: DARK_GREEN, metalness: 0.05, roughness: 0.75 },
        // Face opening frame - sides
        { target: 'head', size: [0.05, 0.26, 0.04], offset: [-0.18, -0.01, 0.30], color: DARK_GREEN, metalness: 0.05, roughness: 0.75 },
        { target: 'head', size: [0.05, 0.26, 0.04], offset: [0.18, -0.01, 0.30], color: DARK_GREEN, metalness: 0.05, roughness: 0.75 },
    ]
};

// ============================================================
//  CHEST ARMOR
// ============================================================

const iron_chestplate = {
    slot: 'chest',
    pieces: [
        // Main torso plate
        { target: 'torso', size: [0.76, 0.72, 0.50], offset: [0, 0, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        // Collar ring
        { target: 'torso', geo: { type: 'cylinder', rTop: 0.28, rBot: 0.32, h: 0.08, seg: 12 }, offset: [0, 0.36, 0], color: DARK_IRON, metalness: 0.75, roughness: 0.25 },
        // Left pauldron (sphere)
        { target: 'upperLeftArm', geo: { type: 'sphere', radius: 0.17, wSeg: 10, hSeg: 8 }, offset: [0, 0.06, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        // Right pauldron (sphere)
        { target: 'upperRightArm', geo: { type: 'sphere', radius: 0.17, wSeg: 10, hSeg: 8 }, offset: [0, 0.06, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        // Belt
        { target: 'torso', size: [0.78, 0.08, 0.52], offset: [0, -0.30, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Belt buckle
        { target: 'torso', size: [0.08, 0.08, 0.04], offset: [0, -0.30, 0.27], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Center chest ridge
        { target: 'torso', size: [0.06, 0.4, 0.04], offset: [0, 0.04, 0.26], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const wizard_robe = {
    slot: 'chest',
    pieces: [
        // Robe body
        { target: 'torso', size: [0.76, 0.76, 0.50], offset: [0, 0, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        // Collar / neckline
        { target: 'torso', size: [0.30, 0.08, 0.30], offset: [0, 0.36, 0.04], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Center trim stripe
        { target: 'torso', size: [0.08, 0.74, 0.04], offset: [0, 0, 0.26], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Flowing left sleeve
        { target: 'upperLeftArm', size: [0.32, 0.42, 0.32], offset: [0, 0, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        // Flowing right sleeve
        { target: 'upperRightArm', size: [0.32, 0.42, 0.32], offset: [0, 0, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        // Robe skirt - left
        { target: 'upperLeftLeg', size: [0.30, 0.34, 0.28], offset: [0, 0.06, 0], color: CLOTH_DARK_BLUE, metalness: 0, roughness: 0.85 },
        // Robe skirt - right
        { target: 'upperRightLeg', size: [0.30, 0.34, 0.28], offset: [0, 0.06, 0], color: CLOTH_DARK_BLUE, metalness: 0, roughness: 0.85 },
        // Sash/belt
        { target: 'torso', geo: { type: 'cylinder', rTop: 0.30, rBot: 0.30, h: 0.06, seg: 12 }, offset: [0, -0.28, 0], color: GOLD, metalness: 0.5, roughness: 0.4 },
    ]
};

const paladin_chestplate = {
    slot: 'chest',
    pieces: [
        // Main plate
        { target: 'torso', size: [0.78, 0.74, 0.52], offset: [0, 0, 0], color: BRIGHT_STEEL, metalness: 0.8, roughness: 0.2 },
        // Gold center trim
        { target: 'torso', size: [0.08, 0.72, 0.04], offset: [0, 0, 0.27], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Gold horizontal trim
        { target: 'torso', size: [0.50, 0.06, 0.04], offset: [0, 0.10, 0.27], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Left pauldron (large sphere)
        { target: 'upperLeftArm', geo: { type: 'sphere', radius: 0.20, wSeg: 12, hSeg: 8 }, offset: [0, 0.06, 0], color: BRIGHT_STEEL, metalness: 0.8, roughness: 0.2 },
        // Right pauldron (large sphere)
        { target: 'upperRightArm', geo: { type: 'sphere', radius: 0.20, wSeg: 12, hSeg: 8 }, offset: [0, 0.06, 0], color: BRIGHT_STEEL, metalness: 0.8, roughness: 0.2 },
        // Left pauldron gold rim
        { target: 'upperLeftArm', geo: { type: 'cylinder', rTop: 0.19, rBot: 0.19, h: 0.04, seg: 12 }, offset: [0, -0.02, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Right pauldron gold rim
        { target: 'upperRightArm', geo: { type: 'cylinder', rTop: 0.19, rBot: 0.19, h: 0.04, seg: 12 }, offset: [0, -0.02, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Collar ring
        { target: 'torso', geo: { type: 'cylinder', rTop: 0.28, rBot: 0.34, h: 0.10, seg: 12 }, offset: [0, 0.38, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Belt
        { target: 'torso', size: [0.80, 0.08, 0.54], offset: [0, -0.30, 0], color: GOLD, metalness: 0.6, roughness: 0.35 },
    ]
};

const ranger_vest = {
    slot: 'chest',
    pieces: [
        // Leather vest
        { target: 'torso', size: [0.74, 0.72, 0.48], offset: [0, 0, 0], color: GREEN_LEATHER, metalness: 0.05, roughness: 0.75 },
        // Stitching detail down center
        { target: 'torso', size: [0.04, 0.60, 0.04], offset: [0, 0, 0.25], color: DARK_GREEN, metalness: 0.05, roughness: 0.8 },
        // Belt
        { target: 'torso', size: [0.76, 0.07, 0.50], offset: [0, -0.28, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Belt buckle (cylinder)
        { target: 'torso', geo: { type: 'cylinder', rTop: 0.04, rBot: 0.04, h: 0.03, seg: 10 }, offset: [0, -0.28, 0.26], rotation: [Math.PI / 2, 0, 0], color: IRON, metalness: 0.6, roughness: 0.35 },
        // Left shoulder pad
        { target: 'upperLeftArm', size: [0.28, 0.14, 0.28], offset: [0, 0.06, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        // Right shoulder pad
        { target: 'upperRightArm', size: [0.28, 0.14, 0.28], offset: [0, 0.06, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        // Quiver on back (cylinder)
        { target: 'torso', geo: { type: 'cylinder', rTop: 0.06, rBot: 0.07, h: 0.50, seg: 8 }, offset: [0.16, 0.12, -0.28], color: DARK_LEATHER, metalness: 0.05, roughness: 0.7 },
        // Arrow tips poking out of quiver
        { target: 'torso', geo: { type: 'cone', radius: 0.03, height: 0.08, seg: 6 }, offset: [0.14, 0.42, -0.28], color: IRON, metalness: 0.6, roughness: 0.3 },
        { target: 'torso', geo: { type: 'cone', radius: 0.03, height: 0.08, seg: 6 }, offset: [0.18, 0.40, -0.26], color: IRON, metalness: 0.6, roughness: 0.3 },
    ]
};

// ============================================================
//  LEG ARMOR
// ============================================================

const iron_greaves = {
    slot: 'legs',
    pieces: [
        // Upper left plate
        { target: 'upperLeftLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Upper right plate
        { target: 'upperRightLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Left knee cap (sphere)
        { target: 'upperLeftLeg', geo: { type: 'sphere', radius: 0.10, wSeg: 8, hSeg: 6 }, offset: [0, -0.20, 0.10], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Right knee cap (sphere)
        { target: 'upperRightLeg', geo: { type: 'sphere', radius: 0.10, wSeg: 8, hSeg: 6 }, offset: [0, -0.20, 0.10], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Left thigh ring
        { target: 'upperLeftLeg', geo: { type: 'cylinder', rTop: 0.15, rBot: 0.15, h: 0.04, seg: 10 }, offset: [0, -0.02, 0], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Right thigh ring
        { target: 'upperRightLeg', geo: { type: 'cylinder', rTop: 0.15, rBot: 0.15, h: 0.04, seg: 10 }, offset: [0, -0.02, 0], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const wizard_leggings = {
    slot: 'legs',
    pieces: [
        // Cloth left leg
        { target: 'lowerLeftLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Cloth right leg
        { target: 'lowerRightLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Left ankle band
        { target: 'lowerLeftLeg', geo: { type: 'cylinder', rTop: 0.13, rBot: 0.13, h: 0.04, seg: 10 }, offset: [0, -0.16, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        // Right ankle band
        { target: 'lowerRightLeg', geo: { type: 'cylinder', rTop: 0.13, rBot: 0.13, h: 0.04, seg: 10 }, offset: [0, -0.16, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
    ]
};

const paladin_greaves = {
    slot: 'legs',
    pieces: [
        // Upper left plate
        { target: 'upperLeftLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Upper right plate
        { target: 'upperRightLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Left knee cap (gold sphere)
        { target: 'upperLeftLeg', geo: { type: 'sphere', radius: 0.10, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.12], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Right knee cap (gold sphere)
        { target: 'upperRightLeg', geo: { type: 'sphere', radius: 0.10, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.12], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Left thigh gold band
        { target: 'upperLeftLeg', geo: { type: 'cylinder', rTop: 0.15, rBot: 0.15, h: 0.04, seg: 10 }, offset: [0, 0.0, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Right thigh gold band
        { target: 'upperRightLeg', geo: { type: 'cylinder', rTop: 0.15, rBot: 0.15, h: 0.04, seg: 10 }, offset: [0, 0.0, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_leggings = {
    slot: 'legs',
    pieces: [
        // Left leather leg
        { target: 'upperLeftLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: DARK_LEATHER, metalness: 0.05, roughness: 0.75 },
        // Right leather leg
        { target: 'upperRightLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: DARK_LEATHER, metalness: 0.05, roughness: 0.75 },
        // Left knee pad
        { target: 'upperLeftLeg', size: [0.14, 0.10, 0.06], offset: [0, -0.16, 0.12], color: LEATHER, metalness: 0.1, roughness: 0.7 },
        // Right knee pad
        { target: 'upperRightLeg', size: [0.14, 0.10, 0.06], offset: [0, -0.16, 0.12], color: LEATHER, metalness: 0.1, roughness: 0.7 },
        // Left strap
        { target: 'upperLeftLeg', size: [0.30, 0.04, 0.30], offset: [0, -0.06, 0], color: DARK_GREEN, metalness: 0.05, roughness: 0.7 },
        // Right strap
        { target: 'upperRightLeg', size: [0.30, 0.04, 0.30], offset: [0, -0.06, 0], color: DARK_GREEN, metalness: 0.05, roughness: 0.7 },
    ]
};

// ============================================================
//  FEET ARMOR
// ============================================================

const leather_boots = {
    slot: 'feet',
    pieces: [
        // Left boot shaft
        { target: 'lowerLeftLeg', size: [0.24, 0.36, 0.24], offset: [0, -0.02, 0], color: LEATHER, metalness: 0.1, roughness: 0.7 },
        // Right boot shaft
        { target: 'lowerRightLeg', size: [0.24, 0.36, 0.24], offset: [0, -0.02, 0], color: LEATHER, metalness: 0.1, roughness: 0.7 },
        // Left sole (wider/thicker at bottom)
        { target: 'lowerLeftLeg', size: [0.26, 0.06, 0.28], offset: [0, -0.19, 0.02], color: DARK_LEATHER, metalness: 0.05, roughness: 0.8 },
        // Right sole
        { target: 'lowerRightLeg', size: [0.26, 0.06, 0.28], offset: [0, -0.19, 0.02], color: DARK_LEATHER, metalness: 0.05, roughness: 0.8 },
        // Left boot cuff
        { target: 'lowerLeftLeg', geo: { type: 'cylinder', rTop: 0.14, rBot: 0.13, h: 0.05, seg: 10 }, offset: [0, 0.14, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Right boot cuff
        { target: 'lowerRightLeg', geo: { type: 'cylinder', rTop: 0.14, rBot: 0.13, h: 0.05, seg: 10 }, offset: [0, 0.14, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
    ]
};

const iron_boots = {
    slot: 'feet',
    pieces: [
        // Left boot plate
        { target: 'lowerLeftLeg', size: [0.26, 0.40, 0.26], offset: [0, -0.01, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Right boot plate
        { target: 'lowerRightLeg', size: [0.26, 0.40, 0.26], offset: [0, -0.01, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Left shin guard
        { target: 'lowerLeftLeg', size: [0.14, 0.30, 0.06], offset: [0, 0.02, 0.12], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Right shin guard
        { target: 'lowerRightLeg', size: [0.14, 0.30, 0.06], offset: [0, 0.02, 0.12], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Left toe cap (sphere)
        { target: 'lowerLeftLeg', geo: { type: 'sphere', radius: 0.09, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.08], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Right toe cap (sphere)
        { target: 'lowerRightLeg', geo: { type: 'sphere', radius: 0.09, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.08], color: IRON, metalness: 0.65, roughness: 0.35 },
    ]
};

const paladin_boots = {
    slot: 'feet',
    pieces: [
        // Left boot plate
        { target: 'lowerLeftLeg', size: [0.26, 0.42, 0.26], offset: [0, 0, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Right boot plate
        { target: 'lowerRightLeg', size: [0.26, 0.42, 0.26], offset: [0, 0, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Left gold trim band
        { target: 'lowerLeftLeg', geo: { type: 'cylinder', rTop: 0.15, rBot: 0.14, h: 0.04, seg: 10 }, offset: [0, 0.16, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Right gold trim band
        { target: 'lowerRightLeg', geo: { type: 'cylinder', rTop: 0.15, rBot: 0.14, h: 0.04, seg: 10 }, offset: [0, 0.16, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Left toe cap
        { target: 'lowerLeftLeg', geo: { type: 'sphere', radius: 0.09, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.08], color: BRIGHT_STEEL, metalness: 0.7, roughness: 0.25 },
        // Right toe cap
        { target: 'lowerRightLeg', geo: { type: 'sphere', radius: 0.09, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.08], color: BRIGHT_STEEL, metalness: 0.7, roughness: 0.25 },
    ]
};

const ranger_boots = {
    slot: 'feet',
    pieces: [
        // Left boot
        { target: 'lowerLeftLeg', size: [0.24, 0.38, 0.24], offset: [0, -0.01, 0], color: GREEN_LEATHER, metalness: 0.05, roughness: 0.75 },
        // Right boot
        { target: 'lowerRightLeg', size: [0.24, 0.38, 0.24], offset: [0, -0.01, 0], color: GREEN_LEATHER, metalness: 0.05, roughness: 0.75 },
        // Left strap
        { target: 'lowerLeftLeg', size: [0.26, 0.04, 0.26], offset: [0, 0.04, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Right strap
        { target: 'lowerRightLeg', size: [0.26, 0.04, 0.26], offset: [0, 0.04, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Left sole
        { target: 'lowerLeftLeg', size: [0.26, 0.05, 0.28], offset: [0, -0.18, 0.02], color: DARK_LEATHER, metalness: 0.05, roughness: 0.8 },
        // Right sole
        { target: 'lowerRightLeg', size: [0.26, 0.05, 0.28], offset: [0, -0.18, 0.02], color: DARK_LEATHER, metalness: 0.05, roughness: 0.8 },
    ]
};

const wizard_boots = {
    slot: 'feet',
    pieces: [
        // Left cloth boot
        { target: 'lowerLeftLeg', size: [0.22, 0.36, 0.22], offset: [0, -0.02, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Right cloth boot
        { target: 'lowerRightLeg', size: [0.22, 0.36, 0.22], offset: [0, -0.02, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Left curled toe
        { target: 'lowerLeftLeg', geo: { type: 'sphere', radius: 0.07, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.10], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Right curled toe
        { target: 'lowerRightLeg', geo: { type: 'sphere', radius: 0.07, wSeg: 8, hSeg: 6 }, offset: [0, -0.18, 0.10], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        // Left gold trim
        { target: 'lowerLeftLeg', geo: { type: 'cylinder', rTop: 0.12, rBot: 0.12, h: 0.03, seg: 10 }, offset: [0, 0.14, 0], color: GOLD, metalness: 0.5, roughness: 0.4 },
        // Right gold trim
        { target: 'lowerRightLeg', geo: { type: 'cylinder', rTop: 0.12, rBot: 0.12, h: 0.03, seg: 10 }, offset: [0, 0.14, 0], color: GOLD, metalness: 0.5, roughness: 0.4 },
    ]
};

// ============================================================
//  HANDS ARMOR
// ============================================================

const iron_gauntlets = {
    slot: 'hands',
    pieces: [
        // Left forearm wrap (cylinder)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.11, rBot: 0.10, h: 0.24, seg: 10 }, offset: [0, -0.02, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Right forearm wrap (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.11, rBot: 0.10, h: 0.24, seg: 10 }, offset: [0, -0.02, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Left knuckle plate
        { target: 'lowerLeftArm', size: [0.20, 0.08, 0.20], offset: [0, -0.18, 0], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Right knuckle plate
        { target: 'lowerRightArm', size: [0.20, 0.08, 0.20], offset: [0, -0.18, 0], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Left wrist joint (sphere)
        { target: 'lowerLeftArm', geo: { type: 'sphere', radius: 0.08, wSeg: 8, hSeg: 6 }, offset: [0, -0.12, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Right wrist joint (sphere)
        { target: 'lowerRightArm', geo: { type: 'sphere', radius: 0.08, wSeg: 8, hSeg: 6 }, offset: [0, -0.12, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
    ]
};

const paladin_gauntlets = {
    slot: 'hands',
    pieces: [
        // Left forearm (cylinder)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.12, rBot: 0.11, h: 0.26, seg: 10 }, offset: [0, -0.02, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Right forearm (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.12, rBot: 0.11, h: 0.26, seg: 10 }, offset: [0, -0.02, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Left knuckle plate
        { target: 'lowerLeftArm', size: [0.22, 0.08, 0.22], offset: [0, -0.18, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Right knuckle plate
        { target: 'lowerRightArm', size: [0.22, 0.08, 0.22], offset: [0, -0.18, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Left gold trim ring
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.13, rBot: 0.13, h: 0.03, seg: 10 }, offset: [0, 0.08, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Right gold trim ring
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.13, rBot: 0.13, h: 0.03, seg: 10 }, offset: [0, 0.08, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_bracers = {
    slot: 'hands',
    pieces: [
        // Left bracer (cylinder)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.10, rBot: 0.10, h: 0.20, seg: 10 }, offset: [0, 0, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        // Right bracer (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.10, rBot: 0.10, h: 0.20, seg: 10 }, offset: [0, 0, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        // Left buckle strap
        { target: 'lowerLeftArm', size: [0.22, 0.04, 0.22], offset: [0, -0.06, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Right buckle strap
        { target: 'lowerRightArm', size: [0.22, 0.04, 0.22], offset: [0, -0.06, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // Left hand guard
        { target: 'lowerLeftArm', size: [0.16, 0.06, 0.16], offset: [0, -0.16, 0], color: DARK_GREEN, metalness: 0.05, roughness: 0.75 },
        // Right hand guard
        { target: 'lowerRightArm', size: [0.16, 0.06, 0.16], offset: [0, -0.16, 0], color: DARK_GREEN, metalness: 0.05, roughness: 0.75 },
    ]
};

// ============================================================
//  MAIN HAND WEAPONS
// ============================================================

const iron_sword = {
    slot: 'main_hand',
    pieces: [
        // Blade (tapered box)
        { target: 'lowerRightArm', size: [0.06, 0.60, 0.03], offset: [0, -0.40, 0.06], color: STEEL, metalness: 0.85, roughness: 0.15 },
        // Blade tip (cone)
        { target: 'lowerRightArm', geo: { type: 'cone', radius: 0.03, height: 0.10, seg: 6 }, offset: [0, -0.75, 0.06], rotation: [Math.PI, 0, 0], color: STEEL, metalness: 0.85, roughness: 0.15 },
        // Fuller (groove detail)
        { target: 'lowerRightArm', size: [0.02, 0.45, 0.01], offset: [0, -0.35, 0.075], color: BRIGHT_STEEL, metalness: 0.9, roughness: 0.1 },
        // Cross guard (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.02, rBot: 0.02, h: 0.22, seg: 8 }, offset: [0, -0.10, 0.06], rotation: [0, 0, Math.PI / 2], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Grip (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.025, rBot: 0.025, h: 0.14, seg: 8 }, offset: [0, -0.01, 0.06], color: DARK_WOOD, metalness: 0.05, roughness: 0.8 },
        // Pommel (sphere)
        { target: 'lowerRightArm', geo: { type: 'sphere', radius: 0.035, wSeg: 8, hSeg: 6 }, offset: [0, 0.06, 0.06], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const wooden_staff = {
    slot: 'main_hand',
    pieces: [
        // Main shaft (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.025, rBot: 0.03, h: 1.2, seg: 8 }, offset: [0, -0.40, 0.06], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // Crystal orb on top (sphere)
        { target: 'lowerRightArm', geo: { type: 'sphere', radius: 0.09, wSeg: 12, hSeg: 8 }, offset: [0, -1.02, 0.06], color: CRYSTAL_BLUE, metalness: 0.3, roughness: 0.15 },
        // Orb cradle prongs (small cylinders)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.01, rBot: 0.015, h: 0.12, seg: 6 }, offset: [0.04, -0.96, 0.06], rotation: [0, 0, 0.3], color: DARK_WOOD, metalness: 0.1, roughness: 0.7 },
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.01, rBot: 0.015, h: 0.12, seg: 6 }, offset: [-0.04, -0.96, 0.06], rotation: [0, 0, -0.3], color: DARK_WOOD, metalness: 0.1, roughness: 0.7 },
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.01, rBot: 0.015, h: 0.12, seg: 6 }, offset: [0, -0.96, 0.10], rotation: [0.3, 0, 0], color: DARK_WOOD, metalness: 0.1, roughness: 0.7 },
        // Tip finial at bottom (cone)
        { target: 'lowerRightArm', geo: { type: 'cone', radius: 0.035, height: 0.08, seg: 8 }, offset: [0, 0.22, 0.06], color: IRON, metalness: 0.5, roughness: 0.4 },
    ]
};

const paladin_mace = {
    slot: 'main_hand',
    pieces: [
        // Handle shaft (cylinder)
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.025, rBot: 0.03, h: 0.50, seg: 8 }, offset: [0, -0.30, 0.06], color: DARK_WOOD, metalness: 0.05, roughness: 0.8 },
        // Mace head (sphere)
        { target: 'lowerRightArm', geo: { type: 'sphere', radius: 0.10, wSeg: 10, hSeg: 8 }, offset: [0, -0.58, 0.06], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Flanges on head (4 box fins)
        { target: 'lowerRightArm', size: [0.18, 0.10, 0.02], offset: [0, -0.58, 0.06], color: GOLD, metalness: 0.7, roughness: 0.3 },
        { target: 'lowerRightArm', size: [0.02, 0.10, 0.18], offset: [0, -0.58, 0.06], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Grip wrap
        { target: 'lowerRightArm', geo: { type: 'cylinder', rTop: 0.032, rBot: 0.032, h: 0.04, seg: 8 }, offset: [0, -0.08, 0.06], color: LEATHER, metalness: 0.1, roughness: 0.7 },
        // Pommel (sphere)
        { target: 'lowerRightArm', geo: { type: 'sphere', radius: 0.03, wSeg: 8, hSeg: 6 }, offset: [0, -0.02, 0.06], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_bow = {
    slot: 'main_hand',
    pieces: [
        // Bow stave - upper limb (cylinder, curved via rotation)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.02, rBot: 0.025, h: 0.38, seg: 8 }, offset: [0, -0.36, 0.12], rotation: [0.15, 0, 0], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // Bow stave - lower limb
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.025, rBot: 0.02, h: 0.38, seg: 8 }, offset: [0, -0.02, 0.12], rotation: [-0.15, 0, 0], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // Grip (center wrap)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.03, rBot: 0.03, h: 0.08, seg: 8 }, offset: [0, -0.20, 0.12], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // String
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.005, rBot: 0.005, h: 0.64, seg: 4 }, offset: [0, -0.20, 0.17], color: STRING_COLOR, metalness: 0, roughness: 0.9 },
        // Arrow nocked (thin cylinder)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.008, rBot: 0.008, h: 0.50, seg: 4 }, offset: [0, -0.20, 0.15], rotation: [0.05, 0, 0], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // Arrow tip (cone)
        { target: 'lowerLeftArm', geo: { type: 'cone', radius: 0.015, height: 0.06, seg: 6 }, offset: [0, -0.48, 0.15], rotation: [Math.PI, 0, 0], color: IRON, metalness: 0.6, roughness: 0.3 },
    ]
};

// ============================================================
//  OFF HAND
// ============================================================

const warrior_shield = {
    slot: 'off_hand',
    pieces: [
        // Shield body (cylinder disc)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.22, rBot: 0.22, h: 0.04, seg: 14 }, offset: [0, -0.08, 0.12], rotation: [Math.PI / 2, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        // Shield rim ring
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.23, rBot: 0.23, h: 0.02, seg: 14 }, offset: [0, -0.08, 0.14], rotation: [Math.PI / 2, 0, 0], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Center boss (sphere)
        { target: 'lowerLeftArm', geo: { type: 'sphere', radius: 0.06, wSeg: 8, hSeg: 6 }, offset: [0, -0.08, 0.16], color: DARK_IRON, metalness: 0.75, roughness: 0.25 },
        // Cross detail - vertical
        { target: 'lowerLeftArm', size: [0.04, 0.30, 0.02], offset: [0, -0.08, 0.15], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // Cross detail - horizontal
        { target: 'lowerLeftArm', size: [0.30, 0.04, 0.02], offset: [0, -0.08, 0.15], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const paladin_shield = {
    slot: 'off_hand',
    pieces: [
        // Shield body (cylinder disc, slightly larger)
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.24, rBot: 0.24, h: 0.04, seg: 14 }, offset: [0, -0.08, 0.12], rotation: [Math.PI / 2, 0, 0], color: BRIGHT_STEEL, metalness: 0.75, roughness: 0.25 },
        // Gold rim
        { target: 'lowerLeftArm', geo: { type: 'cylinder', rTop: 0.25, rBot: 0.25, h: 0.02, seg: 14 }, offset: [0, -0.08, 0.14], rotation: [Math.PI / 2, 0, 0], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // Center boss (sphere, gold)
        { target: 'lowerLeftArm', geo: { type: 'sphere', radius: 0.06, wSeg: 8, hSeg: 6 }, offset: [0, -0.08, 0.17], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Gold cross - vertical
        { target: 'lowerLeftArm', size: [0.04, 0.32, 0.02], offset: [0, -0.08, 0.15], color: GOLD, metalness: 0.75, roughness: 0.25 },
        // Gold cross - horizontal
        { target: 'lowerLeftArm', size: [0.22, 0.04, 0.02], offset: [0, -0.04, 0.15], color: GOLD, metalness: 0.75, roughness: 0.25 },
    ]
};

// ============================================================
//  ITEM KEY -> VISUAL MAPPING
// ============================================================

/**
 * Maps equipment item_key (from server) -> visual armor definition
 */
export const ARMOR_VISUALS = {
    // Head
    iron_helm,
    wizard_hat,
    paladin_helm,
    ranger_hood,

    // Chest
    iron_chestplate,
    wizard_robe,
    paladin_chestplate,
    ranger_vest,

    // Legs
    iron_greaves,
    wizard_leggings,
    paladin_greaves,
    ranger_leggings,

    // Feet
    leather_boots,
    iron_boots,
    paladin_boots,
    ranger_boots,
    wizard_boots,

    // Hands
    iron_gauntlets,
    paladin_gauntlets,
    ranger_bracers,

    // Weapons
    iron_sword,
    wooden_staff,
    paladin_mace,
    ranger_bow,

    // Off hand
    warrior_shield,
    paladin_shield,
};

// ============================================================
//  DEFAULT CLASS OUTFITS (equipped at character creation)
// ============================================================

/**
 * Default visual loadout per class. Maps slot -> item_key.
 * Used when a character has no equipment or for the base look.
 */
export const CLASS_DEFAULT_GEAR = {
    Warrior: {
        head: 'iron_helm',
        chest: 'iron_chestplate',
        legs: 'iron_greaves',
        feet: 'iron_boots',
        hands: 'iron_gauntlets',
        main_hand: 'iron_sword',
        off_hand: 'warrior_shield',
    },
    Wizard: {
        head: 'wizard_hat',
        chest: 'wizard_robe',
        legs: 'wizard_leggings',
        feet: 'wizard_boots',
        main_hand: 'wooden_staff',
    },
    Paladin: {
        head: 'paladin_helm',
        chest: 'paladin_chestplate',
        legs: 'paladin_greaves',
        feet: 'paladin_boots',
        hands: 'paladin_gauntlets',
        main_hand: 'paladin_mace',
        off_hand: 'paladin_shield',
    },
    Ranger: {
        head: 'ranger_hood',
        chest: 'ranger_vest',
        legs: 'ranger_leggings',
        feet: 'ranger_boots',
        hands: 'ranger_bracers',
        main_hand: 'ranger_bow',
    },
};

/**
 * Resolves a slot->itemKey map into a slot->armorDef map ready for CharacterModel.applyEquipment()
 */
export function resolveEquipmentVisuals(slotToItemKey) {
    const result = {};
    for (const [slot, itemKey] of Object.entries(slotToItemKey)) {
        const visual = ARMOR_VISUALS[itemKey];
        if (visual) {
            result[slot] = visual;
        }
    }
    return result;
}

/**
 * Gets the full visual equipment for a character, merging server equipment over class defaults
 */
export function getCharacterVisuals(className, serverEquipment = {}) {
    const defaults = CLASS_DEFAULT_GEAR[className] || {};
    const merged = { ...defaults, ...serverEquipment };
    return resolveEquipmentVisuals(merged);
}
