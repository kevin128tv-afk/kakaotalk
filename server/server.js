const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

app.use(express.json());

// 메인 경로 및 client 폴더 정적 파일 제공
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'client')));

// 로그인 페이지 경로 자동 탐색 함수
function sendLoginPage(req, res) {
  if (fs.existsSync(path.join(__dirname, 'login.html'))) {
    res.sendFile(path.join(__dirname, 'login.html'));
  } else if (fs.existsSync(path.join(__dirname, 'client', 'login.html'))) {
    res.sendFile(path.join(__dirname, 'client', 'login.html'));
  } else {
    res.status(404).send('login.html 파일을 찾을 수 없습니다.');
  }
}

app.get('/', sendLoginPage);
app.get('/login.html', sendLoginPage);

// 로그인 API
app.post('/api/auth/login', (req, res) => {
  const { id, password } = req.body;
  
  if ((id === "1" && password === "1") || (id === "2" && password === "2")) {
    return res.status(200).json({ 
      success: true, 
      user: { id: id, name: `테스터${id}` } 
    });
  } else {
    return res.status(401).json({ 
      success: false, 
      message: '아이디 1 또는 2를 사용해주세요.' 
    });
  }
});

// 실시간 Socket.io 통신
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

// Render 지정 포트
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
