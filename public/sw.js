// public/sw.js - Service Worker SOVEREIGN
const CACHE_NAME = 'sovereign-v4';
const API_CACHE_NAME = 'sovereign-api-v4';
const OFFLINE_PAGE = '/offline';

// Fichiers statiques à mettre en cache
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/sounds/notification.mp3'
];

// URLs API à mettre en cache
const API_CACHE_URLS = [
  '/api/dashboard/today',
  '/api/life-map',
  '/api/memory/get',
  '/api/calendar/events'
];

// Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installation...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('📦 Cache des assets statiques');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activé');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME && key !== API_CACHE_NAME) {
            console.log('🗑️ Suppression ancien cache:', key);
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
  
  // Ignorer les requêtes non-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorer les requêtes d'analyse (évite les erreurs)
  if (url.pathname.includes('sentry') || url.pathname.includes('analytics')) return;
  
  // Requêtes API (mode stale-while-revalidate)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(API_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          }).catch(() => {
            console.log('⚠️ Offline - retour du cache pour:', url.pathname);
            return cachedResponse;
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }
  
  // Requêtes statiques (HTML, JS, CSS)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => {
        console.log('📴 Offline - page demandée:', url.pathname);
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_PAGE);
        }
        return new Response('Mode hors ligne', { status: 200 });
      });
    })
  );
});
