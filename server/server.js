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

// 메시지 및 접속 유저 상태 관리
let messages = [];
let activeUsers = new Set(); // 현재 접속 중인 유저 이름들

// Socket.io 통신
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {

  socket.on('join', (username) => {
    socket.username = username;
    activeUsers.add(username);

    // 새 유저 접속 시, 상대방이 보낸 안 읽은 메시지들을 읽음 상태(readBy에 추가)로 변경
    let updated = false;
    messages.forEach(msg => {
      if (msg.sender !== username && !msg.readBy.includes(username)) {
        msg.readBy.push(username);
        updated = true;
      }
    });

    // 전체 메시지 목록 전송
    socket.emit('initMessages', messages);

    // 읽음 상태 업데이트되었으면 접속한 모두에게 알림
    if (updated) {
      io.emit('messagesReadStatusUpdated', messages);
    }
  });

  // 메시지 전송
  socket.on('sendMessage', (messageData) => {
    const sender = messageData.sender;
    const readBy = [sender]; // 보낸 사람은 기본으로 읽음 처리

    // 현재 접속 중인 다른 유저가 있다면 즉시 읽음 처리
    activeUsers.forEach(u => {
      if (u !== sender && !readBy.includes(u)) {
        readBy.push(u);
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

  // 접속 종료 처리
  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsers.delete(socket.username);
    }
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
