function server(options)
{
	const {port} = options;
	
	const Static = require("node-static");
	const WebSocketServer = new require("ws");
	
	const webSocketServer = new WebSocketServer.Server({port: process.env.PORT || 8999});
	
	webSocketServer.on("connection", ws => {
		ws.id = ++clientId;
		
		clients[ws.id] = ws;
		
		const logConnection = `[connection] id: ${ws.id}; ${get_clients_count_string()}`;
		console_color(logConnection, "FgYellow");
		write_log(logConnection);
		
		//ws.send(JSON.stringify({type: "node", message: `Hello, user!`}));
		
		ws.on("message", message => {
			const data = JSON.parse(message.toString());
			const logMessage = `[message] ${JSON.stringify(data)}`;
			console_color(logMessage, "FgYellow");
			write_log(logMessage);
		});
		
		ws.on("close", () => {
			const id = ws.id;
			delete clients[id];
			const logClose = `[close] id: ${id}; ${get_clients_count_string()}`;
			console_color(logClose, "FgYellow");
			write_log(logClose);
		});
	});

	const fileServer = new Static.Server(".");
	
	const logHosted = `Server hosted.`;
	console_color(logHosted, "Bright");
	write_log(logHosted);
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

function send(data)
{
	Object.values(clients).forEach(client => client.send(JSON.stringify(data)));
}

function console_color(text, color) //эта функция устаревшая, её можно всю заменить на get_color_string.
{
	console.log(`${colors[color]}%s\x1b[0m`, text);
	
	//Object.entries(colors).forEach(color => console.log(`${color[1]}%s\x1b[0m`, color[0]));
}

function get_color_string(text, color)
{
	return `${colors[color]}${text}\x1b[0m`;
}

function get_clients_count_string()
{
	return `clients count: ${Object.keys(clients).length}`;
}

function print_get_out()
{
	const logGetOut = `Get out!`;
	console_color(logGetOut, "Bright");
	write_log(logGetOut);
}

function reconnect()
{
	const logAgain = `Let's try again...`;
	console_color(logAgain, "Bright");
	write_log(logAgain);
	tiktok({tiktokUsername: arg2});
}

const colors = { //тут можно упростить выражения
	"Reset": "\x1b[0m",
	"Bright": "\x1b[1m",
	"Dim": "\x1b[2m",
	"Underscore": "\x1b[4m",
	"Blink": "\x1b[5m",
	"Reverse": "\x1b[7m",
	"Hidden": "\x1b[8m",
	"FgBlack": "\x1b[30m",
	"FgRed": "\x1b[31m",
	"FgGreen": "\x1b[32m",
	"FgYellow": "\x1b[33m",
	"FgBlue": "\x1b[34m",
	"FgMagenta": "\x1b[35m",
	"FgCyan": "\x1b[36m",
	"BgBlack": "\x1b[40m",
	"BgRed": "\x1b[41m",
	"BgGreen": "\x1b[42m",
	"BgYellow": "\x1b[43m",
	"BgBlue": "\x1b[44m",
	"BgMagenta": "\x1b[45m",
	"BgCyan": "\x1b[46m",
	"BgWhite": "\x1b[47m",
};

function write_log(line)
{
	fs.appendFile(logFileName, `${line}\r\n`, error => {
		if (error) throw error;
	});
}

const clients = {};
let clientId = 0;
let b_streamEnded = false;
const timeStart = Date.now();

const fs = require("fs");
const logFileName = `logs/log_${new Date().toString().split(`:`).join(``)}.txt`;
write_log(new Date().toString());

server({port: 8089});
const arg2 = process.argv[2] === undefined ? "jes.princess" : process.argv[2];
tiktok({tiktokUsername: arg2});

















