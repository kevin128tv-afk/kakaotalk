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

let messages = [];
// 현재 접속 중인 소켓과 유저 이력 관리
const activeSockets = new Map(); // socket.id -> username

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {

  socket.on('join', (username) => {
    socket.username = username;
    activeSockets.set(socket.id, username);

    // 현재 접속된 유저들 이름 목록 (중복 제거)
    const onlineUsers = new Set(activeSockets.values());

    // 내가 들어왔으니, 상대방이 보낸 이전 메시지 중 내가 안 읽은 것을 읽음(readBy)으로 업데이트
    let isUpdated = false;
    messages.forEach(msg => {
      if (msg.sender !== username && !msg.readBy.includes(username)) {
        msg.readBy.push(username);
        isUpdated = true;
      }
    });

    socket.emit('initMessages', messages);

    if (isUpdated) {
      io.emit('messagesReadStatusUpdated', messages);
    }
  });

  socket.on('sendMessage', (messageData) => {
    const sender = messageData.sender;
    const onlineUsers = new Set(activeSockets.values());

    // 메시지를 보낸 순간 실시간으로 접속해 있는 사람들을 readBy에 추가
    const readBy = [sender];
    onlineUsers.forEach(user => {
      if (user !== sender && !readBy.includes(user)) {
        readBy.push(user);
      }
    });

    const msgObj = {
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      sender: sender,
      text: messageData.text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      readBy: readBy
    };

    messages.push(msgObj);
    io.emit('message', msgObj);
  });

  socket.on('deleteSingleMessage', (msgId) => {
    messages = messages.filter(m => m.id !== msgId);
    io.emit('messageDeleted', msgId);
  });

  socket.on('clearAllMessages', () => {
    messages = [];
    io.emit('allMessagesCleared');
  });

  socket.on('disconnect', () => {
    activeSockets.delete(socket.id);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
