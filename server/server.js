const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

app.use(express.json());

// 1. MongoDB Atlas 연결
const MONGO_URI = process.env.MONGO_URI || "mongodb+srv://admin:1234@cluster0.example.mongodb.net/chatApp?retryWrites=true&w=w=";

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB Database Connected Successfully 🎉'))
  .catch((err) => console.error('MongoDB Connection Error:', err.message));

// 2. 메시지 DB 스키마 정의
const messageSchema = new mongoose.Schema({
  sender: String,
  text: String,
  timestamp: { type: Date, default: Date.now }
});
const Message = mongoose.model('Message', messageSchema);

// 정적 파일 제공 (루트 및 client 폴더)
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'client')));

// 접속 시 로그인 페이지로 자동 리다이렉트
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

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

// 이전 대화 기록 가져오기 API
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 }).limit(100);
    res.status(200).json(messages);
  } catch (err) {
    res.status(500).json({ error: '대화 기록 불러오기 실패' });
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

  socket.on('sendMessage', async (messageData) => {
    try {
      // DB에 대화 저장
      const newMsg = new Message({
        sender: messageData.sender,
        text: messageData.text
      });
      await newMsg.save();

      // 전송자/수신자 전체에게 브로드캐스트
      io.emit('message', {
        sender: newMsg.sender,
        text: newMsg.text,
        timestamp: newMsg.timestamp.toLocaleTimeString()
      });
    } catch (err) {
      console.error('메시지 저장 중 오류:', err);
    }
  });
});

// Render 포트 및 서버 바인딩
const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});