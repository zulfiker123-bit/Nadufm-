const CACHE_VERSION = 'nadufm-pwa-v11';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;

const PRECACHE_URLS = [
  '/',
  '/fonts.css',
  '/style.css?v=11',
  '/script.js?v=11',
  '/student-picker.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/logo.png',
  '/home-icon.png',
  '/header.jpg',
  '/kalpurush.ttf',
  '/nikosh.ttf',
  '/vendor/html2pdf.bundle.min.js',
  '/doc-export.js',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
  '/offline.html',
];

const NO_CACHE_PATHS = [
  '/admin-login',
  '/admin-logout',
  '/dashboard',
  '/dashboard.php',
  '/admin',
  '/admin.php',
  '/admin-panel',
  '/admin-panel.php',
  '/add_notice',
  '/add_notice.php',
  '/admin-teachers',
  '/admin-teachers.php',
  '/admin-academic',
  '/admin-academic.php',
  '/admin-admissions',
  '/admin-admissions.php',
  '/accounting_entry',
  '/accounting_entry.php',
  '/accounting_report',
  '/accounting_report.php',
  '/result',
  '/result.php',
  '/view_result.php',
  '/merit-list',
  '/merit-list.php',
  '/student-search',
  '/student-search.php',
  '/admission',
  '/admission.php',
  '/admit',
  '/admit.php',
  '/id-card',
  '/id-card.php',
  '/excel-studio',
  '/excel-studio.php',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => !key.startsWith(CACHE_VERSION))
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (NO_CACHE_PATHS.some((p) => url.pathname === p) || url.pathname.startsWith('/api/')) {
    return;
  }

  // Page navigations: network-first with cached page or offline fallback
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          const offlinePage = await caches.match('/offline.html');
          return offlinePage || Response.error();
        })
    );
    return;
  }

  // Static assets: cache-first with background revalidation
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(STATIC_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);

      return cached || networkFetch;
    })
  );
});
