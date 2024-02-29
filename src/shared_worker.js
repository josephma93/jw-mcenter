let connections = [];
let lastMessage = null;

self.addEventListener('connect', function (e) {
    const port = e.ports[0];
    connections.push(port);

    if (lastMessage) {
        port.postMessage(lastMessage);
    }

    port.addEventListener('message', handleIncomingMessage);
    port.start();
    port.onclose = () => handleClose(port);
});

function handleIncomingMessage(event) {
    const message = constructMessageFromEvent(event);
    if (message) {
        broadcastMessage(message);
    }
}

function constructMessageFromEvent(event) {
    switch (event.data.action) {
        case 'updateImage':
            lastMessage = { action: 'updateImage', imageUrl: event.data.imageUrl };
            return lastMessage;
        case 'keepAlive':
            return { action: 'keepAlive', parentWindowId: event.data.parentWindowId };
        default:
            console.warn(`Unknown action: ${event.data.action}`);
            return null;
    }
}

function broadcastMessage(message) {
    connections.forEach(conn => conn.postMessage(message));
}

function handleClose(port) {
    connections = connections.filter(p => p !== port);
}
