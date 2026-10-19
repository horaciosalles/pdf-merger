/**
 * PDF Toolkit Service Worker (repo root → scope covers the whole app).
 * Network-first for same-origin GETs so new releases are picked up, with a
 * cache fallback for offline use. Bump CACHE_VERSION on each release.
 */

const CACHE_VERSION = 'v2';
const CACHE_NAME = `pdf-toolkit-${CACHE_VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './src/css/main.css',
  './src/css/responsive.css',
  './src/js/config.js',
  './src/js/app.js',
  './src/js/modules/pdfHelper.js',
  './src/js/modules/fileHandler.js',
  './src/js/modules/render.js',
  './src/js/modules/workspace.js',
  './src/js/modules/merger.js',
  './src/js/modules/splitter.js',
  './src/js/modules/encryptor.js',
  './src/js/modules/processor.js',
  './src/js/modules/pageEditor.js',
  './src/js/modules/ui.js',
  './src/lib/pdf-lib.min.js',
  './src/lib/pdf.min.js',
  './src/lib/pdf.worker.min.js',
  './src/lib/Sortable.min.js',
  './src/lib/fflate.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(err => console.warn('Precache partial:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.location.origin)) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || (event.data && event.data.type === 'SKIP_WAITING')) self.skipWaiting();
});
