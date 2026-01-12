const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const ALLOWED_EMAILS = [
    'msvattoli@gmail.com',
    'safvanahmed9048@gmail.com',
    'academy@alihsan.co.uk'
];

// Simple in-memory rate limiting (transient in serverless, but helpful)
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;
    const genericError = 'You are not authorized to access the admin panel.';
    const now = Date.now();

    // 1. Check Lockout
    if (loginAttempts.has(email)) {
        const { count, lastAttempt } = loginAttempts.get(email);
        if (count >= MAX_ATTEMPTS && (now - lastAttempt) < LOCKOUT_TIME) {
            return res.status(429).json({ error: 'Too many attempts. Please try again later.' });
        }
    }

    // 2. Validate Input & Allowlist
    if (!email || !password || !ALLOWED_EMAILS.includes(email)) {
        // Track failed attempt
        const record = loginAttempts.get(email) || { count: 0 };
        loginAttempts.set(email, { count: record.count + 1, lastAttempt: now });
        return res.status(401).json({ error: genericError });
    }

    // 3. Validate Password
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
        console.error('CRITICAL: ADMIN_PASSWORD_HASH not set');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) {
        // Track failed attempt
        const record = loginAttempts.get(email) || { count: 0 };
        loginAttempts.set(email, { count: record.count + 1, lastAttempt: now });
        return res.status(401).json({ error: genericError });
    }

    // 4. Success - Reset attempts
    loginAttempts.delete(email);

    // 5. Create Session (JWT)
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 6. Set Cookie
    res.setHeader('Set-Cookie', cookie.serialize('al_ihsan_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600,
        path: '/'
    }));

    return res.status(200).json({ success: true });
};
