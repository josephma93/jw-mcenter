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

async function requestMultiScreenAccess() {
    if (!('getScreenDetails' in window)) {
        throw new Error('Window Placement API not supported in this browser.');
    }
    try {
        return await window.getScreenDetails();
    } catch (err) {
        throw new Error('Permission required for Window Placement API.');
    }
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
        switchMap(() => requestMultiScreenAccess()),
        map(sd => processScreenData(sd.screens)),
        distinctUntilChanged((prev, curr) => JSON.stringify(prev) === JSON.stringify(curr)),
        shareReplay(1),
    );

function initializeDOMThings() {
    canvas = document.getElementById('layoutCanvas');
    canvasContext = canvas.getContext('2d');
    $legendTableBody = $('#legendTableBody');
    $monitorSelect = $('#monitorSelect');

    canvasContainer = document.getElementById('canvas-container');
    legendTmpl = document.getElementById("legendTemplate").innerHTML.trim();

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

export default {
    availableScreens$: availableScreensData$,
    selectedMonitor$: selectedMonitorSubject.asObservable(),
    initialize: initializeDOMThings,
};