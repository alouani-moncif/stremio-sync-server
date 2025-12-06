const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from "public"
app.use(express.static(path.join(__dirname, 'public')));

// Create HTTP server (needed for WebSocket upgrade)
const server = http.createServer(app);

// WebSocket server on same HTTP server
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();
let pendingCommands = [];

wss.on('connection', ws => {
    ws.on('message', raw => {
        let message = raw.toString();

        let data;
        try { data = JSON.parse(message); }
        catch { console.log("Invalid JSON:", message); return; }

        // Master connection
        if (data.role === "master") {
            master = ws;
            ws.send(JSON.stringify({ status: "connected as master" }));
            console.log("Master connected");

            // send pending commands to slaves
            pendingCommands.forEach(cmd => {
                slaves.forEach(slave => {
                    if (slave.readyState === WebSocket.OPEN) slave.send(cmd);
                });
            });
            return;
        }

        // Slave connection
        if (data.role === "slave") {
            slaves.add(ws);
            ws.send(JSON.stringify({ status: "connected as slave" }));
            console.log(`Slave connected. Total slaves: ${slaves.size}`);

            // send pending commands
            pendingCommands.forEach(cmd => {
                if (ws.readyState === WebSocket.OPEN) ws.send(cmd);
            });
            return;
        }

        // Forward commands from master to slaves
        if (ws === master) {
            slaves.forEach(slave => {
                if (slave.readyState === WebSocket.OPEN) slave.send(message);
            });
            pendingCommands.push(message);
        }
    });

    ws.on('close', () => {
        if (ws === master) {
            master = null;
            console.log("Master disconnected");
        }
        if (slaves.has(ws)) {
            slaves.delete(ws);
            console.log(`Slave disconnected. Remaining slaves: ${slaves.size}`);
        }
    });
});

// Start server
server.listen(port, '0.0.0.0', () => {
    console.log(`HTTP + WS server running on port ${port}`);
});
