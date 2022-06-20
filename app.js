function server(options)
{
	const http = require("http");
	const express = require("express");
	const WebSocket = require("ws");
	const port = process.env.PORT || 8999;
	const app = express();
	const server = http.createServer(app);
	const webSocketServer = new WebSocket.Server({server});
	
	webSocketServer.on("connection", ws => {
		
	});
	
	server.listen(port, () => console.log(`Server started`));
}

server({port: 8089});













