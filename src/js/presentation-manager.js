// @ts-check
/**
 * Opens and supervises the presentation (slave) window.
 *
 * The presenter window closes itself when it stops receiving pings, so this
 * module only pings while the window it opened is still alive. Closing the
 * control panel kills the ping interval, which makes the presenter shut down
 * on its own — the master-slave dependency the SRS requires.
 */
import { initSharedWorkerRxBridge } from './shared-worker-bridge.js';
import {
    resolveCurrentItem,
    stepCurrentItem,
    toUpdateMediaPayload,
} from './presentation-state.mjs';
import { interval } from 'rxjs';

const PING_INTERVAL_MS = 2000;
const PLAYBACK_TIME_IDLE_TEXT = '--:-- / --:--';

/** @type {Window | null} */
let presentationWindow = null;
/** @type {import('./screens-manager.js').RefinedScreen | null} */
let selectedMonitor = null;
/** @type {import('./file-manager.js').FileItem | null} */
let currentItem = null;
/** @type {number} */
let previousCurrentIndex = 0;
/** @type {boolean} */
let isPlaying = true;
/** @type {boolean} */
let presenterAlive = false;
/** @type {ReturnType<typeof initSharedWorkerRxBridge> | null} */
let commandChannels = null;
/** @type {JQuery<HTMLElement>} */ let $startPresentationBtn;
/** @type {JQuery<HTMLElement>} */ let $endPresentationBtn;
/** @type {JQuery<HTMLElement>} */ let $prevMediaBtn;
/** @type {JQuery<HTMLElement>} */ let $nextMediaBtn;
/** @type {JQuery<HTMLElement>} */ let $rewindBtn;
/** @type {JQuery<HTMLElement>} */ let $fastForwardBtn;
/** @type {JQuery<HTMLElement>} */ let $playPauseBtn;
/** @type {JQuery<HTMLElement>} */ let $playbackTimeDisplay;

function isPresenterOpen() {
    return presentationWindow !== null && !presentationWindow.closed;
}

/**
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatPlaybackTime(totalSeconds) {
    if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
        return '--:--';
    }

    const roundedSeconds = Math.floor(totalSeconds);
    const hours = Math.floor(roundedSeconds / 3600);
    const minutes = Math.floor((roundedSeconds % 3600) / 60);
    const seconds = roundedSeconds % 60;

    if (hours > 0) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * @param {string} value
 */
function setPlaybackTimeDisplay(value) {
    $playbackTimeDisplay.text(value);
}

function resetPlaybackTimeDisplay() {
    setPlaybackTimeDisplay(PLAYBACK_TIME_IDLE_TEXT);
}

/**
 * @param {{ currentTime?: unknown, duration?: unknown }} payload
 */
function renderPlaybackTimeUpdate(payload) {
    setPlaybackTimeDisplay(
        `${formatPlaybackTime(Number(payload.currentTime))} / ${formatPlaybackTime(Number(payload.duration))}`
    );
}

function renderControlState() {
    const controlsDisabled = !presenterAlive;
    $startPresentationBtn.prop('disabled', presenterAlive);
    $endPresentationBtn.prop('disabled', controlsDisabled);
    $prevMediaBtn.prop('disabled', controlsDisabled);
    $nextMediaBtn.prop('disabled', controlsDisabled);
    $rewindBtn.prop('disabled', controlsDisabled);
    $fastForwardBtn.prop('disabled', controlsDisabled);
    $playPauseBtn.prop('disabled', controlsDisabled);
    $playPauseBtn.text(isPlaying ? '⏸️' : '▶️');
}

/**
 * @param {boolean} nextAlive
 */
function setPresenterAlive(nextAlive) {
    if (presenterAlive === nextAlive) {
        return;
    }

    presenterAlive = nextAlive;
    if (!presenterAlive) {
        resetLocalState();
        return;
    }

    renderControlState();
}

function resetLocalState() {
    presentationWindow = null;
    currentItem = null;
    previousCurrentIndex = 0;
    isPlaying = true;
    presenterAlive = false;
    resetPlaybackTimeDisplay();
    renderControlState();
}

function sendCurrentMediaUpdate() {
    if (!currentItem || !commandChannels) {
        return;
    }
    isPlaying = true;
    commandChannels.updateMediaChannel.send.next(toUpdateMediaPayload(currentItem));
    if (currentItem.detected === 'isImage') {
        resetPlaybackTimeDisplay();
    }
    renderControlState();
}

function openPresentationWindow() {
    const playlist = fileManagerRef?.filesState$.getValue() ?? [];
    if (playlist.length === 0) {
        alert('Agrega al menos un archivo antes de iniciar la presentación.');
        return;
    }

    currentItem = resolveCurrentItem(playlist, currentItem, previousCurrentIndex);
    previousCurrentIndex = currentItem ? playlist.indexOf(currentItem) : 0;
    if (!currentItem) {
        return;
    }

    if (isPresenterOpen()) {
        sendCurrentMediaUpdate();
        return;
    }

    if (!selectedMonitor) {
        alert('Selecciona un monitor para la presentación.');
        return;
    }
    const { availLeft, availTop, availWidth, availHeight } = selectedMonitor;
    const features = `left=${availLeft},top=${availTop},width=${availWidth},height=${availHeight}`;
    presentationWindow = window.open('presentation.html', 'presentation', features);
    if (!presentationWindow) {
        alert('El navegador bloqueó la ventana emergente. Permite popups para este sitio.');
        resetLocalState();
        return;
    }
    setPresenterAlive(true);
    sendCurrentMediaUpdate();
}

/** @type {import('./file-manager.js')['default'] | null} */
let fileManagerRef = null;

function closePresentationWindow() {
    if (isPresenterOpen()) {
        presentationWindow?.close();
    }
    setPresenterAlive(false);
}

/**
 * @param {number} delta
 */
function navigate(delta) {
    const playlist = fileManagerRef?.filesState$.getValue() ?? [];
    currentItem = stepCurrentItem(playlist, currentItem, delta);
    previousCurrentIndex = currentItem ? playlist.indexOf(currentItem) : 0;
    sendCurrentMediaUpdate();
}

function togglePlayPause() {
    if (!commandChannels || !currentItem) {
        return;
    }
    if (isPlaying) {
        commandChannels.pauseChannel.send.next({});
        isPlaying = false;
    } else {
        commandChannels.playChannel.send.next({});
        isPlaying = true;
    }
    renderControlState();
}

/**
 * @param {import('./file-manager.js')['default']} fileManager
 * @param {import('./screens-manager.js')['default']} screenManager
 */
function initialize(fileManager, screenManager) {
    const channels = initSharedWorkerRxBridge();
    commandChannels = channels;
    fileManagerRef = fileManager;

    $startPresentationBtn = $('#startPresentationBtn');
    $endPresentationBtn = $('#endPresentationBtn');
    $prevMediaBtn = $('#prevMediaBtn');
    $nextMediaBtn = $('#nextMediaBtn');
    $rewindBtn = $('#rewindBtn');
    $fastForwardBtn = $('#fastForwardBtn');
    $playPauseBtn = $('#playPauseBtn');
    $playbackTimeDisplay = $('#playbackTimeDisplay');

    screenManager.selectedMonitor$.subscribe(monitor => {
        selectedMonitor = monitor;
    });

    interval(PING_INTERVAL_MS)
        .subscribe(() => {
            const alive = isPresenterOpen();
            setPresenterAlive(alive);
            if (alive) {
                channels.pingChannel.send.next({ timestamp: Date.now() });
            }
        });

    channels.mediaTimeUpdateChannel.on.subscribe(/** @param {{ currentTime?: unknown, duration?: unknown }} payload */ (payload) => {
        renderPlaybackTimeUpdate(payload);
    });

    fileManager.filesState$.subscribe(files => {
        const priorIndex = currentItem ? files.indexOf(currentItem) : previousCurrentIndex;
        currentItem = resolveCurrentItem(files, currentItem, previousCurrentIndex);
        previousCurrentIndex = currentItem ? files.indexOf(currentItem) : Math.max(priorIndex, 0);
        if (presenterAlive) {
            sendCurrentMediaUpdate();
        }
    });

    $startPresentationBtn.on('click', openPresentationWindow);
    $endPresentationBtn.on('click', closePresentationWindow);
    $prevMediaBtn.on('click', () => navigate(-1));
    $nextMediaBtn.on('click', () => navigate(1));
    $rewindBtn.on('click', () => channels.rewindChannel.send.next({ seconds: 10 }));
    $fastForwardBtn.on('click', () => channels.fastForwardChannel.send.next({ seconds: 10 }));
    $playPauseBtn.on('click', togglePlayPause);
    resetPlaybackTimeDisplay();
    renderControlState();
}

export default {
    initialize,
};
