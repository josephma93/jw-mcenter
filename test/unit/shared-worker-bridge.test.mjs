// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';

class FakeMessagePort extends EventTarget {
    constructor() {
        super();
        /** @type {Array<Record<string, unknown>>} */
        this.sent = [];
        this.startCalls = 0;
        this.closeCalls = 0;
    }

    start() {
        this.startCalls += 1;
    }

    /**
     * @param {Record<string, unknown>} message
     */
    postMessage(message) {
        this.sent.push(message);
    }

    close() {
        this.closeCalls += 1;
    }
}

test('bridge sends disconnect and closes the port on pagehide', async () => {
    const previousWindow = /** @type {unknown} */ (globalThis.window);
    const previousSharedWorker = /** @type {unknown} */ (globalThis.SharedWorker);

    const fakeWindow = new EventTarget();
    const fakePort = new FakeMessagePort();

    class FakeSharedWorker {
        /**
         * @param {string} url
         * @param {Record<string, unknown>} options
         */
        constructor(url, options) {
            this.url = url;
            this.options = options;
            this.port = fakePort;
        }
    }

    globalThis.window = /** @type {Window & typeof globalThis} */ (/** @type {unknown} */ (fakeWindow));
    globalThis.SharedWorker = /** @type {typeof SharedWorker} */ (/** @type {unknown} */ (FakeSharedWorker));

    try {
        const moduleUrl = new URL('../../src/js/shared-worker-bridge.js', import.meta.url);
        const { initSharedWorkerRxBridge } = await import(moduleUrl.href);

        initSharedWorkerRxBridge();
        fakeWindow.dispatchEvent(new Event('pagehide'));

        assert.equal(fakePort.startCalls, 1);
        assert.deepEqual(fakePort.sent, [{ type: 'disconnect' }]);
        assert.equal(fakePort.closeCalls, 1);
    } finally {
        globalThis.window = /** @type {Window & typeof globalThis} */ (previousWindow);
        globalThis.SharedWorker = /** @type {typeof SharedWorker} */ (previousSharedWorker);
    }
});
