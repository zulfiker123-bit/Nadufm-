const CACHE_VERSION = 'nadufm-pwa-v15';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const PAGE_CACHE = `${CACHE_VERSION}-pages`;
const ADMIN_PAGE_CACHE = `${CACHE_VERSION}-admin-pages`;
const API_CACHE = `${CACHE_VERSION}-api`;

const PRECACHE_URLS = [
  '/',
  '/fonts.css',
  '/style.css?v=15',
  '/script.js?v=15',
  '/student-picker.js',
  '/doc-export.js',
  '/offline-sync.js',
  '/pwa.js',
  '/manifest.webmanifest',
  '/logo.png',
  '/home-icon.png',
  '/header.jpg',
  '/kalpurush.ttf',
  '/nikosh.ttf',
  '/vendor/html2pdf.bundle.min.js',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/offline.html',
];

const PUBLIC_WARM_PAGES = [
  '/',
  '/index.php',
  '/about.php',
  '/teacher-list.php',
  '/contact.php',
  '/student.php',
  '/governingbody.php',
  '/morehistory.php',
  '/presidentspeech.php',
  '/principalspeech.php',
  '/calendar.php',
  '/holidays.php',
  '/fees.php',
  '/registration.php',
  '/routine.php',
  '/student-info.php',
  '/syllabus.php',
  '/print-form.php',
  '/admission.php',
  '/admit.php',
  '/id-card.php',
  '/student-search.php',
  '/result.php',
  '/merit-list.php',
  '/view_notice.php?offline_shell=1',
];

const ADMIN_WARM_PAGES = [
  '/dashboard.php',
  '/excel-studio.php',
  '/excel-studio.php?embed=1&tab=students&hideTabs=1',
  '/excel-studio.php?embed=1&tab=results&hideTabs=1',
  '/excel-studio.php?embed=1&tab=docstudio&hideTabs=1',
  '/student-search.php?embed=1',
  '/result.php?embed=1',
  '/merit-list.php?embed=1',
  '/id-card.php?embed=1',
  '/admit.php?embed=1',
  '/admission.php?embed=1',
  '/add_notice.php?embed=1',
  '/admin-teachers.php?embed=1',
  '/admin-academic.php?embed=1',
  '/admin-admissions.php?embed=1',
  '/accounting_entry.php?embed=1',
  '/accounting_report.php?embed=1',
];

const ADMIN_PATHS = [
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
  '/excel-studio',
  '/excel-studio.php',
];

const AUTH_BYPASS_PATHS = ['/admin-login', '/admin-logout'];

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

function isAdminPath(pathname) {
  return ADMIN_PATHS.includes(pathname);
}

async function warmPagesList(urls, cacheName, requireNoRedirect) {
  const cache = await caches.open(cacheName);
  for (const urlPath of urls) {
    try {
      const res = await fetch(urlPath, { credentials: 'same-origin' });
      if (res && res.status === 200) {
        if (requireNoRedirect && (res.redirected || new URL(res.url).pathname.includes('admin-login'))) {
          continue;
        }
        await cache.put(urlPath, res.clone());
      }
    } catch (_) {
      // Skip individual failures quietly
    }
  }
}

// Background sync replay in Service Worker when no tab is open
function openOfflineDbFromSw() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('nadufm_offline_db', 1);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        const qs = db.createObjectStore('syncQueue', { keyPath: 'id' });
        qs.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function replayQueueInSw() {
  const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  if (clientsList && clientsList.length > 0) {
    clientsList.forEach((client) => client.postMessage({ type: 'TRIGGER_SYNC' }));
    return;
  }

  let db;
  try {
    db = await openOfflineDbFromSw();
  } catch {
    return;
  }

  const items = await new Promise((resolve) => {
    const tx = db.transaction('syncQueue', 'readonly');
    const req = tx.objectStore('syncQueue').getAll();
    req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
    req.onerror = () => resolve([]);
  });

  items.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));

  for (const item of items) {
    try {
      let bodyToSend = item.body;
      if (bodyToSend && typeof bodyToSend === 'object' && bodyToSend._formType === 'formdata') {
        const fd = new FormData();
        Object.entries(bodyToSend.data || {}).forEach(([k, v]) => fd.append(k, v));
        bodyToSend = fd;
      }
      const opts = {
        method: item.method || 'POST',
        headers: item.headers || {},
        credentials: item.isNoCors ? 'omit' : 'same-origin',
      };
      if (item.isNoCors) opts.mode = 'no-cors';
      if (bodyToSend !== undefined && bodyToSend !== null && opts.method !== 'GET' && opts.method !== 'HEAD') {
        opts.body = bodyToSend;
      }
      const res = await fetch(item.url, opts);
      if (item.isNoCors || res.ok) {
        await new Promise((resolve) => {
          const tx = db.transaction('syncQueue', 'readwrite');
          tx.objectStore('syncQueue').delete(item.id);
          tx.oncomplete = () => resolve();
          tx.onerror = () => resolve();
        });
      }
    } catch {
      break;
    }
  }
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'nadufm-offline-sync') {
    event.waitUntil(replayQueueInSw());
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }
  if (data.type === 'CLEAR_ADMIN_CACHE') {
    event.waitUntil(caches.delete(ADMIN_PAGE_CACHE));
    return;
  }
  if (data.type === 'SET_APP_BADGE') {
    const count = Number(data.count) || 0;
    if (self.registration) {
      if (count > 0 && typeof self.registration.setAppBadge === 'function') {
        self.registration.setAppBadge(count).catch(() => {});
      } else if (count <= 0 && typeof self.registration.clearAppBadge === 'function') {
        self.registration.clearAppBadge().catch(() => {});
      }
    }
    return;
  }
  if (data.type === 'WARM_OFFLINE_PAGES') {
    event.waitUntil(
      (async () => {
        await warmPagesList(PUBLIC_WARM_PAGES, PAGE_CACHE, false);
        if (data.includeAdmin) {
          await warmPagesList(ADMIN_WARM_PAGES, ADMIN_PAGE_CACHE, true);
        }
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (AUTH_BYPASS_PATHS.includes(url.pathname)) return;

  // Read API requests: network-first, fall back to cached API JSON when offline
  if (url.pathname.startsWith('/api/')) {
    if (url.pathname === '/api/offline/bootstrap') return;
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(API_CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const cached = await caches.match(req);
          if (cached) return cached;
          return new Response(JSON.stringify({ offline: true, error: 'অফলাইন সংযোগ' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        })
    );
    return;
  }

  // Page navigations (both public and authenticated admin routes)
  if (req.mode === 'navigate') {
    const adminRoute = isAdminPath(url.pathname);
    const targetCacheName = adminRoute ? ADMIN_PAGE_CACHE : PAGE_CACHE;

    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const finalPath = new URL(res.url || req.url).pathname;
            const redirectedToLogin = res.redirected && finalPath.includes('admin-login');
            if (!(adminRoute && redirectedToLogin)) {
              const copy = res.clone();
              caches.open(targetCacheName).then((cache) => cache.put(req, copy));
            }
          }
          return res;
        })
        .catch(async () => {
          const targetCache = await caches.open(targetCacheName);
          let cached = await targetCache.match(req);
          if (!cached && url.pathname.includes('view_notice')) {
            cached = await targetCache.match('/view_notice.php?offline_shell=1');
          } else if (!cached) {
            cached = await targetCache.match(req, { ignoreSearch: true });
          }
          if (!cached) {
            cached = await caches.match(req);
          }
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
