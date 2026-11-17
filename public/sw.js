// Service worker: the game works offline once loaded, but a new version shows up as soon as there is one.
// - The page itself (index.html) is fetched from the network first; the cached copy is only for offline.
// - Built assets (assets/*) have a content hash in their name, so a cached copy is always the right one.
// - Everything else (icons, manifest) is served from cache and refreshed in the background.
// Bump CACHE when this file's strategy changes, so old caches are dropped.
const CACHE = 'orbital-v3';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-48.png', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

const store = (req, res) => {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req, copy));
  }
  return res;
};

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/') || url.pathname.endsWith('/index.html')) {
    // Network first: always the latest page when online.
    e.respondWith(fetch(req, { cache: 'no-store' }).then((res) => store(req, res)).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
    return;
  }
  if (url.pathname.includes('/assets/')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => store(req, res))));
    return;
  }
  // Stale while revalidate.
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => store(req, res)).catch(() => hit);
      return hit || net;
    }),
  );
});
