// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    itemAtIndex,
    moveItemSwapWrap,
    resolveCurrentItem,
    stepCurrentItem,
    toBlankMediaPayload,
    toPresenterMediaType,
    toUpdateMediaPayload,
} from '../../src/js/presentation-state.mjs';

/**
 * @param {string} name
 * @param {import('../../src/js/presentation-state.mjs').DetectedMediaType} [detected]
 */
function item(name, detected = 'isImage') {
    return {
        name,
        blobURL: `blob:${name}`,
        detected,
    };
}

test('current item survives reorder by object reference', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const gamma = item('gamma');
    const reordered = [gamma, alpha, beta];

    assert.equal(resolveCurrentItem(reordered, beta, 1), beta);
    assert.equal(reordered.indexOf(beta), 2);
});

test('current item survives delete-before by object reference', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const gamma = item('gamma');
    const afterDeleteBefore = [beta, gamma];

    assert.equal(resolveCurrentItem(afterDeleteBefore, beta, 1), beta);
    assert.equal(afterDeleteBefore.indexOf(beta), 0);
});

test('deleted current item clamps to item now at previous index', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const gamma = item('gamma');
    const afterDeleteCurrent = [alpha, gamma];

    assert.equal(resolveCurrentItem(afterDeleteCurrent, beta, 1), gamma);
});

test('deleted last current item clamps to new last item', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const gamma = item('gamma');
    const afterDeleteCurrent = [alpha, beta];

    assert.equal(resolveCurrentItem(afterDeleteCurrent, gamma, 2), beta);
});

test('item at index returns the playlist entry or null when out of range', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const items = [alpha, beta];

    assert.equal(itemAtIndex(items, 0), alpha);
    assert.equal(itemAtIndex(items, 1), beta);
    assert.equal(itemAtIndex(items, -1), null);
    assert.equal(itemAtIndex(items, 2), null);
    assert.equal(itemAtIndex([], 0), null);
});

test('prev and next navigation clamps instead of wrapping', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const gamma = item('gamma');
    const items = [alpha, beta, gamma];

    assert.equal(stepCurrentItem(items, alpha, -1), alpha);
    assert.equal(stepCurrentItem(items, alpha, 1), beta);
    assert.equal(stepCurrentItem(items, gamma, 1), gamma);
    assert.equal(stepCurrentItem(items, null, 1), beta);
});

test('detected media type maps to presenter media type', () => {
    assert.equal(toPresenterMediaType('isImage'), 'image');
    assert.equal(toPresenterMediaType('isVideo'), 'video');
    assert.equal(toPresenterMediaType('isAudio'), 'audio');
});

test('update media payload uses blob URL and mapped presenter type', () => {
    assert.deepEqual(toUpdateMediaPayload(item('clip', 'isVideo')), {
        mediaUrl: 'blob:clip',
        mediaType: 'video',
    });
});

test('blank payload travels on the update_media shape with no URL', () => {
    assert.deepEqual(toBlankMediaPayload(), {
        mediaUrl: '',
        mediaType: 'blank',
    });
});

test('move item preserves wraparound swap semantics', () => {
    const alpha = item('alpha');
    const beta = item('beta');
    const gamma = item('gamma');

    assert.deepEqual(moveItemSwapWrap([alpha, beta, gamma], 0, -1), [gamma, beta, alpha]);
    assert.deepEqual(moveItemSwapWrap([alpha, beta, gamma], 2, 1), [gamma, beta, alpha]);
    assert.deepEqual(moveItemSwapWrap([alpha, beta, gamma], 1, -1), [beta, alpha, gamma]);
    assert.deepEqual(moveItemSwapWrap([alpha, beta, gamma], 1, 1), [alpha, gamma, beta]);
});
