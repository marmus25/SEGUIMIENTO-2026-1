// ============================================================
// SERVICE WORKER - Seguimiento Rápido PWA
// Prof. Marcelo - Música | Colegio N.S. del Pilar, Cochabamba
// ============================================================

const CACHE_NAME = 'seguimiento-musica-v2';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap'
];

// INSTALACIÓN: cachear recursos esenciales
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando recursos de la app...');
        return cache.addAll(URLS_TO_CACHE).catch(err => {
          console.warn('[SW] Algunos recursos no se pudieron cachear:', err);
        });
      })
      .then(() => self.skipWaiting())
  );
});

// ACTIVACIÓN: limpiar cachés antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// FETCH: estrategia Cache-First con fallback a red
self.addEventListener('fetch', event => {
  // Ignorar solicitudes no-GET y extensiones del browser
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension://')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          // Servir desde caché y actualizar en segundo plano
          fetch(event.request).then(networkResponse => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse);
              });
            }
          }).catch(() => {});
          return cachedResponse;
        }
        
        // No está en caché: ir a la red
        return fetch(event.request).then(networkResponse => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          // Guardar en caché para uso offline futuro
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // Sin red y sin caché: página offline
          if (event.request.destination === 'document') {
            return caches.match('./index.html');
          }
        });
      })
  );
});

// MENSAJE: forzar actualización desde la app
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker de Seguimiento Rápido cargado ✓');
