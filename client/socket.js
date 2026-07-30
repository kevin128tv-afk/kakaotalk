let socket;
function initSocketConnection(userId) {
    socket = io('https://chat-app-qylu.onrender.com/login.html');
    socket.on('connect', () => socket.emit('login', userId));
    socket.on('status_change', (data) => {
        const badge = document.querySelector(`[data-id="${data.userId}"] .status-badge`);
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
}