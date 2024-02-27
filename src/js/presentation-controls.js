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

function disableAllButtons() {
    [
        moveToPreviousImageBtn,
        stopPresentingBtn,
        startPresentingBtn,
        moveToNextImageBtn,
    ].forEach(btn => btn.disabled = true);
}

function onMoveToPreviousImageBtnClick() {

}

function onStopPresentingBtnClick() {

}

function onStartPresentingBtnClick() {

}

function onMoveToNextImageBtnClick() {

}

function setElementListeners() {
    moveToPreviousImageBtn.addEventListener('click', onMoveToPreviousImageBtnClick);
    stopPresentingBtn.addEventListener('click', onStopPresentingBtnClick);
    startPresentingBtn.addEventListener('click', onStartPresentingBtnClick);
    moveToNextImageBtn.addEventListener('click', onMoveToNextImageBtnClick);
}

function enablePresentationStartBtn() {
    startPresentingBtn.disabled = false;
}

export function initPresentationControls() {
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