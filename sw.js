// Service worker — mise en cache de l'enveloppe applicative et des modules three.js
const VERSION = 'planche-coeur-v30';
const THREE = 'https://cdn.jsdelivr.net/npm/three@0.169.0/';
const SHELL = [
  './', './index.html', './css/style.css', './js/app.js', './js/heart.js', './js/valves.js',
  './js/contact-shadows.js', './js/cut-surface.js', './js/aortic-view.js', './js/av-views.js', './js/special-views.js', './js/data.js', './assets/heart.bin',
  './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/apple-touch-icon.png',
  THREE + 'build/three.module.js',
  THREE + 'examples/jsm/controls/OrbitControls.js',
  THREE + 'examples/jsm/renderers/CSS2DRenderer.js',
  THREE + 'examples/jsm/environments/RoomEnvironment.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok && (req.url.startsWith(self.location.origin) || req.url.startsWith(THREE))) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
