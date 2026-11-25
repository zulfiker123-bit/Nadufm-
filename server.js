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
} from './data/seed.js';
import {
  loadExcelStore,
  saveExcelStore,
  parseExcelBuffer,
  parseExcelWorkbook,
  autoDetectStudentMapping,
  detectResultColumns,
  computeResultSheet,
  buildExcelBuffer,
  buildMultiSheetExcelBuffer,
  resolveSheetClassInfo,
} from './data/excelStore.js';
import { generateDocxFromHtml } from './data/docxExport.js';
import { loadPortalStore, savePortalStore } from './data/portalStore.js';
import {
  getClassesAndRolls,
  findUnifiedStudents,
  normalizeClassInput,
  normalizeRollKey,
  sanitizeImageUrl,
} from './data/studentHub.js';

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
  res.locals.isEmbedded = req.query.embed === '1';
  res.locals.currentPath = req.path || '/';
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
  const clientKey = String(req.ip || 'unknown');
  const now = Date.now();
  const attemptInfo = loginAttempts.get(clientKey);
  if (attemptInfo && now < attemptInfo.resetAt && attemptInfo.count >= MAX_LOGIN_ATTEMPTS) {
    return res.status(429).render('admin-login', {
      error: 'অতিরিক্ত ভুল চেষ্টার কারণে সাময়িকভাবে ব্লক করা হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
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
    return res.status(401).render('admin-login', {
      error: 'ভুল পাসওয়ার্ড! সঠিক অ্যাডমিন পাসওয়ার্ড দিন।',
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

function getUploadedExamsSummary(store) {
  const exams = (store.results && store.results.exams) || {};
  return Object.values(exams)
    .filter((ex) => Array.isArray(ex.rows) && ex.rows.length > 0)
    .map((ex) => ({
      id: ex.id,
      title: ex.title || `${ex.examName || 'পরীক্ষা'} - ${ex.className || ''}`,
      classId: ex.classId || '',
      className: ex.className || '',
      examName: ex.examName || 'বার্ষিক পরীক্ষা',
      year: ex.year || '২০২৬',
      rowCount: ex.rows.length,
    }));
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

app.get('/api/notices', (req, res) => {
  res.json({
    headlines: getHeadlines(),
    notices: getNoticesForBoard(),
  });
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
  res.render('governingbody', {
    pageTitle: 'গভর্নিং বডি- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
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
  const noticeId = parseInt(String(req.query.id || '0'), 10);
  if (!noticeId) {
    return res.redirect('/index.php');
  }

  const portal = loadPortalStore();
  const row = (portal.notices || []).find((n) => n.id === noticeId);
  if (!row) {
    return res.status(404).send(`Error: নোটিশটি ডাটাবেজে পাওয়া যায়নি। আইডি: ${noticeId}`);
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
  });
});

app.get(['/merit-list', '/merit-list.php'], async (req, res) => {
  let selectedClass = String(req.query.class_id || '');
  const selectedExamId = String(req.query.exam_id || '');
  const excelStore = loadExcelStore();
  const uploadedExams = getUploadedExamsSummary(excelStore);

  if (!selectedClass && !selectedExamId && uploadedExams.length > 0) {
    selectedClass = `excel:${uploadedExams[0].id}`;
  }

  let selectedName = '';
  let selectedExamTitle = '';
  let selectedClassValue = selectedClass;
  let meritData = [];
  let sourceType = 'csv';

  // Prefer explicit exam_id, or uploaded Excel sheet matching class_id
  let matchedExcelExam = null;
  if (selectedExamId && excelStore.results?.exams?.[selectedExamId]) {
    matchedExcelExam = excelStore.results.exams[selectedExamId];
  } else if (selectedClass.startsWith('excel:')) {
    const eid = selectedClass.slice(6);
    if (excelStore.results?.exams?.[eid]) {
      matchedExcelExam = excelStore.results.exams[eid];
    }
  } else if (selectedClass !== '') {
    matchedExcelExam = Object.values(excelStore.results?.exams || {}).find(
      (ex) => String(ex.classId) === selectedClass && Array.isArray(ex.rows) && ex.rows.length > 0
    );
  }

  if (matchedExcelExam && Array.isArray(matchedExcelExam.rows) && matchedExcelExam.rows.length > 0) {
    sourceType = 'excel';
    selectedName = matchedExcelExam.className || (classMap[matchedExcelExam.classId]?.name || '');
    selectedExamTitle = matchedExcelExam.title || `${matchedExcelExam.examName || 'পরীক্ষা'} - ${selectedName}`;
    selectedClassValue = `excel:${matchedExcelExam.id}`;
    const { meritList } = computeResultSheet(matchedExcelExam);
    meritData = meritList.map((item) => ({
      name: item.name || '—',
      roll: item.roll,
      total: item.totalObtained,
      fullMarks: item.totalFullMarks,
      pct: item.percentage,
      gpa: item.gpa,
      fail: item.failCount,
      absent: item.allAbsent,
      isPromoted: item.isPromoted,
      status: item.status,
      statusBn: item.statusBn,
      meritRank: item.meritRank,
    }));
  } else if (selectedClass !== '' && Object.prototype.hasOwnProperty.call(classMap, selectedClass)) {
    selectedName = classMap[selectedClass].name;
    selectedExamTitle = `বার্ষিক পরীক্ষার মেধাতালিকা · শ্রেণি: ${selectedName}`;
    selectedClassValue = selectedClass;
    const gid = classMap[selectedClass].gid;
    const csvUrl = `https://docs.google.com/spreadsheets/d/e/2PACX-1vSYfZ7IOoN4gbjjSgT02E1ugUQvhPmL39Ch4gJns0GGbb9OrCO4Wm9hdmbpPaEerRC5m2S0-WOJQcV4/pub?output=csv&gid=${gid}`;

    try {
      const response = await fetch(csvUrl);
      if (response.ok) {
        const csvText = await response.text();
        const rows = parseCsv(csvText);
        if (rows.length > 1) {
          const headers = rows[0];
          const subjectFullMarks = {};
          for (let i = 3; i < headers.length; i++) {
            const match = String(headers[i] || '').match(/\((\d+)\)/);
            subjectFullMarks[i] = match ? parseInt(match[1], 10) : 100;
          }

          for (const data of rows.slice(1)) {
            if (!data[0] || !String(data[0]).trim()) continue;
            let obtainedTotal = 0;
            let attemptedFullTotal = 0;
            let failCount = 0;
            let isAbsentInAny = false;
            let totalGp = 0;
            let subjectCount = 0;

            for (let i = 3; i < headers.length; i++) {
              const val = String(data[i] || '').trim().toUpperCase();
              if (val === 'A' || val === 'ABS' || val === 'ABSENT') {
                isAbsentInAny = true;
              } else if (val !== '') {
                const mark = parseFloat(val);
                if (!Number.isNaN(mark)) {
                  subjectCount++;
                  obtainedTotal += mark;
                  attemptedFullTotal += subjectFullMarks[i];
                  const subFail = mark < subjectFullMarks[i] * 0.33;
                  if (subFail) failCount++;
                  const [, gp] = getGradeInfo(mark, subjectFullMarks[i], subFail);
                  totalGp += parseFloat(gp);
                }
              }
            }

            const percentage = attemptedFullTotal > 0 ? (obtainedTotal / attemptedFullTotal) * 100 : 0;
            const gpa = !isAbsentInAny && failCount === 0 && subjectCount > 0 ? totalGp / subjectCount : 0;
            meritData.push({
              name: data[0],
              roll: String(data[2] || '').trim(),
              total: obtainedTotal,
              fullMarks: attemptedFullTotal,
              pct: percentage,
              gpa: Number(gpa.toFixed(2)),
              fail: failCount,
              absent: isAbsentInAny,
              isPromoted: false,
              status: isAbsentInAny ? 'Absent' : failCount > 0 ? 'Failed' : 'Passed',
              statusBn: isAbsentInAny ? 'অনুপস্থিত' : failCount > 0 ? 'অকৃতকার্য' : 'উত্তীর্ণ',
            });
          }

          meritData.sort((a, b) => {
            if (a.absent !== b.absent) return Number(a.absent) - Number(b.absent);
            if (a.fail !== b.fail) return a.fail - b.fail;
            if (b.gpa !== a.gpa) return b.gpa - a.gpa;
            return b.pct - a.pct;
          });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch merit list CSV:', err.message);
    }
  }

  res.render('merit-list', {
    pageTitle: 'মেধা তালিকা - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
    classMap,
    uploadedExams,
    selectedClass,
    selectedClassValue,
    selectedExamId: matchedExcelExam ? matchedExcelExam.id : selectedExamId,
    selectedName,
    selectedExamTitle,
    sourceType,
    meritData,
    convertToBengali,
  });
});

// Admin Panel route (password-protected)
app.all(['/dashboard', '/dashboard.php'], requireAdminPage, (req, res) => {
  const institutionName = 'নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা';
  const store = loadExcelStore();
  const portal = loadPortalStore();
  const noticesCount = (portal.notices || []).filter((n) => n.type === 'notice').length;
  const excelStudentsCount = (store.students?.rows || []).length;
  const excelExamsCount = Object.values(store.results?.exams || {}).filter((e) => (e.rows || []).length > 0).length;
  const excelDocsCount = (store.documents?.rows || []).length;
  const teachersCount = (portal.teachers || []).length;
  const admissionsCount = (portal.admissions || []).length;

  const modules = [
    {
      id: 'excel-students',
      label: 'শিক্ষার্থী তথ্য (Excel)',
      meta: `${convertToBengali(excelStudentsCount)} জন শিক্ষার্থী`,
      icon: 'fas fa-user-graduate',
      tone: 'ic-green',
      src: '/excel-studio.php?embed=1&tab=students&hideTabs=1',
    },
    {
      id: 'excel-results',
      label: 'রেজাল্ট ও অটো GPA (Excel)',
      meta: `${convertToBengali(excelExamsCount)}টি পরীক্ষার শিট`,
      icon: 'fas fa-calculator',
      tone: 'ic-amber',
      src: '/excel-studio.php?embed=1&tab=results&hideTabs=1',
    },
    {
      id: 'excel-docs',
      label: 'সকল ডকুমেন্টস (Excel)',
      meta: `${convertToBengali(excelDocsCount)}টি ডকুমেন্ট সারি`,
      icon: 'fas fa-folder-open',
      tone: 'ic-teal',
      src: '/excel-studio.php?embed=1&tab=documents&hideTabs=1',
    },
    {
      id: 'a4-studio',
      label: 'A4 মার্কশিট ও সনদ প্রিন্ট',
      meta: 'Word, PDF ও প্রিন্ট স্টুডিও',
      icon: 'fas fa-print',
      tone: 'ic-indigo',
      src: '/excel-studio.php?embed=1&tab=docstudio&hideTabs=1',
    },
    {
      id: 'notices',
      label: 'নোটিশ ও হেডলাইন',
      meta: `${convertToBengali(noticesCount)}টি সক্রিয় নোটিশ`,
      icon: 'fas fa-bullhorn',
      tone: 'ic-blue',
      src: '/add_notice.php?embed=1',
    },
    {
      id: 'result-portal',
      label: 'অনলাইন ফলাফল দেখুন',
      meta: 'রোল নম্বর দিয়ে মার্কশিট',
      icon: 'fas fa-award',
      tone: 'ic-green',
      src: '/result.php?embed=1',
    },
    {
      id: 'merit-portal',
      label: 'মেধা তালিকা দেখুন',
      meta: 'GPA ও মেধাক্রম তালিকা',
      icon: 'fas fa-trophy',
      tone: 'ic-amber',
      src: '/merit-list.php?embed=1',
    },
    {
      id: 'admissions',
      label: 'ভর্তি আবেদন ও ফরম',
      meta: `${convertToBengali(admissionsCount)}টি জমা আবেদন`,
      icon: 'fas fa-user-plus',
      tone: 'ic-indigo',
      src: '/admin-admissions.php?embed=1',
    },
    {
      id: 'admit-card',
      label: 'এডমিট কার্ড',
      meta: 'প্রবেশপত্র অনুসন্ধান ও প্রিন্ট',
      icon: 'fas fa-id-card',
      tone: 'ic-blue',
      src: '/admit.php?embed=1',
    },
    {
      id: 'id-card',
      label: 'শিক্ষার্থী আইডি কার্ড',
      meta: 'শ্রেণি ও রোল ভিত্তিক আইডি কার্ড',
      icon: 'fas fa-id-badge',
      tone: 'ic-teal',
      src: '/id-card.php?embed=1',
    },
    {
      id: 'teachers',
      label: 'শিক্ষক ও কর্মচারী',
      meta: `${convertToBengali(teachersCount)} জন তালিকাভুক্ত`,
      icon: 'fas fa-chalkboard-teacher',
      tone: 'ic-teal',
      src: '/admin-teachers.php?embed=1',
    },
    {
      id: 'routine',
      label: 'ক্লাস রুটিন',
      meta: `${convertToBengali((portal.routines || []).length)}টি সারি`,
      icon: 'fas fa-clock',
      tone: 'ic-slate',
      src: '/admin-academic.php?embed=1&section=routines&single=1',
    },
    {
      id: 'syllabus',
      label: 'সিলেবাস',
      meta: `${convertToBengali((portal.syllabus || []).length)}টি শ্রেণি`,
      icon: 'fas fa-book-open',
      tone: 'ic-green',
      src: '/admin-academic.php?embed=1&section=syllabus&single=1',
    },
    {
      id: 'fees',
      label: 'বেতন ও ফি কাঠামো',
      meta: `${convertToBengali((portal.fees || []).length)}টি খাত`,
      icon: 'fas fa-wallet',
      tone: 'ic-amber',
      src: '/admin-academic.php?embed=1&section=fees&single=1',
    },
    {
      id: 'registrations',
      label: 'বোর্ড রেজিস্ট্রেশন',
      meta: `${convertToBengali((portal.registrations || []).length)}টি কার্যক্রম`,
      icon: 'fas fa-clipboard-check',
      tone: 'ic-blue',
      src: '/admin-academic.php?embed=1&section=registrations&single=1',
    },
    {
      id: 'student-stats',
      label: 'ছাত্র-ছাত্রী সংখ্যা',
      meta: `${convertToBengali((portal.studentStats || []).length)}টি স্তর`,
      icon: 'fas fa-chart-bar',
      tone: 'ic-indigo',
      src: '/admin-academic.php?embed=1&section=studentStats&single=1',
    },
    {
      id: 'accounting-entry',
      label: 'দৈনিক হিসাব এন্ট্রি',
      meta: 'প্রতিদিনের আয় ও ব্যয়',
      icon: 'fas fa-coins',
      tone: 'ic-teal',
      src: '/accounting_entry.php?embed=1',
    },
    {
      id: 'accounting-report',
      label: 'আর্থিক স্মার্ট রিপোর্ট',
      meta: 'মাসিক ও বার্ষিক সারসংক্ষেপ',
      icon: 'fas fa-chart-pie',
      tone: 'ic-slate',
      src: '/accounting_report.php?embed=1',
    },
    {
      id: 'student-search',
      label: 'শিক্ষার্থী অনুসন্ধান',
      meta: 'প্রোফাইল ও A4 প্রিন্ট',
      icon: 'fas fa-search',
      tone: 'ic-green',
      src: '/student-search.php?embed=1',
    },
  ];

  const requestedFeature = req.query.feature ? String(req.query.feature) : '';
  const activeFeature = modules.find((m) => m.id === requestedFeature) ? requestedFeature : '';

  res.render('dashboard', {
    institutionName,
    modules,
    activeFeature,
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
    pageTitle: 'এক্সেল ও A4 ডকুমেন্ট স্টুডিও - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা',
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
      const store = loadExcelStore();
      const now = new Date().toISOString();

      if (target === 'students') {
        const parsed = parseExcelBuffer(req.file.buffer, req.file.originalname || '');
        store.students = {
          columns: parsed.columns,
          mapping: autoDetectStudentMapping(parsed.columns),
          rows: parsed.rows,
          updatedAt: now,
        };
        saveExcelStore(store);
        return res.json({
          message: `শিক্ষার্থী ফাইল সফলভাবে আপলোড হয়েছে (${convertToBengali(parsed.rows.length)}টি সারি, ${convertToBengali(parsed.columns.length)}টি কলাম)।`,
          state: serializeExcelState(store),
        });
      }

      if (target === 'documents') {
        const parsed = parseExcelBuffer(req.file.buffer, req.file.originalname || '');
        store.documents = {
          title: String(req.body.title || parsed.sheetName || 'সকল ডকুমেন্টস ডেটা শিট'),
          columns: parsed.columns,
          mapping: autoDetectStudentMapping(parsed.columns),
          rows: parsed.rows,
          updatedAt: now,
        };
        saveExcelStore(store);
        return res.json({
          message: `ডকুমেন্টস ফাইল সফলভাবে আপলোড হয়েছে (${convertToBengali(parsed.rows.length)}টি সারি, ${convertToBengali(parsed.columns.length)}টি কলাম)।`,
          state: serializeExcelState(store),
        });
      }

      if (target === 'results') {
        const workbook = parseExcelWorkbook(req.file.buffer, req.file.originalname || '');
        const fallbackExamId = String(req.body.examId || store.results.activeExamId || '');
        const fallbackExisting = store.results.exams[fallbackExamId] || {};
        const reqClassId = String(req.body.classId ?? '');
        const reqClassName = String(req.body.className ?? '');
        const reqExamName = String(req.body.examName || fallbackExisting.examName || 'বার্ষিক পরীক্ষা');
        const reqYear = String(req.body.year || fallbackExisting.year || '২০২৬');
        const passPercent = Number(req.body.passPercent || fallbackExisting.passPercent || 33);
        const maxPromoteFail = Number(req.body.maxPromoteFail ?? fallbackExisting.maxPromoteFail ?? 0);
        const promotionLabel = String(req.body.promotionLabel || fallbackExisting.promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড');

        const validSheets = workbook.sheets.filter((sh) => {
          const cols = detectResultColumns(sh.columns, sh.subRowFullMarks, sh.rows);
          const hasSub = cols.some((c) => c.isSubject);
          return sh.rows.length > 0 && hasSub;
        });

        const sheetsToImport = validSheets.length > 0 ? validSheets : [workbook.sheets[0]];
        const isMultiSheet = sheetsToImport.length > 1;
        const importedExams = [];
        const skippedSheets = workbook.sheets
          .filter((sh) => !sheetsToImport.includes(sh))
          .map((sh) => sh.sheetName);

        for (let idx = 0; idx < sheetsToImport.length; idx++) {
          const sh = sheetsToImport[idx];
          const detectedCols = detectResultColumns(sh.columns, sh.subRowFullMarks, sh.rows);
          const mappingGuess = autoDetectStudentMapping(sh.columns);

          let classId = sh.classInfo?.key || '';
          let className = sh.classInfo?.label || '';
          if (!classId && !isMultiSheet && reqClassId) {
            classId = reqClassId;
            className = reqClassName || classMap[classId]?.name || sh.sheetName;
          } else if (!classId) {
            const fallbackSlug = sh.sheetName.trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_') || `sheet_${idx + 1}`;
            const resolvedFallback = resolveSheetClassInfo(sh.sheetName);
            classId = resolvedFallback.key || `custom_${fallbackSlug}`;
            className = resolvedFallback.label || sh.sheetName;
          } else if (!className) {
            className = classMap[classId]?.name || sh.sheetName;
          }

          let examId = '';
          if (!isMultiSheet && fallbackExamId && (fallbackExisting.classId === classId || !sh.classInfo?.key || (fallbackExisting.rows || []).length === 0)) {
            examId = fallbackExamId;
          } else {
            const matchingExisting = Object.values(store.results.exams).find(
              (ex) => String(ex.classId) === String(classId)
            );
            examId = matchingExisting
              ? matchingExisting.id
              : `exam_class_${String(classId).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            // Avoid collisions when two sheets in same workbook map to the same classId
            if (importedExams.some((ie) => ie.id === examId)) {
              examId = `${examId}_${idx + 1}`;
            }
          }

          const existing = store.results.exams[examId] || {};
          const examName = sh.detectedExamName || reqExamName;
          const year = sh.detectedYear || reqYear;
          const subjectCount = detectedCols.filter((c) => c.isSubject).length;

          store.results.exams[examId] = {
            id: examId,
            title: `${examName} - ${className} শ্রেণি`,
            classId,
            className,
            examName,
            year,
            passPercent: Number(existing.passPercent || passPercent || 33),
            maxPromoteFail: Number(existing.maxPromoteFail ?? maxPromoteFail ?? 0),
            promotionLabel: String(existing.promotionLabel || promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড'),
            columns: detectedCols,
            mapping: {
              roll: mappingGuess.roll || (sh.columns[0]?.key || ''),
              name: mappingGuess.name_bn || (sh.columns[1]?.key || ''),
              father: mappingGuess.father_bn || '',
              id: mappingGuess.id || '',
            },
            rows: sh.rows,
            updatedAt: now,
          };

          importedExams.push({
            id: examId,
            sheetName: sh.sheetName,
            classId,
            className,
            rowCount: sh.rows.length,
            subjectCount,
          });
        }

        if (importedExams.length > 0) {
          store.results.activeExamId = importedExams[0].id;
        }

        saveExcelStore(store);
        const summaryText = importedExams
          .map((e) => `${e.className} (${convertToBengali(e.rowCount)} জন, ${convertToBengali(e.subjectCount)} বিষয়)`)
          .join(', ');
        const msg = importedExams.length > 1
          ? `সফলভাবে ${convertToBengali(importedExams.length)}টি শ্রেণির রেজাল্ট শিট আপলোড হয়েছে: ${summaryText}`
          : `রেজাল্ট শিট সফলভাবে আপলোড হয়েছে: ${summaryText}`;

        return res.json({
          message: msg,
          importedExams,
          skippedSheets,
          state: serializeExcelState(store),
        });
      }

      return res.status(400).json({ error: 'অবৈধ টার্গেট শিট।' });
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
  const className = String(req.body.className || classMap[classId]?.name || 'নতুন শ্রেণি');
  const examName = String(req.body.examName || 'বার্ষিক পরীক্ষা');
  const year = String(req.body.year || '২০২৬');

  store.results.exams[examId] = {
    id: examId,
    title: String(req.body.title || `${examName} - ${className} শ্রেণি`),
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
    mapping: { roll: 'roll', name: 'name', father: 'father', id: '' },
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
  if (keys.length <= 1) {
    return res.status(400).json({ error: 'সর্বনিম্ন একটি রেজাল্ট শিট থাকা প্রয়োজন।' });
  }
  delete store.results.exams[examId];
  if (store.results.activeExamId === examId) {
    store.results.activeExamId = Object.keys(store.results.exams)[0];
  }
  saveExcelStore(store);
  res.json({ message: 'রেজাল্ট শিট মুছে ফেলা হয়েছে।', state: serializeExcelState(store) });
});

app.get('/api/excel/template/:type', requireAdminApi, (req, res) => {
  const type = String(req.params.type || 'students');
  if (type === 'results-multi') {
    const buffer = buildMultiSheetExcelBuffer([
      {
        sheetName: 'ষষ্ঠ',
        aoa: [
          ['নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা - বার্ষিক পরীক্ষা ২০২৬ (ষষ্ঠ শ্রেণি)'],
          ['রোল', 'শিক্ষার্থীর নাম', 'পিতার নাম', 'কুরআন মাজিদ (100)', 'আরবি (100)', 'বাংলা (100)', 'ইংরেজি (100)', 'গণিত (100)', 'আইসিটি (50)'],
          ['1', 'মোঃ আব্দুল্লাহ আল মামুন', 'মোঃ আব্দুর রহমান', '88', '84', '81', '78', '92', '46'],
          ['2', 'মোছাঃ ফাতিমা তুজ জোহরা', 'মোঃ জাকারিয়া হোসেন', '76', '72', '75', '28', '69', '41'],
          ['3', 'মোঃ তানভীর আহমেদ', 'মোঃ সাইফুল ইসলাম', '64', '58', '55', '49', '70', '35'],
        ],
      },
      {
        sheetName: 'সপ্তম',
        aoa: [
          ['বার্ষিক পরীক্ষা ২০২৬ - সপ্তম শ্রেণি'],
          ['ক্রম', 'রোল', 'শিক্ষার্থীর নাম', 'পিতার নাম', 'কুরআন মাজিদ', 'আরবি ১ম', 'বাংলা', 'ইংরেজি', 'আইসিটি'],
          ['', 'পূর্ণমান', '', '', '100', '100', '100', '100', '50'],
          ['1', '1', 'মোঃ হাসানুল ইসলাম', 'মোঃ শরিফুল ইসলাম', '85', '80', '74', '71', '45'],
          ['2', '2', 'মোছাঃ মারিয়াম আক্তার', 'মোঃ আনিছুর রহমান', '90', '88', '82', '79', '48'],
        ],
      },
      {
        sheetName: 'অষ্টম',
        aoa: [
          ['রোল', 'শিক্ষার্থীর নাম', 'পিতার নাম', 'কুরআন [100]', 'আরবি [100]', 'বাংলা [100]', 'ইংরেজি [100]', 'গণিত [100]', 'মোট', 'GPA', 'মন্তব্য'],
          ['1', 'মোঃ নাইমুর রহমান', 'মোঃ ওসমান আলী', '82', '79', '75', '70', '86', '392', '4.60', 'উত্তীর্ণ'],
          ['2', 'মোছাঃ সাবিহা সুলতানা', 'মোঃ আমিরুল ইসলাম', '91', '85', '84', '81', '89', '430', '5.00', 'উত্তীর্ণ'],
        ],
      },
    ]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="multi-class-results-template.xlsx"');
    return res.send(buffer);
  }

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

app.post('/api/export/word', async (req, res) => {
  try {
    const html = String(req.body?.html || '');
    if (!html.trim()) {
      return res.status(400).send('ডকুমেন্টের কোনো কন্টেন্ট পাওয়া যায়নি।');
    }
    const title = String(req.body?.title || 'Document');
    let marginMm = [14, 14, 14, 14];
    if (req.body?.marginMm) {
      try {
        const parsedMargin = JSON.parse(String(req.body.marginMm));
        if (Array.isArray(parsedMargin) && parsedMargin.length === 4) {
          marginMm = parsedMargin.map((n) => Number(n) || 14);
        }
      } catch {
        // ignore invalid margin JSON
      }
    }
    const safeFilename = String(req.body?.filename || 'document.docx')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/\.docx?$/i, '') + '.docx';
    const docxBuffer = await generateDocxFromHtml({ html, title, marginMm });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', String(docxBuffer.length));
    res.send(docxBuffer);
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
          father: found.father || unified?.father_bn || '',
          mother: unified?.mother_bn || '',
          id: found.studentId || unified?.id || '',
          roll: found.roll,
          subs: found.subjects.map((s) => ({
            name: s.name,
            fm: s.fullMarks,
            obtained: s.obtained,
            display_avg: s.numericMark,
            sum: s.numericMark,
            is_fail: s.isFail,
            grade: s.grade,
            gp: s.gp,
          })),
          total: found.totalObtained,
          tfm: found.totalFullMarks,
          fail: found.failCount,
          gpa: found.gpa,
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
            const headers = rows[0];
            for (const data of rows.slice(1)) {
              if (!data[0] || !String(data[0]).trim()) continue;
              if (bnToEnNumber(String(data[2] || '').trim()).toLowerCase() !== searchRollNorm) continue;

              let tm = 0;
              let tfm = 0;
              let fc = 0;
              let totalGp = 0;
              const subs = [];
              const skip = new Set();
              const cleanName = (name) => String(name).replace(/\s*[\(\[].*?[\)\]]/gu, '').trim();

              for (let i = 3; i < headers.length; i++) {
                if (skip.has(i)) continue;
                const h1 = String(headers[i] || '').trim();
                const v1 = String(data[i] || '').trim();

                if (h1.includes('+') && headers[i + 1] !== undefined) {
                  const h2 = String(headers[i + 1] || '').trim();
                  const v2 = String(data[i + 1] || '').trim();
                  const h1En = bnToEnNumber(h1);
                  const h2En = bnToEnNumber(h2);
                  const m1 = h1En.match(/\((\d+)\)/);
                  const m2 = h2En.match(/\((\d+)\)/);
                  const f1 = m1 ? parseFloat(m1[1]) : 0;
                  const f2 = m2 ? parseFloat(m2[1]) : 0;
                  const m1Val = v1 === 'ABS' || v1 === '' ? 0 : parseFloat(v1) || 0;
                  const m2Val = v2 === 'ABS' || v2 === '' ? 0 : parseFloat(v2) || 0;

                  const subjectFail = m1Val < f1 * 0.33 || m2Val < f2 * 0.33 || v1 === 'ABS' || v2 === 'ABS';
                  if (subjectFail) fc++;

                  const [lg, gp] = getGradeInfo(m1Val + m2Val, f1 + f2, subjectFail);
                  totalGp += parseFloat(gp);

                  subs.push({
                    name: `${cleanName(h1)}  ${cleanName(h2)}`,
                    fm: f1 + f2,
                    obtained: `${v1 === '' ? '০' : convertToBengali(v1)} + ${v2 === '' ? '০' : convertToBengali(v2)}`,
                    display_avg: (m1Val + m2Val) / 2,
                    sum: m1Val + m2Val,
                    is_fail: subjectFail,
                    grade: lg,
                    gp,
                  });
                  tm += m1Val + m2Val;
                  tfm += f1 + f2;
                  skip.add(i + 1);
                } else {
                  if (h1 === '' || v1 === '') continue;
                  const h1En = bnToEnNumber(h1);
                  const m = h1En.match(/\((\d+)\)/);
                  const f = m ? parseFloat(m[1]) : 0;
                  const mv = v1 === 'ABS' ? 0 : parseFloat(v1) || 0;

                  const subjectFail = mv < f * 0.33 || v1 === 'ABS';
                  if (subjectFail) fc++;

                  const [lg, gp] = getGradeInfo(mv, f, subjectFail);
                  totalGp += parseFloat(gp);

                  subs.push({
                    name: cleanName(h1),
                    fm: f,
                    obtained: convertToBengali(v1),
                    display_avg: mv,
                    sum: mv,
                    is_fail: subjectFail,
                    grade: lg,
                    gp,
                  });
                  tm += mv;
                  tfm += f;
                }
              }

              const gpaVal = fc > 0 ? 0 : Number((totalGp / Math.max(subs.length, 1)).toFixed(2));
              studentResult = {
                name: data[0],
                roll: data[2],
                subs,
                total: tm,
                tfm,
                fail: fc,
                gpa: gpaVal,
                meritRank: null,
                status: fc > 0 ? 'Failed' : 'Passed',
                statusBn: fc > 0 ? 'অকৃতকার্য (Failed)' : 'উত্তীর্ণ (Passed)',
                isPromoted: false,
                examName: 'বার্ষিক পরীক্ষা',
                year: '২০২৬',
              };
              break;
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
