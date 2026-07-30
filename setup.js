const fs = require('fs');
const path = require('path');

const dirs = [
    'client',
    'server',
    'uploads'
];

const files = {
    'server/package.json': `{
  "name": "chat-app-server",
  "version": "1.0.0",
  "description": "",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.19.2",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.3.1",
    "multer": "^1.4.5-lts.1",
    "socket.io": "^4.7.5"
  }
}`,

    'server/.env': `PORT=3000
MONGODB_URI=mongodb+srv://kevin128tv_db_user:AIFOxm0Z2CcLKppG@cluster0.ndqlaqp.mongodb.net/chat-app?retryWrites=true&w=majority
JWT_SECRET=chat_app_secret_key_2026_safe_and_secure`,

    'server/User.js': `const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true, trim: true },
    password: { type: String, required: true },
    nickname: { type: String, required: true },
    profileImage: { type: String, default: '/uploads/default-profile.png' },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isOnline: { type: Boolean, default: false },
    created: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', UserSchema);`,

    'server/Message.js': `const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    messageType: { type: String, enum: ['text', 'image'], default: 'text' },
    content: { type: String, default: '' },
    isRead: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Message', MessageSchema);`,

    'server/middleware.js': `const jwt = require('jsonwebtoken');

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

module.exports = { authenticateToken };`,

    'server/auth.js': `const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const User = require('./User');

const uploadDir = path.join(__dirname, '../uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

router.post('/register', upload.single('profileImage'), async (req, res) => {
    try {
        const { username, password, nickname } = req.body;
        if (!username || !password || !nickname) return res.status(400).json({ success: false, message: '모든 필수 항목을 입력해주세요.' });

        const existingUser = await User.findOne({ username });
        if (existingUser) return res.status(400).json({ success: false, message: '이미 존재하는 아이디입니다.' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        let profileImagePath = '/uploads/default-profile.png';
        if (req.file) profileImagePath = \`/uploads/\${req.file.filename}\`;

        const newUser = new User({ username, password: hashedPassword, nickname, profileImage: profileImagePath, friends: [] });
        await newUser.save();
        return res.status(201).json({ success: true, message: '회원가입이 완료되었습니다.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: '서버 내부 오류', error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ success: false, message: '아이디와 비밀번호를 입력해주세요.' });

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ success: false, message: '존재하지 않는 아이디입니다.' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET || 'chat_app_secret_key_2026_safe_and_secure', { expiresIn: '24h' });
        return res.status(200).json({ success: true, token, user: { id: user._id, username: user.username, nickname: user.nickname, profileImage: user.profileImage } });
    } catch (error) {
        return res.status(500).json({ success: false, message: '서버 내부 오류', error: error.message });
    }
});

module.exports = router;`,

    'server/users.js': `const express = require('express');
const router = express.Router();
const User = require('./User');
const Message = require('./Message');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('./middleware');

const uploadDir = path.join(__dirname, '../uploads/');
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage: storage });

router.get('/', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('friends', 'username nickname profileImage isOnline');
        return res.status(200).json({ success: true, friends: user.friends || [], me: { id: user._id, nickname: user.nickname, profileImage: user.profileImage, username: user.username } });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/friend', authenticateToken, async (req, res) => {
    try {
        const { friendUsername } = req.body;
        if (friendUsername === req.user.username) return res.status(400).json({ success: false, message: '본인은 추가할 수 없습니다.' });

        const friendUser = await User.findOne({ username: friendUsername });
        if (!friendUser) return res.status(404).json({ success: false, message: '사용자를 찾을 수 없습니다.' });

        const currentUser = await User.findById(req.user.id);
        if (currentUser.friends.includes(friendUser._id)) return res.status(400).json({ success: false, message: '이미 친구입니다.' });

        currentUser.friends.push(friendUser._id);
        await currentUser.save();
        friendUser.friends.push(currentUser._id);
        await friendUser.save();

        return res.status(200).json({ success: true, message: '친구 추가 완료' });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/messages/:userId', authenticateToken, async (req, res) => {
    try {
        const messages = await Message.find({ $or: [{ sender: req.user.id, recipient: req.params.userId }, { sender: req.params.userId, recipient: req.user.id }] }).sort({ timestamp: 1 });
        return res.status(200).json({ success: true, messages });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/messages', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { recipient, content } = req.body;
        let messageType = 'text', finalContent = content;
        if (req.file) { messageType = 'image'; finalContent = \`/uploads/\${req.file.filename}\`; }

        const newMessage = new Message({ sender: req.user.id, recipient, messageType, content: finalContent || '', isRead: false });
        await newMessage.save();
        return res.status(201).json({ success: true, message: newMessage });
    } catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;`,

    'server/server.js': `require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

process.on('uncaughtException', (err) => console.error(err));
process.on('unhandledRejection', (reason) => console.error(reason));

const authRoutes = require('./auth');
const userRoutes = require('./users');
const User = require('./User');
const Message = require('./Message');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: '*', methods: ['GET', 'POST'] } });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../client')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI).then(() => console.log('MongoDB Connected')).catch(err => console.error(err));

const onlineUsers = new Map();
io.on('connection', (socket) => {
    socket.on('login', async (userId) => {
        if (!userId) return;
        socket.userId = userId;
        onlineUsers.set(userId, socket.id);
        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit('status_change', { userId, isOnline: true });
    });
    socket.on('message', (data) => {
        const targetSocketId = onlineUsers.get(data.recipient);
        if (targetSocketId) io.to(targetSocketId).emit('message', data);
        socket.emit('message_self', data);
    });
    socket.on('disconnect', async () => {
        if (socket.userId) {
            onlineUsers.delete(socket.userId);
            await User.findByIdAndUpdate(socket.userId, { isOnline: false });
            io.emit('status_change', { userId: socket.userId, isOnline: false });
        }
    });
});

server.listen(PORT, () => console.log(\`Server is running on port \${PORT}\`));`,

    'client/index.html': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><title>Chat App</title><link rel="stylesheet" href="style.css">
</head>
<body class="landing-body">
    <div class="landing-container">
        <h1>Chat App</h1><p>실시간 대화형 채팅 공간</p>
        <div class="landing-buttons">
            <button class="btn-primary" onclick="location.href='login.html'">로그인</button>
            <button class="btn-secondary" onclick="location.href='register.html'">회원가입</button>
        </div>
    </div>
    <script>if(localStorage.getItem('token')) location.href='chat.html';</script>
</body>
</html>`,

    'client/login.html': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><title>로그인</title><link rel="stylesheet" href="style.css">
</head>
<body class="auth-body">
    <div class="auth-container">
        <h2>로그인</h2>
        <form id="login-form">
            <div class="input-group"><label>아이디</label><input type="text" id="username" required></div>
            <div class="input-group"><label>비밀번호</label><input type="password" id="password" required></div>
            <button type="submit" class="btn-submit">로그인</button>
        </form>
        <div class="auth-link">계정이 없으신가요? <a href="register.html">회원가입</a></div>
    </div>
    <script src="login.js"></script>
</body>
</html>`,

    'client/register.html': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><title>회원가입</title><link rel="stylesheet" href="style.css">
</head>
<body class="auth-body">
    <div class="auth-container">
        <h2>회원가입</h2>
        <form id="register-form">
            <div class="input-group"><label>아이디</label><input type="text" id="username" required></div>
            <div class="input-group"><label>비밀번호</label><input type="password" id="password" required></div>
            <div class="input-group"><label>닉네임</label><input type="text" id="nickname" required></div>
            <div class="input-group"><label>프로필 이미지</label><input type="file" id="profileImage" accept="image/*"></div>
            <button type="submit" class="btn-submit">가입하기</button>
        </form>
        <div class="auth-link">이미 계정이 있으신가요? <a href="login.html">로그인</a></div>
    </div>
    <script src="register.js"></script>
</body>
</html>`,

    'client/chat.html': `<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8"><title>채팅룸</title><link rel="stylesheet" href="style.css"><script src="/socket.io/socket.io.js"></script>
</head>
<body class="chat-body">
    <div class="chat-app-container">
        <aside class="sidebar">
            <div class="my-profile"><img id="my-avatar" src="" alt="P"><span id="my-nickname">..</span><button id="btn-logout">로그아웃</button></div>
            <div class="friend-add-box"><input type="text" id="input-friend-id" placeholder="친구 아이디..."><button id="btn-add-friend">+</button></div>
            <div class="friends-list-container"><h3>친구 목록</h3><ul id="friends-list"></ul></div>
        </aside>
        <main class="chat-area">
            <div id="chat-blank" class="chat-blank">대화 상대를 선택해 주세요.</div>
            <div id="chat-window" class="chat-window hide">
                <header class="chat-header"><img id="target-avatar" src="" alt="P"><span id="target-nickname">..</span></header>
                <div id="messages-display" class="messages-display"></div>
                <footer class="chat-footer">
                    <label for="file-image-send">📁</label><input type="file" id="file-image-send" accept="image/*" class="hide">
                    <input type="text" id="chat-text-input" placeholder="메시지 입력..."><button id="btn-send-message">전송</button>
                </footer>
            </div>
        </main>
    </div>
    <script src="socket.js"></script><script src="chat.js"></script>
</body>
</html>`,

    'client/style.css': `* { margin: 0; padding: 0; box-sizing: border-box; font-family: sans-serif; }
body { background-color: #f0f0f0; display: flex; justify-content: center; align-items: center; height: 100vh; }
.landing-body { background-color: #ffeb33; }
.landing-container { text-align: center; color: #3c3c3c; }
.landing-container h1 { font-size: 2.5rem; margin-bottom: 10px; }
.landing-buttons button { padding: 12px 25px; font-size: 1rem; border: none; border-radius: 5px; cursor: pointer; margin: 5px; font-weight: bold; }
.btn-primary { background-color: #3c3c3c; color: white; }
.btn-secondary { background-color: white; color: #3c3c3c; border: 1px solid #3c3c3c; }
.auth-body { background-color: #f2f2f2; }
.auth-container { background: white; padding: 40px; border-radius: 8px; width: 100%; max-width: 400px; }
.auth-container h2 { margin-bottom: 25px; text-align: center; }
.input-group { margin-bottom: 15px; }
.input-group label { display: block; margin-bottom: 5px; font-size: 0.9rem; }
.input-group input { width: 100%; padding: 10px; border: 1px solid #ccc; border-radius: 4px; }
.btn-submit { width: 100%; padding: 12px; background-color: #ffeb33; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; margin-top: 10px; }
.auth-link { text-align: center; margin-top: 15px; font-size: 0.85rem; }
.chat-body { background-color: #eef2f5; height: 100vh; width: 100vw; display: flex; }
.chat-app-container { display: flex; width: 100%; height: 100%; background: white; }
.sidebar { width: 320px; background-color: #fafafa; border-right: 1px solid #e6e6e6; display: flex; flex-direction: column; }
.my-profile { display: flex; align-items: center; padding: 20px; border-bottom: 1px solid #e6e6e6; }
.my-profile img { width: 50px; height: 50px; border-radius: 35%; margin-right: 15px; }
#my-nickname { font-weight: bold; flex: 1; }
#btn-logout { padding: 5px 10px; background: #e6e6e6; border: none; border-radius: 4px; cursor: pointer; }
.friend-add-box { display: flex; padding: 15px; border-bottom: 1px solid #e6e6e6; }
.friend-add-box input { flex: 1; padding: 8px; border: 1px solid #e1e1e1; border-radius: 4px; }
.friend-add-box button { width: 40px; margin-left: 5px; background-color: #ffeb33; border: none; border-radius: 4px; cursor: pointer; }
.friends-list-container { flex: 1; overflow-y: auto; padding: 15px 0; }
.friend-item { display: flex; align-items: center; padding: 12px 20px; cursor: pointer; }
.friend-item.active { background-color: #e4e7ea; }
.friend-avatar-wrap { position: relative; margin-right: 15px; }
.friend-avatar-wrap img { width: 45px; height: 45px; border-radius: 35%; }
.status-badge { position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background-color: #ccc; border: 2px solid white; border-radius: 50%; }
.status-badge.online { background-color: #4caf50; }
.chat-area { flex: 1; display: flex; flex-direction: column; background-color: #b2c7da; }
.chat-blank { flex: 1; display: flex; justify-content: center; align-items: center; background: white; }
.chat-window { flex: 1; display: flex; flex-direction: column; height: 100%; }
.chat-header { height: 60px; background: white; border-bottom: 1px solid #e6e6e6; display: flex; align-items: center; padding: 0 20px; }
.chat-header img { width: 40px; height: 40px; border-radius: 35%; margin-right: 12px; }
.messages-display { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; }
.msg-wrapper { display: flex; margin-bottom: 15px; max-width: 65%; }
.msg-wrapper.me { align-self: flex-end; flex-direction: row-reverse; }
.msg-wrapper.other { align-self: flex-start; }
.msg-bubble { padding: 10px 14px; border-radius: 8px; background: white; }
.msg-wrapper.me .msg-bubble { background: #ffeb33; }
.msg-bubble img { max-width: 200px; border-radius: 5px; }
.msg-meta { display: flex; align-items: flex-end; margin: 0 5px; font-size: 0.7rem; color: #555; }
.chat-footer { padding: 15px; background: white; display: flex; align-items: center; }
.chat-footer label { font-size: 1.5rem; margin-right: 10px; cursor: pointer; }
#chat-text-input { flex: 1; padding: 12px; border: 1px solid #e6e6e6; border-radius: 6px; }
#btn-send-message { padding: 11px 20px; background: #ffeb33; border: none; border-radius: 6px; margin-left: 10px; cursor: pointer; }
.hide { display: none !important; }`,

    'client/register.js': `document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('username', document.getElementById('username').value);
    formData.append('password', document.getElementById('password').value);
    formData.append('nickname', document.getElementById('nickname').value);
    const file = document.getElementById('profileImage').files[0];
    if (file) formData.append('profileImage', file);

    try {
        const res = await fetch('/api/auth/register', { method: 'POST', body: formData });
        const data = await res.json();
        alert(data.message);
        if (res.ok && data.success) location.href = 'login.html';
    } catch (err) {
        alert('네트워크 오류');
    }
});`,

    'client/login.js': `document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok && data.success) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            alert('로그인 성공');
            location.href = 'chat.html';
        } else {
            alert(data.message);
        }
    } catch (err) {
        alert('네트워크 오류');
    }
});`,

    'client/socket.js': `let socket;
function initSocketConnection(userId) {
    socket = io();
    socket.on('connect', () => socket.emit('login', userId));
    socket.on('status_change', (data) => {
        const badge = document.querySelector(\`[data-id="\${data.userId}"] .status-badge\`);
        if (badge) data.isOnline ? badge.classList.add('online') : badge.classList.remove('online');
    });
    socket.on('message', (data) => {
        if (window.activeTargetId === data.sender) {
            appendMessage(data, 'other');
            scrollChatToBottom();
        }
    });
    socket.on('message_self', (data) => {
        if (window.activeTargetId === data.recipient) {
            appendMessage(data, 'me');
            scrollChatToBottom();
        }
    });
}`,

    'client/chat.js': `window.activeTargetId = null;
let myInfo = null;

document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('token');
    if (!token) { location.href = 'login.html'; return; }
    myInfo = JSON.parse(localStorage.getItem('user'));
    initSocketConnection(myInfo.id);
    loadInitData();

    document.getElementById('btn-logout').addEventListener('click', () => { localStorage.clear(); location.href = 'login.html'; });
    document.getElementById('btn-add-friend').addEventListener('click', addFriend);
    document.getElementById('btn-send-message').addEventListener('click', sendText);
    document.getElementById('file-image-send').addEventListener('change', sendImage);
});

async function loadInitData() {
    const res = await fetch('/api/users', { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const data = await res.json();
    if (data.success) {
        document.getElementById('my-avatar').src = data.me.profileImage;
        document.getElementById('my-nickname').textContent = data.me.nickname;
        const list = document.getElementById('friends-list');
        list.innerHTML = '';
        data.friends.forEach(f => {
            const li = document.createElement('li');
            li.className = 'friend-item';
            li.setAttribute('data-id', f._id);
            li.innerHTML = \`<div class="friend-avatar-wrap"><img src="\${f.profileImage}"><div class="status-badge \${f.isOnline?'online':''}"></div></div><div>\${f.nickname}</div>\`;
            li.addEventListener('click', () => selectChat(f));
            list.appendChild(li);
        });
    }
}

async function addFriend() {
    const name = document.getElementById('input-friend-id').value.trim();
    const res = await fetch('/api/users/friend', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ friendUsername: name }) });
    const data = await res.json();
    alert(data.message);
    if (data.success) { document.getElementById('input-friend-id').value = ''; loadInitData(); }
}

async function selectChat(f) {
    window.activeTargetId = f._id;
    document.getElementById('chat-blank').classList.add('hide');
    document.getElementById('chat-window').classList.remove('hide');
    document.getElementById('target-avatar').src = f.profileImage;
    document.getElementById('target-nickname').textContent = f.nickname;
    document.getElementById('messages-display').innerHTML = '';

    const res = await fetch('/api/users/messages/' + f._id, { headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } });
    const data = await res.json();
    if (data.success) {
        data.messages.forEach(m => appendMessage(m, m.sender === myInfo.id ? 'me' : 'other'));
        scrollChatToBottom();
    }
}

function appendMessage(m, dir) {
    const display = document.getElementById('messages-display');
    const wrap = document.createElement('div');
    wrap.className = 'msg-wrapper ' + dir;
    let bubble = \`<div class="msg-bubble">\${m.content}</div>\`;
    if (m.messageType === 'image') bubble = \`<div class="msg-bubble"><img src="\${m.content}"></div>\`;
    wrap.innerHTML = bubble + \`<div class="msg-meta">\${new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>\`;
    display.appendChild(wrap);
}

async function sendText() {
    const input = document.getElementById('chat-text-input');
    const text = input.value.trim();
    if (!text) return;
    const res = await fetch('/api/users/messages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: JSON.stringify({ recipient: window.activeTargetId, content: text }) });
    const data = await res.json();
    if (data.success) { input.value = ''; socket.emit('message', data.message); }
}

async function sendImage(e) {
    const formData = new FormData();
    formData.append('recipient', window.activeTargetId);
    formData.append('image', e.target.files[0]);
    const res = await fetch('/api/users/messages', { method: 'POST', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }, body: formData });
    const data = await res.json();
    if (data.success) socket.emit('message', data.message);
}

function scrollChatToBottom() { const d = document.getElementById('messages-display'); d.scrollTop = d.scrollHeight; }`
};

console.log('Project builder initiated...');

dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

Object.entries(files).forEach(([filepath, content]) => {
    const fullPath = path.join(__dirname, filepath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content.trim(), 'utf8');
    console.log(`Created: ${filepath}`);
});

console.log('\\nAll files generated successfully!');
console.log('Follow the next steps to start your server.');