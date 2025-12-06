const WebSocket = require('ws');

const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port });

console.log(`WebSocket server running on port ${port}`);

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
                        slave.send(message);
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
