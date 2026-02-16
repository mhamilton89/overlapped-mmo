const express = require('express');
const config = require('../config');
const classRegistry = require('../registries/classRegistry');
const { getInitialStats } = require('../utils/stats');
const characterQueries = require('../db/queries/characters');

const router = express.Router();

// GET /api/characters - list characters for authenticated account
router.get('/', async (req, res) => {
    try {
        const characters = await characterQueries.getCharactersByAccount(req.accountId);
        res.json({ characters });
    } catch (err) {
        console.error('Error listing characters:', err);
        res.status(500).json({ error: 'Failed to list characters' });
    }
});

// POST /api/characters - create a new character
router.post('/', async (req, res) => {
    try {
        const { name, className } = req.body;

        if (!name || !className) {
            return res.status(400).json({ error: 'Name and className required' });
        }
        if (name.length < 2 || name.length > 24) {
            return res.status(400).json({ error: 'Name must be 2-24 characters' });
        }
        if (!classRegistry[className]) {
            return res.status(400).json({
                error: `Invalid class. Must be one of: ${Object.keys(classRegistry).join(', ')}`
            });
        }

        const count = await characterQueries.countByAccount(req.accountId);
        if (count >= config.MAX_CHARACTERS_PER_ACCOUNT) {
            return res.status(400).json({
                error: `Maximum ${config.MAX_CHARACTERS_PER_ACCOUNT} characters per account`
            });
        }

        const initialStats = getInitialStats(className);
        const character = await characterQueries.createCharacter(
            req.accountId, name, className, initialStats
        );

        res.status(201).json({ success: true, character });
    } catch (err) {
        if (err.code === '23505') { // unique violation
            return res.status(409).json({ error: 'Character name already taken' });
        }
        console.error('Error creating character:', err);
        res.status(500).json({ error: 'Failed to create character' });
    }
});

// DELETE /api/characters/:id - delete a character
router.delete('/:id', async (req, res) => {
    try {
        const deleted = await characterQueries.deleteCharacter(req.params.id, req.accountId);
        if (!deleted) {
            return res.status(404).json({ error: 'Character not found or not owned by you' });
        }
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting character:', err);
        res.status(500).json({ error: 'Failed to delete character' });
    }
});

// GET /api/classes - get available classes (public, no auth needed)
router.get('/classes', async (req, res) => {
    const classes = {};
    for (const [name, data] of Object.entries(classRegistry)) {
        classes[name] = {
            description: data.description,
            baseStats: data.baseStats
        };
    }
    res.json({ classes });
});

module.exports = router;
