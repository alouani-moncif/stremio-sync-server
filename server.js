const express = require('express');
const http = require('http');
const path = require('path');
const WebSocket = require('ws');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files (HTML, video, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// HTTP server for WS upgrade
const server = http.createServer(app);

// WebSocket server
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();
let pendingCommands = [];

// WS connection
wss.on('connection', ws => {
    ws.on('message', raw => {
        const msgStr = raw.toString();
        let data;
        try { data = JSON.parse(msgStr); } catch { return; }

        // Role registration
        if(data.role === "master"){
            master = ws;
            ws.send(JSON.stringify({ status:"connected as master" }));
            console.log("Master connected");

            // send pending commands to new master if needed
            pendingCommands.forEach(cmd=>{
                slaves.forEach(slave=>{
                    if(slave.readyState === WebSocket.OPEN) slave.send(cmd);
                });
            });
            return;
        }

        if(data.role === "slave"){
            slaves.add(ws);
            ws.send(JSON.stringify({ status:"connected as slave" }));
            console.log(`Slave connected. Total slaves: ${slaves.size}`);

            // send pending commands
            pendingCommands.forEach(cmd=>{
                if(ws.readyState === WebSocket.OPEN) ws.send(cmd);
            });
            return;
        }

        // Forward master commands to slaves
        if(ws === master){
            slaves.forEach(slave=>{
                if(slave.readyState === WebSocket.OPEN){
                    slave.send(msgStr);
                }
            });
            pendingCommands.push(msgStr);
        }
    });

    ws.on('close', () => {
        if(ws === master){ master = null; console.log("Master disconnected"); }
        if(slaves.has(ws)){ slaves.delete(ws); console.log(`Slave disconnected. Remaining: ${slaves.size}`); }
    });
});

// Listen
server.listen(port, '0.0.0.0', () => console.log(`HTTP+WS server running on port ${port}`));
