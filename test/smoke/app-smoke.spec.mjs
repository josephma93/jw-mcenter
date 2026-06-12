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
    await expect(page.locator('#startPresentationBtn')).toBeVisible();
    await expect(page.locator('#emptyState')).toBeVisible();
    await expect(page.locator('#screensPermissionDialog')).toBeVisible();
    await expect(page.locator('#screensPermissionBtn')).toBeVisible();
    await expect(page.locator('#screensPermissionBtn')).toBeFocused();

    await page.locator('#screensPermissionBtn').click();
    await expect(page.locator('#screensPermissionStatus')).toContainText('No se pudo obtener acceso');
    await flushFrames(page);

    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('adding a deterministic fixture renders it in the playlist', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await page.locator('#fileInput').setInputFiles(mediaFixturePath('smallPng'));
    await expect(page.locator('.file-item')).toHaveCount(1);
    await expect(page.locator('.file-item .file-name')).toHaveText('small.png');
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('presentation window boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/presentation.html');
    await expect(page.locator('#fullscreen-overlay')).toBeVisible();
    await flushFrames(page);
    expectNoProblems(problems);
});
