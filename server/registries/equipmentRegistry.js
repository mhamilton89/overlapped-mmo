// Equipment definitions: slot, stat bonuses, level requirement
module.exports = {
    iron_sword: {
        name: 'Iron Sword',
        slot: 'main_hand',
        levelReq: 1,
        stats: { str: 3, dex: 1 },
        description: 'A basic iron sword'
    },
    iron_chestplate: {
        name: 'Iron Chestplate',
        slot: 'chest',
        levelReq: 1,
        stats: { vit: 4, str: 1 },
        description: 'Basic iron armor'
    },
    leather_boots: {
        name: 'Leather Boots',
        slot: 'feet',
        levelReq: 1,
        stats: { dex: 2, sta: 1 },
        description: 'Simple leather boots'
    },
    wooden_staff: {
        name: 'Wooden Staff',
        slot: 'main_hand',
        levelReq: 1,
        stats: { int: 4, sta: 1 },
        description: 'A basic casting staff'
    },
    iron_helm: {
        name: 'Iron Helm',
        slot: 'head',
        levelReq: 1,
        stats: { vit: 2, str: 1 },
        description: 'A basic iron helmet'
    },
};
