const CACHE_NAME = 'image-viewer-cache-v1';
const FILES_TO_CACHE = [
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'images/sample1.jpg'
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

self.addEventListener('fetch', (evt) => {
  const reqUrl = new URL(evt.request.url);

  // Serve user image stored under the key 'current-user-image' in cache
  if (reqUrl.pathname.endsWith('/current-user-image') || reqUrl.pathname.endsWith('current-user-image')) {
    evt.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const match = await cache.match('current-user-image');
        if (match) return match;
        return new Response('', { status: 404 });
      })
    );
    return;
  }

  // Normal assets: try cache then network
  evt.respondWith(
    caches.match(evt.request).then((resp) => {
      return resp || fetch(evt.request).catch(() => {
        if (evt.request.destination === 'image') {
          return caches.match('images/sample1.jpg');
        }
        return new Response('', { status: 503 });
      });
    })
  );
});
