// ponytail: minimal static cache — bump CACHE when shell assets change
const CACHE = 'smartbook-static-v4';
// The app can live in a subfolder (/reader/), so every path is relative to the worker's scope.
const BASE = new URL(self.registration.scope).pathname;
const PRECACHE = [
  '',
  'manifest.webmanifest',
  'logo.svg',
  'favicon.svg',
  'apple-touch-icon.png',
  'favicon-32x32.png',
  'favicon-16x16.png',
  'icon-192.png',
  'icon-512.png',
].map((path) => BASE + path);

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  const path = url.pathname.slice(BASE.length);
  if (path.startsWith('api') || path.startsWith('users') || path.startsWith('auth')) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(BASE)) ?? Response.error()),
    );
    return;
  }

  const cacheable =
    PRECACHE.includes(url.pathname)
    || path.startsWith('assets/');

  if (!cacheable) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          void caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    }),
  );
});
