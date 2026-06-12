// @ts-check
import { test, expect } from '@playwright/test';
import { mediaFixturePath } from '../support/media-fixtures.mjs';
import {
    collectProblems,
    EXPECTED_PERMISSION_NOISE,
    expectNoProblems,
    flushFrames,
} from '../support/e2e-helpers.mjs';

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

test('presentation window boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/presentation.html');
    await expect(page.getByTestId('page:presenter')).toBeVisible();
    await expect(page.getByTestId('state:fullscreen-prompt')).toBeVisible();
    await flushFrames(page);
    expectNoProblems(problems);
});
