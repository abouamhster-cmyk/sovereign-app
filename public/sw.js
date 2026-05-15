// public/sw.js - Version avec cache offline
const CACHE_NAME = 'sovereign-v3';
const API_CACHE_NAME = 'sovereign-api-v3';
const OFFLINE_PAGE = '/offline';

// Fichiers à mettre en cache (statiques)
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/notification.mp3'
];

// URLs API à mettre en cache (GET uniquement)
const API_CACHE_URLS = [
  '/api/dashboard/today',
  '/api/life-map',
  '/api/memory/get',
  '/api/calendar/events'
];

// Installation - cache des assets statiques
self.addEventListener('install', (event) => {
  console.log('🔧 Installation SW avec offline support');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation - nettoyage des anciens caches
self.addEventListener('activate', (event) => {
  console.log('✅ Activation SW offline');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Requêtes API (GET)
  if (url.pathname.startsWith('/api/') && event.request.method === 'GET') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Mettre en cache la réponse
          const responseClone = response.clone();
          caches.open(API_CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline - retourner le cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Pas de cache, retourner une réponse d'erreur
            return new Response(
              JSON.stringify({ offline: true, message: 'Mode offline - données non disponibles' }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }
  
  // Requêtes statiques (HTML, JS, CSS)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        // Si offline et page demandée, retourner la page offline
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
        return new Response('Mode offline', { status: 200 });
      });
    })
  );
});
