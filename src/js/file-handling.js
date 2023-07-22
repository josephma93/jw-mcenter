import {Subject, from, mergeMap, map, of} from "rxjs";

/**
 * @type {Subject<File>}
 */
const fileSelectedBSubject = new Subject();

/**
 * Emits the files selected one at the time
 * @type {Observable<File>}
 */
const $fileSelected = fileSelectedBSubject.asObservable();

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
 * Takes a File and returns an image element.
 * @param {File} file - The file to be displayed.
 * @returns {Promise<HTMLImageElement|File>}
 */
function createImageElementFromFile(file) {
    return new Promise(function executor(resolve) {

        const imageNode = document.createElement('img');
        const imageUrl = URL.createObjectURL(file);

        imageNode.onload = function imageLoadHandler() {
            resolve(imageNode);
        };

        imageNode.onerror = function imageErrorHandler() {
            URL.revokeObjectURL(imageUrl);
            resolve(file);
        };

        imageNode.src = imageUrl;
    });
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
 * Checks if a File object of type video is supported by the browser and can be played using a video element.
 * The function checks both the MIME type and the codec compatibility.
 * @param {File} file - The file to be played.
 * @returns {Promise<HTMLVideoElement|File>}
 */
function createVideoElementFromFile(file) {
    return new Promise(function executor(resolve) {
        const video = document.createElement('video');
        const canPlay = video.canPlayType(file.type);

        if (!canPlay) {
            resolve(file);
            return;
        }

        video.onloadedmetadata = function onLoadedMetadataHandler() {
            resolve(video);
        };

        video.onerror = function onErrorHandler() {
            URL.revokeObjectURL(video.src);
            resolve(file);
        };

        video.src = URL.createObjectURL(file);
    });
}

/**
 * Media selection results.
 * @typedef {Object} SelectionResultObj
 * @property {number} id A random unique identifier.
 * @property {File} file The file that was selected by the user.
 * @property {number} typeCode A type identifier. 0 means a not supported file, 1 is an image, 2 is a video.
 * @property {HTMLImageElement | HTMLVideoElement} mediaElement HTML image or video.
 */

/**
 * @type {Observable<SelectionResultObj>}
 */
export const $selectionResultObjs = $fileSelected
    .pipe(
        map(file => {
            const typeCode = isPotentialImageFile(file) ? 1 : isPotentialVideoFile(file) ? 2 : 0;
            return { typeCode, file };
        }),
        mergeMap(({typeCode, file}) => {
            let result = {
                id: Math.random(),
                file,
                typeCode,
                mediaElement: null,
            };
            if (typeCode === 0) {
                return of(result);
            }

            return from(typeCode === 1 ? createImageElementFromFile(file) : createVideoElementFromFile(file))
                .pipe(
                    map(mediaOrFile => {
                        result.mediaElement = mediaOrFile instanceof File ? null : mediaOrFile;
                        return result;
                    }),
                );
        })
    );

/**
 * Processes the files selected by the user checking that are supported and turning them into HTML elements that
 * can later be attached to the DOM.
 * @param {FileList} files The files to process
 */
export function handleNewFilesSelected(files) {
    for (const file of files) {
        fileSelectedBSubject.next(file);
    }
}
