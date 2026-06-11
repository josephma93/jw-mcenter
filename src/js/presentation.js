// @ts-check
/**
 * Presenter window behavior for the presentation screen.
 *
 * This module owns the presenter-side media rendering and SharedWorker
 * subscriptions. It stays intentionally close to the legacy inline script so
 * the extraction does not change runtime behavior beyond removing unsupported
 * fullscreen fallbacks.
 */
import { initSharedWorkerRxBridge } from './shared-worker-bridge.js';
import { fromEvent, interval, tap } from 'rxjs';

/** @type {ReturnType<typeof initSharedWorkerRxBridge>} */
const channels = initSharedWorkerRxBridge();

/** @type {HTMLMediaElement | HTMLImageElement | null} */
let currentMediaElement = null;

/** @type {number} */
let currentMediaDuration = 0;

/**
 * @param {string} message
 */
function updateStatusMessage(message) {
  const statusDiv = document.getElementById('statusMessage');
  if (statusDiv) {
    statusDiv.innerText = message;
    statusDiv.style.display = 'block';
  }
}

/**
 * @param {HTMLMediaElement | HTMLImageElement} element
 * @returns {element is HTMLMediaElement}
 */
function isMediaElement(element) {
  return element.tagName === 'VIDEO' || element.tagName === 'AUDIO';
}

/**
 * @returns {Promise<void>}
 */
function requestFullscreen() {
  const docElem = document.documentElement;
  if (docElem.requestFullscreen) return docElem.requestFullscreen();
  return Promise.reject('Fullscreen API not supported.');
}

/**
 * @param {string} mediaUrl
 * @param {string} mediaType
 */
function updateMediaElement(mediaUrl, mediaType) {
  const mediaContainer = document.getElementById('media-container');
  if (!mediaContainer) return;

  mediaContainer.innerHTML = '';
  let element;
  if (mediaType === 'video') {
    element = document.createElement('video');
    element.src = mediaUrl;
    element.autoplay = true;
  } else if (mediaType === 'audio') {
    element = document.createElement('audio');
    element.src = mediaUrl;
    element.autoplay = true;
  } else {
    element = document.createElement('img');
    element.src = mediaUrl;
    element.alt = 'Presentation Media';
  }

  element.style.width = '100%';
  element.style.height = 'auto';
  element.style.objectFit = 'contain';
  mediaContainer.appendChild(element);
  currentMediaElement = element;

  if (mediaType === 'video' || mediaType === 'audio') {
    element.addEventListener('loadedmetadata', () => {
      currentMediaDuration = /** @type {HTMLMediaElement} */ (element).duration;
    });
  } else {
    currentMediaDuration = 0;
  }
}

channels.updateMediaChannel.on.subscribe(data => {
  updateMediaElement(data.mediaUrl, data.mediaType);
});

channels.playChannel.on.subscribe(() => {
  if (currentMediaElement && isMediaElement(currentMediaElement)) {
    currentMediaElement.play();
  }
});

channels.pauseChannel.on.subscribe(() => {
  if (currentMediaElement && isMediaElement(currentMediaElement)) {
    currentMediaElement.pause();
  }
});

channels.fastForwardChannel.on.subscribe(() => {
  if (currentMediaElement && isMediaElement(currentMediaElement)) {
    const duration = currentMediaElement.duration || Infinity;
    currentMediaElement.currentTime = Math.min(currentMediaElement.currentTime + 10, duration);
  }
});

channels.rewindChannel.on.subscribe(() => {
  if (currentMediaElement && isMediaElement(currentMediaElement)) {
    currentMediaElement.currentTime = Math.max(currentMediaElement.currentTime - 10, 0);
  }
});

channels.pingChannel.on.subscribe(() => {
  channels.pongChannel.send.next({ timestamp: Date.now() });
});

/** @type {number} */
let lastPing = Date.now();
channels.pingChannel.on.subscribe(() => {
  lastPing = Date.now();
});

setInterval(() => {
  if (Date.now() - lastPing > 5000) {
    updateStatusMessage('No ping received. Closing presenter.');
    console.warn('No ping received for a while. Closing presenter.');
    window.close();
  }
}, 1000);

interval(200).subscribe(() => {
  if (
    currentMediaElement &&
    isMediaElement(currentMediaElement)
  ) {
    channels.mediaTimeUpdateChannel.send.next({
      currentTime: currentMediaElement.currentTime,
      duration: currentMediaDuration,
      timestamp: Date.now(),
    });
  }
});

const overlay = document.getElementById('fullscreen-overlay');
if (overlay) {
  fromEvent(overlay, 'click')
    .pipe(
      tap(() => {
        requestFullscreen()
          .then(() => {
            overlay.style.display = 'none';
          })
          .catch(err => console.error('Fullscreen error:', err));
      })
    )
    .subscribe();
}

fromEvent(document, 'fullscreenchange').subscribe(() => {
  if (!overlay) return;
  if (document.fullscreenElement) {
    overlay.style.display = 'none';
  } else {
    overlay.style.display = 'flex';
  }
});
