var CACHE_NAME = 'order-con-caches';
var urlsToCache = [
    'https://order-con-ai.onrender.com/live2d/',
    'https://order-con-ai.onrender.com/live2d/bundle.js',
];

self.addEventListener('install', function(event) {
    console.log('[ServiceWorker] Install');
    event.waitUntil(caches
        .open(CACHE_NAME)
        .then(function(cache) {
            return cache.addAll(urlsToCache);
        })
    );
});

self.addEventListener('activate', function(event) {
    console.log('[ServiceWorker] Activate');
});

self.addEventListener('fetch', function(event) {
    event.respondWith(caches
        .match(event.request)
        .then(function(response) {
            return response ? response : fetch(event.request);
        })
    );
});