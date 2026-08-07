// Phnaek Pkay — service worker
// Caches the static app shell only. Live satellite tiles, geocoding calls,
// and other network requests always go straight to the network so imagery
// is never served stale from cache.
const CACHE_VERSION = 'phnaek-pkay-v2';
const APP_SHELL = [
  './',
  'index.html',
  '/manifest.webmanifest',
  '/src/lib/image-processing.js',
  '/src/lib/upscale.worker.js',
  '/assets/phnaek-pkay.svg',
  '/assets/icons/icon-192.png',
  '/assets/icons/icon-512.png',
  '/assets/icons/icon-maskable-192.png',
  '/assets/icons/icon-maskable-512.png',
  '/assets/icons/apple-touch-icon-180.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => {}) // never block install on a single missing asset
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_VERSION).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only manage same-origin app-shell files. Everything else (satellite
  // tile providers, geocoding APIs, ONNX model CDN, fonts, etc.) is left
  // completely untouched so it behaves exactly as it would with no
  // service worker at all.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
      // Stale-while-revalidate: show cached app shell instantly, refresh in background.
      return cached || network;
    })
  );
});
