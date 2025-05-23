const CACHE_NAME = 'brickbreaker-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/icon.png',
  '/og_image.png',
  '/style.css',
  '/game.js',
  // 필요시 이미지, 오디오 등 추가
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
}); 