const http = require('http');
const WebSocket = require('ws');

// Crée un serveur HTTP minimal
const server = http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.end('WebSocket server running\n');
});

const port = process.env.PORT || 3000;

// Crée un serveur WebSocket attaché au serveur HTTP
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);

            if(data.role === 'master') {
                master = ws;
                ws.send(JSON.stringify({status: 'connected as master'}));
                return;
            }
            if(data.role === 'slave') {
                slaves.add(ws);
                ws.send(JSON.stringify({status: 'connected as slave'}));
                return;
            }

            if(master && ws === master) {
                slaves.forEach(slave => {
                    if(slave.readyState === WebSocket.OPEN) {
                        try {
                            slave.send(message);
                        } catch(err) {
                            console.error('Failed to send to slave:', err);
                        }
                    }
                });
            }
        } catch(e) {
            console.error('Invalid message:', message);
        }
    });

    ws.on('close', () => {
        if(ws === master) master = null;
        slaves.delete(ws);
    });
});

server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
