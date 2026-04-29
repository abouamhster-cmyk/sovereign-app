// Service Worker pour SOVEREIGN - Version simplifiée
const CACHE_NAME = 'sovereign-v2';

self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installation...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activation...');
  event.waitUntil(clients.claim());
});

// Gestion des notifications push
self.addEventListener('push', (event) => {
  console.log('📨 Push reçu');
  
  let data = {
    title: 'SOVEREIGN',
    body: 'Nouvelle notification',
    url: '/',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png'
  };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    requireInteraction: true,
    data: { url: data.url }
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestion du clic
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(clients.openWindow(url));
});

// Mode hors-ligne basique
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;
  
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request).then(response => {
        if (response) return response;
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        return new Response('Hors-ligne', { status: 503 });
      });
    })
  );
});
