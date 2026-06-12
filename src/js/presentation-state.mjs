// @ts-check
/**
 * Pure playlist and presenter command helpers.
 */

/**
 * @typedef {'isImage' | 'isVideo' | 'isAudio'} DetectedMediaType
 */

/**
 * Minimal shape shared with file-manager FileItem.
 * @typedef {Object} PresentationFileItem
 * @property {string} blobURL
 * @property {DetectedMediaType} detected
 */

/**
 * 'blank' means "show nothing": the presenter clears its stage entirely.
 * @typedef {'image' | 'video' | 'audio' | 'blank'} PresenterMediaType
 */

/**
 * @typedef {Object} UpdateMediaPayload
 * @property {string} mediaUrl Empty string when mediaType is 'blank'.
 * @property {PresenterMediaType} mediaType
 */

/**
 * Preserve current moveFile behavior: swap one step and wrap at both ends.
 * @template T
 * @param {readonly T[]} items
 * @param {number} index
 * @param {number} delta
 * @returns {T[]}
 */
export function moveItemSwapWrap(items, index, delta) {
    const nextItems = [...items];
    const count = nextItems.length;
    if (count === 0 || index < 0 || index >= count) {
        return nextItems;
    }

    const nextIndex = (index + delta + count) % count;
    if (nextIndex !== index) {
        [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
    }
    return nextItems;
}

/**
 * Keep the same object selected across reorder/delete-before. If the object is
 * gone, clamp to the nearest valid index from its previous position.
 * @template T
 * @param {readonly T[]} items
 * @param {T | null} currentItem
 * @param {number} previousIndex
 * @returns {T | null}
 */
export function resolveCurrentItem(items, currentItem, previousIndex) {
    if (items.length === 0) {
        return null;
    }

    if (currentItem && items.indexOf(currentItem) !== -1) {
        return currentItem;
    }

    const clampedIndex = Math.min(Math.max(previousIndex, 0), items.length - 1);
    return items[clampedIndex] ?? null;
}

/**
 * Move the current item by delta without wrapping.
 * @template T
 * @param {readonly T[]} items
 * @param {T | null} currentItem
 * @param {number} delta
 * @returns {T | null}
 */
export function stepCurrentItem(items, currentItem, delta) {
    if (items.length === 0) {
        return null;
    }

    const currentIndex = currentItem ? items.indexOf(currentItem) : -1;
    const safeIndex = currentIndex === -1 ? 0 : currentIndex;
    const nextIndex = Math.min(Math.max(safeIndex + delta, 0), items.length - 1);
    return items[nextIndex] ?? null;
}

/**
 * Select the playlist item at index. Out-of-range indices return null.
 * @template T
 * @param {readonly T[]} items
 * @param {number} index
 * @returns {T | null}
 */
export function itemAtIndex(items, index) {
    if (index < 0 || index >= items.length) {
        return null;
    }
    return items[index] ?? null;
}

/**
 * @param {DetectedMediaType} detected
 * @returns {PresenterMediaType}
 */
export function toPresenterMediaType(detected) {
    if (detected === 'isVideo') return 'video';
    if (detected === 'isAudio') return 'audio';
    return 'image';
}

/**
 * @param {PresentationFileItem} item
 * @returns {UpdateMediaPayload}
 */
export function toUpdateMediaPayload(item) {
    return {
        mediaUrl: item.blobURL,
        mediaType: toPresenterMediaType(item.detected),
    };
}

/**
 * Blank goes through the same stateful update_media channel so a presenter
 * that (re)connects replays "blank" instead of resurrecting older media.
 * @returns {UpdateMediaPayload}
 */
export function toBlankMediaPayload() {
    return {
        mediaUrl: '',
        mediaType: 'blank',
    };
}
