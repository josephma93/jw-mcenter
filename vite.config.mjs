import fs from 'node:fs/promises';
import path from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const projectRoot = path.resolve(import.meta.dirname, 'src');
const outputDir = path.resolve(import.meta.dirname, 'dist');

/**
 * @param {string} dir
 * @returns {Promise<void>}
 */
async function removeDotStoreFiles(dir) {
    /** @type {import('node:fs').Dirent[]} */
    let entries;
    try {
        entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (error) {
        if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') {
            return;
        }
        throw error;
    }

    await Promise.all(entries.map(async entry => {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            await removeDotStoreFiles(entryPath);
            return;
        }
        if (entry.name === '.DS_Store') {
            await fs.rm(entryPath, { force: true });
        }
    }));
}

function stripDotStorePlugin() {
    return {
        name: 'jw-mcenter-strip-dot-store',
        apply: 'build',
        async closeBundle() {
            await removeDotStoreFiles(outputDir);
        },
    };
}

export default defineConfig({
    appType: 'mpa',
    root: projectRoot,
    publicDir: 'public',
    build: {
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
        stripDotStorePlugin(),
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
    ],
});
