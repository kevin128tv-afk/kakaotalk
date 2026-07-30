window.activeTargetId = null;
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
            li.innerHTML = `<div class="friend-avatar-wrap"><img src="${f.profileImage}"><div class="status-badge ${f.isOnline?'online':''}"></div></div><div>${f.nickname}</div>`;
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
    let bubble = `<div class="msg-bubble">${m.content}</div>`;
    if (m.messageType === 'image') bubble = `<div class="msg-bubble"><img src="${m.content}"></div>`;
    wrap.innerHTML = bubble + `<div class="msg-meta">${new Date(m.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>`;
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

function scrollChatToBottom() { const d = document.getElementById('messages-display'); d.scrollTop = d.scrollHeight; }