// @ts-check
import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';

/** @type {ServiceWorkerGlobalScope & typeof globalThis & { __WB_MANIFEST: Array<{ url: string, revision?: string | null }> }} */
const serviceWorkerSelf = /** @type {ServiceWorkerGlobalScope & typeof globalThis & { __WB_MANIFEST: Array<{ url: string, revision?: string | null }> }} */ (self);

serviceWorkerSelf.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        void serviceWorkerSelf.skipWaiting();
    }
});

clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST, {
    cleanURLs: false,
});

const registrationScopePath = normalizeScopePathname(
    new URL(serviceWorkerSelf.registration.scope).pathname
);

/**
 * @param {string} scopePathname
 * @returns {string}
 */
function normalizeScopePathname(scopePathname) {
    if (!scopePathname || scopePathname === '/') {
        return '/';
    }

    return scopePathname.endsWith('/') ? scopePathname : `${scopePathname}/`;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
function toScopeRelativePath(pathname) {
    if (registrationScopePath === '/') {
        return pathname;
    }

    const scopeWithoutTrailingSlash = registrationScopePath.slice(0, -1);
    if (pathname === scopeWithoutTrailingSlash) {
        return '/';
    }

    if (!pathname.startsWith(registrationScopePath)) {
        return pathname;
    }

    const relativePathname = pathname.slice(registrationScopePath.length);
    return relativePathname ? `/${relativePathname}` : '/';
}

/**
 * @param {string[]} precacheKeys
 * @returns {Promise<Response | undefined>}
 */
async function matchAnyPrecache(precacheKeys) {
    for (const precacheKey of precacheKeys) {
        const cached = await matchPrecache(precacheKey);
        if (cached) {
            return cached;
        }
    }

    return undefined;
}

/**
 * @param {string} pathname
 * @returns {Promise<Response | undefined>}
 */
function matchDocument(pathname) {
    const scopeRelativePath = toScopeRelativePath(pathname);

    if (scopeRelativePath === '/' || scopeRelativePath === '/index.html') {
        return matchAnyPrecache(['index.html', './index.html', '/index.html']);
    }
    if (scopeRelativePath === '/presentation.html') {
        return matchAnyPrecache([
            'presentation.html',
            './presentation.html',
            '/presentation.html',
        ]);
    }

    return Promise.resolve(undefined);
}

serviceWorkerSelf.addEventListener('fetch', event => {
    if (event.request.mode !== 'navigate') {
        return;
    }

    const pathname = new URL(event.request.url).pathname;
    event.respondWith((async () => {
        const cached = await matchDocument(pathname);
        return cached ?? fetch(event.request);
    })());
});
