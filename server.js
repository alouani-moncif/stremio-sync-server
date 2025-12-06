const http = require('http');
const WebSocket = require('ws');

// Create minimal HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('WebSocket server running\n');
});

// Use Render port or fallback to 3000
const port = process.env.PORT || 3000;

// Create WebSocket server attached to HTTP server
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();

// Heartbeat to keep connections alive
function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', (ws) => {
    ws.isAlive = true;
    ws.on('pong', heartbeat);

    console.log('New client connected');

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            // Register master
            if (data.role === 'master') {
                master = ws;
                ws.send(JSON.stringify({ status: 'connected as master' }));
                console.log('Master connected');
                return;
            }

            // Register slave
            if (data.role === 'slave') {
                slaves.add(ws);
                ws.send(JSON.stringify({ status: 'connected as slave' }));
                console.log(`Slave connected. Total slaves: ${slaves.size}`);
                return;
            }

            // Forward messages from master to all slaves
            if (master && ws === master) {
                slaves.forEach(slave => {
                    if (slave.readyState === WebSocket.OPEN) {
                        try {
                            slave.send(message);
                        } catch(err) {
                            console.error('Failed to send to slave:', err);
                        }
                    }
                });
            }

        } catch (e) {
            console.error('Invalid message:', message);
        }
    });

    ws.on('close', () => {
        if (ws === master) {
            master = null;
            console.log('Master disconnected');
            // Notify all slaves that master disconnected
            slaves.forEach(slave => {
                if (slave.readyState === WebSocket.OPEN) {
                    slave.send(JSON.stringify({ status: 'master disconnected' }));
                }
            });
        }
        if (slaves.has(ws)) {
            slaves.delete(ws);
            console.log(`Slave disconnected. Remaining slaves: ${slaves.size}`);
        }
    });
});

// Ping clients every 30s to prevent idle disconnect
setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) return ws.terminate();
        ws.isAlive = false;
        ws.ping(() => {});
    });
}, 30000);

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
