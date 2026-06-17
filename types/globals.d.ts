// Ambient declarations the checker can't get from any package.
// Checker-only — never served or executed.

declare module 'ejs/ejs.min.js' {
    const ejs: typeof import('ejs');
    export default ejs;
}

declare module 'virtual:pwa-register' {
    interface RegisterSWOptions {
        immediate?: boolean;
        onNeedReload?: () => void;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void;
        onRegisterError?: (error: unknown) => void;
    }

    export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

interface WorkerGlobalScope {
    __WB_MANIFEST: Array<{
        url: string;
        revision?: string | null;
    }>;
}

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
