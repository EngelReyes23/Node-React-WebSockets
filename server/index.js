const webSocketsServerPort = 8000;
const webSocketServer = require('websocket').server;
const http = require('http');
// Girar el servidor HTTP y el servidor WebSocket.
const server = http.createServer();
server.listen(webSocketsServerPort);
const wsServer = new webSocketServer({
	httpServer: server,
});

// genera una identificación única para cada nueva conexión
const getUniqueID = () => {
	const s4 = () =>
		Math.floor((1 + Math.random()) * 0x10000)
			.toString(16)
			.substring(1);
	return s4() + s4() + '-' + s4();
};

// Estoy manteniendo todas las conexiones activas en este objeto
const clients = {};
// Estoy manteniendo a todos los usuarios activos en este objeto
const users = {};
// El contenido actual del editor se mantiene aquí.
let editorContent = null;
// Historial de la actividad del usuario.
let userActivity = [];

const sendMessage = (json) => {
	// Estamos enviando los datos actuales a todos los clientes conectados
	Object.keys(clients).map((client) => {
		clients[client].sendUTF(json);
	});
};

const typesDef = {
	USER_EVENT: 'userevent',
	CONTENT_CHANGE: 'contentchange',
};

wsServer.on('request', function (request) {
	var userID = getUniqueID();
	console.log(
		new Date() +
			' Recieved a new connection from origin ' +
			request.origin +
			'.'
	);
	// Puede reescribir esta parte del código para aceptar solo las solicitudes de origen permitido
	const connection = request.accept(null, request.origin);
	clients[userID] = connection;
	console.log(
		'connected: ' + userID + ' in ' + Object.getOwnPropertyNames(clients)
	);
	connection.on('message', function (message) {
		if (message.type === 'utf8') {
			const dataFromClient = JSON.parse(message.utf8Data);
			const json = { type: dataFromClient.type };
			if (dataFromClient.type === typesDef.USER_EVENT) {
				users[userID] = dataFromClient;
				userActivity.push(
					`${dataFromClient.username} joined to edit the document`
				);
				json.data = { users, userActivity };
			} else if (dataFromClient.type === typesDef.CONTENT_CHANGE) {
				editorContent = dataFromClient.content;
				json.data = { editorContent, userActivity };
			}
			sendMessage(JSON.stringify(json));
		}
	});
	// Usuario desconectado
	connection.on('close', function (connection) {
		console.log(new Date() + ' Peer ' + userID + ' disconnected.');
		const json = { type: typesDef.USER_EVENT };
		userActivity.push(`${users[userID].username} left the document`);
		json.data = { users, userActivity };
		delete clients[userID];
		delete users[userID];
		sendMessage(JSON.stringify(json));
	});
});
