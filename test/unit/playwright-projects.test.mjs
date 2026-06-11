// @ts-check
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildMultiscreenLaunchOptions,
    buildSmokeLaunchOptions,
    buildStrictAutoplayLaunchOptions,
    CHROME_CHANNEL,
    createProjectDefinitions,
    NO_GESTURE_AUTOPLAY_ARG,
    SCREEN_INFO_ARG,
    STRICT_AUTOPLAY_ARG,
} from '../support/playwright-projects.mjs';

test('project definitions stay isolated by suite path', () => {
    const projects = createProjectDefinitions();
    assert.deepEqual(
        projects.map(project => [project.name, project.testMatch]),
        [
            ['smoke', ['**/smoke/**/*.spec.mjs']],
            ['multiscreen', ['**/multiscreen/**/*.spec.mjs']],
            ['strict-autoplay', ['**/strict-autoplay/**/*.spec.mjs']],
        ]
    );
    assert.equal(CHROME_CHANNEL, 'chrome');
});

test('smoke and multiscreen keep permissive autoplay separate from strict', () => {
    assert.deepEqual(buildSmokeLaunchOptions(), {
        args: [NO_GESTURE_AUTOPLAY_ARG],
    });
    assert.deepEqual(buildMultiscreenLaunchOptions(), {
        args: [SCREEN_INFO_ARG, NO_GESTURE_AUTOPLAY_ARG],
    });
    assert.deepEqual(buildStrictAutoplayLaunchOptions(), {
        args: [STRICT_AUTOPLAY_ARG],
    });
    assert.ok(!buildStrictAutoplayLaunchOptions().args.includes(NO_GESTURE_AUTOPLAY_ARG));
    assert.ok(!buildStrictAutoplayLaunchOptions().args.includes(SCREEN_INFO_ARG));
});
