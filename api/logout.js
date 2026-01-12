const cookie = require('cookie');

module.exports = (req, res) => {
    res.setHeader('Set-Cookie', cookie.serialize('al_ihsan_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        expires: new Date(0),
        path: '/'
    }));
    return res.status(200).json({ success: true });
};
