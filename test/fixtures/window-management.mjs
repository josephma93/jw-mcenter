// @ts-check
import { test as base } from '@playwright/test';

/** @typedef {{ pageWithWindowManagement: import('@playwright/test').Page }} WindowManagementFixtures */

/**
 * @param {import('@playwright/test').Browser} browser
 * @param {import('@playwright/test').BrowserContext} context
 * @param {import('@playwright/test').Page} page
 */
async function resolveBrowserContextId(browser, context, page) {
    const browserSession = await browser.newBrowserCDPSession();
    try {
        const pageSession = await context.newCDPSession(page);
        const { targetInfo } = await pageSession.send('Target.getTargetInfo');
        const { targetInfos } = await browserSession.send('Target.getTargets');
        const match = targetInfos.find(info => info.targetId === targetInfo.targetId);
        if (!match?.browserContextId) {
            throw new Error('Could not resolve browserContextId for Browser.grantPermissions.');
        }
        return {
            browserContextId: match.browserContextId,
            browserSession,
        };
    } catch (error) {
        await browserSession.detach();
        throw error;
    }
}

/** @type {import('@playwright/test').TestType<WindowManagementFixtures, {}>} */
export const test = base.extend({
    pageWithWindowManagement: async ({ baseURL, browser, context, page }, use) => {
        if (!baseURL) {
            throw new Error('baseURL is required for the window-management fixture.');
        }

        const { browserContextId, browserSession } = await resolveBrowserContextId(browser, context, page);
        try {
            await browserSession.send('Browser.grantPermissions', {
                origin: baseURL,
                browserContextId,
                permissions: ['windowManagement'],
            });
            await use(page);
        } finally {
            await browserSession.send('Browser.resetPermissions', { browserContextId }).catch(() => {});
            await browserSession.detach().catch(() => {});
        }
    },
});

export { expect } from '@playwright/test';
