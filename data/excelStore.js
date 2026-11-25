import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { bnToEnNumber, convertToBengali, getGradeInfo } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'excel-store.json');

function createDefaultStore() {
  return {
    students: {
      columns: [
        { key: 'roll', label: 'রোল' },
        { key: 'id', label: 'আইডি' },
        { key: 'name_bn', label: 'নাম (বাংলা)' },
        { key: 'name_en', label: 'নাম (ইংরেজি)' },
        { key: 'class_name', label: 'শ্রেণি' },
        { key: 'father_bn', label: 'পিতার নাম' },
        { key: 'mother_bn', label: 'মাতার নাম' },
        { key: 'dob', label: 'জন্ম তারিখ' },
        { key: 'mobile', label: 'মোবাইল' },
        { key: 'address', label: 'ঠিকানা' },
      ],
      mapping: {
        roll: 'roll',
        id: 'id',
        name_bn: 'name_bn',
        name_en: 'name_en',
        class_name: 'class_name',
        father_bn: 'father_bn',
        mother_bn: 'mother_bn',
        dob: 'dob',
        mobile: 'mobile',
        address: 'address',
      },
      rows: [],
      updatedAt: null,
    },
    results: {
      activeExamId: 'exam_class_6',
      exams: {
        exam_class_6: {
          id: 'exam_class_6',
          title: 'বার্ষিক পরীক্ষা - ষষ্ঠ শ্রেণি',
          classId: '6',
          className: 'ষষ্ঠ',
          examName: 'বার্ষিক পরীক্ষা',
          year: '২০২৬',
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
          mapping: {
            roll: 'roll',
            name: 'name',
            father: 'father',
            id: '',
          },
          rows: [],
          updatedAt: null,
        },
      },
    },
    documents: {
      title: 'সকল ডকুমেন্টস ডেটা শিট',
      columns: [
        { key: 'roll', label: 'রোল' },
        { key: 'reg_no', label: 'রেজিস্ট্রেশন নং' },
        { key: 'name_bn', label: 'শিক্ষার্থীর নাম' },
        { key: 'father_bn', label: 'পিতার নাম' },
        { key: 'mother_bn', label: 'মাতার নাম' },
        { key: 'class_name', label: 'শ্রেণি' },
        { key: 'session', label: 'শিক্ষাবর্ষ' },
        { key: 'dob', label: 'জন্ম তারিখ' },
        { key: 'gpa', label: 'জিপিএ' },
        { key: 'remark', label: 'মন্তব্য' },
      ],
      mapping: {
        roll: 'roll',
        reg_no: 'reg_no',
        name_bn: 'name_bn',
        father_bn: 'father_bn',
        mother_bn: 'mother_bn',
        class_name: 'class_name',
        session: 'session',
        dob: 'dob',
        gpa: 'gpa',
        remark: 'remark',
      },
      rows: [],
      updatedAt: null,
    },
  };
}

let memoryStore = null;

export function loadExcelStore() {
  if (memoryStore) return memoryStore;
  try {
    if (fs.existsSync(STORE_PATH)) {
      const raw = fs.readFileSync(STORE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      memoryStore = {
        ...createDefaultStore(),
        ...parsed,
      };
      return memoryStore;
    }
  } catch (err) {
    console.warn('Could not read excel-store.json, initializing fresh store:', err.message);
  }
  memoryStore = createDefaultStore();
  return memoryStore;
}

export function saveExcelStore(store) {
  memoryStore = store;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
  } catch (err) {
    console.warn('Failed to persist excel-store.json:', err.message);
  }
  return memoryStore;
}

function makeColumnKey(label, index, usedKeys) {
  const base = String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 28) || `col_${index + 1}`;
  let key = base;
  let n = 2;
  while (usedKeys.has(key)) {
    key = `${base}_${n++}`;
  }
  usedKeys.add(key);
  return key;
}

function decodeTextBuffer(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.slice(2).toString('utf16le');
  }
  if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
    const swapped = Buffer.allocUnsafe(buffer.length - 2);
    for (let i = 2; i + 1 < buffer.length; i += 2) {
      swapped[i - 2] = buffer[i + 1];
      swapped[i - 1] = buffer[i];
    }
    return swapped.toString('utf16le');
  }
  let text = buffer.toString('utf8');
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

function isBinarySpreadsheetBuffer(buffer, filename = '') {
  if (!buffer || buffer.length < 4) return false;
  // ZIP (.xlsx, .xlsm, .ods) starts with PK\x03\x04
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return true;
  }
  // Legacy OLE2 (.xls) starts with D0 CF 11 E0
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    return true;
  }
  const ext = String(filename || '').toLowerCase();
  if (ext.endsWith('.csv') || ext.endsWith('.tsv') || ext.endsWith('.txt')) {
    return false;
  }
  return false;
}

function findHeaderRowIndex(nonEmptyRows) {
  if (nonEmptyRows.length <= 1) return 0;
  const countFilled = (row) => row.filter((c) => String(c ?? '').trim() !== '').length;
  const maxCheck = Math.min(8, nonEmptyRows.length - 1);
  const firstCount = countFilled(nonEmptyRows[0]);
  const headerKeywords = /রোল|নাম|roll|name|id|আইডি|শ্রেণি|class|subject|বিষয়|পিতা|father|reg|gpa/i;

  if (firstCount <= 1) {
    for (let i = 1; i <= maxCheck; i++) {
      if (countFilled(nonEmptyRows[i]) >= 2) {
        return i;
      }
    }
  }

  // Also check if row 0 has far fewer columns than a multi-column header row right below it
  let bestIdx = 0;
  let bestScore = firstCount + (nonEmptyRows[0].some((c) => headerKeywords.test(String(c || ''))) ? 3 : 0);
  for (let i = 1; i <= Math.min(4, nonEmptyRows.length - 1); i++) {
    const filled = countFilled(nonEmptyRows[i]);
    const kwBonus = nonEmptyRows[i].some((c) => headerKeywords.test(String(c || ''))) ? 3 : 0;
    const score = filled + kwBonus;
    if (filled >= 3 && firstCount <= 2 && score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

export function parseExcelBuffer(buffer, filename = '') {
  if (!buffer || buffer.length === 0) {
    throw new Error('আপলোডকৃত ফাইলটি খালি।');
  }

  let wb;
  if (isBinarySpreadsheetBuffer(buffer, filename)) {
    wb = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  } else {
    const text = decodeTextBuffer(buffer);
    wb = XLSX.read(text, { type: 'string', cellDates: false });
  }

  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new Error('এক্সেল ফাইলে কোনো শিট পাওয়া যায়নি।');
  }
  const ws = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });

  // Trim completely empty rows
  const nonEmpty = matrix.filter(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  );

  if (nonEmpty.length === 0) {
    throw new Error('এক্সেল শিটে কোনো তথ্য পাওয়া যায়নি।');
  }

  const headerIdx = findHeaderRowIndex(nonEmpty);
  const headerRow = nonEmpty[headerIdx];
  const dataSlice = nonEmpty.slice(headerIdx + 1);

  // Determine rightmost column index that actually contains any non-empty cell
  let lastUsedCol = -1;
  for (const r of [headerRow, ...dataSlice]) {
    for (let c = r.length - 1; c > lastUsedCol; c--) {
      if (String(r[c] ?? '').trim() !== '') {
        lastUsedCol = c;
        break;
      }
    }
  }
  const maxCols = Math.max(1, lastUsedCol + 1);

  const usedKeys = new Set();
  const columns = [];

  for (let i = 0; i < maxCols; i++) {
    const rawLabel = String(headerRow[i] ?? '').trim();
    const label = rawLabel || `কলাম ${i + 1}`;
    const key = makeColumnKey(label, i, usedKeys);
    columns.push({ key, label });
  }

  const rows = dataSlice.map((r, rowIdx) => {
    const obj = { _id: `row_${Date.now()}_${rowIdx}` };
    columns.forEach((col, colIdx) => {
      obj[col.key] = String(r[colIdx] ?? '').trim();
    });
    return obj;
  });

  return { sheetName, columns, rows };
}

export function autoDetectStudentMapping(columns) {
  const nonMarkCols = columns.filter(
    (c) => !/\(\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*\)/.test(String(c.label || ''))
  );
  const pool = nonMarkCols.length > 0 ? nonMarkCols : columns;
  const findKey = (patterns, exclude = []) => {
    const found = pool.find((c) => {
      const text = `${c.label} ${c.key}`.toLowerCase();
      if (exclude.some((ex) => text.includes(ex))) return false;
      return patterns.some((p) => text.includes(p));
    });
    return found ? found.key : '';
  };

  return {
    roll: findKey(['রোল', 'roll']),
    id: findKey(['আইডি', 'uid', 'student id', 'student_id']),
    name_bn: findKey(['নাম (বাংলা)', 'শিক্ষার্থীর নাম', 'বাংলা নাম', 'name_bn', 'student name', 'নাম', 'name'], ['পিতা', 'মাতা', 'father', 'mother', 'ইংরেজি', 'english']),
    name_en: findKey(['নাম (ইংরেজি)', 'english name', 'name_en']),
    class_name: findKey(['শ্রেণি', 'শ্রেণী', 'class']),
    father_bn: findKey(['পিতা', 'বাবা', 'father']),
    mother_bn: findKey(['মাতা', 'মা', 'mother']),
    dob: findKey(['জন্ম তারিখ', 'dob', 'birth']),
    reg_no: findKey(['রেজিস্ট্রেশন', 'রেজি নং', 'নিবন্ধন', 'reg_no', 'registration'], ['ইংরেজি']),
    session: findKey(['শিক্ষাবর্ষ', 'সেশন', 'session', 'year']),
    mobile: findKey(['মোবাইল', 'ফোন', 'mobile', 'phone']),
    address: findKey(['ঠিকানা', 'গ্রাম', 'address', 'village']),
    blood: findKey(['রক্ত', 'blood']),
    photo: findKey(['ছবি', 'photo', 'image', 'pic']),
    gpa: findKey(['gpa', 'জিপিএ']),
    remark: findKey(['মন্তব্য', 'remark', 'character']),
  };
}

export function extractFullMarksFromLabel(label) {
  const normalized = bnToEnNumber(String(label || ''));
  const match = normalized.match(/\((\d+(?:\.\d+)?)\)/);
  if (match) return parseFloat(match[1]);
  return 100;
}

export function detectResultColumns(columns) {
  const exactInfoWords = new Set([
    'roll', 'রোল', 'রোল নং', 'রোল নম্বর',
    'name', 'নাম', 'শিক্ষার্থীর নাম', 'নাম (বাংলা)', 'নাম (ইংরেজি)', 'student name',
    'id', 'আইডি', 'স্টুডেন্ট আইডি', 'student id', 'uid',
    'father', 'পিতা', 'পিতার নাম', 'father name',
    'mother', 'মাতা', 'মাতার নাম', 'mother name',
    'class', 'শ্রেণি', 'শ্রেণী', 'section', 'শাখা',
    'mobile', 'মোবাইল', 'ফোন', 'phone',
    'reg', 'reg no', 'registration', 'রেজি', 'রেজি নং', 'রেজিস্ট্রেশন', 'রেজিস্ট্রেশন নং',
  ]);
  return columns.map((col) => {
    const cleanLower = cleanSubjectTitle(col.label).toLowerCase();
    const keyLower = String(col.key || '').toLowerCase();
    const hasMarksInParens = /\(\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*\)/.test(String(col.label || ''));
    const isInfo = !hasMarksInParens && (
      exactInfoWords.has(cleanLower) ||
      exactInfoWords.has(keyLower) ||
      cleanLower.includes('পিতার নাম') ||
      cleanLower.includes('মাতার নাম') ||
      cleanLower.includes('শিক্ষার্থীর নাম') ||
      cleanLower.includes('রোল') ||
      cleanLower.includes('রেজিস্ট্রেশন') ||
      cleanLower.includes('মোবাইল') ||
      /(?:^|\b)(roll|name|father|mother|class|section|mobile|phone|reg_no|registration)(?:\b|$)/i.test(cleanLower)
    );
    const fullMarks = isInfo ? 0 : extractFullMarksFromLabel(col.label);
    return {
      key: col.key,
      label: col.label,
      isSubject: !isInfo,
      fullMarks: fullMarks > 0 ? fullMarks : 100,
    };
  });
}

export function cleanSubjectTitle(label) {
  return String(label || '').replace(/\s*\([^)]*\)/g, '').trim();
}

export function computeResultSheet(exam) {
  const passPercent = Number(exam.passPercent) > 0 ? Number(exam.passPercent) : 33;
  const maxPromoteFail = Number(exam.maxPromoteFail) || 0;
  const promotionLabel = String(exam.promotionLabel || 'বিশেষ বিবেচনায় প্রমোটেড');
  const columns = Array.isArray(exam.columns) ? exam.columns : [];
  const subjectCols = columns.filter((c) => c.isSubject);
  const mapping = exam.mapping || {};
  const rows = Array.isArray(exam.rows) ? exam.rows : [];

  const evaluated = rows.map((row, idx) => {
    const roll = mapping.roll ? String(row[mapping.roll] ?? '').trim() : String(idx + 1);
    const name = mapping.name ? String(row[mapping.name] ?? '').trim() : '';
    const father = mapping.father ? String(row[mapping.father] ?? '').trim() : '';
    const studentId = mapping.id ? String(row[mapping.id] ?? '').trim() : '';

    let totalObtained = 0;
    let totalFullMarks = 0;
    let failCount = 0;
    let absentSubjects = 0;
    let totalGp = 0;
    const failedSubjects = [];
    const subjects = [];

    for (const sub of subjectCols) {
      const fm = Number(sub.fullMarks) > 0 ? Number(sub.fullMarks) : 100;
      const rawVal = String(row[sub.key] ?? '').trim();
      const upper = rawVal.toUpperCase();
      const isAbsent = upper === 'A' || upper === 'ABS' || upper === 'ABSENT' || rawVal === 'অনুপস্থিত';

      let mark = 0;
      let isFail = false;

      if (isAbsent) {
        absentSubjects++;
        isFail = true;
      } else if (rawVal !== '') {
        const parsed = parseFloat(bnToEnNumber(rawVal));
        mark = Number.isNaN(parsed) ? 0 : parsed;
        if (mark < fm * (passPercent / 100)) {
          isFail = true;
        }
      } else {
        // Blank treated as 0 / fail if subject exists
        isFail = true;
      }

      if (isFail) {
        failCount++;
        failedSubjects.push(cleanSubjectTitle(sub.label));
      }

      const [lg, gp] = getGradeInfo(mark, fm, isFail);
      totalObtained += mark;
      totalFullMarks += fm;
      totalGp += parseFloat(gp);

      subjects.push({
        key: sub.key,
        name: cleanSubjectTitle(sub.label),
        fullMarks: fm,
        rawVal,
        obtained: isAbsent ? 'অনুপস্থিত' : convertToBengali(mark),
        numericMark: mark,
        isAbsent,
        isFail,
        grade: lg,
        gp,
      });
    }

    const allAbsent = subjectCols.length > 0 && absentSubjects === subjectCols.length;
    const percentage = totalFullMarks > 0 ? (totalObtained / totalFullMarks) * 100 : 0;
    const rawGpa = subjectCols.length > 0 ? totalGp / subjectCols.length : 0;
    const gpa = failCount === 0 && subjectCols.length > 0 ? rawGpa : 0;

    const manualPromoted = row._promoted === true;
    const manualDemoted = row._promoted === false;
    const autoPromoted = !manualDemoted && maxPromoteFail > 0 && failCount > 0 && failCount <= maxPromoteFail && !allAbsent;
    const isPromoted = failCount > 0 && !allAbsent && (manualPromoted || autoPromoted);

    let status = 'Passed';
    let statusBn = 'উত্তীর্ণ';
    if (allAbsent) {
      status = 'Absent';
      statusBn = 'অনুপস্থিত';
    } else if (isPromoted) {
      status = 'Promoted';
      statusBn = row._promotionNote || promotionLabel;
    } else if (failCount > 0) {
      status = 'Failed';
      statusBn = 'অকৃতকার্য';
    }

    return {
      _id: row._id || `r_${idx}`,
      raw: row,
      roll,
      name,
      father,
      studentId,
      subjects,
      totalObtained: Math.round(totalObtained * 100) / 100,
      totalFullMarks,
      percentage: Math.round(percentage * 100) / 100,
      failCount,
      failedSubjects,
      allAbsent,
      gpa: Number(gpa.toFixed(2)),
      rawGpa: Number(rawGpa.toFixed(2)),
      isPromoted,
      promotionNote: row._promotionNote || promotionLabel,
      status,
      statusBn,
    };
  });

  // Merit ranking: Passed -> Promoted -> Failed -> Absent
  const rankOrder = { Passed: 0, Promoted: 1, Failed: 2, Absent: 3 };
  const meritList = evaluated
    .slice()
    .sort((a, b) => {
      if (rankOrder[a.status] !== rankOrder[b.status]) {
        return rankOrder[a.status] - rankOrder[b.status];
      }
      if (a.status === 'Passed') {
        if (b.gpa !== a.gpa) return b.gpa - a.gpa;
        return b.totalObtained - a.totalObtained;
      }
      if (a.failCount !== b.failCount) return a.failCount - b.failCount;
      return b.totalObtained - a.totalObtained;
    })
    .map((item, idx) => ({
      ...item,
      meritRank: item.status === 'Absent' ? null : idx + 1,
    }));

  // Map merit rank back to evaluatedRows
  const rankById = new Map(meritList.map((m) => [m._id, m.meritRank]));
  const evaluatedRows = evaluated.map((item) => ({
    ...item,
    meritRank: rankById.get(item._id) ?? null,
  }));

  const total = evaluatedRows.length;
  const passed = evaluatedRows.filter((r) => r.status === 'Passed').length;
  const promoted = evaluatedRows.filter((r) => r.status === 'Promoted').length;
  const failed = evaluatedRows.filter((r) => r.status === 'Failed').length;
  const absent = evaluatedRows.filter((r) => r.status === 'Absent').length;

  return {
    evaluatedRows,
    meritList,
    stats: {
      total,
      passed,
      promoted,
      failed,
      absent,
      passRate: total > 0 ? Math.round(((passed + promoted) / total) * 1000) / 10 : 0,
    },
  };
}

export function buildExcelBuffer(headers, dataRows, sheetName = 'Sheet1') {
  const aoa = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
