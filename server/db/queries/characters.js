const pool = require('../pool');

async function getCharactersByAccount(accountId) {
    const result = await pool.query(
        `SELECT id, name, class, level, xp, current_hp, current_mana,
                pos_x, pos_y, rotation, gold, is_admin, created_at
         FROM characters WHERE account_id = $1
         ORDER BY created_at ASC`,
        [accountId]
    );
    return result.rows;
}

async function getCharacterById(id) {
    const result = await pool.query(
        `SELECT id, account_id, name, class, level, xp,
                current_hp, current_mana, pos_x, pos_y, rotation, gold, is_admin
         FROM characters WHERE id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

async function createCharacter(accountId, name, className, initialStats) {
    const result = await pool.query(
        `INSERT INTO characters (account_id, name, class, level, xp, current_hp, current_mana)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, class, level, xp, current_hp, current_mana,
                   pos_x, pos_y, rotation, gold, created_at`,
        [accountId, name, className,
         initialStats.level, initialStats.xp,
         initialStats.current_hp, initialStats.current_mana]
    );
    return result.rows[0];
}

async function saveCharacterState(id, state) {
    await pool.query(
        `UPDATE characters SET
            pos_x = $2, pos_y = $3, rotation = $4,
            current_hp = $5, current_mana = $6,
            xp = $7, level = $8, gold = $9
         WHERE id = $1`,
        [id, Math.round(state.x), Math.round(state.y), state.rotation,
         Math.round(state.hp), Math.round(state.mana), state.xp, state.level, state.gold]
    );
}

async function deleteCharacter(id, accountId) {
    const result = await pool.query(
        `DELETE FROM characters WHERE id = $1 AND account_id = $2
         RETURNING id`,
        [id, accountId]
    );
    return result.rowCount > 0;
}

async function countByAccount(accountId) {
    const result = await pool.query(
        `SELECT COUNT(*) as count FROM characters WHERE account_id = $1`,
        [accountId]
    );
    return parseInt(result.rows[0].count);
}

module.exports = {
    getCharactersByAccount,
    getCharacterById,
    createCharacter,
    saveCharacterState,
    deleteCharacter,
    countByAccount,
};
