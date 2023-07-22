import {getReferencesToMediaPreview} from "./element-references.js";
import {$dropFilesProcessedSignal, $imagesSelected, $invalidsSelected, $videosSelected} from "./drop-area.js";
import {partial, pipe} from "ramda";
import { Toast } from 'bootstrap'
import {map, filter, toArray, merge, BehaviorSubject, tap, bufferWhen} from "rxjs";

/**
 * Preview area contents
 * @typedef {Object} PreviewAreaContent
 * @property {SelectionResultObj[]} images An array containing all valid image files in the form of HTML image elements.
 * @property {SelectionResultObj[]} videos An array containing all valid video files in the form of HTML video elements.
 */
const PREVIEW_AREA_STATE = {
    images: [],
    videos: [],
}

/**
 * @type {BehaviorSubject<PreviewAreaContent>}
 */
const previewAreaContentsSubject = new BehaviorSubject(PREVIEW_AREA_STATE);

/**
 * @type {Observable<PreviewAreaContent>}
 */
export const $previewAreaContents = previewAreaContentsSubject.asObservable();

/**
 * @param {HTMLTemplateElement} template
 * @returns {HTMLElement} The given template cloned.
 */
function cloneTemplateNode(template) {
    return template.content.cloneNode(true);
}

/**
 * @param {function(): HTMLElement} getTplClone
 * @param {SelectionResultObj} selection
 */
function setImageTplSource(getTplClone, selection) {
    const imageTpl = getTplClone();

    imageTpl.querySelector('.jsMediaListMedia').src = selection.mediaElement.src;
    return imageTpl;
}

/**
 * @param {function(): HTMLElement} getTplClone
 * @param {SelectionResultObj} selection
 */
function setVideoTplSource(getTplClone, selection) {
    const videoTpl = getTplClone();

    videoTpl.querySelector('.jsMediaListItemSrc').src = selection.mediaElement.src;
    return videoTpl;
}

/**
 * @param {function(): HTMLElement} getMediaControlsTplClone
 * @param {HTMLElement} tpl
 */
function addMediaListItemButtonsToTemplate(getMediaControlsTplClone, tpl) {
    const tplClone = getMediaControlsTplClone();
    tpl.querySelector('.jsMediaListItem').appendChild(tplClone);
    return tpl;
}

function createAppendToPreviewFunctions(
    {
        imageMediaItemTpl,
        mediaControlsTpl,
        $mediaPreviewTarget,
        videoMediaItemTpl,
    }
) {
    let cloneImageMediaItemTpl = partial(cloneTemplateNode, [imageMediaItemTpl]);
    let updateImageSrcInTpl = partial(setImageTplSource, [cloneImageMediaItemTpl]);
    let cloneMediaControlsTpl = partial(cloneTemplateNode, [mediaControlsTpl]);
    let addMediaControlsToTplClone = partial(addMediaListItemButtonsToTemplate, [cloneMediaControlsTpl]);
    /** @type {function(HTMLImageElement): void} */
    let appendImageToMediaPreview = pipe(
        updateImageSrcInTpl,
        addMediaControlsToTplClone,
        (tpl) => $mediaPreviewTarget.append(tpl),
    );

    let cloneVideoMediaItemTpl = partial(cloneTemplateNode, [videoMediaItemTpl]);
    let updateVideoSrcInTpl = partial(setVideoTplSource, [cloneVideoMediaItemTpl]);
    /** @type {function(HTMLVideoElement): void} */
    let appendVideoToMediaPreview = pipe(
        updateVideoSrcInTpl,
        addMediaControlsToTplClone,
        (tpl) => $mediaPreviewTarget.append(tpl),
    );
    return {
        appendImageToMediaPreview,
        appendVideoToMediaPreview,
    };
}

function initMediaSelectionEvent(
    {
        imageMediaItemTpl,
        mediaControlsTpl,
        $mediaPreviewTarget,
        videoMediaItemTpl,
        warningToast
    }
) {
    const {
        appendImageToMediaPreview,
        appendVideoToMediaPreview,
    } = createAppendToPreviewFunctions({
        imageMediaItemTpl,
        mediaControlsTpl,
        $mediaPreviewTarget,
        videoMediaItemTpl,
    });

    $invalidsSelected
        .pipe(
            bufferWhen(() => $dropFilesProcessedSignal),
            filter(invalids => invalids.length > 0)
        )
        .subscribe(invalids => {
            warningToast.querySelector('.jsToastHeader').textContent = `Unsupported elements selected.`;
            const hasMoreThan1 = invalids.length > 1;
            warningToast.querySelector('.jsToastBody').textContent = `There ${hasMoreThan1 ? 'are' : 'is'} ${invalids.length} element${hasMoreThan1 ? 's' : ''} selected that ${hasMoreThan1 ? "are" : "is"}n't supported.`;
            Toast.getOrCreateInstance(warningToast).show();
        });

    $imagesSelected.subscribe(selection => {
                        appendImageToMediaPreview(selection);
                        PREVIEW_AREA_STATE.images.push(selection);
                    })

    merge(
            $imagesSelected
                .pipe(
                    tap(selection => {
                        appendImageToMediaPreview(selection);
                        PREVIEW_AREA_STATE.images.push(selection);
                    }),
                ),
            $videosSelected
                .pipe(
                    tap(selection => {
                        appendVideoToMediaPreview(selection);
                        PREVIEW_AREA_STATE.videos.push(selection);
                    }),
                ),
        )
        .pipe(
            bufferWhen(() => $dropFilesProcessedSignal),
            map(() => PREVIEW_AREA_STATE)
        )
        .subscribe(combined => previewAreaContentsSubject.next(combined));
}

export function initMediaPreviewArea() {
    const {
        image: imageMediaItemTpl,
        video: videoMediaItemTpl,
        buttons: mediaControlsTpl,
        mediaPreview: mediaPreviewTarget,
        warningToast,
    } = getReferencesToMediaPreview();

    const $mediaPreviewTarget = $(mediaPreviewTarget);

    initMediaSelectionEvent({
        imageMediaItemTpl,
        mediaControlsTpl,
        $mediaPreviewTarget,
        videoMediaItemTpl,
        warningToast
    });
}