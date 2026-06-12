// @ts-check
import fs from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import { waitForPresenterElement } from '../support/presenter-helpers.mjs';

const SHARED_WORKER_BRIDGE_STUB = `
function createChannel() {
  const subscribers = [];
  return {
    on: {
      subscribe(handler) {
        subscribers.push(handler);
        return {
          unsubscribe() {
            const index = subscribers.indexOf(handler);
            if (index >= 0) subscribers.splice(index, 1);
          }
        };
      }
    },
    send: {
      next(payload) {
        for (const subscriber of subscribers) {
          subscriber(payload);
        }
      }
    }
  };
}

export function initSharedWorkerRxBridge() {
  const channels = {
    updateMediaChannel: createChannel(),
    playChannel: createChannel(),
    pauseChannel: createChannel(),
    fastForwardChannel: createChannel(),
    rewindChannel: createChannel(),
    pingChannel: createChannel(),
    pongChannel: createChannel(),
    mediaTimeUpdateChannel: createChannel()
  };

  window.__presentationTestBridge = channels;
  return channels;
}
`;

test('presenter recovers from strict autoplay blocking after overlay click', async ({ page }) => {
    const problems = collectProblems(page);
    const videoBytes = await fs.readFile(mediaFixturePath('mp4'));

    await page.addInitScript(() => {
        const originalPlay = HTMLMediaElement.prototype.play;
        let shouldRejectAutoplay = true;

        HTMLMediaElement.prototype.play = function playWithStrictAutoplayShim() {
            if (shouldRejectAutoplay && !document.fullscreenElement) {
                shouldRejectAutoplay = false;
                return Promise.reject(new DOMException('Autoplay blocked for test', 'NotAllowedError'));
            }
            return originalPlay.call(this);
        };
    });

    await page.route('**/js/shared-worker-bridge.js', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'application/javascript',
            body: SHARED_WORKER_BRIDGE_STUB,
        });
    });
    await page.route('**/test-media/sample.mp4', async route => {
        await route.fulfill({
            status: 200,
            contentType: 'video/mp4',
            body: videoBytes,
        });
    });

    await page.goto('/presentation.html');
    await page.waitForFunction(() => {
        const testWindow = /** @type {any} */ (window);
        return Boolean(testWindow.__presentationTestBridge);
    });

    await page.evaluate(() => {
        const testWindow = /** @type {any} */ (window);
        testWindow.__presentationTestBridge.updateMediaChannel.send.next({
            mediaUrl: '/test-media/sample.mp4',
            mediaType: 'video',
        });
    });

    await waitForPresenterElement(page, 'VIDEO');
    await expect(page.locator('#statusMessage')).toContainText('haz clic en la ventana de presentación');

    await page.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && video.paused && video.currentTime < 0.05;
    });

    await page.locator('#fullscreen-overlay').click({ force: true });
    await page.waitForFunction(() => Boolean(document.fullscreenElement));
    await expect(page.locator('#fullscreen-overlay')).toBeHidden();

    await page.waitForFunction(() => {
        const video = document.querySelector('#media-container > video');
        return video instanceof HTMLVideoElement && !video.paused && video.currentTime > 0.2;
    });
    await expect(page.locator('#statusMessage')).toBeHidden();

    await page.evaluate(() => document.exitFullscreen());
    await page.waitForFunction(() => !document.fullscreenElement);
    await expect(page.locator('#fullscreen-overlay')).toBeVisible();

    expectNoProblems(problems);
});
