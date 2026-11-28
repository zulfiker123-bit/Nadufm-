import { classMap, bnToEnNumber, convertToBengali, formatStudentNameWithGroup, isScienceGroupText } from './seed.js';
import { computeResultSheet } from './excelStore.js';

const CLASS_ALIASES = [
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

export function sanitizeImageUrl(rawUrl) {
  const val = String(rawUrl || '').trim();
  if (!val) return '/logo.png';
  if (val.startsWith('/') && !val.startsWith('//')) return val;
  if (/^https?:\/\//i.test(val)) return val;
  if (/^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=]+$/i.test(val)) return val;
  return '/logo.png';
}

export function normalizeRollKey(raw) {
  const s = bnToEnNumber(String(raw ?? '').trim()).toLowerCase();
  if (!s) return '';
  return s.replace(/^0+(?=\d)/, '');
}

export function normalizeClassInput(raw) {
  const cleaned = String(raw ?? '')
    .replace(/শ্রেণি|শ্রেণী|class/gi, '')
    .replace(/[()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const enLower = bnToEnNumber(cleaned).toLowerCase();
  if (!cleaned) return { key: '', label: '' };

  if (Object.prototype.hasOwnProperty.call(classMap, String(raw ?? '').trim())) {
    const k = String(raw).trim();
    return { key: k, label: String(classMap[k].name || '').trim() };
  }

  for (const entry of CLASS_ALIASES) {
    if (
      entry.aliases.some((alias) => {
        const al = bnToEnNumber(alias).toLowerCase().trim();
        return enLower === al || cleaned.toLowerCase() === alias.toLowerCase();
      })
    ) {
      return { key: entry.key, label: entry.label };
    }
  }

  for (const entry of CLASS_ALIASES) {
    if (
      entry.aliases.some((alias) => {
        const al = bnToEnNumber(alias).toLowerCase().trim();
        return al.length >= 2 && (enLower.includes(al) || al.includes(enLower));
      })
    ) {
      return { key: entry.key, label: entry.label };
    }
  }

  return { key: enLower, label: cleaned };
}

function getRowField(row, mapping, candidateKeys = [], fallbackLabels = []) {
  for (const mk of candidateKeys) {
    const colKey = mapping?.[mk];
    if (colKey && row[colKey] !== undefined && String(row[colKey]).trim() !== '') {
      return String(row[colKey]).trim();
    }
  }
  for (const fb of fallbackLabels) {
    if (row[fb] !== undefined && String(row[fb]).trim() !== '') {
      return String(row[fb]).trim();
    }
  }
  return '';
}

function mergeFields(target, incoming) {
  for (const [k, v] of Object.entries(incoming)) {
    if (v === undefined || v === null || v === '') continue;
    if (k === 'photo') {
      if (!target.photo || target.photo === '/logo.png') {
        target.photo = v;
      }
      continue;
    }
    if (k === 'resultSummary') {
      if (!target.resultSummary) target.resultSummary = v;
      continue;
    }
    if (!target[k]) {
      target[k] = v;
    }
  }
}

export function getUnifiedStudents(excelStore, portalStore) {
  const byKey = new Map();

  const upsert = (record) => {
    const cls = normalizeClassInput(record.class_name || record.classKey || '');
    const rollNorm = normalizeRollKey(record.roll);
    const idNorm = String(record.id || '').trim().toLowerCase();
    const composite = rollNorm
      ? `${cls.key || 'unknown'}::${rollNorm}`
      : idNorm
        ? `id::${idNorm}`
        : `uniq::${byKey.size}`;

    const normalized = {
      roll: String(record.roll || '').trim(),
      rollBn: record.roll ? convertToBengali(record.roll) : '',
      id: String(record.id || '').trim(),
      reg_no: String(record.reg_no || '').trim(),
      name_bn: String(record.name_bn || '').trim(),
      name_en: String(record.name_en || '').trim(),
      class_name: cls.label || String(record.class_name || '').trim(),
      classKey: cls.key,
      group: String(record.group || '').trim(),
      isScience: Boolean(record.isScience || isScienceGroupText(record.group) || isScienceGroupText(record.name_bn)),
      displayName: formatStudentNameWithGroup(
        record.name_bn || record.name_en || '',
        Boolean(record.isScience || isScienceGroupText(record.group) || isScienceGroupText(record.name_bn))
      ),
      father_bn: String(record.father_bn || '').trim(),
      mother_bn: String(record.mother_bn || '').trim(),
      dob: String(record.dob || '').trim(),
      mobile: String(record.mobile || '').trim(),
      address: String(record.address || '').trim(),
      session: String(record.session || '').trim(),
      blood: String(record.blood || '').trim(),
      gpa: String(record.gpa || '').trim(),
      meritRank: record.meritRank ?? null,
      remark: String(record.remark || '').trim(),
      photo: sanitizeImageUrl(record.photo),
      source: record.source || 'students',
      resultSummary: record.resultSummary || null,
    };

    if (byKey.has(composite)) {
      mergeFields(byKey.get(composite), normalized);
    } else {
      byKey.set(composite, normalized);
    }
  };

  // 1) Students Excel sheet (primary student registry)
  const stuSheet = excelStore?.students || {};
  const sMap = stuSheet.mapping || {};
  for (const row of stuSheet.rows || []) {
    const clsRaw = getRowField(row, sMap, ['class_name'], ['class_name', 'class', 'শ্রেণি', 'শ্রেণী']);
    const rollRaw = getRowField(row, sMap, ['roll'], ['roll', 'roll_no', 'রোল']);
    const idRaw = getRowField(row, sMap, ['id', 'reg_no'], ['id', 'id_no', 'reg_no', 'আইডি']);
    const nameBn = getRowField(row, sMap, ['name_bn', 'name_en'], ['name_bn', 'name', 'নাম']);
    if (!nameBn && !rollRaw && !idRaw) continue;

    upsert({
      roll: rollRaw,
      id: idRaw,
      reg_no: getRowField(row, sMap, ['reg_no', 'id'], ['reg_no', 'রেজিস্ট্রেশন_নং']),
      name_bn: nameBn,
      name_en: getRowField(row, sMap, ['name_en'], ['name_en']),
      class_name: clsRaw,
      group: getRowField(row, sMap, ['group'], ['group', 'বিভাগ', 'গ্রুপ']),
      father_bn: getRowField(row, sMap, ['father_bn'], ['father_bn', 'father', 'পিতার_নাম']),
      mother_bn: getRowField(row, sMap, ['mother_bn'], ['mother_bn', 'mother', 'মাতার_নাম']),
      dob: getRowField(row, sMap, ['dob'], ['dob', 'জন্ম_তারিখ']),
      mobile: getRowField(row, sMap, ['mobile'], ['mobile', 'phone', 'মোবাইল']),
      address: getRowField(row, sMap, ['address'], ['address', 'ঠিকানা']),
      session: getRowField(row, sMap, ['session'], ['session', 'শিক্ষাবর্ষ']) || '২০২৫-২০২৬',
      blood: getRowField(row, sMap, ['blood'], ['blood', 'রক্তের গ্রুপ']),
      gpa: getRowField(row, sMap, ['gpa'], ['gpa']),
      remark: getRowField(row, sMap, ['remark'], ['remark']),
      photo: getRowField(row, sMap, ['photo'], ['photo', 'ছবি', 'image']),
      source: 'students',
    });
  }

  // 2) Approved Online Admissions (portalStore.admissions)
  for (const adm of portalStore?.admissions || []) {
    if (adm.status !== 'approved') continue;
    upsert({
      roll: adm.roll_no,
      id: adm.id_no || adm.id,
      reg_no: adm.birth_reg || adm.id_no || '',
      name_bn: adm.name_bn || adm.name_en,
      name_en: adm.name_en,
      class_name: adm.student_class,
      father_bn: adm.father_bn,
      mother_bn: adm.mother_bn,
      dob: adm.dob || '',
      blood: adm.blood_group || adm.blood || '',
      address: adm.address || '',
      mobile: adm.mobile,
      photo: adm.photo,
      session: adm.session || '২০২৬',
      source: 'admission',
    });
  }

  // 3) Documents Excel sheet (certificates / attestation / testimonial records)
  const docSheet = excelStore?.documents || {};
  const dMap = docSheet.mapping || {};
  for (const row of docSheet.rows || []) {
    const clsRaw = getRowField(row, dMap, ['class_name'], ['class_name', 'class']);
    const rollRaw = getRowField(row, dMap, ['roll'], ['roll']);
    const nameBn = getRowField(row, dMap, ['name_bn', 'name_en'], ['name_bn', 'name']);
    if (!nameBn && !rollRaw) continue;

    upsert({
      roll: rollRaw,
      id: getRowField(row, dMap, ['id', 'reg_no'], ['id', 'reg_no']),
      reg_no: getRowField(row, dMap, ['reg_no', 'id'], ['reg_no']),
      name_bn: nameBn,
      name_en: getRowField(row, dMap, ['name_en'], ['name_en']),
      class_name: clsRaw,
      father_bn: getRowField(row, dMap, ['father_bn'], ['father_bn']),
      mother_bn: getRowField(row, dMap, ['mother_bn'], ['mother_bn']),
      dob: getRowField(row, dMap, ['dob'], ['dob']),
      mobile: getRowField(row, dMap, ['mobile'], ['mobile']),
      address: getRowField(row, dMap, ['address'], ['address']),
      session: getRowField(row, dMap, ['session'], ['session']),
      gpa: getRowField(row, dMap, ['gpa'], ['gpa']),
      remark: getRowField(row, dMap, ['remark'], ['remark']),
      source: 'documents',
    });
  }

  // 4) Uploaded Excel Result Sheets (attach marksheets + GPA + meritRank to students; prioritize active/latest exam)
  const activeExamId = excelStore?.results?.activeExamId || '';
  const exams = Object.values(excelStore?.results?.exams || {}).slice().sort((a, b) => {
    if (a.id === activeExamId) return -1;
    if (b.id === activeExamId) return 1;
    return String(b.updatedAt || '').localeCompare(String(a.updatedAt || ''));
  });
  for (const exam of exams) {
    if (!Array.isArray(exam.rows) || exam.rows.length === 0) continue;
    const computed = computeResultSheet(exam);
    const examClassName = exam.className || (classMap[exam.classId]?.name || '');
    const examTitle = exam.title || `${exam.examName || 'বার্ষিক পরীক্ষা'} (${exam.year || '২০২৬'})`;

    for (const ev of computed.evaluatedRows) {
      upsert({
        roll: ev.roll,
        id: ev.studentId,
        name_bn: ev.name,
        class_name: examClassName || exam.classId,
        group: ev.groupLabel || '',
        isScience: ev.isScience,
        father_bn: ev.father,
        session: exam.year || '২০২৬',
        gpa: ev.gpa ? ev.gpa.toFixed(2) : '',
        meritRank: ev.meritRank,
        source: 'results',
        resultSummary: {
          examId: exam.id,
          examTitle,
          examName: exam.examName || 'বার্ষিক পরীক্ষা',
          year: exam.year || '২০২৬',
          classId: exam.classId || '',
          className: examClassName,
          isScience: ev.isScience,
          groupLabel: ev.groupLabel || 'সাধারণ',
          displayName: ev.displayName || ev.name,
          totalObtained: ev.totalObtained,
          totalFullMarks: ev.totalFullMarks,
          percentage: ev.percentage,
          failCount: ev.failCount,
          gpa: ev.gpa,
          isBoardExam: ev.isBoardExam,
          boardType: ev.boardType,
          hasOptionalSubject: ev.hasOptionalSubject,
          optionalSubjectName: ev.optionalSubjectName,
          optionalBonus: ev.optionalBonus,
          optionalFailCount: ev.optionalFailCount,
          gpaWithoutOptional: ev.gpaWithoutOptional,
          meritRank: ev.meritRank,
          status: ev.status,
          statusBn: ev.statusBn,
          isPromoted: ev.isPromoted,
          subjects: ev.subjects,
        },
      });
    }
  }

  return Array.from(byKey.values());
}

export function getClassesAndRolls(excelStore, portalStore, classParam = '') {
  const students = getUnifiedStudents(excelStore, portalStore);
  const classCounts = new Map();

  for (const st of students) {
    const key = st.classKey || st.class_name;
    if (!key) continue;
    classCounts.set(key, (classCounts.get(key) || 0) + 1);
  }

  const classes = [];
  const seenKeys = new Set();

  for (const [k, v] of Object.entries(classMap)) {
    const label = String(v.name || '').trim();
    seenKeys.add(k);
    classes.push({
      value: k,
      label: `${label} শ্রেণি`,
      shortLabel: label,
      count: classCounts.get(k) || 0,
    });
  }

  for (const st of students) {
    if (!st.classKey || seenKeys.has(st.classKey)) continue;
    seenKeys.add(st.classKey);
    const lbl = st.class_name || st.classKey;
    classes.push({
      value: st.classKey,
      label: lbl.includes('বর্ষ') || lbl.includes('শ্রেণি') ? lbl : `${lbl} শ্রেণি`,
      shortLabel: lbl,
      count: classCounts.get(st.classKey) || 0,
    });
  }

  let rolls = [];
  const rawClass = String(classParam || '').trim();
  if (rawClass) {
    if (rawClass.startsWith('excel:')) {
      const eid = rawClass.slice(6);
      const ex = excelStore?.results?.exams?.[eid];
      if (ex && Array.isArray(ex.rows)) {
        const { evaluatedRows } = computeResultSheet(ex);
        rolls = evaluatedRows
          .filter((r) => String(r.roll || '').trim() !== '')
          .map((r) => ({
            roll: r.roll,
            rollBn: convertToBengali(r.roll),
            name: r.name || 'নাম উল্লেখ নেই',
            father: r.father || '',
            id: r.studentId || '',
            className: ex.className || (classMap[ex.classId]?.name || ''),
            hasResult: true,
            source: 'results',
          }));
      }
    } else {
      const targetCls = normalizeClassInput(rawClass);
      rolls = students
        .filter((st) => {
          if (!st.roll) return false;
          if (targetCls.key && st.classKey) return st.classKey === targetCls.key;
          return st.class_name.toLowerCase() === targetCls.label.toLowerCase();
        })
        .map((st) => ({
          roll: st.roll,
          rollBn: st.rollBn || convertToBengali(st.roll),
          name: st.name_bn || st.name_en || 'নাম উল্লেখ নেই',
          father: st.father_bn || '',
          id: st.id || st.reg_no || '',
          className: st.class_name,
          hasResult: Boolean(st.resultSummary),
          source: st.source,
        }));
    }

    rolls.sort((a, b) => {
      const na = parseInt(bnToEnNumber(a.roll), 10);
      const nb = parseInt(bnToEnNumber(b.roll), 10);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
      return String(a.roll).localeCompare(String(b.roll), 'bn');
    });
  }

  return {
    classes,
    rolls,
    totalStudents: students.length,
  };
}

export function findUnifiedStudents(excelStore, portalStore, { classParam = '', rollParam = '', query = '' } = {}) {
  const students = getUnifiedStudents(excelStore, portalStore);
  let resolvedClassParam = String(classParam || '').trim();
  if (resolvedClassParam.startsWith('excel:')) {
    const eid = resolvedClassParam.slice(6);
    const ex = excelStore?.results?.exams?.[eid];
    if (ex) {
      resolvedClassParam = ex.classId || ex.className || '';
    }
  }
  const targetCls = normalizeClassInput(resolvedClassParam);
  const targetRoll = normalizeRollKey(rollParam);
  const q = String(query || '').trim().toLowerCase();
  const qEn = bnToEnNumber(q);

  if (!targetCls.key && !targetRoll && !q) {
    return { matches: [], exact: null };
  }

  const matches = students.filter((st) => {
    if (targetRoll) {
      const stRoll = normalizeRollKey(st.roll);
      if (stRoll !== targetRoll) return false;
      if (targetCls.key) {
        return st.classKey === targetCls.key || st.class_name.toLowerCase() === targetCls.label.toLowerCase();
      }
      return true;
    }

    if (targetCls.key && !q) {
      return st.classKey === targetCls.key || st.class_name.toLowerCase() === targetCls.label.toLowerCase();
    }

    if (q) {
      const classOk = !targetCls.key || st.classKey === targetCls.key || st.class_name.toLowerCase() === targetCls.label.toLowerCase();
      if (!classOk) return false;
      const hay = [
        st.roll,
        bnToEnNumber(st.roll),
        st.id,
        st.reg_no,
        st.name_bn,
        st.name_en,
        st.father_bn,
        st.mother_bn,
        st.mobile,
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q) || hay.includes(qEn);
    }

    return false;
  });

  matches.sort((a, b) => {
    const na = parseInt(bnToEnNumber(a.roll), 10);
    const nb = parseInt(bnToEnNumber(b.roll), 10);
    if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
    return String(a.roll).localeCompare(String(b.roll), 'bn');
  });

  return {
    matches,
    exact: matches.length === 1 ? matches[0] : targetRoll && matches.length > 0 ? matches[0] : null,
  };
}
