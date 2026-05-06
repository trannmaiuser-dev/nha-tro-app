/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
// Custom push notification handler — merged into workbox SW by next-pwa

self.addEventListener('push', function (event) {
  if (!event.data) return;
  const data = event.data.json();
  const title = data.title || 'Aloha Tran Home';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192x192.svg',
    badge: '/icons/icon-192x192.svg',
    data: data.data || {},
    vibrate: [200, 100, 200],
    actions: [{
      action: 'accept',
      title: '✓ OK'
    }, {
      action: 'reject',
      title: '✗ Từ chối'
    }]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const action = event.action;
  const data = event.notification.data;
  event.waitUntil(clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then(function (clientList) {
    // If there's an open window, focus it
    for (const client of clientList) {
      if ('focus' in client) return client.focus();
    }
    // Otherwise open a new window
    if (clients.openWindow) {
      return clients.openWindow('/dashboard');
    }
  }));

  // If rejected, call action API
  if (action === 'reject' && data.notificationId) {
    fetch('/api/notifications/action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        notificationId: data.notificationId,
        action: 'rejected'
      })
    }).catch(() => {});
  }
});
/******/ })()
;