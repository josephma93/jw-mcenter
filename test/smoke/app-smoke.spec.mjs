// @ts-check
import { test, expect } from '@playwright/test';
import { Buffer } from 'node:buffer';
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
    await expect(page.locator('#screensPermissionBtn')).toBeHidden();

    await page.locator('body').click();
    await expect(page.locator('#screensPermissionBtn')).toBeVisible();
    await flushFrames(page);

    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('adding a deterministic fixture renders it in the playlist', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await page.locator('#fileInput').setInputFiles({
        name: 'pixel.png',
        mimeType: 'image/png',
        buffer: Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64'
        ),
    });
    await expect(page.locator('.file-item')).toHaveCount(1);
    await expect(page.locator('.file-item .file-name')).toHaveText('pixel.png');
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('presentation window boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/presentation.html');
    await expect(page.locator('#fullscreen-overlay')).toBeVisible();
    await flushFrames(page);
    expectNoProblems(problems);
});
