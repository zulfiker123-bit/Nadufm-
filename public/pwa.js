(function () {
  // 1. Register Service Worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(function (err) {
          console.warn('SW registration failed:', err);
        });
    });
  }

  // 2. PWA Install Prompt & Standalone Detection
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
      '  min-height: 38px; padding: 0 12px; border-radius: 10px; font-size: 13px; font-weight: 600;' +
      '  cursor: pointer; transition: background 0.16s ease, transform 0.12s ease;' +
      '  white-space: nowrap;' +
      '}' +
      '.pwa-install-btn:hover { background: #dcfce7; }' +
      '.pwa-install-fab {' +
      '  position: fixed; bottom: 72px; right: 16px; z-index: 9998;' +
      '  display: inline-flex; align-items: center; gap: 8px;' +
      '  background: #15803d; color: #ffffff; border: 1px solid rgba(255,255,255,0.3);' +
      '  padding: 10px 16px; border-radius: 12px; font-size: 14px; font-weight: 600;' +
      '  cursor: pointer; box-shadow: 0 6px 18px rgba(0,0,0,0.2);' +
      '}' +
      '.pwa-offline-banner {' +
      '  position: fixed; bottom: 70px; left: 14px; z-index: 9999;' +
      '  display: none; align-items: center; gap: 8px;' +
      '  background: #d97706; color: #ffffff; padding: 8px 14px;' +
      '  border-radius: 10px; font-size: 13px; font-weight: 600;' +
      '  box-shadow: 0 4px 12px rgba(0,0,0,0.2);' +
      '}' +
      '.pwa-offline-dot {' +
      '  width: 8px; height: 8px; border-radius: 50%; background: #fff; display: inline-block;' +
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
      '  position: fixed; bottom: 20px; right: 20px; z-index: 10001;' +
      '  background: #1b5e20; color: #fff; padding: 10px 18px; border-radius: 8px;' +
      '  font-size: 14px; font-weight: 700; box-shadow: 0 6px 16px rgba(0,0,0,0.2);' +
      '}' +
      '@media print { .pwa-install-btn, .pwa-install-fab, .pwa-offline-banner, .pwa-ios-modal { display: none !important; } }';
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
    var t = document.createElement('div');
    t.className = 'pwa-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () {
      t.remove();
    }, 3500);
  }

  function renderInstallButton() {
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
      '<span>' + (isIOS && !deferredPrompt ? 'হোম স্ক্রিনে যোগ করুন' : 'অ্যাপ ইনস্টল করুন') + '</span>';

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

  // 3. Offline State & Connectivity Indicator
  function setupOfflineBanner() {
    injectStyles();
    var banner = document.getElementById('pwa-offline-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwa-offline-banner';
      banner.className = 'pwa-offline-banner';
      banner.innerHTML =
        '<span class="pwa-offline-dot"></span>' +
        '<span>অফলাইন মোড — সংরক্ষিত তথ্য দেখানো হচ্ছে</span>';
      document.body.appendChild(banner);
    }

    function updateStatus() {
      banner.style.display = navigator.onLine ? 'none' : 'inline-flex';
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  document.addEventListener('DOMContentLoaded', function () {
    setupOfflineBanner();
    renderInstallButton();
  });
})();
