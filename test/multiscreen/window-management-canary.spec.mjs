// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';

test('window-management grant exposes the secondary monitor only', async ({ pageWithWindowManagement: page }) => {
    const problems = collectProblems(page);

    await page.goto('/');

    await expect(page.locator('#screensPermissionBtn')).toBeHidden();
    await expect(page.locator('#legendTableBody tr')).toHaveCount(2);

    const selectableOptions = page.locator('#monitorSelect option:not([value=""])');
    await expect(selectableOptions).toHaveCount(1);
    await expect(selectableOptions.first()).toHaveAttribute('value', '1');
    await expect(selectableOptions.first()).toHaveText('2');

    const legendRows = page.locator('#legendTableBody tr');
    await expect(legendRows.nth(0)).toContainText('1');
    await expect(legendRows.nth(0)).toContainText('1920x1080');
    await expect(legendRows.nth(1)).toContainText('2');
    await expect(legendRows.nth(1)).toContainText('1280x720');

    expectNoProblems(problems);
});
