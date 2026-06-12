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
import { interval, filter } from 'rxjs';

const PING_INTERVAL_MS = 2000;

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
/** @type {ReturnType<typeof initSharedWorkerRxBridge> | null} */
let commandChannels = null;
/** @type {JQuery<HTMLElement>} */ let $startPresentationBtn;
/** @type {JQuery<HTMLElement>} */ let $endPresentationBtn;
/** @type {JQuery<HTMLElement>} */ let $prevMediaBtn;
/** @type {JQuery<HTMLElement>} */ let $nextMediaBtn;
/** @type {JQuery<HTMLElement>} */ let $rewindBtn;
/** @type {JQuery<HTMLElement>} */ let $fastForwardBtn;
/** @type {JQuery<HTMLElement>} */ let $playPauseBtn;

function isPresenterOpen() {
    return presentationWindow !== null && !presentationWindow.closed;
}

function renderControlState() {
    const presenterOpen = isPresenterOpen();
    $startPresentationBtn.prop('disabled', presenterOpen);
    $endPresentationBtn.prop('disabled', !presenterOpen);
    $playPauseBtn.text(isPlaying ? '⏸️' : '▶️');
}

function resetLocalState() {
    presentationWindow = null;
    currentItem = null;
    previousCurrentIndex = 0;
    isPlaying = true;
    renderControlState();
}

function sendCurrentMediaUpdate() {
    if (!currentItem || !commandChannels) {
        return;
    }
    isPlaying = true;
    commandChannels.updateMediaChannel.send.next(toUpdateMediaPayload(currentItem));
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
    sendCurrentMediaUpdate();
    renderControlState();
}

/** @type {import('./file-manager.js')['default'] | null} */
let fileManagerRef = null;

function closePresentationWindow() {
    if (isPresenterOpen()) {
        presentationWindow?.close();
    }
    resetLocalState();
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

    screenManager.selectedMonitor$.subscribe(monitor => {
        selectedMonitor = monitor;
    });

    interval(PING_INTERVAL_MS)
        .pipe(filter(() => presentationWindow !== null && !presentationWindow.closed))
        .subscribe(() => {
            channels.pingChannel.send.next({ timestamp: Date.now() });
        });

    interval(PING_INTERVAL_MS)
        .subscribe(() => {
            if (presentationWindow !== null && presentationWindow.closed) {
                resetLocalState();
            } else {
                renderControlState();
            }
        });

    fileManager.filesState$.subscribe(files => {
        const priorIndex = currentItem ? files.indexOf(currentItem) : previousCurrentIndex;
        currentItem = resolveCurrentItem(files, currentItem, previousCurrentIndex);
        previousCurrentIndex = currentItem ? files.indexOf(currentItem) : Math.max(priorIndex, 0);
        if (isPresenterOpen()) {
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
    renderControlState();
}

export default {
    initialize,
};
