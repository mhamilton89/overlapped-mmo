// Equipment definitions: slot, stat bonuses, level requirement
module.exports = {
    // ---- HEAD ----
    iron_helm: {
        name: 'Iron Helm',
        slot: 'head',
        levelReq: 1,
        stats: { vit: 2, str: 1 },
        description: 'A basic iron helmet'
    },
    wizard_hat: {
        name: 'Wizard Hat',
        slot: 'head',
        levelReq: 1,
        stats: { int: 3, sta: 1 },
        description: 'A pointed hat that amplifies magic'
    },
    paladin_helm: {
        name: 'Paladin Helm',
        slot: 'head',
        levelReq: 1,
        stats: { vit: 3, str: 1 },
        description: 'A blessed steel helm with a golden cross'
    },
    ranger_hood: {
        name: 'Ranger Hood',
        slot: 'head',
        levelReq: 1,
        stats: { dex: 2, vit: 1 },
        description: 'A forest-green hood for stealth'
    },

    // ---- CHEST ----
    iron_chestplate: {
        name: 'Iron Chestplate',
        slot: 'chest',
        levelReq: 1,
        stats: { vit: 4, str: 1 },
        description: 'Basic iron armor'
    },
    wizard_robe: {
        name: 'Wizard Robe',
        slot: 'chest',
        levelReq: 1,
        stats: { int: 4, sta: 2 },
        description: 'A flowing blue robe imbued with magic'
    },
    paladin_chestplate: {
        name: 'Paladin Chestplate',
        slot: 'chest',
        levelReq: 1,
        stats: { vit: 5, str: 2 },
        description: 'Holy plate armor with gold trim'
    },
    ranger_vest: {
        name: 'Ranger Vest',
        slot: 'chest',
        levelReq: 1,
        stats: { dex: 3, vit: 2 },
        description: 'Light leather vest for agility'
    },

    // ---- LEGS ----
    iron_greaves: {
        name: 'Iron Greaves',
        slot: 'legs',
        levelReq: 1,
        stats: { vit: 2, str: 1 },
        description: 'Basic iron leg armor'
    },
    wizard_leggings: {
        name: 'Wizard Leggings',
        slot: 'legs',
        levelReq: 1,
        stats: { int: 2, sta: 1 },
        description: 'Cloth leggings woven with arcane thread'
    },
    paladin_greaves: {
        name: 'Paladin Greaves',
        slot: 'legs',
        levelReq: 1,
        stats: { vit: 3, str: 1 },
        description: 'Holy plate greaves with gold knee guards'
    },
    ranger_leggings: {
        name: 'Ranger Leggings',
        slot: 'legs',
        levelReq: 1,
        stats: { dex: 2, vit: 1 },
        description: 'Dark leather leggings for silent movement'
    },

    // ---- FEET ----
    leather_boots: {
        name: 'Leather Boots',
        slot: 'feet',
        levelReq: 1,
        stats: { dex: 2, sta: 1 },
        description: 'Simple leather boots'
    },
    iron_boots: {
        name: 'Iron Boots',
        slot: 'feet',
        levelReq: 1,
        stats: { vit: 2, str: 1 },
        description: 'Heavy iron boots'
    },
    paladin_boots: {
        name: 'Paladin Boots',
        slot: 'feet',
        levelReq: 1,
        stats: { vit: 2, str: 1 },
        description: 'Holy steel boots'
    },
    ranger_boots: {
        name: 'Ranger Boots',
        slot: 'feet',
        levelReq: 1,
        stats: { dex: 2, vit: 1 },
        description: 'Light forest boots for quick movement'
    },
    wizard_boots: {
        name: 'Wizard Boots',
        slot: 'feet',
        levelReq: 1,
        stats: { int: 1, sta: 1 },
        description: 'Cloth slippers for spellcasters'
    },

    // ---- HANDS ----
    iron_gauntlets: {
        name: 'Iron Gauntlets',
        slot: 'hands',
        levelReq: 1,
        stats: { str: 2, vit: 1 },
        description: 'Heavy iron gauntlets'
    },
    paladin_gauntlets: {
        name: 'Paladin Gauntlets',
        slot: 'hands',
        levelReq: 1,
        stats: { str: 2, vit: 2 },
        description: 'Blessed steel gauntlets'
    },
    ranger_bracers: {
        name: 'Ranger Bracers',
        slot: 'hands',
        levelReq: 1,
        stats: { dex: 2, str: 1 },
        description: 'Leather bracers for a sure aim'
    },

    // ---- MAIN HAND ----
    iron_sword: {
        name: 'Iron Sword',
        slot: 'main_hand',
        levelReq: 1,
        stats: { str: 3, dex: 1 },
        description: 'A basic iron sword'
    },
    wooden_staff: {
        name: 'Wooden Staff',
        slot: 'main_hand',
        levelReq: 1,
        stats: { int: 4, sta: 1 },
        description: 'A basic casting staff'
    },
    paladin_mace: {
        name: 'Paladin Mace',
        slot: 'main_hand',
        levelReq: 1,
        stats: { str: 3, int: 1 },
        description: 'A golden mace blessed with holy power'
    },
    ranger_bow: {
        name: 'Ranger Bow',
        slot: 'main_hand',
        levelReq: 1,
        stats: { dex: 4, str: 1 },
        description: 'A sturdy wooden bow'
    },

    // ---- OFF HAND ----
    warrior_shield: {
        name: 'Warrior Shield',
        slot: 'off_hand',
        levelReq: 1,
        stats: { vit: 3, str: 1 },
        description: 'A solid iron shield'
    },
    paladin_shield: {
        name: 'Paladin Shield',
        slot: 'off_hand',
        levelReq: 1,
        stats: { vit: 4, int: 1 },
        description: 'A steel shield emblazoned with a golden cross'
    },
};
