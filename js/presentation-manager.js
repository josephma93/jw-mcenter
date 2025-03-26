let $startPresentationBtn;

// pairwise(),
// tap(([prev, curr]) => {
//     if (currentPresenterMonitorIndex != null) {
//         return;
//     }
//     const removedMonitors = prev.filter(
//         prevMonitor => !curr.some(currMonitor => currMonitor.index === prevMonitor.index)
//     );
//     if (removedMonitors.length > 0) {
//         console.log('Removed monitors:', removedMonitors);
//         if (removedMonitors.some(m => m.index === currentPresenterMonitorIndex)) {
//             console.warn('The monitor used for presentation has been removed.');
//             currentPresenterMonitorIndex = null;
//             if (presentationWindow && !presentationWindow.closed) {
//                 presentationWindow.close();
//             }
//             alert('The monitor used for presentation has been removed.');
//         }
//     }
//     if (curr.length === 1) {
//         console.log('Only one monitor available.');
//         // Additional handling for single-monitor case can be added here.
//     }
// }),

// Import the SharedWorker RxJS bridge module.
import { initSharedWorkerRxBridge } from './js/sharedWorkerRxBridge.js';
import { fromEvent, interval } from rxjs;

// Initialize the SharedWorker channels.
const channels = initSharedWorkerRxBridge();

// UI elements
const statusDiv = document.getElementById('status');
const updateMediaBtn = document.getElementById('updateMedia');
const mediaUrlInput = document.getElementById('mediaUrl');
const mediaTypeSelect = document.getElementById('mediaType');
const playBtn = document.getElementById('play');
const pauseBtn = document.getElementById('pause');
const fastForwardBtn = document.getElementById('fastForward');
const rewindBtn = document.getElementById('rewind');

/**
 * Updates the status display.
 * @param {string} message The message to show.
 */
function updateStatus(message) {
    statusDiv.innerText = message;
}

// Send an update_media command when the Update Media button is clicked.
fromEvent(updateMediaBtn, 'click').subscribe(() => {
    const mediaUrl = mediaUrlInput.value.trim();
    const mediaType = mediaTypeSelect.value;
    if (mediaUrl === '') {
        updateStatus('Please enter a valid media URL.');
        return;
    }
    channels.updateMediaChannel.send.next({ mediaUrl, mediaType });
    updateStatus(`Sent update_media: ${mediaUrl} (${mediaType})`);
});

// Send play command.
fromEvent(playBtn, 'click').subscribe(() => {
    channels.playChannel.send.next({});
    updateStatus('Sent play command.');
});

// Send pause command.
fromEvent(pauseBtn, 'click').subscribe(() => {
    channels.pauseChannel.send.next({});
    updateStatus('Sent pause command.');
});

// Send fast_forward command.
fromEvent(fastForwardBtn, 'click').subscribe(() => {
    channels.fastForwardChannel.send.next({});
    updateStatus('Sent fast_forward command.');
});

// Send rewind command.
fromEvent(rewindBtn, 'click').subscribe(() => {
    channels.rewindChannel.send.next({});
    updateStatus('Sent rewind command.');
});

// Ping-Pong health-check.
// Send a ping every 2 seconds.
interval(200).subscribe(() => {
    channels.pingChannel.send.next({ timestamp: Date.now() });
});

// Listen for pong responses from the presenter.
channels.pongChannel.on.subscribe(data => {
    updateStatus(`Received pong at ${new Date(data.timestamp).toLocaleTimeString()}`);
});

// Optionally, listen for media time updates from the presenter.
channels.mediaTimeUpdateChannel.on.subscribe(data => {
    console.log('Media Time Update:', data);
});

function initialize(fileManager, screenManager) {
    $startPresentationBtn = $('#startPresentationBtn');
    $startPresentationBtn.on('click', function onStartPresentationBtnClicked() {
        const selectedIndex = parseInt($monitorSelect.val(), 10);
        if (isNaN(selectedIndex)) {
            alert('Please select a monitor.');
            return;
        }
        const selectedScreen = availableScreensData$.getValue()[selectedIndex];
        if (!selectedScreen) return;
        currentPresenterMonitorIndex = selectedScreen.index;
        const features = `left=${selectedScreen.availLeft},top=${selectedScreen.availTop},width=${selectedScreen.availWidth},height=${selectedScreen.availHeight}`;
        let url = 'presentation.html';
        if (selectedMediaURL) {
            url += '?media=' + encodeURIComponent(selectedMediaURL);
        }
        presentationWindow = window.open(url, 'presentation', features);
        if (!presentationWindow) {
            alert('Popup blocked. Please allow popups for this site.');
        }
    });



}

export default {
    initialize,
};