/**
 * @module sharedWorkerRxBridge
 *
 * This module acts as an intermediary between the control panel (index) and the presenter screen,
 * using a SharedWorker as the communication bus.
 *
 * Control panel sends commands to the presenter:
 *   - update_media: { mediaUrl, mediaType } where mediaType is "image", "video", or "audio"
 *   - play: instructs to play media
 *   - pause: instructs to pause media
 *   - fast_forward: instructs to advance 10 seconds
 *   - rewind: instructs to go back 10 seconds
 *   - ping: used as a health-check message
 *
 * The presenter sends events to the control panel:
 *   - pong: a response to ping; if no ping is received for a while the presenter considers itself orphaned
 *   - media_time_update: { currentTime, duration } reporting media status
 *
 * Call the exported method `initSharedWorkerRxBridge` to initialize the SharedWorker and obtain all channels.
 */

import { Subject, fromEvent } from 'rxjs';
import { filter, map } from 'rxjs/operators';

/**
 * Action codes for communication between control panel and presenter.
 * @readonly
 * @enum {string}
 */
export const ACTION_CODES = {
    // Commands from control panel to presenter:
    UPDATE_MEDIA: 'update_media',
    PLAY: 'play',
    PAUSE: 'pause',
    FAST_FORWARD: 'fast_forward',
    REWIND: 'rewind',

    // Status events from presenter to control panel:
    MEDIA_TIME_UPDATE: 'media_time_update',

    // Ping-Pong mechanism for health-check:
    PING: 'ping', // Sent by control panel to presenter
    PONG: 'pong'  // Sent by presenter to control panel
};

/**
 * A communication channel consisting of a sender and receiver.
 * @typedef {Object} Channel
 * @property {import('rxjs').Subject<any>} send - Subject to send messages.
 * @property {import('rxjs').Observable<any>} on - Observable that emits messages for this channel.
 */

/**
 * Object containing all communication channels.
 * @typedef {Object} SharedWorkerRxBridge
 * @property {Channel} updateMediaChannel - Channel for the update_media command.
 * @property {Channel} playChannel - Channel for the play command.
 * @property {Channel} pauseChannel - Channel for the pause command.
 * @property {Channel} fastForwardChannel - Channel for the fast_forward command.
 * @property {Channel} rewindChannel - Channel for the rewind command.
 * @property {Channel} pingChannel - Channel for ping messages (control panel to presenter).
 * @property {Channel} mediaTimeUpdateChannel - Channel for media_time_update events.
 * @property {Channel} pongChannel - Channel for pong messages (presenter to control panel).
 */

/**
 * Initializes the SharedWorker and returns an object containing all communication channels.
 * @returns {SharedWorkerRxBridge} An object with distinct channels for each action code.
 */
export function initSharedWorkerRxBridge() {
    const worker = new SharedWorker('./js/shared-worker.mjs', {
        type: 'module',
        name: 'presenterWindowController'
    });
    worker.port.start();

    const incomingMessages$ = fromEvent(worker.port, 'message').pipe(
        map(event => event.data)
    );

    /**
     * Creates a communication channel for a given action code.
     * @param {string} code - The action code for the channel.
     * @returns {Channel} An object with a `send` Subject and an `on` Observable filtered by the code.
     */
    function createChannel(code) {
        const send = new Subject();
        send.subscribe((payload) => {
            worker.port.postMessage({ code, ...payload });
        });
        const on = incomingMessages$.pipe(
            filter(message => message && message.code === code)
        );
        return { send, on };
    }

    return {
        // Channels for control panel commands to the presenter:
        updateMediaChannel: createChannel(ACTION_CODES.UPDATE_MEDIA),
        playChannel: createChannel(ACTION_CODES.PLAY),
        pauseChannel: createChannel(ACTION_CODES.PAUSE),
        fastForwardChannel: createChannel(ACTION_CODES.FAST_FORWARD),
        rewindChannel: createChannel(ACTION_CODES.REWIND),
        pingChannel: createChannel(ACTION_CODES.PING),

        // Channels for presenter events to the control panel:
        mediaTimeUpdateChannel: createChannel(ACTION_CODES.MEDIA_TIME_UPDATE),
        pongChannel: createChannel(ACTION_CODES.PONG)
    };
}
