// URL wss:// del backend desplegado en KyraCloud (cámbiala por la tuya).
const BACKEND_URL = 'wss://TU-BACKEND.kyracloud.com';

const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);

const CONFIG = {
  WS_URL: window.CHAT_WS_URL || (localHost ? 'ws://localhost:3000' : BACKEND_URL)
};
