const CACHE_NAME = 'recipe-assistant-v3';

// Install event - skip caching on install to prevent blocking
self.addEventListener('install', event => {
  console.log('Service worker installing...');
  self.skipWaiting();
});

// Fetch event - always fetch from network, minimal caching
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache static assets on successful fetch
        if (response && response.status === 200 && 
            (event.request.url.includes('/static/') || 
             event.request.url.includes('bootstrap') ||
             event.request.url.includes('fonts.googleapis'))) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache only for static assets
        return caches.match(event.request);
      })
  );
});

// Activate event - cleanup old caches and take control immediately
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service worker activated and claiming clients');
      return self.clients.claim();
    })
  );
});
