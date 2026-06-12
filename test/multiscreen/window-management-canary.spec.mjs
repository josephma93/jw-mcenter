// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';

test('window-management grant exposes the secondary monitor only', async ({ pageWithWindowManagement: page }) => {
    const problems = collectProblems(page);

    await page.goto('/');

    await expect(page.locator('#screensPermissionBtn')).toBeHidden();

    const selectableOptions = page.locator('#monitorSelect option:not([value=""])');
    const emptyOptions = page.locator('#monitorSelect option[value=""]');
    await expect(selectableOptions).toHaveCount(1);
    await expect(emptyOptions).toHaveCount(0);
    await expect(selectableOptions.first()).toHaveAttribute('value', '1');
    await expect(selectableOptions.first()).toHaveText('Monitor 2 - secundario - 1280x720');
    // The first secondary monitor is auto-selected as the default.
    await expect(page.locator('#monitorSelect')).toHaveValue('1');

    await page.getByRole('button', { name: 'Monitores' }).click();
    await expect(page.locator('#monitorFlyoutPanel')).toBeVisible();

    const legendRows = page.locator('#legendTableBody tr');
    await expect(legendRows).toHaveCount(2);
    await expect(legendRows.nth(0)).toContainText('1');
    await expect(legendRows.nth(0)).toContainText('1920x1080');
    await expect(legendRows.nth(0)).toContainText('Principal');
    await expect(legendRows.nth(1)).toContainText('2');
    await expect(legendRows.nth(1)).toContainText('1280x720');
    await expect(legendRows.nth(1)).toContainText('Secundaria');

    expectNoProblems(problems);
});
