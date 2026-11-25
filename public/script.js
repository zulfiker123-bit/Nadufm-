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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeAppDrawer();
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

