// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import {
    collectProblems,
    dismissPwaPrompt,
    expectNoProblems,
    waitForServiceWorkerControl,
} from '../support/e2e-helpers.mjs';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import { waitForPresenterElement } from '../support/presenter-helpers.mjs';

test('control and presenter stay functional offline after the app is installed', async ({
    pageWithWindowManagement: page,
}) => {
    const controlProblems = collectProblems(page);
    const context = page.context();

    await page.goto('/');
    await waitForServiceWorkerControl(page);
    await dismissPwaPrompt(page);
    await expect(page.getByTestId('action:grant-screens-permission')).toBeHidden();
    await expect(page.getByTestId('field:monitor')).toHaveValue('1');

    await page.getByTestId('field:files').setInputFiles([mediaFixturePath('smallPng')]);

    const popupPromise = context.waitForEvent('page');
    await page.getByTestId('action:start-presentation').click();
    const presenter = await popupPromise;
    const presenterProblems = collectProblems(presenter);
    await presenter.waitForLoadState('domcontentloaded');
    await waitForServiceWorkerControl(presenter);
    await waitForPresenterElement(presenter, 'IMG');

    await context.setOffline(true);

    await page.getByTestId('action:blank-screen').click();
    await expect(presenter.getByTestId('state:presenter-media').locator('> *')).toHaveCount(0);
    await page.getByTestId('files-list-item-action:show').click();
    await waitForPresenterElement(presenter, 'IMG');

    await expect(presenter.getByTestId('state:presenter-media').locator('img')).toBeVisible();
    expectNoProblems(controlProblems, /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/);
    expectNoProblems(presenterProblems, /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/);
});
