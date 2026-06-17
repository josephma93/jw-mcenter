// @ts-check
/**
 * Configuration modal behavior.
 *
 * Owns the "Configuración" dialog opened from the header. Its first (and so far
 * only) setting is an optional blank-screen image: when one is set the
 * presenter shows it everywhere it would otherwise go blank. The image is
 * deflated with pako and persisted in IndexedDB, so it survives reloads until
 * the operator removes it.
 */
import $ from 'jquery';
import { BehaviorSubject, fromEvent } from 'rxjs';
import { IS_IMAGE, detectImportableMediaType } from './media-import-validation.mjs';
import { packBlankImage, unpackBlankImage } from './blank-image-codec.mjs';
import { clearBlankImage, getBlankImage, setBlankImage } from './config-store.mjs';

/**
 * The active blank-screen image as the rest of the app consumes it: a same
 * origin object URL the presenter can render, plus its MIME type. null means no
 * blank image is configured and the presenter should show nothing.
 * @typedef {Object} BlankImage
 * @property {string} url
 * @property {string} mime
 */

/**
 * The blank image is a static backdrop, not a media file, so it has no business
 * being huge. Capping the size keeps the synchronous read+deflate from freezing
 * the control panel mid-meeting and sidesteps storage-quota failures.
 */
const MAX_BLANK_IMAGE_BYTES = 10 * 1024 * 1024;

/** @type {JQuery<HTMLElement>} */ let $selectBlankImageBtn;
/** @type {JQuery<HTMLInputElement>} */ let $blankImageInput;
/** @type {JQuery<HTMLImageElement>} */ let $blankImagePreview;
/** @type {JQuery<HTMLElement>} */ let $removeBlankImageBtn;
/** @type {JQuery<HTMLElement>} */ let $blankImageError;
/** @type {HTMLDialogElement} */ let configDialog;

/** @type {BehaviorSubject<BlankImage | null>} */
const blankImage$ = new BehaviorSubject(/** @type {BlankImage | null} */ (null));

/**
 * @param {string} id
 * @returns {HTMLDialogElement}
 */
function getDialogElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLDialogElement)) {
        throw new Error(`Expected #${id} to be a dialog element.`);
    }
    return element;
}

/**
 * Replace the active blank image, revoking the previous object URL so the
 * session does not leak blobs as the operator swaps images.
 * @param {BlankImage | null} next
 */
function setActiveBlankImage(next) {
    const previous = blankImage$.getValue();
    if (previous) {
        URL.revokeObjectURL(previous.url);
    }
    blankImage$.next(next);
    renderPreview(next);
}

/**
 * @param {BlankImage | null} image
 */
function renderPreview(image) {
    if (image) {
        $blankImagePreview.attr('src', image.url).show();
        $removeBlankImageBtn.prop('disabled', false);
    } else {
        $blankImagePreview.removeAttr('src').hide();
        $removeBlankImageBtn.prop('disabled', true);
    }
}

/**
 * Disable the action buttons while an async save/remove is in flight so a slow
 * compression or storage write can't be triggered twice or interrupted.
 * @param {boolean} busy
 */
function setControlsBusy(busy) {
    $selectBlankImageBtn.prop('disabled', busy);
    $removeBlankImageBtn.prop('disabled', busy || !blankImage$.getValue());
}

/**
 * @param {string} message
 */
function showError(message) {
    $blankImageError.text(message).show();
}

function clearError() {
    $blankImageError.text('').hide();
}

/**
 * @param {import('./blank-image-codec.mjs').StoredBlankImage} stored
 * @returns {BlankImage}
 */
function toBlankImage(stored) {
    const { mime, bytes } = unpackBlankImage(stored);
    const blob = new Blob([/** @type {BlobPart} */ (bytes)], { type: mime });
    return { url: URL.createObjectURL(blob), mime };
}

/**
 * @param {File} file
 */
async function handleSelectedFile(file) {
    clearError();
    if (file.size > MAX_BLANK_IMAGE_BYTES) {
        showError('La imagen supera el límite de 10 MB.');
        return;
    }

    setControlsBusy(true);
    try {
        const detected = await detectImportableMediaType(file);
        if (detected !== IS_IMAGE) {
            showError('Selecciona un archivo de imagen válido.');
            return;
        }

        const bytes = new Uint8Array(await file.arrayBuffer());
        const stored = packBlankImage(file.type, bytes);
        await setBlankImage(stored);
        setActiveBlankImage(toBlankImage(stored));
    } catch {
        showError('No se pudo guardar la imagen en este dispositivo.');
    } finally {
        setControlsBusy(false);
    }
}

async function handleRemove() {
    clearError();
    setControlsBusy(true);
    try {
        await clearBlankImage();
        setActiveBlankImage(null);
    } catch {
        showError('No se pudo quitar la imagen.');
    } finally {
        setControlsBusy(false);
    }
}

async function initialize() {
    const $configBtn = $('#configBtn');
    $selectBlankImageBtn = $('#selectBlankImageBtn');
    $blankImageInput = /** @type {JQuery<HTMLInputElement>} */ ($('#blankImageInput'));
    $blankImagePreview = /** @type {JQuery<HTMLImageElement>} */ ($('#blankImagePreview'));
    $removeBlankImageBtn = $('#removeBlankImageBtn');
    $blankImageError = $('#blankImageError');
    configDialog = getDialogElement('configDialog');

    fromEvent(/** @type {HTMLElement} */ ($configBtn.get(0)), 'click')
        .subscribe(() => {
            clearError();
            if (!configDialog.open) {
                configDialog.showModal();
            }
        });

    // A real button (not a <label for>) keeps the picker reachable by keyboard
    // even though the file input itself is visually hidden.
    fromEvent(/** @type {HTMLElement} */ ($selectBlankImageBtn.get(0)), 'click')
        .subscribe(() => $blankImageInput.get(0)?.click());

    fromEvent(/** @type {HTMLElement} */ ($blankImageInput.get(0)), 'change')
        .subscribe(event => {
            const input = /** @type {HTMLInputElement} */ (event.target);
            const file = input.files && input.files[0];
            input.value = '';
            if (file) {
                void handleSelectedFile(file);
            }
        });

    fromEvent(/** @type {HTMLElement} */ ($removeBlankImageBtn.get(0)), 'click')
        .subscribe(() => void handleRemove());

    // A storage failure must not block the rest of the app from starting; the
    // presenter simply falls back to a true blank screen.
    try {
        const stored = await getBlankImage();
        setActiveBlankImage(stored ? toBlankImage(stored) : null);
    } catch {
        setActiveBlankImage(null);
    }
}

export default {
    blankImage$,
    initialize,
};
