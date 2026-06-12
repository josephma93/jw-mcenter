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
    itemAtIndex,
    resolveCurrentItem,
    stepCurrentItem,
    toBlankMediaPayload,
    toUpdateMediaPayload,
} from './presentation-state.mjs';
import { interval } from 'rxjs';

const PING_INTERVAL_MS = 2000;
const PLAYBACK_TIME_IDLE_TEXT = '--:-- / --:--';
const MEDIA_KIND_LABELS = {
    isImage: 'Imagen',
    isVideo: 'Video',
    isAudio: 'Audio',
};

/** @type {Window | null} */
let presentationWindow = null;
/** @type {import('./screens-manager.js').RefinedScreen | null} */
let selectedMonitor = null;
/** @type {import('./file-manager.js').FileItem | null} */
let currentItem = null;
/** @type {number} */
let previousCurrentIndex = 0;
/**
 * Real playback state as reported by the presenter via playback_state events.
 * Never set from local button clicks — the presenter is the source of truth.
 * @type {boolean}
 */
let isPlaying = false;
/** @type {boolean} */
let presenterAlive = false;
/** @type {ReturnType<typeof initSharedWorkerRxBridge> | null} */
let commandChannels = null;
/** @type {JQuery<HTMLElement>} */ let $startPresentationBtn;
/** @type {JQuery<HTMLElement>} */ let $endPresentationBtn;
/** @type {JQuery<HTMLElement>} */ let $blankScreenBtn;
/** @type {JQuery<HTMLElement>} */ let $prevMediaBtn;
/** @type {JQuery<HTMLElement>} */ let $nextMediaBtn;
/** @type {JQuery<HTMLElement>} */ let $rewindBtn;
/** @type {JQuery<HTMLElement>} */ let $fastForwardBtn;
/** @type {JQuery<HTMLElement>} */ let $playPauseBtn;
/** @type {JQuery<HTMLElement>} */ let $playbackTimeDisplay;
/** @type {JQuery<HTMLElement>} */ let $playbackProgressBar;
/** @type {JQuery<HTMLElement>} */ let $currentMediaState;
/** @type {JQuery<HTMLElement>} */ let $currentMediaName;
/** @type {JQuery<HTMLElement>} */ let $currentMediaMeta;
/** @type {JQuery<HTMLElement>} */ let $mediaControlHint;
/** @type {JQuery<HTMLElement>} */ let $fileList;

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

/**
 * @param {number} percent
 */
function setPlaybackProgress(percent) {
    const clampedPercent = Math.max(0, Math.min(100, percent));
    $playbackProgressBar.css('width', `${clampedPercent}%`);
}

function resetPlaybackTimeDisplay() {
    setPlaybackTimeDisplay(PLAYBACK_TIME_IDLE_TEXT);
    setPlaybackProgress(0);
}

/**
 * @returns {string}
 */
function selectedMonitorLabel() {
    if (!selectedMonitor) {
        return 'Sin pantalla seleccionada';
    }
    const monitorRole = selectedMonitor.isPrimary ? 'principal' : 'secundaria';
    return `Monitor ${selectedMonitor.index + 1} (${monitorRole})`;
}

/**
 * @param {File} file
 * @returns {string}
 */
function fileTypeLabel(file) {
    const subtype = file.type.split('/')[1];
    if (subtype) {
        return subtype.toUpperCase();
    }
    const extension = file.name.split('.').pop();
    return extension ? extension.toUpperCase() : 'Tipo desconocido';
}

/**
 * @param {string} label
 * @param {'idle' | 'active' | 'blank'} tone
 */
function setCurrentMediaState(label, tone) {
    $currentMediaState
        .removeClass('is-active is-blank')
        .addClass(tone === 'active' ? 'is-active' : '')
        .addClass(tone === 'blank' ? 'is-blank' : '')
        .text(label);
}

/**
 * @param {import('./file-manager.js').FileItem} item
 * @returns {string}
 */
function inactivePlaylistState(item) {
    if (item.detected === 'isImage') {
        return 'Lista para mostrar: imagen sin controles de tiempo.';
    }
    return 'Lista para mostrar: tendrá controles de reproducción al presentarse.';
}

/**
 * @param {import('./file-manager.js').FileItem} item
 * @returns {string}
 */
function activePlaylistState(item) {
    if (item.detected === 'isImage') {
        return 'Imagen en pantalla: reproducción y saltos no aplican.';
    }
    if (item.detected === 'isAudio' || item.detected === 'isVideo') {
        return isPlaying
            ? 'Reproduciéndose en la pantalla del presentador.'
            : 'En pantalla; reproducción pausada o esperando al presentador.';
    }
    return 'En pantalla del presentador.';
}

/**
 * @param {{ currentTime?: unknown, duration?: unknown }} payload
 */
function renderPlaybackTimeUpdate(payload) {
    const currentTime = Number(payload.currentTime);
    const duration = Number(payload.duration);
    setPlaybackTimeDisplay(
        `${formatPlaybackTime(currentTime)} / ${formatPlaybackTime(duration)}`
    );
    setPlaybackProgress(Number.isFinite(currentTime) && Number.isFinite(duration) && duration > 0
        ? (currentTime / duration) * 100
        : 0);
}

function renderPlaylistCurrentHighlight() {
    $fileList.children('.file-item').each((_, element) => {
        const $item = $(element);
        const item = /** @type {import('./file-manager.js').FileItem | undefined} */ ($item.data('fileItem'));
        const isCurrent = presenterAlive && !!currentItem && item === currentItem;
        const $showBtn = $item.find('.show-btn');
        $item.toggleClass('file-item--current', isCurrent);
        if (isCurrent) {
            $item.attr('data-status', 'current');
        } else {
            $item.removeAttr('data-status');
        }
        if (item) {
            $item.find('.playlist-item-state').text(isCurrent
                ? activePlaylistState(item)
                : inactivePlaylistState(item));
        }
        $showBtn
            .prop('disabled', isCurrent)
            .text(isCurrent ? 'En pantalla' : '▶ Mostrar');
    });
}

function renderCurrentMediaSummary() {
    if (!presenterAlive) {
        setCurrentMediaState('Sin presentación', 'idle');
        $currentMediaName.text('Sin presentación activa');
        $currentMediaMeta.text(`Destino preparado: ${selectedMonitorLabel()}.`);
        $mediaControlHint.text('Los controles de reproducción se activan cuando hay audio o video en pantalla.');
        return;
    }

    if (!currentItem) {
        setCurrentMediaState('Pantalla en blanco', 'blank');
        $currentMediaName.text('Pantalla en blanco');
        $currentMediaMeta.text(`Presentador abierto en ${selectedMonitorLabel()}.`);
        $mediaControlHint.text('Usa Mostrar en la lista para enviar contenido al presentador.');
        return;
    }

    const mediaKind = MEDIA_KIND_LABELS[currentItem.detected] ?? 'Archivo';
    const fileType = fileTypeLabel(currentItem.file);
    const isTimeBasedMedia = currentItem.detected === 'isVideo' || currentItem.detected === 'isAudio';

    setCurrentMediaState(isPlaying && isTimeBasedMedia ? 'Reproduciendo' : 'En pantalla', 'active');
    $currentMediaName.text(currentItem.file.name);
    $currentMediaMeta.text(`${mediaKind} / ${fileType} - ${selectedMonitorLabel()}`);
    $mediaControlHint.text(isTimeBasedMedia
        ? 'Reproducción, pausa y saltos de 10 segundos aplican a este contenido.'
        : 'Imagen en pantalla: reproducción, pausa y saltos de tiempo no aplican.');
}

function renderControlState() {
    const sessionInactive = !presenterAlive;
    const playlist = fileManagerRef?.filesState$.getValue() ?? [];
    const currentIndex = currentItem ? playlist.indexOf(currentItem) : -1;
    const isTimeBasedMedia = currentItem?.detected === 'isVideo' || currentItem?.detected === 'isAudio';
    // Images have no timeline: playback controls are impossible, not just inactive.
    const transportDisabled = sessionInactive || !isTimeBasedMedia;

    $startPresentationBtn.prop('disabled', presenterAlive);
    $endPresentationBtn.prop('disabled', sessionInactive);
    // Already blank (no current item) leaves nothing to blank out.
    $blankScreenBtn.prop('disabled', sessionInactive || !currentItem);
    $prevMediaBtn.prop('disabled', sessionInactive || currentIndex <= 0);
    $nextMediaBtn.prop('disabled', sessionInactive || currentIndex === -1 || currentIndex >= playlist.length - 1);
    $rewindBtn.prop('disabled', transportDisabled);
    $fastForwardBtn.prop('disabled', transportDisabled);
    $playPauseBtn.prop('disabled', transportDisabled);
    const playPauseAction = isPlaying ? 'Pausar contenido actual' : 'Reproducir contenido actual';
    $playPauseBtn.text(isPlaying ? '⏸️' : '▶️');
    $playPauseBtn.attr({
        'aria-label': playPauseAction,
        title: playPauseAction,
    });
    renderCurrentMediaSummary();
    renderPlaylistCurrentHighlight();
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
    isPlaying = false;
    presenterAlive = false;
    resetPlaybackTimeDisplay();
    renderControlState();
}

function sendCurrentMediaUpdate() {
    if (!commandChannels) {
        return;
    }
    // Not playing until the presenter reports otherwise (autoplay can be
    // blocked, media can fail to load).
    isPlaying = false;
    if (!currentItem) {
        // No current item = blank stage on the presenter.
        commandChannels.updateMediaChannel.send.next(toBlankMediaPayload());
        resetPlaybackTimeDisplay();
    } else {
        commandChannels.updateMediaChannel.send.next(toUpdateMediaPayload(currentItem));
        if (currentItem.detected === 'isImage') {
            resetPlaybackTimeDisplay();
        }
    }
    renderControlState();
}

function openPresentationWindow() {
    const playlist = fileManagerRef?.filesState$.getValue() ?? [];

    // An empty playlist is fine: the presenter opens on a blank stage.
    currentItem = resolveCurrentItem(playlist, currentItem, previousCurrentIndex);
    previousCurrentIndex = currentItem ? playlist.indexOf(currentItem) : 0;

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

/**
 * Jump directly to a playlist item and show it on the presenter.
 * @param {number} index
 */
function showItemAtIndex(index) {
    const playlist = fileManagerRef?.filesState$.getValue() ?? [];
    const nextItem = itemAtIndex(playlist, index);
    if (!nextItem) {
        return;
    }

    currentItem = nextItem;
    previousCurrentIndex = index;

    if (presenterAlive) {
        sendCurrentMediaUpdate();
        return;
    }

    openPresentationWindow();
}

/**
 * Show nothing on the presenter. previousCurrentIndex is kept so navigation
 * and a later restart resume near where the presentation left off.
 */
function blankPresentation() {
    if (!presenterAlive || !currentItem) {
        return;
    }
    currentItem = null;
    sendCurrentMediaUpdate();
}

function togglePlayPause() {
    if (!commandChannels || !currentItem) {
        return;
    }
    // Send the command only; the button flips when the presenter reports the
    // state actually changed. Re-sending on a fast double click is harmless.
    if (isPlaying) {
        commandChannels.pauseChannel.send.next({});
    } else {
        commandChannels.playChannel.send.next({});
    }
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
    $blankScreenBtn = $('#blankScreenBtn');
    $prevMediaBtn = $('#prevMediaBtn');
    $nextMediaBtn = $('#nextMediaBtn');
    $rewindBtn = $('#rewindBtn');
    $fastForwardBtn = $('#fastForwardBtn');
    $playPauseBtn = $('#playPauseBtn');
    $playbackTimeDisplay = $('#playbackTimeDisplay');
    $playbackProgressBar = $('#playbackProgressBar');
    $currentMediaState = $('#currentMediaState');
    $currentMediaName = $('#currentMediaName');
    $currentMediaMeta = $('#currentMediaMeta');
    $mediaControlHint = $('#mediaControlHint');
    $fileList = $('#fileList');

    screenManager.selectedMonitor$.subscribe(monitor => {
        selectedMonitor = monitor;
        renderControlState();
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

    channels.playbackStateChannel.on.subscribe(/** @param {{ mediaUrl?: unknown, isPlaying?: unknown }} payload */ (payload) => {
        // Ignore reports about a medium we already navigated away from.
        if (!presenterAlive || !currentItem || payload.mediaUrl !== currentItem.blobURL) {
            return;
        }
        const reportedPlaying = payload.isPlaying === true;
        if (reportedPlaying !== isPlaying) {
            isPlaying = reportedPlaying;
            renderControlState();
        }
    });

    fileManager.filesState$.subscribe(files => {
        // While blank (no current item), playlist edits must not push media
        // onto the presenter — the operator decides what gets shown.
        if (currentItem) {
            const previousItem = currentItem;
            currentItem = resolveCurrentItem(files, currentItem, previousCurrentIndex);
            previousCurrentIndex = currentItem ? files.indexOf(currentItem) : previousCurrentIndex;
            if (presenterAlive && currentItem !== previousItem) {
                // The shown item was deleted: present its neighbor, or go
                // blank when the playlist emptied.
                sendCurrentMediaUpdate();
                return;
            }
        }
        if (presenterAlive) {
            renderControlState();
        } else {
            renderPlaylistCurrentHighlight();
        }
    });

    fileManager.intentToShowFile$.subscribe(index => {
        showItemAtIndex(index);
    });

    $startPresentationBtn.on('click', openPresentationWindow);
    $endPresentationBtn.on('click', closePresentationWindow);
    $blankScreenBtn.on('click', blankPresentation);
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
