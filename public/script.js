// App Drawer Controls
function openAppDrawer() {
  var backdrop = document.getElementById('appDrawerBackdrop');
  var sheet = document.getElementById('appDrawerSheet');
  if (!backdrop || !sheet) return;
  sheet.hidden = false;
  requestAnimationFrame(function () {
    backdrop.classList.add('open');
    sheet.classList.add('open');
  });
  document.body.style.overflow = 'hidden';
}

function closeAppDrawer() {
  var backdrop = document.getElementById('appDrawerBackdrop');
  var sheet = document.getElementById('appDrawerSheet');
  if (!backdrop || !sheet) return;
  backdrop.classList.remove('open');
  sheet.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(function () {
    if (!sheet.classList.contains('open')) {
      sheet.hidden = true;
    }
  }, 220);
}

function toggleMenu() {
  openAppDrawer();
}

function showAdminLoginError(msg) {
  var errBox = document.getElementById('adminLoginError');
  var errText = document.getElementById('adminLoginErrorText');
  if (!errBox || !errText) return;
  errText.textContent = msg || 'লগইন করা সম্ভব হয়নি। আবার চেষ্টা করুন।';
  errBox.hidden = false;
}

function clearAdminLoginError() {
  var errBox = document.getElementById('adminLoginError');
  var errText = document.getElementById('adminLoginErrorText');
  if (errBox) errBox.hidden = true;
  if (errText) errText.textContent = '';
}

function openAdminLoginModal(nextUrl) {
  var backdrop = document.getElementById('adminLoginModalBackdrop');
  var nextInput = document.getElementById('adminLoginNextUrl');
  var pwInput = document.getElementById('popupAdminPassword');
  var eyeOpen = document.getElementById('popupPwEyeOpen');
  var eyeClosed = document.getElementById('popupPwEyeClosed');
  if (!backdrop) return false;

  if (nextInput) {
    nextInput.value = nextUrl || '/dashboard.php';
  }
  clearAdminLoginError();
  if (pwInput) {
    pwInput.value = '';
    pwInput.type = 'password';
  }
  if (eyeOpen) eyeOpen.hidden = false;
  if (eyeClosed) eyeClosed.hidden = true;

  if (backdrop.parentElement !== document.body) {
    document.body.appendChild(backdrop);
  }

  closeAppDrawer();
  document.body.classList.add('admin-modal-open');
  backdrop.hidden = false;
  requestAnimationFrame(function () {
    backdrop.classList.add('open');
  });
  document.body.style.overflow = 'hidden';
  return true;
}

function closeAdminLoginModal() {
  var backdrop = document.getElementById('adminLoginModalBackdrop');
  if (!backdrop || backdrop.hidden) return;
  backdrop.classList.remove('open');
  document.body.classList.remove('admin-modal-open');
  document.body.style.overflow = '';
  clearAdminLoginError();
  setTimeout(function () {
    if (!backdrop.classList.contains('open')) {
      backdrop.hidden = true;
    }
  }, 190);
}

function togglePopupAdminPassword() {
  var pwInput = document.getElementById('popupAdminPassword');
  var eyeOpen = document.getElementById('popupPwEyeOpen');
  var eyeClosed = document.getElementById('popupPwEyeClosed');
  if (!pwInput) return;
  if (pwInput.type === 'password') {
    pwInput.type = 'text';
    if (eyeOpen) eyeOpen.hidden = true;
    if (eyeClosed) eyeClosed.hidden = false;
  } else {
    pwInput.type = 'password';
    if (eyeOpen) eyeOpen.hidden = false;
    if (eyeClosed) eyeClosed.hidden = true;
  }
}

document.addEventListener('DOMContentLoaded', function () {
  var path = window.location.pathname.toLowerCase();
  var navItems = document.querySelectorAll('[data-nav-match]');

  navItems.forEach(function (el) {
    var match = el.getAttribute('data-nav-match');
    var isActive = false;
    if (match === '/' && (path === '/' || path === '/index.php')) {
      isActive = true;
    } else if (match !== '/' && !match.startsWith('#') && path.indexOf(match) !== -1) {
      isActive = true;
    }
    if (isActive) {
      el.classList.add('active');
    }
  });

  // Intercept Admin Panel clicks to show popup login instead of navigating away when not signed in
  document.addEventListener('click', function (e) {
    var trigger = e.target && e.target.closest
      ? e.target.closest('[data-admin-login-trigger], a[href="/dashboard.php"], a[href="/dashboard"], a[href="/admin"], a[href="/admin.php"], a[href="/admin-panel"], a[href="/admin-panel.php"]')
      : null;
    if (!trigger) return;
    var backdrop = document.getElementById('adminLoginModalBackdrop');
    if (!backdrop || backdrop.getAttribute('data-is-admin') === '1') return;
    e.preventDefault();
    var targetHref = trigger.getAttribute('href') || '/dashboard.php';
    openAdminLoginModal(targetHref);
  });

  var loginForm = document.getElementById('adminLoginModalForm');
  if (loginForm) {
    loginForm.addEventListener('submit', function (e) {
      e.preventDefault();
      clearAdminLoginError();
      var pwInput = document.getElementById('popupAdminPassword');
      var nextInput = document.getElementById('adminLoginNextUrl');
      var submitBtn = document.getElementById('adminLoginSubmitBtn');
      var submitLabel = document.getElementById('adminLoginSubmitLabel');
      var password = pwInput ? pwInput.value : '';
      var nextUrl = nextInput ? nextInput.value : '/dashboard.php';

      if (!password) {
        showAdminLoginError('অ্যাডমিন পাসওয়ার্ড লিখুন।');
        if (pwInput) pwInput.focus();
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitLabel) submitLabel.textContent = 'যাচাই করা হচ্ছে...';

      fetch('/admin-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        credentials: 'same-origin',
        body: new URLSearchParams({
          password: password,
          next: nextUrl
        }).toString()
      })
        .then(function (res) {
          return res.json().then(function (data) {
            return { ok: res.ok, data: data };
          }).catch(function () {
            return { ok: res.ok, data: {} };
          });
        })
        .then(function (result) {
          if (result.ok && result.data && result.data.ok) {
            var finishRedirect = function () {
              window.location.href = result.data.redirectTo || nextUrl || '/dashboard.php';
            };
            if (window.NadufmOffline && typeof window.NadufmOffline.flushSyncQueue === 'function') {
              Promise.resolve(window.NadufmOffline.flushSyncQueue()).catch(function () {}).finally(finishRedirect);
            } else {
              finishRedirect();
            }
            return;
          }
          showAdminLoginError((result.data && result.data.error) || 'ভুল পাসওয়ার্ড! সঠিক অ্যাডমিন পাসওয়ার্ড দিন।');
          if (pwInput) {
            pwInput.focus();
            pwInput.select();
          }
        })
        .catch(function () {
          showAdminLoginError('সার্ভারের সাথে সংযোগ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
        })
        .finally(function () {
          if (submitBtn) submitBtn.disabled = false;
          if (submitLabel) submitLabel.textContent = 'প্রবেশ করুন';
        });
    });
  }

  document.addEventListener('submit', function (e) {
    var form = e.target;
    if (form && form.action && form.action.indexOf('/admin-logout') !== -1) {
      if (window.NadufmOffline && typeof window.NadufmOffline.clearAdminCache === 'function') {
        window.NadufmOffline.clearAdminCache();
      }
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAppDrawer();
      closeAdminLoginModal();
    }
  });

  // App Hub Category Tabs & Search (Grouped Cards)
  var searchInput = document.getElementById('appHubSearch');
  var filterTabs = document.querySelectorAll('.app-hub-tab');
  var groupCards = document.querySelectorAll('.app-group-card');
  var appTiles = document.querySelectorAll('.app-tile');
  var emptyState = document.getElementById('appHubEmpty');
  var activeCategory = 'all';

  function applyAppHubFilter() {
    if (!appTiles.length) return;
    var query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    var totalVisible = 0;

    if (groupCards.length) {
      groupCards.forEach(function (card) {
        var groupCat = card.getAttribute('data-group-category') || '';
        var cardTiles = card.querySelectorAll('.app-tile');
        var groupVisible = 0;

        cardTiles.forEach(function (tile) {
          var cat = tile.getAttribute('data-category') || groupCat;
          var keywords = (tile.getAttribute('data-keywords') || tile.textContent || '').toLowerCase();
          var matchesCategory = activeCategory === 'all' || cat === activeCategory;
          var matchesQuery = !query || keywords.indexOf(query) !== -1;

          if (matchesCategory && matchesQuery) {
            tile.style.display = 'flex';
            groupVisible++;
            totalVisible++;
          } else {
            tile.style.display = 'none';
          }
        });

        card.style.display = groupVisible > 0 ? 'flex' : 'none';
        card.classList.toggle('is-expanded', activeCategory !== 'all' && groupVisible > 0);
      });
    } else {
      appTiles.forEach(function (tile) {
        var cat = tile.getAttribute('data-category') || '';
        var keywords = (tile.getAttribute('data-keywords') || tile.textContent || '').toLowerCase();
        var matchesCategory = activeCategory === 'all' || cat === activeCategory;
        var matchesQuery = !query || keywords.indexOf(query) !== -1;

        if (matchesCategory && matchesQuery) {
          tile.style.display = 'flex';
          totalVisible++;
        } else {
          tile.style.display = 'none';
        }
      });
    }

    if (emptyState) {
      emptyState.style.display = totalVisible === 0 ? 'block' : 'none';
    }
  }

  if (filterTabs.length) {
    filterTabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        filterTabs.forEach(function (t) {
          t.classList.remove('active');
        });
        tab.classList.add('active');
        activeCategory = tab.getAttribute('data-filter') || 'all';
        applyAppHubFilter();
      });
    });
  }

  if (searchInput) {
    searchInput.addEventListener('input', applyAppHubFilter);
  }

  // Teachers Carousel
  var slider = document.querySelector('.carousel-slider');
  var items = document.querySelectorAll('.carousel-item');
  var nextBtn = document.querySelector('.next-btn');
  var prevBtn = document.querySelector('.prev-btn');

  if (!slider || !items.length || !nextBtn || !prevBtn) return;

  var currentIndex = 0;

  function getVisibleCount() {
    if (window.innerWidth <= 768) return 1;
    if (window.innerWidth <= 1024) return 2;
    return 4;
  }

  function updateCarousel() {
    var visible = getVisibleCount();
    var maxIndex = Math.max(0, items.length - visible);
    if (currentIndex > maxIndex) currentIndex = 0;
    if (currentIndex < 0) currentIndex = maxIndex;
    var offset = items[currentIndex] ? items[currentIndex].offsetLeft : 0;
    slider.style.transform = 'translateX(-' + offset + 'px)';
  }

  function nextSlide() {
    var visible = getVisibleCount();
    var maxIndex = Math.max(0, items.length - visible);
    currentIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
    updateCarousel();
  }

  function prevSlide() {
    var visible = getVisibleCount();
    var maxIndex = Math.max(0, items.length - visible);
    currentIndex = currentIndex <= 0 ? maxIndex : currentIndex - 1;
    updateCarousel();
  }

  var autoTimer = setInterval(nextSlide, 4000);
  function resetTimer() {
    clearInterval(autoTimer);
    autoTimer = setInterval(nextSlide, 4000);
  }

  nextBtn.addEventListener('click', function () {
    nextSlide();
    resetTimer();
  });
  prevBtn.addEventListener('click', function () {
    prevSlide();
    resetTimer();
  });
  window.addEventListener('resize', updateCarousel);
  updateCarousel();
});

