// sw.js — Anbar İdarəetmə Service Worker
const CACHE_NAME = 'anbar-v3';
const SHELL_URLS = [
  './',
  './index.html',
  './defektler.html',
  './sifarisler.html',
  './manifest.json',
  'https://cdn.sheetjs.com/xlsx-0.20.2/package/dist/xlsx.full.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// HTML "qabıq" sorğusudurmu? (naviqasiya və ya birbaşa index.html/kök sorğusu)
function isShellRequest(request) {
  return request.mode === 'navigate' ||
    request.destination === 'document' ||
    request.url.endsWith('/index.html') ||
    request.url.endsWith('/');
}

self.addEventListener('fetch', (event) => {
  // Yalnız GET sorğularını idarə et
  if (event.request.method !== 'GET') return;

  if (isShellRequest(event.request)) {
    // Şəbəkə-əvvəlcə: onlayn olanda həmişə ən son index.html gətirilir və keş yenilənir.
    // Offline olanda isə saxlanmış son versiya göstərilir.
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then((cached) =>
          cached || new Response('Offline — bu səhifə hələ keşlənməyib', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          })
        )
      )
    );
    return;
  }

  // Digər fayllar (kitabxanalar və s.) üçün: əvvəlcə keşdən, yoxdursa şəbəkədən.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => cached || new Response('Offline', { status: 503 }));
    })
  );
});
