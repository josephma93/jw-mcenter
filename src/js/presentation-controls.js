import {combineLatest, filter} from "rxjs";
import {$previewAreaContents} from "./media-preview-area";
import {$multiScreenSupport} from "./multi-screen";
import {getReferencesToMediaControlButtons} from "./element-references";


/** @typedef {MediaControlsElementReferences.moveToPreviousImageBtn} */
let moveToPreviousImageBtn;

/** @typedef {MediaControlsElementReferences.stopPresentingBtn} */
let stopPresentingBtn;

/** @typedef {MediaControlsElementReferences.startPresentingBtn} */
let startPresentingBtn;

/** @typedef {MediaControlsElementReferences.moveToNextImageBtn} */
let moveToNextImageBtn;

/** @type {WindowProxy|null} */
let windowObjectReference = null;

function openRequestedTab(url, target) {
  if (windowObjectReference === null || windowObjectReference.closed) {
    windowObjectReference = window.open(url, target);
  } else {
    windowObjectReference.focus();
  }
}

function enablePresentationStartBtn() {
    startPresentingBtn.classList.remove('disabled');
    startPresentingBtn.setAttribute('href', 'presenter.html');
    startPresentingBtn.setAttribute('aria-disabled', 'false');
}

function disablePresentationStartBtn() {
    startPresentingBtn.classList.add('disabled');
    startPresentingBtn.setAttribute('href', '');
    startPresentingBtn.setAttribute('aria-disabled', 'true');
}

function disableAllButtons() {
    [
        moveToPreviousImageBtn,
        stopPresentingBtn,
        moveToNextImageBtn,
    ].forEach(btn => btn.disabled = true);
    disablePresentationStartBtn();
}


function updateWorker() {
    if (images.length > 0) {
        const reader = new FileReader();
        reader.onload = (e) => worker.port.postMessage({action: 'updateImage', imageUrl: e.target.result});
        reader.onerror = (error) => console.error('Error reading file:', error);
        reader.readAsDataURL(images[currentIndex]);
    }
}

function navigateImage(direction) {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < images.length) {
        currentIndex = newIndex;
        updateWorker();
    }
}

function onStopPresentingBtnClick() {

}

function onStartPresentingBtnClick(event) {
    const { currentTarget } = event;
    openRequestedTab(currentTarget.getAttribute('href'), currentTarget.getAttribute('target'));
    updateWorker();
    event.preventDefault();
}

function setElementListeners() {
    moveToPreviousImageBtn.addEventListener('click', () => navigateImage(-1));
    stopPresentingBtn.addEventListener('click', onStopPresentingBtnClick);
    startPresentingBtn.addEventListener("click", onStartPresentingBtnClick, false);
    moveToNextImageBtn.addEventListener('click', () => navigateImage(1));
}

function initializeWorker() {
    if (typeof SharedWorker === 'undefined') {
        console.error('SharedWorker is not supported by this browser.');
        return;
    }
    try {
        const worker = new SharedWorker('shared_worker.js');
        worker.port.start();
        setInterval(() => worker.port.postMessage({action: 'keepAlive', parentWindowId: Math.random()}), 500);
        return worker;
    } catch (error) {
        console.error('Failed to initialize SharedWorker:', error);
    }
}

export function initPresentationControls() {
    if (!initializeWorker()) {
        throw new Error('Failed to initialize SharedWorker');
    }

    ({
        moveToPreviousImageBtn,
        stopPresentingBtn,
        startPresentingBtn,
        moveToNextImageBtn,
    } = getReferencesToMediaControlButtons());

    disableAllButtons();
    setElementListeners();

    combineLatest([$previewAreaContents, $multiScreenSupport])
        .pipe(
            filter(([previewAreaContents, multiScreenStatus]) => previewAreaContents.hasContent() && multiScreenStatus.canUseMultiScreenAPI),
        )
        .subscribe(() => {
            console.log("Presentation can be enabled!!");
            enablePresentationStartBtn();
        });
}