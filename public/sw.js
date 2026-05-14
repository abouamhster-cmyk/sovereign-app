// Service Worker pour SOVEREIGN - Version Premium
const CACHE_NAME = 'sovereign-v3';

self.addEventListener('install', (event) => {
  console.log('🔧 Installation SW');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Activation SW');
  event.waitUntil(clients.claim());
});

// Gestion des notifications push avec SON et STYLE
self.addEventListener('push', (event) => {
  console.log('📨 Push reçu');
  
  let data = {
    title: 'SOVEREIGN',
    body: 'Nouvelle notification',
    url: '/',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    image: '/icons/icon-512x512.png',
    sound: '/sounds/notification.mp3',
    vibrate: [200, 100, 200],
    type: 'default',
    timestamp: Date.now()
  };
  
  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text();
    }
  }
  
  // Options de la notification
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    image: data.image,
    vibrate: data.vibrate,
    silent: data.silent === true,
    requireInteraction: data.requireInteraction === true,
    renotify: true,
    tag: data.tag || 'sovereign-notif',
    data: { url: data.url, type: data.type, timestamp: data.timestamp },
    actions: [
      { action: 'open', title: '📋 Ouvrir', icon: '/icons/icon-96x96.png' },
      { action: 'dismiss', title: '🔔 Plus tard', icon: '/icons/icon-96x96.png' }
    ]
  };
  
  // Actions spécifiques selon le type de notification
  switch (data.type) {
    case 'task':
      options.actions.unshift({ action: 'complete', title: '✅ Terminer', icon: '/icons/icon-96x96.png' });
      break;
    case 'win':
      options.actions.unshift({ action: 'celebrate', title: '🎉 Célébrer', icon: '/icons/icon-96x96.png' });
      break;
    case 'money':
      options.actions.unshift({ action: 'money', title: '💰 Voir finances', icon: '/icons/icon-96x96.png' });
      break;
    case 'family':
      options.actions.unshift({ action: 'family', title: '👨‍👩‍👧‍👦 Voir famille', icon: '/icons/icon-96x96.png' });
      break;
    case 'morning':
      options.actions.unshift({ action: 'morning', title: '🌅 Voir le chat', icon: '/icons/icon-96x96.png' });
      options.requireInteraction = false;
      break;
    default:
      // Pas d'action supplémentaire
      break;
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestion des clics sur les notifications
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action;
  let url = '/';
  
  // Déterminer l'URL en fonction de l'action ou du type
  switch (action) {
    case 'complete':
      url = '/tasks';
      break;
    case 'celebrate':
      url = '/wins';
      break;
    case 'money':
      url = '/money';
      break;
    case 'family':
      url = '/family';
      break;
    case 'morning':
      url = '/chat';
      break;
    case 'open':
    default:
      url = notificationData.url || '/';
      break;
  }
  
  // Si c'est une notification de type morning sans action spécifique
  if (notificationData.type === 'morning' && !action) {
    url = '/chat';
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(windowClients => {
        // Si une fenêtre est déjà ouverte, on l'utilise
        for (let client of windowClients) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        // Sinon, on ouvre une nouvelle fenêtre
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});
