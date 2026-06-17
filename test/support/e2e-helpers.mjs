// @ts-check
import { expect } from '@playwright/test';

export const EXPECTED_PERMISSION_NOISE =
    /window.?management|window.?placement|getScreenDetails|permission/i;

/**
 * @param {import('@playwright/test').Page} page
 * @returns {string[]}
 */
export function collectProblems(page) {
    /** @type {string[]} */
    const problems = [];
    page.on('pageerror', err => problems.push(`pageerror: ${err.message}`));
    page.on('console', msg => {
        if (msg.type() === 'error') {
            problems.push(`console.error: ${msg.text()}`);
        }
    });
    return problems;
}

/**
 * Let queued layout/effect work finish without a timed sleep.
 * @param {import('@playwright/test').Page} page
 */
export async function flushFrames(page) {
    await page.evaluate(() => new Promise(resolve => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
    }));
}

/**
 * @param {string[]} problems
 * @param {RegExp | null} mask
 */
export function expectNoProblems(problems, mask = null) {
    const relevant = mask ? problems.filter(problem => !mask.test(problem)) : problems;
    expect(relevant).toEqual([]);
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function waitForServiceWorkerControl(page) {
    await page.waitForFunction(async () => {
        if (!('serviceWorker' in navigator)) {
            return false;
        }
        const registration = await navigator.serviceWorker.ready;
        return Boolean(registration.active) && Boolean(navigator.serviceWorker.controller);
    });
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function dismissPwaPrompt(page) {
    const prompt = page.getByTestId('pwa-prompt');
    if (await prompt.isVisible().catch(() => false)) {
        await page.getByTestId('pwa-prompt-dismiss').click();
        await expect(prompt).toBeHidden();
    }
}

/**
 * @param {import('@playwright/test').Page} page
 */
export async function closeScreensPermissionDialog(page) {
    await page.locator('#screensPermissionDialog').evaluate(dialog => {
        if (dialog instanceof HTMLDialogElement && dialog.open) {
            dialog.close();
        }
    });
}
