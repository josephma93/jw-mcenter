// Ambient declarations the checker can't get from any package.
// Checker-only — never served or executed.

// EJS is loaded as a classic script (index.html) and used as a global.
// The signatures come from @types/ejs; this only declares that the module's
// API exists as `window.ejs`.
declare const ejs: typeof import('ejs');

// Window Management API (Chromium-only). Not in TypeScript's lib.dom (which
// only ships broadly-supported standards) and no @types package exists for
// it, so it is declared by hand. Spec: https://www.w3.org/TR/window-management/
interface ScreenDetailed extends Screen {
    readonly availLeft: number;
    readonly availTop: number;
    readonly left: number;
    readonly top: number;
    readonly isPrimary: boolean;
    readonly isInternal: boolean;
    readonly devicePixelRatio: number;
    readonly label: string;
}

interface ScreenDetails extends EventTarget {
    readonly screens: ScreenDetailed[];
    readonly currentScreen: ScreenDetailed;
    onscreenschange: ((this: ScreenDetails, ev: Event) => unknown) | null;
    oncurrentscreenchange: ((this: ScreenDetails, ev: Event) => unknown) | null;
}

interface Window {
    getScreenDetails(): Promise<ScreenDetails>;
}
