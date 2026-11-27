(function (global) {
  'use strict';

  var DB_NAME = 'nadufm_offline_db';
  var DB_VERSION = 1;
  var SNAPSHOT_STORE = 'snapshots';
  var QUEUE_STORE = 'syncQueue';
  var CHANNEL_NAME = 'nadufm-offline-sync';

  var dbPromise = null;
  var syncInFlight = null;
  var bootstrapInFlight = null;
  var channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null;

  var CLASS_ALIASES = [
    { key: '0', label: 'শিশু', aliases: ['0', 'শিশু', 'nursery', 'play', 'kg', 'shishu'] },
    { key: '1', label: 'প্রথম', aliases: ['1', '১', '১ম', 'প্রথম', '1st', 'one', 'first'] },
    { key: '2', label: 'দ্বিতীয়', aliases: ['2', '২', '২য়', '২য়', 'দ্বিতীয়', 'দ্বিতীয়', '2nd', 'two', 'second'] },
    { key: '3', label: 'তৃতীয়', aliases: ['3', '৩', '৩য়', '৩য়', 'তৃতীয়', 'তৃতীয়', '3rd', 'three', 'third'] },
    { key: '4', label: 'চতুর্থ', aliases: ['4', '৪', '৪র্থ', 'চতুর্থ', '4th', 'four', 'fourth'] },
    { key: '5', label: 'পঞ্চম', aliases: ['5', '৫', '৫ম', 'পঞ্চম', '5th', 'five', 'fifth', 'এবতেদায়ী সমাপনী'] },
    { key: '6', label: 'ষষ্ঠ', aliases: ['6', '৬', '৬ষ্ঠ', 'ষষ্ঠ', '6th', 'six', 'sixth'] },
    { key: '7', label: 'সপ্তম', aliases: ['7', '৭', '৭ম', 'সপ্তম', '7th', 'seven', 'seventh'] },
    { key: '8', label: 'অষ্টম', aliases: ['8', '৮', '৮ম', 'অষ্টম', '8th', 'eight', 'eighth', 'জেডিসি', 'jdc'] },
    { key: '9', label: 'নবম', aliases: ['9', '৯', '৯ম', 'নবম', '9th', 'nine', 'ninth'] },
    { key: '10', label: 'দশম', aliases: ['10', '১০', '১০ম', 'দশম', 'দাখিল', '10th', 'ten', 'tenth', 'dakhil', 'দাখিল (দশম)'] },
    { key: '11', label: 'আলিম ১ম বর্ষ', aliases: ['11', '১১', '১১শ', 'আলিম ১ম', 'আলিম ১ম বর্ষ', 'আলিম প্রথম বর্ষ', 'alim 1st', 'alim 1st year'] },
    { key: '12', label: 'আলিম ২য় বর্ষ', aliases: ['12', '১২', '১২শ', 'আলিম ২য়', 'আলিম ২য় বর্ষ', 'আলিম ২য় বর্ষ', 'আলিম ২য়', 'আলিম দ্বিতীয় বর্ষ', 'alim 2nd', 'alim 2nd year'] },
    { key: 'fazil_1', label: 'ফাজিল ১ম বর্ষ', aliases: ['ফাজিল ১ম', 'ফাজিল ১ম বর্ষ', 'fazil 1st', 'fazil 1st year'] },
    { key: 'fazil_2', label: 'ফাজিল ২য় বর্ষ', aliases: ['ফাজিল ২য়', 'ফাজিল ২য় বর্ষ', 'ফাজিল ২য় বর্ষ', 'fazil 2nd', 'fazil 2nd year'] },
    { key: 'fazil_3', label: 'ফাজিল ৩য় বর্ষ', aliases: ['ফাজিল ৩য়', 'ফাজিল ৩য় বর্ষ', 'ফাজিল ৩য় বর্ষ', 'fazil 3rd', 'fazil 3rd year'] },
  ];

  function bnNum(input) {
    var en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    var bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(input == null ? '' : input).replace(/[0-9]/g, function (c) {
      var idx = en.indexOf(c);
      return idx >= 0 ? bn[idx] : c;
    });
  }

  function enNum(input) {
    var bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return String(input == null ? '' : input).replace(/[০-৯]/g, function (c) {
      var idx = bn.indexOf(c);
      return idx >= 0 ? String(idx) : c;
    });
  }

  function normalizeRollKey(raw) {
    var s = enNum(String(raw == null ? '' : raw).trim()).toLowerCase();
    if (!s) return '';
    return s.replace(/^0+(?=\d)/, '');
  }

  function normalizeClassInput(raw) {
    var cleaned = String(raw == null ? '' : raw)
      .replace(/শ্রেণি|শ্রেণী|class/gi, '')
      .replace(/[()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    var enLower = enNum(cleaned).toLowerCase();
    if (!cleaned) return { key: '', label: '' };

    for (var i = 0; i < CLASS_ALIASES.length; i++) {
      var entry = CLASS_ALIASES[i];
      for (var j = 0; j < entry.aliases.length; j++) {
        var alias = entry.aliases[j];
        var al = enNum(alias).toLowerCase().trim();
        if (enLower === al || cleaned.toLowerCase() === alias.toLowerCase()) {
          return { key: entry.key, label: entry.label };
        }
      }
    }
    for (var k = 0; k < CLASS_ALIASES.length; k++) {
      var e2 = CLASS_ALIASES[k];
      for (var m = 0; m < e2.aliases.length; m++) {
        var al2 = enNum(e2.aliases[m]).toLowerCase().trim();
        if (al2.length >= 2 && (enLower.indexOf(al2) !== -1 || al2.indexOf(enLower) !== -1)) {
          return { key: e2.key, label: e2.label };
        }
      }
    }
    return { key: enLower, label: cleaned };
  }

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (event) {
        var db = event.target.result;
        if (!db.objectStoreNames.contains(SNAPSHOT_STORE)) {
          db.createObjectStore(SNAPSHOT_STORE, { keyPath: 'key' });
        }
        if (!db.objectStoreNames.contains(QUEUE_STORE)) {
          var qStore = db.createObjectStore(QUEUE_STORE, { keyPath: 'id' });
          qStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
      req.onsuccess = function () {
        resolve(req.result);
      };
      req.onerror = function () {
        reject(req.error || new Error('IndexedDB open failed'));
      };
    });
    return dbPromise;
  }

  function getSnapshot(key) {
    return openDb()
      .then(function (db) {
        return new Promise(function (resolve) {
          var tx = db.transaction(SNAPSHOT_STORE, 'readonly');
          var req = tx.objectStore(SNAPSHOT_STORE).get(key);
          req.onsuccess = function () {
            resolve(req.result ? req.result.data : null);
          };
          req.onerror = function () {
            resolve(null);
          };
        });
      })
      .catch(function () {
        try {
          var raw = localStorage.getItem('nadufm_snap_' + key);
          return raw ? JSON.parse(raw) : null;
        } catch (_) {
          return null;
        }
      });
  }

  function setSnapshot(key, data) {
    return openDb()
      .then(function (db) {
        return new Promise(function (resolve, reject) {
          var tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
          tx.objectStore(SNAPSHOT_STORE).put({
            key: key,
            data: data,
            updatedAt: new Date().toISOString(),
          });
          tx.oncomplete = function () {
            resolve(data);
          };
          tx.onerror = function () {
            reject(tx.error);
          };
        });
      })
      .catch(function () {
        try {
          localStorage.setItem('nadufm_snap_' + key, JSON.stringify(data));
        } catch (_) {}
        return data;
      });
  }

  var READ_NOTICES_KEY = 'nadufm_read_notice_ids_v1';

  function getReadNoticeIds() {
    try {
      var raw = localStorage.getItem(READ_NOTICES_KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch (_) {
      return [];
    }
  }

  function markNoticeRead(id) {
    if (id == null || id === '') return Promise.resolve(0);
    var sid = String(id);
    var list = getReadNoticeIds();
    if (list.indexOf(sid) === -1) {
      list.push(sid);
      if (list.length > 250) list = list.slice(list.length - 250);
      try {
        localStorage.setItem(READ_NOTICES_KEY, JSON.stringify(list));
      } catch (_) {}
    }
    return updateNoticeBadge();
  }

  function countUnreadNoticesFromList(notices) {
    if (!Array.isArray(notices)) return 0;
    var readSet = {};
    getReadNoticeIds().forEach(function (rid) { readSet[rid] = true; });
    var count = 0;
    for (var i = 0; i < notices.length; i++) {
      var n = notices[i];
      if (!n) continue;
      var isNew = String(n.isNew != null ? n.isNew : (n.is_new != null ? n.is_new : '')).trim().toLowerCase() === 'yes';
      if (isNew && !readSet[String(n.id)]) {
        count++;
      }
    }
    return count;
  }

  function applyNoticeBadgeCount(count) {
    var safeCount = Math.max(0, parseInt(count, 10) || 0);
    if (typeof navigator !== 'undefined') {
      if (safeCount > 0 && typeof navigator.setAppBadge === 'function') {
        navigator.setAppBadge(safeCount).catch(function () {});
      } else if (safeCount === 0 && typeof navigator.clearAppBadge === 'function') {
        navigator.clearAppBadge().catch(function () {});
      }
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(function (reg) {
          if (reg && reg.active) {
            reg.active.postMessage({ type: 'SET_APP_BADGE', count: safeCount });
          }
        })
        .catch(function () {});
    }
    if (typeof document !== 'undefined') {
      var els = document.querySelectorAll('[data-notice-badge]');
      els.forEach(function (el) {
        var mode = el.getAttribute('data-notice-badge');
        if (safeCount > 0) {
          el.textContent = mode === 'pill' ? (bnNum(safeCount) + 'টি নতুন') : bnNum(safeCount);
          el.hidden = false;
          el.style.display = '';
        } else {
          el.textContent = '';
          el.hidden = true;
          el.style.display = 'none';
        }
      });
    }
    try {
      global.dispatchEvent(new CustomEvent('nadufm:notice-badge', { detail: { count: safeCount } }));
    } catch (_) {}
    if (channel) {
      try {
        channel.postMessage({ type: 'NOTICE_BADGE', count: safeCount });
      } catch (_) {}
    }
    return safeCount;
  }

  function updateNoticeBadge(overrideNotices) {
    if (Array.isArray(overrideNotices)) {
      return Promise.resolve(applyNoticeBadgeCount(countUnreadNoticesFromList(overrideNotices)));
    }
    return getSnapshot('bootstrap').then(function (snap) {
      var notices = (snap && snap.notices && Array.isArray(snap.notices.notices))
        ? snap.notices.notices
        : (Array.isArray(global.__nadufmInitialNotices) ? global.__nadufmInitialNotices : []);
      return applyNoticeBadgeCount(countUnreadNoticesFromList(notices));
    });
  }

  function updateBootstrap(mutatorFn) {
    return getSnapshot('bootstrap').then(function (snap) {
      var base = snap && typeof snap === 'object' ? snap : {
        timestamp: new Date().toISOString(),
        classMap: {},
        classesAndRolls: { classes: [], rolls: [], totalStudents: 0 },
        students: [],
        uploadedExams: [],
        meritByClass: {},
        notices: { headlines: [], notices: [] },
        teachers: [],
        governingBody: { institutionName: '', tenure: '', members: [] },
        academic: { routines: [], syllabus: [], fees: [], registrations: [], studentStats: [] },
        admissions: [],
      };
      var updated = mutatorFn(base) || base;
      updated.localUpdatedAt = new Date().toISOString();
      return setSnapshot('bootstrap', updated).then(function (saved) {
        updateNoticeBadge(saved && saved.notices && saved.notices.notices);
        return saved;
      });
    });
  }

  function getQueue() {
    return openDb()
      .then(function (db) {
        return new Promise(function (resolve) {
          var tx = db.transaction(QUEUE_STORE, 'readonly');
          var req = tx.objectStore(QUEUE_STORE).getAll();
          req.onsuccess = function () {
            var items = Array.isArray(req.result) ? req.result : [];
            items.sort(function (a, b) {
              return String(a.createdAt || '').localeCompare(String(b.createdAt || ''));
            });
            resolve(items);
          };
          req.onerror = function () {
            resolve([]);
          };
        });
      })
      .catch(function () {
        return [];
      });
  }

  function putQueueItem(item) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(QUEUE_STORE, 'readwrite');
        tx.objectStore(QUEUE_STORE).put(item);
        tx.oncomplete = function () {
          resolve(item);
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function deleteQueueItem(id) {
    return openDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(QUEUE_STORE, 'readwrite');
        tx.objectStore(QUEUE_STORE).delete(id);
        tx.oncomplete = function () {
          resolve();
        };
        tx.onerror = function () {
          reject(tx.error);
        };
      });
    });
  }

  function notify(detail) {
    getQueue().then(function (items) {
      var authNeeded = items.some(function (x) { return x.status === 'auth_required'; });
      var payload = Object.assign({
        pendingCount: items.length,
        authRequired: authNeeded,
        online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      }, detail || {});
      try {
        global.dispatchEvent(new CustomEvent('nadufm:sync-status', { detail: payload }));
      } catch (_) {}
      if (channel && !detail?._fromBroadcast) {
        try {
          channel.postMessage(payload);
        } catch (_) {}
      }
    });
  }

  if (channel) {
    channel.onmessage = function (ev) {
      if (!ev || !ev.data) return;
      if (ev.data.type === 'NOTICE_BADGE') {
        if (typeof document !== 'undefined') {
          var c = Math.max(0, parseInt(ev.data.count, 10) || 0);
          document.querySelectorAll('[data-notice-badge]').forEach(function (el) {
            var mode = el.getAttribute('data-notice-badge');
            if (c > 0) {
              el.textContent = mode === 'pill' ? (bnNum(c) + 'টি নতুন') : bnNum(c);
              el.hidden = false;
              el.style.display = '';
            } else {
              el.textContent = '';
              el.hidden = true;
              el.style.display = 'none';
            }
          });
        }
        return;
      }
      try {
        global.dispatchEvent(new CustomEvent('nadufm:sync-status', {
          detail: Object.assign({}, ev.data, { _fromBroadcast: true }),
        }));
      } catch (_) {}
    };
  }

  function registerBackgroundSync() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then(function (reg) {
        if (reg && reg.sync && typeof reg.sync.register === 'function') {
          return reg.sync.register('nadufm-offline-sync').catch(function () {});
        }
      })
      .catch(function () {});
  }

  function enqueue(entry) {
    var item = {
      id: 'q_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      createdAt: new Date().toISOString(),
      label: String(entry.label || 'অফলাইন তথ্য'),
      url: String(entry.url || ''),
      method: String(entry.method || 'POST').toUpperCase(),
      headers: entry.headers || { 'Content-Type': 'application/json' },
      body: entry.body !== undefined ? entry.body : null,
      isNoCors: Boolean(entry.isNoCors),
      status: 'pending',
      retries: 0,
      lastError: '',
    };
    return putQueueItem(item).then(function (saved) {
      registerBackgroundSync();
      notify({ type: 'QUEUE_UPDATED', item: saved });
      return saved;
    });
  }

  function isNetworkError(err) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    if (!err) return false;
    if (err.name === 'TypeError') return true;
    var msg = String(err.message || '').toLowerCase();
    return msg.indexOf('failed to fetch') !== -1 ||
      msg.indexOf('networkerror') !== -1 ||
      msg.indexOf('network request failed') !== -1 ||
      msg.indexOf('load failed') !== -1;
  }

  async function saveMutationOrQueue(opts) {
    var method = String(opts.method || 'POST').toUpperCase();
    var headers = Object.assign({}, opts.headers || {});
    var bodyToSend = opts.body;
    var queueBody = opts.body;

    if (opts.formObject && !bodyToSend) {
      var fd = new FormData();
      Object.keys(opts.formObject).forEach(function (k) {
        fd.append(k, opts.formObject[k]);
      });
      bodyToSend = fd;
      queueBody = { _formType: 'formdata', data: opts.formObject };
    }

    var doOfflineQueue = async function () {
      if (typeof opts.optimisticUpdate === 'function') {
        try {
          await opts.optimisticUpdate();
        } catch (_) {}
      }
      var queuedItem = await enqueue({
        label: opts.label || 'অফলাইন পরিবর্তন',
        url: opts.url,
        method: method,
        headers: headers,
        body: queueBody,
        isNoCors: Boolean(opts.isNoCors),
      });
      return { ok: true, queued: true, offline: true, item: queuedItem };
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return doOfflineQueue();
    }

    try {
      var fetchOpts = {
        method: method,
        headers: headers,
        credentials: opts.isNoCors ? 'omit' : 'same-origin',
      };
      if (opts.isNoCors) {
        fetchOpts.mode = 'no-cors';
      }
      if (bodyToSend !== undefined && bodyToSend !== null && method !== 'GET' && method !== 'HEAD') {
        fetchOpts.body = bodyToSend;
      }

      var res = await fetch(opts.url, fetchOpts);
      if (opts.isNoCors) {
        return { ok: true, queued: false, offline: false, response: res, data: {} };
      }

      var data = {};
      try {
        var ct = res.headers.get('content-type') || '';
        if (ct.indexOf('application/json') !== -1) {
          data = await res.json();
        } else {
          data = { text: await res.text() };
        }
      } catch (_) {}

      if (!res.ok) {
        var err = new Error(data.error || ('সার্ভার ত্রুটি (' + res.status + ')'));
        err.status = res.status;
        err.data = data;
        throw err;
      }

      if (typeof opts.onOnlineSuccess === 'function') {
        try {
          await opts.onOnlineSuccess(data);
        } catch (_) {}
      }
      return { ok: true, queued: false, offline: false, response: res, data: data };
    } catch (err) {
      if (isNetworkError(err)) {
        return doOfflineQueue();
      }
      throw err;
    }
  }

  function syncFromServer(force) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return getSnapshot('bootstrap');
    }
    if (bootstrapInFlight && !force) return bootstrapInFlight;

    bootstrapInFlight = fetch('/api/offline/bootstrap', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('Bootstrap HTTP ' + res.status);
        return res.json();
      })
      .then(async function (serverData) {
        var pending = await getQueue();
        if (pending.length === 0) {
          await setSnapshot('bootstrap', serverData);
          if (serverData.excelState) {
            await setSnapshot('excelState', serverData.excelState);
          }
          if (serverData.notices && Array.isArray(serverData.notices.notices)) {
            applyNoticeBadgeCount(countUnreadNoticesFromList(serverData.notices.notices));
          }
          notify({ type: 'BOOTSTRAP_REFRESHED' });
        } else {
          // Keep optimistic local items if queue isn't empty yet; merge base read fields safely
          var existing = await getSnapshot('bootstrap');
          if (!existing) {
            await setSnapshot('bootstrap', serverData);
            if (serverData.notices && Array.isArray(serverData.notices.notices)) {
              applyNoticeBadgeCount(countUnreadNoticesFromList(serverData.notices.notices));
            }
          }
        }
        return serverData;
      })
      .catch(function () {
        return getSnapshot('bootstrap');
      })
      .finally(function () {
        bootstrapInFlight = null;
      });

    return bootstrapInFlight;
  }

  async function runFlushInternal() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, remaining: (await getQueue()).length, authRequired: false };
    }

    var queue = await getQueue();
    if (!queue.length) {
      notify({ type: 'SYNC_IDLE' });
      return { synced: 0, remaining: 0, authRequired: false };
    }

    notify({ type: 'SYNC_STARTED', count: queue.length });
    var synced = 0;
    var authRequired = false;

    for (var i = 0; i < queue.length; i++) {
      var item = queue[i];
      if (!navigator.onLine) break;

      try {
        var bodyToSend = item.body;
        if (bodyToSend && typeof bodyToSend === 'object' && bodyToSend._formType === 'formdata') {
          var fd = new FormData();
          Object.keys(bodyToSend.data || {}).forEach(function (k) {
            fd.append(k, bodyToSend.data[k]);
          });
          bodyToSend = fd;
        }

        var fetchOpts = {
          method: item.method || 'POST',
          headers: item.headers || {},
          credentials: item.isNoCors ? 'omit' : 'same-origin',
        };
        if (item.isNoCors) {
          fetchOpts.mode = 'no-cors';
        }
        if (bodyToSend !== undefined && bodyToSend !== null && fetchOpts.method !== 'GET' && fetchOpts.method !== 'HEAD') {
          fetchOpts.body = bodyToSend;
        }

        var res = await fetch(item.url, fetchOpts);
        if (item.isNoCors || res.ok) {
          await deleteQueueItem(item.id);
          synced++;
          continue;
        }

        if (res.status === 401 || res.status === 403) {
          authRequired = true;
          item.status = 'auth_required';
          item.lastError = 'অ্যাডমিন লগইন প্রয়োজন';
          await putQueueItem(item);
          continue;
        }

        // Other 4xx errors: mark retries and keep or drop if malformed
        item.retries = (item.retries || 0) + 1;
        item.lastError = 'HTTP ' + res.status;
        if (res.status >= 400 && res.status < 500 && item.retries >= 3) {
          await deleteQueueItem(item.id);
        } else {
          await putQueueItem(item);
        }
      } catch (err) {
        if (isNetworkError(err)) {
          break;
        }
        item.retries = (item.retries || 0) + 1;
        item.lastError = String(err.message || 'Sync error');
        await putQueueItem(item);
      }
    }

    var remainingItems = await getQueue();
    if (synced > 0) {
      await syncFromServer(true);
    }

    notify({
      type: synced > 0 ? 'SYNC_COMPLETED' : (authRequired ? 'AUTH_REQUIRED' : 'SYNC_FINISHED'),
      syncedCount: synced,
      pendingCount: remainingItems.length,
      authRequired: authRequired || remainingItems.some(function (x) { return x.status === 'auth_required'; }),
    });

    return {
      synced: synced,
      remaining: remainingItems.length,
      authRequired: authRequired,
    };
  }

  function flushSyncQueue() {
    if (syncInFlight) return syncInFlight;
    var exec = function () {
      return runFlushInternal();
    };
    if (navigator.locks && typeof navigator.locks.request === 'function') {
      syncInFlight = navigator.locks.request('nadufm_sync_flush_lock', exec).finally(function () {
        syncInFlight = null;
      });
    } else {
      syncInFlight = exec().finally(function () {
        syncInFlight = null;
      });
    }
    return syncInFlight;
  }

  async function getClassesAndRollsOffline(classParam) {
    var snap = await getSnapshot('bootstrap');
    if (!snap) return null;
    var students = Array.isArray(snap.students) ? snap.students : [];
    var classes = (snap.classesAndRolls && Array.isArray(snap.classesAndRolls.classes))
      ? snap.classesAndRolls.classes
      : [];

    var rawClass = String(classParam || '').trim();
    if (!rawClass) {
      return { classes: classes, rolls: [], totalStudents: students.length, offline: true };
    }

    var rolls = [];
    if (rawClass.indexOf('excel:') === 0 && snap.meritByClass && snap.meritByClass[rawClass]) {
      var meritEntry = snap.meritByClass[rawClass];
      rolls = (meritEntry.meritData || []).map(function (r) {
        return {
          roll: r.roll,
          rollBn: bnNum(r.roll),
          name: r.name || 'নাম উল্লেখ নেই',
          className: meritEntry.selectedName || '',
          hasResult: true,
          source: 'results',
        };
      });
    } else {
      var targetCls = normalizeClassInput(rawClass);
      rolls = students
        .filter(function (st) {
          if (!st.roll) return false;
          if (targetCls.key && st.classKey) return st.classKey === targetCls.key;
          return String(st.class_name || '').toLowerCase() === targetCls.label.toLowerCase();
        })
        .map(function (st) {
          return {
            roll: st.roll,
            rollBn: st.rollBn || bnNum(st.roll),
            name: st.name_bn || st.name_en || 'নাম উল্লেখ নেই',
            father: st.father_bn || '',
            id: st.id || st.reg_no || '',
            className: st.class_name,
            hasResult: Boolean(st.resultSummary),
            source: st.source,
          };
        });
    }

    rolls.sort(function (a, b) {
      var na = parseInt(enNum(a.roll), 10);
      var nb = parseInt(enNum(b.roll), 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return String(a.roll).localeCompare(String(b.roll), 'bn');
    });

    return { classes: classes, rolls: rolls, totalStudents: students.length, offline: true };
  }

  async function findStudentsOffline(opts) {
    var snap = await getSnapshot('bootstrap');
    if (!snap || !Array.isArray(snap.students)) return { status: 'not_found', matches: [], offline: true };

    var resolvedClass = String((opts && opts.classParam) || '').trim();
    if (resolvedClass.indexOf('excel:') === 0 && snap.uploadedExams) {
      var eid = resolvedClass.slice(6);
      var matchedEx = snap.uploadedExams.find(function (ex) { return ex.id === eid; });
      if (matchedEx) resolvedClass = matchedEx.classId || matchedEx.className || '';
    }

    var targetCls = normalizeClassInput(resolvedClass);
    var targetRoll = normalizeRollKey((opts && opts.rollParam) || '');
    var q = String((opts && opts.query) || '').trim().toLowerCase();
    var qEn = enNum(q);

    if (!targetCls.key && !targetRoll && !q) {
      return { status: 'not_found', matches: [], offline: true };
    }

    var matches = snap.students.filter(function (st) {
      if (targetRoll) {
        var stRoll = normalizeRollKey(st.roll);
        if (stRoll !== targetRoll) return false;
        if (targetCls.key) {
          return st.classKey === targetCls.key || String(st.class_name || '').toLowerCase() === targetCls.label.toLowerCase();
        }
        return true;
      }
      if (targetCls.key && !q) {
        return st.classKey === targetCls.key || String(st.class_name || '').toLowerCase() === targetCls.label.toLowerCase();
      }
      if (q) {
        var classOk = !targetCls.key || st.classKey === targetCls.key || String(st.class_name || '').toLowerCase() === targetCls.label.toLowerCase();
        if (!classOk) return false;
        var hay = [st.roll, enNum(st.roll), st.id, st.reg_no, st.name_bn, st.name_en, st.father_bn, st.mother_bn, st.mobile]
          .join(' ')
          .toLowerCase();
        return hay.indexOf(q) !== -1 || hay.indexOf(qEn) !== -1;
      }
      return false;
    });

    matches.sort(function (a, b) {
      var na = parseInt(enNum(a.roll), 10);
      var nb = parseInt(enNum(b.roll), 10);
      if (!isNaN(na) && !isNaN(nb) && na !== nb) return na - nb;
      return String(a.roll).localeCompare(String(b.roll), 'bn');
    });

    if (!matches.length) {
      return { status: 'not_found', matches: [], offline: true };
    }
    var exact = matches.length === 1 ? matches[0] : (targetRoll && matches.length > 0 ? matches[0] : null);
    return {
      status: 'success',
      student: exact || matches[0],
      matches: matches,
      offline: true,
    };
  }

  async function getMeritListOffline(classOrExam) {
    var snap = await getSnapshot('bootstrap');
    if (!snap || !snap.meritByClass) return null;
    var key = String(classOrExam || '').trim();
    if (snap.meritByClass[key]) return snap.meritByClass[key];
    var norm = normalizeClassInput(key);
    if (norm.key && snap.meritByClass[norm.key]) return snap.meritByClass[norm.key];
    return null;
  }

  function warmOfflinePages(includeAdmin) {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then(function (reg) {
        if (reg && reg.active) {
          reg.active.postMessage({
            type: 'WARM_OFFLINE_PAGES',
            includeAdmin: Boolean(includeAdmin),
          });
        }
      })
      .catch(function () {});
  }

  function clearAdminCache() {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready
      .then(function (reg) {
        if (reg && reg.active) {
          reg.active.postMessage({ type: 'CLEAR_ADMIN_CACHE' });
        }
      })
      .catch(function () {});
  }

  // Listen to Service Worker background sync triggers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', function (ev) {
      if (ev && ev.data && ev.data.type === 'TRIGGER_SYNC') {
        flushSyncQueue();
      }
    });
  }

  // Auto-sync when connectivity returns or tab becomes visible
  global.addEventListener('online', function () {
    notify({ type: 'ONLINE' });
    flushSyncQueue();
    syncFromServer(false);
  });

  global.addEventListener('offline', function () {
    notify({ type: 'OFFLINE' });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      flushSyncQueue();
    }
  });

  // Periodic safety check: flush sync queue & refresh notice badge when online
  setInterval(function () {
    if (!navigator.onLine) return;
    getQueue().then(function (items) {
      var hasPending = items.some(function (x) { return x.status !== 'auth_required'; });
      if (hasPending) {
        flushSyncQueue();
      } else if (global.self === global.top && document.visibilityState === 'visible') {
        syncFromServer(true);
      }
    });
  }, 30000);

  // Initial sync & cache warm on page load
  document.addEventListener('DOMContentLoaded', function () {
    notify({ type: 'INIT' });
    updateNoticeBadge();
    if (navigator.onLine) {
      setTimeout(function () {
        flushSyncQueue().then(function () {
          return syncFromServer(false);
        }).then(function (data) {
          updateNoticeBadge(data && data.notices && data.notices.notices);
          if (global.self === global.top) {
            warmOfflinePages(Boolean(data && data.isAdmin));
          }
        });
      }, 500);
    }
  });

  global.NadufmOffline = {
    bnNum: bnNum,
    enNum: enNum,
    normalizeRollKey: normalizeRollKey,
    normalizeClassInput: normalizeClassInput,
    getSnapshot: getSnapshot,
    setSnapshot: setSnapshot,
    updateBootstrap: updateBootstrap,
    getReadNoticeIds: getReadNoticeIds,
    markNoticeRead: markNoticeRead,
    updateNoticeBadge: updateNoticeBadge,
    getQueue: getQueue,
    enqueue: enqueue,
    flushSyncQueue: flushSyncQueue,
    syncFromServer: syncFromServer,
    saveMutationOrQueue: saveMutationOrQueue,
    isNetworkError: isNetworkError,
    getClassesAndRolls: getClassesAndRollsOffline,
    findStudents: findStudentsOffline,
    getMeritList: getMeritListOffline,
    warmOfflinePages: warmOfflinePages,
    clearAdminCache: clearAdminCache,
    notify: notify,
  };
})(window);
