/**
 * Shared bus contract and core state machine.
 * Pure module: safe to import from both browser worker code and Node tests.
 */

export const ACTION_CODES = {
    UPDATE_MEDIA: 'update_media',
    PLAY: 'play',
    PAUSE: 'pause',
    FAST_FORWARD: 'fast_forward',
    REWIND: 'rewind',
    MEDIA_TIME_UPDATE: 'media_time_update',
    PING: 'ping',
    PONG: 'pong'
};

const STATEFUL_ACTION_CODES = new Set([
    ACTION_CODES.UPDATE_MEDIA
]);

const TRANSIENT_ACTION_CODES = new Set([
    ACTION_CODES.PLAY,
    ACTION_CODES.PAUSE,
    ACTION_CODES.FAST_FORWARD,
    ACTION_CODES.REWIND,
    ACTION_CODES.PING,
    ACTION_CODES.PONG,
    ACTION_CODES.MEDIA_TIME_UPDATE
]);

/**
 * @param {unknown} code
 * @returns {code is string}
 */
function isStringCode(code) {
    return typeof code === 'string' && code.length > 0;
}

/**
 * @param {unknown} code
 * @returns {boolean}
 */
export function isStatefulActionCode(code) {
    return isStringCode(code) && STATEFUL_ACTION_CODES.has(code);
}

/**
 * @param {unknown} code
 * @returns {boolean}
 */
export function isTransientActionCode(code) {
    return isStringCode(code) && TRANSIENT_ACTION_CODES.has(code);
}

/**
 * @typedef {{ code?: string, type?: string, [key: string]: unknown }} BusMessage
 */

/**
 * @typedef {{ postMessage(message: BusMessage): void }} BusPort
 */

export function createSharedBus() {
    /** @type {Record<string, BusMessage>} */
    const latestStatefulMessages = {};
    /** @type {BusPort[]} */
    const ports = [];

    /**
     * @param {BusPort} port
     */
    function removePort(port) {
        const index = ports.indexOf(port);
        if (index !== -1) {
            ports.splice(index, 1);
        }
    }

    /**
     * @param {BusPort} port
     */
    function addPort(port) {
        ports.push(port);
    }

    /**
     * Replay only stateful messages to a newly connected port.
     * Stop immediately if the target port fails during replay.
     * @param {BusPort} port
     */
    function replayToPort(port) {
        for (const message of Object.values(latestStatefulMessages)) {
            try {
                port.postMessage(message);
            } catch {
                removePort(port);
                break;
            }
        }
    }

    /**
     * Broadcast a message to all connected ports except the sender.
     * @param {BusMessage} message
     * @param {BusPort} senderPort
     */
    function broadcast(message, senderPort) {
        for (let i = ports.length - 1; i >= 0; i--) {
            const port = ports[i];
            if (port === senderPort) {
                continue;
            }

            try {
                port.postMessage(message);
            } catch {
                ports.splice(i, 1);
            }
        }
    }

    /**
     * @param {BusMessage | null | undefined} message
     * @param {BusPort} senderPort
     */
    function handleMessage(message, senderPort) {
        if (message?.type === 'disconnect') {
            removePort(senderPort);
            return;
        }

        if (!message?.code) {
            return;
        }

        if (isStatefulActionCode(message.code)) {
            latestStatefulMessages[message.code] = message;
        }

        broadcast(message, senderPort);
    }

    return {
        addPort,
        removePort,
        replayToPort,
        handleMessage
    };
}
