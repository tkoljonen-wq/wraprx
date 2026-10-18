/*
 * WrapRx service worker: network first, välimuisti vain offline-tilaan.
 *
 * Kaikki GitHub Pages -sovellukset jakavat saman originin ja siten saman Cache
 * Storagen. Siksi välimuistilla on sovelluskohtainen etuliite, ja activate poistaa
 * VAIN omat vanhat välimuistit. localStorageen tai IndexedDB:hen ei kosketa.
 *
 * Build (vite.config.ts) korvaa paikkamerkit: __BUILD__ on build-tunniste ja
 * __PRECACHE__ buildin tiedostolista, jotta sovellus toimii offline jo ensimmäisen
 * käynnin jälkeen.
 */
const CACHE_PREFIX = 'wraprx-';
const CACHE_NAME = CACHE_PREFIX + '__BUILD__';
const PRECACHE = __PRECACHE__;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE.map((url) => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Vain oman sovelluksen polut: sama origin ja tämän SW:n scope.
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;

  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        caches
          .match(request, { ignoreSearch: true })
          .then((hit) => hit ?? (request.mode === 'navigate' ? caches.match('./index.html') : undefined))
          .then((hit) => hit ?? Response.error()),
      ),
  );
});
