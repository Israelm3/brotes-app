const CACHE_NAME = 'brotes-appshell-v3';
const BASE = self.location.origin;
const ASSETS_TO_CACHE = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/login.html`,
  `${BASE}/register.html`,
  `${BASE}/dashboard.html`,
  `${BASE}/activities.html`,
  `${BASE}/maestro.html`,
  `${BASE}/css/home.css`,
  `${BASE}/css/styles.css`,
  `${BASE}/css/dashboard.css`,
  `${BASE}/css/admin.css`,
  `${BASE}/css/maestro.css`,
  `${BASE}/js/auth.js`,
  `${BASE}/js/dashboard.js`,
  `${BASE}/js/admin.js`,
  `${BASE}/js/activities.js`,
  `${BASE}/js/maestro.js`,
  `${BASE}/img/logo.png`,
  `${BASE}/img/huerto.jpg`,
  `${BASE}/img/hojas-textura.jpg`,
  `${BASE}/manifest.json`
];
// Instalar
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
});

// Activar
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME ? caches.delete(key) : null))
    )
  );
});

// FETCH corregido
self.addEventListener('fetch', event => {
  const req = event.request;

  // PERMITIR navegación normal sin redirigir a index.html
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // NO CACHEAR LOGIN NI REGISTER NI SESIONES
  if (req.url.includes('/api/login') || req.url.includes('/api/register') || req.url.includes('/api/profile')) {
    event.respondWith(fetch(req));
    return;
  }

  // Cache First para assets
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req);
    })
  );
});
