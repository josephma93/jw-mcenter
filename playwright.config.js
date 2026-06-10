const { defineConfig } = require('@playwright/test');

// Uses the locally installed Chrome (the app is Chromium-only per the SRS),
// so no browser download is needed.
module.exports = defineConfig({
    testDir: 'test',
    use: {
        channel: 'chrome',
        baseURL: 'http://localhost:4317',
    },
    webServer: {
        command: 'node node_modules/http-server/bin/http-server src -p 4317 -c-1 --silent',
        port: 4317,
        reuseExistingServer: true,
    },
});
