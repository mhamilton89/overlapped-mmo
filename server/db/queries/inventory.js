const pool = require('../pool');

async function getInventory(characterId) {
    const result = await pool.query(
        `SELECT item_key, quantity FROM inventory
         WHERE character_id = $1
         ORDER BY item_key`,
        [characterId]
    );
    return result.rows;
}

async function addItem(characterId, itemKey, quantity = 1) {
    await pool.query(
        `INSERT INTO inventory (character_id, item_key, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, item_key)
         DO UPDATE SET quantity = inventory.quantity + $3`,
        [characterId, itemKey, quantity]
    );
}

async function removeItem(characterId, itemKey, quantity = 1) {
    // Decrease quantity, remove row if it hits 0
    const result = await pool.query(
        `UPDATE inventory SET quantity = quantity - $3
         WHERE character_id = $1 AND item_key = $2 AND quantity >= $3
         RETURNING quantity`,
        [characterId, itemKey, quantity]
    );

    if (result.rows.length === 0) return false;

    if (result.rows[0].quantity <= 0) {
        await pool.query(
            `DELETE FROM inventory WHERE character_id = $1 AND item_key = $2`,
            [characterId, itemKey]
        );
    }
    return true;
}

async function hasItem(characterId, itemKey, quantity = 1) {
    const result = await pool.query(
        `SELECT quantity FROM inventory
         WHERE character_id = $1 AND item_key = $2`,
        [characterId, itemKey]
    );
    return result.rows.length > 0 && result.rows[0].quantity >= quantity;
}

module.exports = { getInventory, addItem, removeItem, hasItem };
