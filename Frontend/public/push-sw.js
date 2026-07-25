// public/push-sw.js
// Push notification service worker helper

self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AgroFlow+', {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png', 
      tag: data.tag || 'agroflow',
      data: { url: data.url || '/' },
      vibrate: [200, 100, 200],
      image: data.image || undefined,
      actions: [
        {
          action: 'open',
          title: 'View',
        },
        {
          action: 'close',
          title: 'Dismiss',
        },
      ],
    })
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  } else if (event.action === 'close') {
    // Just close the notification
    return;
  } else {
    // Default - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        const url = event.notification.data?.url || '/';
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
    );
  }
});

// Log service worker installation
self.addEventListener('install', (event) => {
  console.log('[Push SW] Installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Push SW] Activating...');
  event.waitUntil(clients.claim());
});