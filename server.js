import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { buildDocxBuffer } from './data/docxExport.js';
import {
  classMap,
  convertToBengali,
  bnToEnNumber,
  getGradeInfo,
  parseCsv,
  isScienceGroupText,
  formatStudentNameWithGroup,
} from './data/seed.js';
import {
  loadExcelStore,
  saveExcelStore,
  parseExcelBuffer,
  autoDetectStudentMapping,
  detectResultColumns,
  computeResultSheet,
  buildExcelBuffer,
  buildMultiSheetExcelBuffer,
  listBackups,
  createBackupSnapshot,
  restoreBackupSnapshot,
  restoreBackupFromData,
  deleteBackupSnapshot,
  exportPortableBackupObject,
} from './data/excelStore.js';
import { loadPortalStore, savePortalStore } from './data/portalStore.js';
import {
  getUnifiedStudents,
  getClassesAndRolls,
  findUnifiedStudents,
  normalizeClassInput,
  normalizeRollKey,
  sanitizeImageUrl,
} from './data/studentHub.js';
import { ICONS, iconSvg } from './data/iconSet.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

const app = express();
const PORT = process.env.NGINX_PORT
  ? Number(process.env.DEFAULT_APP_PORT) || 3000
  : Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';

function getHeadlines() {
  const store = loadPortalStore();
  return (store.notices || [])
    .filter((n) => n.type === 'headline')
    .sort((a, b) => b.id - a.id)
    .slice(0, 5)
    .map((n) => ({ announcement: n.subject }));
}

function getNoticesForBoard() {
  const store = loadPortalStore();
  return (store.notices || [])
    .filter((n) => n.type === 'notice')
    .sort((a, b) => b.id - a.id)
    .map((n) => ({
      id: n.id,
      date: n.notice_date,
      subject: n.subject,
      description: n.description,
      link: n.link,
      isNew: n.is_new,
    }));
}

app.set('trust proxy', 1);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get(['/manifest.webmanifest', '/manifest.json'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Service-Worker-Allowed', '/');
  res.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.use('/vendor/html2pdf.bundle.min.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'node_modules', 'html2pdf.js', 'dist', 'html2pdf.bundle.min.js'));
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use(express.json({ limit: '25mb' }));
app.use((req, res, next) => {
  res.locals.isEmbedded = req.query.embed === '1' || req.body?.embed === '1';
  res.locals.iconSvg = iconSvg;
  res.locals.ICONS = ICONS;
  res.locals.isAdmin = Boolean(getValidAdminSession(req));
  next();
});

const ADMIN_COOKIE_NAME = 'nadufm_admin_sid';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 12;
const DEFAULT_ADMIN_SCRYPT = 'd469f1a8242713b974d298aae6a24578:ee415d053409ab438eb8792abd799b3534dffa22eb8399bc80aca7c4d5998607e2b7189a7e19a867568ed75735596b070b72239cfcd3ec3d4a7815140a852b4f';

const adminSessions = new Map();
const loginAttempts = new Map();

function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader) return out;
  for (const part of String(cookieHeader).split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (k) {
      try {
        out[k] = decodeURIComponent(v);
      } catch {
        out[k] = v;
      }
    }
  }
  return out;
}

function isHttpsRequest(req) {
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  return Boolean(req.secure || proto === 'https');
}

function buildAdminCookieHeader(req, token, maxAgeSeconds) {
  const parts = [
    `${ADMIN_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttpsRequest(req)) {
    parts.push('SameSite=None', 'Secure', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  return parts.join('; ');
}

function getSafeNextUrl(rawNext) {
  const val = String(rawNext || '').trim();
  if (!val || !val.startsWith('/') || val.startsWith('//') || val.startsWith('/\\')) {
    return '/dashboard.php';
  }
  return val;
}

function verifyAdminPassword(candidate) {
  const input = String(candidate || '');
  if (!input) return false;
  const envPw = String(process.env.ADMIN_PASSWORD || '');
  if (envPw) {
    const a = crypto.createHash('sha256').update(input).digest();
    const b = crypto.createHash('sha256').update(envPw).digest();
    return crypto.timingSafeEqual(a, b);
  }
  const [salt, expectedHex] = DEFAULT_ADMIN_SCRYPT.split(':');
  const expectedBuf = Buffer.from(expectedHex, 'hex');
  const actualBuf = crypto.scryptSync(input, salt, expectedBuf.length);
  return crypto.timingSafeEqual(actualBuf, expectedBuf);
}

function getValidAdminSession(req) {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[ADMIN_COOKIE_NAME];
  if (!sid) return null;
  const sess = adminSessions.get(sid);
  if (!sess) return null;
  if (Date.now() > sess.expiresAt) {
    adminSessions.delete(sid);
    return null;
  }
  return { sid, ...sess };
}

function verifySameOrigin(req, res, next) {
  const origin = req.headers.origin;
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const expectedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
      if (expectedHost && originHost !== expectedHost) {
        return res.status(403).json({ error: 'অননুমোদিত অনুরোধ।' });
      }
    } catch {
      return res.status(403).json({ error: 'অবৈধ অনুরোধ।' });
    }
  }
  next();
}

function requireAdminPage(req, res, next) {
  if (getValidAdminSession(req)) {
    return next();
  }
  const nextUrl = getSafeNextUrl(req.originalUrl);
  return res.redirect(`/admin-login?next=${encodeURIComponent(nextUrl)}`);
}

function requireAdminApi(req, res, next) {
  if (!getValidAdminSession(req)) {
    return res.status(401).json({ error: 'অ্যাডমিন অনুমোদন প্রয়োজন। অনুগ্রহ করে পুনরায় লগইন করুন।' });
  }
  next();
}

app.get(['/admin-login', '/admin-login.php'], (req, res) => {
  const nextUrl = getSafeNextUrl(req.query.next);
  if (getValidAdminSession(req)) {
    return res.redirect(nextUrl);
  }
  res.render('admin-login', {
    error: '',
    nextUrl,
    isEmbedded: req.query.embed === '1' || nextUrl.includes('embed=1'),
  });
});

app.post(['/admin-login', '/admin-login.php'], verifySameOrigin, (req, res) => {
  const nextUrl = getSafeNextUrl(req.body?.next || req.query.next);
  const isEmbedded = req.query.embed === '1' || nextUrl.includes('embed=1');
  const wantsJson = String(req.headers.accept || '').includes('application/json')
    || String(req.headers['x-requested-with'] || '').toLowerCase() === 'xmlhttprequest';
  const clientKey = String(req.ip || 'unknown');
  const now = Date.now();
  const attemptInfo = loginAttempts.get(clientKey);
  if (attemptInfo && now < attemptInfo.resetAt && attemptInfo.count >= MAX_LOGIN_ATTEMPTS) {
    const rateMsg = 'অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।';
    if (wantsJson) {
      return res.status(429).json({ ok: false, error: rateMsg });
    }
    return res.status(429).render('admin-login', {
      error: rateMsg,
      nextUrl,
      isEmbedded,
    });
  }

  const password = String(req.body?.password || '');
  if (!verifyAdminPassword(password)) {
    const nextCount = (!attemptInfo || now >= attemptInfo.resetAt) ? 1 : attemptInfo.count + 1;
    loginAttempts.set(clientKey, {
      count: nextCount,
      resetAt: (!attemptInfo || now >= attemptInfo.resetAt) ? now + LOGIN_WINDOW_MS : attemptInfo.resetAt,
    });
    const wrongMsg = 'ভুল পাসওয়ার্ড! সঠিক অ্যাডমিন পাসওয়ার্ড দিন।';
    if (wantsJson) {
      return res.status(401).json({ ok: false, error: wrongMsg });
    }
    return res.status(401).render('admin-login', {
      error: wrongMsg,
      nextUrl,
      isEmbedded,
    });
  }

  loginAttempts.delete(clientKey);
  const token = crypto.randomBytes(32).toString('hex');
  adminSessions.set(token, {
    createdAt: now,
    expiresAt: now + SESSION_TTL_MS,
  });
  res.setHeader('Set-Cookie', buildAdminCookieHeader(req, token, Math.floor(SESSION_TTL_MS / 1000)));
  if (wantsJson) {
    return res.status(200).json({ ok: true, redirectTo: nextUrl });
  }
  return res.redirect(nextUrl);
});

app.post(['/admin-logout', '/admin-logout.php'], verifySameOrigin, (req, res) => {
  const cookies = parseCookies(req.headers.cookie);
  const sid = cookies[ADMIN_COOKIE_NAME];
  if (sid) {
    adminSessions.delete(sid);
  }
  res.setHeader('Set-Cookie', buildAdminCookieHeader(req, '', 0));
  return res.redirect('/index.php');
});

function formatClassLabel(name, classId = '') {
  const raw = String(name || (classId && classMap[classId]?.name) || '').trim();
  if (!raw || raw === 'custom') return 'নির্ধারিত শ্রেণি';
  return /(?:শ্রেণি|শ্রেণী|বর্ষ)$/.test(raw) ? raw : `${raw} শ্রেণি`;
}

function buildCsvSyntheticExam(classId, className, csvRows) {
  const headers = csvRows[0] || [];
  const rawSubjectCols = [];
  const infoCols = [];

  for (let i = 0; i < headers.length; i++) {
    const label = String(headers[i] || '').trim();
    const key = `col_${i}`;
    if (i < 3) {
      infoCols.push({ key, label: label || key, isSubject: false, fullMarks: 0, idx: i });
    } else if (label !== '') {
      rawSubjectCols.push({ key, label, idx: i });
    }
  }

  const detectedSubs = detectResultColumns(rawSubjectCols).map((col, pos) => ({
    ...col,
    idx: rawSubjectCols[pos].idx,
  }));

  const columns = [
    ...infoCols.map(({ key, label, isSubject, fullMarks }) => ({ key, label, isSubject, fullMarks })),
    ...detectedSubs.map(({ key, label, isSubject, fullMarks, isOptional }) => ({ key, label, isSubject, fullMarks, isOptional })),
  ];

  const col1Label = String(headers[1] || '').trim();
  const groupCol = detectedSubs.find((c) => !c.isSubject && /বিভাগ|গ্রুপ|group|department|dept|stream/i.test(c.label))?.key
    || (/বিভাগ|গ্রুপ|group|department|dept|stream/i.test(col1Label) ? 'col_1' : '');
  const fatherCol = /পিতা|father/i.test(col1Label) ? 'col_1' : '';
  const optionalCol = detectedSubs.find((c) => !c.isSubject && /৪র্থ|ঐচ্ছিক|4th|optional/i.test(c.label))?.key || '';

  const rows = [];
  for (let r = 1; r < csvRows.length; r++) {
    const data = csvRows[r];
    if (!data || !data[0] || !String(data[0]).trim()) continue;
    const obj = { _id: `csv_${r}` };
    for (const c of infoCols) {
      obj[c.key] = String(data[c.idx] ?? '').trim();
    }
    for (const c of detectedSubs) {
      obj[c.key] = String(data[c.idx] ?? '').trim();
    }
    rows.push(obj);
  }

  return {
    id: `csv_${classId}`,
    classId: String(classId || ''),
    className: String(className || ''),
    examName: 'বার্ষিক পরীক্ষা',
    year: '২০২৬',
    passPercent: 33,
    maxPromoteFail: 0,
    columns,
    mapping: {
      roll: 'col_2',
      name: 'col_0',
      father: fatherCol,
      id: '',
      group: groupCol,
      optionalSubject: optionalCol,
    },
    rows,
  };
}

function normalizeExamMetaKey(val, fallback = '') {
  const s = bnToEnNumber(String(val || fallback || '').trim())
    .normalize('NFC')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  return s;
}

function isExamPublished(ex) {
  return Boolean(ex && Array.isArray(ex.rows) && ex.rows.length > 0 && ex.published !== false);
}

function getUploadedExamsSummary(store, { includeDrafts = false } = {}) {
  const exams = (store.results && store.results.exams) || {};
  return Object.values(exams)
    .filter((ex) => Array.isArray(ex.rows) && ex.rows.length > 0 && (includeDrafts || ex.published !== false))
    .map((ex) => {
      const className = String(ex.className || (ex.classId && classMap[ex.classId]?.name) || '').trim();
      const classLabel = formatClassLabel(className, ex.classId);
      const examName = String(ex.examName || 'বার্ষিক পরীক্ষা').trim();
      const year = String(ex.year || '২০২৬').trim();
      const dropdownLabel = `${classLabel} — ${examName}${year ? ` (${year})` : ''}`;
      return {
        id: ex.id,
        title: ex.title || dropdownLabel,
        dropdownLabel,
        classId: ex.classId || '',
        className,
        classLabel,
        examName,
        year: year || '২০২৬',
        published: ex.published !== false,
        rowCount: ex.rows.length,
        updatedAt: ex.updatedAt || null,
      };
    })
    .sort((a, b) => {
      const ya = parseInt(bnToEnNumber(a.year), 10) || 0;
      const yb = parseInt(bnToEnNumber(b.year), 10) || 0;
      if (yb !== ya) return yb - ya;
      return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
    });
}

function serializeExcelState(store) {
  const examsMap = (store.results && store.results.exams) || {};
  const computedExams = {};
  for (const [id, ex] of Object.entries(examsMap)) {
    const computed = computeResultSheet(ex);
    computedExams[id] = {
      ...ex,
      computed,
    };
  }
  return {
    students: store.students,
    results: {
      activeExamId: store.results.activeExamId,
      exams: computedExams,
    },
    documents: store.documents,
    classMap,
    backups: listBackups(),
  };
}

// Public routes
app.get(['/', '/index.php'], (req, res) => {
  const portal = loadPortalStore();
  const carouselTeachers = (portal.teachers || []).map((t) => ({
    name: t.name,
    desg: t.designation,
    index: t.index_no,
    phone: t.mobile,
    img: t.photo || 'logo.png',
  }));
  res.render('index', {
    pageTitle: 'নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    headlines: getHeadlines(),
    notices: getNoticesForBoard(),
    teachers: carouselTeachers,
    gallery: portal.gallery || [],
    galleryIntervalSec: portal.galleryIntervalSec || 12,
  });
});

app.get(['/notices', '/notices.php'], (req, res) => {
  res.render('notices', {
    pageTitle: 'নোটিশ বোর্ড - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    notices: getNoticesForBoard(),
  });
});

app.get('/api/notices', (req, res) => {
  res.json({
    headlines: getHeadlines(),
    notices: getNoticesForBoard(),
  });
});

app.get('/api/offline/bootstrap', (req, res) => {
  const excelStore = loadExcelStore();
  const portal = loadPortalStore();
  const isAdmin = Boolean(getValidAdminSession(req));
  const uploadedExams = getUploadedExamsSummary(excelStore);
  const students = getUnifiedStudents(excelStore, portal);
  const classesAndRolls = getClassesAndRolls(excelStore, portal, '');

  const mapMeritRow = (item) => ({
    name: item.name || '—',
    displayName: item.displayName || formatStudentNameWithGroup(item.name || '—', item.isScience),
    isScience: Boolean(item.isScience),
    groupLabel: item.groupLabel || (item.isScience ? 'বিজ্ঞান' : 'সাধারণ'),
    roll: item.roll,
    total: item.totalObtained,
    fullMarks: item.totalFullMarks,
    pct: item.percentage,
    gpa: item.gpa,
    gpaWithoutOptional: item.gpaWithoutOptional ?? item.gpa,
    isBoardExam: Boolean(item.isBoardExam),
    hasOptionalSubject: Boolean(item.hasOptionalSubject),
    optionalBonus: item.optionalBonus || 0,
    fail: item.failCount,
    absent: item.allAbsent,
    isPromoted: item.isPromoted,
    status: item.status,
    statusBn: item.statusBn,
    meritRank: item.meritRank,
  });

  const meritByClass = {};
  for (const ex of Object.values(excelStore.results?.exams || {})) {
    if (!isExamPublished(ex)) continue;
    const computed = computeResultSheet(ex);
    const selectedName = formatClassLabel(ex.className, ex.classId);
    const exName = String(ex.examName || 'বার্ষিক পরীক্ষা').trim();
    const exYear = String(ex.year || '').trim();
    const selectedExamTitle = `শ্রেণি: ${selectedName} · ${exName}${exYear ? ` (${exYear})` : ''}`;
    const scienceMeritData = (computed.scienceMeritList || []).map(mapMeritRow);
    const otherMeritData = (computed.otherMeritList || []).map(mapMeritRow);
    const entry = {
      examId: ex.id,
      classId: String(ex.classId || ''),
      selectedName,
      selectedExamTitle,
      scienceMeritData,
      otherMeritData,
      meritData: [...otherMeritData, ...scienceMeritData],
    };
    meritByClass[`excel:${ex.id}`] = entry;
    if (ex.classId && !meritByClass[String(ex.classId)]) {
      meritByClass[String(ex.classId)] = entry;
    }
  }

  const payload = {
    timestamp: new Date().toISOString(),
    isAdmin,
    classMap,
    classesAndRolls,
    students,
    uploadedExams,
    meritByClass,
    notices: {
      headlines: getHeadlines(),
      notices: getNoticesForBoard(),
    },
    teachers: portal.teachers || [],
    governingBody: portal.governingBody || { institutionName: '', tenure: '', members: [] },
    gallery: portal.gallery || [],
    galleryIntervalSec: portal.galleryIntervalSec || 12,
    academic: {
      routines: portal.routines || [],
      syllabus: portal.syllabus || [],
      fees: portal.fees || [],
      registrations: portal.registrations || [],
      studentStats: portal.studentStats || [],
    },
  };

  if (isAdmin) {
    payload.admissions = portal.admissions || [];
    payload.excelState = serializeExcelState(excelStore);
  }

  res.setHeader('Cache-Control', 'no-store');
  res.json(payload);
});

app.get(['/about', '/about.php'], (req, res) => {
  res.render('about', {
    pageTitle: 'আমাদের সম্পর্কে - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/teacher-list', '/teacher-list.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('teacher-list', {
    pageTitle: 'শিক্ষক কর্মচারী- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    teachers: portal.teachers || [],
  });
});

app.get(['/contact', '/contact.php'], (req, res) => {
  res.render('contact', {
    pageTitle: 'যোগাযোগ - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/student', '/student.php'], (req, res) => {
  res.render('student', {
    pageTitle: 'ছাত্র ছাত্রী - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/governingbody', '/governingbody.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('governingbody', {
    pageTitle: 'গভর্নিং বডি- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    governingBody: portal.governingBody || { institutionName: '', tenure: '', members: [] },
    convertToBengali,
  });
});

app.get(['/morehistory', '/morehistory.php'], (req, res) => {
  res.render('morehistory', {
    pageTitle: 'প্রতিষ্ঠানের ইতিহাস - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/presidentspeech', '/presidentspeech.php'], (req, res) => {
  res.render('presidentspeech', {
    pageTitle: 'সভাপতির বাণী- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/principalspeech', '/principalspeech.php'], (req, res) => {
  res.render('principalspeech', {
    pageTitle: 'অধ্যক্ষের বাণী - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/calendar', '/calendar.php'], (req, res) => {
  res.render('calendar', {
    pageTitle: 'শিক্ষাপঞ্জি ও ক্যালেন্ডার ২০২৬ - নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা',
  });
});

app.get(['/holidays', '/holidays.php'], (req, res) => {
  res.render('holidays', {
    pageTitle: 'শিক্ষাপঞ্জি ও ক্যালেন্ডার - নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা',
  });
});

app.get(['/fees', '/fees.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('fees', {
    pageTitle: 'ফি পরিশোধ - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    feesList: portal.fees || [],
  });
});

app.get(['/registration', '/registration.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('registration', {
    pageTitle: 'রেজিস্ট্রেশন - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    registrations: portal.registrations || [],
  });
});

app.get(['/routine', '/routine.php', '/classroutine.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('routine', {
    pageTitle: 'ক্লাস রুটিন- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    routines: portal.routines || [],
  });
});

app.get(['/student-info', '/student-info.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('student-info', {
    pageTitle: 'ছাত্র- ছাত্রী সংখ্যা- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    studentStats: portal.studentStats || [],
    convertToBengali,
  });
});

app.get(['/syllabus', '/syllabus.php'], (req, res) => {
  const portal = loadPortalStore();
  res.render('syllabus', {
    pageTitle: 'সিলেবাস - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    syllabusList: portal.syllabus || [],
  });
});

app.get(['/print-form', '/print-form.php'], (req, res) => {
  res.render('print-form', {
    pageTitle: 'ভর্তি ফরম প্রিন্ট - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.get(['/view_notice', '/view_notice.php'], (req, res) => {
  if (req.query.offline_shell === '1') {
    return res.render('view_notice', {
      noticeId: '',
      subject: 'নোটিশ লোড হচ্ছে...',
      date: '',
      description: '',
      missingOnServer: true,
    });
  }

  const noticeId = parseInt(String(req.query.id || '0'), 10);
  if (!noticeId) {
    return res.redirect('/index.php');
  }

  const portal = loadPortalStore();
  const row = (portal.notices || []).find((n) => n.id === noticeId);
  if (!row) {
    return res.render('view_notice', {
      noticeId,
      subject: 'নোটিশ পাওয়া যায়নি',
      date: '',
      description: `নোটিশটি পাওয়া যায়নি। আইডি: ${noticeId}`,
      missingOnServer: true,
    });
  }

  const extLink = String(row.link || '').trim();
  if (extLink && extLink !== '#' && /^https?:\/\//i.test(extLink)) {
    return res.redirect(extLink);
  }

  res.render('view_notice', {
    noticeId,
    subject: row.subject,
    date: row.notice_date,
    description: row.description || 'এই নোটিশটির কোনো বিস্তারিত বর্ণনা পাওয়া যায়নি।',
    missingOnServer: false,
  });
});

app.get(['/merit-list', '/merit-list.php'], async (req, res) => {
  const selectedClass = String(req.query.class_id || '');
  const selectedExamId = String(req.query.exam_id || '');
  const excelStore = loadExcelStore();
  const uploadedExams = getUploadedExamsSummary(excelStore);
  const uploadedClassIds = uploadedExams
    .map((ex) => String(ex.classId || '').trim())
    .filter(Boolean);

  let selectedName = '';
  let selectedExamTitle = '';
  let meritData = [];
  let scienceMeritData = [];
  let otherMeritData = [];
  let sourceType = 'csv';

  // Prefer explicit exam_id, or uploaded published Excel sheet matching class_id / normalized className
  const viewerIsAdmin = Boolean(getValidAdminSession(req));
  let matchedExcelExam = null;
  if (selectedExamId && excelStore.results?.exams?.[selectedExamId]) {
    const candidate = excelStore.results.exams[selectedExamId];
    if (isExamPublished(candidate) || (viewerIsAdmin && Array.isArray(candidate.rows) && candidate.rows.length > 0)) {
      matchedExcelExam = candidate;
    }
  } else if (selectedClass.startsWith('excel:')) {
    const eid = selectedClass.slice(6);
    const candidate = excelStore.results?.exams?.[eid];
    if (candidate && (isExamPublished(candidate) || (viewerIsAdmin && Array.isArray(candidate.rows) && candidate.rows.length > 0))) {
      matchedExcelExam = candidate;
    }
  } else if (selectedClass !== '') {
    const normSel = normalizeClassInput(selectedClass);
    matchedExcelExam = Object.values(excelStore.results?.exams || {}).find((ex) => {
      if (!isExamPublished(ex)) return false;
      if (String(ex.classId) === selectedClass) return true;
      const exNorm = normalizeClassInput(ex.className || ex.classId || '');
      return Boolean(normSel.key && exNorm.key && normSel.key === exNorm.key);
    }) || null;
  }

  const mapComputedMeritItem = (item) => ({
    name: item.name || '—',
    displayName: item.displayName || formatStudentNameWithGroup(item.name || '—', item.isScience),
    isScience: Boolean(item.isScience),
    groupLabel: item.groupLabel || (item.isScience ? 'বিজ্ঞান' : 'সাধারণ'),
    roll: item.roll,
    total: item.totalObtained,
    fullMarks: item.totalFullMarks,
    pct: item.percentage,
    gpa: item.gpa,
    gpaWithoutOptional: item.gpaWithoutOptional ?? item.gpa,
    isBoardExam: Boolean(item.isBoardExam),
    hasOptionalSubject: Boolean(item.hasOptionalSubject),
    optionalBonus: item.optionalBonus || 0,
    fail: item.failCount,
    absent: item.allAbsent,
    isPromoted: item.isPromoted,
    status: item.status,
    statusBn: item.statusBn,
    meritRank: item.meritRank,
  });

  if (matchedExcelExam && Array.isArray(matchedExcelExam.rows) && matchedExcelExam.rows.length > 0) {
    sourceType = 'excel';
    selectedName = formatClassLabel(matchedExcelExam.className, matchedExcelExam.classId);
    const exName = String(matchedExcelExam.examName || 'বার্ষিক পরীক্ষা').trim();
    const exYear = String(matchedExcelExam.year || '').trim();
    selectedExamTitle = `শ্রেণি: ${selectedName} · ${exName}${exYear ? ` (${exYear})` : ''}`;
    const computed = computeResultSheet(matchedExcelExam);
    scienceMeritData = (computed.scienceMeritList || []).map(mapComputedMeritItem);
    otherMeritData = (computed.otherMeritList || []).map(mapComputedMeritItem);
    meritData = [...otherMeritData, ...scienceMeritData];
  } else if (selectedClass !== '' && Object.prototype.hasOwnProperty.call(classMap, selectedClass)) {
    selectedName = formatClassLabel(classMap[selectedClass].name, selectedClass);
    selectedExamTitle = `শ্রেণি: ${selectedName} · বার্ষিক পরীক্ষার মেধাতালিকা`;
    const gid = classMap[selectedClass].gid;
    if (gid) {
      const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSYfZ7IOoN4gbjjSgT02E1ugUQvhPmL39Ch4gJns0GGbb9OrCO4Wm9hdmbpPaEerRC5m2S0-WOJQcV4/pub?output=csv&gid=${gid}`;

      try {
        const response = await fetch(csvUrl);
        if (response.ok) {
          const csvText = await response.text();
          const rows = parseCsv(csvText);
          if (rows.length > 1) {
            const syntheticExam = buildCsvSyntheticExam(selectedClass, classMap[selectedClass].name, rows);
            const computed = computeResultSheet(syntheticExam);
            scienceMeritData = (computed.scienceMeritList || []).map(mapComputedMeritItem);
            otherMeritData = (computed.otherMeritList || []).map(mapComputedMeritItem);
            meritData = [...otherMeritData, ...scienceMeritData];
          }
        }
      } catch (err) {
        console.warn('Failed to fetch merit list CSV:', err.message);
      }
    }
  }

  const resolvedMeritClassKey = matchedExcelExam?.classId
    ? String(matchedExcelExam.classId)
    : (Object.prototype.hasOwnProperty.call(classMap, selectedClass)
      ? selectedClass
      : (normalizeClassInput(selectedClass.replace(/^excel:(?:exam_class_)?/i, '')).key || ''));

  res.render('merit-list', {
    pageTitle: 'শ্রেণি ভিত্তিক মেধা তালিকা - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    uploadedExams,
    uploadedClassIds,
    selectedClass,
    selectedClassKey: resolvedMeritClassKey,
    selectedExamId: matchedExcelExam ? matchedExcelExam.id : selectedExamId,
    selectedName,
    selectedExamTitle,
    sourceType,
    meritData,
    scienceMeritData,
    otherMeritData,
    convertToBengali,
  });
});

// Unified Admin Panel & Dashboard route (password-protected)
app.all(['/dashboard', '/dashboard.php', '/admin', '/admin.php', '/admin-panel', '/admin-panel.php'], requireAdminPage, (req, res) => {
  const institutionName = 'নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা';
  const store = loadExcelStore();
  const portal = loadPortalStore();
  const noticesCount = (portal.notices || []).filter((n) => n.type === 'notice').length;
  const excelStudentsCount = (store.students?.rows || []).length;
  const excelExamsCount = Object.values(store.results?.exams || {}).filter((e) => (e.rows || []).length > 0).length;
  const excelDocsCount = (store.documents?.rows || []).length;
  const teachersCount = (portal.teachers || []).length;
  const governingBodyCount = (portal.governingBody?.members || []).length;
  const galleryCount = (portal.gallery || []).length;
  const admissionsCount = (portal.admissions || []).length;
  const routinesCount = (portal.routines || []).length;
  const syllabusCount = (portal.syllabus || []).length;
  const feesCount = (portal.fees || []).length;
  const registrationsCount = (portal.registrations || []).length;
  const studentStatsCount = (portal.studentStats || []).length;

  const categories = [
    { id: 'all', label: 'ড্যাশবোর্ড (সব ফিচার)', icon: 'grid-menu' },
    { id: 'excel', label: 'শিক্ষার্থী ও ফলাফল', icon: 'grad-cap' },
    { id: 'academic', label: 'নোটিশ ও একাডেমিক', icon: 'building' },
    { id: 'accounting', label: 'হিসাব ও অর্থ', icon: 'coins' },
  ];

  const modules = [
    {
      id: 'excel-students',
      category: 'excel',
      label: 'শিক্ষার্থী তথ্য আপলোড (Excel)',
      meta: `${convertToBengali(excelStudentsCount)} জন শিক্ষার্থী`,
      icon: 'grad-cap',
      tone: 'ic-green',
      src: '/excel-studio.php?embed=1&tab=students&hideTabs=1',
    },
    {
      id: 'excel-results',
      category: 'excel',
      label: 'শ্রেণি ভিত্তিক রেজাল্ট শিট ও GPA',
      meta: `${convertToBengali(excelExamsCount)}টি শ্রেণির শিট · সরাসরি এন্ট্রি ও ব্যাকআপ`,
      icon: 'calculator',
      tone: 'ic-amber',
      src: '/excel-studio.php?embed=1&tab=results&hideTabs=1',
    },
    {
      id: 'a4-studio',
      category: 'excel',
      label: 'সমন্বিত ডকুমেন্ট ও প্রিন্ট (A4)',
      meta: 'মার্কশিট, আইডি, প্রত্যায়ন ও প্রশংসা',
      icon: 'printer',
      tone: 'ic-indigo',
      src: '/excel-studio.php?embed=1&tab=docstudio&hideTabs=1',
    },
    {
      id: 'student-search',
      category: 'excel',
      label: 'শিক্ষার্থী প্রোফাইল ও সনদ হাব',
      meta: 'তথ্য, রেজাল্ট, আইডি, প্রত্যায়ন, প্রশংসা',
      icon: 'id-card-search',
      tone: 'ic-teal',
      src: '/student-search.php?embed=1',
    },
    {
      id: 'result-portal',
      category: 'excel',
      label: 'অনলাইন ফলাফল ও মার্কশিট',
      meta: 'রোল নম্বর দিয়ে মার্কশিট ও প্রিন্ট',
      icon: 'award',
      tone: 'ic-green',
      src: '/result.php?embed=1',
    },
    {
      id: 'merit-portal',
      category: 'excel',
      label: 'শ্রেণি ভিত্তিক মেধা তালিকা',
      meta: 'GPA ও মেধাক্রম তালিকা',
      icon: 'trophy',
      tone: 'ic-amber',
      src: '/merit-list.php?embed=1',
    },
    {
      id: 'id-card',
      category: 'excel',
      label: 'শিক্ষার্থী আইডি কার্ড',
      meta: 'শ্রেণি ও রোল ভিত্তিক আইডি কার্ড',
      icon: 'id-badge',
      tone: 'ic-teal',
      src: '/id-card.php?embed=1',
    },
    {
      id: 'admit-card',
      category: 'excel',
      label: 'এডমিট কার্ড (প্রবেশপত্র)',
      meta: 'প্রবেশপত্র অনুসন্ধান ও প্রিন্ট',
      icon: 'id-card',
      tone: 'ic-blue',
      src: '/admit.php?embed=1',
    },
    {
      id: 'admissions',
      category: 'excel',
      label: 'ভর্তি আবেদন ও ফরম',
      meta: `${convertToBengali(admissionsCount)}টি জমা আবেদন`,
      icon: 'user-plus',
      tone: 'ic-indigo',
      src: '/admin-admissions.php?embed=1',
    },
    {
      id: 'notices',
      category: 'academic',
      label: 'নোটিশ ও হেডলাইন',
      meta: `${convertToBengali(noticesCount)}টি সক্রিয় নোটিশ`,
      icon: 'megaphone',
      tone: 'ic-blue',
      src: '/add_notice.php?embed=1',
    },
    {
      id: 'teachers',
      category: 'academic',
      label: 'শিক্ষক ও কর্মচারী',
      meta: `${convertToBengali(teachersCount)} জন তালিকাভুক্ত`,
      icon: 'chalkboard',
      tone: 'ic-teal',
      src: '/admin-teachers.php?embed=1',
    },
    {
      id: 'governing-body',
      category: 'academic',
      label: 'গভর্নিং বডি এডিট',
      meta: `${convertToBengali(governingBodyCount)} জন সদস্য`,
      icon: 'users',
      tone: 'ic-blue',
      src: '/admin-governingbody.php?embed=1',
    },
    {
      id: 'gallery',
      category: 'academic',
      label: 'গ্যালারি (হোম ছবি)',
      meta: `${convertToBengali(galleryCount)}টি ছবি · ${convertToBengali(portal.galleryIntervalSec || 12)} সে. স্লাইড`,
      icon: 'image',
      tone: 'ic-amber',
      src: '/admin-gallery.php?embed=1',
    },
    {
      id: 'routine',
      category: 'academic',
      label: 'ক্লাস রুটিন',
      meta: `${convertToBengali(routinesCount)}টি সারি`,
      icon: 'clock',
      tone: 'ic-slate',
      src: '/admin-academic.php?embed=1&section=routines&single=1',
    },
    {
      id: 'syllabus',
      category: 'academic',
      label: 'সিলেবাস',
      meta: `${convertToBengali(syllabusCount)}টি শ্রেণি`,
      icon: 'book-open',
      tone: 'ic-green',
      src: '/admin-academic.php?embed=1&section=syllabus&single=1',
    },
    {
      id: 'fees',
      category: 'academic',
      label: 'বেতন ও ফি কাঠামো',
      meta: `${convertToBengali(feesCount)}টি খাত`,
      icon: 'wallet',
      tone: 'ic-amber',
      src: '/admin-academic.php?embed=1&section=fees&single=1',
    },
    {
      id: 'registrations',
      category: 'academic',
      label: 'বোর্ড রেজিস্ট্রেশন',
      meta: `${convertToBengali(registrationsCount)}টি কার্যক্রম`,
      icon: 'clipboard-check',
      tone: 'ic-blue',
      src: '/admin-academic.php?embed=1&section=registrations&single=1',
    },
    {
      id: 'student-stats',
      category: 'academic',
      label: 'ছাত্র-ছাত্রী সংখ্যা',
      meta: `${convertToBengali(studentStatsCount)}টি স্তর`,
      icon: 'bar-chart',
      tone: 'ic-indigo',
      src: '/admin-academic.php?embed=1&section=studentStats&single=1',
    },
    {
      id: 'accounting-entry',
      category: 'accounting',
      label: 'দৈনিক হিসাব এন্ট্রি',
      meta: 'প্রতিদিনের আয় ও ব্যয়',
      icon: 'coins',
      tone: 'ic-teal',
      src: '/accounting_entry.php?embed=1',
    },
    {
      id: 'accounting-report',
      category: 'accounting',
      label: 'আর্থিক স্মার্ট রিপোর্ট',
      meta: 'মাসিক ও বার্ষিক সারসংক্ষেপ',
      icon: 'pie-chart',
      tone: 'ic-slate',
      src: '/accounting_report.php?embed=1',
    },
  ];

  const summaryStats = [
    { label: 'শিক্ষার্থী (Excel)', value: convertToBengali(excelStudentsCount), feature: 'excel-students' },
    { label: 'পরীক্ষার শিট', value: convertToBengali(excelExamsCount), feature: 'excel-results' },
    { label: 'A4 প্রিন্ট ও সনদ', value: convertToBengali(excelStudentsCount || excelDocsCount), feature: 'a4-studio' },
    { label: 'সক্রিয় নোটিশ', value: convertToBengali(noticesCount), feature: 'notices' },
    { label: 'ভর্তি আবেদন', value: convertToBengali(admissionsCount), feature: 'admissions' },
    { label: 'শিক্ষক-কর্মচারী', value: convertToBengali(teachersCount), feature: 'teachers' },
  ];

  const requestedFeature = req.query.feature ? String(req.query.feature) : '';
  const activeMod = modules.find((m) => m.id === requestedFeature) || null;
  const activeFeature = activeMod ? activeMod.id : '';
  const requestedTab = req.query.tab ? String(req.query.tab) : '';
  const activeTab = activeMod
    ? activeMod.category
    : (categories.some((c) => c.id === requestedTab) ? requestedTab : 'all');

  res.render('dashboard', {
    institutionName,
    categories,
    modules,
    summaryStats,
    activeFeature,
    activeTab,
  });
});

app.get(['/admin-teachers', '/admin-teachers.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-teachers', {
    teachers: portal.teachers || [],
  });
});

app.post('/api/portal/teachers', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const body = req.body || {};
  const id = body.id ? String(body.id) : `t_${Date.now()}`;
  const item = {
    id,
    name: String(body.name || '').trim(),
    designation: String(body.designation || '').trim(),
    index_no: String(body.index_no || '').trim(),
    subject: String(body.subject || '').trim(),
    mpo_date: String(body.mpo_date || '').trim(),
    mobile: String(body.mobile || '').trim(),
    photo: String(body.photo || 'logo.png').trim() || 'logo.png',
    showInCarousel: true,
  };
  if (!item.name || !item.designation) {
    return res.status(400).json({ error: 'নাম ও পদবি আবশ্যক।' });
  }
  const idx = (portal.teachers || []).findIndex((t) => t.id === id);
  if (idx !== -1) {
    portal.teachers[idx] = item;
  } else {
    portal.teachers.unshift(item);
  }
  savePortalStore(portal);
  res.json({ ok: true, teachers: portal.teachers });
});

app.delete('/api/portal/teachers/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  portal.teachers = (portal.teachers || []).filter((t) => t.id !== String(req.params.id));
  savePortalStore(portal);
  res.json({ ok: true, teachers: portal.teachers });
});

app.get(['/admin-governingbody', '/admin-governingbody.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-governingbody', {
    governingBody: portal.governingBody || { institutionName: '', tenure: '', members: [] },
  });
});

app.post('/api/portal/governing-body/meta', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const body = req.body || {};
  const institutionName = String(body.institutionName || '').trim();
  const tenure = String(body.tenure || '').trim();
  if (!institutionName || !tenure) {
    return res.status(400).json({ error: 'মাদ্রাসার নাম ও কার্যকাল আবশ্যক।' });
  }
  const current = portal.governingBody || { institutionName: '', tenure: '', members: [] };
  portal.governingBody = {
    institutionName,
    tenure,
    members: Array.isArray(current.members) ? current.members : [],
  };
  savePortalStore(portal);
  res.json({ ok: true, governingBody: portal.governingBody });
});

app.post('/api/portal/governing-body', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const body = req.body || {};
  const current = portal.governingBody || { institutionName: '', tenure: '', members: [] };
  const members = Array.isArray(current.members) ? [...current.members] : [];
  const id = body.id ? String(body.id).trim() : `gb_${Date.now()}`;
  const name = String(body.name || '').trim();
  const designation = String(body.designation || '').trim();
  if (!name || !designation) {
    return res.status(400).json({ error: 'সদস্যের নাম ও পদবী আবশ্যক।' });
  }
  const item = { id, name, designation };
  const existingIdx = members.findIndex((m) => String(m.id) === id);
  const parsedPos = Number.parseInt(body.position, 10);
  if (existingIdx !== -1) {
    if (!Number.isNaN(parsedPos) && parsedPos >= 1) {
      members.splice(existingIdx, 1);
      const insertIdx = Math.min(parsedPos - 1, members.length);
      members.splice(insertIdx, 0, item);
    } else {
      members[existingIdx] = item;
    }
  } else if (!Number.isNaN(parsedPos) && parsedPos >= 1) {
    const insertIdx = Math.min(parsedPos - 1, members.length);
    members.splice(insertIdx, 0, item);
  } else {
    members.push(item);
  }
  portal.governingBody = {
    institutionName: current.institutionName || '',
    tenure: current.tenure || '',
    members,
  };
  savePortalStore(portal);
  res.json({ ok: true, governingBody: portal.governingBody });
});

app.delete('/api/portal/governing-body/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const current = portal.governingBody || { institutionName: '', tenure: '', members: [] };
  portal.governingBody = {
    institutionName: current.institutionName || '',
    tenure: current.tenure || '',
    members: (current.members || []).filter((m) => String(m.id) !== String(req.params.id)),
  };
  savePortalStore(portal);
  res.json({ ok: true, governingBody: portal.governingBody });
});

const GALLERY_UPLOAD_DIR = path.join(__dirname, 'public', 'uploads', 'gallery');
const SAFE_IMAGE_EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

function isValidImageSignature(buf, ext) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return false;
  if (ext === '.jpg') return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === '.png') return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  if (ext === '.gif') return buf.slice(0, 4).toString('ascii') === 'GIF8';
  if (ext === '.webp') return buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP';
  return false;
}

app.get(['/admin-gallery', '/admin-gallery.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-gallery', {
    gallery: portal.gallery || [],
    galleryIntervalSec: portal.galleryIntervalSec || 12,
  });
});

app.post('/api/portal/gallery', requireAdminApi, verifySameOrigin, upload.single('image'), (req, res) => {
  try {
    const portal = loadPortalStore();
    const caption = String(req.body?.caption || '').trim().slice(0, 140);
    let imageUrl = '';

    if (req.file && req.file.buffer && req.file.buffer.length > 0) {
      const mime = String(req.file.mimetype || '').toLowerCase();
      let ext = SAFE_IMAGE_EXT_BY_MIME[mime] || '';
      if (!ext) {
        const origExt = path.extname(String(req.file.originalname || '')).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(origExt)) {
          ext = origExt === '.jpeg' ? '.jpg' : origExt;
        }
      }
      if (!ext || !isValidImageSignature(req.file.buffer, ext)) {
        return res.status(400).json({ error: 'সঠিক ছবি ফাইল (JPG, PNG, WEBP বা GIF) আপলোড করুন।' });
      }
      fs.mkdirSync(GALLERY_UPLOAD_DIR, { recursive: true });
      const fileName = `gal_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`;
      fs.writeFileSync(path.join(GALLERY_UPLOAD_DIR, fileName), req.file.buffer);
      imageUrl = `/uploads/gallery/${fileName}`;
    } else if (req.body?.imageUrl) {
      const sanitized = sanitizeImageUrl(req.body.imageUrl);
      if (!sanitized || sanitized === '/logo.png') {
        return res.status(400).json({ error: 'সঠিক ছবির লিংক বা ফাইল প্রদান করুন।' });
      }
      imageUrl = sanitized;
    } else {
      return res.status(400).json({ error: 'অনুগ্রহ করে একটি ছবি আপলোড করুন অথবা ছবির লিংক দিন।' });
    }

    const item = {
      id: `gal_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      imageUrl,
      caption: caption || 'মাদ্রাসা প্রাঙ্গণ',
      createdAt: new Date().toISOString(),
    };
    portal.gallery = [item, ...(Array.isArray(portal.gallery) ? portal.gallery : [])];
    savePortalStore(portal);
    res.json({
      ok: true,
      gallery: portal.gallery,
      galleryIntervalSec: portal.galleryIntervalSec || 12,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'ছবি সংরক্ষণ করা যায়নি।' });
  }
});

app.post('/api/portal/gallery/settings', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const raw = Number(req.body?.galleryIntervalSec);
  const clamped = Math.max(10, Math.min(20, Math.round(Number.isFinite(raw) ? raw : 12)));
  portal.galleryIntervalSec = clamped;
  savePortalStore(portal);
  res.json({ ok: true, galleryIntervalSec: portal.galleryIntervalSec });
});

app.delete('/api/portal/gallery/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const targetId = String(req.params.id || '');
  const existing = (portal.gallery || []).find((g) => String(g.id) === targetId);
  if (existing && typeof existing.imageUrl === 'string' && existing.imageUrl.startsWith('/uploads/gallery/')) {
    const fileName = path.basename(existing.imageUrl);
    const fullPath = path.join(GALLERY_UPLOAD_DIR, fileName);
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // Ignore unlink failure
    }
  }
  portal.gallery = (portal.gallery || []).filter((g) => String(g.id) !== targetId);
  savePortalStore(portal);
  res.json({ ok: true, gallery: portal.gallery });
});

app.get(['/admin-academic', '/admin-academic.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-academic', {
    initialSection: req.query.section ? String(req.query.section) : 'routines',
    isSingle: req.query.single === '1',
    academicData: {
      routines: portal.routines || [],
      syllabus: portal.syllabus || [],
      fees: portal.fees || [],
      registrations: portal.registrations || [],
      studentStats: portal.studentStats || [],
    },
  });
});

app.post('/api/portal/academic/:section', requireAdminApi, verifySameOrigin, (req, res) => {
  const section = String(req.params.section);
  const allowed = ['routines', 'syllabus', 'fees', 'registrations', 'studentStats'];
  if (!allowed.includes(section)) {
    return res.status(400).json({ error: 'অবৈধ সেকশন।' });
  }
  const portal = loadPortalStore();
  const item = { id: `${section}_${Date.now()}`, ...(req.body || {}) };
  if (section === 'studentStats') {
    item.boys = Number(item.boys) || 0;
    item.girls = Number(item.girls) || 0;
  }
  portal[section] = [item, ...(portal[section] || [])];
  savePortalStore(portal);
  res.json({ ok: true, items: portal[section] });
});

app.delete('/api/portal/academic/:section/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const section = String(req.params.section);
  const allowed = ['routines', 'syllabus', 'fees', 'registrations', 'studentStats'];
  if (!allowed.includes(section)) {
    return res.status(400).json({ error: 'অবৈধ সেকশন।' });
  }
  const portal = loadPortalStore();
  portal[section] = (portal[section] || []).filter((x) => x.id !== String(req.params.id));
  savePortalStore(portal);
  res.json({ ok: true, items: portal[section] });
});

function buildStudentRowFromAdmission(adm, mapping = {}) {
  const row = { _admId: String(adm.id) };
  const setMapped = (fieldKey, fallbackKey, val) => {
    const targetKey = (mapping && mapping[fieldKey]) ? mapping[fieldKey] : fallbackKey;
    row[targetKey] = val;
    if (targetKey !== fallbackKey && row[fallbackKey] === undefined) {
      row[fallbackKey] = val;
    }
  };
  setMapped('roll', 'roll', String(adm.roll_no || '').trim());
  setMapped('id', 'id', String(adm.id_no || adm.id || '').trim());
  setMapped('reg_no', 'reg_no', String(adm.birth_reg || adm.id_no || '').trim());
  setMapped('name_bn', 'name_bn', String(adm.name_bn || adm.name_en || '').trim());
  setMapped('name_en', 'name_en', String(adm.name_en || '').trim());
  setMapped('class_name', 'class_name', String(adm.student_class || '').trim());
  setMapped('father_bn', 'father_bn', String(adm.father_bn || '').trim());
  setMapped('mother_bn', 'mother_bn', String(adm.mother_bn || '').trim());
  setMapped('dob', 'dob', String(adm.dob || '').trim());
  setMapped('mobile', 'mobile', String(adm.mobile || '').trim());
  setMapped('address', 'address', String(adm.address || '').trim());
  setMapped('blood', 'blood', String(adm.blood_group || '').trim());
  setMapped('session', 'session', String(adm.session || '২০২৬').trim());
  if (adm.photo) {
    setMapped('photo', 'photo', sanitizeImageUrl(adm.photo));
  }
  return row;
}

function syncApprovedAdmissionToExcelStudents(adm) {
  const store = loadExcelStore();
  if (!store.students) store.students = { columns: [], mapping: {}, rows: [], updatedAt: null };
  const mapping = store.students.mapping || {};
  const rows = Array.isArray(store.students.rows) ? [...store.students.rows] : [];
  const rowObj = buildStudentRowFromAdmission(adm, mapping);
  const admIdStr = String(adm.id);
  const existingIdx = rows.findIndex((r) => String(r._admId || '') === admIdStr);
  if (existingIdx !== -1) {
    rows[existingIdx] = { ...rows[existingIdx], ...rowObj };
  } else {
    rows.unshift(rowObj);
  }
  store.students.rows = rows;
  store.students.updatedAt = new Date().toISOString();
  saveExcelStore(store);
  return store;
}

function removeAdmissionFromExcelStudents(admId) {
  const store = loadExcelStore();
  if (!store.students || !Array.isArray(store.students.rows)) return store;
  const admIdStr = String(admId);
  const beforeLen = store.students.rows.length;
  store.students.rows = store.students.rows.filter((r) => String(r._admId || '') !== admIdStr);
  if (store.students.rows.length !== beforeLen) {
    store.students.updatedAt = new Date().toISOString();
    saveExcelStore(store);
  }
  return store;
}

function applyAdmissionEdits(existing, b = {}) {
  const has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  return {
    ...existing,
    roll_no: has('roll_no') ? String(b.roll_no || '').trim() : (existing.roll_no || ''),
    id_no: has('id_no') ? String(b.id_no || '').trim() : (existing.id_no || ''),
    birth_reg: has('birth_reg') ? String(b.birth_reg || '').trim() : (existing.birth_reg || ''),
    dob: has('dob') ? String(b.dob || '').trim() : (existing.dob || ''),
    blood_group: has('blood_group') ? String(b.blood_group || '').trim() : (existing.blood_group || ''),
    gender: has('gender') ? String(b.gender || '').trim() : (existing.gender || ''),
    name_bn: has('name_bn') ? String(b.name_bn || '').trim() : (existing.name_bn || ''),
    name_en: has('name_en') ? String(b.name_en || '').trim() : (existing.name_en || ''),
    student_class: has('student_class') ? String(b.student_class || '').trim() : (existing.student_class || ''),
    father_bn: has('father_bn') ? String(b.father_bn || '').trim() : (existing.father_bn || ''),
    father_en: has('father_en') ? String(b.father_en || '').trim() : (existing.father_en || ''),
    mother_bn: has('mother_bn') ? String(b.mother_bn || '').trim() : (existing.mother_bn || ''),
    mother_en: has('mother_en') ? String(b.mother_en || '').trim() : (existing.mother_en || ''),
    mobile: has('mobile') ? String(b.mobile || '').trim() : (existing.mobile || ''),
    address: has('address') ? String(b.address || '').trim() : (existing.address || ''),
    session: has('session') ? String(b.session || '').trim() : (existing.session || '২০২৬'),
    prev_school: has('prev_school') ? String(b.prev_school || '').trim() : (existing.prev_school || ''),
    prev_reg: has('prev_reg') ? String(b.prev_reg || '').trim() : (existing.prev_reg || ''),
  };
}

app.get(['/admin-admissions', '/admin-admissions.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-admissions', {
    admissions: portal.admissions || [],
  });
});

app.get('/api/portal/admissions', requireAdminApi, (req, res) => {
  const portal = loadPortalStore();
  res.json({ ok: true, admissions: portal.admissions || [] });
});

app.post('/api/portal/admissions', (req, res) => {
  const portal = loadPortalStore();
  const b = req.body || {};
  const addrParts = [String(b.village || '').trim(), String(b.union || '').trim(), String(b.upazila || '').trim(), String(b.district || '').trim()].filter(Boolean);
  const fallbackAddr = String(b.address || '').trim();
  const item = {
    id: `adm_${Date.now()}`,
    status: 'pending',
    roll_no: String(b.roll_no || '').trim(),
    id_no: String(b.id_no || '').trim(),
    birth_reg: String(b.birth_reg || '').trim(),
    dob: String(b.dob || '').trim(),
    blood_group: String(b.blood_group || '').trim(),
    gender: String(b.gender || '').trim(),
    name_bn: String(b.name_bn || '').trim(),
    name_en: String(b.name_en || '').trim(),
    student_class: String(b.student_class || '').trim(),
    father_bn: String(b.father_bn || '').trim(),
    father_en: String(b.father_en || '').trim(),
    mother_bn: String(b.mother_bn || '').trim(),
    mother_en: String(b.mother_en || '').trim(),
    mobile: String(b.mobile || '').trim(),
    address: addrParts.length ? addrParts.join(', ') : fallbackAddr,
    session: String(b.session || '২০২৬').trim(),
    prev_school: String(b.prev_school || '').trim(),
    prev_reg: String(b.prev_reg || '').trim(),
    photo: String(b.base64 || b.photo || ''),
    createdAt: new Date().toISOString(),
  };
  portal.admissions = [item, ...(portal.admissions || [])];
  savePortalStore(portal);
  res.json({ ok: true, admission: item });
});

app.put('/api/portal/admissions/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const targetId = String(req.params.id || '');
  const list = Array.isArray(portal.admissions) ? [...portal.admissions] : [];
  const idx = list.findIndex((a) => String(a.id) === targetId);
  if (idx === -1) {
    return res.status(404).json({ error: 'আবেদনটি পাওয়া যায়নি।' });
  }
  const b = req.body || {};
  const shouldApprove = Boolean(b.approve);
  const updated = applyAdmissionEdits(list[idx], b);
  if (!updated.name_bn && !updated.name_en) {
    return res.status(400).json({ error: 'শিক্ষার্থীর নাম আবশ্যক।' });
  }
  if (shouldApprove || updated.status === 'approved') {
    updated.status = 'approved';
    updated.approvedAt = updated.approvedAt || new Date().toISOString();
  } else {
    updated.status = updated.status || 'pending';
  }
  updated.updatedAt = new Date().toISOString();
  list[idx] = updated;
  portal.admissions = list;
  savePortalStore(portal);

  let excelStore = loadExcelStore();
  if (updated.status === 'approved') {
    excelStore = syncApprovedAdmissionToExcelStudents(updated);
  }
  const unifiedStudents = getUnifiedStudents(excelStore, portal);
  res.json({
    ok: true,
    admission: updated,
    admissions: portal.admissions,
    students: unifiedStudents,
    studentsCount: (excelStore.students?.rows || []).length,
  });
});

app.post('/api/portal/admissions/:id/approve', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const targetId = String(req.params.id || '');
  const list = Array.isArray(portal.admissions) ? [...portal.admissions] : [];
  const idx = list.findIndex((a) => String(a.id) === targetId);
  if (idx === -1) {
    return res.status(404).json({ error: 'আবেদনটি পাওয়া যায়নি।' });
  }
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const updated = applyAdmissionEdits(list[idx], b);
  updated.status = 'approved';
  updated.approvedAt = new Date().toISOString();
  updated.updatedAt = updated.approvedAt;
  list[idx] = updated;
  portal.admissions = list;
  savePortalStore(portal);

  const excelStore = syncApprovedAdmissionToExcelStudents(updated);
  const unifiedStudents = getUnifiedStudents(excelStore, portal);
  res.json({
    ok: true,
    admission: updated,
    admissions: portal.admissions,
    students: unifiedStudents,
    studentsCount: (excelStore.students?.rows || []).length,
  });
});

app.delete('/api/portal/admissions/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const targetId = String(req.params.id || '');
  portal.admissions = (portal.admissions || []).filter((a) => String(a.id) !== targetId);
  savePortalStore(portal);
  const excelStore = removeAdmissionFromExcelStudents(targetId);
  const unifiedStudents = getUnifiedStudents(excelStore, portal);
  res.json({
    ok: true,
    admissions: portal.admissions,
    students: unifiedStudents,
    studentsCount: (excelStore.students?.rows || []).length,
  });
});

app.get('/api/portal/classes-and-rolls', (req, res) => {
  const excelStore = loadExcelStore();
  const portal = loadPortalStore();
  const classParam = String(req.query.class || '').trim();
  const data = getClassesAndRolls(excelStore, portal, classParam);
  res.json(data);
});

app.get('/api/portal/student-record', (req, res) => {
  const excelStore = loadExcelStore();
  const portal = loadPortalStore();
  const classParam = String(req.query.class || '').trim();
  const rollParam = String(req.query.roll || '').trim();
  const query = String(req.query.q || '').trim();

  const { matches, exact } = findUnifiedStudents(excelStore, portal, {
    classParam,
    rollParam,
    query,
  });

  if (!matches.length) {
    return res.json({ status: 'not_found', matches: [] });
  }

  return res.json({
    status: 'success',
    student: exact || matches[0],
    matches,
  });
});

app.get('/api/portal/admit-lookup', (req, res) => {
  const rollParam = String(req.query.roll || '').trim();
  const classParam = String(req.query.class || '').trim();
  if (!rollParam) {
    return res.json({ status: 'not_found' });
  }

  const excelStore = loadExcelStore();
  const portal = loadPortalStore();
  const { exact, matches } = findUnifiedStudents(excelStore, portal, {
    classParam,
    rollParam,
  });
  const student = exact || matches[0];

  if (student) {
    return res.json({
      status: 'success',
      name: student.name_bn || student.name_en || '—',
      father: student.father_bn || '',
      mother: student.mother_bn || '',
      class: student.class_name || classParam || '',
      classKey: student.classKey || '',
      roll: student.roll || rollParam,
      id: student.id || student.reg_no || '',
      session: student.session || '',
      photo: sanitizeImageUrl(student.photo),
    });
  }

  return res.json({ status: 'not_found' });
});

app.get(['/excel-studio', '/excel-studio.php'], requireAdminPage, (req, res) => {
  const store = loadExcelStore();
  res.render('excel-studio', {
    pageTitle: 'শিক্ষার্থী ও ফলাফল স্টুডিও - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    initialState: serializeExcelState(store),
    isEmbedded: req.query.embed === '1',
    hideTabs: req.query.hideTabs === '1',
    initialTab: req.query.tab ? String(req.query.tab) : 'students',
  });
});

app.get('/api/excel/state', requireAdminApi, (req, res) => {
  const store = loadExcelStore();
  res.json(serializeExcelState(store));
});

app.post('/api/excel/upload', requireAdminApi, verifySameOrigin, (req, res) => {
  upload.single('file')(req, res, (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message || 'ফাইল আপলোড করা যায়নি।' });
    }
    try {
      if (!req.file || !req.file.buffer) {
        return res.status(400).json({ error: 'কোনো এক্সেল ফাইল নির্বাচন করা হয়নি।' });
      }
      const target = String(req.body.target || 'students');
      const parsed = parseExcelBuffer(req.file.buffer, req.file.originalname || '');
      const store = loadExcelStore();
      const now = new Date().toISOString();

    if (target === 'students') {
      store.students = {
        columns: parsed.columns,
        mapping: autoDetectStudentMapping(parsed.columns),
        rows: parsed.rows,
        updatedAt: now,
      };
    } else if (target === 'documents') {
      store.documents = {
        title: String(req.body.title || parsed.sheetName || 'সকল ডকুমেন্টস ডেটা শিট'),
        columns: parsed.columns,
        mapping: autoDetectStudentMapping(parsed.columns),
        rows: parsed.rows,
        updatedAt: now,
      };
    } else if (target === 'results') {
      const requestedClassId = (req.body.classId !== undefined && String(req.body.classId).trim() !== '')
        ? String(req.body.classId).trim()
        : '6';
      const requestedExamName = String(req.body.examName || 'বার্ষিক পরীক্ষা').trim() || 'বার্ষিক পরীক্ষা';
      const requestedYear = String(req.body.year || '২০২৬').trim() || '২০২৬';
      const reqExamKey = normalizeExamMetaKey(requestedExamName, 'বার্ষিক পরীক্ষা');
      const reqYearKey = normalizeExamMetaKey(requestedYear, '২০২৬');
      const subjectMode = String(req.body.subjectMode || 'all').trim() === 'single' ? 'single' : 'all';
      const singleSubName = String(req.body.subjectName || '').trim();
      const singleSubFmRaw = parseFloat(bnToEnNumber(String(req.body.subjectFullMarks || '100')));
      const singleSubFm = (!Number.isNaN(singleSubFmRaw) && singleSubFmRaw >= 5 && singleSubFmRaw <= 500) ? singleSubFmRaw : 100;
      const singleSubOptional = String(req.body.subjectIsOptional || '').toLowerCase() === 'true' || req.body.subjectIsOptional === '1';

      if (subjectMode === 'single' && !singleSubName) {
        return res.status(400).json({ error: 'একক বিষয় আপলোডের জন্য বিষয়ের নাম লিখুন বা নির্বাচন করুন।' });
      }

      const allocateOrMatchExamId = (cid, explicitId = '') => {
        if (explicitId && store.results.exams?.[explicitId]) {
          const cur = store.results.exams[explicitId];
          const sameSlot = String(cur.classId ?? '') === cid
            && normalizeExamMetaKey(cur.examName, 'বার্ষিক পরীক্ষা') === reqExamKey
            && normalizeExamMetaKey(cur.year, '২০২৬') === reqYearKey;
          if (sameSlot) return explicitId;
        }
        const matchedExisting = Object.values(store.results.exams || {}).find((ex) => (
          String(ex.classId ?? '') === cid
          && normalizeExamMetaKey(ex.examName, 'বার্ষিক পরীক্ষা') === reqExamKey
          && normalizeExamMetaKey(ex.year, '২০২৬') === reqYearKey
        ));
        if (matchedExisting) return matchedExisting.id;
        if (!store.results.exams?.[`exam_class_${cid}`]) return `exam_class_${cid}`;
        return `exam_${cid}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
      };

      const resolvePublishedFlag = (existing) => {
        const hasPub = req.body.published !== undefined && String(req.body.published).trim() !== '';
        if (hasPub) {
          return String(req.body.published).toLowerCase() === 'true' || req.body.published === true || String(req.body.published) === '1';
        }
        return (existing?.id && existing.published !== undefined) ? Boolean(existing.published) : false;
      };

      const mappingGuess = autoDetectStudentMapping(parsed.columns);
      const detectedCols = detectResultColumns(parsed.columns);

      const upsertExamRows = (cid, cName, targetRows, explicitId = '') => {
        const examId = allocateOrMatchExamId(cid, explicitId);
        const existing = store.results.exams[examId] || {};
        const resolvedPublished = resolvePublishedFlag(existing);
        const resolvedClassName = String(cName || existing.className || classMap[cid]?.name || 'ষষ্ঠ').trim();

        if (subjectMode === 'single') {
          const rollKey = mappingGuess.roll || (parsed.columns[0]?.key || '');
          const nameKey = mappingGuess.name_bn || '';
          const fatherKey = mappingGuess.father_bn || '';
          const idKey = mappingGuess.id || '';
          const groupKey = mappingGuess.group || '';
          const classColKey = mappingGuess.class_name || '';

          const cleanSingleSub = singleSubName.replace(/\s*\([^)]*\)/g, '').trim() || singleSubName;
          const cleanNormSub = normalizeExamMetaKey(cleanSingleSub);
          const reservedKeys = new Set([rollKey, nameKey, fatherKey, idKey, groupKey, classColKey].filter(Boolean));

          // Find mark column in uploaded file
          let scoreCol = parsed.columns.find((c) => !reservedKeys.has(c.key) && normalizeExamMetaKey(c.label.replace(/\s*\([^)]*\)/g, '')) === cleanNormSub);
          if (!scoreCol) {
            scoreCol = parsed.columns.find((c) => !reservedKeys.has(c.key) && /নম্বর|প্রাপ্ত|marks|score|number|subject/i.test(`${c.label} ${c.key}`));
          }
          if (!scoreCol) {
            scoreCol = parsed.columns.find((c) => !reservedKeys.has(c.key));
          }
          if (!scoreCol) {
            throw new Error(`"${cleanSingleSub}" বিষয়ের নম্বরের কলাম এক্সেলে পাওয়া যায়নি।`);
          }

          let baseCols = Array.isArray(existing.columns) && existing.columns.length > 0
            ? existing.columns.map((c) => ({ ...c }))
            : [
                { key: 'roll', label: 'রোল', isSubject: false, fullMarks: 0 },
                { key: 'name', label: 'শিক্ষার্থীর নাম', isSubject: false, fullMarks: 0 },
                { key: 'father', label: 'পিতার নাম', isSubject: false, fullMarks: 0 },
              ];
          let baseMapping = existing.mapping && existing.mapping.roll
            ? { ...existing.mapping }
            : { roll: 'roll', name: 'name', father: 'father', id: '', group: '', optionalSubject: '' };
          let baseRows = Array.isArray(existing.rows) ? existing.rows.map((r) => ({ ...r })) : [];

          let targetSubCol = baseCols.find((c) => c.isSubject && normalizeExamMetaKey(c.label.replace(/\s*\([^)]*\)/g, '')) === cleanNormSub);
          const formattedLabel = `${cleanSingleSub} (${singleSubFm})${singleSubOptional ? ' (4th)' : ''}`;
          if (targetSubCol) {
            targetSubCol.fullMarks = singleSubFm;
            targetSubCol.isOptional = singleSubOptional;
            targetSubCol.label = formattedLabel;
          } else {
            const newSubKey = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`;
            targetSubCol = {
              key: newSubKey,
              label: formattedLabel,
              isSubject: true,
              fullMarks: singleSubFm,
              isOptional: singleSubOptional,
            };
            baseCols.push(targetSubCol);
          }

          const exRollKey = baseMapping.roll || 'roll';
          const exNameKey = baseMapping.name || 'name';
          const exFatherKey = baseMapping.father || 'father';
          const rollIndexMap = new Map();
          baseRows.forEach((r, idx) => {
            const rk = normalizeRollKey(r[exRollKey]);
            if (rk) rollIndexMap.set(rk, idx);
          });

          let updatedRows = 0;
          targetRows.forEach((srcRow, idx) => {
            const rawRoll = String(srcRow[rollKey] || '').trim();
            const rk = normalizeRollKey(rawRoll);
            if (!rk) return;
            const markVal = String(srcRow[scoreCol.key] ?? '').trim();
            const srcName = nameKey ? String(srcRow[nameKey] || '').trim() : '';
            const srcFather = fatherKey ? String(srcRow[fatherKey] || '').trim() : '';

            if (rollIndexMap.has(rk)) {
              const rowObj = baseRows[rollIndexMap.get(rk)];
              rowObj[targetSubCol.key] = markVal;
              if (srcName && !String(rowObj[exNameKey] || '').trim()) rowObj[exNameKey] = srcName;
              if (srcFather && !String(rowObj[exFatherKey] || '').trim()) rowObj[exFatherKey] = srcFather;
            } else {
              const newRow = { _id: `row_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 5)}` };
              baseCols.forEach((c) => { newRow[c.key] = ''; });
              newRow[exRollKey] = rawRoll;
              if (exNameKey) newRow[exNameKey] = srcName;
              if (exFatherKey) newRow[exFatherKey] = srcFather;
              newRow[targetSubCol.key] = markVal;
              baseRows.push(newRow);
              rollIndexMap.set(rk, baseRows.length - 1);
            }
            updatedRows++;
          });

          store.results.exams[examId] = {
            id: examId,
            title: String(req.body.title || `${formatClassLabel(resolvedClassName, cid)} — ${requestedExamName}`),
            classId: cid,
            className: resolvedClassName,
            examName: requestedExamName,
            year: requestedYear,
            published: resolvedPublished,
            publishedAt: resolvedPublished ? (existing.publishedAt || now) : null,
            passPercent: Number(req.body.passPercent || existing.passPercent || 33),
            maxPromoteFail: Number(req.body.maxPromoteFail ?? existing.maxPromoteFail ?? 0),
            promotionLabel: String(req.body.promotionLabel || existing.promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড'),
            columns: baseCols,
            mapping: baseMapping,
            rows: baseRows,
            updatedAt: now,
          };
          return { examId, className: resolvedClassName, count: updatedRows };
        }

        store.results.exams[examId] = {
          id: examId,
          title: String(req.body.title || `${formatClassLabel(resolvedClassName, cid)} — ${requestedExamName}`),
          classId: cid,
          className: resolvedClassName,
          examName: requestedExamName,
          year: requestedYear,
          published: resolvedPublished,
          publishedAt: resolvedPublished ? (existing.publishedAt || now) : null,
          passPercent: Number(req.body.passPercent || existing.passPercent || 33),
          maxPromoteFail: Number(req.body.maxPromoteFail ?? existing.maxPromoteFail ?? 0),
          promotionLabel: String(req.body.promotionLabel || existing.promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড'),
          columns: detectedCols,
          mapping: {
            roll: mappingGuess.roll || (parsed.columns[0]?.key || ''),
            name: mappingGuess.name_bn || (parsed.columns[1]?.key || ''),
            father: mappingGuess.father_bn || '',
            id: mappingGuess.id || '',
            group: mappingGuess.group || '',
            optionalSubject: mappingGuess.optionalSubject || '',
          },
          rows: targetRows,
          updatedAt: now,
        };
        return { examId, className: resolvedClassName, count: targetRows.length };
      };

      if (requestedClassId === 'auto') {
        const classColKey = mappingGuess.class_name;
        if (!classColKey) {
          return res.status(400).json({ error: 'সকল শ্রেণি একসাথে আপলোডের জন্য এক্সেল ফাইলে "শ্রেণি" কলাম থাকতে হবে, অথবা উপরের তালিকা থেকে নির্দিষ্ট শ্রেণি নির্বাচন করুন।' });
        }
        const grouped = new Map();
        for (const r of parsed.rows) {
          const rawCls = String(r[classColKey] || '').trim();
          if (!rawCls) continue;
          const norm = normalizeClassInput(rawCls);
          const matchedCid = Object.keys(classMap).find((k) => {
            if (norm.key && k === norm.key) return true;
            return normalizeClassInput(classMap[k]?.name || '').key === norm.key;
          });
          if (!matchedCid) continue;
          if (!grouped.has(matchedCid)) {
            grouped.set(matchedCid, { classId: matchedCid, className: classMap[matchedCid].name, rows: [] });
          }
          grouped.get(matchedCid).rows.push(r);
        }
        if (grouped.size === 0) {
          return res.status(400).json({ error: 'ফাইলের "শ্রেণি" কলামে কোনো পরিচিত শ্রেণি (যেমন: ষষ্ঠ, সপ্তম, অষ্টম...) পাওয়া যায়নি।' });
        }
        const summaryParts = [];
        let firstExamId = '';
        for (const grp of grouped.values()) {
          const info = upsertExamRows(grp.classId, grp.className, grp.rows);
          if (!firstExamId) firstExamId = info.examId;
          summaryParts.push(`${formatClassLabel(info.className, grp.classId)} (${convertToBengali(info.count)} জন)`);
        }
        if (firstExamId) store.results.activeExamId = firstExamId;
        saveExcelStore(store);
        return res.json({
          message: `${convertToBengali(grouped.size)}টি শ্রেণির ফলাফল সফলভাবে আপলোড হয়েছে: ${summaryParts.join(', ')}।`,
          state: serializeExcelState(store),
        });
      }

      const requestedClassName = String(req.body.className || (classMap[requestedClassId]?.name || 'ষষ্ঠ')).trim();
      const info = upsertExamRows(requestedClassId, requestedClassName, parsed.rows, String(req.body.examId || '').trim());
      store.results.activeExamId = info.examId;
      saveExcelStore(store);
      return res.json({
        message: subjectMode === 'single'
          ? `"${singleSubName}" বিষয়ের ${convertToBengali(info.count)} জন শিক্ষার্থীর নম্বর সফলভাবে যুক্ত/আপডেট হয়েছে।`
          : `ফাইল সফলভাবে আপলোড হয়েছে (${parsed.rows.length}টি সারি, ${parsed.columns.length}টি কলাম)।`,
        state: serializeExcelState(store),
      });
    } else {
      return res.status(400).json({ error: 'অবৈধ টার্গেট শিট।' });
    }

      saveExcelStore(store);
      res.json({
        message: `ফাইল সফলভাবে আপলোড হয়েছে (${parsed.rows.length}টি সারি, ${parsed.columns.length}টি কলাম)।`,
        state: serializeExcelState(store),
      });
    } catch (err) {
      res.status(400).json({ error: err.message || 'এক্সেল ফাইল পড়তে সমস্যা হয়েছে।' });
    }
  });
});

app.post('/api/excel/students/save', requireAdminApi, verifySameOrigin, (req, res) => {
  const store = loadExcelStore();
  const { columns, mapping, rows } = req.body || {};
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'সঠিক কলাম ও সারি ডেটা প্রদান করুন।' });
  }
  store.students = {
    columns,
    mapping: mapping || store.students.mapping,
    rows,
    updatedAt: new Date().toISOString(),
  };
  saveExcelStore(store);
  res.json({ message: 'শিক্ষার্থীদের ডেটা সংরক্ষণ করা হয়েছে।', state: serializeExcelState(store) });
});

app.post('/api/excel/documents/save', requireAdminApi, verifySameOrigin, (req, res) => {
  const store = loadExcelStore();
  const { title, columns, mapping, rows } = req.body || {};
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    return res.status(400).json({ error: 'সঠিক কলাম ও সারি ডেটা প্রদান করুন।' });
  }
  store.documents = {
    title: String(title || store.documents.title || 'সকল ডকুমেন্টস ডেটা শিট'),
    columns,
    mapping: mapping || store.documents.mapping,
    rows,
    updatedAt: new Date().toISOString(),
  };
  saveExcelStore(store);
  res.json({ message: 'ডকুমেন্টস শিট সংরক্ষণ করা হয়েছে।', state: serializeExcelState(store) });
});

app.post('/api/excel/results/create', requireAdminApi, verifySameOrigin, (req, res) => {
  const store = loadExcelStore();
  const examId = `exam_${Date.now()}`;
  const classId = String(req.body.classId || '6');
  const className = String(req.body.className || classMap[classId]?.name || 'নতুন শ্রেণি').trim();
  const examName = String(req.body.examName || 'বার্ষিক পরীক্ষা').trim();
  const year = String(req.body.year || '২০২৬').trim();

  store.results.exams[examId] = {
    id: examId,
    title: String(req.body.title || `${formatClassLabel(className, classId)} — ${examName}`),
    classId,
    className,
    examName,
    year,
    published: Boolean(req.body.published),
    publishedAt: req.body.published ? new Date().toISOString() : null,
    passPercent: 33,
    maxPromoteFail: 0,
    promotionLabel: 'বিশেষ বিবেচনায় প্রমোটেড',
    columns: [
      { key: 'roll', label: 'রোল', isSubject: false, fullMarks: 0 },
      { key: 'name', label: 'শিক্ষার্থীর নাম', isSubject: false, fullMarks: 0 },
      { key: 'father', label: 'পিতার নাম', isSubject: false, fullMarks: 0 },
      { key: 'sub_quran', label: 'কুরআন মাজিদ (100)', isSubject: true, fullMarks: 100 },
      { key: 'sub_arabic', label: 'আরবি (100)', isSubject: true, fullMarks: 100 },
      { key: 'sub_bangla', label: 'বাংলা (100)', isSubject: true, fullMarks: 100 },
      { key: 'sub_english', label: 'ইংরেজি (100)', isSubject: true, fullMarks: 100 },
      { key: 'sub_math', label: 'গণিত (100)', isSubject: true, fullMarks: 100 },
    ],
    mapping: { roll: 'roll', name: 'name', father: 'father', id: '', group: '', optionalSubject: '' },
    rows: [],
    updatedAt: new Date().toISOString(),
  };
  store.results.activeExamId = examId;
  saveExcelStore(store);
  res.json({ message: 'নতুন রেজাল্ট শিট তৈরি হয়েছে।', examId, state: serializeExcelState(store) });
});

app.post('/api/excel/results/save', requireAdminApi, verifySameOrigin, (req, res) => {
  const store = loadExcelStore();
  const { exam } = req.body || {};
  if (!exam || !exam.id || !Array.isArray(exam.columns) || !Array.isArray(exam.rows)) {
    return res.status(400).json({ error: 'সঠিক রেজাল্ট শিট ডেটা প্রদান করুন।' });
  }
  const existing = store.results.exams?.[exam.id] || {};
  const sanitizedColumns = exam.columns.map((c, idx) => {
    const isSubject = Boolean(c?.isSubject);
    const rawFm = Number(c?.fullMarks);
    const fullMarks = isSubject ? (rawFm >= 5 && rawFm <= 500 ? rawFm : 100) : 0;
    return {
      key: String(c?.key || `col_${idx + 1}`),
      label: String(c?.label || `কলাম ${idx + 1}`).trim() || `কলাম ${idx + 1}`,
      isSubject,
      fullMarks,
      isOptional: isSubject && Boolean(c?.isOptional),
    };
  });
  const now = new Date().toISOString();
  const resolvedPublished = exam.published !== undefined
    ? Boolean(exam.published)
    : (existing.published !== undefined ? Boolean(existing.published) : true);
  store.results.exams[exam.id] = {
    ...exam,
    published: resolvedPublished,
    publishedAt: resolvedPublished ? (exam.publishedAt || existing.publishedAt || now) : null,
    columns: sanitizedColumns,
    passPercent: Number(exam.passPercent) > 0 ? Number(exam.passPercent) : 33,
    maxPromoteFail: Number(exam.maxPromoteFail) || 0,
    promotionLabel: String(exam.promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড'),
    updatedAt: now,
  };
  store.results.activeExamId = exam.id;
  saveExcelStore(store);
  res.json({
    message: 'রেজাল্ট শিট, GPA ও মেধা তালিকা সংরক্ষণ করা হয়েছে।',
    state: serializeExcelState(store),
  });
});

app.post('/api/excel/results/publish', requireAdminApi, verifySameOrigin, (req, res) => {
  const store = loadExcelStore();
  const b = req.body || {};
  const published = Boolean(b.published);
  const now = new Date().toISOString();
  let updatedCount = 0;

  if (b.examId) {
    const ex = store.results.exams?.[String(b.examId)];
    if (!ex) {
      return res.status(404).json({ error: 'নির্বাচিত রেজাল্ট শিট পাওয়া যায়নি।' });
    }
    ex.published = published;
    ex.publishedAt = published ? now : null;
    ex.updatedAt = now;
    store.results.activeExamId = ex.id;
    updatedCount = 1;
  } else if (b.examName || b.year) {
    const targetExamKey = normalizeExamMetaKey(b.examName, 'বার্ষিক পরীক্ষা');
    const targetYearKey = normalizeExamMetaKey(b.year, '২০২৬');
    for (const ex of Object.values(store.results.exams || {})) {
      if (!Array.isArray(ex.rows) || ex.rows.length === 0) continue;
      if (
        normalizeExamMetaKey(ex.examName, 'বার্ষিক পরীক্ষা') === targetExamKey
        && normalizeExamMetaKey(ex.year, '২০২৬') === targetYearKey
      ) {
        ex.published = published;
        ex.publishedAt = published ? now : null;
        ex.updatedAt = now;
        updatedCount++;
      }
    }
    if (updatedCount === 0) {
      return res.status(400).json({ error: 'এই পরীক্ষা ও শিক্ষাবর্ষে কোনো আপলোডকৃত শ্রেণি পাওয়া যায়নি।' });
    }
  } else {
    return res.status(400).json({ error: 'প্রকাশের জন্য পরীক্ষা নির্বাচন করুন।' });
  }

  saveExcelStore(store);
  res.json({
    ok: true,
    updatedCount,
    message: published
      ? `${convertToBengali(updatedCount)}টি শ্রেণির ফলাফল প্রকাশ করা হয়েছে।`
      : `${convertToBengali(updatedCount)}টি শ্রেণির ফলাফল খসড়া অবস্থায় রাখা হয়েছে।`,
    state: serializeExcelState(store),
  });
});

app.delete('/api/excel/results/:examId', requireAdminApi, verifySameOrigin, (req, res) => {
  const store = loadExcelStore();
  const examId = String(req.params.examId || '');
  const keys = Object.keys(store.results.exams || {});
  if (!store.results.exams?.[examId]) {
    return res.status(404).json({ error: 'নির্বাচিত শ্রেণির রেজাল্ট শিট পাওয়া যায়নি।' });
  }
  if (keys.length <= 1) {
    store.results.exams[examId].rows = [];
    store.results.exams[examId].updatedAt = null;
  } else {
    delete store.results.exams[examId];
    if (store.results.activeExamId === examId) {
      const remaining = Object.values(store.results.exams || {});
      const withRows = remaining.find((ex) => Array.isArray(ex.rows) && ex.rows.length > 0);
      store.results.activeExamId = (withRows || remaining[0]).id;
    }
  }
  saveExcelStore(store);
  res.json({ message: 'শ্রেণির রেজাল্ট ডেটা মুছে ফেলা হয়েছে।', state: serializeExcelState(store) });
});

app.get('/api/excel/template/:type', requireAdminApi, (req, res) => {
  const type = String(req.params.type || 'students');
  let headers = [];
  let rows = [];
  let filename = 'template.xlsx';

  if (type === 'students') {
    filename = 'students-template.xlsx';
    headers = ['রোল', 'আইডি', 'নাম (বাংলা)', 'নাম (ইংরেজি)', 'শ্রেণি', 'পিতার নাম', 'মাতার নাম', 'জন্ম তারিখ', 'মোবাইল', 'ঠিকানা'];
    rows = [
      ['1', 'STD-2026-01', 'মোঃ আব্দুল্লাহ আল মামুন', 'Md. Abdullah Al Mamun', 'ষষ্ঠ', 'মোঃ আব্দুর রহমান', 'মোছাঃ আমেনা বেগম', '2013-05-12', '01711000001', 'নলতা, কালিগঞ্জ, সাতক্ষীরা'],
      ['2', 'STD-2026-02', 'মোছাঃ ফাতিমা তুজ জোহরা', 'Mst. Fatema Tuz Zohra', 'ষষ্ঠ', 'মোঃ জাকারিয়া হোসেন', 'মোছাঃ রাবেয়া খাতুন', '2013-08-21', '01711000002', 'কালিগঞ্জ, সাতক্ষীরা'],
    ];
  } else if (type === 'results') {
    filename = 'result-sheet-template.xlsx';
    headers = ['রোল', 'শিক্ষার্থীর নাম', 'পিতার নাম', 'কুরআন মাজিদ (100)', 'আরবি (100)', 'বাংলা (100)', 'ইংরেজি (100)', 'গণিত (100)', 'তথ্য ও যোগাযোগ প্রযুক্তি (50)'];
    rows = [
      ['1', 'মোঃ আব্দুল্লাহ আল মামুন', 'মোঃ আব্দুর রহমান', '88', '84', '81', '78', '92', '46'],
      ['2', 'মোছাঃ ফাতিমা তুজ জোহরা', 'মোঃ জাকারিয়া হোসেন', '76', '72', '75', '28', '69', '41'],
      ['3', 'মোঃ তানভীর আহমেদ', 'মোঃ সাইফুল ইসলাম', '64', '58', '55', '49', '25', '35'],
    ];
  } else {
    filename = 'documents-template.xlsx';
    headers = ['রোল', 'রেজিস্ট্রেশন নং', 'শিক্ষার্থীর নাম', 'পিতার নাম', 'মাতার নাম', 'শ্রেণি', 'শিক্ষাবর্ষ', 'জন্ম তারিখ', 'জিপিএ', 'মন্তব্য'];
    rows = [
      ['101', '202611877801', 'মোঃ রাশেদুল ইসলাম', 'মোঃ নজরুল ইসলাম', 'মোছাঃ সখিনা বেগম', 'দাখিল (দশম)', '২০২৫-২০২৬', '2010-03-14', '4.85', 'উত্তম চরিত্র ও নিয়মিত উপস্থিতি'],
      ['102', '202611877802', 'মোছাঃ খাদিজা খাতুন', 'মোঃ কামাল উদ্দিন', 'মোছাঃ সালমা আক্তার', 'আলিম ২য় বর্ষ', '২০২৫-২০২৬', '2008-11-04', '5.00', 'মেধাবী ও শৃঙ্খলাপরায়ণ'],
    ];
  }

  const buffer = buildExcelBuffer(headers, rows, type);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
});

app.post('/api/excel/export', requireAdminApi, verifySameOrigin, (req, res) => {
  try {
    let body = req.body || {};
    if (typeof body.payload === 'string') {
      body = JSON.parse(body.payload);
    }
    const { headers, rows, filename, sheetName } = body;
    if (!Array.isArray(headers) || !Array.isArray(rows)) {
      return res.status(400).json({ error: 'এক্সপোর্ট করার জন্য ডেটা পাওয়া যায়নি।' });
    }
    const safeFilename = String(filename || 'export.xlsx').replace(/[^a-zA-Z0-9._-]/g, '_');
    const buffer = buildExcelBuffer(headers, rows, String(sheetName || 'Sheet1'));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message || 'এক্সেল এক্সপোর্ট ব্যর্থ হয়েছে।' });
  }
});

app.post('/api/excel/results/export-all', requireAdminApi, verifySameOrigin, (req, res) => {
  try {
    let body = req.body || {};
    if (typeof body.payload === 'string') {
      body = JSON.parse(body.payload);
    }
    const store = loadExcelStore();
    const targetYear = normalizeExamMetaKey(body.year || '২০২৬', '২০২৬');
    const targetExam = normalizeExamMetaKey(body.examName || 'বার্ষিক পরীক্ষা', 'বার্ষিক পরীক্ষা');
    const classOrder = new Map(Object.keys(classMap).map((k, idx) => [k, idx]));

    const allExams = Object.values(store.results?.exams || {}).filter((ex) => {
      if (!ex || !Array.isArray(ex.rows) || ex.rows.length === 0) return false;
      if (body.scope === 'all_exams') return true;
      return normalizeExamMetaKey(ex.year || '২০২৬', '২০২৬') === targetYear
        && normalizeExamMetaKey(ex.examName || 'বার্ষিক পরীক্ষা', 'বার্ষিক পরীক্ষা') === targetExam;
    });

    allExams.sort((a, b) => {
      const oa = classOrder.has(String(a.classId || '')) ? classOrder.get(String(a.classId || '')) : 999;
      const ob = classOrder.has(String(b.classId || '')) ? classOrder.get(String(b.classId || '')) : 999;
      if (oa !== ob) return oa - ob;
      return String(a.className || '').localeCompare(String(b.className || ''), 'bn');
    });

    const summaryHeaders = ['শ্রেণি', 'পরীক্ষা', 'সাল', 'মোট শিক্ষার্থী', 'উত্তীর্ণ', 'প্রমোটেড', 'অকৃতকার্য', 'অনুপস্থিত', 'পাসের হার (%)', 'অবস্থা'];
    const summaryRows = [];
    const sheets = [];

    for (const ex of allExams) {
      const computed = computeResultSheet(ex);
      const st = computed.stats || {};
      const clsLabel = formatClassLabel(ex.className || classMap[ex.classId]?.name || 'শ্রেণি', ex.classId);
      const isBoard = Boolean(st.isBoardExam);
      summaryRows.push([
        clsLabel,
        ex.examName || 'বার্ষিক পরীক্ষা',
        ex.year || '২০২৬',
        st.total || 0,
        st.passed || 0,
        st.promoted || 0,
        st.failed || 0,
        st.absent || 0,
        st.passRate || 0,
        ex.published !== false ? 'প্রকাশিত' : 'খসড়া',
      ]);

      const cols = Array.isArray(ex.columns) ? ex.columns : [];
      const headers = isBoard
        ? [...cols.map((c) => c.label), 'বিভাগ', 'মোট প্রাপ্ত নম্বর', 'পূর্ণমান', 'শতকরা (%)', 'GPA (৪র্থ ছাড়া)', 'চূড়ান্ত GPA', 'ফেল বিষয়', 'মেধাক্রম', 'ফলাফল']
        : [...cols.map((c) => c.label), 'বিভাগ', 'মোট প্রাপ্ত নম্বর', 'পূর্ণমান', 'শতকরা (%)', 'GPA', 'ফেল বিষয়', 'মেধাক্রম', 'ফলাফল'];
      const rows = computed.meritList.map((m) => [
        ...cols.map((c) => m.raw?.[c.key] ?? ''),
        m.groupLabel || 'সাধারণ',
        m.totalObtained,
        m.totalFullMarks,
        m.percentage,
        ...(isBoard ? [Number(m.gpaWithoutOptional ?? m.gpa).toFixed(2)] : []),
        m.gpa.toFixed(2),
        m.failCount,
        m.meritRank ?? '',
        m.statusBn,
      ]);

      sheets.push({
        name: body.scope === 'all_exams' ? `${clsLabel}_${ex.year || ''}` : clsLabel,
        headers,
        rows,
      });
    }

    const workbookSheets = [
      {
        name: 'সারসংক্ষেপ',
        headers: summaryHeaders,
        rows: summaryRows.length ? summaryRows : [['কোনো শ্রেণিতে এখনো ফলাফল এন্ট্রি নেই', '', '', 0, 0, 0, 0, 0, 0, '']],
      },
      ...sheets,
    ];

    const buffer = buildMultiSheetExcelBuffer(workbookSheets);
    const fname = `complete-result-${Date.now()}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: err.message || 'কমপ্লিট রেজাল্ট ডাউনলোড ব্যর্থ হয়েছে।' });
  }
});

app.get('/api/excel/backups', requireAdminApi, (req, res) => {
  res.json({ backups: listBackups() });
});

app.post('/api/excel/backups/create', requireAdminApi, verifySameOrigin, (req, res) => {
  try {
    const store = loadExcelStore();
    const label = String(req.body?.label || '').trim();
    const { backup, backups } = createBackupSnapshot(store, { label });
    res.json({
      message: `ব্যাকআপ সফলভাবে সংরক্ষিত হয়েছে ("${backup.label}")।`,
      backup,
      backups,
    });
  } catch (err) {
    res.status(500).json({ error: err.message || 'ব্যাকআপ তৈরি ব্যর্থ হয়েছে।' });
  }
});

app.post('/api/excel/backups/restore/:backupId', requireAdminApi, verifySameOrigin, (req, res) => {
  try {
    const { restoredLabel, store, backups } = restoreBackupSnapshot(req.params.backupId);
    res.json({
      message: `"${restoredLabel}" থেকে ডেটা সফলভাবে রিস্টোর করা হয়েছে।`,
      state: serializeExcelState(store),
      backups,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'ব্যাকআপ রিস্টোর ব্যর্থ হয়েছে।' });
  }
});

app.delete('/api/excel/backups/:backupId', requireAdminApi, verifySameOrigin, (req, res) => {
  try {
    const backups = deleteBackupSnapshot(req.params.backupId);
    res.json({ message: 'ব্যাকআপ মুছে ফেলা হয়েছে।', backups });
  } catch (err) {
    res.status(400).json({ error: err.message || 'ব্যাকআপ মুছা যায়নি।' });
  }
});

app.get('/api/excel/backup/download', requireAdminApi, (req, res) => {
  try {
    const store = loadExcelStore();
    const payload = exportPortableBackupObject(store);
    const jsonStr = JSON.stringify(payload, null, 2);
    const dateStamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="nadufm-results-backup-${dateStamp}.json"`);
    res.send(jsonStr);
  } catch (err) {
    res.status(500).json({ error: err.message || 'ব্যাকআপ ফাইল ডাউনলোড ব্যর্থ হয়েছে।' });
  }
});

app.post('/api/excel/backup/restore-file', requireAdminApi, verifySameOrigin, (req, res) => {
  try {
    let parsedPayload = req.body?.data || req.body;
    if (typeof parsedPayload === 'string') {
      parsedPayload = JSON.parse(parsedPayload);
    }
    const { restoredLabel, store, backups } = restoreBackupFromData(parsedPayload);
    res.json({
      message: `"${restoredLabel}" থেকে সকল রেজাল্ট ও তথ্য রিস্টোর হয়েছে।`,
      state: serializeExcelState(store),
      backups,
    });
  } catch (err) {
    res.status(400).json({ error: err.message || 'ব্যাকআপ ফাইল রিস্টোর ব্যর্থ হয়েছে।' });
  }
});

app.post('/api/export/word', async (req, res) => {
  try {
    const html = String(req.body?.html || '');
    const rawPayload = req.body?.payload;
    let parsedPayload = null;
    if (typeof rawPayload === 'string' && rawPayload.trim()) {
      try {
        parsedPayload = JSON.parse(rawPayload);
      } catch {
        parsedPayload = null;
      }
    } else if (rawPayload && typeof rawPayload === 'object') {
      parsedPayload = rawPayload;
    }

    const pages = parsedPayload && Array.isArray(parsedPayload.pages) ? parsedPayload.pages : null;
    if ((!pages || !pages.length) && !html.trim()) {
      return res.status(400).send('ডকুমেন্টের কোনো কন্টেন্ট পাওয়া যায়নি।');
    }

    const orientation = (parsedPayload && parsedPayload.orientation) || req.body?.orientation || 'portrait';
    const title = (parsedPayload && parsedPayload.title) || req.body?.title || 'Document';
    const marginMm = (parsedPayload && parsedPayload.marginMm) || req.body?.marginMm || 14;
    const safeFilename = String(req.body?.filename || 'document.docx')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.docx?$/i, '') + '.docx';

    const docBuffer = await buildDocxBuffer({
      pages,
      html,
      orientation,
      title,
      marginMm,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', String(docBuffer.length));
    res.send(docBuffer);
  } catch (err) {
    res.status(500).send(err.message || 'Word (.docx) ফাইল তৈরি ব্যর্থ হয়েছে।');
  }
});

app.post('/api/export/pdf-relay', (req, res) => {
  try {
    let base64 = String(req.body?.data || '').trim();
    if (!base64) {
      return res.status(400).send('PDF ডেটা পাওয়া যায়নি।');
    }
    const commaIdx = base64.indexOf(',');
    if (commaIdx !== -1 && base64.slice(0, 30).includes('base64')) {
      base64 = base64.slice(commaIdx + 1);
    }
    const pdfBuffer = Buffer.from(base64, 'base64');
    if (!pdfBuffer.length) {
      return res.status(400).send('অবৈধ PDF ডেটা।');
    }
    const safeFilename = String(req.body?.filename || 'document.pdf')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.pdf$/i, '') + '.pdf';
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  } catch (err) {
    res.status(500).send(err.message || 'PDF ডাউনলোড ব্যর্থ হয়েছে।');
  }
});

app.all(['/add_notice', '/add_notice.php'], requireAdminPage, verifySameOrigin, (req, res) => {
  let message = '';
  let messageType = 'green';
  const portal = loadPortalStore();
  let noticesList = portal.notices || [];
  let nextNoticeId = noticesList.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0) + 1;

  if (req.query.delete) {
    const id = parseInt(String(req.query.delete), 10);
    noticesList = noticesList.filter((n) => n.id !== id);
    portal.notices = noticesList;
    savePortalStore(portal);
    message = 'মুছে ফেলা হয়েছে!';
    messageType = 'red';
  }

  if (req.method === 'POST' && req.body.notice_submit) {
    const date = String(req.body.notice_date || '').trim();
    const subject = String(req.body.subject || '').trim();
    const description = String(req.body.description || '').trim();
    const link = String(req.body.link || '').trim();
    const isNew = req.body.is_new ? 'yes' : 'no';
    const updateId = parseInt(String(req.body.update_id || ''), 10);

    if (updateId) {
      const idx = noticesList.findIndex((n) => n.id === updateId);
      if (idx !== -1) {
        noticesList[idx] = {
          ...noticesList[idx],
          notice_date: date,
          subject,
          description,
          link,
          is_new: isNew,
        };
      }
    } else {
      noticesList.push({
        id: nextNoticeId++,
        type: 'notice',
        notice_date: date,
        subject,
        description,
        link,
        is_new: isNew,
      });
    }
    portal.notices = noticesList;
    savePortalStore(portal);
    message = 'সফলভাবে সম্পন্ন হয়েছে!';
    messageType = 'green';
  }

  if (req.method === 'POST' && req.body.headline_submit) {
    const headlineText = String(req.body.headline_text || '').trim();
    if (headlineText) {
      noticesList.push({
        id: nextNoticeId++,
        type: 'headline',
        notice_date: new Date().toISOString().slice(0, 10),
        subject: headlineText,
        description: '',
        link: '',
        is_new: 'no',
      });
      portal.notices = noticesList;
      savePortalStore(portal);
      message = 'হেডলাইন আপডেট হয়েছে!';
      messageType = 'blue';
    }
  }

  let editData = { id: '', date: '', subject: '', description: '', link: '', isNew: '' };
  if (req.query.edit) {
    const editId = parseInt(String(req.query.edit), 10);
    const found = noticesList.find((n) => n.id === editId);
    if (found) {
      editData = {
        id: found.id,
        date: found.notice_date,
        subject: found.subject,
        description: found.description,
        link: found.link,
        isNew: found.is_new,
      };
    }
  }

  const notices = noticesList.filter((n) => n.type === 'notice').sort((a, b) => b.id - a.id);
  const headlines = noticesList.filter((n) => n.type === 'headline').sort((a, b) => b.id - a.id);

  res.render('add_notice', {
    message,
    messageType,
    editData,
    notices,
    currentHeadline: headlines[0] || null,
  });
});

app.post('/api/portal/notices', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  let noticesList = portal.notices || [];
  const nextNoticeId = noticesList.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0) + 1;
  const body = req.body || {};
  const date = String(body.notice_date || '').trim();
  const subject = String(body.subject || '').trim();
  const description = String(body.description || '').trim();
  const link = String(body.link || '').trim();
  const isNew = body.is_new === true || body.is_new === 'yes' || body.is_new === 'on' || body.is_new === '1' ? 'yes' : 'no';
  const updateId = parseInt(String(body.update_id || ''), 10);

  if (!date || !subject) {
    return res.status(400).json({ error: 'তারিখ ও বিষয় আবশ্যক।' });
  }

  let savedId = updateId || nextNoticeId;
  if (updateId) {
    const idx = noticesList.findIndex((n) => n.id === updateId);
    if (idx !== -1) {
      noticesList[idx] = {
        ...noticesList[idx],
        notice_date: date,
        subject,
        description,
        link,
        is_new: isNew,
      };
    } else {
      noticesList.push({
        id: nextNoticeId,
        type: 'notice',
        notice_date: date,
        subject,
        description,
        link,
        is_new: isNew,
      });
      savedId = nextNoticeId;
    }
  } else {
    noticesList.push({
      id: nextNoticeId,
      type: 'notice',
      notice_date: date,
      subject,
      description,
      link,
      is_new: isNew,
    });
  }
  portal.notices = noticesList;
  savePortalStore(portal);
  res.json({
    ok: true,
    id: savedId,
    notices: noticesList.filter((n) => n.type === 'notice').sort((a, b) => b.id - a.id),
  });
});

app.delete('/api/portal/notices/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const id = parseInt(String(req.params.id || '0'), 10);
  const portal = loadPortalStore();
  portal.notices = (portal.notices || []).filter((n) => n.id !== id);
  savePortalStore(portal);
  res.json({
    ok: true,
    notices: (portal.notices || []).filter((n) => n.type === 'notice').sort((a, b) => b.id - a.id),
  });
});

app.post('/api/portal/headline', requireAdminApi, verifySameOrigin, (req, res) => {
  const headlineText = String(req.body?.headline_text || '').trim();
  if (!headlineText) {
    return res.status(400).json({ error: 'ঘোষণার লেখা আবশ্যক।' });
  }
  const portal = loadPortalStore();
  const noticesList = portal.notices || [];
  const nextNoticeId = noticesList.reduce((max, n) => Math.max(max, Number(n.id) || 0), 0) + 1;
  const newHeadline = {
    id: nextNoticeId,
    type: 'headline',
    notice_date: new Date().toISOString().slice(0, 10),
    subject: headlineText,
    description: '',
    link: '',
    is_new: 'no',
  };
  noticesList.push(newHeadline);
  portal.notices = noticesList;
  savePortalStore(portal);
  res.json({
    ok: true,
    currentHeadline: newHeadline,
    headlines: getHeadlines(),
  });
});

app.all(['/result', '/result.php', '/view_result.php'], async (req, res) => {
  const excelStore = loadExcelStore();
  const portal = loadPortalStore();
  const uploadedExams = getUploadedExamsSummary(excelStore);
  let studentResult = null;
  let selectedClassName = '';
  let selectedClassValue = String(req.query.class || '');
  let selectedClassKey = '';
  let searchedRoll = String(req.query.roll || '').trim();
  let selectedExamTitle = '';
  let searchError = '';

  const hasPostSearch = req.method === 'POST' && Boolean(req.body.view_result);
  const hasQuerySearch = Boolean(req.query.class && req.query.roll);

  if (hasPostSearch || hasQuerySearch) {
    const searchClass = hasPostSearch
      ? String(req.body.student_class || '')
      : String(req.query.class || '');
    const searchRollRaw = (hasPostSearch
      ? String(req.body.roll_number || '')
      : String(req.query.roll || '')).trim();
    searchedRoll = searchRollRaw;
    const searchRollNorm = normalizeRollKey(searchRollRaw);
    selectedClassValue = searchClass;
    const strippedClass = searchClass.replace(/^excel:(?:exam_class_)?/i, '');
    const normCls = normalizeClassInput(strippedClass);
    selectedClassKey = normCls.key || '';

    // 1) Check uploaded published Excel result sheet first
    const viewerIsAdminResult = Boolean(getValidAdminSession(req));
    let matchedExcelExam = null;
    if (searchClass.startsWith('excel:')) {
      const eid = searchClass.slice(6);
      const candidate = excelStore.results?.exams?.[eid] || null;
      if (candidate && (isExamPublished(candidate) || (viewerIsAdminResult && Array.isArray(candidate.rows) && candidate.rows.length > 0))) {
        matchedExcelExam = candidate;
      }
    } else {
      matchedExcelExam = Object.values(excelStore.results?.exams || {}).find((ex) => {
        if (!isExamPublished(ex)) return false;
        if (String(ex.classId) === searchClass) return true;
        const exCls = normalizeClassInput(ex.className || ex.classId || '');
        return Boolean(normCls.key && exCls.key && normCls.key === exCls.key);
      }) || null;
    }

    if (matchedExcelExam && Array.isArray(matchedExcelExam.rows) && matchedExcelExam.rows.length > 0) {
      selectedClassName = matchedExcelExam.className || (classMap[matchedExcelExam.classId]?.name || '');
      selectedClassKey = String(matchedExcelExam.classId || selectedClassKey || '');
      selectedExamTitle = matchedExcelExam.title || `${matchedExcelExam.examName || 'বার্ষিক পরীক্ষা'} (${matchedExcelExam.year || '২০২৬'})`;
      const { evaluatedRows } = computeResultSheet(matchedExcelExam);
      const found = evaluatedRows.find(
        (r) => normalizeRollKey(r.roll) === searchRollNorm
      );

      if (found) {
        const unified = findUnifiedStudents(excelStore, portal, {
          classParam: selectedClassName || searchClass,
          rollParam: found.roll,
        }).exact;

        studentResult = {
          name: found.name || unified?.name_bn || '—',
          displayName: found.displayName || formatStudentNameWithGroup(found.name || unified?.name_bn || '—', Boolean(found.isScience)),
          isScience: Boolean(found.isScience),
          groupLabel: found.groupLabel || (found.isScience ? 'বিজ্ঞান' : 'সাধারণ'),
          father: found.father || unified?.father_bn || '',
          mother: unified?.mother_bn || '',
          id: found.studentId || unified?.id || '',
          roll: found.roll,
          subs: found.subjects.map((s) => ({
            name: s.name,
            fm: s.fullMarks,
            obtained: s.obtained,
            display_avg: s.averageMark ?? s.numericMark,
            sum: s.numericMark,
            is_fail: s.isFail,
            grade: s.grade,
            gp: s.gp,
            isCombined: Boolean(s.isCombined),
            isOptional: Boolean(s.isOptional),
          })),
          total: found.totalObtained,
          tfm: found.totalFullMarks,
          fail: found.failCount,
          gpa: found.gpa,
          gpaWithoutOptional: found.gpaWithoutOptional ?? found.gpa,
          isBoardExam: Boolean(found.isBoardExam),
          boardType: found.boardType || '',
          hasOptionalSubject: Boolean(found.hasOptionalSubject),
          optionalSubjectName: found.optionalSubjectName || '',
          optionalBonus: found.optionalBonus || 0,
          optionalFailCount: found.optionalFailCount || 0,
          meritRank: found.meritRank,
          status: found.status,
          statusBn: found.statusBn,
          isPromoted: found.isPromoted,
          promotionNote: found.promotionNote,
          examName: matchedExcelExam.examName || 'বার্ষিক পরীক্ষা',
          year: matchedExcelExam.year || '২০২৬',
        };
      }
    }

    // 2) Fallback to Google Sheets CSV if not found in uploaded Excel sheets
    const csvClassKey = Object.prototype.hasOwnProperty.call(classMap, searchClass)
      ? searchClass
      : (Object.prototype.hasOwnProperty.call(classMap, normCls.key) ? normCls.key : '');
    if (!studentResult && csvClassKey) {
      selectedClassName = classMap[csvClassKey].name;
      selectedExamTitle = 'বার্ষিক পরীক্ষা - একাডেমিক ট্রান্সক্রিপ্ট';
      const gid = classMap[csvClassKey].gid;
      if (gid) {
        const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSYfZ7IOoN4gbjjSgT02E1ugUQvhPmL39Ch4gJns0GGbb9OrCO4Wm9hdmbpPaEerRC5m2S0-WOJQcV4/pub?output=csv&gid=${gid}`;

        try {
          const response = await fetch(csvUrl);
          if (response.ok) {
            const csvText = await response.text();
            const rows = parseCsv(csvText);
            if (rows.length > 1) {
              const syntheticExam = buildCsvSyntheticExam(csvClassKey, selectedClassName, rows);
              const { evaluatedRows } = computeResultSheet(syntheticExam);
              const found = evaluatedRows.find((r) => normalizeRollKey(r.roll) === searchRollNorm);
              if (found) {
                const unifiedCsv = findUnifiedStudents(excelStore, portal, {
                  classParam: selectedClassName || csvClassKey,
                  rollParam: found.roll,
                }).exact;
                studentResult = {
                  name: found.name || unifiedCsv?.name_bn || '—',
                  displayName: found.displayName || formatStudentNameWithGroup(found.name || unifiedCsv?.name_bn || '—', Boolean(found.isScience)),
                  isScience: Boolean(found.isScience),
                  groupLabel: found.groupLabel || (found.isScience ? 'বিজ্ঞান' : 'সাধারণ'),
                  father: found.father || unifiedCsv?.father_bn || '',
                  mother: unifiedCsv?.mother_bn || '',
                  id: found.studentId || unifiedCsv?.id || unifiedCsv?.reg_no || '',
                  roll: found.roll,
                  subs: found.subjects.map((s) => ({
                    name: s.name,
                    fm: s.fullMarks,
                    obtained: s.obtained,
                    display_avg: s.averageMark ?? s.numericMark,
                    sum: s.numericMark,
                    is_fail: s.isFail,
                    grade: s.grade,
                    gp: s.gp,
                    isCombined: Boolean(s.isCombined),
                    isOptional: Boolean(s.isOptional),
                  })),
                  total: found.totalObtained,
                  tfm: found.totalFullMarks,
                  fail: found.failCount,
                  gpa: found.gpa,
                  gpaWithoutOptional: found.gpaWithoutOptional ?? found.gpa,
                  isBoardExam: Boolean(found.isBoardExam),
                  boardType: found.boardType || '',
                  hasOptionalSubject: Boolean(found.hasOptionalSubject),
                  optionalSubjectName: found.optionalSubjectName || '',
                  optionalBonus: found.optionalBonus || 0,
                  optionalFailCount: found.optionalFailCount || 0,
                  meritRank: found.meritRank,
                  status: found.status,
                  statusBn: found.statusBn,
                  isPromoted: found.isPromoted,
                  examName: 'বার্ষিক পরীক্ষা',
                  year: '২০২৬',
                };
              }
            }
          }
        } catch (err) {
          console.warn('Failed to fetch result CSV:', err.message);
        }
      }
    }

    if (!studentResult) {
      searchError = 'দুঃখিত! এই রোল নম্বরের কোনো ফলাফল পাওয়া যায়নি।';
    }
    if (csvClassKey && !selectedClassKey) {
      selectedClassKey = csvClassKey;
    }
  } else if (selectedClassValue) {
    const preNorm = normalizeClassInput(selectedClassValue.replace(/^excel:(?:exam_class_)?/i, ''));
    selectedClassKey = preNorm.key || '';
  }

  res.render('result', {
    pageTitle: 'অনলাইন ফলাফল - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    uploadedExams,
    studentResult,
    selectedClassName,
    selectedClassValue,
    selectedClassKey,
    searchedRoll,
    selectedExamTitle,
    searchError,
    convertToBengali,
    getGradeInfo,
  });
});

app.all(['/accounting_entry', '/accounting_entry.php'], requireAdminPage, (req, res) => {
  res.render('accounting_entry', {
    pageTitle: 'হিসাব এন্ট্রি - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    isEmbedded: req.query.embed === '1',
  });
});

app.all(['/accounting_report', '/accounting_report.php'], requireAdminPage, (req, res) => {
  res.render('accounting_report', {
    pageTitle: 'আয়-ব্যয় স্মার্ট রিপোর্ট - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.all(['/admission', '/admission.php'], (req, res) => {
  res.render('admission', {
    pageTitle: 'অনলাইন ভর্তি ফরম - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
  });
});

app.all(['/admit', '/admit.php'], (req, res) => {
  res.render('admit', {
    pageTitle: 'এডমিট কার্ড ডাউনলোড - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    convertToBengali,
  });
});

app.all(['/id-card', '/id-card.php'], (req, res) => {
  res.render('id-card', {
    pageTitle: 'শিক্ষার্থী আইডি কার্ড - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    convertToBengali,
  });
});

app.all(['/student-search', '/student-search.php'], (req, res) => {
  res.render('student-search', {
    pageTitle: 'শিক্ষার্থী তথ্য অনুসন্ধান - নলতা আহছানিয়া দারুল উলুম মাদ্রাসা',
    classMap,
    convertToBengali,
  });
});

const server = app.listen(PORT, HOST, () => {
  console.log(`Madrasah portal server running at http://${HOST}:${PORT}`);
});

function shutdown() {
  if (typeof server.closeAllConnections === 'function') {
    server.closeAllConnections();
  }
  server.close(() => {
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
