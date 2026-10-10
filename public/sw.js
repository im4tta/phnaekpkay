/* Phnaek Pkay service worker.
   PRECACHE and VERSION are injected at build time (see vite.config.js); in dev they stay
   empty and the worker is not registered.

   - Navigations: network-first, falling back to the cached app shell when offline, so a
     deployed fix reaches users on their next load.
   - /static/* (content-hashed bundles and fonts): cache-first, they never change.
   - /assets/*, other same-origin GETs: stale-while-revalidate.
   - Big optional downloads (/vendor/ort, /models) and every cross-origin request (imagery
     tiles, geocoding) go straight to the network. */
const VERSION = /*__SW_VERSION__*/'dev';
const PRECACHE = /*__SW_PRECACHE__*/[];
const CACHE = 'phnaek-pkay-' + VERSION;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('phnaek-pkay-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const cacheable = (response) => response && response.status === 200 && response.type === 'basic';

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (cacheable(response)) cache.put('/', response.clone());
    return response;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (cacheable(response)) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request).then((response) => {
    if (cacheable(response)) cache.put(request, response.clone());
    return response;
  });
  if (hit) { refresh.catch(() => {}); return hit; }
  return refresh;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || request.headers.has('range')) return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/vendor/') || url.pathname.startsWith('/models/')) return;

  if (request.mode === 'navigate') event.respondWith(networkFirstNavigation(request));
  else if (url.pathname.startsWith('/static/')) event.respondWith(cacheFirst(request));
  else event.respondWith(staleWhileRevalidate(request));
});
