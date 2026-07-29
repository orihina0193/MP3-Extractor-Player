const CACHE_NAME = 'soundbox-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') {
    return;
  }
  
  const url = new URL(e.request.url);

  // Skip backend API calls, developer hot reloads, and browser extension queries
  if (url.pathname.startsWith('/api') || !url.protocol.startsWith('http')) {
    return;
  }
  
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      // Fetch from network and dynamically cache the successful response
      const fetchPromise = fetch(e.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(e.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((err) => {
          console.warn('Network request failed, relying on cache fallback:', err);
          return cachedResponse || Promise.reject(err);
        });

      // Check if the requested file is a hashed static asset (compiled by Vite), font, or static image
      const isStaticAsset = 
        url.pathname.includes('/assets/') || 
        url.pathname.endsWith('.js') || 
        url.pathname.endsWith('.css') ||
        url.pathname.endsWith('.woff2') ||
        url.pathname.endsWith('.png') ||
        url.pathname.endsWith('.jpg') ||
        url.pathname.endsWith('.jpeg') ||
        url.pathname.endsWith('.svg') ||
        url.pathname.endsWith('.ico');

      if (isStaticAsset) {
        // Cache-First strategy: Return cached asset immediately if available, otherwise fetch
        if (cachedResponse) {
          return cachedResponse;
        }
      }

      // Navigation & core files strategy: Network-First with Cache fallback (for index.html, root /, manifest etc.)
      if (
        url.pathname === '/' || 
        url.pathname === '/index.html' || 
        url.pathname === '/manifest.json'
      ) {
        return fetchPromise.catch(() => cachedResponse);
      }

      // Default strategy: Try cached response first, fallback to network
      return cachedResponse || fetchPromise;
    })
  );
});
