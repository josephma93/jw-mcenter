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
