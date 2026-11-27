import express from 'express';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
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

app.get('/admin-login', (req, res) => {
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

app.post('/admin-login', verifySameOrigin, (req, res) => {
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

app.post('/admin-logout', verifySameOrigin, (req, res) => {
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
  return /(?:শ্রেণি|শ্রেণী)$/.test(raw) ? raw : `${raw} শ্রেণি`;
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

function getUploadedExamsSummary(store) {
  const exams = (store.results && store.results.exams) || {};
  return Object.values(exams)
    .filter((ex) => Array.isArray(ex.rows) && ex.rows.length > 0)
    .map((ex) => {
      const className = String(ex.className || (ex.classId && classMap[ex.classId]?.name) || '').trim();
      const classLabel = formatClassLabel(className, ex.classId);
      const examName = String(ex.examName || 'বার্ষিক পরীক্ষা').trim();
      const year = String(ex.year || '').trim();
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
        rowCount: ex.rows.length,
      };
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
  });
});

app.get(['/notice', '/notice.php', '/notices', '/notices.php'], (req, res) => {
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
    if (!Array.isArray(ex.rows) || ex.rows.length === 0) continue;
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

  // Prefer explicit exam_id, or uploaded Excel sheet matching class_id / normalized className
  let matchedExcelExam = null;
  if (selectedExamId && excelStore.results?.exams?.[selectedExamId]) {
    matchedExcelExam = excelStore.results.exams[selectedExamId];
  } else if (selectedClass.startsWith('excel:')) {
    const eid = selectedClass.slice(6);
    if (excelStore.results?.exams?.[eid]) {
      matchedExcelExam = excelStore.results.exams[eid];
    }
  } else if (selectedClass !== '') {
    const normSel = normalizeClassInput(selectedClass);
    matchedExcelExam = Object.values(excelStore.results?.exams || {}).find((ex) => {
      if (!Array.isArray(ex.rows) || ex.rows.length === 0) return false;
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

  res.render('merit-list', {
    pageTitle: 'শ্রেণি ভিত্তিক মেধা তালিকা - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    uploadedExams,
    uploadedClassIds,
    selectedClass,
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
  const governingCount = ((portal.governingBody && portal.governingBody.members) || []).length;
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
      label: 'রেজাল্ট শিট আপলোড ও GPA',
      meta: `${convertToBengali(excelExamsCount)}টি পরীক্ষার শিট`,
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
      label: 'গভর্নিং বডি',
      meta: `${convertToBengali(governingCount)} জন সদস্য`,
      icon: 'users',
      tone: 'ic-blue',
      src: '/admin-governing.php?embed=1',
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

app.get(['/admin-governing', '/admin-governing.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-governing', {
    governingBody: portal.governingBody || { institutionName: '', tenure: '', members: [] },
  });
});

app.post('/api/portal/governing/meta', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const institutionName = String(body.institutionName || '').trim().slice(0, 250);
  const tenure = String(body.tenure || '').trim().slice(0, 250);
  if (!institutionName || !tenure) {
    return res.status(400).json({ error: 'মাদ্রাসার নাম ও কার্যকাল আবশ্যক।' });
  }
  const currentMembers = Array.isArray(portal.governingBody?.members) ? portal.governingBody.members : [];
  portal.governingBody = {
    institutionName,
    tenure,
    members: currentMembers,
  };
  savePortalStore(portal);
  res.json({ ok: true, governingBody: portal.governingBody });
});

app.post('/api/portal/governing/members', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const id = body.id ? String(body.id).trim().slice(0, 80) : `gb_${Date.now()}`;
  const orderNum = Number.parseInt(body.order, 10);
  const order = Number.isFinite(orderNum) && orderNum >= 1 ? Math.min(orderNum, 500) : 1;
  const name = String(body.name || '').trim().slice(0, 200);
  const designation = String(body.designation || '').trim().slice(0, 250);
  const mobile = String(body.mobile || '').trim().slice(0, 40);
  if (!name || !designation) {
    return res.status(400).json({ error: 'সদস্যের নাম ও পদবি আবশ্যক।' });
  }
  const gb = portal.governingBody || { institutionName: '', tenure: '', members: [] };
  const members = Array.isArray(gb.members) ? gb.members.slice() : [];
  const item = { id, order, name, designation, mobile };
  const idx = members.findIndex((m) => String(m.id) === id);
  if (idx !== -1) {
    members[idx] = item;
  } else {
    members.push(item);
  }
  members.sort((a, b) => (Number(a.order) || 999) - (Number(b.order) || 999));
  portal.governingBody = {
    institutionName: gb.institutionName || 'নলতা আহ্ছানিয়া দারুল উলূম ফাযিল মাদ্রাসা, সাতক্ষীরা।',
    tenure: gb.tenure || '২৫.০৪.২০২৫ হতে ২৪.০৪.২০২৮ খ্রি: পর্যন্ত (০৩ বছর)।',
    members,
  };
  savePortalStore(portal);
  res.json({ ok: true, governingBody: portal.governingBody });
});

app.delete('/api/portal/governing/members/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  const gb = portal.governingBody || { institutionName: '', tenure: '', members: [] };
  const targetId = String(req.params.id || '');
  const members = (Array.isArray(gb.members) ? gb.members : []).filter((m) => String(m.id) !== targetId);
  portal.governingBody = {
    institutionName: gb.institutionName || 'নলতা আহ্ছানিয়া দারুল উলূম ফাযিল মাদ্রাসা, সাতক্ষীরা।',
    tenure: gb.tenure || '২৫.০৪.২০২৫ হতে ২৪.০৪.২০২৮ খ্রি: পর্যন্ত (০৩ বছর)।',
    members,
  };
  savePortalStore(portal);
  res.json({ ok: true, governingBody: portal.governingBody });
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

app.get(['/admin-admissions', '/admin-admissions.php'], requireAdminPage, (req, res) => {
  const portal = loadPortalStore();
  res.render('admin-admissions', {
    admissions: portal.admissions || [],
  });
});

app.post('/api/portal/admissions', (req, res) => {
  const portal = loadPortalStore();
  const b = req.body || {};
  const item = {
    id: `adm_${Date.now()}`,
    roll_no: String(b.roll_no || '').trim(),
    id_no: String(b.id_no || '').trim(),
    name_bn: String(b.name_bn || '').trim(),
    name_en: String(b.name_en || '').trim(),
    student_class: String(b.student_class || '').trim(),
    father_bn: String(b.father_bn || '').trim(),
    mother_bn: String(b.mother_bn || '').trim(),
    mobile: String(b.mobile || '').trim(),
    photo: String(b.base64 || ''),
    createdAt: new Date().toISOString(),
  };
  portal.admissions = [item, ...(portal.admissions || [])];
  savePortalStore(portal);
  res.json({ ok: true, admission: item });
});

app.delete('/api/portal/admissions/:id', requireAdminApi, verifySameOrigin, (req, res) => {
  const portal = loadPortalStore();
  portal.admissions = (portal.admissions || []).filter((a) => a.id !== String(req.params.id));
  savePortalStore(portal);
  res.json({ ok: true, admissions: portal.admissions });
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
      const classId = (req.body.classId !== undefined && String(req.body.classId).trim() !== '')
        ? String(req.body.classId).trim()
        : '6';
      let examId = String(req.body.examId || '').trim();
      if (!examId) {
        const matchedExisting = Object.values(store.results.exams || {}).find(
          (ex) => String(ex.classId ?? '') === classId
        );
        examId = matchedExisting?.id || `exam_class_${classId}`;
      }
      const existing = store.results.exams[examId] || {};
      const detectedCols = detectResultColumns(parsed.columns);
      const mappingGuess = autoDetectStudentMapping(parsed.columns);
      const resolvedClassId = (req.body.classId !== undefined && String(req.body.classId).trim() !== '')
        ? String(req.body.classId).trim()
        : String(existing.classId ?? classId);
      const className = String(req.body.className || existing.className || (classMap[resolvedClassId]?.name || 'ষষ্ঠ')).trim();
      const examName = String(req.body.examName || existing.examName || 'বার্ষিক পরীক্ষা').trim();
      const year = String(req.body.year || existing.year || '২০২৬').trim();

      store.results.exams[examId] = {
        id: examId,
        title: String(req.body.title || `${formatClassLabel(className, resolvedClassId)} — ${examName}`),
        classId: resolvedClassId,
        className,
        examName,
        year,
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
        rows: parsed.rows,
        updatedAt: now,
      };
      store.results.activeExamId = examId;
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
  store.results.exams[exam.id] = {
    ...exam,
    passPercent: Number(exam.passPercent) > 0 ? Number(exam.passPercent) : 33,
    maxPromoteFail: Number(exam.maxPromoteFail) || 0,
    promotionLabel: String(exam.promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড'),
    updatedAt: new Date().toISOString(),
  };
  store.results.activeExamId = exam.id;
  saveExcelStore(store);
  res.json({
    message: 'রেজাল্ট শিট, GPA ও মেধা তালিকা সংরক্ষণ করা হয়েছে।',
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

app.post('/api/export/word', (req, res) => {
  try {
    const html = String(req.body?.html || '');
    if (!html.trim()) {
      return res.status(400).send('ডকুমেন্টের কোনো কন্টেন্ট পাওয়া যায়নি।');
    }
    const safeFilename = String(req.body?.filename || 'document.doc')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.docx?$/i, '') + '.doc';
    const docBuffer = Buffer.concat([Buffer.from('\ufeff', 'utf8'), Buffer.from(html, 'utf8')]);
    res.setHeader('Content-Type', 'application/msword; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', String(docBuffer.length));
    res.send(docBuffer);
  } catch (err) {
    res.status(500).send(err.message || 'Word ফাইল তৈরি ব্যর্থ হয়েছে।');
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
  let selectedClassValue = '';
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
    const searchRollNorm = normalizeRollKey(searchRollRaw);
    selectedClassValue = searchClass;
    const normCls = normalizeClassInput(searchClass);

    // 1) Check uploaded Excel result sheet first
    let matchedExcelExam = null;
    if (searchClass.startsWith('excel:')) {
      const eid = searchClass.slice(6);
      matchedExcelExam = excelStore.results?.exams?.[eid] || null;
    } else {
      matchedExcelExam = Object.values(excelStore.results?.exams || {}).find((ex) => {
        if (!Array.isArray(ex.rows) || ex.rows.length === 0) return false;
        if (String(ex.classId) === searchClass) return true;
        const exCls = normalizeClassInput(ex.className || ex.classId || '');
        return Boolean(normCls.key && exCls.key && normCls.key === exCls.key);
      }) || null;
    }

    if (matchedExcelExam && Array.isArray(matchedExcelExam.rows) && matchedExcelExam.rows.length > 0) {
      selectedClassName = matchedExcelExam.className || (classMap[matchedExcelExam.classId]?.name || '');
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

    if (!studentResult) {
      searchError = 'দুঃখিত! এই রোল নম্বরের কোনো ফলাফল পাওয়া যায়নি।';
    }
  }

  res.render('result', {
    pageTitle: 'অনলাইন ফলাফল - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    uploadedExams,
    studentResult,
    selectedClassName,
    selectedClassValue,
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
