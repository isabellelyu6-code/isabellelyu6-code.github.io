// Lyra service worker: makes the app installable and lets the pages open offline.
// Pages are network-first (always the newest version when online); data never goes through here.
const CACHE = 'lyra-v1';
const SHELL = ['./', './journal/', './manifest.webmanifest', './icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === self.location.origin;
  const cdn = /(^|\.)(jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname);
  if (!same && !cdn) return; // Supabase, weather etc. go straight to the network
  if (same) {
    e.respondWith(fetch(r).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    }).catch(() => caches.match(r, {ignoreSearch: true}).then(m => m || caches.match('./'))));
  } else {
    e.respondWith(caches.match(r).then(m => m || fetch(r).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
      return res;
    })));
  }
});
