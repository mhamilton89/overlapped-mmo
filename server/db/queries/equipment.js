const pool = require('../pool');

async function getEquipment(characterId) {
    const result = await pool.query(
        `SELECT slot, item_key FROM equipment
         WHERE character_id = $1`,
        [characterId]
    );
    // Return as { slot: itemKey } map
    const equipment = {};
    for (const row of result.rows) {
        equipment[row.slot] = row.item_key;
    }
    return equipment;
}

async function equipItem(characterId, slot, itemKey) {
    await pool.query(
        `INSERT INTO equipment (character_id, slot, item_key)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, slot)
         DO UPDATE SET item_key = $3`,
        [characterId, slot, itemKey]
    );
}

async function unequipItem(characterId, slot) {
    const result = await pool.query(
        `DELETE FROM equipment WHERE character_id = $1 AND slot = $2
         RETURNING item_key`,
        [characterId, slot]
    );
    return result.rows[0]?.item_key || null;
}

module.exports = { getEquipment, equipItem, unequipItem };
