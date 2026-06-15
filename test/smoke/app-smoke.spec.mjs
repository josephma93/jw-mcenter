// @ts-check
import { test, expect } from '@playwright/test';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import {
    collectProblems,
    EXPECTED_PERMISSION_NOISE,
    expectNoProblems,
    flushFrames,
} from '../support/e2e-helpers.mjs';

/**
 * @param {import('@playwright/test').Page} page
 */
async function closeScreensPermissionDialog(page) {
    await page.locator('#screensPermissionDialog').evaluate(dialog => {
        if (dialog instanceof HTMLDialogElement && dialog.open) {
            dialog.close();
        }
    });
}

test('control panel boots with permission-denied flow isolated to smoke', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('page:control-panel')).toBeVisible();
    await expect(page.getByTestId('action:start-presentation')).toBeVisible();
    await expect(page.getByTestId('state:empty-results')).toBeVisible();
    await expect(page.getByTestId('screens-permission-dialog')).toBeVisible();
    await expect(page.getByTestId('action:grant-screens-permission')).toBeVisible();
    await expect(page.getByTestId('action:grant-screens-permission')).toBeFocused();

    await page.getByTestId('action:grant-screens-permission').click();
    await expect(page.getByTestId('state:screens-permission-status')).toContainText('No se pudo obtener acceso');
    await flushFrames(page);

    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('adding a deterministic fixture renders it in the playlist', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('smallPng'));
    await expect(page.getByTestId('files-list-item')).toHaveCount(1);
    await expect(page.getByTestId('files-list-item-name')).toHaveText('small.png');
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('dragging a playlist handle reorders files', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);
    await page.getByTestId('field:files').setInputFiles([
        mediaFixturePath('smallPng'),
        mediaFixturePath('mp4'),
        mediaFixturePath('mp3'),
    ]);

    const itemNames = page.getByTestId('files-list-item-name');
    await expect(itemNames).toHaveText(['small.png', 'sample.mp4', 'sample.mp3']);

    const firstHandle = page
        .getByTestId('files-list-item')
        .nth(0)
        .getByTestId('files-list-item-action:drag');
    const lastItem = page.getByTestId('files-list-item').nth(2);
    const handleBox = await firstHandle.boundingBox();
    const lastItemBox = await lastItem.boundingBox();
    if (!handleBox || !lastItemBox) {
        throw new Error('Expected playlist drag handle and drop target to be visible.');
    }

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
        lastItemBox.x + lastItemBox.width / 2,
        lastItemBox.y + lastItemBox.height - 4,
        { steps: 12 }
    );
    await page.mouse.up();
    await flushFrames(page);

    await expect(itemNames).toHaveText(['sample.mp4', 'sample.mp3', 'small.png']);
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('unsupported files open and close a native dialog', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);

    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('unsupportedPdf'));

    await expect(page.getByTestId('unsupported-files-dialog')).toBeVisible();
    await expect(page.getByTestId('unsupported-files-list-item')).toHaveText('tiny-note.pdf');
    await page.getByTestId('unsupported-files-dialog-close').click();
    await expect(page.getByTestId('unsupported-files-dialog')).toBeHidden();
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('clear playlist confirmation uses native dialog return values', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);
    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('smallPng'));
    await expect(page.getByTestId('files-list-item')).toHaveCount(1);

    await page.getByTestId('action:clear-list').click();
    await expect(page.getByTestId('clear-list-dialog')).toBeVisible();
    await page.getByTestId('clear-list-dialog-cancel').click();
    await expect(page.getByTestId('clear-list-dialog')).toBeHidden();
    await expect(page.getByTestId('files-list-item')).toHaveCount(1);

    await page.getByTestId('action:clear-list').click();
    await page.getByTestId('clear-list-dialog-confirm').click();
    await expect(page.getByTestId('files-list-item')).toHaveCount(0);
    await expect(page.getByTestId('state:empty-results')).toBeVisible();
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('presentation window boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/presentation.html');
    await expect(page.getByTestId('page:presenter')).toBeVisible();
    await expect(page.getByTestId('state:fullscreen-prompt')).toBeVisible();
    await flushFrames(page);
    expectNoProblems(problems);
});
