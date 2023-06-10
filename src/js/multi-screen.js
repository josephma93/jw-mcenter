/** @typedef {'NOT_SUPPORTED'|'NO_PERMISSION'|'GRANTED'} PERMISSION_STATUS_KEYS */

/**
 * Enum representing permission status.
 * @public
 * @readonly
 * @constant
 * @typedef {Object<PERMISSION_STATUS_KEYS, PERMISSION_STATUS_KEYS>} PermissionStatus
 */
export const PermissionStatus = Object.freeze(Object.seal({
    NOT_SUPPORTED: 'NOT_SUPPORTED',
    NO_PERMISSION: 'NO_PERMISSION',
    GRANTED: 'GRANTED',
}));

const presenterWindowUrl = 'presenter.html';
/** @type {Screen} */
let screenDetails = window.screen;
/** @type {keyof PermissionStatus} */
let permissionStatus = PermissionStatus.NOT_SUPPORTED;
/** @type {number} */
let screenCount = 1;

function getFeaturesFromOptions(options) {
    return Object.entries(options).map(([key, value]) => `${key}=${value}`).join(',');
}

/**
 * @typedef MultiScreenStatus
 * @type {object}
 * @property {number} screenCount
 * @property {PERMISSION_STATUS_KEYS} permissionStatus
 * @property {boolean} canUseMultiScreenAPI
 */


/**
 * @returns {MultiScreenStatus}
 */
export function getMultiScreenSupportStatus() {
    return {
        screenCount,
        permissionStatus,
        canUseMultiScreenAPI: permissionStatus === PermissionStatus.GRANTED && screenCount > 1,
    };
}

export async function requestMultiScreenAccess() {

    if (permissionStatus === PermissionStatus.GRANTED) {
        return getMultiScreenSupportStatus();
    }

    if (!('getScreenDetails' in window)) {
        screenDetails = window.screen;
        permissionStatus = PermissionStatus.NOT_SUPPORTED;
        screenCount = 1;
        return;
    }

    try {
        screenDetails = await window.getScreenDetails();
        screenDetails.addEventListener('screenschange', (event) => {
            if (screenDetails.screens.length !== currentScreenLength) {
                screenCount = screenDetails.screens.length;
                updateScreenInfo();
            }
        });
        try {
            let status = await navigator.permissions.query({name: 'window-placement'});
            permissionStatus = status.state === 'granted'
                ? PermissionStatus.GRANTED
                : PermissionStatus.NO_PERMISSION;
        } catch (e) {
            console.error(e);
        }
        screenCount = screenDetails.screens.length;
    } catch (e) {
        console.error(e);
    }
    return getMultiScreenSupportStatus();
}

/**
 * @returns {WindowProxy}
 */
export function openPresenterWindow() {
    let screen = screenDetails.screens[screenCount - 1];
    let options = {
        x: screen.availLeft,
        y: screen.availTop,
        width: screen.availWidth,
        height: screen.availHeight,
    };
    return window.open(presenterWindowUrl, '_blank', getFeaturesFromOptions(options));
}

export default function initMultiScreenPermissionWhenPossible() {
    const ua = navigator.userActivation;
    if (!!ua) {
        const pollingRate = 1000;
        setTimeout(function pollHasBeenActive() {
            if (ua.hasBeenActive) {
                requestMultiScreenAccess().then(console.log);
            } else {
                setTimeout(pollHasBeenActive, pollingRate);
            }
        }, pollingRate);
    }
}
