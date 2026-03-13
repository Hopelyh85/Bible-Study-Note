/* ── Service Worker v2 ── */
const VER   = 'bsn-v2';
const SHELL = ['./','./index.html','./manifest.json','./icon.svg'];

/* Install: cache shell */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER)
      .then(c => c.addAll(SHELL))
      .catch(() => {}) // fonts may fail offline, that's OK
  );
  self.skipWaiting();
});

/* Activate: remove old caches */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VER).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* Fetch: cache-first for shell, network-first for APIs */
self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (e.request.method !== 'GET') return;

  // GitHub API & external dicts: network only, no cache
  if (url.includes('api.github.com') ||
      url.includes('dict.naver.com') ||
      url.includes('wikipedia.org')  ||
      url.includes('google.com')) return;

  // Google Fonts: stale-while-revalidate
  if (url.includes('fonts.gstatic.com') || url.includes('fonts.googleapis.com')) {
    e.respondWith(
      caches.open(VER).then(c =>
        c.match(e.request).then(cached => {
          const fresh = fetch(e.request).then(res => { c.put(e.request, res.clone()); return res; }).catch(() => cached);
          return cached || fresh;
        })
      )
    );
    return;
  }

  // Shell: cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res.ok) caches.open(VER).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});
