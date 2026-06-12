// @ts-check
import {
    BehaviorSubject,
    distinctUntilChanged,
    fromEvent,
    interval,
    map,
    shareReplay,
    switchMap,
    withLatestFrom,
} from 'rxjs';

/**
 * A screen plus the computed geometry the canvas preview needs.
 * @typedef {Object} RefinedScreen
 * @property {number} index
 * @property {boolean} isPrimary
 * @property {boolean} isBrowserScreen Whether the control panel lives on it.
 * @property {number} availWidth
 * @property {number} availHeight
 * @property {number} availLeft
 * @property {number} availTop
 * @property {number} offsetX Position relative to the bounding box of all screens.
 * @property {number} offsetY
 * @property {number} totalWidth Bounding box of all screens combined.
 * @property {number} totalHeight
 * @property {number} browserLeft
 * @property {number} browserTop
 * @property {number} browserW
 * @property {number} browserH
 */

// Global BehaviorSubject for the selected monitor
/** @type {BehaviorSubject<RefinedScreen | null>} */
const selectedMonitorSubject = new BehaviorSubject(/** @type {RefinedScreen | null} */ (null));

/** Comma-joined indices of the last seen secondary monitors. @type {string} */
let lastAvailableMonitorsKey = '';

/** @type {HTMLCanvasElement} */ let canvas;
/** @type {CanvasRenderingContext2D} */ let canvasContext;
/** @type {JQuery<HTMLElement>} */ let $legendTableBody;
/** @type {JQuery<HTMLElement>} */ let $monitorSelect;
/** @type {HTMLElement} */ let canvasContainer;
/** @type {HTMLDialogElement} */ let screensPermissionDialog;
/** @type {HTMLButtonElement} */ let screensPermissionBtn;
/** @type {HTMLElement} */ let screensPermissionStatus;
/** @type {HTMLElement} */ let monitorFlyoutPanel;
/** @type {string} */ let legendTmpl;
/** @type {RefinedScreen[]} */
let latestRefinedScreens = [];

/** @type {Promise<ScreenDetails> | null} */
let screenDetailsPromise = null;

// getScreenDetails() returns a live object that tracks screen changes, so it
// only needs to be requested once. Chrome shows the permission prompt only
// during a user gesture; on failure the cache is cleared so a later gesture
// can retry.
/** @returns {Promise<ScreenDetails>} */
function acquireScreenDetails() {
    if (!('getScreenDetails' in window)) {
        return Promise.reject(new Error('Window Management API not supported in this browser.'));
    }
    screenDetailsPromise ??= window.getScreenDetails().catch(err => {
        screenDetailsPromise = null;
        throw err;
    });
    return screenDetailsPromise;
}

/** @returns {Promise<PermissionState>} */
async function queryPermissionState() {
    // 'window-management' is the current permission name; 'window-placement'
    // is the deprecated alias older Chromium versions expect.
    for (const name of ['window-management', 'window-placement']) {
        try {
            return (await navigator.permissions.query({ name: /** @type {PermissionName} */ (name) })).state;
        } catch { /* this browser doesn't know this name, try the next */ }
    }
    return 'prompt';
}

/**
 * @param {ScreenDetailed[]} screens
 * @returns {RefinedScreen[]}
 */
function processScreenData(screens) {
    if (!screens || screens.length === 0) {
        throw new Error('No screens found.');
    }
    const minLeft = Math.min(...screens.map(s => s.availLeft));
    const minTop = Math.min(...screens.map(s => s.availTop));
    let maxRight = -Infinity, maxBottom = -Infinity;
    for (const s of screens) {
        const right = s.availLeft + s.availWidth;
        const bottom = s.availTop + s.availHeight;
        if (right > maxRight) maxRight = right;
        if (bottom > maxBottom) maxBottom = bottom;
    }
    const totalWidth = maxRight - minLeft;
    const totalHeight = maxBottom - minTop;

    const browserLeft = window.screenX;
    const browserTop = window.screenY;
    const browserW = window.outerWidth;
    const browserH = window.outerHeight;

    return screens.map((screen, index) => {
        const offsetX = screen.availLeft - minLeft;
        const offsetY = screen.availTop - minTop;
        const screenRight = screen.availLeft + screen.availWidth;
        const screenBottom = screen.availTop + screen.availHeight;
        const isBrowserScreen =
            browserLeft >= screen.availLeft &&
            browserLeft < screenRight &&
            browserTop >= screen.availTop &&
            browserTop < screenBottom;

        return {
            index,
            isPrimary: screen.isPrimary,
            isBrowserScreen,
            availWidth: screen.availWidth,
            availHeight: screen.availHeight,
            availLeft: screen.availLeft,
            availTop: screen.availTop,
            offsetX,
            offsetY,
            totalWidth,
            totalHeight,
            browserLeft,
            browserTop,
            browserW,
            browserH,
        };
    });
}

/** @param {RefinedScreen[]} refinedScreens */
function renderScreenPreview(refinedScreens) {
    const rect = canvasContainer.getBoundingClientRect();
    const canvasWidth = Math.max(1, rect.width);
    const canvasHeight = Math.max(1, rect.height);
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = Math.round(canvasWidth * pixelRatio);
    canvas.height = Math.round(canvasHeight * pixelRatio);
    canvasContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    canvasContext.clearRect(0, 0, canvasWidth, canvasHeight);
    const { totalWidth, totalHeight } = refinedScreens[0];
    const inset = Math.max(6, Math.min(12, Math.min(canvasWidth, canvasHeight) * 0.04));
    const scaleX = (canvasWidth - inset * 2) / totalWidth;
    const scaleY = (canvasHeight - inset * 2) / totalHeight;
    const scale = Math.min(scaleX, scaleY);
    const originX = (canvasWidth - totalWidth * scale) / 2;
    const originY = (canvasHeight - totalHeight * scale) / 2;

    refinedScreens.forEach((scr) => {
        const { index, isPrimary, isBrowserScreen, availWidth, availHeight, offsetX, offsetY } = scr;
        const scaledX = originX + offsetX * scale;
        const scaledY = originY + offsetY * scale;
        const scaledW = availWidth * scale;
        const scaledH = availHeight * scale;

        // Colorblind-friendly colors (Okabe-Ito palette)
        let fillColor = '#56B4E9'; // Secondary: Sky Blue
        let strokeColor = '#000000'; // Black outline
        if (isPrimary) {
            fillColor = '#009E73'; // Primary: Bluish Green
            strokeColor = '#006f5b'; // Dark green outline
        }
        canvasContext.fillStyle = fillColor;
        canvasContext.fillRect(scaledX, scaledY, scaledW, scaledH);
        canvasContext.lineWidth = isPrimary ? 3 : 2;
        canvasContext.strokeStyle = strokeColor;
        canvasContext.strokeRect(scaledX, scaledY, scaledW, scaledH);

        if (isBrowserScreen) {
            const { browserLeft, browserTop, browserW, browserH } = scr;
            const winOffsetX = (browserLeft - scr.availLeft);
            const winOffsetY = (browserTop - scr.availTop);
            const scaledWinX = scaledX + (winOffsetX * scale);
            const scaledWinY = scaledY + (winOffsetY * scale);
            const scaledWinW = browserW * scale;
            const scaledWinH = browserH * scale;
            canvasContext.fillStyle = 'rgba(230, 159, 0, 0.3)';
            canvasContext.fillRect(scaledWinX, scaledWinY, scaledWinW, scaledWinH);
            canvasContext.strokeStyle = '#D55E00';
            canvasContext.lineWidth = 1;
            canvasContext.strokeRect(scaledWinX, scaledWinY, scaledWinW, scaledWinH);
        }
        canvasContext.fillStyle = 'black';
        const labelFontSize = Math.round(Math.max(11, Math.min(16, canvasHeight * 0.12)));
        canvasContext.font = `${labelFontSize}px sans-serif`;
        canvasContext.fillText((index + 1).toString(), scaledX + 5, scaledY + labelFontSize + 4);
    });
}

/** @param {RefinedScreen[]} refinedScreens */
function renderPreviewLegend(refinedScreens) {
    var legendHTML = ejs.render(legendTmpl, {
        screens: refinedScreens,
    });
    $legendTableBody.empty().html(legendHTML);
}

function isMonitorFlyoutOpen() {
    return monitorFlyoutPanel.matches(':popover-open');
}

function initializeMonitorFlyout() {
    monitorFlyoutPanel = /** @type {HTMLElement} */ (document.getElementById('monitorFlyoutPanel'));
    monitorFlyoutPanel.addEventListener('toggle', () => {
        if (isMonitorFlyoutOpen() && latestRefinedScreens.length > 0) {
            requestAnimationFrame(() => renderScreenPreview(latestRefinedScreens));
        }
    });
}

/** @param {RefinedScreen[]} refinedScreens */
function renderAvailableMonitorsSelect(refinedScreens) {
    const secondaries = refinedScreens.filter(screen => !screen.isBrowserScreen);
    const currentSelected = selectedMonitorSubject.value
        ? String(selectedMonitorSubject.value.index)
        : String($monitorSelect.val() || '');

    $monitorSelect.empty();

    if (secondaries.length === 0) {
        $monitorSelect.append(
            $('<option>')
                .val('')
                .text('No hay pantalla disponible')
                .prop('disabled', true)
                .prop('selected', true)
        );
        return;
    }

    secondaries.forEach(scr => {
        const value = scr.index;
        const role = scr.isPrimary ? 'principal' : 'secundario';
        const option = $('<option>')
            .val(value)
            .text(`Monitor ${scr.index + 1} - ${role} - ${scr.availWidth}x${scr.availHeight}`);
        if (value.toString() === currentSelected) {
            option.attr('selected', 'selected');
        }
        $monitorSelect.append(option);
    });
}

const REFRESH_INTERVAL_MS = 200; // ~5fps
const availableScreensData$ = interval(REFRESH_INTERVAL_MS)
    .pipe(
        switchMap(() => acquireScreenDetails()),
        map(sd => processScreenData(sd.screens)),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        shareReplay(1),
    );

/**
 * Defaults the selection to the first secondary (non-browser) monitor
 * whenever possible: on startup, when monitors are (re)connected, and when
 * the selected monitor disappears.
 * @param {RefinedScreen[]} refinedScreens
 */
function autoSelectDefaultMonitor(refinedScreens) {
    const secondaries = refinedScreens.filter(screen => !screen.isBrowserScreen);
    const availableKey = secondaries.map(screen => screen.index).join(',');
    if (availableKey !== lastAvailableMonitorsKey) {
        lastAvailableMonitorsKey = availableKey;
    }

    const current = selectedMonitorSubject.value;
    if (current) {
        const refreshed = secondaries.find(screen => screen.index === current.index) ?? null;
        if (!refreshed) {
            selectedMonitorSubject.next(null);
            $monitorSelect.val('');
        } else if (JSON.stringify(refreshed) !== JSON.stringify(current)) {
            // Same monitor, fresher geometry (e.g. resolution change).
            selectedMonitorSubject.next(refreshed);
        }
    }

    if (secondaries.length === 0) {
        if (selectedMonitorSubject.value !== null) {
            selectedMonitorSubject.next(null);
        }
        $monitorSelect.val('');
        return;
    }

    if (selectedMonitorSubject.value) {
        return;
    }
    const defaultMonitor = secondaries[0];
    selectedMonitorSubject.next(defaultMonitor);
    $monitorSelect.val(String(defaultMonitor.index));
}

// Subscribing starts the polling, which requires the permission to already be
// granted — only call this after acquireScreenDetails() has succeeded.
function startScreensStream() {
    availableScreensData$
        .subscribe(refined => {
            latestRefinedScreens = refined;
            if (isMonitorFlyoutOpen()) {
                renderScreenPreview(refined);
            }
            renderPreviewLegend(refined);
            renderAvailableMonitorsSelect(refined);
            autoSelectDefaultMonitor(refined);
        });

    fromEvent($monitorSelect[0], 'change')
        .pipe(
            map(() => parseInt(String($monitorSelect.val()), 10)),
            withLatestFrom(availableScreensData$),
            map(([selectedIndex, refined]) => {
                return refined.find(screen => screen.index === selectedIndex) || null;
            }),
        )
        .subscribe(selectedMonitor => {
            selectedMonitorSubject.next(selectedMonitor);
        });
}

/**
 * @param {string} message
 */
function setPermissionStatus(message) {
    screensPermissionStatus.textContent = message;
}

function closePermissionDialog() {
    setPermissionStatus('');
    screensPermissionBtn.style.display = 'none';
    if (screensPermissionDialog.open) {
        screensPermissionDialog.close();
    }
}

/**
 * @param {string} [message]
 */
function showPermissionDialog(message = '') {
    setPermissionStatus(message);
    screensPermissionBtn.disabled = false;
    screensPermissionBtn.textContent = 'Permitir acceso a los monitores';
    screensPermissionBtn.style.display = 'inline-flex';
    if (!screensPermissionDialog.open) {
        screensPermissionDialog.showModal();
    }
    screensPermissionBtn.focus();
}

/**
 * @param {boolean} busy
 */
function setPermissionButtonBusy(busy) {
    screensPermissionBtn.disabled = busy;
    screensPermissionBtn.textContent = busy
        ? 'Solicitando acceso...'
        : 'Permitir acceso a los monitores';
}

async function requestScreenPermissionFromDialog() {
    setPermissionButtonBusy(true);
    setPermissionStatus('');
    try {
        await acquireScreenDetails();
        closePermissionDialog();
        startScreensStream();
    } catch (err) {
        setPermissionStatus('No se pudo obtener acceso. Acepta el permiso del navegador o habilítalo en la configuración del sitio.');
        setPermissionButtonBusy(false);
        screensPermissionBtn.focus();
    }
}

function initializePermissionDialog() {
    screensPermissionDialog = /** @type {HTMLDialogElement} */ (document.getElementById('screensPermissionDialog'));
    screensPermissionBtn = /** @type {HTMLButtonElement} */ (document.getElementById('screensPermissionBtn'));
    screensPermissionStatus = /** @type {HTMLElement} */ (document.getElementById('screensPermissionStatus'));

    screensPermissionDialog.addEventListener('cancel', event => {
        event.preventDefault();
    });
    screensPermissionBtn.addEventListener('click', requestScreenPermissionFromDialog);
}

async function initializeDOMThings() {
    canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('layoutCanvas'));
    canvasContext = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    $legendTableBody = $('#legendTableBody');
    $monitorSelect = $('#monitorSelect');
    initializeMonitorFlyout();
    initializePermissionDialog();

    canvasContainer = /** @type {HTMLElement} */ (document.getElementById('canvas-container'));
    legendTmpl = /** @type {HTMLElement} */ (document.getElementById("legendTemplate")).innerHTML.trim();

    const permissionState = await queryPermissionState();
    if (permissionState === 'granted') {
        try {
            await acquireScreenDetails();
            startScreensStream();
            return;
        } catch { /* fall through to the modal request */ }
    }

    showPermissionDialog(permissionState === 'denied'
        ? 'El permiso de monitores está bloqueado. Habilítalo en la configuración del sitio y vuelve a intentarlo.'
        : '');
}

export default {
    availableScreens$: availableScreensData$,
    selectedMonitor$: selectedMonitorSubject.asObservable(),
    initialize: initializeDOMThings,
};
