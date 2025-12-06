const WebSocket = require('ws');

// Railway WebSocket URL
const ws = new WebSocket('wss://stremio-sync-server-production.up.railway.app/');

ws.on('open', () => {
  console.log('✅ Connected as MASTER');
  ws.send(JSON.stringify({ role: 'master' }));

  // Send a test play command after 2 seconds
  setTimeout(() => {
    ws.send(JSON.stringify({ command: 'play', time: 0 }));
    console.log('Sent play command to slave');
  }, 2000);
});

ws.on('message', (msg) => {
  console.log('Message from server:', msg.toString());
});

setTimeout(() => {
  ws.send(JSON.stringify({ command: 'play', time: 0 }));
  console.log('Sent play command to slave');
}, 3000);
