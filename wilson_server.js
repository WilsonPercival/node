const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const port = process.env.PORT || 8999;

const app = express();

const server = http.createServer(app);

const webSocketServer = new WebSocket.Server({server});

webSocketServer.on("connection", ws => {
	console.log('connection');
});

server.listen(port, () => console.log(`Server started`));