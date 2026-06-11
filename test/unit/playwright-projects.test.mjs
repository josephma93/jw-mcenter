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
        projects.map(project => [
            project.name,
            project.testMatch,
            Object.prototype.hasOwnProperty.call(project.use, 'viewport') ? project.use.viewport : 'default',
        ]),
        [
            ['smoke', ['**/smoke/**/*.spec.mjs'], 'default'],
            ['multiscreen', ['**/multiscreen/**/*.spec.mjs'], null],
            ['strict-autoplay', ['**/strict-autoplay/**/*.spec.mjs'], null],
        ]
    );
    assert.equal(CHROME_CHANNEL, 'chrome');
    assert.equal(projects[0].use.launchOptions, undefined);
    assert.deepEqual(projects[1].use.launchOptions, {
        args: [SCREEN_INFO_ARG, NO_GESTURE_AUTOPLAY_ARG],
    });
    assert.deepEqual(projects[2].use.launchOptions, {
        args: [SCREEN_INFO_ARG, STRICT_AUTOPLAY_ARG],
    });
});

test('smoke stays baseline while multiscreen and strict share screen setup', () => {
    assert.equal(buildSmokeLaunchOptions(), undefined);
    assert.deepEqual(buildMultiscreenLaunchOptions(), {
        args: [SCREEN_INFO_ARG, NO_GESTURE_AUTOPLAY_ARG],
    });
    assert.deepEqual(buildStrictAutoplayLaunchOptions(), {
        args: [SCREEN_INFO_ARG, STRICT_AUTOPLAY_ARG],
    });
    assert.ok(!buildStrictAutoplayLaunchOptions().args.includes(NO_GESTURE_AUTOPLAY_ARG));
    assert.ok(buildStrictAutoplayLaunchOptions().args.includes(SCREEN_INFO_ARG));
});
