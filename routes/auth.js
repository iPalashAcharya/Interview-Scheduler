const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const router = express.Router();
const db = require('../db');
const { rateLimitAuth, requireAuth } = require('../config/passport');

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
            return res.status(400).json({
                message: 'Email Already Exists, Try logging in'
            });
        }
        const hash = await bcrypt.hash(password, saltRounds);

        let user_role = role_choice.toLowerCase() === "candidate" ? "candidate" : "pending";
        let is_active = role_choice.toLowerCase() === 'candidate';
        let status_message = role_choice.toLowerCase === "candidate" ? "User Registered Successfully" : 'User registered successfully — pending approval by admin.';

        const [result2] = await client.execute("INSERT INTO users(email,username,profile_icon_url,password_hash,role,is_active,requested_role) values(?,?,?,?,?,?,?);", [email, email, `/images/default_profile.png`, hash, user_role, is_active, role_choice]);
        const userId = result2.insertId;

        const [rows] = await client.execute(`SELECT * FROM users WHERE id=?`, [userId]);
        const user = rows[0];

        await client.commit();

        if (user_role === 'candidate') {
            req.login(user, err => {
                if (err) return next(err);
                return res.status(201).json({
                    message: status_message,
                    user: {
                        id: user.id,
                        email: user.email,
                        role: user.role
                    }
                });
            });
        } else {
            res.status(201).json({
                message: status_message,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    requested_role: user.requested_role
                }
            });
        }
    } catch (error) {
        await client.rollback();
        console.error("Error executing query", error.stack);
        res.status(500).json({ message: "Internal server error during registration." });
    } finally {
        client.release();
    }
});

router.get('/me', requireAuth, async (req, res) => {
    const userId = req.user.id;
    const client = await db.getConnection();
    try {
        const [rows] = await client.execute(`SELECT id,username,email,role,profile_icon_url,first_name,last_name FROM users WHERE id=?`, [userId]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ user: rows[0] });
    } catch (error) {
        console.error("Error fetching /me profile:", error.message);
        res.status(500).json({ message: "Internal server error" });
    }
});

router.post('/login', rateLimitAuth, (req, res, next) => {
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