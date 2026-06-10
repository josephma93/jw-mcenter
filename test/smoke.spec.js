const { test, expect } = require('@playwright/test');

// The whole app is one ES module graph: a single bad import anywhere keeps
// every feature from initializing. These tests assert the graph loads and the
// features actually wire up — the exact failure mode that once went unnoticed.

// getScreenDetails() needs the window-management permission, which a test
// browser doesn't grant; that rejection is expected and not a boot failure.
const EXPECTED_NOISE = /window.?management|window.?placement|getScreenDetails|permission/i;

function collectProblems(page) {
    const problems = [];
    page.on('pageerror', err => problems.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') problems.push(`console.error: ${msg.text()}`);
    });
    return problems;
}

test('control panel boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await expect(page.locator('#startPresentationBtn')).toBeVisible();
    await expect(page.locator('#emptyState')).toBeVisible();
    // Without the window-management permission the app must not error — it
    // offers a button to request access via a user gesture instead.
    await expect(page.locator('#screensPermissionBtn')).toBeVisible();
    await page.waitForTimeout(1000); // let async module init surface errors
    expect(problems.filter(p => !EXPECTED_NOISE.test(p))).toEqual([]);
});

test('adding a file renders it in the playlist', async ({ page }) => {
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
    expect(problems.filter(p => !EXPECTED_NOISE.test(p))).toEqual([]);
});

test('presentation window boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/presentation.html');
    await expect(page.locator('#fullscreen-overlay')).toBeVisible();
    await page.waitForTimeout(1000);
    expect(problems.filter(p => !EXPECTED_NOISE.test(p))).toEqual([]);
});
