import {getReferencesForDropArea} from "./element-references.js";

let {filesInput} = getReferencesForDropArea();

/**
 * Checks if the selected file is an image file.
 *
 * @param {File} file - The selected file to check.
 * @returns {boolean} - True if the selected file is an image file, false otherwise.
 */
function isImageFile(file) {
    const imageTypes = ['jpeg', 'png', 'gif', 'bmp'];
    const fileType = file.type.split('/')[1];
    return imageTypes.includes(fileType);
}


/**
 * Checks if a selected file from an input file element is a video file
 * @param {File} file - The selected file to check
 * @returns {boolean} - Whether the file is a video file
 */
function isVideoFile(file) {
    const videoTypes = ['mp4', 'webm', 'ogg'];
    const fileType = file.type.split('/')[1];
    return videoTypes.includes(fileType);
}

/**
 * Takes a File and returns an image element.
 * @param {File} file - The file to be displayed.
 * @returns {HTMLImageElement} - The image element.
 */
function createImageNodeFromFile(file) {
    const imageNode = document.createElement('img');
    const objectUrl = URL.createObjectURL(file);

    imageNode.onload = () => {
        URL.revokeObjectURL(objectUrl);
    };

    imageNode.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        imageNode.src = '';
    };

    imageNode.src = objectUrl;

    return imageNode;
}

/**
 * Takes a File and returns a muted video element.
 * @param {File} file - The file to be played.
 * @returns {HTMLVideoElement} - The video element.
 */
function createVideoElement(file) {
    const videoNode = document.createElement('video');
    videoNode.src = URL.createObjectURL(file);
    // videoNode.muted = true;
    // videoNode.controls = false;
    videoNode.preload = 'metadata';
    videoNode.onloadedmetadata = function () {
        URL.revokeObjectURL(videoNode.src);
    };
    return videoNode;
}


export function handleNewFilesSelected() {
    const {files: fls} = filesInput;
    const files = Array.from(fls);

    const {valid: {images, videos}, invalids} = files.reduce(
        function validateAndProcessDroppedMedia(processed, file) {

            if (isImageFile(file)) {
                processed.valid.images.push(createImageNodeFromFile(file));
            } else if (isVideoFile(file)) {
                processed.valid.videos.push(createVideoElement(file));
            } else {
                processed.invalids.push(file);
            }

            return processed;
        }
        , {
            valid: {images: [], videos: []},
            invalids: [],
        }
    );


    document.dispatchEvent(new CustomEvent('mediaSelection', {
        detail: {
            images,
            videos,
            invalids,
        }
    }));
}

/**
 * Returns an array with the video types supported by the browser.
 * @returns {string[]} The supported video types.
 */
export function getSupportedVideoTypes() {
    const video = document.createElement('video');
    if (!video) {
        return [];
    }
    return ['mp4', 'webm', 'ogg'].filter(type => {
        const canPlay = video.canPlayType(`video/${type}`);
        return canPlay === 'probably' || canPlay === 'maybe';
    });
}
