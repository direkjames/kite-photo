const CACHE = 'kite-photo-v1';
const SHELL = ['./', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

const withTimeout = (req, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('slow')), ms);
  fetch(req).then(r => { clearTimeout(t); resolve(r); }, err => { clearTimeout(t); reject(err); });
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fonts = /(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (url.origin !== location.origin && !fonts) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      if (fonts) {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      }
      const res = await withTimeout(req, 4000);
      if (res.ok) cache.put(req, res.clone());
      return res;
    } catch (err) {
      return (await cache.match(req, { ignoreSearch: true })) || (!fonts && await cache.match('./')) || Response.error();
    }
  })());
});
