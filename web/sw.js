// CryptoAI Pro — Service Worker for PWA
const CACHE_NAME = 'cryptoai-v5';
const STATIC_ASSETS = ['/', '/index.html', '/app.js', '/style.css', '/icon-512.png'];

// Install — cache static assets
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Fetch — network first, fallback to cache (important for real-time data)
self.addEventListener('fetch', e => {
  // Always go network for API calls
  if (e.request.url.includes('/api/') || e.request.url.includes('coingecko') || e.request.url.includes('binance') || e.request.url.includes('alternative.me')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  // Static assets: network first, cache fallback
  e.respondWith(
    fetch(e.request).then(r => {
      const clone = r.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return r;
    }).catch(() => caches.match(e.request))
  );
});
