// @ts-check
/**
 * SharedWorker acting as a shared message bus.
 */

import { createSharedBus } from './shared-worker-bus.mjs';

// This file is checked against lib.webworker (see tsconfig.worker.json);
// `self` there is the generic worker scope, so narrow it to the shared one.
const sharedWorkerSelf = /** @type {SharedWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const bus = createSharedBus();

// Module workers don't expose top-level function declarations as global
// event handlers, so the handler must be assigned to `self` explicitly.
sharedWorkerSelf.onconnect = /** @param {MessageEvent} event */ function onconnect(event) {
    const port = event.ports[0];
    bus.addPort(port);
    bus.replayToPort(port);

    port.onmessage = (/** @type {MessageEvent} */ event) => {
        bus.handleMessage(event.data, port);
    };

    // Listen for message errors on this port
    port.onmessageerror = (/** @type {MessageEvent} */ error) => {
        console.error("Message error on port", error);
        bus.removePort(port);
    };

    port.start();
};
