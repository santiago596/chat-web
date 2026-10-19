const localHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const backendHost = 'node-us-east-va.clicfstudios.com:9017';

const CONFIG = {
  WS_URL: window.CHAT_WS_URL || (
    localHost
      ? 'ws://localhost:8080'
      : `${wsProtocol}//${backendHost}`
  )
};