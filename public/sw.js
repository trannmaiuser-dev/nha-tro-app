// Aloha Tran Home — Service Worker
const CACHE = 'aloha-v5'
const STATIC = ['/icons/icon-192x192.svg', '/manifest.json']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  // Delete ALL old caches on activate
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return
  // Never cache Next.js built assets or HMR files — let them always hit network
  if (e.request.url.includes('/_next/')) return
  if (e.request.url.includes('.hot-update.')) return
  // Bypass SW cache on hard reload (Ctrl+Shift+R) — let browser fetch fresh
  if (e.request.cache === 'reload' || e.request.cache === 'no-store') return
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.url.startsWith(self.location.origin)) {
        const clone = res.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return res
    }))
  )
})

// ── Push notification ────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return
  const data = e.data.json()
  e.waitUntil(
    self.registration.showNotification(data.title || 'Aloha Tran Home', {
      body:    data.body  || '',
      icon:    '/icons/icon-192x192.svg',
      badge:   '/icons/icon-192x192.svg',
      vibrate: [200, 100, 200],
      data:    data.data  || {},
      actions: [
        { action: 'accept', title: '✓ OK' },
        { action: 'reject', title: '✗ Từ chối' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const { action, notification: { data } } = e

  if (action === 'reject' && data.notificationId) {
    fetch('/api/notifications/action', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ notificationId: data.notificationId, action: 'rejected' }),
    }).catch(() => {})
  }

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) if ('focus' in c) return c.focus()
      return clients.openWindow('/dashboard')
    })
  )
})
