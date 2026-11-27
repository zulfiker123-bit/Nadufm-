(function () {
  var isInIframe = false;
  try {
    isInIframe = window.self !== window.top;
  } catch (_) {
    isInIframe = true;
  }

  // 1. Register Service Worker & ensure fresh updates
  if ('serviceWorker' in navigator) {
    var hadController = Boolean(navigator.serviceWorker.controller);
    var swRefreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || swRefreshing) return;
      swRefreshing = true;
      window.location.reload();
    });
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then(function (reg) {
          if (reg && typeof reg.update === 'function') {
            reg.update().catch(function () {});
          }
        })
        .catch(function (err) {
          console.warn('SW registration failed:', err);
        });
    });
  }

  // 2. PWA Install Prompt & Standalone Detection (Top window only)
  var deferredPrompt = null;
  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  var ua = window.navigator.userAgent.toLowerCase();
  var isIOS = /iphone|ipad|ipod/.test(ua);

  function injectStyles() {
    if (document.getElementById('pwa-ui-styles')) return;
    var style = document.createElement('style');
    style.id = 'pwa-ui-styles';
    style.textContent =
      '.pwa-install-btn {' +
      '  display: inline-flex; align-items: center; gap: 6px;' +
      '  background: #f0fdf4; color: #15803d; border: 1px solid rgba(21,128,61,0.35);' +
      '  min-height: 36px; padding: 0 12px; border-radius: 10px; font-size: 13px; font-weight: 600;' +
      '  cursor: pointer; transition: background 0.16s ease, transform 0.12s ease;' +
      '  white-space: nowrap; font-family: inherit;' +
      '}' +
      '.pwa-install-btn:hover { background: #dcfce7; }' +
      '.pwa-install-fab {' +
      '  position: fixed; bottom: 72px; right: 16px; z-index: 9998;' +
      '  display: inline-flex; align-items: center; gap: 8px;' +
      '  background: #15803d; color: #ffffff; border: 1px solid rgba(255,255,255,0.3);' +
      '  padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 600;' +
      '  cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.2); font-family: inherit;' +
      '}' +
      '.pwa-offline-banner {' +
      '  position: fixed; bottom: 70px; left: 14px; z-index: 9999;' +
      '  display: none; align-items: center; gap: 8px;' +
      '  background: #b45309; color: #ffffff; padding: 8px 14px;' +
      '  border-radius: 10px; font-size: 13px; font-weight: 600;' +
      '  box-shadow: 0 6px 18px rgba(0,0,0,0.2); border: none; cursor: pointer; font-family: inherit;' +
      '}' +
      '.pwa-offline-banner.is-syncing { background: #0369a1; }' +
      '.pwa-offline-banner.is-auth { background: #b91c1c; }' +
      '@media (min-width: 769px) { .pwa-offline-banner { bottom: 18px; left: 18px; } .pwa-install-fab { bottom: 18px; right: 18px; } }' +
      '.pwa-offline-dot {' +
      '  width: 8px; height: 8px; border-radius: 50%; background: #fff; display: inline-block; flex-shrink: 0;' +
      '}' +
      '.pwa-ios-modal {' +
      '  position: fixed; inset: 0; z-index: 10000; display: none;' +
      '  align-items: center; justify-content: center; background: rgba(0,0,0,0.55); padding: 16px;' +
      '}' +
      '.pwa-ios-card {' +
      '  background: #fff; color: #222; max-width: 360px; width: 100%;' +
      '  border-radius: 14px; padding: 22px; box-shadow: 0 12px 30px rgba(0,0,0,0.25);' +
      '  border-top: 5px solid #28a745; text-align: left;' +
      '}' +
      '.pwa-ios-card h3 { margin: 0 0 10px 0; color: #1b5e20; font-size: 18px; }' +
      '.pwa-ios-card p { margin: 0 0 14px 0; font-size: 14px; line-height: 1.6; }' +
      '.pwa-ios-close {' +
      '  width: 100%; padding: 10px; border: none; border-radius: 8px;' +
      '  background: #28a745; color: #fff; font-weight: 700; cursor: pointer; font-size: 15px;' +
      '}' +
      '.pwa-toast {' +
      '  position: fixed; bottom: 72px; right: 18px; z-index: 10001;' +
      '  background: #15803d; color: #fff; padding: 10px 18px; border-radius: 10px;' +
      '  font-size: 13.5px; font-weight: 700; box-shadow: 0 8px 20px rgba(0,0,0,0.22);' +
      '}' +
      '@media (min-width: 769px) { .pwa-toast { bottom: 20px; right: 20px; } }' +
      '@media print { .pwa-install-btn, .pwa-install-fab, .pwa-offline-banner, .pwa-ios-modal, .pwa-toast { display: none !important; } }';
    document.head.appendChild(style);
  }

  function ensureIOSModal() {
    var existing = document.getElementById('pwa-ios-modal');
    if (existing) return existing;
    var modal = document.createElement('div');
    modal.id = 'pwa-ios-modal';
    modal.className = 'pwa-ios-modal';
    modal.innerHTML =
      '<div class="pwa-ios-card">' +
      '  <h3>আইফোন / আইপ্যাডে অ্যাপ ইনস্টল করুন</h3>' +
      '  <p>১. Safari ব্রাউজারের নিচে <strong>Share (শেয়ার)</strong> আইকনে ট্যাপ করুন।<br>' +
      '     ২. নিচে স্ক্রল করে <strong>Add to Home Screen</strong> নির্বাচন করুন।<br>' +
      '     ৩. উপরে ডানদিকে <strong>Add</strong> বাটনে ট্যাপ করুন।</p>' +
      '  <button type="button" class="pwa-ios-close" id="pwa-ios-close-btn">বন্ধ করুন</button>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) modal.style.display = 'none';
    });
    document.getElementById('pwa-ios-close-btn').addEventListener('click', function () {
      modal.style.display = 'none';
    });
    return modal;
  }

  function showToast(msg) {
    injectStyles();
    var prev = document.getElementById('pwa-active-toast');
    if (prev) prev.remove();
    var t = document.createElement('div');
    t.id = 'pwa-active-toast';
    t.className = 'pwa-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      if (t.parentNode) t.remove();
    }, 4000);
  }

  function bnCount(n) {
    var d = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(n).replace(/[0-9]/g, function (c) { return d[Number(c)]; });
  }

  function renderInstallButton() {
    if (isInIframe) return;
    if (isStandalone) {
      var existingSlot = document.getElementById('pwa-install-slot');
      if (existingSlot) existingSlot.innerHTML = '';
      var existingFab = document.getElementById('pwa-install-fab');
      if (existingFab) existingFab.remove();
      return;
    }

    if (!deferredPrompt && !isIOS) return;

    injectStyles();
    var slot = document.getElementById('pwa-install-slot');

    var existingBtn = document.getElementById('pwa-install-btn') || document.getElementById('pwa-install-fab');
    if (existingBtn) return;

    var btn = document.createElement('button');
    btn.type = 'button';
    if (slot) {
      btn.id = 'pwa-install-btn';
      btn.className = 'pwa-install-btn';
    } else {
      btn.id = 'pwa-install-fab';
      btn.className = 'pwa-install-fab';
    }

    btn.innerHTML =
      '<svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">' +
      '  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>' +
      '</svg>' +
      '<span>' + (isIOS && !deferredPrompt ? 'হোম স্ক্রিনে যোগ করুন' : 'Nadu fm ইনস্টল') + '</span>';

    btn.addEventListener('click', async function () {
      if (deferredPrompt) {
        await deferredPrompt.prompt();
        var choice = await deferredPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          deferredPrompt = null;
          btn.remove();
        }
      } else if (isIOS) {
        var modal = ensureIOSModal();
        modal.style.display = 'flex';
      }
    });

    if (slot) {
      slot.appendChild(btn);
    } else {
      document.body.appendChild(btn);
    }
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    renderInstallButton();
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    isStandalone = true;
    renderInstallButton();
    showToast('অ্যাপটি সফলভাবে ইনস্টল হয়েছে!');
  });

  // 3. Offline State & Auto-Sync Status Indicator (Top window only)
  function setupOfflineBanner() {
    if (isInIframe) return;
    injectStyles();
    var banner = document.getElementById('pwa-offline-banner');
    if (!banner) {
      banner = document.createElement('button');
      banner.type = 'button';
      banner.id = 'pwa-offline-banner';
      banner.className = 'pwa-offline-banner';
      document.body.appendChild(banner);
    }

    var state = {
      online: navigator.onLine,
      pendingCount: 0,
      authRequired: false,
      syncing: false,
    };

    function renderBanner() {
      banner.classList.remove('is-syncing', 'is-auth');
      if (!state.online) {
        banner.style.display = 'inline-flex';
        var extra = state.pendingCount > 0 ? ' · ' + bnCount(state.pendingCount) + 'টি সিঙ্কের অপেক্ষায়' : ' · সংরক্ষিত তথ্য চালু আছে';
        banner.innerHTML = '<span class="pwa-offline-dot"></span><span>অফলাইন মোড' + extra + '</span>';
        return;
      }

      if (state.syncing) {
        banner.classList.add('is-syncing');
        banner.style.display = 'inline-flex';
        banner.innerHTML = '<span class="pwa-offline-dot"></span><span>অটো সিঙ্ক হচ্ছে (' + bnCount(state.pendingCount) + 'টি)...</span>';
        return;
      }

      if (state.authRequired && state.pendingCount > 0) {
        banner.classList.add('is-auth');
        banner.style.display = 'inline-flex';
        banner.innerHTML = '<span class="pwa-offline-dot"></span><span>' + bnCount(state.pendingCount) + 'টি তথ্য সিঙ্ক করতে অ্যাডমিন লগইন করুন</span>';
        return;
      }

      if (state.pendingCount > 0) {
        banner.classList.add('is-syncing');
        banner.style.display = 'inline-flex';
        banner.innerHTML = '<span class="pwa-offline-dot"></span><span>সিঙ্ক হচ্ছে (' + bnCount(state.pendingCount) + 'টি পেন্ডিং)...</span>';
        return;
      }

      banner.style.display = 'none';
    }

    banner.addEventListener('click', function () {
      if (!navigator.onLine) return;
      if (state.authRequired && typeof window.openAdminLoginModal === 'function') {
        window.openAdminLoginModal(window.location.pathname || '/dashboard.php');
        return;
      }
      if (window.NadufmOffline) {
        window.NadufmOffline.flushSyncQueue();
      }
    });

    window.addEventListener('online', function () {
      state.online = true;
      renderBanner();
    });
    window.addEventListener('offline', function () {
      state.online = false;
      state.syncing = false;
      renderBanner();
    });

    window.addEventListener('nadufm:sync-status', function (ev) {
      var d = (ev && ev.detail) || {};
      if (typeof d.online === 'boolean') state.online = d.online;
      if (typeof d.pendingCount === 'number') state.pendingCount = d.pendingCount;
      if (typeof d.authRequired === 'boolean') state.authRequired = d.authRequired;
      if (d.type === 'SYNC_STARTED') state.syncing = true;
      if (d.type === 'SYNC_COMPLETED' || d.type === 'SYNC_FINISHED' || d.type === 'SYNC_IDLE' || d.type === 'AUTH_REQUIRED') {
        state.syncing = false;
      }
      if (d.type === 'SYNC_COMPLETED' && d.syncedCount > 0) {
        showToast('অফলাইনের ' + bnCount(d.syncedCount) + 'টি তথ্য অটো সিঙ্ক সম্পন্ন হয়েছে!');
      }
      renderBanner();
    });

    if (window.NadufmOffline) {
      window.NadufmOffline.getQueue().then(function (items) {
        state.pendingCount = items.length;
        state.authRequired = items.some(function (x) { return x.status === 'auth_required'; });
        renderBanner();
      });
    } else {
      renderBanner();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupOfflineBanner();
    renderInstallButton();
  });
})();
