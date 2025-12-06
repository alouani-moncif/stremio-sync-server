const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// 1. Serve static files (HTML, video, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// 2. Create HTTP server (needed for ws upgrade)
const server = http.createServer(app);

// 3. Create WebSocket server on same HTTP server
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();
let pendingCommands = [];

// — (your existing WS logic here) —

wss.on('connection', ws => {
  ws.on('message', raw => {
    const msgStr = raw.toString();
    let data;
    try { data = JSON.parse(msgStr); }
    catch { return; }

    // Role & forwarding logic...
  });
});

// 4. Start server (listen on all interfaces)
server.listen(port, '0.0.0.0', () => {
  console.log(`HTTP + WS server running on port ${port}`);
});
