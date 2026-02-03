// Wisteria ATS - Service Worker for Push Notifications

const CACHE_NAME = 'wisteria-client-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = {
    title: 'Wisteria ATS',
    body: '新しい通知があります',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'wisteria-notification',
    url: '/client/dashboard',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      console.error('[SW] Error parsing push data:', e);
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: data.badge || '/icons/icon-192.png',
    tag: data.tag || 'wisteria-notification',
    data: {
      url: data.url || '/client/dashboard',
    },
    vibrate: [100, 50, 100],
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/client/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes('/client') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Background sync (optional, for offline support)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
});
