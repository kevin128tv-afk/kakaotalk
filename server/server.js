const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 현재 디렉토리 및 상위 디렉토리 정적 파일 개방
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '..')));

// login.html 안전하게 전송하는 함수
function sendLogin(req, res) {
  const currentPath = path.join(__dirname, 'login.html');
  const parentPath = path.join(__dirname, '..', 'login.html');

  if (fs.existsSync(currentPath)) {
    return res.sendFile(currentPath);
  } else if (fs.existsSync(parentPath)) {
    return res.sendFile(parentPath);
  } else {
    return res.status(404).send('login.html 파일을 찾을 수 없습니다.');
  }
}

// chat.html 안전하게 전송하는 함수
function sendChat(req, res) {
  const currentPath = path.join(__dirname, 'chat.html');
  const parentPath = path.join(__dirname, '..', 'chat.html');

  if (fs.existsSync(currentPath)) {
    return res.sendFile(currentPath);
  } else if (fs.existsSync(parentPath)) {
    return res.sendFile(parentPath);
  } else {
    return res.status(404).send('chat.html 파일을 찾을 수 없습니다.');
  }
}

// 라우팅 설정
app.get('/', sendLogin);
app.get('/login.html', sendLogin);
app.get('/chat.html', sendChat);

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

// Socket.io 통신
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on('connection', (socket) => {
  socket.on('join', (username) => {
    socket.username = username;
  });

  socket.on('sendMessage', (messageData) => {
    io.emit('message', {
      ...messageData,
      timestamp: new Date().toLocaleTimeString()
    });
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
