// @ts-check
import { test, expect } from '@playwright/test';
import { collectProblems, expectNoProblems, flushFrames } from '../support/e2e-helpers.mjs';

test('control panel boots before any autoplay-dependent interaction', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await expect(page.locator('#startPresentationBtn')).toBeVisible();
    await expect(page.locator('#screensPermissionBtn')).toBeHidden();
    await flushFrames(page);
    expectNoProblems(problems);
});
