const CACHE_NAME = 'brotes-appshell-v3';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/login.html',
  '/register.html',
  '/dashboard.html',
  '/activities.html',
  '/maestro.html',
  '/css/home.css',
  '/css/styles.css',
  '/css/dashboard.css',
  '/css/admin.css',
  '/css/maestro.css',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/admin.js',
  '/js/activities.js',
  '/js/maestro.js',
  '/img/Logo.png',
  '/img/huerto.jpg',
  '/img/hojas-textura.jpg',
  '/manifest.json'
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

  // ⚠ PERMITIR navegación normal sin redirigir a index.html
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/index.html')));
    return;
  }

  // ⚠ NO CACHEAR LOGIN NI REGISTER NI SESIONES
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
