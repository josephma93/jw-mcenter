// @ts-check
import { defineConfig } from '@playwright/test';
import { CHROME_CHANNEL, createProjectDefinitions } from './test/support/playwright-projects.mjs';

// Uses the locally installed Chrome (the app is Chromium-only per the SRS),
// so no browser download is needed.
export default defineConfig({
    testDir: 'test',
    testIgnore: ['**/fixtures/**', '**/support/**', '**/unit/**'],
    use: {
        channel: CHROME_CHANNEL,
        baseURL: 'http://localhost:4317',
    },
    projects: createProjectDefinitions(),
    webServer: {
        command: 'node node_modules/http-server/bin/http-server src -p 4317 -c-1 --silent',
        port: 4317,
        reuseExistingServer: true,
    },
});
