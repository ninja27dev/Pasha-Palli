// ============================================================================
// PASHA PALLI — Service Worker (Offline & PWA Engine)
// Provides 100% offline capability, instant load & cache management for Android & Web
// ============================================================================

const CACHE_NAME = 'pasha-palli-v1.0.1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './preview.js',
  './manifest.json',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/favicon.png',
  './assets/sprites/cell_crimson.png',
  './assets/sprites/cell_emerald.png',
  './assets/sprites/charkoni_center.png',
  './assets/sprites/mark_safe_x.png',
  './assets/sprites/cell_glow_highlight.png',
  './assets/sprites/pawn_red.png',
  './assets/sprites/pawn_green.png',
  './assets/sprites/pawn_yellow.png',
  './assets/sprites/pawn_blue.png',
  './assets/sprites/pasa_face_1.png',
  './assets/sprites/pasa_face_2.png',
  './assets/sprites/pasa_face_3.png',
  './assets/sprites/pasa_face_4.png',
  './assets/sprites/pasa_face_5.png',
  './assets/sprites/pasa_face_6.png',
  './assets/sprites/cowrie_open.png',
  './assets/sprites/cowrie_closed.png'
];

// Install: Pre-cache all core game assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate: Purge old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch: Cache-first strategy for local assets, network-fallback for fonts/CDN
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // If request is from Google Fonts or external CDN, try network first with cache fallback
  if (url.origin.includes('fonts.googleapis.com') || url.origin.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return fetch(event.request)
          .then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => caches.match(event.request));
      })
    );
    return;
  }

  // Local assets: Cache-First, fallback to Network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate pattern)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {
          // Ignore network errors when offline
        });
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    })
  );
});
