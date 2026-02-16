// All item definitions - referenced by item_key in inventory/equipment
module.exports = {
    // Gathering materials
    oak_wood: { name: 'Oak Wood', type: 'material', stackable: true, maxStack: 99, description: 'Sturdy wood from an oak tree' },
    iron_ore: { name: 'Iron Ore', type: 'material', stackable: true, maxStack: 99, description: 'Raw iron ore' },

    // Enemy drops
    wolf_pelt: { name: 'Wolf Pelt', type: 'material', stackable: true, maxStack: 99, description: 'Fur from a forest wolf' },
    wolf_fang: { name: 'Wolf Fang', type: 'material', stackable: true, maxStack: 99, description: 'A sharp fang from a wolf' },

    // Equipment (references equipmentRegistry for stats)
    iron_sword: { name: 'Iron Sword', type: 'equipment', stackable: false, description: 'A basic iron sword' },
    iron_chestplate: { name: 'Iron Chestplate', type: 'equipment', stackable: false, description: 'Basic iron armor' },
    leather_boots: { name: 'Leather Boots', type: 'equipment', stackable: false, description: 'Simple leather boots' },
};
