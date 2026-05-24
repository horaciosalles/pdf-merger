/**
 * PDF Toolkit Service Worker
 * Enables offline functionality and caches static assets
 */

const CACHE_NAME = 'pdf-toolkit-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './src/css/main.css',
  './src/css/responsive.css',
  './src/js/config.js',
  './src/js/app.js',
  './src/js/modules/fileHandler.js',
  './src/js/modules/pdfHelper.js',
  './src/js/modules/merger.js',
  './src/js/modules/splitter.js',
  './src/js/modules/encryptor.js',
  './src/js/modules/processor.js',
  './src/js/modules/ui.js',
  './src/js/workers/pdfWorker.js',
  './src/lib/pdf-lib.min.js',
  './src/lib/Sortable.min.js',
  './manifest.json'
];

/**
 * Install event - cache assets
 */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Caching assets');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Service Worker: Some assets failed to cache', err);
        // Continue even if some assets fail to cache
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if available
      if (response) {
        return response;
      }

      // Fetch from network
      return fetch(event.request).then((response) => {
        // Don't cache non-successful responses
        if (!response || response.status !== 200 || response.type === 'error') {
          return response;
        }

        // Clone response for caching
        const responseToCache = response.clone();

        // Cache successful responses
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch((error) => {
        console.log('Service Worker: Fetch error', error);
        // Return offline page or cached version if available
        return caches.match('./index.html');
      });
    })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

/**
 * Background sync for future enhancement
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(
      // Placeholder for future sync functionality
      Promise.resolve()
    );
  }
});

/**
 * Message handling for client communication
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.delete(CACHE_NAME).then(() => {
      console.log('Service Worker: Cache cleared');
    });
  }
});
