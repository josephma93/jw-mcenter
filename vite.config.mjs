import fs from 'node:fs/promises';
import path from 'node:path';
import Beasties from 'beasties';
import sharp from 'sharp';
import { minify as minifyHtml } from 'html-minifier-terser';
import { optimize as optimizeSvg } from 'svgo';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const projectRoot = path.resolve(import.meta.dirname, 'src');
const outputDir = path.resolve(import.meta.dirname, 'dist');
const htmlMinifierOptions = {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    decodeEntities: true,
    minifyCSS: true,
    minifyJS: true,
    noNewlinesBeforeTagClose: true,
    removeComments: true,
    removeEmptyAttributes: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
};
const templateMinifierOptions = {
    collapseBooleanAttributes: true,
    collapseWhitespace: true,
    conservativeCollapse: true,
    continueOnParseError: true,
    decodeEntities: true,
    ignoreCustomFragments: [/<%[\s\S]*?%>/],
    removeComments: true,
    removeRedundantAttributes: true,
};

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
async function collectFiles(dir) {
    /** @type {import('node:fs').Dirent[]} */
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
            return [];
        }
        throw error;
    }

    const nestedFiles = await Promise.all(entries.map(async entry => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            return collectFiles(entryPath);
        }
        return [entryPath];
    }));

    return nestedFiles.flat();
}

/**
 * @param {string} filePath
 * @returns {Promise<void>}
 */
async function minifyHtmlFile(filePath) {
    const source = await fs.readFile(filePath, 'utf8');
    const withMinifiedTemplates = await minifyEmbeddedHtmlTemplates(source);
    const minified = await minifyHtml(
        withMinifiedTemplates.replaceAll(' data-beasties-container', ''),
        htmlMinifierOptions
    );
    await fs.writeFile(filePath, minified);
}

/**
 * @param {string} html
 * @returns {Promise<string>}
 */
async function minifyEmbeddedHtmlTemplates(html) {
    const templatePattern = /(<script\b[^>]*type=(["'])text\/html\2[^>]*>)([\s\S]*?)(<\/script>)/gi;
    const parts = [];
    let lastIndex = 0;

    for (const match of html.matchAll(templatePattern)) {
        const [fullMatch, openingTag, , templateBody, closingTag] = match;
        const matchIndex = match.index ?? 0;
        parts.push(html.slice(lastIndex, matchIndex));

        const minifiedBody = await minifyHtml(templateBody, templateMinifierOptions);
        parts.push(`${openingTag}${minifiedBody.trim()}${closingTag}`);

        lastIndex = matchIndex + fullMatch.length;
    }

    if (parts.length === 0) {
        return html;
    }

    parts.push(html.slice(lastIndex));
    return parts.join('');
}

/**
 * @param {string} filePath
 * @returns {Promise<void>}
 */
async function inlineCriticalCssFile(filePath) {
    const source = await fs.readFile(filePath, 'utf8');
    if (!source.includes('rel="stylesheet"') && !source.includes("rel='stylesheet'")) {
        return;
    }

    const beasties = new Beasties({
        compress: true,
        inlineFonts: true,
        logLevel: 'silent',
        path: outputDir,
        preload: 'media',
        pruneSource: false,
        publicPath: '/',
    });

    const processed = await beasties.process(source);
    await fs.writeFile(filePath, processed);
}

/**
 * @param {string} filePath
 * @returns {Promise<void>}
 */
async function optimizeAssetFile(filePath) {
    const extension = path.extname(filePath).toLowerCase();
    const original = await fs.readFile(filePath);
    /** @type {Buffer | null} */
    let optimized = null;

    switch (extension) {
        case '.png':
            optimized = await sharp(original)
                .png({
                    compressionLevel: 9,
                    effort: 10,
                    progressive: true,
                })
                .toBuffer();
            break;
        case '.jpg':
        case '.jpeg':
            optimized = await sharp(original)
                .jpeg({
                    mozjpeg: true,
                    progressive: true,
                    quality: 82,
                })
                .toBuffer();
            break;
        case '.webp':
            optimized = await sharp(original)
                .webp({
                    effort: 6,
                    quality: 82,
                })
                .toBuffer();
            break;
        case '.avif':
            optimized = await sharp(original)
                .avif({
                    effort: 9,
                    quality: 55,
                })
                .toBuffer();
            break;
        case '.svg': {
            const result = optimizeSvg(original.toString('utf8'), {
                multipass: true,
                path: filePath,
            });
            if ('data' in result) {
                optimized = Buffer.from(result.data);
            }
            break;
        }
    }

    if (!optimized || optimized.length >= original.length) {
        return;
    }

    await fs.writeFile(filePath, optimized);
}

function optimizeDistPlugin() {
    return {
        name: 'jw-mcenter-optimize-dist',
        apply: 'build',
        async closeBundle() {
            const files = await collectFiles(outputDir);
            const htmlFiles = [];
            const assetFiles = [];

            for (const filePath of files) {
                if (path.basename(filePath) === '.DS_Store') {
                    await fs.rm(filePath, { force: true });
                    continue;
                }
                if (filePath.endsWith('.html')) {
                    htmlFiles.push(filePath);
                    continue;
                }
                assetFiles.push(filePath);
            }

            for (const filePath of htmlFiles) {
                await inlineCriticalCssFile(filePath);
                await minifyHtmlFile(filePath);
            }

            await Promise.all(assetFiles.map(filePath => optimizeAssetFile(filePath)));
        },
    };
}

export default defineConfig({
    appType: 'mpa',
    root: projectRoot,
    publicDir: 'public',
    build: {
        cssMinify: 'lightningcss',
        minify: 'esbuild',
        outDir: '../dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                control: path.resolve(projectRoot, 'index.html'),
                presenter: path.resolve(projectRoot, 'presentation.html'),
            },
        },
    },
    plugins: [
        VitePWA({
            strategies: 'injectManifest',
            srcDir: 'js',
            filename: 'sw.js',
            manifestFilename: 'manifest.json',
            injectRegister: false,
            registerType: 'prompt',
            includeAssets: [
                'icons/apple-touch-icon.png',
                'icons/favicon-16x16.png',
                'icons/favicon-32x32.png',
                'icons/favicon.ico',
            ],
            manifest: {
                name: 'Jehovah Witnesses Multimedia Center',
                short_name: 'JW MCenter',
                start_url: '/',
                scope: '/',
                display: 'fullscreen',
                background_color: '#f4f4f4',
                theme_color: '#000000',
                icons: [
                    {
                        src: 'icons/android-chrome-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'icons/android-chrome-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
            injectManifest: {
                rollupFormat: 'es',
            },
        }),
        optimizeDistPlugin(),
    ],
});
