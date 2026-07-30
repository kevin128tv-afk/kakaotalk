const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// static 파일 제공
app.use(express.static(__dirname));

// 메인 및 로그인 페이지
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 로그인 처리 API (아이디 1, 2 지원)
app.post('/api/auth/login', (req, res) => {
  const { id, password } = req.body;
  
  const reqId = String(id).trim();
  const reqPw = String(password).trim();

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

// 소켓 통신
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
