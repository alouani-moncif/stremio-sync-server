const http = require('http');
const WebSocket = require('ws');

const port = process.env.PORT || 3000;

// Minimal HTTP server required for some Railway setups
const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('WebSocket server running\n');
});

const wss = new WebSocket.Server({ server });

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

            // send pending commands to all slaves
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

// Bind to all interfaces for Railway
server.listen(port, '0.0.0.0', () => {
    console.log(`WebSocket server running on ws://0.0.0.0:${port}`);
});
