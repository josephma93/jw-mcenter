// @ts-check
/**
 * Pure (de)compression helpers for the persisted blank-screen image.
 *
 * The bytes of the chosen image are deflated with pako before they are written
 * to device storage and inflated back on the way out. These functions touch no
 * DOM and no IndexedDB, so they run unchanged under node:test.
 */
import { deflate, inflate } from 'pako';

/**
 * A blank-screen image as it lives in device storage: the deflated image bytes
 * plus the MIME type needed to rebuild a Blob the presenter can render.
 * @typedef {Object} StoredBlankImage
 * @property {string} mime
 * @property {Uint8Array} compressedBytes
 */

/**
 * Deflate raw image bytes for storage.
 * @param {Uint8Array} bytes
 * @returns {Uint8Array}
 */
export function compress(bytes) {
    return deflate(bytes);
}

/**
 * Inflate previously {@link compress}ed bytes back to the original image bytes.
 * @param {Uint8Array} compressedBytes
 * @returns {Uint8Array}
 */
export function decompress(compressedBytes) {
    return inflate(compressedBytes);
}

/**
 * Package raw image bytes + MIME type into the stored record shape.
 * @param {string} mime
 * @param {Uint8Array} bytes
 * @returns {StoredBlankImage}
 */
export function packBlankImage(mime, bytes) {
    return {
        mime,
        compressedBytes: compress(bytes),
    };
}

/**
 * Rebuild the original image bytes + MIME type from a stored record.
 * @param {StoredBlankImage} stored
 * @returns {{ mime: string, bytes: Uint8Array }}
 */
export function unpackBlankImage(stored) {
    return {
        mime: stored.mime,
        bytes: decompress(stored.compressedBytes),
    };
}
