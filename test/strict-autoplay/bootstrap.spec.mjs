// @ts-check
import { test, expect } from '@playwright/test';
import { collectProblems, expectNoProblems, flushFrames } from '../support/e2e-helpers.mjs';

test('control panel boots before any autoplay-dependent interaction', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('action:start-presentation')).toBeVisible();
    await expect(page.getByTestId('screens-permission-dialog')).toBeVisible();
    await expect(page.getByTestId('action:grant-screens-permission')).toBeFocused();
    await flushFrames(page);
    expectNoProblems(problems);
});
