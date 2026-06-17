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
import { fromEvent, interval } from 'rxjs';
import { registerPresenterServiceWorker } from './pwa-registration.js';

/** @type {ReturnType<typeof initSharedWorkerRxBridge>} */
const channels = initSharedWorkerRxBridge();

registerPresenterServiceWorker();

/** @type {HTMLMediaElement | HTMLImageElement | null} */
let currentMediaElement = null;

/** @type {number} */
let currentMediaDuration = 0;

/** @type {boolean} */
let pendingPlayRetry = false;

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

function clearStatusMessage() {
  const statusDiv = document.getElementById('statusMessage');
  if (statusDiv) {
    statusDiv.innerText = '';
    statusDiv.style.display = 'none';
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
 * @param {string} mediaType
 * @returns {boolean}
 */
function isTimelinePresenterMediaType(mediaType) {
  return mediaType === 'video' || mediaType === 'audio';
}

/**
 * @param {HTMLMediaElement} element
 * @returns {boolean}
 */
function isMediaAtEnd(element) {
  return Number.isFinite(element.duration) && element.currentTime >= element.duration - 0.05;
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
function isAutoplayRejection(error) {
  return error instanceof DOMException && error.name === 'NotAllowedError';
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function getErrorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * @returns {Promise<void>}
 */
function requestFullscreen() {
  const docElem = document.documentElement;
  if (docElem.requestFullscreen) return docElem.requestFullscreen();
  return Promise.reject(new Error('Fullscreen API not supported.'));
}

/**
 * @param {HTMLMediaElement} element
 * @returns {Promise<boolean>}
 */
async function tryPlayMedia(element) {
  try {
    await element.play();
    pendingPlayRetry = false;
    clearStatusMessage();
    return true;
  } catch (error) {
    if (isAutoplayRejection(error)) {
      element.pause();
      pendingPlayRetry = true;
      updateStatusMessage('La reproducción automática fue bloqueada; haz clic en la ventana de presentación para continuar.');
      return false;
    }

    pendingPlayRetry = false;
    updateStatusMessage(`No se pudo reproducir el medio: ${getErrorMessage(error)}`);
    return false;
  }
}

/**
 * Retry play only if the same element is still current.
 * @param {HTMLMediaElement | HTMLImageElement} element
 * @param {boolean} [allowPendingRetry]
 */
function tryPlayCurrentElement(element, allowPendingRetry = false) {
  if (
    currentMediaElement === element &&
    isMediaElement(element) &&
    (allowPendingRetry || !pendingPlayRetry)
  ) {
    void tryPlayMedia(element);
  }
}

/**
 * Some Chromium media transitions report "playing" before time actually
 * advances. Give the element one later chance to start for real.
 * @param {HTMLMediaElement | HTMLImageElement} element
 */
function schedulePlaybackKick(element) {
  window.setTimeout(() => {
    if (
      currentMediaElement === element &&
      isMediaElement(element) &&
      !pendingPlayRetry &&
      !element.ended &&
      element.currentTime < 0.05
    ) {
      void tryPlayMedia(element);
    }
  }, 750);
}

/**
 * Reports the real playback state to the control panel so its UI never has to
 * guess. mediaUrl lets the receiver discard reports from a superseded medium.
 */
function broadcastPlaybackState() {
  const element = currentMediaElement;
  if (!element || !isMediaElement(element)) {
    return;
  }
  const hasEnded = element.ended || isMediaAtEnd(element);
  channels.playbackStateChannel.send.next({
    mediaUrl: element.src,
    isPlaying: !element.paused && !hasEnded,
    hasEnded,
  });
}

/**
 * @param {string} mediaUrl
 * @param {string} mediaType
 */
function updateMediaElement(mediaUrl, mediaType) {
  const mediaContainer = document.getElementById('media-container');
  if (!mediaContainer) return;

  mediaContainer.innerHTML = '';

  if (mediaType === 'blank' || !mediaUrl) {
    currentMediaElement = null;
    currentMediaDuration = 0;
    pendingPlayRetry = false;
    clearStatusMessage();
    return;
  }

  let element;
  if (mediaType === 'video') {
    element = document.createElement('video');
    element.src = mediaUrl;
    element.autoplay = true;
    element.preload = 'auto';
    element.playsInline = true;
  } else if (mediaType === 'audio') {
    element = document.createElement('audio');
    element.src = mediaUrl;
    element.autoplay = true;
    element.preload = 'auto';
  } else {
    element = document.createElement('img');
    element.src = mediaUrl;
    element.alt = 'Presentation Media';
  }

  element.addEventListener('error', () => {
    pendingPlayRetry = false;
    updateStatusMessage('No se pudo cargar el medio seleccionado.');
  });

  if (isTimelinePresenterMediaType(mediaType)) {
    element.addEventListener('loadeddata', () => {
      if (!pendingPlayRetry) {
        clearStatusMessage();
      }
    });
  } else {
    element.addEventListener('load', () => {
      clearStatusMessage();
    });
  }

  mediaContainer.appendChild(element);
  currentMediaElement = element;

  if (isTimelinePresenterMediaType(mediaType)) {
    element.addEventListener('loadedmetadata', () => {
      currentMediaDuration = /** @type {HTMLMediaElement} */ (element).duration;
    });
    for (const readyEvent of ['loadeddata', 'canplay', 'canplaythrough']) {
      element.addEventListener(readyEvent, () => {
        tryPlayCurrentElement(element);
      });
    }
    for (const stateEvent of ['play', 'playing', 'pause', 'ended', 'seeked']) {
      element.addEventListener(stateEvent, () => {
        if (currentMediaElement === element) {
          broadcastPlaybackState();
        }
      });
    }
    window.setTimeout(() => {
      tryPlayCurrentElement(element);
    }, 0);
    schedulePlaybackKick(element);
  } else {
    pendingPlayRetry = false;
    currentMediaDuration = 0;
  }
}

channels.updateMediaChannel.on.subscribe(data => {
  updateMediaElement(data.mediaUrl, data.mediaType);
});

channels.playChannel.on.subscribe(() => {
  if (currentMediaElement && isMediaElement(currentMediaElement)) {
    void tryPlayMedia(currentMediaElement);
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
    if (Number.isFinite(duration) && currentMediaElement.currentTime >= duration - 0.05) {
      currentMediaElement.pause();
      broadcastPlaybackState();
    }
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
    // Self-healing: even if a state event is lost, the control panel
    // converges on the real state within 200ms.
    broadcastPlaybackState();
  }
});

const overlay = document.getElementById('fullscreen-overlay');
if (overlay) {
  overlay.addEventListener('click', async () => {
    try {
      await requestFullscreen();
    } catch (err) {
      console.error('Fullscreen error:', err);
    }

    if (currentMediaElement && isMediaElement(currentMediaElement)) {
      void tryPlayMedia(currentMediaElement);
      schedulePlaybackKick(currentMediaElement);
    }
  });
}

fromEvent(document, 'fullscreenchange').subscribe(() => {
  if (!overlay) return;
  if (document.fullscreenElement) {
    overlay.style.display = 'none';
    if (
      currentMediaElement &&
      isMediaElement(currentMediaElement) &&
      (pendingPlayRetry || currentMediaElement.paused || currentMediaElement.currentTime < 0.05)
    ) {
      tryPlayCurrentElement(currentMediaElement, true);
      schedulePlaybackKick(currentMediaElement);
    }
  } else {
    overlay.style.display = 'flex';
  }
});
