// Service worker: precache the app shell + every agent so the app works offline.
importScripts('version.js'); // sets self.APP_VERSION; changes on every build → triggers update

const CACHE = `agency-${self.APP_VERSION}`;
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'md.js',
  'version.js',
  'manifest.webmanifest',
  'data/index.json',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

async function cacheAgents(cache) {
  const { agents } = await (await cache.match('data/index.json')).json();
  const urls = agents.map((a) => `agents/${a.id}.md`);
  let next = 0;
  const worker = async () => {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (res.ok) await cache.put(url, res);
      } catch { /* best effort — fetched on demand later */ }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(SHELL.map((u) => new Request(u, { cache: 'no-cache' })));
      await cacheAgents(cache);
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('agency-') && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return; // API calls go straight to the network

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request.mode === 'navigate' ? 'index.html' : request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const res = await fetch(request);
        if (res.ok && res.type === 'basic') cache.put(request, res.clone());
        return res;
      } catch (err) {
        if (request.mode === 'navigate') return cache.match('index.html');
        throw err;
      }
    })()
  );
});
