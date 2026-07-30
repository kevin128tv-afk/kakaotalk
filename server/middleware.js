const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: '인증 토큰이 누락되었습니다.' });

    jwt.verify(token, process.env.JWT_SECRET || 'chat_app_secret_key_2026_safe_and_secure', (err, user) => {
        if (err) return res.status(403).json({ success: false, message: '유효하지 않은 토큰입니다.' });
        req.user = user;
        next();
    });
};

module.exports = { authenticateToken };