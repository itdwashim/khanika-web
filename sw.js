/* Khanika web app - offline support. Pages are fetched fresh when online (so updates arrive on the next open)
   and served from the saved copy when offline. Requests to other sites (Google cloud sync) are never touched. */
const V = 'khanika-web-1.25.1';
const SHELL = ['./', 'index.html', 'web-shim.js', 'manifest.webmanifest', 'vendor/jspdf.umd.min.js', 'vendor/xlsx.full.min.js', 'vendor/qrcode.min.js', 'icons/icon-192.png', 'icons/icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(fetch(r).then(res => { if (res && res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; })
    .catch(() => caches.match(r).then(m => m || (r.mode === 'navigate' ? caches.match('index.html') : undefined))));
});
