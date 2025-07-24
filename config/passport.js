const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = require('../db');
const env = require('dotenv');
const bcrypt = require('bcrypt');

env.config();


passport.use('local', new LocalStrategy(
    { usernameField: 'email' },
    async function verify(email, password, cb) {
        try {
            const [rows] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);

            if (rows.length === 0) {
                return cb(null, false, { message: 'User not found' });
            }

            const user = rows[0];

            // Enforcing account activation rule
            if (!user.is_active || user.role === 'pending') {
                return cb(null, false, { message: 'Account pending approval.' });
            }

            const match = await bcrypt.compare(password, user.password_hash);

            if (!match) {
                return cb(null, false, { message: 'Incorrect password' });
            }

            // Successful login
            return cb(null, user);

        } catch (err) {
            return cb(err);
        }
    }
));

passport.serializeUser((user, cb) => {
    cb(null, user.id);
});

//to use redis for cache
const userCache = new Map();

passport.deserializeUser(async (id, done) => {
    try {
        if (userCache.has(id)) {
            return done(null, userCache.get(id));
        }
        const [result] = await db.execute("SELECT id, email,role, profile_icon_url,first_name,last_name FROM users WHERE id=?", [id]);
        if (result.length > 0) {
            const user = result[0];
            userCache.set(id, user);
            done(null, user);
        } else {
            console.log(`deserializeUser: User not found (id: ${id})`);
            done(null, false);
        }
    } catch (err) {
        done(err, null);
    }
});

const requireAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ message: 'Authentication required.' });
};

const requireAdmin = (req, res, next) => {
    if (!req.isAuthenticated()) {
        return res.status(401).json({ message: 'Authentication required.' });
    }
    const allowedRoles = ['Admin', 'HR'];
    if (allowedRoles.includes(req.user.role)) {
        return next();
    }
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

//change with redis for rate limiting
const authAttempts = new Map();

const rateLimitAuth = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const maxAttempts = 5;

    if (!authAttempts.has(ip)) {
        authAttempts.set(ip, { count: 1, resetTime: now + windowMs });
        return next();
    }

    const attempts = authAttempts.get(ip);

    if (now > attempts.resetTime) {
        attempts.count = 1;
        attempts.resetTime = now + windowMs;
        return next();
    }

    if (attempts.count >= maxAttempts) {
        return res.status(429).json({
            message: 'Too many authentication attempts. Please try again later.',
            retryAfter: Math.ceil((attempts.resetTime - now) / 1000)
        });
    }

    attempts.count++;
    next();
};

setInterval(() => {
    const now = Date.now();
    for (const [ip, attempts] of authAttempts.entries()) {
        if (now > attempts.resetTime) {
            authAttempts.delete(ip);
        }
    }
}, 10 * 60 * 1000);

module.exports = {
    passport,
    requireAuth,
    requireAdmin,
    rateLimitAuth
};