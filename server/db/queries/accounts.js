const pool = require('../pool');

async function createAccount(username, passwordHash) {
    const result = await pool.query(
        `INSERT INTO accounts (username, password_hash)
         VALUES ($1, $2)
         RETURNING id, username, created_at`,
        [username, passwordHash]
    );
    return result.rows[0];
}

async function findByUsername(username) {
    const result = await pool.query(
        `SELECT id, username, password_hash, created_at
         FROM accounts WHERE username = $1`,
        [username]
    );
    return result.rows[0] || null;
}

module.exports = { createAccount, findByUsername };
