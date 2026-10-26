let socket = null;
let myUsername = "";
let reconnectDelay = 1000;
const MAX_RECONNECT_DELAY = 16000;
let typingTimeout = null;

const loginScreen = document.getElementById('login-screen');
const chatScreen = document.getElementById('chat-screen');
const usernameInput = document.getElementById('username-input');
const joinBtn = document.getElementById('join-btn');
const statusBadge = document.getElementById('status-badge');
const messagesBox = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const userList = document.getElementById('user-list');
const typingIndicator = document.getElementById('typing-indicator');

const READY_STATES = {
  0: { text: 'CONNECTING (0)', color: '#ffc107' },
  1: { text: 'OPEN (1)', color: '#28a745' },
  2: { text: 'CLOSING (2)', color: '#fd7e14' },
  3: { text: 'CLOSED (3)', color: '#dc3545' }
};

function updateStatus() {
  if (!socket) return;
  const state = READY_STATES[socket.readyState] || { text: 'UNKNOWN', color: '#6c757d' };
  statusBadge.textContent = `State: ${state.text}`;
  statusBadge.style.backgroundColor = state.color;
  statusBadge.style.color = 'white';
}

function connectWebSocket() {
  socket = new WebSocket(CONFIG.WS_URL);
  updateStatus();

  socket.onopen = () => {
    updateStatus();
    reconnectDelay = 1000;
    if (myUsername) {
      socket.send(JSON.stringify({ type: 'join', username: myUsername }));
    }
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'join_ack') {
      loginScreen.classList.add('hidden');
      chatScreen.classList.remove('hidden');
      document.getElementById('user-info').textContent = `Usuario: ${data.username}`;
      messagesBox.innerHTML = '';
      if (data.history) data.history.forEach(appendMessage);
    } else if (data.type === 'message') {
      appendMessage(data);
    } else if (data.type === 'sys_message') {
      appendSystemMessage(data.text);
    } else if (data.type === 'user_list') {
      renderUserList(data.users);
    } else if (data.type === 'typing') {
      if (data.username !== myUsername) {
        typingIndicator.textContent = data.isTyping ? `${data.username} está escribiendo...` : '';
      }
    } else if (data.type === 'error') {
      alert(data.message);
    }
  };

  socket.onclose = () => {
    updateStatus();
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      connectWebSocket();
    }, reconnectDelay);
  };

  socket.onerror = (err) => {
    console.error('Error de conexión WebSocket:', err);
    updateStatus();
  };
}

function appendMessage(msg) {
  const div = document.createElement('div');
  div.className = 'msg';

  const boldUser = document.createElement('strong');
  boldUser.textContent = msg.user + ': ';

  const textSpan = document.createElement('span');
  textSpan.textContent = msg.text;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'time';
  timeSpan.textContent = msg.time;

  div.appendChild(boldUser);
  div.appendChild(textSpan);
  div.appendChild(timeSpan);

  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function appendSystemMessage(text) {
  const div = document.createElement('div');
  div.className = 'msg sys';
  div.textContent = text;
  messagesBox.appendChild(div);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function renderUserList(users) {
  userList.innerHTML = '';
  users.forEach(u => {
    const li = document.createElement('li');
    li.textContent = u;
    userList.appendChild(li);
  });
}

joinBtn.addEventListener('click', () => {
  const val = usernameInput.value.trim();
  if (val) {
    myUsername = val;
    connectWebSocket();
  }
});

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (text && socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'message', text }));
    messageInput.value = '';
    sendTypingSignal(false);
  }
});

messageInput.addEventListener('input', () => {
  if (socket && socket.readyState === WebSocket.OPEN) {
    sendTypingSignal(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => sendTypingSignal(false), 2000);
  }
});

function sendTypingSignal(isTyping) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'typing', isTyping }));
  }
}