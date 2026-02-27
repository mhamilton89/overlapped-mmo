/**
 * Armor visual definitions: maps item_key → visual overlay pieces.
 *
 * Each entry has:
 *   slot: which equipment slot it goes in
 *   pieces: array of overlay boxes, each with:
 *     target: which body part to attach to (key in CharacterModel.parts)
 *     size: [width, height, depth] of overlay box
 *     offset: [x, y, z] offset from body part center (optional)
 *     color: hex color
 *     metalness: 0-1 (default 0.6)
 *     roughness: 0-1 (default 0.4)
 */

// -- COLORS --
const IRON = 0x8a8a8a;
const DARK_IRON = 0x5a5a5a;
const STEEL = 0xb0b0b0;
const GOLD = 0xd4a843;
const LEATHER = 0x8b5e3c;
const DARK_LEATHER = 0x5c3a1e;
const CLOTH_BLUE = 0x2244aa;
const CLOTH_PURPLE = 0x6633aa;
const CLOTH_WHITE = 0xccccdd;
const WOOD = 0x6b4226;
const GREEN_LEATHER = 0x4a6b3a;
const DARK_GREEN = 0x2d4a22;

// ============================================================
//  HEAD ARMOR
// ============================================================

const iron_helm = {
    slot: 'head',
    pieces: [
        { target: 'head', size: [0.66, 0.56, 0.66], offset: [0, -0.04, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        // visor slit
        { target: 'head', size: [0.44, 0.08, 0.04], offset: [0, -0.06, 0.32], color: DARK_IRON, metalness: 0.8, roughness: 0.2 },
    ]
};

const wizard_hat = {
    slot: 'head',
    pieces: [
        // wide brim
        { target: 'head', size: [0.8, 0.06, 0.8], offset: [0, 0.22, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.9 },
        // tall cone
        { target: 'head', size: [0.4, 0.5, 0.4], offset: [0, 0.53, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.9 },
        // tip
        { target: 'head', size: [0.2, 0.2, 0.2], offset: [0, 0.83, 0.05], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
    ]
};

const paladin_helm = {
    slot: 'head',
    pieces: [
        { target: 'head', size: [0.66, 0.62, 0.66], offset: [0, 0, 0], color: STEEL, metalness: 0.75, roughness: 0.25 },
        // gold cross on front
        { target: 'head', size: [0.06, 0.2, 0.04], offset: [0, 0.05, 0.32], color: GOLD, metalness: 0.7, roughness: 0.3 },
        { target: 'head', size: [0.18, 0.06, 0.04], offset: [0, 0.1, 0.32], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_hood = {
    slot: 'head',
    pieces: [
        // hood wrapping head
        { target: 'head', size: [0.66, 0.58, 0.66], offset: [0, 0.04, 0.02], color: GREEN_LEATHER, metalness: 0, roughness: 0.8 },
        // pointed front
        { target: 'head', size: [0.3, 0.14, 0.14], offset: [0, 0.28, 0.2], color: DARK_GREEN, metalness: 0, roughness: 0.8 },
    ]
};

// ============================================================
//  CHEST ARMOR
// ============================================================

const iron_chestplate = {
    slot: 'chest',
    pieces: [
        // chest overlay
        { target: 'torso', size: [0.76, 0.72, 0.50], offset: [0, 0, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        // shoulder pads
        { target: 'upperLeftArm', size: [0.30, 0.18, 0.30], offset: [0, 0.06, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
        { target: 'upperRightArm', size: [0.30, 0.18, 0.30], offset: [0, 0.06, 0], color: IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const wizard_robe = {
    slot: 'chest',
    pieces: [
        // robe over torso
        { target: 'torso', size: [0.76, 0.74, 0.50], offset: [0, 0, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        // flowing sleeves (wider upper arms)
        { target: 'upperLeftArm', size: [0.30, 0.40, 0.30], offset: [0, 0, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        { target: 'upperRightArm', size: [0.30, 0.40, 0.30], offset: [0, 0, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        // robe skirt extending over upper legs
        { target: 'upperLeftLeg', size: [0.30, 0.30, 0.28], offset: [0, 0.08, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
        { target: 'upperRightLeg', size: [0.30, 0.30, 0.28], offset: [0, 0.08, 0], color: CLOTH_BLUE, metalness: 0, roughness: 0.85 },
    ]
};

const paladin_chestplate = {
    slot: 'chest',
    pieces: [
        { target: 'torso', size: [0.78, 0.74, 0.52], offset: [0, 0, 0], color: STEEL, metalness: 0.75, roughness: 0.25 },
        // gold trim down center
        { target: 'torso', size: [0.10, 0.72, 0.04], offset: [0, 0, 0.25], color: GOLD, metalness: 0.7, roughness: 0.3 },
        // large pauldrons
        { target: 'upperLeftArm', size: [0.32, 0.20, 0.32], offset: [0, 0.08, 0], color: STEEL, metalness: 0.75, roughness: 0.25 },
        { target: 'upperRightArm', size: [0.32, 0.20, 0.32], offset: [0, 0.08, 0], color: STEEL, metalness: 0.75, roughness: 0.25 },
    ]
};

const ranger_vest = {
    slot: 'chest',
    pieces: [
        // leather vest
        { target: 'torso', size: [0.74, 0.72, 0.48], offset: [0, 0, 0], color: GREEN_LEATHER, metalness: 0.05, roughness: 0.75 },
        // belt
        { target: 'torso', size: [0.76, 0.08, 0.50], offset: [0, -0.28, 0], color: DARK_LEATHER, metalness: 0.1, roughness: 0.7 },
        // light shoulder guards
        { target: 'upperLeftArm', size: [0.26, 0.14, 0.26], offset: [0, 0.06, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        { target: 'upperRightArm', size: [0.26, 0.14, 0.26], offset: [0, 0.06, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        // quiver on back
        { target: 'torso', size: [0.12, 0.5, 0.12], offset: [0.15, 0.12, -0.28], color: DARK_LEATHER, metalness: 0.05, roughness: 0.7 },
    ]
};

// ============================================================
//  LEG ARMOR
// ============================================================

const iron_greaves = {
    slot: 'legs',
    pieces: [
        { target: 'upperLeftLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        { target: 'upperRightLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
    ]
};

const wizard_leggings = {
    slot: 'legs',
    pieces: [
        // cloth leggings (already partially covered by robe skirt)
        { target: 'lowerLeftLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        { target: 'lowerRightLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
    ]
};

const paladin_greaves = {
    slot: 'legs',
    pieces: [
        { target: 'upperLeftLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: STEEL, metalness: 0.7, roughness: 0.3 },
        { target: 'upperRightLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: STEEL, metalness: 0.7, roughness: 0.3 },
        // gold knee accents
        { target: 'upperLeftLeg', size: [0.12, 0.10, 0.06], offset: [0, -0.16, 0.12], color: GOLD, metalness: 0.7, roughness: 0.3 },
        { target: 'upperRightLeg', size: [0.12, 0.10, 0.06], offset: [0, -0.16, 0.12], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_leggings = {
    slot: 'legs',
    pieces: [
        { target: 'upperLeftLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: DARK_LEATHER, metalness: 0.05, roughness: 0.75 },
        { target: 'upperRightLeg', size: [0.28, 0.40, 0.28], offset: [0, 0, 0], color: DARK_LEATHER, metalness: 0.05, roughness: 0.75 },
    ]
};

// ============================================================
//  FEET ARMOR
// ============================================================

const leather_boots = {
    slot: 'feet',
    pieces: [
        { target: 'lowerLeftLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: LEATHER, metalness: 0.1, roughness: 0.7 },
        { target: 'lowerRightLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: LEATHER, metalness: 0.1, roughness: 0.7 },
    ]
};

const iron_boots = {
    slot: 'feet',
    pieces: [
        { target: 'lowerLeftLeg', size: [0.26, 0.42, 0.26], offset: [0, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        { target: 'lowerRightLeg', size: [0.26, 0.42, 0.26], offset: [0, 0, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
    ]
};

const paladin_boots = {
    slot: 'feet',
    pieces: [
        { target: 'lowerLeftLeg', size: [0.26, 0.42, 0.26], offset: [0, 0, 0], color: STEEL, metalness: 0.7, roughness: 0.3 },
        { target: 'lowerRightLeg', size: [0.26, 0.42, 0.26], offset: [0, 0, 0], color: STEEL, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_boots = {
    slot: 'feet',
    pieces: [
        { target: 'lowerLeftLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: GREEN_LEATHER, metalness: 0.05, roughness: 0.75 },
        { target: 'lowerRightLeg', size: [0.24, 0.40, 0.24], offset: [0, 0, 0], color: GREEN_LEATHER, metalness: 0.05, roughness: 0.75 },
    ]
};

const wizard_boots = {
    slot: 'feet',
    pieces: [
        { target: 'lowerLeftLeg', size: [0.22, 0.38, 0.22], offset: [0, 0, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
        { target: 'lowerRightLeg', size: [0.22, 0.38, 0.22], offset: [0, 0, 0], color: CLOTH_PURPLE, metalness: 0, roughness: 0.85 },
    ]
};

// ============================================================
//  HANDS ARMOR
// ============================================================

const iron_gauntlets = {
    slot: 'hands',
    pieces: [
        { target: 'lowerLeftArm', size: [0.22, 0.28, 0.22], offset: [0, -0.04, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
        { target: 'lowerRightArm', size: [0.22, 0.28, 0.22], offset: [0, -0.04, 0], color: IRON, metalness: 0.65, roughness: 0.35 },
    ]
};

const paladin_gauntlets = {
    slot: 'hands',
    pieces: [
        { target: 'lowerLeftArm', size: [0.24, 0.30, 0.24], offset: [0, -0.04, 0], color: STEEL, metalness: 0.7, roughness: 0.3 },
        { target: 'lowerRightArm', size: [0.24, 0.30, 0.24], offset: [0, -0.04, 0], color: STEEL, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_bracers = {
    slot: 'hands',
    pieces: [
        { target: 'lowerLeftArm', size: [0.22, 0.24, 0.22], offset: [0, 0, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
        { target: 'lowerRightArm', size: [0.22, 0.24, 0.22], offset: [0, 0, 0], color: LEATHER, metalness: 0.05, roughness: 0.7 },
    ]
};

// ============================================================
//  MAIN HAND WEAPONS
// ============================================================

const iron_sword = {
    slot: 'main_hand',
    pieces: [
        // blade
        { target: 'lowerRightArm', size: [0.06, 0.65, 0.04], offset: [0, -0.38, 0.06], color: STEEL, metalness: 0.85, roughness: 0.15 },
        // guard
        { target: 'lowerRightArm', size: [0.20, 0.04, 0.06], offset: [0, -0.08, 0.06], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
        // grip
        { target: 'lowerRightArm', size: [0.05, 0.14, 0.05], offset: [0, 0.02, 0.06], color: WOOD, metalness: 0.05, roughness: 0.8 },
    ]
};

const wooden_staff = {
    slot: 'main_hand',
    pieces: [
        // shaft
        { target: 'lowerRightArm', size: [0.06, 1.2, 0.06], offset: [0, -0.35, 0.06], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // crystal orb on top
        { target: 'lowerRightArm', size: [0.14, 0.14, 0.14], offset: [0, -0.98, 0.06], color: 0x44aaff, metalness: 0.3, roughness: 0.2 },
    ]
};

const paladin_mace = {
    slot: 'main_hand',
    pieces: [
        // shaft
        { target: 'lowerRightArm', size: [0.06, 0.55, 0.06], offset: [0, -0.32, 0.06], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // mace head
        { target: 'lowerRightArm', size: [0.16, 0.16, 0.16], offset: [0, -0.62, 0.06], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

const ranger_bow = {
    slot: 'main_hand',
    pieces: [
        // bow stave (curved approximated as tall thin box)
        { target: 'lowerLeftArm', size: [0.04, 0.7, 0.12], offset: [0, -0.20, 0.10], color: WOOD, metalness: 0.05, roughness: 0.8 },
        // string
        { target: 'lowerLeftArm', size: [0.02, 0.60, 0.02], offset: [0, -0.20, 0.16], color: 0xddddcc, metalness: 0, roughness: 0.9 },
    ]
};

// ============================================================
//  OFF HAND
// ============================================================

const warrior_shield = {
    slot: 'off_hand',
    pieces: [
        { target: 'lowerLeftArm', size: [0.35, 0.40, 0.06], offset: [0, -0.08, 0.12], color: IRON, metalness: 0.65, roughness: 0.35 },
        // boss (center bump)
        { target: 'lowerLeftArm', size: [0.10, 0.10, 0.08], offset: [0, -0.08, 0.16], color: DARK_IRON, metalness: 0.7, roughness: 0.3 },
    ]
};

const paladin_shield = {
    slot: 'off_hand',
    pieces: [
        { target: 'lowerLeftArm', size: [0.38, 0.44, 0.06], offset: [0, -0.08, 0.12], color: STEEL, metalness: 0.7, roughness: 0.3 },
        // gold cross
        { target: 'lowerLeftArm', size: [0.04, 0.28, 0.04], offset: [0, -0.08, 0.16], color: GOLD, metalness: 0.7, roughness: 0.3 },
        { target: 'lowerLeftArm', size: [0.18, 0.04, 0.04], offset: [0, -0.04, 0.16], color: GOLD, metalness: 0.7, roughness: 0.3 },
    ]
};

// ============================================================
//  ITEM KEY → VISUAL MAPPING
// ============================================================

/**
 * Maps equipment item_key (from server) → visual armor definition
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
 * Default visual loadout per class. Maps slot → item_key.
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
 * Resolves a slot→itemKey map into a slot→armorDef map ready for CharacterModel.applyEquipment()
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
