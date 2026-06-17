// @ts-check
import { test, expect } from '@playwright/test';
import {
    closeScreensPermissionDialog,
    collectProblems,
    dismissPwaPrompt,
    expectNoProblems,
    waitForServiceWorkerControl,
} from '../support/e2e-helpers.mjs';

test('control panel boots offline after the service worker takes control', async ({ context, page }) => {
    const problems = collectProblems(page);

    await page.goto('/');
    await waitForServiceWorkerControl(page);
    await closeScreensPermissionDialog(page);
    await dismissPwaPrompt(page);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('page:control-panel')).toBeVisible();
    await expect(page.getByTestId('action:start-presentation')).toBeVisible();
    expectNoProblems(problems, /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/);
});

test('presenter page boots offline after the service worker takes control', async ({ context, page }) => {
    const problems = collectProblems(page);

    await page.goto('/presentation.html');
    await waitForServiceWorkerControl(page);

    await context.setOffline(true);
    await page.reload();

    await expect(page.getByTestId('page:presenter')).toBeVisible();
    await expect(page.getByTestId('state:fullscreen-prompt')).toBeVisible();
    expectNoProblems(problems, /Failed to load resource: net::ERR_INTERNET_DISCONNECTED/);
});
