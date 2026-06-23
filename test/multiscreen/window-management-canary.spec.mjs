// @ts-check
import { test, expect } from '../fixtures/window-management.mjs';
import { collectProblems, expectNoProblems } from '../support/e2e-helpers.mjs';

test('window-management grant exposes the secondary monitor only', async ({ pageWithWindowManagement: page }) => {
    const problems = collectProblems(page);

    await page.goto('/');

    await expect(page.getByTestId('action:grant-screens-permission')).toBeHidden();

    const monitorSelect = page.getByTestId('field:monitor');
    const selectableOptions = monitorSelect.locator('option:not([value=""])');
    const emptyOptions = monitorSelect.locator('option[value=""]');
    await expect(selectableOptions).toHaveCount(1);
    await expect(emptyOptions).toHaveCount(0);
    await expect(selectableOptions.first()).toHaveAttribute('value', '1');
    await expect(selectableOptions.first()).toContainText('Monitor 2');
    await expect(selectableOptions.first()).toContainText('1280x720');
    await expect(selectableOptions.first().locator('.monitor-option-map')).toHaveCount(1);
    // The first secondary monitor is auto-selected as the default.
    await expect(monitorSelect).toHaveValue('1');

    await page.getByTestId('monitor-flyout-open').click();
    await expect(page.getByTestId('monitor-flyout-panel')).toBeVisible();

    const legendRows = page.getByTestId('monitors-list-item');
    await expect(legendRows).toHaveCount(2);
    const rowByKey = (/** @type {string} */ key) =>
        page.locator(`[data-testid="monitors-list-item"][data-key="${key}"]`);
    await expect(rowByKey('1')).toContainText('1920x1080');
    await expect(rowByKey('1')).toContainText('Principal');
    await expect(rowByKey('2')).toContainText('1280x720');
    await expect(rowByKey('2')).toContainText('Secundaria');

    expectNoProblems(problems);
});
