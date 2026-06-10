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
import { interval, filter } from 'rxjs';

const PING_INTERVAL_MS = 2000;

/** @type {Window | null} */
let presentationWindow = null;
/** @type {import('./screens-manager.js').RefinedScreen | null} */
let selectedMonitor = null;

function openPresentationWindow() {
    if (!selectedMonitor) {
        alert('Selecciona un monitor para la presentación.');
        return;
    }
    const { availLeft, availTop, availWidth, availHeight } = selectedMonitor;
    const features = `left=${availLeft},top=${availTop},width=${availWidth},height=${availHeight}`;
    presentationWindow = window.open('presentation.html', 'presentation', features);
    if (!presentationWindow) {
        alert('El navegador bloqueó la ventana emergente. Permite popups para este sitio.');
    }
}

/**
 * @param {import('./file-manager.js')['default']} fileManager
 * @param {import('./screens-manager.js')['default']} screenManager
 */
function initialize(fileManager, screenManager) {
    const channels = initSharedWorkerRxBridge();

    screenManager.selectedMonitor$.subscribe(monitor => {
        selectedMonitor = monitor;
    });

    interval(PING_INTERVAL_MS)
        .pipe(filter(() => presentationWindow !== null && !presentationWindow.closed))
        .subscribe(() => {
            channels.pingChannel.send.next({ timestamp: Date.now() });
        });

    $('#startPresentationBtn').on('click', openPresentationWindow);
}

export default {
    initialize,
};
