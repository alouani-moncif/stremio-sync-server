const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();

// Serve static files (HTML, JS, video)
app.use(express.static(path.join(__dirname, 'public')));

// HTTP server
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

// ... your existing WS logic ...
let master = null;
let slaves = new Set();
let pendingCommands = [];

wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
        let message = raw;
        if (raw instanceof Buffer) message = raw.toString();
        if (typeof raw !== "string") return;
        let data;
        try { data = JSON.parse(message); } catch(e) { return; }

        if (data.role === "master") {
            master = ws;
            ws.send(JSON.stringify({ status: "connected as master" }));
            pendingCommands.forEach(cmd => slaves.forEach(s => s.readyState===WebSocket.OPEN && s.send(cmd)));
            return;
        }
        if (data.role === "slave") {
            slaves.add(ws);
            ws.send(JSON.stringify({ status: "connected as slave" }));
            pendingCommands.forEach(cmd => ws.readyState===WebSocket.OPEN && ws.send(cmd));
            return;
        }
        if (ws === master) {
            slaves.forEach(s => s.readyState===WebSocket.OPEN && s.send(message));
            pendingCommands.push(message);
        }
    });

    ws.on('close', () => {
        if(ws===master) master=null;
        if(slaves.has(ws)) slaves.delete(ws);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`Server running on port ${port}`));
