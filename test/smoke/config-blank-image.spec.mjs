// @ts-check
import { test, expect } from '@playwright/test';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import {
    collectProblems,
    EXPECTED_PERMISSION_NOISE,
    expectNoProblems,
} from '../support/e2e-helpers.mjs';

/**
 * The screens-permission dialog auto-opens as a modal when monitor access is
 * denied (the default in headless tests) and would intercept header clicks.
 * @param {import('@playwright/test').Page} page
 */
async function closeScreensPermissionDialog(page) {
    await page.locator('#screensPermissionDialog').evaluate(dialog => {
        if (dialog instanceof HTMLDialogElement && dialog.open) {
            dialog.close();
        }
    });
}

test('blank-screen image can be set, persists across reload, and removed', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);

    // Open the config modal from the header button beside "Monitores".
    await page.getByTestId('action:open-config').click();
    await expect(page.getByTestId('config-dialog')).toBeVisible();
    await expect(page.getByTestId('config:blank-image-preview')).toBeHidden();
    await expect(page.getByTestId('action:remove-blank-image')).toBeDisabled();

    // The picker is a real button, so keyboard users can focus and open it.
    await page.getByTestId('action:select-blank-image').focus();
    await expect(page.getByTestId('action:select-blank-image')).toBeFocused();

    // Set an image: preview appears and removal becomes available.
    await page.getByTestId('field:blank-image').setInputFiles(mediaFixturePath('portraitPng'));
    await expect(page.getByTestId('config:blank-image-preview')).toBeVisible();
    await expect(page.getByTestId('action:remove-blank-image')).toBeEnabled();
    await expect(page.getByTestId('config:blank-image-error')).toBeHidden();

    // It is stored on device: a reload rehydrates it from IndexedDB.
    await page.reload();
    await closeScreensPermissionDialog(page);
    await page.getByTestId('action:open-config').click();
    await expect(page.getByTestId('config:blank-image-preview')).toBeVisible();
    await expect(page.getByTestId('action:remove-blank-image')).toBeEnabled();

    // Removing it clears the preview and disables removal again.
    await page.getByTestId('action:remove-blank-image').click();
    await expect(page.getByTestId('config:blank-image-preview')).toBeHidden();
    await expect(page.getByTestId('action:remove-blank-image')).toBeDisabled();

    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('non-image files are rejected with an error and nothing is stored', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);

    await page.getByTestId('action:open-config').click();
    await page.getByTestId('field:blank-image').setInputFiles(mediaFixturePath('unsupportedPdf'));

    await expect(page.getByTestId('config:blank-image-error')).toBeVisible();
    await expect(page.getByTestId('config:blank-image-error'))
        .toHaveText('Selecciona un archivo de imagen válido.');
    await expect(page.getByTestId('config:blank-image-preview')).toBeHidden();
    await expect(page.getByTestId('action:remove-blank-image')).toBeDisabled();

    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});
