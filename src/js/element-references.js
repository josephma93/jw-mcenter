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
 * @property {!HTMLTemplateElement} image
 * @property {!HTMLOListElement} mediaPreview
 */

/**
 * @returns {TemplateElementReferences} References for drop area
 */
export function getReferencesToMediaPreview() {
    return {
        image: /** @type {HTMLTemplateElement} */ (document.getElementById('imageListItemTpl')),
        video: /** @type {HTMLTemplateElement} */ (document.getElementById('videoListItemTpl')),
        mediaPreview: /** @type {HTMLOListElement} */ (document.getElementById('mediaPreview')),
    };
}
