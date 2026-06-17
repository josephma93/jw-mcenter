// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    compress,
    decompress,
    packBlankImage,
    unpackBlankImage,
} from '../../src/js/blank-image-codec.mjs';

/**
 * @param {number} length
 * @returns {Uint8Array}
 */
function patternedBytes(length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        bytes[i] = (i * 31 + 7) % 256;
    }
    return bytes;
}

test('compress/decompress round-trips the original bytes', () => {
    const original = patternedBytes(4096);
    const restored = decompress(compress(original));
    assert.deepEqual(Array.from(restored), Array.from(original));
});

test('compression shrinks highly compressible data', () => {
    const zeros = new Uint8Array(8192);
    assert.ok(compress(zeros).length < zeros.length);
});

test('packBlankImage carries the MIME type and unpacks losslessly', () => {
    const original = patternedBytes(1024);
    const stored = packBlankImage('image/png', original);

    assert.equal(stored.mime, 'image/png');
    assert.ok(stored.compressedBytes instanceof Uint8Array);

    const { mime, bytes } = unpackBlankImage(stored);
    assert.equal(mime, 'image/png');
    assert.deepEqual(Array.from(bytes), Array.from(original));
});

test('empty input survives the round-trip', () => {
    const restored = decompress(compress(new Uint8Array(0)));
    assert.equal(restored.length, 0);
});
