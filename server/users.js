const express = require('express');
const router = express.Router();
const { authenticateToken } = require('./middleware');

const mockMessages = [];

router.get('/', authenticateToken, async (req, res) => {
    const isUser1 = req.user.username === '1';
    const me = {
        id: isUser1 ? '60c72b2f9b1d8e001c8c1111' : '60c72b2f9b1d8e001c8c2222',
        username: req.user.username,
        nickname: isUser1 ? '테스터1' : '테스터2',
        profileImage: '/uploads/default-profile.png'
    };
    const friends = [{
        _id: isUser1 ? '60c72b2f9b1d8e001c8c2222' : '60c72b2f9b1d8e001c8c1111',
        username: isUser1 ? '2' : '1',
        nickname: isUser1 ? '테스터2' : '테스터1',
        profileImage: '/uploads/default-profile.png',
        isOnline: true
    }];
    return res.status(200).json({ success: true, friends, me });
});

router.post('/friend', authenticateToken, (req, res) => {
    return res.status(200).json({ success: true, message: '테스트 모드에서는 이미 상호 친구 등록이 완료되어 있습니다.' });
});

router.get('/messages/:userId', authenticateToken, (req, res) => {
    const myId = req.user.id;
    const targetId = req.params.userId;
    const filtered = mockMessages.filter(m => 
        (m.sender === myId && m.recipient === targetId) || 
        (m.sender === targetId && m.recipient === myId)
    );
    return res.status(200).json({ success: true, messages: filtered });
});

router.post('/messages', authenticateToken, (req, res) => {
    const { recipient, content } = req.body;
    const newMessage = {
        _id: Date.now().toString(),
        sender: req.user.id,
        recipient,
        messageType: 'text',
        content: content || '',
        timestamp: new Date()
    };
    mockMessages.push(newMessage);
    return res.status(201).json({ success: true, message: newMessage });
});

module.exports = router;