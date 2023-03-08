const clients = [];

onconnect = (e) => {
	console.log('onconnect', e);
	const port = e.source;
	clients.push(port);

	port.onmessage = (event) => {
		const sender = event.srcElement;
		clients.forEach(client => {
			if (client !== sender) {
				client.postMessage(event.data);
			}
		});
	};
};