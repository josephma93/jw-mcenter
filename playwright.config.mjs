// @ts-check
import { defineConfig } from '@playwright/test';
import { CHROME_CHANNEL, createProjectDefinitions } from './test/support/playwright-projects.mjs';
import { createPlaywrightDevServer } from './test/support/worktree-dev-server.mjs';

const devServer = createPlaywrightDevServer();

// Uses the locally installed Chrome (the app is Chromium-only per the SRS),
// so no browser download is needed.
export default defineConfig({
    testDir: 'test',
    testIgnore: ['**/fixtures/**', '**/support/**', '**/unit/**'],
    use: {
        channel: CHROME_CHANNEL,
        baseURL: devServer.baseURL,
    },
    projects: createProjectDefinitions(),
    webServer: devServer.webServer,
});
