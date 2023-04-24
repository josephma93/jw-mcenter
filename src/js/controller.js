import initDropArea from './drop-area.js';
import {getReferencesToMediaPreview} from "./element-references.js";

/**
 * @typedef {TemplateElementReferences.image}
 */
let imageMediaItemTpl;

/**
 * @typedef {TemplateElementReferences.video}
 */
let videoMediaItemTpl;
/**
 * @typedef {TemplateElementReferences.mediaPreview}
 */
let mediaPreview;

/**
 * @param {HTMLImageElement} image
 */
function appendImageToMediaPreview(image) {
    const imageTpl = imageMediaItemTpl.content.cloneNode(true);

    imageTpl.querySelector('.media-list__media').src = image.src;
    mediaPreview.appendChild(imageTpl);
}

/**
 * @param {HTMLVideoElement} video
 */
function appendVideoToMediaPreview(video) {
    const videoTpl = videoMediaItemTpl.content.cloneNode(true);

    videoTpl.querySelector('.media-list__item-src').src = video.src;
    mediaPreview.appendChild(videoTpl);
}

/**
 * Handles the MediaSelectionEvent.
 */
function handleMediaSelection(event) {
    // handle event logic here
    const {images, videos, invalids} = event.detail;
    console.log(images, videos, invalids);

    images.forEach(appendImageToMediaPreview);
    videos.forEach(appendVideoToMediaPreview);
}

$(function onDOMReady() {
    initDropArea();
    ({image: imageMediaItemTpl, video: videoMediaItemTpl, mediaPreview} = getReferencesToMediaPreview());
    document.addEventListener('mediaSelection', handleMediaSelection);
});

