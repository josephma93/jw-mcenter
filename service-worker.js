const CACHE_NAME = 'presenter-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/presentation.html',
  '/manifest.json',
  // Add your icon assets, CSS, and any other static files here.
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        return response || fetch(event.request);
      })
  );
});
