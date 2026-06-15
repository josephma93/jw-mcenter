// @ts-check
/**
 * Copies third-party browser files from node_modules into src/vendor/.
 * The vendor folder is committed: the app must work offline with no CDN.
 *
 * This is NOT an app build step. App code under src/js/ is never compiled.
 * The only transformation here is bundling the RxJS symbols this app imports
 * into one browser-loadable ESM file.
 *
 * Run it only when upgrading dependencies: npm run vendor
 */
import * as esbuild from 'esbuild';
import {
    cpSync,
    existsSync,
    mkdirSync,
    readdirSync,
    readFileSync,
    renameSync,
    rmSync,
    statSync,
    writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'src');
const APP_JS_DIR = path.join(SRC_DIR, 'js');
const VENDOR = path.join(SRC_DIR, 'vendor');
const STAGE = path.join(SRC_DIR, `.vendor-stage-${process.pid}`);
const RXJS_ENTRY = path.join(STAGE, '.rxjs-entry.mjs');
const RXJS_OUTPUT = path.join(STAGE, 'rxjs.esm.js');
const MANIFEST_OUTPUT = path.join(STAGE, 'VENDOR_MANIFEST.json');

/**
 * Browser-ready package files copied without transformation.
 * @typedef {Object} CopyTarget
 * @property {string} packageName
 * @property {string} from
 * @property {string} to
 */

/** @type {CopyTarget[]} */
const COPY_TARGETS = [
    {
        packageName: 'jquery',
        from: 'node_modules/jquery/dist/jquery.min.js',
        to: 'jquery.min.js',
    },
    {
        packageName: 'sortablejs',
        from: 'node_modules/sortablejs/modular/sortable.esm.js',
        to: 'sortable.esm.js',
    },
    {
        packageName: 'ejs',
        from: 'node_modules/ejs/ejs.min.js',
        to: 'ejs.min.js',
    },
    {
        packageName: 'normalize.css',
        from: 'node_modules/normalize.css/normalize.css',
        to: 'normalize.css',
    },
];

const RXJS_PACKAGE = 'rxjs';

const RXJS_EXPORTS = [
    'BehaviorSubject',
    'Subject',
    'buffer',
    'distinctUntilChanged',
    'filter',
    'from',
    'fromEvent',
    'interval',
    'map',
    'mergeMap',
    'partition',
    'shareReplay',
    'switchMap',
    'tap',
    'withLatestFrom',
];

/**
 * @param {string} relativePath
 * @returns {string}
 */
function rootPath(relativePath) {
    return path.join(ROOT, relativePath);
}

/**
 * @param {string} packageName
 * @returns {{ name: string, version: string }}
 */
function readPackageInfo(packageName) {
    const packageJsonPath = rootPath(`node_modules/${packageName}/package.json`);
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    return {
        name: String(packageJson.name ?? packageName),
        version: String(packageJson.version ?? 'unknown'),
    };
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function listJavaScriptFiles(dir) {
    /** @type {string[]} */
    const files = [];
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...listJavaScriptFiles(entryPath));
        } else if (entry.isFile() && /\.(?:mjs|js)$/.test(entry.name)) {
            files.push(entryPath);
        }
    }
    return files;
}

/**
 * @param {string} importList
 * @returns {string[]}
 */
function parseNamedImports(importList) {
    return importList
        .split(',')
        .map(part => part.trim())
        .filter(Boolean)
        .map(part => part.split(/\s+as\s+/i)[0].trim())
        .filter(Boolean);
}

/**
 * @returns {string[]}
 */
function collectRxjsImports() {
    const imports = new Set();
    const importPattern = /import\s*\{([^}]*)\}\s*from\s*['"]rxjs['"];?/g;

    for (const file of listJavaScriptFiles(APP_JS_DIR)) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(importPattern)) {
            for (const name of parseNamedImports(match[1] ?? '')) {
                imports.add(name);
            }
        }
    }

    return [...imports].sort();
}

function validateRxjsExports() {
    const imported = collectRxjsImports();
    const exported = [...RXJS_EXPORTS].sort();
    const missing = imported.filter(name => !exported.includes(name));
    const unused = exported.filter(name => !imported.includes(name));

    if (missing.length > 0 || unused.length > 0) {
        throw new Error([
            'RxJS vendor export list is out of sync with src/js imports.',
            missing.length > 0 ? `Missing exports: ${missing.join(', ')}` : '',
            unused.length > 0 ? `Unused exports: ${unused.join(', ')}` : '',
        ].filter(Boolean).join('\n'));
    }
}

function validateCopySources() {
    for (const target of COPY_TARGETS) {
        if (!existsSync(rootPath(target.from))) {
            throw new Error(`Missing vendor source: ${target.from}`);
        }
    }
}

function copyBrowserFiles() {
    for (const target of COPY_TARGETS) {
        cpSync(rootPath(target.from), path.join(STAGE, target.to), { recursive: true });
    }
}

function writeRxjsEntry() {
    writeFileSync(
        RXJS_ENTRY,
        [
            'export {',
            ...RXJS_EXPORTS.map(name => `    ${name},`),
            "} from 'rxjs';",
            '',
        ].join('\n')
    );
}

/**
 * @returns {Promise<esbuild.Metafile>}
 */
async function bundleRxjs() {
    writeRxjsEntry();
    const result = await esbuild.build({
        entryPoints: [RXJS_ENTRY],
        outfile: RXJS_OUTPUT,
        bundle: true,
        format: 'esm',
        platform: 'browser',
        target: 'es2022',
        minify: true,
        legalComments: 'eof',
        metafile: true,
    });
    rmSync(RXJS_ENTRY, { force: true });

    if (!result.metafile) {
        throw new Error('esbuild did not return a metafile for the RxJS vendor bundle.');
    }

    return result.metafile;
}

/**
 * @param {esbuild.Metafile} metafile
 */
function summarizeRxjsInputs(metafile) {
    const inputs = Object.entries(metafile.inputs)
        .filter(([inputPath]) => !inputPath.endsWith('.rxjs-entry.mjs'))
        .map(([inputPath, input]) => ({
            path: inputPath,
            bytes: input.bytes,
        }))
        .sort((a, b) => b.bytes - a.bytes || a.path.localeCompare(b.path));

    return {
        inputCount: inputs.length,
        largestInputs: inputs.slice(0, 12),
    };
}

/**
 * @param {esbuild.Metafile} rxjsMetafile
 */
function writeVendorManifest(rxjsMetafile) {
    const copyManifest = COPY_TARGETS.map(target => ({
        package: readPackageInfo(target.packageName),
        source: target.from,
        target: target.to,
    }));
    const esbuildPackage = readPackageInfo('esbuild');
    const rxjsPackage = readPackageInfo(RXJS_PACKAGE);
    const manifest = {
        generatedBy: 'tools/vendor.mjs',
        copies: copyManifest,
        bundles: [
            {
                package: rxjsPackage,
                target: 'rxjs.esm.js',
                exports: RXJS_EXPORTS,
                bytes: statSync(RXJS_OUTPUT).size,
                esbuild: esbuildPackage,
                inputSummary: summarizeRxjsInputs(rxjsMetafile),
            },
        ],
    };

    writeFileSync(MANIFEST_OUTPUT, `${JSON.stringify(manifest, null, 2)}\n`);
}

function replaceVendorDir() {
    const backup = path.join(SRC_DIR, `.vendor-backup-${process.pid}`);
    const hadVendor = existsSync(VENDOR);

    if (hadVendor) {
        renameSync(VENDOR, backup);
    }

    try {
        renameSync(STAGE, VENDOR);
        if (hadVendor) {
            rmSync(backup, { recursive: true, force: true });
        }
    } catch (error) {
        if (existsSync(VENDOR)) {
            rmSync(VENDOR, { recursive: true, force: true });
        }
        if (hadVendor && existsSync(backup)) {
            renameSync(backup, VENDOR);
        }
        throw error;
    }
}

async function main() {
    validateCopySources();
    validateRxjsExports();

    rmSync(STAGE, { recursive: true, force: true });
    mkdirSync(STAGE, { recursive: true });

    try {
        copyBrowserFiles();
        const rxjsMetafile = await bundleRxjs();
        writeVendorManifest(rxjsMetafile);
        replaceVendorDir();
    } finally {
        rmSync(STAGE, { recursive: true, force: true });
    }

    console.log(`Vendored files written to ${path.relative(ROOT, VENDOR)}`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
