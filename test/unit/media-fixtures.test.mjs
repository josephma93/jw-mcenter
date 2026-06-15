// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
    mediaFixturesDir,
    mediaFixtures,
    rejectedMediaFixturePrefix,
} from '../support/media-fixtures.mjs';

/**
 * @param {string} filePath
 */
function readPngSize(filePath) {
    const buffer = fs.readFileSync(filePath);
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
    };
}

test('fixture inventory is complete and files exist', () => {
    assert.deepEqual(Object.keys(mediaFixtures).sort(), [
        'avif',
        'bmp',
        'longMp3',
        'longMp4',
        'mp3',
        'mp4',
        'portraitPng',
        'smallPng',
        'svg',
        'unsupportedPdf',
        'webm',
    ]);

    for (const filePath of Object.values(mediaFixtures)) {
        assert.ok(fs.existsSync(filePath), `Missing fixture: ${filePath}`);
        assert.ok(fs.statSync(filePath).size > 0, `Empty fixture: ${filePath}`);
    }
});

test('fixture directory is flat', () => {
    const nestedEntries = fs.readdirSync(mediaFixturesDir, { withFileTypes: true })
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);

    assert.deepEqual(nestedEntries, []);
});

test('rejected fixture inventory is available', () => {
    const fixtureNames = fs.readdirSync(mediaFixturesDir)
        .filter(fileName => fileName.startsWith(rejectedMediaFixturePrefix))
        .sort();

    assert.equal(fixtureNames.length, 6);
    assert.ok(fixtureNames.includes('reject-video-mp4-corrupt-truncated.mp4'));
    assert.ok(fixtureNames.includes('reject-document-pdf-text-tiny-note.pdf'));

    for (const fileName of fixtureNames) {
        const filePath = path.join(mediaFixturesDir, fileName);
        assert.ok(fs.statSync(filePath).isFile(), `Expected fixture file: ${filePath}`);
        assert.ok(fs.statSync(filePath).size > 0, `Empty fixture: ${filePath}`);
    }
});

test('png fixtures keep their expected geometry', () => {
    assert.deepEqual(readPngSize(mediaFixtures.smallPng), { width: 16, height: 16 });
    assert.deepEqual(readPngSize(mediaFixtures.portraitPng), { width: 180, height: 320 });
});
