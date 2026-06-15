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
    currentItemIndex,
    itemAtIndex,
    isPlaybackReportForCurrentItem,
    isTimeBasedMediaItem,
    resolveCurrentItem,
    stepCurrentItem,
    toBlankMediaPayload,
    toUpdateMediaPayload,
} from './presentation-state.mjs';
import {
    BehaviorSubject,
    combineLatest,
    distinctUntilChanged,
    filter,
    interval,
    map,
    shareReplay,
} from 'rxjs';

const PING_INTERVAL_MS = 2000;
const PLAYBACK_TIME_IDLE_TEXT = '--:-- / --:--';
const MEDIA_KIND_LABELS = {
    isImage: 'Imagen',
    isVideo: 'Video',
    isAudio: 'Audio',
};

/** @type {Window | null} */
let presentationWindow = null;
/** @type {BehaviorSubject<import('./screens-manager.js').RefinedScreen | null>} */
const selectedMonitorSubject = new BehaviorSubject(/** @type {import('./screens-manager.js').RefinedScreen | null} */ (null));
/** @type {BehaviorSubject<import('./file-manager.js').FileItem | null>} */
const currentItemSubject = new BehaviorSubject(/** @type {import('./file-manager.js').FileItem | null} */ (null));
/** @type {BehaviorSubject<number>} */
const previousCurrentIndexSubject = new BehaviorSubject(0);
/**
 * Real playback state as reported by the presenter via playback_state events.
 * Never set from local button clicks — the presenter is the source of truth.
 * @type {BehaviorSubject<boolean>}
 */
const isPlayingSubject = new BehaviorSubject(false);
/** @type {BehaviorSubject<boolean>} */
const presenterAliveSubject = new BehaviorSubject(false);
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
 * @param {import('./screens-manager.js').RefinedScreen | null} monitor
 * @returns {string}
 */
function selectedMonitorLabel(monitor) {
    if (!monitor) {
        return 'Sin pantalla seleccionada';
    }
    const monitorRole = monitor.isPrimary ? 'principal' : 'secundaria';
    return `Monitor ${monitor.index + 1} (${monitorRole})`;
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
 * @param {boolean} isPlaying
 * @returns {string}
 */
function activePlaylistState(item, isPlaying) {
    if (item.detected === 'isAudio' || item.detected === 'isVideo') {
        return isPlaying ? 'Reproduciéndose' : 'En pausa';
    }
    return 'En pantalla';
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

/**
 * @param {HTMLElement} element
 */
function scrollPlaylistItemIntoView(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
    });
}

/**
 * @param {number} itemId
 * @returns {HTMLElement | null}
 */
function getPlaylistItemElementById(itemId) {
    const element = document.querySelector(`[data-testid="files-list-item"][data-key="${itemId}"]`);
    return element instanceof HTMLElement ? element : null;
}

/**
 * @param {readonly import('./file-manager.js').FileItem[]} playlist
 * @param {import('./file-manager.js').FileItem | null} currentItem
 * @param {boolean} presenterAlive
 * @param {boolean} isPlaying
 */
function createPlaylistRowViewModels(playlist, currentItem, presenterAlive, isPlaying) {
    const currentItemId = presenterAlive && currentItem ? currentItem.id : null;

    return playlist.map(item => {
        const isCurrent = item.id === currentItemId;
        return {
            id: item.id,
            isCurrent,
            stateText: isCurrent
                ? activePlaylistState(item, isPlaying)
                : 'Listo para mostrar',
            showDisabled: isCurrent,
            showText: isCurrent ? 'En pantalla' : '▶ Mostrar',
        };
    });
}

/**
 * @param {Array<{
 *   id: number,
 *   isCurrent: boolean,
 *   stateText: string,
 *   showDisabled: boolean,
 *   showText: string,
 * }>} rowViewModels
 */
function renderPlaylistRows(rowViewModels) {
    const rowsByKey = new Map(rowViewModels.map(row => [String(row.id), row]));

    $fileList.children('.file-item').each((_, element) => {
        const row = rowsByKey.get(element.getAttribute('data-key') ?? '');
        if (!row) {
            return;
        }

        const $item = $(element);
        const $showBtn = $item.find('.show-btn');
        $item.toggleClass('file-item--current', row.isCurrent);
        if (row.isCurrent) {
            $item.attr('data-status', 'current');
        } else {
            $item.removeAttr('data-status');
        }
        $item.find('.playlist-item-state').text(row.stateText);
        $showBtn
            .prop('disabled', row.showDisabled)
            .text(row.showText);
    });
}

/**
 * @param {readonly import('./file-manager.js').FileItem[]} playlist
 * @param {import('./file-manager.js').FileItem | null} currentItem
 * @param {boolean} presenterAlive
 * @param {boolean} isPlaying
 * @param {import('./screens-manager.js').RefinedScreen | null} selectedMonitor
 */
function createControlViewModel(playlist, currentItem, presenterAlive, isPlaying, selectedMonitor) {
    const sessionInactive = !presenterAlive;
    const currentIndex = currentItemIndex(playlist, currentItem);
    const isTimeBasedMedia = isTimeBasedMediaItem(currentItem);
    // Images have no timeline: playback controls are impossible, not just inactive.
    const transportDisabled = sessionInactive || !isTimeBasedMedia;
    const playPauseAction = isPlaying ? 'Pausar contenido actual' : 'Reproducir contenido actual';

    if (!presenterAlive) {
        return {
            startDisabled: false,
            endDisabled: true,
            blankDisabled: true,
            previousDisabled: true,
            nextDisabled: true,
            rewindDisabled: true,
            fastForwardDisabled: true,
            playPauseDisabled: true,
            playPauseText: isPlaying ? '⏸️' : '▶️',
            playPauseAction,
            mediaStateLabel: 'Sin presentación',
            mediaStateTone: /** @type {'idle'} */ ('idle'),
            mediaName: 'Sin presentación activa',
            mediaMeta: `Destino preparado: ${selectedMonitorLabel(selectedMonitor)}.`,
        };
    }

    if (!currentItem) {
        return {
            startDisabled: true,
            endDisabled: false,
            blankDisabled: true,
            previousDisabled: true,
            nextDisabled: true,
            rewindDisabled: true,
            fastForwardDisabled: true,
            playPauseDisabled: true,
            playPauseText: isPlaying ? '⏸️' : '▶️',
            playPauseAction,
            mediaStateLabel: 'Pantalla en blanco',
            mediaStateTone: /** @type {'blank'} */ ('blank'),
            mediaName: 'Pantalla en blanco',
            mediaMeta: `Presentador abierto en ${selectedMonitorLabel(selectedMonitor)}.`,
        };
    }

    const mediaKind = MEDIA_KIND_LABELS[currentItem.detected] ?? 'Archivo';
    const fileType = fileTypeLabel(currentItem.file);

    return {
        startDisabled: true,
        endDisabled: false,
        blankDisabled: false,
        previousDisabled: currentIndex <= 0,
        nextDisabled: currentIndex === -1 || currentIndex >= playlist.length - 1,
        rewindDisabled: transportDisabled,
        fastForwardDisabled: transportDisabled,
        playPauseDisabled: transportDisabled,
        playPauseText: isPlaying ? '⏸️' : '▶️',
        playPauseAction,
        mediaStateLabel: isPlaying && isTimeBasedMedia ? 'Reproduciendo' : 'En pantalla',
        mediaStateTone: /** @type {'active'} */ ('active'),
        mediaName: currentItem.file.name,
        mediaMeta: `${mediaKind} / ${fileType} - ${selectedMonitorLabel(selectedMonitor)}`,
    };
}

/**
 * @param {ReturnType<typeof createControlViewModel>} viewModel
 */
function renderControlViewModel(viewModel) {
    $startPresentationBtn.prop('disabled', viewModel.startDisabled);
    $endPresentationBtn.prop('disabled', viewModel.endDisabled);
    $blankScreenBtn.prop('disabled', viewModel.blankDisabled);
    $prevMediaBtn.prop('disabled', viewModel.previousDisabled);
    $nextMediaBtn.prop('disabled', viewModel.nextDisabled);
    $rewindBtn.prop('disabled', viewModel.rewindDisabled);
    $fastForwardBtn.prop('disabled', viewModel.fastForwardDisabled);
    $playPauseBtn.prop('disabled', viewModel.playPauseDisabled);
    $playPauseBtn.text(viewModel.playPauseText);
    $playPauseBtn.attr({
        'aria-label': viewModel.playPauseAction,
        title: viewModel.playPauseAction,
    });
    setCurrentMediaState(viewModel.mediaStateLabel, viewModel.mediaStateTone);
    $currentMediaName.text(viewModel.mediaName);
    $currentMediaMeta.text(viewModel.mediaMeta);
}

/**
 * @param {boolean} nextAlive
 */
function setPresenterAlive(nextAlive) {
    if (presenterAliveSubject.getValue() === nextAlive) {
        return;
    }

    if (!nextAlive) {
        resetLocalState();
        return;
    }

    presenterAliveSubject.next(true);
}

function resetLocalState() {
    presentationWindow = null;
    currentItemSubject.next(null);
    previousCurrentIndexSubject.next(0);
    isPlayingSubject.next(false);
    presenterAliveSubject.next(false);
    resetPlaybackTimeDisplay();
}

function sendCurrentMediaUpdate() {
    if (!commandChannels) {
        return;
    }
    const currentItem = currentItemSubject.getValue();
    // Not playing until the presenter reports otherwise (autoplay can be
    // blocked, media can fail to load).
    isPlayingSubject.next(false);
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
}

function openPresentationWindow() {
    const playlist = fileManagerRef?.filesState$.getValue() ?? [];
    const currentItem = currentItemSubject.getValue();
    const previousCurrentIndex = previousCurrentIndexSubject.getValue();
    const selectedMonitor = selectedMonitorSubject.getValue();

    // An empty playlist is fine: the presenter opens on a blank stage.
    const nextCurrentItem = resolveCurrentItem(playlist, currentItem, previousCurrentIndex);
    currentItemSubject.next(nextCurrentItem);
    previousCurrentIndexSubject.next(nextCurrentItem ? playlist.indexOf(nextCurrentItem) : 0);

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
    const nextCurrentItem = stepCurrentItem(playlist, currentItemSubject.getValue(), delta);
    currentItemSubject.next(nextCurrentItem);
    previousCurrentIndexSubject.next(nextCurrentItem ? playlist.indexOf(nextCurrentItem) : 0);
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

    currentItemSubject.next(nextItem);
    previousCurrentIndexSubject.next(index);

    if (presenterAliveSubject.getValue()) {
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
    if (!presenterAliveSubject.getValue() || !currentItemSubject.getValue()) {
        return;
    }
    currentItemSubject.next(null);
    sendCurrentMediaUpdate();
}

function togglePlayPause() {
    if (!commandChannels || !currentItemSubject.getValue()) {
        return;
    }
    // Send the command only; the button flips when the presenter reports the
    // state actually changed. Re-sending on a fast double click is harmless.
    if (isPlayingSubject.getValue()) {
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
    $fileList = $('#fileList');

    screenManager.selectedMonitor$.subscribe(monitor => {
        selectedMonitorSubject.next(monitor);
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
        if (!isPlaybackReportForCurrentItem(
            presenterAliveSubject.getValue(),
            currentItemSubject.getValue(),
            payload
        )) {
            return;
        }
        const reportedPlaying = payload.isPlaying === true;
        if (reportedPlaying !== isPlayingSubject.getValue()) {
            isPlayingSubject.next(reportedPlaying);
        }
    });

    fileManager.filesState$.subscribe(files => {
        // While blank (no current item), playlist edits must not push media
        // onto the presenter — the operator decides what gets shown.
        const currentItem = currentItemSubject.getValue();
        if (currentItem) {
            const previousCurrentIndex = previousCurrentIndexSubject.getValue();
            const nextCurrentItem = resolveCurrentItem(files, currentItem, previousCurrentIndex);
            previousCurrentIndexSubject.next(nextCurrentItem
                ? files.indexOf(nextCurrentItem)
                : previousCurrentIndex);
            if (nextCurrentItem !== currentItem) {
                currentItemSubject.next(nextCurrentItem);
            }
            if (presenterAliveSubject.getValue() && nextCurrentItem !== currentItem) {
                // The shown item was deleted: present its neighbor, or go
                // blank when the playlist emptied.
                sendCurrentMediaUpdate();
            }
        }
    });

    combineLatest([
        fileManager.filesState$,
        currentItemSubject,
        presenterAliveSubject,
        isPlayingSubject,
        selectedMonitorSubject,
    ])
        .pipe(
            map(([playlist, currentItem, presenterAlive, isPlaying, selectedMonitor]) => (
                createControlViewModel(playlist, currentItem, presenterAlive, isPlaying, selectedMonitor)
            )),
            shareReplay(1),
        )
        .subscribe(renderControlViewModel);

    combineLatest([
        fileManager.filesState$,
        currentItemSubject,
        presenterAliveSubject,
        isPlayingSubject,
    ])
        .pipe(
            map(([playlist, currentItem, presenterAlive, isPlaying]) => (
                createPlaylistRowViewModels(playlist, currentItem, presenterAlive, isPlaying)
            )),
            shareReplay(1),
        )
        .subscribe(renderPlaylistRows);

    combineLatest([
        presenterAliveSubject,
        currentItemSubject,
    ])
        .pipe(
            map(([presenterAlive, currentItem]) => {
                if (!presenterAlive) {
                    return {
                        kind: /** @type {'inactive'} */ ('inactive'),
                        item: /** @type {import('./file-manager.js').FileItem | null} */ (null),
                    };
                }
                if (!currentItem) {
                    return {
                        kind: /** @type {'blank'} */ ('blank'),
                        item: /** @type {import('./file-manager.js').FileItem | null} */ (null),
                    };
                }
                return {
                    kind: /** @type {'current'} */ ('current'),
                    item: currentItem,
                };
            }),
            distinctUntilChanged((previous, current) => (
                previous.kind === current.kind && previous.item === current.item
            )),
            map(state => state.kind === 'current' && state.item
                ? getPlaylistItemElementById(state.item.id)
                : null),
            filter(element => element !== null),
        )
        .subscribe(element => {
            scrollPlaylistItemIntoView(/** @type {HTMLElement} */ (element));
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
}

export default {
    initialize,
};
