import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { bnToEnNumber, classMap, convertToBengali, getGradeInfo } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_ROOT = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : __dirname;
const STORE_PATH = path.join(DATA_ROOT, 'excel-store.json');

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
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
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

const CLASS_MATCHERS = [
  { key: '0', label: 'শিশু', aliases: ['0', 'শিশু', 'nursery', 'play', 'kg', 'shishu'] },
  { key: '1', label: 'প্রথম', aliases: ['1', '১', '১ম', 'প্রথম', '1st', 'one', 'first'] },
  { key: '2', label: 'দ্বিতীয়', aliases: ['2', '২', '২য়', '২য়', 'দ্বিতীয়', 'দ্বিতীয়', '2nd', 'two', 'second'] },
  { key: '3', label: 'তৃতীয়', aliases: ['3', '৩', '৩য়', '৩য়', 'তৃতীয়', 'তৃতীয়', '3rd', 'three', 'third'] },
  { key: '4', label: 'চতুর্থ', aliases: ['4', '৪', '৪র্থ', 'চতুর্থ', '4th', 'four', 'fourth'] },
  { key: '5', label: 'পঞ্চম', aliases: ['5', '৫', '৫ম', 'পঞ্চম', '5th', 'five', 'fifth', 'এবতেদায়ী সমাপনী', 'এবতেদায়ী'] },
  { key: '6', label: 'ষষ্ঠ', aliases: ['6', '৬', '৬ষ্ঠ', 'ষষ্ঠ', '6th', 'six', 'sixth', 'class 6', 'class-6'] },
  { key: '7', label: 'সপ্তম', aliases: ['7', '৭', '৭ম', 'সপ্তম', '7th', 'seven', 'seventh', 'class 7', 'class-7'] },
  { key: '8', label: 'অষ্টম', aliases: ['8', '৮', '৮ম', 'অষ্টম', '8th', 'eight', 'eighth', 'জেডিসি', 'jdc', 'class 8', 'class-8'] },
  { key: '9', label: 'নবম', aliases: ['9', '৯', '৯ম', 'নবম', '9th', 'nine', 'ninth', 'class 9', 'class-9'] },
  { key: '10', label: 'দশম', aliases: ['10', '১০', '১০ম', 'দশম', 'দাখিল', '10th', 'ten', 'tenth', 'dakhil', 'দাখিল (দশম)', 'class 10', 'class-10'] },
  { key: '11', label: 'আলিম ১ম বর্ষ', aliases: ['11', '১১', '১১শ', 'আলিম ১ম', 'আলিম ১ম বর্ষ', 'আলিম প্রথম বর্ষ', 'alim 1st', 'alim 1', 'alim 1st year'] },
  { key: '12', label: 'আলিম ২য় বর্ষ', aliases: ['12', '১২', '১২শ', 'আলিম ২য়', 'আলিম ২য় বর্ষ', 'আলিম ২য় বর্ষ', 'আলিম ২য়', 'আলিম দ্বিতীয় বর্ষ', 'alim 2nd', 'alim 2', 'alim 2nd year'] },
  { key: 'fazil_1', label: 'ফাজিল ১ম বর্ষ', aliases: ['ফাজিল ১ম', 'ফাজিল ১ম বর্ষ', 'fazil 1st', 'fazil 1', 'fazil 1st year'] },
  { key: 'fazil_2', label: 'ফাজিল ২য় বর্ষ', aliases: ['ফাজিল ২য়', 'ফাজিল ২য় বর্ষ', 'ফাজিল ২য় বর্ষ', 'fazil 2nd', 'fazil 2', 'fazil 2nd year'] },
  { key: 'fazil_3', label: 'ফাজিল ৩য় বর্ষ', aliases: ['ফাজিল ৩য়', 'ফাজিল ৩য় বর্ষ', 'ফাজিল ৩য় বর্ষ', 'fazil 3rd', 'fazil 3', 'fazil 3rd year'] },
];

export function resolveSheetClassInfo(rawText) {
  const raw = String(rawText ?? '').trim();
  if (!raw) return { key: '', label: '' };
  if (Object.prototype.hasOwnProperty.call(classMap, raw)) {
    return { key: raw, label: String(classMap[raw].name || '').trim() };
  }
  const cleaned = raw
    .replace(/শ্রেণি|শ্রেণী|class|result|ফলাফল|sheet|শিট/gi, ' ')
    .replace(/[():_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const enLower = bnToEnNumber(cleaned).toLowerCase();
  if (!enLower) return { key: '', label: '' };

  for (const entry of CLASS_MATCHERS) {
    if (entry.aliases.some((alias) => {
      const al = bnToEnNumber(alias).toLowerCase().trim();
      return enLower === al || cleaned.toLowerCase() === alias.toLowerCase();
    })) {
      return { key: entry.key, label: entry.label };
    }
  }

  for (const entry of CLASS_MATCHERS) {
    if (entry.aliases.some((alias) => {
      const al = bnToEnNumber(alias).toLowerCase().trim();
      return al.length >= 2 && (enLower.includes(al) || al.includes(enLower));
    })) {
      return { key: entry.key, label: entry.label };
    }
  }

  return { key: '', label: raw };
}

function isGenericSheetName(name) {
  return /^(sheet\s*\d+|page\s*\d+|tab\s*\d+|result\s*\d*|data|শিট\s*\d*)$/i.test(String(name || '').trim());
}

function isPureNumericCell(val) {
  const s = bnToEnNumber(String(val ?? '').trim());
  return /^\d+(?:\.\d+)?$/.test(s);
}

function findHeaderRowIndex(nonEmptyRows) {
  if (nonEmptyRows.length <= 1) return 0;
  const maxCheck = Math.min(15, nonEmptyRows.length - 1);
  const strongInfoKw = /^(?:ক্রমিক|ক্রম|sl|serial|রোল|roll|আইডি|id|নাম|name|শিক্ষার্থীর নাম|পিতা|father|মাতা|mother|শ্রেণি|শ্রেণী|class)$/i;
  const headerKeywords = /রোল|নাম|roll|name|id|আইডি|শ্রেণি|শ্রেণী|class|subject|বিষয়|বিষয়|পিতা|father|মাতা|mother|reg|gpa|কুরআন|আরবি|বাংলা|ইংরেজি|গণিত|মোট|total|মেধা|merit/i;
  const fullMarkRowKw = /^(?:পূর্ণমান|full\s*marks?|fm|max\s*marks?|সর্বোচ্চ)$/i;

  let bestIdx = 0;
  let bestScore = -999;

  for (let i = 0; i <= maxCheck; i++) {
    const row = nonEmptyRows[i];
    const cells = row.map((c) => String(c ?? '').trim()).filter(Boolean);
    const filled = cells.length;
    if (filled === 0) continue;

    // Never pick a pure "Full Marks" sub-row or a data row of numbers
    const numericCount = cells.filter((c) => isPureNumericCell(c)).length;
    const isFullMarksLabelRow = cells.some((c) => fullMarkRowKw.test(c)) && numericCount >= 2;
    if (isFullMarksLabelRow) continue;

    let kwMatches = 0;
    let strongMatches = 0;
    for (const c of cells) {
      if (headerKeywords.test(c)) kwMatches++;
      const cClean = c.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim();
      if (strongInfoKw.test(cClean)) strongMatches++;
    }

    // Data rows usually have >= 40% numeric mark columns; header rows are mostly text labels
    const numericRatio = numericCount / filled;
    const numericPenalty = numericRatio > 0.45 ? 12 : numericCount * 1.2;
    const singleCellBannerPenalty = filled <= 2 ? 6 : 0;

    const score = filled * 1.5 + kwMatches * 4 + strongMatches * 6 - numericPenalty - singleCellBannerPenalty;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function isFullMarksSubHeaderRow(row, headerRow) {
  if (!Array.isArray(row)) return false;
  const cells = row.map((c) => String(c ?? '').trim());
  const nonEmpty = cells.filter(Boolean);
  if (nonEmpty.length < 2) return false;

  const fullMarkCue = /পূর্ণমান|প\.মান|full\s*marks?|f\.?\s*m\.?|max\s*marks?|pass\s*marks?|সর্বোচ্চ/i;
  const hasExplicitCue = nonEmpty.some((c) => fullMarkCue.test(c));

  let validFullMarksCount = 0;
  let textUnderInfoCount = 0;
  let suspectStudentName = false;

  for (let c = 0; c < cells.length; c++) {
    const val = cells[c];
    if (!val) continue;
    const hVal = String(headerRow[c] ?? '').toLowerCase();
    const isNameHeader = /নাম|name|পিতা|father|মাতা|mother/.test(hVal);
    if (isPureNumericCell(val)) {
      const n = parseFloat(bnToEnNumber(val));
      // Typical full marks range (10 to 500)
      if (n >= 10 && n <= 500) {
        validFullMarksCount++;
      }
    } else if (fullMarkCue.test(val)) {
      textUnderInfoCount++;
    } else if (isNameHeader && val.length > 2) {
      // Looks like an actual student's name under "Name" column
      suspectStudentName = true;
    }
  }

  if (suspectStudentName && !hasExplicitCue) return false;
  if (hasExplicitCue && validFullMarksCount >= 1) return true;
  // Even without "পূর্ণমান" word, if Name/Roll cells are empty and >=3 subject columns have numbers like 100/50/75/25
  if (!suspectStudentName && validFullMarksCount >= 3 && textUnderInfoCount >= 0) {
    const rollOrNameHasNonMark = cells.some((val, c) => {
      const hVal = String(headerRow[c] ?? '').toLowerCase();
      return /রোল|roll|নাম|name/.test(hVal) && val !== '' && !fullMarkCue.test(val);
    });
    if (!rollOrNameHasNonMark) return true;
  }
  return false;
}

function isSummaryOrEmptyRow(rowObj, columns, mapping) {
  const vals = columns.map((c) => String(rowObj[c.key] ?? '').trim());
  if (!vals.some(Boolean)) return true;

  const nameVal = mapping?.name_bn ? String(rowObj[mapping.name_bn] ?? '').trim() : '';
  const rollVal = mapping?.roll ? String(rowObj[mapping.roll] ?? '').trim() : '';
  const summaryPattern = /^(?:মোট|সর্বমোট|গড়|গড়|পাশের হার|total|grand\s*total|average|avg|summary|signature|স্বাক্ষর|তারিখ|date)$/i;
  if (summaryPattern.test(nameVal) || summaryPattern.test(rollVal)) return true;

  // Check if first 2 filled cells are summary labels
  const firstTwo = vals.filter(Boolean).slice(0, 2);
  if (firstTwo.some((v) => summaryPattern.test(v))) return true;

  return false;
}

function parseMatrixSheet(sheetName, matrix) {
  const nonEmpty = (matrix || []).filter(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== '')
  );
  if (nonEmpty.length === 0) {
    return null;
  }

  const headerIdx = findHeaderRowIndex(nonEmpty);
  const preambleRows = nonEmpty.slice(0, headerIdx);
  const headerRow = nonEmpty[headerIdx];
  const candidateSubRow = nonEmpty[headerIdx + 1];
  const hasFullMarksSubRow = isFullMarksSubHeaderRow(candidateSubRow, headerRow);
  const dataSlice = nonEmpty.slice(headerIdx + (hasFullMarksSubRow ? 2 : 1));

  // Determine rightmost used column index across header, sub-row, and data
  let lastUsedCol = -1;
  const rowsToMeasure = hasFullMarksSubRow ? [headerRow, candidateSubRow, ...dataSlice] : [headerRow, ...dataSlice];
  for (const r of rowsToMeasure) {
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
  const subRowFullMarks = [];

  for (let i = 0; i < maxCols; i++) {
    const rawLabel = String(headerRow[i] ?? '').trim();
    const label = rawLabel || `কলাম ${i + 1}`;
    const key = makeColumnKey(label, i, usedKeys);
    columns.push({ key, label });

    let fm = 0;
    if (hasFullMarksSubRow && candidateSubRow[i] !== undefined) {
      const n = parseFloat(bnToEnNumber(String(candidateSubRow[i] ?? '').trim()));
      if (!Number.isNaN(n) && n >= 10 && n <= 500) {
        fm = n;
      }
    }
    subRowFullMarks.push(fm);
  }

  const rawRows = dataSlice.map((r, rowIdx) => {
    const obj = { _id: `row_${Date.now()}_${rowIdx}_${Math.random().toString(36).slice(2, 6)}` };
    columns.forEach((col, colIdx) => {
      obj[col.key] = String(r[colIdx] ?? '').trim();
    });
    return obj;
  });

  const mappingGuess = autoDetectStudentMapping(columns);
  const rows = rawRows.filter((r) => !isSummaryOrEmptyRow(r, columns, mappingGuess));

  // Extract preamble metadata (class, exam name, year)
  const preambleText = preambleRows.flat().map((x) => String(x || '').trim()).filter(Boolean).join(' ');
  const yearMatch = bnToEnNumber(preambleText + ' ' + sheetName).match(/\b(20\d{2})\b/);
  const detectedYear = yearMatch ? convertToBengali(yearMatch[1]) : '';
  const examMatch = (preambleText + ' ' + sheetName).match(/(অর্ধবার্ষিক পরীক্ষা|বার্ষিক পরীক্ষা|প্রাক-নির্বাচনী পরীক্ষা|নির্বাচনী পরীক্ষা|মডেল টেস্ট|Half Yearly|Annual Exam|Final Exam|Pre-Test|Test Exam)/i);
  const detectedExamName = examMatch ? examMatch[1] : '';

  let classInfo = !isGenericSheetName(sheetName) ? resolveSheetClassInfo(sheetName) : { key: '', label: '' };
  if (!classInfo.key && preambleText) {
    // Check explicit "শ্রেণি: X" or "Class: X" in preamble
    const clsExplicit = preambleText.match(/(?:শ্রেণি|শ্রেণী|class)\s*[:ঃ-]?\s*([^\s,|·/]+(?:\s+[^\s,|·/]+)?)/i);
    if (clsExplicit) {
      const resolved = resolveSheetClassInfo(clsExplicit[1]);
      if (resolved.key) classInfo = resolved;
    }
  }
  if (!classInfo.key && mappingGuess.class_name && rows.length > 0) {
    const firstClsVal = rows.map((r) => r[mappingGuess.class_name]).find(Boolean);
    if (firstClsVal) {
      classInfo = resolveSheetClassInfo(firstClsVal);
    }
  }

  return {
    sheetName,
    columns,
    rows,
    subRowFullMarks,
    hasFullMarksSubRow,
    classInfo,
    detectedYear,
    detectedExamName,
  };
}

export function parseExcelWorkbook(buffer, filename = '') {
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

  if (!wb.SheetNames || wb.SheetNames.length === 0) {
    throw new Error('এক্সেল ফাইলে কোনো শিট পাওয়া যায়নি।');
  }

  const parsedSheets = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
    const parsed = parseMatrixSheet(sheetName, matrix);
    if (parsed && parsed.rows.length > 0) {
      parsedSheets.push(parsed);
    }
  }

  if (parsedSheets.length === 0) {
    throw new Error('এক্সেল শিটে কোনো কার্যকর শিক্ষার্থী বা ফলাফলের সারি পাওয়া যায়নি।');
  }

  return {
    totalSheetCount: wb.SheetNames.length,
    sheetNames: wb.SheetNames,
    sheets: parsedSheets,
  };
}

export function parseExcelBuffer(buffer, filename = '') {
  const wbResult = parseExcelWorkbook(buffer, filename);
  return wbResult.sheets[0];
}

export function autoDetectStudentMapping(columns) {
  const nonMarkCols = columns.filter((c) => {
    const lbl = String(c.label || '');
    return !/\(\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*\)/.test(lbl) && !/\[\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*\]/.test(lbl);
  });
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
    roll: findKey(['রোল', 'roll'], ['কন্ট্রোল', 'পেরোল']),
    id: findKey(['আইডি', 'uid', 'student id', 'student_id']),
    name_bn: findKey(['নাম (বাংলা)', 'শিক্ষার্থীর নাম', 'ছাত্র/ছাত্রীর নাম', 'বাংলা নাম', 'name_bn', 'student name', 'নাম', 'name'], ['পিতা', 'মাতা', 'বাবা', 'মা', 'father', 'mother', 'ইংরেজি', 'english', 'শ্রেণি', 'শ্রেণী', 'বিষয়', 'বিষয়', 'অভিভাবক']),
    name_en: findKey(['নাম (ইংরেজি)', 'english name', 'name_en']),
    class_name: findKey(['শ্রেণি', 'শ্রেণী', 'class']),
    father_bn: findKey(['পিতার নাম', 'পিতা', 'বাবা', 'father']),
    mother_bn: findKey(['মাতার নাম', 'মাতা', 'মা', 'mother'], ['মোট', 'মন্তব্য']),
    dob: findKey(['জন্ম তারিখ', 'dob', 'birth']),
    reg_no: findKey(['রেজিস্ট্রেশন', 'রেজি নং', 'নিবন্ধন', 'reg_no', 'registration'], ['ইংরেজি']),
    session: findKey(['শিক্ষাবর্ষ', 'সেশন', 'session', 'year']),
    mobile: findKey(['মোবাইল', 'ফোন', 'mobile', 'phone']),
    address: findKey(['ঠিকানা', 'গ্রাম', 'address', 'village']),
    gpa: findKey(['gpa', 'জিপিএ']),
    remark: findKey(['মন্তব্য', 'remark', 'character']),
  };
}

export function extractFullMarksFromLabel(label) {
  const normalized = bnToEnNumber(String(label || '').trim());
  // 1) Parentheses: (100) or (FM: 50) or (পূর্ণমান 50)
  const parenMatch = normalized.match(/\([^)]*?(\d+(?:\.\d+)?)[^)]*\)/);
  if (parenMatch) {
    const n = parseFloat(parenMatch[1]);
    if (n >= 5 && n <= 500) return n;
  }
  // 2) Square brackets: [100] or [50]
  const bracketMatch = normalized.match(/\[[^\]]*?(\d+(?:\.\d+)?)[^\]]*\]/);
  if (bracketMatch) {
    const n = parseFloat(bracketMatch[1]);
    if (n >= 5 && n <= 500) return n;
  }
  // 3) Explicit FM / পূর্ণমান / Full Marks keyword
  const kwMatch = normalized.match(/(?:পূর্ণমান|full\s*marks?|f\.?\s*m\.?|max)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i);
  if (kwMatch) {
    const n = parseFloat(kwMatch[1]);
    if (n >= 5 && n <= 500) return n;
  }
  // 4) Trailing "- 100" or "/ 50" or ": 100"
  const sepMatch = normalized.match(/[-/:|]\s*(\d+(?:\.\d+)?)\s*$/);
  if (sepMatch) {
    const n = parseFloat(sepMatch[1]);
    if (n >= 10 && n <= 500) return n;
  }
  // 5) Trailing standalone number >= 20 (avoids "বাংলা ১ম" or "Paper 2")
  const trailMatch = normalized.match(/\s+(\d{2,3})\s*$/);
  if (trailMatch) {
    const n = parseFloat(trailMatch[1]);
    if (n >= 20 && n <= 500) return n;
  }
  return 100;
}

export function detectResultColumns(columns, subRowFullMarks = [], sampleRows = []) {
  const exactNonSubjectWords = new Set([
    'sl', 's.no', 'sno', 's/l', 'serial', 'serial no', 'no', '#', 'নং', 'ক্রম', 'ক্রমিক', 'ক্রমিক নং', 'ক্রমিক নম্বর',
    'roll', 'roll no', 'roll number', 'রোল', 'রোল নং', 'রোল নম্বর',
    'name', 'student name', 'নাম', 'শিক্ষার্থীর নাম', 'ছাত্র/ছাত্রীর নাম', 'নাম (বাংলা)', 'নাম (ইংরেজি)',
    'id', 'student id', 'student_id', 'uid', 'আইডি', 'স্টুডেন্ট আইডি',
    'father', 'father name', 'পিতা', 'পিতার নাম',
    'mother', 'mother name', 'মাতা', 'মাতার নাম',
    'class', 'শ্রেণি', 'শ্রেণী', 'section', 'শাখা', 'shift', 'শিফট', 'group', 'বিভাগ',
    'mobile', 'phone', 'মোবাইল', 'ফোন',
    'reg', 'reg no', 'registration', 'রেজি', 'রেজি নং', 'রেজিস্ট্রেশন', 'রেজিস্ট্রেশন নং',
    'dob', 'জন্ম তারিখ', 'address', 'ঠিকানা', 'session', 'শিক্ষাবর্ষ',
    // Computed summary / merit / grade / remark columns — NEVER treat as subject!
    'total', 'total marks', 'grand total', 'obtained', 'obtained marks', 'marks obtained', 'মোট', 'মোট নম্বর', 'মোট প্রাপ্ত নম্বর', 'সর্বমোট', 'প্রাপ্ত নম্বর',
    'full marks', 'total full marks', 'পূর্ণমান', 'মোট পূর্ণমান',
    'avg', 'average', 'গড়', 'গড়', 'percentage', 'percent', 'শতকরা', '%',
    'gpa', 'cgpa', 'gp', 'grade point', 'জিপিএ', 'জিপি', 'গ্রেড পয়েন্ট',
    'grade', 'lg', 'letter grade', 'গ্রেড', 'লেটার গ্রেড',
    'merit', 'merit rank', 'merit position', 'rank', 'position', 'মেধা', 'মেধাক্রম', 'স্থান', 'অবস্থান',
    'result', 'status', 'pass/fail', 'ফলাফল', 'অবস্থা', 'স্ট্যাটাস', 'fail', 'fail count', 'ফেল', 'ফেল বিষয়',
    'remark', 'remarks', 'comment', 'comments', 'মন্তব্য', 'attendance', 'উপস্থিতি', 'conduct', 'আচরণ',
  ]);

  const computedSummaryRegex = /^(?:মোট|সর্বমোট|প্রাপ্ত\s*নম্বর|গড়|গড়|শতকরা|জিপিএ|গ্রেড|মেধা|মেধাক্রম|ফলাফল|অবস্থা|স্ট্যাটাস|মন্তব্য|ক্রমিক|ক্রম|উপস্থিতি|total|grand\s*total|obtained|full\s*marks?|avg|average|percent(?:age)?|gpa|cgpa|grade(?:\s*point)?|letter\s*grade|lg|gp|merit(?:\s*(?:rank|position))?|rank|position|result|status|fail(?:\s*count)?|remarks?|comments?|sl\.?\s*(?:no)?|serial|attendance)/i;

  const infoFieldRegex = /(?:^|\b)(roll|name|father|mother|class|section|shift|mobile|phone|reg_no|registration|student_id|dob|address|session)(?:\b|$)/i;

  return columns.map((col, idx) => {
    const rawLabel = String(col.label || '').trim();
    const cleanLower = cleanSubjectTitle(rawLabel).toLowerCase();
    const keyLower = String(col.key || '').toLowerCase();
    const hasExplicitMarksTag = (
      /\(\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*\)/.test(rawLabel) ||
      /\[\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*\]/.test(rawLabel) ||
      (Number(subRowFullMarks[idx]) > 0)
    );

    const isAlwaysNonSubject = (
      exactNonSubjectWords.has(cleanLower) ||
      exactNonSubjectWords.has(keyLower) ||
      computedSummaryRegex.test(cleanLower)
    );

    const isInfoCol = (
      exactNonSubjectWords.has(cleanLower) ||
      cleanLower.includes('পিতার নাম') ||
      cleanLower.includes('মাতার নাম') ||
      cleanLower.includes('শিক্ষার্থীর নাম') ||
      cleanLower.includes('ক্রমিক') ||
      cleanLower.includes('রোল') ||
      cleanLower.includes('রেজিস্ট্রেশন') ||
      cleanLower.includes('মোবাইল') ||
      cleanLower.includes('ঠিকানা') ||
      cleanLower.includes('জন্ম তারিখ') ||
      infoFieldRegex.test(cleanLower)
    );

    // Unnamed blank placeholder columns with no data are also not subjects
    const isBlankPlaceholder = /^কলাম\s*\d+$/i.test(rawLabel) &&
      Array.isArray(sampleRows) &&
      sampleRows.every((r) => !String(r[col.key] ?? '').trim());

    const isSubject = !isAlwaysNonSubject && !isBlankPlaceholder && (hasExplicitMarksTag || !isInfoCol);
    const subRowFm = Number(subRowFullMarks[idx]) || 0;
    const fullMarks = isSubject ? (subRowFm > 0 ? subRowFm : extractFullMarksFromLabel(rawLabel)) : 0;

    return {
      key: col.key,
      label: rawLabel,
      isSubject,
      fullMarks: isSubject ? (fullMarks > 0 ? fullMarks : 100) : 0,
    };
  });
}

export function cleanSubjectTitle(label) {
  return String(label || '')
    .replace(/\s*\([^)]*\)/g, '')
    .replace(/\s*\[[^\]]*\]/g, '')
    .replace(/\s*(?:পূর্ণমান|full\s*marks?|fm)\s*[:=-]?\s*[0-9০-৯]+(?:\.[0-9০-৯]+)?\s*$/i, '')
    .replace(/\s*[-/:|]\s*[0-9০-৯]{2,3}\s*$/, '')
    .replace(/\s+[0-9০-৯]{2,3}\s*$/, '')
    .trim();
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

export function buildMultiSheetExcelBuffer(sheets = []) {
  const wb = XLSX.utils.book_new();
  sheets.forEach((sh, idx) => {
    const aoa = sh.aoa || [sh.headers || [], ...(sh.rows || [])];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const name = String(sh.sheetName || `Sheet${idx + 1}`).replace(/[\\/?*[\]:]/g, '').slice(0, 31) || `Sheet${idx + 1}`;
    XLSX.utils.book_append_sheet(wb, ws, name);
  });
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
