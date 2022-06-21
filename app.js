const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const port = process.env.PORT || 8999;

const app = express();

const server = http.createServer(app);

const webSocketServer = new WebSocket.Server({server});

webSocketServer.on("connection", ws => {
	console.log('connection');
	
	ws.on("message", m => {
		console.log(`[message]`, m.toString());
		send(ws, m.toString());
	});
	
	setInterval(() => {
		console.log('send ping');
		send(ws, JSON.stringify({"0": 0}));
		b_ping = false;
	}, 1000 * 30);
});

function send(client, data)
{
	b_ping = true;
	client.send(data);
}

b_ping = false;

//надо как-то сделать чтоб если я отправлял последние 30 сек сообщение, то не пинговало.

server.listen(port, () => console.log(`Server started`));