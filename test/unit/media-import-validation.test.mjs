// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    MEDIA_SIGNATURE_BYTES,
    classifyImportCandidate,
    hasCompleteIsoBmffTopLevelBoxes,
} from '../../src/js/media-import-validation.mjs';
import {
    mediaFixturesDir,
    mediaFixtures,
    rejectedMediaFixturePrefix,
} from '../support/media-fixtures.mjs';

/**
 * @param {string} filePath
 * @returns {Uint8Array}
 */
function readHeader(filePath) {
    return fs.readFileSync(filePath).subarray(0, MEDIA_SIGNATURE_BYTES);
}

/**
 * @param {string} filePath
 * @returns {File}
 */
function readFixtureFile(filePath) {
    return new File([fs.readFileSync(filePath)], path.basename(filePath));
}

/**
 * @returns {string[]}
 */
function negativeFixturePaths() {
    return fs.readdirSync(mediaFixturesDir)
        .filter(fileName => fileName.startsWith(rejectedMediaFixturePrefix))
        .map(fileName => path.join(mediaFixturesDir, fileName))
        .sort();
}

test('supported fixture headers classify into importable media kinds', () => {
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.mp4), readHeader(mediaFixtures.mp4)), {
        detected: 'isVideo',
        mimeType: 'video/mp4',
        probe: 'timeline',
    });
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.webm), readHeader(mediaFixtures.webm)), {
        detected: 'isVideo',
        mimeType: 'video/webm',
        probe: 'timeline',
    });
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.mp3), readHeader(mediaFixtures.mp3)), {
        detected: 'isAudio',
        mimeType: 'audio/mpeg',
        probe: 'timeline',
    });
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.smallPng), readHeader(mediaFixtures.smallPng)), {
        detected: 'isImage',
        mimeType: 'image/png',
        probe: 'image',
    });
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.avif), readHeader(mediaFixtures.avif)), {
        detected: 'isImage',
        mimeType: 'image/avif',
        probe: 'image',
    });
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.bmp), readHeader(mediaFixtures.bmp)), {
        detected: 'isImage',
        mimeType: 'image/bmp',
        probe: 'image',
    });
    assert.deepEqual(classifyImportCandidate(path.basename(mediaFixtures.svg), readHeader(mediaFixtures.svg)), {
        detected: 'isImage',
        mimeType: 'image/svg+xml',
        probe: 'image',
    });
});

test('negative fixture headers are rejected by static policy unless deeper probing is required', () => {
    const staticRejectedFixtures = negativeFixturePaths()
        .filter(filePath => path.basename(filePath) !== 'reject-video-mp4-corrupt-truncated.mp4');

    for (const filePath of staticRejectedFixtures) {
        assert.equal(
            classifyImportCandidate(path.basename(filePath), readHeader(filePath)),
            null,
            path.basename(filePath)
        );
    }
});

test('mp4 container check rejects truncated files that still have a valid signature', async () => {
    const corruptMp4 = path.join(mediaFixturesDir, 'reject-video-mp4-corrupt-truncated.mp4');

    assert.equal(classifyImportCandidate(path.basename(corruptMp4), readHeader(corruptMp4))?.detected, 'isVideo');
    assert.equal(await hasCompleteIsoBmffTopLevelBoxes(readFixtureFile(corruptMp4)), false);
    assert.equal(await hasCompleteIsoBmffTopLevelBoxes(readFixtureFile(mediaFixtures.mp4)), true);
});
