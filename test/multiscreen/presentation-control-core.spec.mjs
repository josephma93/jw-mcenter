// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';

/**
 * @param {import('@playwright/test').Page} presenter
 * @param {'VIDEO' | 'AUDIO' | 'IMG'} tagName
 */
async function waitForPresenterElement(presenter, tagName) {
    await presenter.waitForFunction((expectedTagName) => {
        const element = document.querySelector('#media-container > *');
        return element?.tagName === expectedTagName;
    }, tagName);
    return presenter.locator('#media-container > *');
}

test('control panel drives video, audio, image, and presenter lifecycle on secondary screen', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);

    await page.goto('/');
    await expect(page.locator('#screensPermissionBtn')).toBeHidden();

    /** @type {string | null} */
    let emptyDialogMessage = null;
    page.once('dialog', async dialog => {
        emptyDialogMessage = dialog.message();
        await dialog.accept();
    });
    await page.locator('#startPresentationBtn').click();
    expect(emptyDialogMessage).toMatch(/Agrega al menos un archivo/);

    await page.locator('#fileInput').setInputFiles([
        mediaFixturePath('mp4'),
        mediaFixturePath('mp3'),
        mediaFixturePath('smallPng'),
    ]);
    await expect(page.locator('#fileList .file-item')).toHaveCount(3);

    await page.locator('#monitorSelect').selectOption('1');

    const popupPromise = page.context().waitForEvent('page');
    await page.locator('#startPresentationBtn').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');

    await expect(page.locator('#startPresentationBtn')).toBeDisabled();
    await expect(page.locator('#endPresentationBtn')).toBeEnabled();
    expect(await presenter.evaluate(() => window.screenX)).toBeGreaterThanOrEqual(1920);

    await waitForPresenterElement(presenter, 'VIDEO');
    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && video.currentTime > 0.2;
    });

    await page.locator('#playPauseBtn').click();
    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && video.paused;
    });
    const pauseSample = await presenter.evaluate(async () => {
        const video = document.querySelector('#media-container > video');
        if (!(video instanceof HTMLVideoElement)) {
            return { paused: false, delta: Infinity };
        }
        const samples = [];
        for (let i = 0; i < 12; i += 1) {
            samples.push(video.currentTime);
            await new Promise(requestAnimationFrame);
        }
        return {
            paused: video.paused,
            delta: Math.max(...samples) - Math.min(...samples),
        };
    });
    expect(pauseSample.paused).toBe(true);
    expect(pauseSample.delta).toBeLessThan(0.02);

    await page.locator('#playPauseBtn').click();
    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && !video.paused;
    });

    const videoDuration = await presenter.evaluate(() => {
        const video = document.querySelector('#media-container > video');
        if (!(video instanceof HTMLVideoElement) || !Number.isFinite(video.duration)) {
            return 0;
        }
        video.currentTime = 0;
        return video.duration;
    });
    expect(videoDuration).toBeGreaterThan(0);
    await page.locator('#fastForwardBtn').click();
    await presenter.waitForFunction(
        /** @param {number} previousTime */
        (previousTime) => {
        const video = document.querySelector('#media-container > video');
        if (!(video instanceof HTMLVideoElement)) {
            return false;
        }
        const expectedTime = Math.min(previousTime + 10, video.duration);
        return video.currentTime >= expectedTime - 0.05;
    }, 0);

    await presenter.evaluate(() => {
        const video = document.querySelector('#media-container > video');
        if (video instanceof HTMLVideoElement && Number.isFinite(video.duration)) {
            video.currentTime = video.duration;
        }
    });
    await page.locator('#rewindBtn').click();
    await presenter.waitForFunction(
        /** @param {number} previousTime */
        (previousTime) => {
        const video = document.querySelector('#media-container > video');
        if (!(video instanceof HTMLVideoElement)) {
            return false;
        }
        const expectedTime = Math.max(previousTime - 10, 0);
        return video.currentTime <= expectedTime + 0.05;
    }, videoDuration);

    await page.locator('#nextMediaBtn').click();
    await waitForPresenterElement(presenter, 'AUDIO');
    await presenter.waitForFunction(() => {
        const audio = document.querySelector('#media-container > audio');
        return audio instanceof HTMLAudioElement && audio.currentTime > 0.2;
    });

    await page.locator('#nextMediaBtn').click();
    await waitForPresenterElement(presenter, 'IMG');
    await presenter.waitForFunction(() => {
        const image = document.querySelector('#media-container > img');
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });

    const closePromise = presenter.waitForEvent('close');
    await page.locator('#endPresentationBtn').click();
    await closePromise;
    await expect(page.locator('#startPresentationBtn')).toBeEnabled();

    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
});
