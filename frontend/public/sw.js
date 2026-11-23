/* Service worker mínimo — ajuda o Chrome a oferecer instalação PWA.
 * Não intercepta API/Auth/REST (evita quebrar health-check e login). */
const CACHE = 'acompopms-shell-v2'

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE)
        await cache.addAll(['/', '/manifest.webmanifest'])
      } catch {
        // Certificado local / rede: não impedir ativação do SW.
      }
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  // Apenas documentos de navegação — nunca /auth, /rest, /functions, etc.
  if (request.mode !== 'navigate') return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        if (response.ok) {
          void caches.open(CACHE).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/'))),
  )
})
