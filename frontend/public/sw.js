/* Service worker mínimo — necessário para o Chrome oferecer instalação PWA. */
const CACHE = 'acompopms-shell-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest'])).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        if (response.ok && new URL(request.url).origin === self.location.origin) {
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  )
})
