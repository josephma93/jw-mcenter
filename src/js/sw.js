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

/**
 * @param {string} pathname
 * @returns {Promise<Response | undefined>}
 */
function matchDocument(pathname) {
    if (pathname === '/' || pathname === '/index.html') {
        return matchPrecache('/index.html');
    }
    if (pathname === '/presentation.html') {
        return matchPrecache('/presentation.html');
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
