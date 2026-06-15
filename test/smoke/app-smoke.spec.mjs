// @ts-check
import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
    mediaFixturesDir,
    mediaFixturePath,
    rejectedMediaFixturePrefix,
} from '../support/media-fixtures.mjs';
import {
    collectProblems,
    EXPECTED_PERMISSION_NOISE,
    expectNoProblems,
    flushFrames,
} from '../support/e2e-helpers.mjs';

/**
 * @param {import('@playwright/test').Page} page
 */
async function closeScreensPermissionDialog(page) {
    await page.locator('#screensPermissionDialog').evaluate(dialog => {
        if (dialog instanceof HTMLDialogElement && dialog.open) {
            dialog.close();
        }
    });
}

/**
 * @returns {string[]}
 */
function rejectedMediaFixturePaths() {
    return fs.readdirSync(mediaFixturesDir)
        .filter(fileName => fileName.startsWith(rejectedMediaFixturePrefix))
        .map(fileName => path.join(mediaFixturesDir, fileName))
        .sort();
}

test('control panel boots with permission-denied flow isolated to smoke', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await expect(page.getByTestId('page:control-panel')).toBeVisible();
    await expect(page.getByTestId('action:start-presentation')).toBeVisible();
    await expect(page.getByTestId('state:empty-results')).toBeVisible();
    await expect(page.getByTestId('screens-permission-dialog')).toBeVisible();
    await expect(page.getByTestId('action:grant-screens-permission')).toBeVisible();
    await expect(page.getByTestId('action:grant-screens-permission')).toBeFocused();

    await page.getByTestId('action:grant-screens-permission').click();
    await expect(page.getByTestId('state:screens-permission-status')).toContainText('No se pudo obtener acceso');
    await flushFrames(page);

    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('adding a deterministic fixture renders it in the playlist', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('smallPng'));
    await expect(page.getByTestId('files-list-item')).toHaveCount(1);
    await expect(page.getByTestId('files-list-item-name')).toHaveText(path.basename(mediaFixturePath('smallPng')));
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('dragging a playlist handle reorders files', async ({ page }) => {
    const problems = collectProblems(page);
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await closeScreensPermissionDialog(page);
    await page.getByTestId('field:files').setInputFiles([
        mediaFixturePath('smallPng'),
        mediaFixturePath('mp4'),
        mediaFixturePath('mp3'),
    ]);

    const itemNames = page.getByTestId('files-list-item-name');
    await expect(itemNames).toHaveText([
        path.basename(mediaFixturePath('smallPng')),
        path.basename(mediaFixturePath('mp4')),
        path.basename(mediaFixturePath('mp3')),
    ]);

    const firstHandle = page
        .getByTestId('files-list-item')
        .nth(0)
        .getByTestId('files-list-item-action:drag');
    const lastItem = page.getByTestId('files-list-item').nth(2);
    const handleBox = await firstHandle.boundingBox();
    const lastItemBox = await lastItem.boundingBox();
    if (!handleBox || !lastItemBox) {
        throw new Error('Expected playlist drag handle and drop target to be visible.');
    }
    const viewportHeight = await page.evaluate(() => window.innerHeight);
    const dropY = Math.min(lastItemBox.y + lastItemBox.height + 12, viewportHeight - 8);

    await page.mouse.move(handleBox.x + handleBox.width / 2, handleBox.y + handleBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2 + 24,
        { steps: 8 }
    );
    await page.mouse.move(
        lastItemBox.x + lastItemBox.width / 2,
        lastItemBox.y + lastItemBox.height / 2,
        { steps: 20 }
    );
    await page.mouse.move(
        lastItemBox.x + lastItemBox.width / 2,
        dropY,
        { steps: 20 }
    );
    await page.waitForTimeout(100);
    await page.mouse.up();
    await flushFrames(page);

    await expect(itemNames).toHaveText([
        path.basename(mediaFixturePath('mp4')),
        path.basename(mediaFixturePath('mp3')),
        path.basename(mediaFixturePath('smallPng')),
    ]);
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('unsupported files open and close a native dialog', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);

    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('unsupportedPdf'));

    await expect(page.getByTestId('unsupported-files-dialog')).toBeVisible();
    await expect(page.getByTestId('unsupported-files-list-item')).toHaveText(
        path.basename(mediaFixturePath('unsupportedPdf'))
    );
    await page.getByTestId('unsupported-files-dialog-close').click();
    await expect(page.getByTestId('unsupported-files-dialog')).toBeHidden();
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('chromium-decodable edge image fixtures import', async ({ page }) => {
    const problems = collectProblems(page);
    const edgeImageFixtures = [
        mediaFixturePath('avif'),
        mediaFixturePath('bmp'),
        mediaFixturePath('svg'),
    ];
    await page.goto('/');
    await closeScreensPermissionDialog(page);

    await page.getByTestId('field:files').setInputFiles(edgeImageFixtures);

    await expect(page.getByTestId('files-list-item')).toHaveCount(edgeImageFixtures.length);
    await expect(page.getByTestId('files-list-item-name')).toHaveText(
        edgeImageFixtures.map(filePath => path.basename(filePath))
    );
    await expect(page.getByTestId('unsupported-files-dialog')).toBeHidden();
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('rejected media fixtures are rejected from import', async ({ page }) => {
    const problems = collectProblems(page);
    const negativeFixturePaths = rejectedMediaFixturePaths();
    await page.goto('/');
    await closeScreensPermissionDialog(page);

    await page.getByTestId('field:files').setInputFiles(negativeFixturePaths);

    await expect(page.getByTestId('files-list-item')).toHaveCount(0);
    await expect(page.getByTestId('unsupported-files-dialog')).toBeVisible();
    await expect(page.getByTestId('unsupported-files-list-item')).toHaveText(
        negativeFixturePaths.map(filePath => path.basename(filePath))
    );
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('clear playlist confirmation uses native dialog return values', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/');
    await closeScreensPermissionDialog(page);
    await page.getByTestId('field:files').setInputFiles(mediaFixturePath('smallPng'));
    await expect(page.getByTestId('files-list-item')).toHaveCount(1);

    await page.getByTestId('action:clear-list').click();
    await expect(page.getByTestId('clear-list-dialog')).toBeVisible();
    await page.getByTestId('clear-list-dialog-cancel').click();
    await expect(page.getByTestId('clear-list-dialog')).toBeHidden();
    await expect(page.getByTestId('files-list-item')).toHaveCount(1);

    await page.getByTestId('action:clear-list').click();
    await page.getByTestId('clear-list-dialog-confirm').click();
    await expect(page.getByTestId('files-list-item')).toHaveCount(0);
    await expect(page.getByTestId('state:empty-results')).toBeVisible();
    expectNoProblems(problems, EXPECTED_PERMISSION_NOISE);
});

test('presentation window boots with no errors', async ({ page }) => {
    const problems = collectProblems(page);
    await page.goto('/presentation.html');
    await expect(page.getByTestId('page:presenter')).toBeVisible();
    await expect(page.getByTestId('state:fullscreen-prompt')).toBeVisible();
    await flushFrames(page);
    expectNoProblems(problems);
});
