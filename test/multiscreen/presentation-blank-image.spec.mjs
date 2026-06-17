// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import { waitForPresenterElement } from '../support/presenter-helpers.mjs';

/**
 * The blank-screen image (180px wide) and the playlist image (16px wide) have
 * distinct natural widths, so the rendered width tells which one is on stage.
 * @param {import('@playwright/test').Page} presenter
 * @returns {Promise<number>}
 */
async function presenterImageNaturalWidth(presenter) {
    return presenter.evaluate(() => {
        const img = document.querySelector('#media-container > img');
        return img instanceof HTMLImageElement ? img.naturalWidth : -1;
    });
}

test('the configured blank-screen image renders wherever the presenter is blank', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('action:grant-screens-permission')).toBeHidden();

    // Configure a 180x320 blank-screen image, distinct from the playlist image.
    await page.getByTestId('action:open-config').click();
    await page.getByTestId('field:blank-image').setInputFiles(mediaFixturePath('portraitPng'));
    await expect(page.getByTestId('config:blank-image-preview')).toBeVisible();
    await page.getByTestId('config-dialog-close').click();
    await expect(page.getByTestId('config-dialog')).toBeHidden();

    // The secondary monitor is auto-selected; wait for it before starting.
    await expect(page.getByTestId('field:monitor')).toHaveValue('1');

    // Starting with an empty playlist is a blank stage: it shows the image, not
    // an empty container.
    const popupPromise = page.context().waitForEvent('page');
    await page.getByTestId('action:start-presentation').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');

    await waitForPresenterElement(presenter, 'IMG');
    await presenter.waitForFunction(() => {
        const img = document.querySelector('#media-container > img');
        return img instanceof HTMLImageElement && img.complete && img.naturalWidth > 0;
    });
    expect(await presenterImageNaturalWidth(presenter)).toBe(180);

    // Show a real 16x16 playlist item, then blank the stage: the blank state
    // returns to the configured image rather than emptying the presenter.
    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('smallPng'));
    await page.getByTestId('files-list-item').nth(0).getByTestId('files-list-item-action:show').click();
    await waitForPresenterElement(presenter, 'IMG');
    await expect.poll(() => presenterImageNaturalWidth(presenter)).toBe(16);

    await page.getByTestId('action:blank-screen').click();
    await waitForPresenterElement(presenter, 'IMG');
    await expect.poll(() => presenterImageNaturalWidth(presenter)).toBe(180);
    await expect(presenter.getByTestId('state:presenter-media').locator('> *')).toHaveCount(1);

    const presenterClose = presenter.waitForEvent('close');
    await presenter.close();
    await presenterClose;

    expectNoProblems(controlProblems);
    expectNoProblems(presenterProblems);
});
