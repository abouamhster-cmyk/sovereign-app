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
    image: '/icons/icon-512x512.png',  // Image principale (style)
    sound: '/sounds/notification.mp3',   // Son personnalisé
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
  
  // Options premium avec son et style
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    image: data.image,                    // Image de fond
    vibrate: [200, 100, 200, 100, 300],   // Vibration longue
    sound: data.sound,                     // Son personnalisé
    silent: false,                        // Ne pas être silencieux
    requireInteraction: true,              // Reste à l'écran
    renotify: true,                       // Notifie même si déjà vu
    tag: data.tag || 'sovereign-notif',
    data: { url: data.url, type: data.type },
    actions: [
      { action: 'open', title: '📋 Ouvrir', icon: '/icons/icon-96x96.png' },
      { action: 'dismiss', title: '🔔 Plus tard', icon: '/icons/icon-96x96.png' }
    ]
  };
  
  // Actions spécifiques selon le type
  if (data.type === 'task') {
    options.actions.unshift({ action: 'complete', title: '✅ Terminer', icon: '/icons/icon-96x96.png' });
  } else if (data.type === 'win') {
    options.actions.unshift({ action: 'celebrate', title: '🎉 Célébrer', icon: '/icons/icon-96x96.png' });
  } else if (data.type === 'money') {
    options.actions.unshift({ action: 'money', title: '💰 Voir finances', icon: '/icons/icon-96x96.png' });
  } else if (data.type === 'family') {
    options.actions.unshift({ action: 'family', title: '👨‍👩‍👧‍👦 Voir famille', icon: '/icons/icon-96x96.png' });
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Gestion des clics
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  let url = '/';
  switch (event.action) {
    case 'complete': url = '/tasks'; break;
    case 'celebrate': url = '/wins'; break;
    case 'money': url = '/money'; break;
    case 'family': url = '/family'; break;
    case 'open': default: url = event.notification.data?.url || '/'; break;
  }
  
  event.waitUntil(clients.openWindow(url));
});
