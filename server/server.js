const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

app.get('/', (req, res) => res.sendFile(path.join(clientPath, 'login.html')));
app.get('/login.html', (req, res) => res.sendFile(path.join(clientPath, 'login.html')));
app.get('/chat.html', (req, res) => res.sendFile(path.join(clientPath, 'chat.html')));

// 로그인 API
app.post('/api/auth/login', (req, res) => {
  const { id, password } = req.body;
  const reqId = String(id || '').trim();
  const reqPw = String(password || '').trim();

  if ((reqId === "1" && reqPw === "1") || (reqId === "2" && reqPw === "2")) {
    return res.status(200).json({ 
      success: true, 
      user: { id: reqId, name: `테스터${reqId}` } 
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: '아이디 1 또는 2를 사용해주세요.' 
    });
  }
});

// 서버 메모리에 메시지 저장
let messages = [];

// Socket.io 통신
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  // 입장 시 기존 메시지 이력 보냄
  socket.emit('initMessages', messages);

  socket.on('join', (username) => {
    socket.username = username;
  });

  // 메시지 전송
  socket.on('sendMessage', (messageData) => {
    const msgObj = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      sender: messageData.sender,
      text: messageData.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    messages.push(msgObj);
    io.emit('message', msgObj);
  });

  // 개별 메시지 삭제
  socket.on('deleteSingleMessage', (msgId) => {
    messages = messages.filter(m => m.id !== msgId);
    io.emit('messageDeleted', msgId);
  });

  // 모든 기록 삭제
  socket.on('clearAllMessages', () => {
    messages = [];
    io.emit('allMessagesCleared');
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
