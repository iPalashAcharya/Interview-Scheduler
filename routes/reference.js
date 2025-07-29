const express = require('express');
const db = require('../db');
const { requireAuth } = require('../config/passport');
const router = express.Router();

router.get('/domains', requireAuth, async (req, res) => {
    const client = await db.getConnection();
    try {
        const [rows] = await client.execute(`SELECT id, name FROM domain ORDER BY name ASC`);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching domains:", error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

router.get('/interview-rounds', requireAuth, async (req, res) => {
    const client = await db.getConnection();
    try {
        const [rows] = await client.execute(`SELECT id, name FROM interview_round ORDER BY name ASC`);
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error fetching interview rounds:", error.message);
        res.status(500).json({ error: "Internal server error" });
    } finally {
        client.release();
    }
});

module.exports = router;