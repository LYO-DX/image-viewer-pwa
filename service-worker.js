const CACHE_NAME = 'image-viewer-cache-v1';
const FILES_TO_CACHE = [
  '/index.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  '/images/sample1.jpg'
];

self.addEventListener('install', (evt) => {
  evt.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evt) => {
  evt.waitUntil(self.clients.claim());
});

/* fetch handling:
   - serve cached files when available
   - specially handle '/current-user-image' to return cached user image if exists
*/
self.addEventListener('fetch', (evt) => {
  const url = new URL(evt.request.url);

  // Serve '/current-user-image' from cache if exists (our custom key)
  if (url.pathname === '/current-user-image') {
    evt.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const match = await cache.match('/current-user-image');
        if (match) return match;
        // fallback to 404-like response
        return fetch(evt.request).catch(() => new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Normal assets: try cache then network
  evt.respondWith(
    caches.match(evt.request).then((resp) => {
      return resp || fetch(evt.request).catch(() => {
        // If fetch fails (offline), and request is for an image, try sample fallback
        if (evt.request.destination === 'image') {
          return caches.match('/images/sample1.jpg');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
