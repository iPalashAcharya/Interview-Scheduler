const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');

const saltRounds = 10;

router.post("/register", async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;
    const role_choice = req.body.role;
    const client = await db.getConnection();
    try {
        await client.beginTransaction();
        const [result] = await client.execute('SELECT * FROM users WHERE email=?', [email]);
        if (result.length > 0) {
            return res.status(400).send("Username already exists, try logging in");
        }
        const hash = await bcrypt.hash(password, saltRounds);

        const [result2] = await client.execute("INSERT INTO users(email,username,profile_icon_url,password_hash,role,is_active,requested_role) values(?,?,?,?,?,?,?);", [email, email, `/images/default_profile.png`, hash, 'pending', false, role_choice]);
        const userId = result2.insertId;

        const [rows] = await client.execute(`SELECT * FROM users WHERE id=?`, [userId]);
        const user = rows[0];

        await client.commit();

        res.status(201).json({
            message: 'User registered successfully — pending approval by admin.',
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        await client.rollback();
        console.error("Error executing query", error.stack);
        res.status(500).json({ message: "Internal server error during registration." });
    } finally {
        client.release();
    }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) return next(err);
        if (!user) return res.status(401).json({ message: info?.message || 'Login failed' });

        req.login(user, (err) => {
            if (err) return res.status(500).json({ message: 'Login failed during session creation' });
            res.status(200).json({
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role
                }
            });
        });
    })(req, res, next);
});

router.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            return res.status(500).json({ message: 'Logout failed' });
        }
        req.session.destroy((err) => {
            if (err) {
                return res.status(500).json({ message: 'Session destruction failed' });
            }
            res.clearCookie('connect.sid');
            res.json({ message: 'Logged out successfully' });
        });
    });
});

module.exports = router;