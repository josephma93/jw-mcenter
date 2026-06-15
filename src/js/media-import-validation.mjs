// @ts-check

/**
 * @typedef {'isImage' | 'isVideo' | 'isAudio'} DetectedMediaType
 */

/**
 * @typedef {'image' | 'timeline'} MediaProbeKind
 */

/**
 * @typedef {Object} ImportCandidate
 * @property {DetectedMediaType} detected
 * @property {string} mimeType
 * @property {MediaProbeKind} probe
 */

export const IS_IMAGE = 'isImage';
export const IS_VIDEO = 'isVideo';
export const IS_AUDIO = 'isAudio';

export const MEDIA_SIGNATURE_BYTES = 4096;

const MEDIA_PROBE_TIMEOUT_MS = 3000;

const ASCII_FTYP = 'ftyp';
const ASCII_RIFF = 'RIFF';
const ASCII_WEBP = 'WEBP';
const ASCII_WEBM = 'webm';
const ASCII_AVIF = 'avif';
const ASCII_AVIS = 'avis';

/** @type {Record<string, ImportCandidate & { extensions: readonly string[] }>} */
const SUPPORTED_MEDIA = {
    'image/jpeg': { detected: IS_IMAGE, mimeType: 'image/jpeg', probe: 'image', extensions: ['jpg', 'jpeg'] },
    'image/png': { detected: IS_IMAGE, mimeType: 'image/png', probe: 'image', extensions: ['png'] },
    'image/gif': { detected: IS_IMAGE, mimeType: 'image/gif', probe: 'image', extensions: ['gif'] },
    'image/webp': { detected: IS_IMAGE, mimeType: 'image/webp', probe: 'image', extensions: ['webp'] },
    'image/avif': { detected: IS_IMAGE, mimeType: 'image/avif', probe: 'image', extensions: ['avif'] },
    'image/bmp': { detected: IS_IMAGE, mimeType: 'image/bmp', probe: 'image', extensions: ['bmp'] },
    'image/svg+xml': { detected: IS_IMAGE, mimeType: 'image/svg+xml', probe: 'image', extensions: ['svg'] },
    'video/mp4': { detected: IS_VIDEO, mimeType: 'video/mp4', probe: 'timeline', extensions: ['mp4'] },
    'video/webm': { detected: IS_VIDEO, mimeType: 'video/webm', probe: 'timeline', extensions: ['webm'] },
    'audio/mpeg': { detected: IS_AUDIO, mimeType: 'audio/mpeg', probe: 'timeline', extensions: ['mp3'] },
};

/**
 * @param {string} fileName
 * @returns {string}
 */
export function fileExtension(fileName) {
    const extensionStart = fileName.lastIndexOf('.');
    if (extensionStart === -1 || extensionStart === fileName.length - 1) {
        return '';
    }
    return fileName.slice(extensionStart + 1).toLowerCase();
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {string} text
 * @returns {boolean}
 */
function matchesAscii(bytes, start, text) {
    if (start + text.length > bytes.length) {
        return false;
    }
    for (let index = 0; index < text.length; index += 1) {
        if (bytes[start + index] !== text.charCodeAt(index)) {
            return false;
        }
    }
    return true;
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} length
 * @returns {string}
 */
function readAscii(bytes, start, length) {
    let text = '';
    const end = Math.min(start + length, bytes.length);
    for (let index = start; index < end; index += 1) {
        text += String.fromCharCode(bytes[index]);
    }
    return text;
}

/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @returns {number}
 */
function readUInt32BE(bytes, start) {
    if (start + 4 > bytes.length) {
        return Number.NaN;
    }
    return (
        bytes[start] * 0x1000000
        + bytes[start + 1] * 0x10000
        + bytes[start + 2] * 0x100
        + bytes[start + 3]
    );
}

/**
 * @param {Uint8Array} bytes
 * @returns {boolean}
 */
function isSvg(bytes) {
    const text = new TextDecoder('utf-8')
        .decode(bytes)
        .trimStart()
        .toLowerCase();

    return text.startsWith('<svg') || (
        text.startsWith('<?xml')
        && text.includes('<svg')
        && text.indexOf('<svg') < 512
    );
}

/**
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function sniffSupportedMediaMimeType(bytes) {
    if (
        bytes.length >= 3
        && bytes[0] === 0xff
        && bytes[1] === 0xd8
        && bytes[2] === 0xff
    ) {
        return 'image/jpeg';
    }

    if (
        bytes.length >= 8
        && bytes[0] === 0x89
        && matchesAscii(bytes, 1, 'PNG')
        && bytes[4] === 0x0d
        && bytes[5] === 0x0a
        && bytes[6] === 0x1a
        && bytes[7] === 0x0a
    ) {
        return 'image/png';
    }

    if (matchesAscii(bytes, 0, 'GIF87a') || matchesAscii(bytes, 0, 'GIF89a')) {
        return 'image/gif';
    }

    if (matchesAscii(bytes, 0, ASCII_RIFF) && matchesAscii(bytes, 8, ASCII_WEBP)) {
        return 'image/webp';
    }

    if (matchesAscii(bytes, 4, ASCII_FTYP)) {
        const brands = readAscii(bytes, 8, Math.min(bytes.length - 8, 64));
        if (brands.includes(ASCII_AVIF) || brands.includes(ASCII_AVIS)) {
            return 'image/avif';
        }
    }

    if (bytes.length >= 2 && bytes[0] === 0x42 && bytes[1] === 0x4d) {
        return 'image/bmp';
    }

    if (isSvg(bytes)) {
        return 'image/svg+xml';
    }

    if (matchesAscii(bytes, 4, ASCII_FTYP)) {
        return 'video/mp4';
    }

    if (
        bytes.length >= 4
        && bytes[0] === 0x1a
        && bytes[1] === 0x45
        && bytes[2] === 0xdf
        && bytes[3] === 0xa3
        && readAscii(bytes, 0, Math.min(bytes.length, 256)).includes(ASCII_WEBM)
    ) {
        return 'video/webm';
    }

    if (matchesAscii(bytes, 0, 'ID3')) {
        return 'audio/mpeg';
    }

    if (
        bytes.length >= 2
        && bytes[0] === 0xff
        && (bytes[1] & 0xe0) === 0xe0
    ) {
        return 'audio/mpeg';
    }

    return '';
}

/**
 * @param {string} fileName
 * @param {Uint8Array} headerBytes
 * @returns {ImportCandidate | null}
 */
export function classifyImportCandidate(fileName, headerBytes) {
    const sniffedMimeType = sniffSupportedMediaMimeType(headerBytes);
    const candidate = SUPPORTED_MEDIA[sniffedMimeType];
    if (!candidate) {
        return null;
    }

    if (!candidate.extensions.includes(fileExtension(fileName))) {
        return null;
    }

    return {
        detected: candidate.detected,
        mimeType: candidate.mimeType,
        probe: candidate.probe,
    };
}

/**
 * @param {File} file
 * @returns {Promise<Uint8Array>}
 */
async function readFileHeader(file) {
    return new Uint8Array(await file.slice(0, MEDIA_SIGNATURE_BYTES).arrayBuffer());
}

/**
 * @param {File} file
 * @returns {Promise<boolean>}
 */
export async function hasCompleteIsoBmffTopLevelBoxes(file) {
    let offset = 0;
    let sawFtyp = false;

    while (offset < file.size) {
        const remainingBytes = file.size - offset;
        if (remainingBytes < 8) {
            return false;
        }

        const headerBytes = new Uint8Array(await file.slice(offset, offset + 16).arrayBuffer());
        const boxSize32 = readUInt32BE(headerBytes, 0);
        const boxType = readAscii(headerBytes, 4, 4);
        let boxSize = boxSize32;
        let headerSize = 8;

        if (offset === 0 && boxType !== ASCII_FTYP) {
            return false;
        }

        if (boxType === ASCII_FTYP) {
            sawFtyp = true;
        }

        if (boxSize32 === 1) {
            if (headerBytes.length < 16) {
                return false;
            }
            const high = readUInt32BE(headerBytes, 8);
            const low = readUInt32BE(headerBytes, 12);
            if (high > 0x1fffff) {
                return false;
            }
            boxSize = high * 0x100000000 + low;
            headerSize = 16;
        } else if (boxSize32 === 0) {
            return sawFtyp;
        }

        if (boxSize < headerSize || offset + boxSize > file.size) {
            return false;
        }

        offset += boxSize;
    }

    return sawFtyp && offset === file.size;
}

/**
 * @param {File} file
 * @returns {Promise<boolean>}
 */
function canDecodeImage(file) {
    return new Promise(resolve => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);
        let settled = false;

        const settle = (/** @type {boolean} */ ok) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);
            image.onload = null;
            image.onerror = null;
            URL.revokeObjectURL(objectUrl);
            resolve(ok);
        };

        const timeoutId = setTimeout(() => settle(false), MEDIA_PROBE_TIMEOUT_MS);
        image.onload = () => settle(image.naturalWidth > 0 && image.naturalHeight > 0);
        image.onerror = () => settle(false);
        image.src = objectUrl;
    });
}

/**
 * @param {string} mimeType
 * @param {DetectedMediaType} detected
 * @returns {boolean}
 */
function browserCanPlayTimelineMime(mimeType, detected) {
    const element = document.createElement(detected === IS_VIDEO ? 'video' : 'audio');
    return typeof element.canPlayType === 'function' && element.canPlayType(mimeType) !== '';
}

/**
 * @param {File} file
 * @param {DetectedMediaType} detected
 * @returns {Promise<boolean>}
 */
function canLoadTimelineMetadata(file, detected) {
    return new Promise(resolve => {
        const element = document.createElement(detected === IS_VIDEO ? 'video' : 'audio');
        const objectUrl = URL.createObjectURL(file);
        let settled = false;

        const settle = (/** @type {boolean} */ ok) => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timeoutId);
            element.removeAttribute('src');
            element.load();
            URL.revokeObjectURL(objectUrl);
            resolve(ok);
        };

        const timeoutId = setTimeout(() => settle(false), MEDIA_PROBE_TIMEOUT_MS);
        element.preload = 'metadata';
        element.muted = true;
        element.onloadedmetadata = () => settle(Number.isFinite(element.duration) && element.duration > 0);
        element.onerror = () => settle(false);
        element.src = objectUrl;
        element.load();
    });
}

/**
 * @param {File} file
 * @returns {Promise<DetectedMediaType | ''>} Empty string when unsupported.
 */
export async function detectImportableMediaType(file) {
    const headerBytes = await readFileHeader(file);
    const candidate = classifyImportCandidate(file.name, headerBytes);
    if (!candidate) {
        return '';
    }

    if (candidate.mimeType === 'video/mp4' && !await hasCompleteIsoBmffTopLevelBoxes(file)) {
        return '';
    }

    if (candidate.probe === 'image') {
        return await canDecodeImage(file) ? candidate.detected : '';
    }

    if (!browserCanPlayTimelineMime(candidate.mimeType, candidate.detected)) {
        return '';
    }

    return await canLoadTimelineMetadata(file, candidate.detected) ? candidate.detected : '';
}
