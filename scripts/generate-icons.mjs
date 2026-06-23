import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const sourceSvg = path.join(projectRoot, 'jw-mcenter.svg');
const outputDir = path.join(projectRoot, 'src', 'public', 'icons');

const pngOutputs = [
    { size: 16, filename: 'favicon-16x16.png' },
    { size: 32, filename: 'favicon-32x32.png' },
    { size: 48, filename: 'favicon-48x48.png' },
    { size: 180, filename: 'apple-touch-icon.png' },
    { size: 192, filename: 'android-chrome-192x192.png' },
    { size: 512, filename: 'android-chrome-512x512.png' },
];

async function generatePng(size, filename) {
    const outputPath = path.join(outputDir, filename);

    await sharp(sourceSvg, { density: 1024, limitInputPixels: false })
        .resize(size, size, {
            fit: 'contain',
            background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toFile(outputPath);

    return outputPath;
}

async function main() {
    await mkdir(outputDir, { recursive: true });
    await rm(path.join(outputDir, 'icon-source.svg'), { force: true });

    const generatedPngs = await Promise.all(
        pngOutputs.map(({ size, filename }) => generatePng(size, filename)),
    );

    const faviconIcoPath = path.join(outputDir, 'favicon.ico');
    const faviconPngs = generatedPngs.filter(filePath =>
        /favicon-(16x16|32x32|48x48)\.png$/.test(filePath),
    );

    execFileSync('magick', [...faviconPngs, faviconIcoPath], {
        stdio: 'inherit',
    });

    await rm(path.join(outputDir, 'favicon-48x48.png'), { force: true });
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
