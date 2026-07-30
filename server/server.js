const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Render 배포 시 HTML, JS 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, '../client')));

// 1. 프리패스 로그인 API (아이디 1, 2만 허용)
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

// 2. 실시간 채팅 소켓 엔진
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});