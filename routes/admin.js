const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../config/passport');

router.get('/pending-registration', requireAdmin, async (req, res) => {
    const [candidates] = await db.execute(`SELECT id,email,requested_role FROM users WHERE is_active=false AND role='pending'`);
    res.json(candidates);
});

router.post('/approve-registration', requireAdmin, async (req, res) => {
    const userId = req.body.id;
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: 'Valid user ID required' });
    }
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [result] = await client.execute(`SELECT requested_role FROM users WHERE id=?`, [userId]);
        if (result.length === 0 || !result[0].requested_role) {
            await client.rollback();
            return res.status(404).json({ message: 'User or requested role not found' });
        }
        const requested_role = result[0].requested_role;

        await client.execute(`UPDATE users SET is_active=true,role=? WHERE id=?`, [requested_role, userId]);

        await client.commit();
        res.json({ message: 'User approved successfully', userId, newRole: requested_role });
    } catch (error) {
        await client.rollback();
        console.error("Error executing query", error.stack);
        res.status(500).json({ message: "Internal server error during registration approval." });
    } finally {
        client.release();
    }
});

module.exports = router;