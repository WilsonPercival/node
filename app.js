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

async function tiktok(options)
{
	//tiktokUsername - ник стримера.
	const {tiktokUsername} = options;
	
	const {WebcastPushConnection} = require("tiktok-live-connector");
	
	const tiktokChatConnection = new WebcastPushConnection(tiktokUsername);
	
	try
	{
		const state = await tiktokChatConnection.connect();
		const logConnected = `Connected to room [${tiktokUsername}]`;
		console_color(logConnected, "FgGreen");
		write_log(logConnected);
	}
	catch (err)
	{
		const logFailed = `Failed to connect [${tiktokUsername}]`;
		console_color(logFailed, "FgRed");
		write_log(logFailed);
		
		const errors = {
			"Failed to retrieve room_id from page source. User might be offline.": 1, //Неправильный ник; был забанен, потому что в раше (но это не точно).
			"Failed to retrieve room_id from page source. timeout of 10000ms exceeded": 2, //Слишком частое подключение. Повторите запрос через 10 секунд.
			"LIVE has ended": 3, //Невозможно подключиться к стриму, т.к. он был завершён.
			"Failed to fetch room info. timeout of 10000ms exceeded": 4, //Нет интернета.
		};
		
		const codeError = errors[err.message];
		
		const logCode = `[code: ${codeError}]: `;
		const logErrorMessage = err.message;
		console.log(get_color_string(logCode, "BgRed"), get_color_string(logErrorMessage, "FgRed"));
		write_log(logCode);
		write_log(logErrorMessage);
		
		if ((codeError === 1) || (codeError === 3) || (codeError === 4)) //тут можно через includes переделать [1, 3, 4].
		{
			print_get_out();
			return;
		}
		
		if (codeError === 2)
		{
			reconnect();
			return;
		}
		
		console.error(err);
	}
	
	//Событие общей ошибки.
	tiktokChatConnection.on("error", err => {
		const logText = `Error!`;
		console_color(logText, "FgRed");
		console.error(err);
		const logErrorMessage = err.message;
		write_log(logErrorMessage);
	});
	
	//Приходит, если тикток использует вебсокеты для связи с нами.
	tiktokChatConnection.on("websocketConnected", websocketClient => {
		const logWS = `Tiktok use websockets.`;
		console_color(logWS, "FgCyan");
		write_log(logWS);
	});
	
	//Стример завершил трансляцию.
	tiktokChatConnection.on("streamEnd", () => {
		const logStreamEnd = `[stream end ${tiktokUsername}] ${new Date().toString()}`;
		console_color(logStreamEnd, "BgBlue");
		write_log(logStreamEnd);
		const date = new Date(Date.now() - timeStart);
		const logTime = `time: ${date.toGMTString()}`;
		console_color(logTime, "BgBlue");
		write_log(logTime);
		send({type: "stream end"});
		b_streamEnded = true;
	});
	
	//Произошёл разрыв соединения с стримом.
	tiktokChatConnection.on("disconnected", () => {
		const logDisconnect = `[disconnected ${tiktokUsername}]`;
		console_color(logDisconnect, "BgRed");
		write_log(logDisconnect);
		send({type: "disconnected"});
		if (!b_streamEnded)
		{
			b_streamEnded = false;
			reconnect();
		}
		else
		{
			print_get_out();
		}
	});

	//Пришёл комментарий от кого-то на стриме.
	tiktokChatConnection.on("chat", data => {
		console.log(`[chat] ${data["uniqueId"]}: ${data["comment"].substring(0, 40)}`);
		send({type: "chat", data});
	});
	
	//Пришёл подарок стримеру.
	tiktokChatConnection.on("gift", data => {
		console_color(`[gift] ${data["uniqueId"]}, type ${data["giftType"]} - ${data["repeatEnd"]}`, "FgMagenta");
		send({type: "gift", data});
	});
	
	//Пришло изменившееся количество зрителей на стриме.
	tiktokChatConnection.on("roomUser", data => {
		send({type: "room user", viewerCount: data["viewerCount"]});
	});
	
	//Пришли лайки от зрителя.
	tiktokChatConnection.on("like", data => {
		send({type: "like", data});
	});
	
	//Пришла подписка от зрителя или он поделился трансляцией.
	tiktokChatConnection.on("social", data => {
		send({type: "social", data});
	});
}

server({port: 8089});













