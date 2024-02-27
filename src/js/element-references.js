/**
 * @typedef DropAreaElementReferences
 * @type {object}
 * @property {!HTMLDivElement} filesDropArea
 * @property {!HTMLInputElement} filesInput
 */

/**
 * @returns {DropAreaElementReferences} References for drop area
 */
export function getReferencesForDropArea() {
    return {
        filesDropArea: /** @type {HTMLDivElement} */ (document.getElementById('filesDropArea')),
        filesInput: /** @type {HTMLInputElement} */ (document.getElementById('filesInput')),
    };
}

/**
 * @typedef TemplateElementReferences
 * @type {object}
 * @property {!HTMLTemplateElement} image
 * @property {!HTMLTemplateElement} video
 * @property {!HTMLTemplateElement} buttons
 * @property {!HTMLOListElement} mediaPreview
 * @property {!HTMLDivElement} warningToast
 */

/**
 * @returns {TemplateElementReferences} References for drop area
 */
export function getReferencesToMediaPreview() {
    return {
        image: /** @type {HTMLTemplateElement} */ (document.getElementById('imageListItemTpl')),
        video: /** @type {HTMLTemplateElement} */ (document.getElementById('videoListItemTpl')),
        buttons: /** @type {HTMLTemplateElement} */ (document.getElementById('mediaListItemButtons')),
        mediaPreview: /** @type {HTMLOListElement} */ (document.getElementById('mediaPreview')),
        warningToast: /** @type {HTMLDivElement} */ (document.getElementById('warningToast')),
    };
}

/**
 * @typedef MediaControlsElementReferences
 * @type {object}
 * @property {!HTMLButtonElement} moveToPreviousImageBtn
 * @property {!HTMLButtonElement} stopPresentingBtn
 * @property {!HTMLButtonElement} startPresentingBtn
 * @property {!HTMLButtonElement} moveToNextImageBtn
 */

/**
 * @returns {MediaControlsElementReferences} References for drop area
 */
export function getReferencesToMediaControlButtons() {
    return {
        moveToPreviousImageBtn:  /** @type {!HTMLButtonElement} */ document.getElementById('moveToPreviousImageBtn'),
        stopPresentingBtn:  /** @type {!HTMLButtonElement} */ document.getElementById('stopPresentingBtn'),
        startPresentingBtn:  /** @type {!HTMLButtonElement} */ document.getElementById('startPresentingBtn'),
        moveToNextImageBtn:  /** @type {!HTMLButtonElement} */ document.getElementById('moveToNextImageBtn'),
    };
}
