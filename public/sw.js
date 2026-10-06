// Offline shell so the player card opens without a connection.
const CACHE = 'brawl-v17';
const SHELL = [
  './', 'index.html', 'tokens.css', 'styles.css', 'app.js', 'store.js', 'game.js', 'manifest.webmanifest',
  'assets/background-starfield.svg', 'assets/ball.svg', 'assets/player-side-you.svg', 'assets/player-side-bradly.svg',
  'assets/player-top-you.svg', 'assets/player-top-cpu.svg', 'icons/icon-192.png', 'event.ics',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.pathname.includes('/api/')) return; // live RSVP count always goes to the network

  // Fonts: cache first. Everything else: network first, falling back to the cache offline.
  if (url.host.endsWith('fonts.googleapis.com') || url.host.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(request).then((hit) => hit || fetch(request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy));
      return res;
    })));
    return;
  }
  if (url.origin !== location.origin) return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
