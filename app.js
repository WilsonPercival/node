const http = require("http");
const express = require("express");
const WebSocket = require("ws");
const port = process.env.PORT || 8999;

const app = express();

const server = http.createServer(app);

const webSocketServer = new WebSocket.Server({server});

setInterval(() => send_ping(), 1000 * 30);

webSocketServer.on("connection", ws => {
	ws.id =  ++clientID;
	clients[ws.id] = ws;
	ws.b_ping = false;
	console.log(`[connection] id: ${ws.id}; ${get_clients_count()}`);
	
	send_new_connection(ws);
	
	ws.on("message", e => {
		const message = e.toString();
		
		const data = JSON.parse(message);
		const type = data["type"];
		
		switch (type)
		{
			case "control":
			{
				console.log(`[message]`, `id: ${data["id"]}, control: ${data["key"]}-${data["b_state"]}`);
				//setTimeout(() => send_all(message, false), data["b_state"] ? 20 : 200);
				send_all(message, false); //тут не всем, а всем, кроме того, кто прислал.
				break;
			}
			
			case "ping":
			{
				send(ws, {"type": "ping"});
				break;
			}
		}
	});
	
	ws.on("close", () => {
		const id = ws.id;
		delete clients[id];
		console.log(`[close] id: ${id}; ${get_clients_count()}`);
	});
});

function send(client, data, b_stringify=true)
{
	client.b_ping = true;
	if (b_stringify)
	{
		client.send(JSON.stringify(data));
		return;
	}
	client.send(data);
}

function send_all(data, b_stringify=true)
{
	const values = Object.values(clients);
	for (let i = 0; i < values.length; i++)
	{
		const client = values[i];
		send(client, data, b_stringify);
	}
}

function get_clients_count()
{
	return Object.keys(clients).length;
}

function send_ping()
{
	const values = Object.values(clients);
	for (let i = 0; i < values.length; i++)
	{
		const client = values[i];
		
		if (client.b_ping)
		{
			client.b_ping = false;
			continue;
		}
		
		send(client, {"type": "peeping"});
		client.b_ping = false;
		console.log(`send ping ${client.id}`);
	}
}

function send_new_connection(ws)
{
	send(ws, {"type": "id", "id": ws.id});
	
	const allClients = [];
	const values = Object.values(clients);
	for (let i = 0; i < values.length; i++)
	{
		const client = values[i];
		allClients.push(client.id);
	}
	console.log('all', JSON.stringify(allClients));
	send_all({"type": "connection", "clients": allClients});
}

clients = {};
clientID = 0;

server.listen(port, () => console.log(`Server started`));