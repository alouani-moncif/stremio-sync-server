const express = require("express");
const path = require("path");
const WebSocket = require("ws");

const app = express();
const port = process.env.PORT || 3000;

// Serve static HTML and video from public/
app.use(express.static(path.join(__dirname, "public")));

const server = app.listen(port, () => {
  console.log(`HTTP & WS server running on port ${port}`);
});

// WebSocket setup
const wss = new WebSocket.Server({ server });

let master = null;
let slaves = new Set();
let pendingCommands = [];

wss.on("connection", (ws) => {

  ws.on("message", (raw) => {
    let message = raw.toString();

    let data;
    try { data = JSON.parse(message); } 
    catch (e) { console.error("Invalid JSON:", message); return; }

    if (data.role === "master") {
      master = ws;
      ws.send(JSON.stringify({ status: "connected as master" }));
      console.log("Master connected");

      // Send pending commands to all slaves
      pendingCommands.forEach(cmd => {
        slaves.forEach(slave => {
          if (slave.readyState === WebSocket.OPEN) slave.send(cmd);
        });
      });

      return;
    }

    if (data.role === "slave") {
      slaves.add(ws);
      ws.send(JSON.stringify({ status: "connected as slave" }));
      console.log(`Slave connected. Total slaves: ${slaves.size}`);

      // Send pending commands to this slave
      pendingCommands.forEach(cmd => {
        if(ws.readyState === WebSocket.OPEN) ws.send(cmd);
      });

      return;
    }

    // Forward master commands to all slaves
    if (ws === master) {
      slaves.forEach(slave => {
        if(slave.readyState === WebSocket.OPEN) slave.send(message);
      });
      pendingCommands.push(message);
    }
  });

  ws.on("close", () => {
    if(ws === master) master = null;
    if(slaves.has(ws)) slaves.delete(ws);
  });

});
