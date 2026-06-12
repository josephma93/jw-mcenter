// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    ACTION_CODES,
    createSharedBus,
    isStatefulActionCode,
    isTransientActionCode
} from '../../src/js/shared-worker-bus.mjs';

function createPort(name = 'port') {
    return {
        name,
        /** @type {Array<Record<string, unknown>>} */
        received: [],
        /**
         * @param {Record<string, unknown>} message
         */
        postMessage(message) {
            this.received.push(message);
        }
    };
}

test('action code policy keeps only update_media stateful', () => {
    assert.equal(isStatefulActionCode(ACTION_CODES.UPDATE_MEDIA), true);

    for (const code of [
        ACTION_CODES.PLAY,
        ACTION_CODES.PAUSE,
        ACTION_CODES.FAST_FORWARD,
        ACTION_CODES.REWIND,
        ACTION_CODES.PING,
        ACTION_CODES.PONG,
        ACTION_CODES.MEDIA_TIME_UPDATE,
        ACTION_CODES.PLAYBACK_STATE
    ]) {
        assert.equal(isStatefulActionCode(code), false, `${code} must stay transient`);
        assert.equal(isTransientActionCode(code), true, `${code} must be classified transient`);
    }
});

test('bus replays only stateful messages to late ports', () => {
    const bus = createSharedBus();
    const sender = createPort('sender');
    const lateJoiner = createPort('lateJoiner');

    bus.addPort(sender);
    bus.handleMessage({ code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' }, sender);
    bus.handleMessage({ code: ACTION_CODES.FAST_FORWARD, amount: 10 }, sender);
    bus.handleMessage({ code: ACTION_CODES.PAUSE }, sender);

    bus.addPort(lateJoiner);
    bus.replayToPort(lateJoiner);

    assert.deepEqual(lateJoiner.received, [
        { code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' }
    ]);
});

test('replay stops after removing a port that fails during initial delivery', () => {
    const bus = createSharedBus();
    const sender = createPort('sender');

    bus.addPort(sender);
    bus.handleMessage({ code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' }, sender);

    let attempts = 0;
    const failingPort = {
        postMessage() {
            attempts += 1;
            throw new Error('port closed');
        }
    };

    bus.addPort(failingPort);
    bus.replayToPort(failingPort);
    bus.handleMessage({ code: ACTION_CODES.PLAY }, sender);

    assert.equal(attempts, 1);
});

test('disconnect removes old ports so later presenter cycles do not leak commands', () => {
    const bus = createSharedBus();
    const control = createPort('control');
    const oldPresenter = createPort('oldPresenter');
    const newPresenter = createPort('newPresenter');

    bus.addPort(control);
    bus.addPort(oldPresenter);
    bus.handleMessage({ code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' }, control);
    assert.deepEqual(oldPresenter.received, [
        { code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' }
    ]);

    bus.handleMessage({ type: 'disconnect' }, oldPresenter);
    bus.addPort(newPresenter);
    bus.replayToPort(newPresenter);
    bus.handleMessage({ code: ACTION_CODES.PLAY }, control);

    assert.deepEqual(oldPresenter.received, [
        { code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' }
    ]);
    assert.deepEqual(newPresenter.received, [
        { code: ACTION_CODES.UPDATE_MEDIA, mediaUrl: 'alpha.png' },
        { code: ACTION_CODES.PLAY }
    ]);
});
