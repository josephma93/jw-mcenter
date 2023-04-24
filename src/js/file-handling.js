import {getReferencesForDropArea} from "./element-references.js";

let {filesInput} = getReferencesForDropArea();

/**
 * Checks if the selected file is an image file.
 *
 * @param {File} file - The selected file to check.
 * @returns {boolean} - True if the selected file is an image file, false otherwise.
 */
function isPotentialImageFile(file) {
    return file.type.includes("image");
}


/**
 * Checks if a selected file from an input file element is a video file
 * @param {File} file - The selected file to check
 * @returns {boolean} - Whether the file is a video file
 */
function isPotentialVideoFile(file) {
    return file.type.includes("video");
}

/**
 * Takes a File and returns an image element.
 * @param {File} file - The file to be displayed.
 * @returns {Promise<HTMLImageElement>|Promise<File>} - A promise that when resolves to an image element if the image is
 * supported otherwise a rejected promise with the unsupported file.
 */
function createImageElementFromFile(file) {
    return new Promise(function executor(resolve, reject) {

        const imageNode = document.createElement('img');
        const imageUrl = URL.createObjectURL(file);

        imageNode.onload = function imageLoadHandler() {
            resolve(imageNode);
        };

        imageNode.onerror = function imageErrorHandler() {
            URL.revokeObjectURL(imageUrl);
            reject(file);
        };

        imageNode.src = imageUrl;

    });
}

/**
 * Checks if a File object of type video is supported by the browser and can be played using a video element.
 * The function checks both the MIME type and the codec compatibility.
 * @param {File} file - The file to be played.
 * @returns {Promise<HTMLVideoElement>|Promise<File>} - A Promise that resolves to the HTMLMediaElement if the video is supported.
 * If the video is not supported, the Promise is rejected with the unsupported File object.
 */
function createVideoElementFromFile(file) {
    return new Promise(function executor(resolve, reject) {
        const video = document.createElement('video');
        const canPlay = video.canPlayType(file.type);

        if (!canPlay) {
            reject(file);
            return;
        }

        video.onloadedmetadata = function onLoadedMetadataHandler() {
            resolve(video);
        };

        video.onerror = function onErrorHandler() {
            URL.revokeObjectURL(video.src);
            reject(file);
        };

        video.src = URL.createObjectURL(file);
    });
}

export async function handleNewFilesSelected() {
    const {files: fls} = filesInput;
    /** @type {File[]} */
    const files = Array.from(fls);

    let images = [],
        videos = [],
        invalids = [];

    const results = await Promise.allSettled(files.map(function fileToHTMLNodes(file) {
        let result;

        if (isPotentialImageFile(file)) {
            result = createImageElementFromFile(file);
        } else if (isPotentialVideoFile(file)) {
            result = createVideoElementFromFile(file);
        } else {
            result = Promise.reject(file);
        }

        return result;
    }));

    results.forEach(function forEachFileProcessingResult(promiseResult) {
       if (promiseResult.status === 'rejected') {
           invalids.push(promiseResult.value);
           return;
       }

       const element = promiseResult.value;
       if (element instanceof HTMLImageElement) {
           images.push(element);
       } else {
           videos.push(element);
       }
    });

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
