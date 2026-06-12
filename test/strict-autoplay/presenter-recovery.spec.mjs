// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import { waitForPresenterElement } from '../support/presenter-helpers.mjs';

test('presenter recovers from strict autoplay blocking after overlay click', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);
    const context = page.context();

    await context.addInitScript(() => {
        const originalPlay = HTMLMediaElement.prototype.play;
        let shouldRejectAutoplay = true;

        HTMLMediaElement.prototype.play = function playWithStrictAutoplayShim() {
            if (
                shouldRejectAutoplay &&
                window.location.pathname.endsWith('/presentation.html') &&
                !document.fullscreenElement
            ) {
                shouldRejectAutoplay = false;
                return Promise.reject(new DOMException('Autoplay blocked for test', 'NotAllowedError'));
            }
            return originalPlay.call(this);
        };
    });

    await page.goto('/');
    await page.locator('#fileInput').setInputFiles([mediaFixturePath('mp4')]);
    await page.locator('#monitorSelect').selectOption('1');

    const popupPromise = context.waitForEvent('page');
    await page.locator('#startPresentationBtn').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');

    await waitForPresenterElement(presenter, 'VIDEO');
    await expect(presenter.locator('#statusMessage')).toContainText('haz clic en la ventana de presentación');

    const blockedSample = await presenter.evaluate(async () => {
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
    expect(blockedSample.paused).toBe(true);
    expect(blockedSample.delta).toBeLessThan(0.02);

    await presenter.locator('#fullscreen-overlay').click({ force: true });
    await presenter.waitForFunction(() => Boolean(document.fullscreenElement));
    await expect(presenter.locator('#fullscreen-overlay')).toBeHidden();

    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0.2;
    });
    await expect(presenter.locator('#statusMessage')).toBeHidden();

    await presenter.evaluate(() => document.exitFullscreen());
    await presenter.waitForFunction(() => !document.fullscreenElement);
    await expect(presenter.locator('#fullscreen-overlay')).toBeVisible();

    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
});
