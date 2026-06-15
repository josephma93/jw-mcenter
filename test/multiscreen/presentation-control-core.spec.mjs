// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import { waitForPresenterElement } from '../support/presenter-helpers.mjs';

/**
 * @param {import('@playwright/test').Page} presenter
 */
async function waitForAnyPresenterElement(presenter) {
    await presenter.waitForFunction(() => {
        return document.querySelector('#media-container > *') !== null;
    });
    return presenter.getByTestId('state:presenter-media').locator('> *');
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function expectTimeDisplayToAdvance(page) {
    const playbackTimeDisplay = page.getByTestId('state:playback-time');
    await expect(playbackTimeDisplay).not.toHaveText('--:-- / --:--');
    const initialValue = await playbackTimeDisplay.textContent();
    await expect
        .poll(async () => page.getByTestId('state:playback-time').textContent())
        .not.toBe(initialValue);
}

/**
 * @param {import('@playwright/test').Page} page
 */
async function recordPlaylistScrollIntoViewCalls(page) {
    await page.evaluate(() => {
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        const recorderWindow = /** @type {Window & { __playlistScrollIntoViewCalls: Array<Record<string, string | null>> }} */ (
            /** @type {unknown} */ (window)
        );
        recorderWindow.__playlistScrollIntoViewCalls = [];
        Element.prototype.scrollIntoView = /** @param {ScrollIntoViewOptions | boolean} [options] */ function recordScrollIntoView(options) {
            const element = this instanceof HTMLElement ? this : null;
            recorderWindow.__playlistScrollIntoViewCalls.push({
                key: element?.getAttribute('data-key') ?? null,
                status: element?.getAttribute('data-status') ?? null,
                behavior: options && typeof options === 'object' ? options.behavior ?? null : null,
                block: options && typeof options === 'object' ? options.block ?? null : null,
                inline: options && typeof options === 'object' ? options.inline ?? null : null,
            });
            originalScrollIntoView.call(this, options);
        };
    });
}

/**
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<boolean>}
 */
async function currentPlaylistItemIsVisible(page) {
    return page.evaluate(() => {
        const container = document.getElementById('dropContainer');
        const header = document.querySelector('.drop-header');
        const current = document.querySelector('[data-testid="files-list-item"][data-status="current"]');
        if (!(container instanceof HTMLElement) || !(header instanceof HTMLElement) || !(current instanceof HTMLElement)) {
            return false;
        }

        const containerRect = container.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const currentRect = current.getBoundingClientRect();
        const visibleTop = containerRect.top + headerRect.height;
        return currentRect.top >= visibleTop - 1 && currentRect.bottom <= containerRect.bottom + 1;
    });
}

test('control panel drives video, audio, image, and presenter lifecycle on secondary screen', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);

    await page.goto('/');
    await expect(page.getByTestId('action:grant-screens-permission')).toBeHidden();

    await expect(page.getByTestId('action:end-presentation')).toBeDisabled();
    await expect(page.getByTestId('action:blank-screen')).toBeDisabled();
    await expect(page.getByTestId('action:previous-media')).toBeDisabled();
    await expect(page.getByTestId('action:next-media')).toBeDisabled();
    await expect(page.getByTestId('action:rewind')).toBeDisabled();
    await expect(page.getByTestId('action:fast-forward')).toBeDisabled();
    await expect(page.getByTestId('action:toggle-playback')).toBeDisabled();

    // The secondary monitor is auto-selected; wait for it before starting.
    await expect(page.getByTestId('field:monitor')).toHaveValue('1');

    // Starting with an empty playlist opens the presenter on a blank stage.
    const popupPromise = page.context().waitForEvent('page');
    await page.getByTestId('action:start-presentation').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');
    expect(await presenter.evaluate(() => window.screenX)).toBeGreaterThanOrEqual(1920);

    await expect(page.getByTestId('action:start-presentation')).toBeDisabled();
    await expect(page.getByTestId('action:end-presentation')).toBeEnabled();
    // Already blank: nothing to blank out, nothing to play or seek.
    await expect(page.getByTestId('action:blank-screen')).toBeDisabled();
    await expect(page.getByTestId('action:toggle-playback')).toBeDisabled();
    await expect(page.getByTestId('state:playback-time')).toHaveText('--:-- / --:--');
    await expect(presenter.getByTestId('state:presenter-media').locator('> *')).toHaveCount(0);

    // Adding files while blank must not push anything onto the presenter.
    // The 20s fixtures keep the video/audio playing through the whole
    // choreography; the 1s samples end before the playback assertions run.
    await page.getByTestId('field:files').setInputFiles([
        mediaFixturePath('longMp4'),
        mediaFixturePath('longMp3'),
        mediaFixturePath('smallPng'),
    ]);
    const playlistItems = page.getByTestId('files-list-item');
    await expect(playlistItems).toHaveCount(3);
    await expect(presenter.getByTestId('state:presenter-media').locator('> *')).toHaveCount(0);
    await expect(page.getByTestId('action:blank-screen')).toBeDisabled();

    // The operator decides what gets shown.
    await playlistItems.nth(0).getByTestId('files-list-item-action:show').click();

    await expect(page.getByTestId('action:blank-screen')).toBeEnabled();
    // First playlist item: there is nothing before it to navigate to.
    await expect(page.getByTestId('action:previous-media')).toBeDisabled();
    await expect(page.getByTestId('action:next-media')).toBeEnabled();
    await expect(page.getByTestId('action:rewind')).toBeEnabled();
    await expect(page.getByTestId('action:fast-forward')).toBeEnabled();
    await expect(page.getByTestId('action:toggle-playback')).toBeEnabled();

    await waitForPresenterElement(presenter, 'VIDEO');
    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && video.currentTime > 0.2;
    });
    await expectTimeDisplayToAdvance(page);
    await expect(page.getByTestId('action:toggle-playback')).toHaveText('⏸️');

    await page.getByTestId('action:toggle-playback').click();
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
    await expect(page.getByTestId('action:toggle-playback')).toHaveText('▶️');

    await page.getByTestId('action:toggle-playback').click();
    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && !video.paused;
    });
    await expect(page.getByTestId('action:toggle-playback')).toHaveText('⏸️');

    const videoDuration = await presenter.evaluate(() => {
        const video = document.querySelector('#media-container > video');
        if (!(video instanceof HTMLVideoElement) || !Number.isFinite(video.duration)) {
            return 0;
        }
        video.currentTime = 0;
        return video.duration;
    });
    expect(videoDuration).toBeGreaterThan(0);
    await page.getByTestId('action:fast-forward').click();
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
    // Seeking to the end fires 'ended': the play/pause button must reflect
    // that the media is no longer playing instead of still offering pause.
    await expect(page.getByTestId('action:toggle-playback')).toHaveText('▶️');
    await page.getByTestId('action:rewind').click();
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

    await page.getByTestId('action:next-media').click();
    await waitForPresenterElement(presenter, 'AUDIO');
    await presenter.waitForFunction(() => {
        const audio = document.querySelector('#media-container > audio');
        return audio instanceof HTMLAudioElement && audio.currentTime > 0.2;
    });

    await playlistItems.nth(2).getByTestId('files-list-item-action:show').click();
    await waitForPresenterElement(presenter, 'IMG');
    await presenter.waitForFunction(() => {
        const image = document.querySelector('#media-container > img');
        return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0;
    });
    await expect(playlistItems.nth(2)).toHaveAttribute('data-status', 'current');
    await expect(page.getByTestId('state:playback-time')).toHaveText('--:-- / --:--');
    // Images have no timeline, and this is the last playlist item.
    await expect(page.getByTestId('action:toggle-playback')).toBeDisabled();
    await expect(page.getByTestId('action:rewind')).toBeDisabled();
    await expect(page.getByTestId('action:fast-forward')).toBeDisabled();
    await expect(page.getByTestId('action:next-media')).toBeDisabled();
    await expect(page.getByTestId('action:previous-media')).toBeEnabled();

    // Blank the stage mid-presentation, then bring the image back.
    await page.getByTestId('action:blank-screen').click();
    await expect(presenter.getByTestId('state:presenter-media').locator('> *')).toHaveCount(0);
    await expect(page.getByTestId('action:blank-screen')).toBeDisabled();
    await expect(page.locator('[data-testid="files-list-item"][data-status="current"]')).toHaveCount(0);
    await expect(page.getByTestId('state:playback-time')).toHaveText('--:-- / --:--');
    await playlistItems.nth(2).getByTestId('files-list-item-action:show').click();
    await waitForPresenterElement(presenter, 'IMG');
    await expect(playlistItems.nth(2)).toHaveAttribute('data-status', 'current');

    const presenterManualClose = presenter.waitForEvent('close');
    await presenter.close();
    await presenterManualClose;
    await expect(page.getByTestId('action:start-presentation')).toBeEnabled({ timeout: 3000 });
    await expect(page.getByTestId('action:end-presentation')).toBeDisabled({ timeout: 3000 });
    await expect(page.getByTestId('action:blank-screen')).toBeDisabled({ timeout: 3000 });
    await expect(page.getByTestId('action:previous-media')).toBeDisabled({ timeout: 3000 });
    await expect(page.getByTestId('action:next-media')).toBeDisabled({ timeout: 3000 });
    await expect(page.getByTestId('action:rewind')).toBeDisabled({ timeout: 3000 });
    await expect(page.getByTestId('action:fast-forward')).toBeDisabled({ timeout: 3000 });
    await expect(page.getByTestId('action:toggle-playback')).toBeDisabled({ timeout: 3000 });

    const reopenPromise = page.context().waitForEvent('page');
    await page.getByTestId('action:start-presentation').click();
    const reopenedPresenter = await reopenPromise;
    const reopenedPresenterProblems = collectProblems(reopenedPresenter);
    await reopenedPresenter.waitForLoadState('domcontentloaded');
    await waitForAnyPresenterElement(reopenedPresenter);

    const closePromise = reopenedPresenter.waitForEvent('close');
    await page.getByTestId('action:end-presentation').click();
    await closePromise;
    await expect(page.getByTestId('action:start-presentation')).toBeEnabled();
    await expect(page.getByTestId('state:playback-time')).toHaveText('--:-- / --:--');

    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
    expectNoProblems(reopenedPresenterProblems);
});

test('current playlist item smooth-scrolls into view when transport changes current media', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);

    await page.goto('/');
    await expect(page.getByTestId('action:grant-screens-permission')).toBeHidden();
    await expect(page.getByTestId('field:monitor')).toHaveValue('1');
    await page.getByTestId('field:files').setInputFiles(
        Array.from({ length: 18 }, () => mediaFixturePath('smallPng'))
    );
    await expect(page.getByTestId('files-list-item')).toHaveCount(18);
    await recordPlaylistScrollIntoViewCalls(page);

    const popupPromise = page.context().waitForEvent('page');
    await page.getByTestId('action:start-presentation').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');
    await waitForPresenterElement(presenter, 'IMG');

    await page.evaluate(() => {
        const recorderWindow = /** @type {Window & { __playlistScrollIntoViewCalls: Array<Record<string, string | null>> }} */ (
            /** @type {unknown} */ (window)
        );
        recorderWindow.__playlistScrollIntoViewCalls = [];
        const dropContainer = document.getElementById('dropContainer');
        if (dropContainer instanceof HTMLElement) {
            dropContainer.scrollTop = 0;
        }
    });

    const targetIndex = 10;
    for (let index = 0; index < targetIndex; index += 1) {
        await page.getByTestId('action:next-media').click();
    }

    await expect(page.getByTestId('files-list-item').nth(targetIndex)).toHaveAttribute('data-status', 'current');
    await expect.poll(async () => page.evaluate(() => {
        const recorderWindow = /** @type {Window & { __playlistScrollIntoViewCalls?: Array<Record<string, string | null>> }} */ (
            /** @type {unknown} */ (window)
        );
        return recorderWindow.__playlistScrollIntoViewCalls?.at(-1) ?? null;
    })).toMatchObject({
        status: 'current',
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
    });
    await expect.poll(() => currentPlaylistItemIsVisible(page), { timeout: 3000 }).toBe(true);

    const closePromise = presenter.waitForEvent('close');
    await page.getByTestId('action:end-presentation').click();
    await closePromise;

    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
});

test('closing the control panel makes the presenter self-close within 8 seconds @slow', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);

    await page.goto('/');
    await page.getByTestId('field:files').setInputFiles([mediaFixturePath('mp4')]);
    await page.getByTestId('field:monitor').selectOption('1');

    const popupPromise = page.context().waitForEvent('page');
    await page.getByTestId('action:start-presentation').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');
    await waitForPresenterElement(presenter, 'VIDEO');
    await presenter.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && video.currentTime > 0.2;
    });

    const closePromise = presenter.waitForEvent('close', { timeout: 8000 });
    const closeStartedAt = Date.now();
    await page.close();
    await closePromise;

    expect(Date.now() - closeStartedAt).toBeLessThan(8000);
    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
});
