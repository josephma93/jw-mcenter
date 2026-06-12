// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import { waitForPresenterElement } from '../support/presenter-helpers.mjs';

test('portrait image stays contained within the presenter viewport', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);

    await page.goto('/');
    await page.locator('#fileInput').setInputFiles([mediaFixturePath('portraitPng')]);
    await page.locator('#monitorSelect').selectOption('1');

    const popupPromise = page.context().waitForEvent('page');
    await page.locator('#startPresentationBtn').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');

    await waitForPresenterElement(presenter, 'IMG');
    await presenter.waitForFunction(() => {
        const image = document.querySelector('#media-container > img');
        if (!(image instanceof HTMLImageElement) || !image.complete || image.naturalWidth === 0) {
            return false;
        }

        const rect = image.getBoundingClientRect();
        return rect.width <= window.innerWidth + 1 && rect.height <= window.innerHeight + 1;
    });
    const metrics = await presenter.evaluate(() => {
        const image = document.querySelector('#media-container > img');
        if (!(image instanceof HTMLImageElement)) {
            return null;
        }

        const rect = image.getBoundingClientRect();
        return {
            renderedWidth: rect.width,
            renderedHeight: rect.height,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            viewportWidth: window.innerWidth,
            viewportHeight: window.innerHeight,
        };
    });

    expect(metrics).not.toBeNull();
    expect(metrics?.naturalWidth).toBeGreaterThan(0);
    expect(metrics?.naturalHeight).toBeGreaterThan(0);
    expect(metrics?.renderedWidth).toBeLessThanOrEqual((metrics?.viewportWidth ?? 0) + 1);
    expect(metrics?.renderedHeight).toBeLessThanOrEqual((metrics?.viewportHeight ?? 0) + 1);
    expect(metrics?.renderedHeight).toBeGreaterThan((metrics?.viewportHeight ?? 0) * 0.95);
    expect(metrics?.renderedWidth).toBeLessThan(metrics?.viewportWidth ?? 0);

    const naturalRatio = (metrics?.naturalWidth ?? 1) / (metrics?.naturalHeight ?? 1);
    const renderedRatio = (metrics?.renderedWidth ?? 1) / (metrics?.renderedHeight ?? 1);
    expect(Math.abs(renderedRatio - naturalRatio)).toBeLessThan(0.02);

    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
});
