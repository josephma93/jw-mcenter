// @ts-check
/**
 * SharedWorker acting as multiple BehaviorSubjects.
 * For each distinct message code, the latest message is stored and immediately sent
 * to any new connected port.
 *
 * Edge cases handled:
 * - When a port disconnects (or sends a disconnect message), it is removed.
 * - If an error occurs during message delivery, that port is removed.
 * - The sender port does not receive its own message back.
 */

// This file is checked against lib.webworker (see tsconfig.worker.json);
// `self` there is the generic worker scope, so narrow it to the shared one.
const sharedWorkerSelf = /** @type {SharedWorkerGlobalScope} */ (/** @type {unknown} */ (self));

/**
 * A message routed through the worker. `code` identifies the channel.
 * @typedef {{ code?: string, type?: string }} BusMessage
 */

/** @type {Record<string, BusMessage>} Stores the latest message for each unique code */
const latestMessages = {};
/** @type {MessagePort[]} Active ports (clients) */
const ports = [];

/**
 * Remove a disconnected or errored port from the list.
 * @param {MessagePort} port
 */
function removePort(port) {
    const index = ports.indexOf(port);
    if (index !== -1) {
        ports.splice(index, 1);
    }
}

/**
 * @param {BusMessage} message
 * @param {MessagePort} senderPort
 */
function broadcastMessage(message, senderPort) {
    for (let i = ports.length - 1; i >= 0; i--) {
        if (ports[i] === senderPort) continue; // Skip the sender port
        try {
            ports[i].postMessage(message);
        } catch (err) {
            console.error("Error broadcasting message; removing port", err);
            ports.splice(i, 1);
        }
    }
}

// Module workers don't expose top-level function declarations as global
// event handlers, so the handler must be assigned to `self` explicitly.
sharedWorkerSelf.onconnect = /** @param {MessageEvent} event */ function onconnect(event) {
    const port = event.ports[0];
    ports.push(port);

    // Immediately send the latest message for each code to the new port
    for (const code of Object.keys(latestMessages)) {
        try {
            port.postMessage(latestMessages[code]);
        } catch (err) {
            console.error("Error sending initial message to port:", err);
            removePort(port);
        }
    }

    port.onmessage = (/** @type {MessageEvent} */ event) => {
        const message = /** @type {BusMessage} */ (event.data);

        if (message && message.type === 'disconnect') {
            removePort(port);
            return;
        }

        // Process messages that have a 'code' property
        if (message && message.code) {
            // Update the stored message for this specific code
            latestMessages[message.code] = message;
            // Broadcast the message to all connected ports except the sender
            broadcastMessage(message, port);
        }
    };

    // Listen for message errors on this port
    port.onmessageerror = (/** @type {MessageEvent} */ error) => {
        console.error("Message error on port", error);
        removePort(port);
    };

    port.start();
};
