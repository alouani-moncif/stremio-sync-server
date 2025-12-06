// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// 1. Serve static files (HTML, video, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// 2. HTTP server needed for WebSocket
const server = http.createServer(app);

// 3. WebSocket server attached to same HTTP server
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();
let pendingCommands = [];

// 4. WS logic
wss.on('connection', ws => {
  ws.on('message', raw => {
    let data;
    try { data = JSON.parse(raw.toString()); }
    catch { return; }

    // Master connection
    if (data.role === 'master') {
      master = ws;
      ws.send(JSON.stringify({ status: 'connected as master' }));
      console.log('Master connected');

      // Send any pending commands to newly connected slaves
      pendingCommands.forEach(cmd => {
        slaves.forEach(slave => {
          if(slave.readyState === WebSocket.OPEN) slave.send(cmd);
        });
      });
      return;
    }

    // Slave connection
    if (data.role === 'slave') {
      slaves.add(ws);
      ws.send(JSON.stringify({ status: 'connected as slave' }));
      console.log(`Slave connected. Total slaves: ${slaves.size}`);

      // Send pending commands from master
      pendingCommands.forEach(cmd => {
        if(ws.readyState === WebSocket.OPEN) ws.send(cmd);
      });
      return;
    }

    // Forward commands from master → slaves
    if (ws === master) {
      slaves.forEach(slave => {
        if(slave.readyState === WebSocket.OPEN) slave.send(raw);
      });
      // Store command
      pendingCommands.push(raw);
    }
  });

  ws.on('close', () => {
    if(ws === master) {
      master = null;
      console.log('Master disconnected');
    }
    if(slaves.has(ws)) {
      slaves.delete(ws);
      console.log(`Slave disconnected. Remaining slaves: ${slaves.size}`);
    }
  });
});

// 5. Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`HTTP + WS server running on port ${port}`);
});
