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
 * @property {() => boolean} [isPlayable]
 */

/**
 * 'blank' means "show nothing": the presenter clears its stage entirely.
 * @typedef {'image' | 'video' | 'audio' | 'blank'} PresenterMediaType
 */

/** @type {ReadonlySet<DetectedMediaType>} */
const PLAYABLE_DETECTED_TYPES = new Set(['isVideo', 'isAudio']);

/**
 * @typedef {Object} UpdateMediaPayload
 * @property {string} mediaUrl Empty string when mediaType is 'blank'.
 * @property {PresenterMediaType} mediaType
 */

/**
 * @typedef {Object} PlaybackStateReport
 * @property {unknown} [mediaUrl]
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
 * Find a selected item by object identity. Current selection deliberately uses
 * object refs because reorder/delete behavior depends on preserving the item
 * object across playlist mutations.
 * @template T
 * @param {readonly T[]} items
 * @param {T | null} currentItem
 * @returns {number}
 */
export function currentItemIndex(items, currentItem) {
    return currentItem ? items.indexOf(currentItem) : -1;
}

/**
 * @param {PresentationFileItem | null} item
 * @returns {boolean}
 */
export function isTimeBasedMediaItem(item) {
    if (!item) {
        return false;
    }
    return item.isPlayable?.() ?? PLAYABLE_DETECTED_TYPES.has(item.detected);
}

/**
 * Ignore stale presenter reports from media that is no longer current.
 * @param {boolean} presenterAlive
 * @param {PresentationFileItem | null} currentItem
 * @param {PlaybackStateReport} payload
 * @returns {boolean}
 */
export function isPlaybackReportForCurrentItem(presenterAlive, currentItem, payload) {
    return presenterAlive && currentItem !== null && payload.mediaUrl === currentItem.blobURL;
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
 *
 * When a blank-screen image is configured it is shown wherever the presenter
 * would otherwise be empty: the "blank" state becomes a plain image rendered
 * from the configured object URL. An empty/missing URL falls back to a truly
 * blank stage.
 * @param {string | null} [blankImageUrl]
 * @returns {UpdateMediaPayload}
 */
export function toBlankMediaPayload(blankImageUrl) {
    if (blankImageUrl) {
        return {
            mediaUrl: blankImageUrl,
            mediaType: 'image',
        };
    }
    return {
        mediaUrl: '',
        mediaType: 'blank',
    };
}
