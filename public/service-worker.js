const VERSION = 'v1'
const STATIC_CACHE = `sisorchestra-static-${VERSION}`
const RUNTIME_CACHE = `sisorchestra-runtime-${VERSION}`

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/sisorchestra-icon.svg',
  '/sisorchestra-icon-192.png',
  '/sisorchestra-icon-512.png',
  '/sisorchestra-icon-512-maskable.png',
  '/sisorchestra-apple-180.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => ![STATIC_CACHE, RUNTIME_CACHE].includes(key)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          return cached || caches.match('/offline.html')
        }),
    )
    return
  }

  const destination = request.destination
  const isStaticAsset = ['style', 'script', 'image', 'font'].includes(destination)

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request)
          .then((response) => {
            const responseClone = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone))
            return response
          })
          .catch(() => cached)
        return cached || networkFetch
      }),
    )
    return
  }

  if (request.url.startsWith(self.location.origin)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, responseClone))
          return response
        })
        .catch(() => caches.match(request)),
    )
  }
})
