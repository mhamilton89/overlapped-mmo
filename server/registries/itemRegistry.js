// All item definitions - referenced by item_key in inventory/equipment
module.exports = {
    // Gathering materials
    oak_wood: { name: 'Oak Wood', type: 'material', stackable: true, maxStack: 99, description: 'Sturdy wood from an oak tree' },
    iron_ore: { name: 'Iron Ore', type: 'material', stackable: true, maxStack: 99, description: 'Raw iron ore' },

    // Enemy drops
    wolf_pelt: { name: 'Wolf Pelt', type: 'material', stackable: true, maxStack: 99, description: 'Fur from a forest wolf' },
    wolf_fang: { name: 'Wolf Fang', type: 'material', stackable: true, maxStack: 99, description: 'A sharp fang from a wolf' },
    boar_tusk: { name: 'Boar Tusk', type: 'material', stackable: true, maxStack: 99, description: 'A sharp tusk from a forest boar' },
    boar_hide: { name: 'Boar Hide', type: 'material', stackable: true, maxStack: 99, description: 'Tough hide from a forest boar' },

    // Head equipment
    iron_helm: { name: 'Iron Helm', type: 'equipment', stackable: false, description: 'A basic iron helmet' },
    wizard_hat: { name: 'Wizard Hat', type: 'equipment', stackable: false, description: 'A pointed hat that amplifies magic' },
    paladin_helm: { name: 'Paladin Helm', type: 'equipment', stackable: false, description: 'A blessed steel helm' },
    ranger_hood: { name: 'Ranger Hood', type: 'equipment', stackable: false, description: 'A forest-green hood' },

    // Chest equipment
    iron_chestplate: { name: 'Iron Chestplate', type: 'equipment', stackable: false, description: 'Basic iron armor' },
    wizard_robe: { name: 'Wizard Robe', type: 'equipment', stackable: false, description: 'A flowing blue robe' },
    paladin_chestplate: { name: 'Paladin Chestplate', type: 'equipment', stackable: false, description: 'Holy plate armor' },
    ranger_vest: { name: 'Ranger Vest', type: 'equipment', stackable: false, description: 'Light leather vest' },

    // Leg equipment
    iron_greaves: { name: 'Iron Greaves', type: 'equipment', stackable: false, description: 'Basic iron leg armor' },
    wizard_leggings: { name: 'Wizard Leggings', type: 'equipment', stackable: false, description: 'Cloth leggings' },
    paladin_greaves: { name: 'Paladin Greaves', type: 'equipment', stackable: false, description: 'Holy plate greaves' },
    ranger_leggings: { name: 'Ranger Leggings', type: 'equipment', stackable: false, description: 'Dark leather leggings' },

    // Feet equipment
    leather_boots: { name: 'Leather Boots', type: 'equipment', stackable: false, description: 'Simple leather boots' },
    iron_boots: { name: 'Iron Boots', type: 'equipment', stackable: false, description: 'Heavy iron boots' },
    paladin_boots: { name: 'Paladin Boots', type: 'equipment', stackable: false, description: 'Holy steel boots' },
    ranger_boots: { name: 'Ranger Boots', type: 'equipment', stackable: false, description: 'Light forest boots' },
    wizard_boots: { name: 'Wizard Boots', type: 'equipment', stackable: false, description: 'Cloth slippers' },

    // Hand equipment
    iron_gauntlets: { name: 'Iron Gauntlets', type: 'equipment', stackable: false, description: 'Heavy iron gauntlets' },
    paladin_gauntlets: { name: 'Paladin Gauntlets', type: 'equipment', stackable: false, description: 'Blessed steel gauntlets' },
    ranger_bracers: { name: 'Ranger Bracers', type: 'equipment', stackable: false, description: 'Leather bracers' },

    // Weapons
    iron_sword: { name: 'Iron Sword', type: 'equipment', stackable: false, description: 'A basic iron sword' },
    wooden_staff: { name: 'Wooden Staff', type: 'equipment', stackable: false, description: 'A basic casting staff' },
    paladin_mace: { name: 'Paladin Mace', type: 'equipment', stackable: false, description: 'A golden mace' },
    ranger_bow: { name: 'Ranger Bow', type: 'equipment', stackable: false, description: 'A sturdy wooden bow' },

    // Off hand
    warrior_shield: { name: 'Warrior Shield', type: 'equipment', stackable: false, description: 'A solid iron shield' },
    paladin_shield: { name: 'Paladin Shield', type: 'equipment', stackable: false, description: 'A steel shield with golden cross' },
};
