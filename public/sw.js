// Service Worker para Portal de Promotoras Safira Cosméticos
// Suporte a Acesso Offline, Cache de Rotas e Sincronização em Segundo Plano

const CACHE_NAME = 'safira-promotoras-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/index.css'
];

// Install Event - Caching App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('[SW] Pre-cache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network first with Cache fallback for app pages, Cache first for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Skip non-GET or cross-origin API calls (like Firestore APIs or external calls)
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // Cache successful GET responses
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // Fallback to cache when offline
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // If navigating to page, fallback to index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
        return new Response('Conteúdo indisponível offline', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({ 'Content-Type': 'text/plain; charset=utf-8' })
        });
      })
  );
});

// Background Sync Listener for offline check-ins
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-visitas-offline') {
    console.log('[SW] Sincronização em segundo plano disparada.');
    event.waitUntil(
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: 'SYNC_OFFLINE_VISITAS' });
        });
      })
    );
  }
});
