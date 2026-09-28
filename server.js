const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');

const PORT = process.env.PORT || 9013;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || '*';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WebSocket Server Running');
});

const wss = new WebSocketServer({ noServer: true });

const clients = new Map();
const messageHistory = [];
const MAX_HISTORY = 20;
const MAX_MSG_LENGTH = 300;
const RATE_LIMIT_MS = 500;

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function broadcast(data) {
  const payload = JSON.stringify(data);
  for (const [clientWS, userData] of clients.entries()) {
    if (clientWS.readyState === WebSocket.OPEN && userData.username) {
      clientWS.send(payload);
    }
  }
}

function broadcastUserList() {
  const users = Array.from(clients.values())
    .map(u => u.username)
    .filter(Boolean);
  broadcast({ type: 'user_list', users });
}

server.on('upgrade', (request, socket, head) => {
  const origin = request.headers.origin;
  console.log(`[upgrade] Solicitud de conexión desde origen: ${origin}`);

  if (ALLOWED_ORIGINS !== '*' && origin !== ALLOWED_ORIGINS) {
    console.log(`[upgrade] Rechazado: Origen no permitido (${origin})`);
    socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

wss.on('connection', (ws) => {
  clients.set(ws, { username: null, isAlive: true, lastMessageTime: 0 });

  ws.on('pong', () => {
    const user = clients.get(ws);
    if (user) user.isAlive = true;
  });

  ws.on('message', (rawData) => {
    try {
      const data = JSON.parse(rawData);
      const user = clients.get(ws);

      if (data.type === 'join') {
        const username = escapeHTML((data.username || '').trim());
        if (!username || username.length > 20) {
          ws.send(JSON.stringify({ type: 'error', message: 'Nombre inválido (1-20 caracteres).' }));
          return;
        }

        user.username = username;
        ws.send(JSON.stringify({ type: 'join_ack', username, history: messageHistory }));
        broadcast({ type: 'sys_message', text: `🟢 ${username} se ha conectado.` });
        broadcastUserList();
        return;
      }

      if (!user.username) {
        ws.send(JSON.stringify({ type: 'error', message: 'Debes registrarte primero.' }));
        return;
      }

      if (data.type === 'typing') {
        broadcast({ type: 'typing', username: user.username, isTyping: !!data.isTyping });
        return;
      }

      if (data.type === 'message') {
        const now = Date.now();
        if (now - user.lastMessageTime < RATE_LIMIT_MS) {
          ws.send(JSON.stringify({ type: 'error', message: 'Estás enviando mensajes demasiado rápido.' }));
          return;
        }
        user.lastMessageTime = now;

        const cleanText = escapeHTML((data.text || '').trim());
        if (!cleanText || cleanText.length > MAX_MSG_LENGTH) {
          ws.send(JSON.stringify({ type: 'error', message: 'Mensaje vacío o demasiado largo.' }));
          return;
        }

        const msgObj = {
          type: 'message',
          user: user.username,
          text: cleanText,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        messageHistory.push(msgObj);
        if (messageHistory.length > MAX_HISTORY) messageHistory.shift();

        broadcast(msgObj);
      }

    } catch (err) {
      console.error('Error procesando mensaje:', err);
    }
  });

  ws.on('close', () => {
    const user = clients.get(ws);
    if (user && user.username) {
      console.log(`[cierre] Conexión cerrada para el usuario: ${user.username}`);
      broadcast({ type: 'sys_message', text: `🔴 ${user.username} se ha desconectado.` });
      clients.delete(ws);
      broadcastUserList();
    } else {
      console.log('[cierre] Conexión cerrada sin autenticar.');
      clients.delete(ws);
    }
  });
});

const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const user = clients.get(ws);
    if (!user) return;
    if (user.isAlive === false) {
      console.log(`[cierre] Terminando conexión inactiva: ${user.username || 'Anónimo'}`);
      return ws.terminate();
    }
    user.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => clearInterval(interval));

server.listen(PORT, () => {
  console.log(`Servidor de WebSocket escuchando en el puerto ${PORT}`);
});