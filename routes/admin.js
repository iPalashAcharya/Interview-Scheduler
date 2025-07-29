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

        const [result] = await client.execute(`SELECT requested_role,first_name,last_name FROM users WHERE id=?`, [userId]);
        if (result.length === 0 || !result[0].requested_role) {
            await client.rollback();
            return res.status(404).json({ message: 'User or requested role not found' });
        }
        const VALID_ROLES = ['Interviewer', 'HR', 'Admin'];
        const requested_role = result[0].requested_role;
        if (!VALID_ROLES.includes(requested_role)) {
            await client.rollback();
            return res.status(400).json({ message: 'Invalid requested role.' });
        }

        await client.execute(`UPDATE users SET is_active=true,role=?,requested_role=NULL WHERE id=?`, [requested_role, userId]);
        if (requested_role === "Interviewer") {
            const interviewerName = `${result[0].first_name || ''} ${result[0].last_name || ''}`.trim();
            await client.execute(`INSERT INTO interviewer(id,name) VALUES (?,?)`, [userId, interviewerName]);
        }
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

router.post('/reject-registration', requireAdmin, async (req, res) => {
    const userId = req.body.id;
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: 'Valid user ID required' });
    }
    if (!userId || isNaN(userId)) {
        return res.status(400).json({ message: 'Valid user ID required' });
    }
    const client = await db.getConnection();
    try {
        await client.beginTransaction();

        const [result] = await client.execute(`SELECT id FROM users WHERE id=? AND status='pending'`, [userId]);
        if (result.length === 0) {
            await client.rollback();
            return res.status(404).json({ message: "User not found or not pending." });
        }

        await client.execute("DELETE FROM users WHERE id=?", [userId]);

        await client.commit();
        res.status(200).json({ message: "User registration rejected and user deleted." });
    } catch (error) {
        await client.rollback();
        console.error("Error executing query", error.stack);
        res.status(500).json({ message: "Internal server error during registration approval." });
    } finally {
        client.release();
    }
});

module.exports = router;