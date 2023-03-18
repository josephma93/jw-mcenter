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
