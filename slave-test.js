const WebSocket = require('ws');

// Railway WebSocket URL
const ws = new WebSocket('wss://stremio-sync-server-production.up.railway.app/');

ws.on('open', () => {
  console.log('✅ Connected as SLAVE');
  ws.send(JSON.stringify({ role: 'slave' }));
});

ws.on('message', (msg) => {
  console.log('Message from master:', msg.toString());
});

ws.on('message', (msg) => {
  const data = JSON.parse(msg.toString());
  if(data.command) {
    console.log('Command from master:', data);
  }
});
