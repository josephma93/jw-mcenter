// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');

/**
 * @param {string} relativePath
 */
function assertExists(relativePath) {
    assert.ok(
        fs.existsSync(path.join(distDir, relativePath)),
        `Expected dist artifact "${relativePath}" to exist.`
    );
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function findDotStoreFiles(dir) {
    if (!fs.existsSync(dir)) {
        return [];
    }

    /** @type {string[]} */
    const matches = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            matches.push(...findDotStoreFiles(entryPath));
            continue;
        }
        if (entry.name === '.DS_Store') {
            matches.push(path.relative(distDir, entryPath));
        }
    }
    return matches;
}

test('production build emits the required multi-page PWA artifacts', () => {
    assert.ok(fs.existsSync(distDir), 'Expected dist/ to exist. Run `npm run build` first.');
    assertExists('index.html');
    assertExists('presentation.html');
    assertExists('sw.js');
    assertExists('manifest.json');
    assertExists('icons/android-chrome-192x192.png');
    assertExists('icons/android-chrome-512x512.png');
    assertExists('icons/apple-touch-icon.png');
    assertExists('icons/favicon-16x16.png');
    assertExists('icons/favicon-32x32.png');
    assertExists('icons/favicon.ico');

    const dotStoreFiles = findDotStoreFiles(distDir);
    assert.deepEqual(dotStoreFiles, [], 'dist/ must not contain .DS_Store files.');
});
