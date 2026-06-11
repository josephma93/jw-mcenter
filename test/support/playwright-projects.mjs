// @ts-check

export const CHROME_CHANNEL = 'chrome';
export const SCREEN_INFO_ARG = '--screen-info={1920x1080}{1920,0 1280x720}';
export const NO_GESTURE_AUTOPLAY_ARG = '--autoplay-policy=no-user-gesture-required';
export const STRICT_AUTOPLAY_ARG = '--autoplay-policy=document-user-activation-required';

export function buildSmokeLaunchOptions() {
    return undefined;
}

export function buildScreenInfoArgs() {
    return [SCREEN_INFO_ARG];
}

export function buildMultiscreenLaunchOptions() {
    return {
        args: [
            ...buildScreenInfoArgs(),
            NO_GESTURE_AUTOPLAY_ARG,
        ],
    };
}

export function buildStrictAutoplayLaunchOptions() {
    return {
        args: [
            ...buildScreenInfoArgs(),
            STRICT_AUTOPLAY_ARG,
        ],
    };
}

export function createProjectDefinitions() {
    return [
        {
            name: 'smoke',
            testMatch: ['**/smoke/**/*.spec.mjs'],
            use: {},
        },
        {
            name: 'multiscreen',
            testMatch: ['**/multiscreen/**/*.spec.mjs'],
            use: {
                viewport: null,
                launchOptions: buildMultiscreenLaunchOptions(),
            },
        },
        {
            name: 'strict-autoplay',
            testMatch: ['**/strict-autoplay/**/*.spec.mjs'],
            use: {
                viewport: null,
                launchOptions: buildStrictAutoplayLaunchOptions(),
            },
        },
    ];
}
