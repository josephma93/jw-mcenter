let connections = [];
let lastMessage = null;

self.addEventListener('connect', function (e) {
    const port = e.ports[0];
    connections.push(port);


    if (lastMessage) {
        port.postMessage(lastMessage);
    }

    port.addEventListener('message', function (event) {
        let message = null;
        if (event.data.action === 'updateImage') {

            lastMessage = message = {action: 'updateImage', imageUrl: event.data.imageUrl};
        } else if (event.data.action === 'keepAlive') {
            message = {action: 'keepAlive', parentWindowId: event.data.parentWindowId};
        }

        if (message) {
            connections.forEach(conn => {
                conn.postMessage(message);
            });
        }
    });

    port.start();

    port.onclose = function onClose() {
        connections = connections.filter(p => p !== port);
    };
});
