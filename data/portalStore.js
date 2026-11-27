import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initialNotices, allTeachersAndStaff } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.join(__dirname, 'portal-store.json');

function createDefaultGoverningBody() {
  return {
    institutionName: 'নলতা আহ্ছানিয়া দারুল উলূম ফাযিল মাদ্রাসা, সাতক্ষীরা।',
    tenure: '২৫.০৪.২০২৫ হতে ২৪.০৪.২০২৮ খ্রি: পর্যন্ত (০৩ বছর)।',
    members: [
      { id: 'gb_1', order: 1, name: 'আলহাজ্ব মোঃ রফিকুল ইসলাম', designation: 'সভাপতি (ভাইস চ্যান্সেলর মহোদয় কর্তৃক মনোনীত)', mobile: '' },
      { id: 'gb_2', order: 2, name: 'জনাব মোঃ নজরুল ইসলাম', designation: 'সহ-সভাপতি', mobile: '' },
      { id: 'gb_3', order: 3, name: 'জনাব মোঃ নজরুল ইসলাম', designation: 'বিদ্যোৎসাহী প্রতিনিধি (ভাইস চ্যান্সেলর মহোদয় কর্তৃক মনোনীত)', mobile: '' },
      { id: 'gb_4', order: 4, name: 'আলহাজ্ব এ, এফ, এম শামছুল হক', designation: 'বিদ্যোৎসাহী প্রতিনিধি (বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড কর্তৃক মনোনীত)', mobile: '' },
      { id: 'gb_5', order: 5, name: 'আলহাজ্ব মোঃ ইউনুস', designation: 'বিদ্যোৎসাহী প্রতিনিধি (ডি.জি. কর্তৃক মনোনীত)', mobile: '' },
      { id: 'gb_6', order: 6, name: 'জনাব মোঃ রমজান আলী', designation: 'সদস্য (অভিভাবক প্রতিনিধি)', mobile: '' },
      { id: 'gb_7', order: 7, name: 'জনাব মোঃ হাবিবুর রহমান', designation: 'সদস্য (অভিভাবক প্রতিনিধি)', mobile: '' },
      { id: 'gb_8', order: 8, name: 'জনাব মোঃ আব্দুর রাজ্জাক', designation: 'সদস্য (অভিভাবক প্রতিনিধি)', mobile: '' },
      { id: 'gb_9', order: 9, name: 'আলহাজ মো: সাইদুর রহমান', designation: 'প্রতিষ্ঠাতা সদস্য', mobile: '' },
      { id: 'gb_10', order: 10, name: 'আলহাজ্ব মো: আব্দুর রাজ্জাক', designation: 'দাতা সদস্য', mobile: '' },
      { id: 'gb_11', order: 11, name: 'জনাব মো: ইলিয়াস হোসেন', designation: 'সদস্য (শিক্ষক প্রতিনিধি)', mobile: '' },
      { id: 'gb_12', order: 12, name: 'জনাব শুভ্র রেজা', designation: 'সদস্য (শিক্ষক প্রতিনিধি)', mobile: '' },
      { id: 'gb_13', order: 13, name: 'জনাব মোঃ মারুফ হোসেন', designation: 'সদস্য (শিক্ষক প্রতিনিধি)', mobile: '' },
      { id: 'gb_14', order: 14, name: 'জনাব ডাঃ মোঃ হাবিবুর রহমান', designation: 'সদস্য (চিকিৎসক)', mobile: '' },
      { id: 'gb_15', order: 15, name: 'অধ্যক্ষ, নলতা আহছানিয়া দারুল উলূম ফাযিল মাদরাসা', designation: 'সদস্য সচিব (পদাধিকারবলে)', mobile: '' },
    ],
  };
}

function createDefaultPortalStore() {
  return {
    notices: initialNotices.map((n) => ({ ...n })),
    teachers: allTeachersAndStaff.map((t, idx) => ({
      id: `t_${idx + 1}`,
      name: t.name || '',
      designation: t.designation || '',
      index_no: t.index_no || '',
      subject: t.subject || '',
      mpo_date: t.mpo_date || '',
      mobile: t.mobile || '',
      photo: t.photo || 'logo.png',
      showInCarousel: true,
    })),
    governingBody: createDefaultGoverningBody(),
    admissions: [],
    routines: [
      { id: 'r_1', className: 'ইবতেদায়ী (১ম - ৫ম)', day: 'রবিবার - বৃহস্পতিবার', time: '১০:০০ - ১০:৪৫', subject: 'কুরআন মাজিদ ও তাজবিদ', teacher: 'মাও: গোলাম রব্বানী', room: 'ভবন-১' },
      { id: 'r_2', className: 'দাখিল (৬ষ্ঠ - ১০ম)', day: 'রবিবার - বৃহস্পতিবার', time: '১০:৪৫ - ১১:৩০', subject: 'আরবি ১ম ও ২য় পত্র', teacher: 'মাও: রফিকুল ইসলাম', room: 'কক্ষ-১০৪' },
      { id: 'r_3', className: 'আলিম (১ম ও ২য় বর্ষ)', day: 'রবিবার - বৃহস্পতিবার', time: '১১:৩০ - ১২:১৫', subject: 'বাংলা ও ইংরেজি', teacher: 'শিরিনা আক্তার / শুভ্র রেজা', room: 'কক্ষ-২০২' },
      { id: 'r_4', className: 'ফাজিল (স্নাতক)', day: 'রবিবার - বৃহস্পতিবার', time: '১২:১৫ - ০১:০০', subject: 'আল-ফিকহ ও উসুলুল ফিকহ', teacher: 'অধ্যক্ষ মোহাম্মদ রমিজ উদ্দীন', room: 'ফাজিল হল' },
    ],
    syllabus: [
      { id: 's_1', className: 'ইবতেদায়ী (১ম - ৫ম)', examTerm: 'বার্ষিক পরীক্ষা ২০২৬', subject: 'কুরআন, আরবি, বাংলা, ইংরেজি, গণিত', topics: 'বোর্ড নির্ধারিত সম্পূর্ণ পাঠ্যবই (১ম থেকে শেষ অধ্যায়)', note: 'মৌখিক ও লিখিত মূল্যায়ন' },
      { id: 's_2', className: 'দাখিল (ষষ্ঠ - দশম)', examTerm: 'বার্ষিক / নির্বাচনী ২০২৬', subject: 'কুরআন, হাদিস, আকাইদ, আরবি, বাংলা, ইংরেজি, গণিত, বিজ্ঞান', topics: 'বাংলাদেশ মাদ্রাসা শিক্ষা বোর্ড (BMEB) ও NCTB নির্ধারিত সিলেবাস', note: 'সৃজনশীল ও বহুনির্বাচনি' },
      { id: 's_3', className: 'আলিম ও ফাজিল', examTerm: 'বোর্ড ও বিশ্ববিদ্যালয় ২০২৬', subject: 'সকল আবশ্যিক ও ঐচ্ছিক বিষয়', topics: 'BMED এবং ইসলামি আরবি বিশ্ববিদ্যালয় (IAU) অনুমোদিত পাঠ্যক্রম', note: 'ব্যবহারিক ও ইনকোর্সসহ' },
    ],
    fees: [
      { id: 'f_1', className: 'ইবতেদায়ী (১ম - ৫ম)', feeTitle: 'মাসিক বেতন ও সেশন ফি', amount: '৩০০', period: 'মাসিক', note: 'অফিস কক্ষ / নির্ধারিত রশিদে পরিশোধযোগ্য' },
      { id: 'f_2', className: 'দাখিল (৬ষ্ঠ - ৮ম)', feeTitle: 'মাসিক টিউশন ফি', amount: '৪০০', period: 'মাসিক', note: 'মাসের ১০ তারিখের মধ্যে পরিশোধযোগ্য' },
      { id: 'f_3', className: 'দাখিল (৯ম - ১০ম)', feeTitle: 'টিউশন ও পরীক্ষা ফি', amount: '৫০০', period: 'মাসিক', note: 'বোর্ড রেজিস্ট্রেশন ও ফরম ফিলাপ পৃথক' },
      { id: 'f_4', className: 'আলিম ও ফাজিল', feeTitle: 'টিউশন ও সেশন ফি', amount: '৬০০', period: 'মাসিক', note: 'উপবৃত্তিপ্রাপ্ত শিক্ষার্থীদের নিয়ম অনুযায়ী ছাড় প্রযোজ্য' },
    ],
    registrations: [
      { id: 'reg_1', className: 'দাখিল (অষ্টম ও নবম শ্রেণি)', examYear: '২০২৬', deadline: 'চলমান (অফিস নোটিশ অনুযায়ী)', feeAmount: 'বোর্ড নির্ধারিত ফি', instructions: 'জন্ম নিবন্ধন, পূর্ববর্তী পাসের নম্বরপত্র ও ২ কপি পাসপোর্ট ছবি অফিস কক্ষে জমা দিন।' },
      { id: 'reg_2', className: 'আলিম ১ম বর্ষ', examYear: '২০২৬-২০২৭', deadline: 'চলমান', feeAmount: 'বোর্ড নির্ধারিত ফি', instructions: 'দাখিল মূল নম্বরপত্র, প্রশংসাপত্র ও অনলাইন e-SIF ফরম জমা দিতে হবে।' },
    ],
    studentStats: [
      { id: 'st_1', className: 'ইবতেদায়ী (১ম - ৫ম)', boys: 145, girls: 130 },
      { id: 'st_2', className: 'দাখিল (৬ষ্ঠ - ৮ম)', boys: 168, girls: 152 },
      { id: 'st_3', className: 'দাখিল (৯ম - ১০ম)', boys: 112, girls: 98 },
      { id: 'st_4', className: 'আলিম (১ম ও ২য় বর্ষ)', boys: 84, girls: 76 },
      { id: 'st_5', className: 'ফাজিল (স্নাতক)', boys: 62, girls: 48 },
    ],
  };
}

export function loadPortalStore() {
  try {
    if (!fs.existsSync(STORE_PATH)) {
      const defaults = createDefaultPortalStore();
      savePortalStore(defaults);
      return defaults;
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const defaults = createDefaultPortalStore();
    const gbRaw = parsed.governingBody && typeof parsed.governingBody === 'object' ? parsed.governingBody : null;
    const governingBody = gbRaw
      ? {
          institutionName:
            typeof gbRaw.institutionName === 'string' && gbRaw.institutionName.trim()
              ? gbRaw.institutionName.trim()
              : defaults.governingBody.institutionName,
          tenure:
            typeof gbRaw.tenure === 'string' && gbRaw.tenure.trim()
              ? gbRaw.tenure.trim()
              : defaults.governingBody.tenure,
          members: Array.isArray(gbRaw.members) ? gbRaw.members : defaults.governingBody.members,
        }
      : defaults.governingBody;
    return {
      notices: Array.isArray(parsed.notices) ? parsed.notices : defaults.notices,
      teachers: Array.isArray(parsed.teachers) ? parsed.teachers : defaults.teachers,
      governingBody,
      admissions: Array.isArray(parsed.admissions) ? parsed.admissions : defaults.admissions,
      routines: Array.isArray(parsed.routines) ? parsed.routines : defaults.routines,
      syllabus: Array.isArray(parsed.syllabus) ? parsed.syllabus : defaults.syllabus,
      fees: Array.isArray(parsed.fees) ? parsed.fees : defaults.fees,
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : defaults.registrations,
      studentStats: Array.isArray(parsed.studentStats) ? parsed.studentStats : defaults.studentStats,
    };
  } catch (err) {
    console.warn('Could not read portal store, resetting defaults:', err.message);
    return createDefaultPortalStore();
  }
}

export function savePortalStore(data) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
}
