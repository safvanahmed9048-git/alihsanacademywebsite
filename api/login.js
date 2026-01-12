const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const ALLOWED_EMAILS = [
    'msvattoli@gmail.com',
    'safvanahmed9048@gmail.com',
    'academy@alihsan.co.uk'
];

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = req.body;

    // 1. Check Allowlist
    if (!ALLOWED_EMAILS.includes(email)) {
        return res.status(403).json({ error: 'You are not authorized to access the admin panel.' });
    }

    // 2. Validate Password
    const hash = process.env.ADMIN_PASSWORD_HASH;
    if (!hash) {
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) {
        return res.status(401).json({ error: 'You are not authorized to access the admin panel.' });
    }

    // 3. Create Session (JWT)
    const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // 4. Set Cookie
    res.setHeader('Set-Cookie', cookie.serialize('al_ihsan_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600,
        path: '/'
    }));

    return res.status(200).json({ success: true });
};
