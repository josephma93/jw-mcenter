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

let channels = null;
let presentationWindow = null;
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

function initialize(fileManager, screenManager) {
    channels = initSharedWorkerRxBridge();

    screenManager.selectedMonitor$.subscribe(monitor => {
        selectedMonitor = monitor;
    });

    interval(PING_INTERVAL_MS)
        .pipe(filter(() => presentationWindow && !presentationWindow.closed))
        .subscribe(() => {
            channels.pingChannel.send.next({ timestamp: Date.now() });
        });

    $('#startPresentationBtn').on('click', openPresentationWindow);
}

export default {
    initialize,
};
