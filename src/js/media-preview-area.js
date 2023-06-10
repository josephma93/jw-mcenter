import {getReferencesToMediaPreview} from "./element-references.js";
import {$fileSelection} from "./drop-area.js";
import {partial, pipe} from "ramda";
import { Toast } from 'bootstrap'

/**
 * @param {HTMLTemplateElement} template
 * @returns {HTMLElement} The given template cloned.
 */
function cloneTemplateNode(template) {
    return template.content.cloneNode(true);
}

/**
 * @param {function(): HTMLElement} getTplClone
 * @param {HTMLImageElement} image
 */
function setImageTplSource(getTplClone, image) {
    const imageTpl = getTplClone();

    imageTpl.querySelector('.jsMediaListMedia').src = image.src;
    return imageTpl;
}

/**
 * @param {function(): HTMLElement} getTplClone
 * @param {HTMLVideoElement} video
 */
function setVideoTplSource(getTplClone, video) {
    const videoTpl = getTplClone();

    videoTpl.querySelector('.jsMediaListItemSrc').src = video.src;
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

    /**
     * @param {FileHandlingResult} selectionResult
     */
    function handleMediaSelection(selectionResult) {
        const {images, videos, invalids} = selectionResult;
        images.forEach(appendImageToMediaPreview);
        videos.forEach(appendVideoToMediaPreview);

        if (invalids.length) {
            warningToast.querySelector('.jsToastHeader').textContent = `Unsupported elements selected.`;
            const hasMoreThan1 = invalids.length > 1;
            warningToast.querySelector('.jsToastBody').textContent = `There ${hasMoreThan1 ? 'are' : 'is'} ${invalids.length} element${hasMoreThan1 ? 's' : ''} selected that ${hasMoreThan1 ? "are" : "is"}n't supported.`;
            Toast.getOrCreateInstance(warningToast).show();
        }
    }

    $fileSelection.subscribe(handleMediaSelection);
}

export default function initMediaPreviewArea() {
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