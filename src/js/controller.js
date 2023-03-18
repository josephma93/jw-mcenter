import initDropArea from './drop-area.js';

/**
 * Custom event triggered when new media elements are selected.
 *
 * @event MediaSelectionEvent
 * @type {object}
 * @property {HTMLImageElement[]} detail.images - List of selected HTML img elements.
 * @property {HTMLVideoElement[]} detail.videos - List of selected HTML video elements.
 * @property {File[]} detail.invalids - List of invalid files.
 */

/**
 * Handles MediaSelectionEvent.
 * @param {MediaSelectionEvent} event - The MediaSelectionEvent to handle.
 */
function handleMediaSelection(event) {
    // handle event logic here
    const {images, videos, invalids} = event.detail;
    console.log(images, videos, invalids);
    const mediaList = document.getElementById('mediaPreview');
    images.forEach(image => {
        const mediaItem = document.importNode(
            document.getElementById('imageListItemTpl').content,
            true
        );

        mediaItem.querySelector('.media-list__media').replaceWith(image);
        mediaList.appendChild(mediaItem);
    });

    videos.forEach(video => {
        const mediaItem = document.importNode(
            document.getElementById('videoListItemTpl').content,
            true
        );

        mediaItem.querySelector('.media-list__media').replaceWith(video);
        mediaList.appendChild(mediaItem);
    });
}

$(function onDOMReady() {
    initDropArea();
    document.addEventListener('mediaSelection', handleMediaSelection);
});

