// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const sourceDir = path.resolve('src');

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
 * @param {string} relativePath
 * @returns {string}
 */
function readText(relativePath) {
    return fs.readFileSync(path.join(distDir, relativePath), 'utf8');
}

/**
 * @param {string} html
 * @returns {string}
 */
function stripClientTemplateScripts(html) {
    return html.replace(/<script type="text\/html"[\s\S]*?<\/script>/g, '');
}

/**
 * @param {string} html
 * @param {string} id
 * @returns {string | null}
 */
function extractTemplateBody(html, id) {
    const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = html.match(new RegExp(`<script type="text/html" id="${escapedId}">([\\s\\S]*?)<\\/script>`));
    return match?.[1] ?? null;
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

test('production HTML is minified and includes critical CSS inline', () => {
    const controlHtml = readText('index.html');
    const presenterHtml = readText('presentation.html');

    assert.match(
        controlHtml,
        /<style\b[^>]*>[\s\S]+?<\/style>/,
        'Expected index.html to inline critical CSS.'
    );
    assert.match(
        presenterHtml,
        /<style\b[^>]*>[\s\S]+?<\/style>/,
        'Expected presentation.html to keep inline critical CSS.'
    );

    assert.ok(
        !controlHtml.includes('<!--') && !presenterHtml.includes('<!--'),
        'Expected minified HTML to strip comments.'
    );

    const controlNewlines = stripClientTemplateScripts(controlHtml).match(/\n/g)?.length ?? 0;
    const presenterNewlines = stripClientTemplateScripts(presenterHtml).match(/\n/g)?.length ?? 0;
    assert.ok(controlNewlines <= 3, 'Expected index.html to be minified to a compact form.');
    assert.ok(presenterNewlines <= 3, 'Expected presentation.html to be minified to a compact form.');
});

test('embedded EJS templates are compacted inside production HTML', () => {
    const sourceHtml = fs.readFileSync(path.join(sourceDir, 'index.html'), 'utf8');
    const builtHtml = readText('index.html');

    for (const templateId of ['legendTemplate', 'fileItemTemplate']) {
        const sourceTemplate = extractTemplateBody(sourceHtml, templateId);
        const builtTemplate = extractTemplateBody(builtHtml, templateId);

        assert.ok(sourceTemplate, `Expected source template "${templateId}" to exist.`);
        assert.ok(builtTemplate, `Expected built template "${templateId}" to exist.`);
        assert.ok(
            builtTemplate.length < sourceTemplate.length,
            `Expected built template "${templateId}" to be smaller than its source form.`
        );
    }
});

test('production HTML and manifest stay portable across deployment subpaths', () => {
    const controlHtml = readText('index.html');
    const presenterHtml = readText('presentation.html');
    const manifestJson = readText('manifest.json');

    assert.ok(
        controlHtml.includes('href="./manifest.json"'),
        'Expected index.html to reference the manifest relatively.'
    );
    assert.ok(
        !controlHtml.includes('href="/manifest.json"'),
        'Expected index.html to avoid root-absolute manifest URLs.'
    );
    assert.ok(
        !controlHtml.includes('src="/assets/') && !controlHtml.includes('href="/assets/'),
        'Expected index.html asset URLs to avoid root-absolute /assets paths.'
    );
    assert.ok(
        !presenterHtml.includes('src="/assets/') && !presenterHtml.includes('href="/assets/'),
        'Expected presentation.html asset URLs to avoid root-absolute /assets paths.'
    );

    const manifest = JSON.parse(manifestJson);
    assert.equal(manifest.start_url, './', 'Expected manifest start_url to stay relative.');
    assert.equal(manifest.scope, './', 'Expected manifest scope to stay relative.');
});
