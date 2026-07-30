const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if ((username === '1' && password === '1') || (username === '2' && password === '2')) {
        const isUser1 = username === '1';
        const mockUser = {
            id: isUser1 ? '60c72b2f9b1d8e001c8c1111' : '60c72b2f9b1d8e001c8c2222',
            username: username,
            nickname: isUser1 ? '테스터1' : '테스터2',
            profileImage: '/uploads/default-profile.png'
        };
        
        const token = jwt.sign(
            { id: mockUser.id, username: mockUser.username },
            process.env.JWT_SECRET || 'chat_app_secret_key_2026_safe_and_secure',
            { expiresIn: '24h' }
        );

        return res.status(200).json({ success: true, token, user: mockUser });
    }

    return res.status(400).json({ success: false, message: '아이디 1 또는 2를 입력하세요. 비밀번호도 동일합니다.' });
});

router.post('/register', (req, res) => {
    return res.status(200).json({ success: true, message: '회원가입 필요 없이 로그인 화면에서 1 또는 2로 로그인하세요.' });
});

module.exports = router;