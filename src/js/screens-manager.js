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

// Global BehaviorSubject for the selected monitor
const selectedMonitorSubject = new BehaviorSubject(null);

let canvas,
    canvasContext,
    $legendTableBody,
    $monitorSelect,
    canvasContainer,
    legendTmpl;

let screenDetailsPromise = null;

// getScreenDetails() returns a live object that tracks screen changes, so it
// only needs to be requested once. Chrome shows the permission prompt only
// during a user gesture; on failure the cache is cleared so a later gesture
// can retry.
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

async function queryPermissionState() {
    // 'window-management' is the current permission name; 'window-placement'
    // is the deprecated alias older Chromium versions expect.
    for (const name of ['window-management', 'window-placement']) {
        try {
            return (await navigator.permissions.query({ name })).state;
        } catch { /* this browser doesn't know this name, try the next */ }
    }
    return 'prompt';
}

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

function renderScreenPreview(refinedScreens) {
    const rect = canvasContainer.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
    const { totalWidth, totalHeight } = refinedScreens[0];
    const padding = 20;
    const scaleX = (canvas.width - padding * 2) / totalWidth;
    const scaleY = (canvas.height - padding * 2) / totalHeight;
    const scale = Math.min(scaleX, scaleY);

    refinedScreens.forEach((scr) => {
        const { index, isPrimary, isBrowserScreen, availWidth, availHeight, offsetX, offsetY } = scr;
        const scaledX = padding + offsetX * scale;
        const scaledY = padding + offsetY * scale;
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
        canvasContext.font = '16px sans-serif';
        canvasContext.fillText((index + 1).toString(), scaledX + 5, scaledY + 20);
    });
}

function renderPreviewLegend(refinedScreens) {
    var legendHTML = ejs.render(legendTmpl, {
        screens: refinedScreens,
    });
    $legendTableBody.empty().html(legendHTML);
}

function renderAvailableMonitorsSelect(refinedScreens) {
    const currentSelected = $monitorSelect.val();
    $monitorSelect.find('option').not(':first').remove();

    refinedScreens.forEach(scr => {
        if (!scr.isBrowserScreen) {
            const value = scr.index;
            const option = $('<option>')
                .val(value)
                .text(scr.index + 1);
            if (value.toString() === currentSelected) {
                option.attr('selected', 'selected');
            }
            $monitorSelect.append(option);
        }
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

// Subscribing starts the polling, which requires the permission to already be
// granted — only call this after acquireScreenDetails() has succeeded.
function startScreensStream() {
    availableScreensData$
        .subscribe(refined => {
            renderScreenPreview(refined);
            renderPreviewLegend(refined);
            renderAvailableMonitorsSelect(refined);

            const current = selectedMonitorSubject.value;
            if (current && !refined.some(screen => screen.index === current.index)) {
                selectedMonitorSubject.next(null);
                $monitorSelect.val("");
            }
        });

    fromEvent($monitorSelect[0], 'change')
        .pipe(
            map(() => parseInt($monitorSelect.val(), 10)),
            withLatestFrom(availableScreensData$),
            map(([selectedIndex, refined]) => {
                return refined.find(screen => screen.index === selectedIndex) || null;
            }),
        )
        .subscribe(selectedMonitor => {
            selectedMonitorSubject.next(selectedMonitor);
        });
}

async function initializeDOMThings() {
    canvas = document.getElementById('layoutCanvas');
    canvasContext = canvas.getContext('2d');
    $legendTableBody = $('#legendTableBody');
    $monitorSelect = $('#monitorSelect');

    canvasContainer = document.getElementById('canvas-container');
    legendTmpl = document.getElementById("legendTemplate").innerHTML.trim();

    if (await queryPermissionState() === 'granted') {
        try {
            await acquireScreenDetails();
            startScreensStream();
            return;
        } catch { /* fall through to the first-interaction request */ }
    }

    requestPermissionOnFirstInteraction();
}

// The permission prompt needs transient activation, so request it inside the
// user's first interaction with the page — same idea as the old
// multi-screen.js userActivation poll, but event-driven instead of timed.
// If the prompt is dismissed or denied, a retry button appears.
function requestPermissionOnFirstInteraction() {
    const EVENTS = ['click', 'keydown'];
    async function onFirstInteraction() {
        // Not every event grants user activation (e.g. the Escape key or
        // browser-reserved shortcuts). If the browser says there is no
        // transient activation right now, the permission prompt is guaranteed
        // to fail — keep waiting for a real interaction instead of burning
        // the attempt. (isActive, not hasBeenActive: the prompt needs the
        // transient kind, and sticky activation outlives it.)
        const ua = navigator.userActivation;
        if (ua && !ua.isActive) {
            return;
        }
        EVENTS.forEach(e => document.removeEventListener(e, onFirstInteraction, true));
        try {
            await acquireScreenDetails();
            startScreensStream();
        } catch {
            showPermissionRetryButton();
        }
    }
    EVENTS.forEach(e => document.addEventListener(e, onFirstInteraction, true));
}

function showPermissionRetryButton() {
    const $permissionBtn = $('#screensPermissionBtn');
    $permissionBtn.show().off('click').on('click', async () => {
        try {
            await acquireScreenDetails();
            $permissionBtn.hide();
            startScreensStream();
        } catch (err) {
            alert('Sin acceso a los monitores: ' + err.message
                + '\nSi el permiso fue bloqueado, habilítalo en la configuración del sitio (ícono junto a la URL).');
        }
    });
}

export default {
    availableScreens$: availableScreensData$,
    selectedMonitor$: selectedMonitorSubject.asObservable(),
    initialize: initializeDOMThings,
};