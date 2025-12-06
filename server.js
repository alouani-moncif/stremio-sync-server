const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 3000 });

let master = null;
let slaves = new Set();
let pendingCommands = []; // stores last commands

wss.on('connection', (ws) => {

    ws.on('message', (raw) => {
        let message = raw;

        // Convert Buffer/Blob → string
        if (raw instanceof Buffer) message = raw.toString();
        if (typeof raw !== "string") {
            console.log("Invalid non-text WebSocket message:", raw);
            return;
        }

        let data;
        try { data = JSON.parse(message); }
        catch (e) {
            console.error("Invalid JSON:", message);
            return;
        }

        // Master connection
        if (data.role === "master") {
            master = ws;
            ws.send(JSON.stringify({ status: "connected as master" }));
            console.log("Master connected");

            // send pending commands
            pendingCommands.forEach(cmd => {
                slaves.forEach(slave => {
                    if (slave.readyState === WebSocket.OPEN) {
                        slave.send(cmd);
                    }
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

        // Forward commands from master → slaves
        if (ws === master) {
            slaves.forEach(slave => {
                if (slave.readyState === WebSocket.OPEN) {
                    slave.send(message);
                }
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

console.log("WebSocket server running on ws://localhost:3000");
