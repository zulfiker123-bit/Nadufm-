// In-memory data store and helpers (migrated from MySQL notices & PHP arrays)

export const initialNotices = [
  {
    id: 1,
    type: 'headline',
    notice_date: '২০২৬-০২-০১',
    subject: 'নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসায় ২০২৬ শিক্ষাবর্ষে ভর্তি কার্যক্রম চলছে।',
    description: '',
    link: '',
    is_new: 'no',
  },
  {
    id: 2,
    type: 'headline',
    notice_date: '২০২৬-০২-০১',
    subject: 'সকল শ্রেণির নিয়মিত ক্লাস সকাল ১০:০০ ঘটিকা হতে যথারীতি চলমান রয়েছে।',
    description: '',
    link: '',
    is_new: 'no',
  },
  {
    id: 3,
    type: 'notice',
    notice_date: '২৫ জানুয়ারি ২০২৬',
    subject: '২০২৬ শিক্ষাবর্ষের ক্লাস রুটিন ও একাডেমিক ক্যালেন্ডার প্রকাশ প্রসঙ্গে।',
    description:
      'নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসার সকল শ্রেণির শিক্ষার্থী ও সম্মানিত অভিভাবকবৃন্দের অবগতির জন্য জানানো যাচ্ছে যে, ২০২৬ শিক্ষাবর্ষের বার্ষিক একাডেমিক ক্যালেন্ডার ও ছুটির তালিকা ওয়েবসাইটে প্রকাশ করা হয়েছে। সকল শিক্ষার্থীকে যথাসময়ে শ্রেণিকক্ষে উপস্থিত থাকার জন্য নির্দেশ প্রদান করা হলো।',
    link: 'calendar.php',
    is_new: 'yes',
  },
  {
    id: 4,
    type: 'notice',
    notice_date: '১৫ জানুয়ারি ২০২৬',
    subject: 'ইবতেদায়ী থেকে ফাজিল শ্রেণি পর্যন্ত নতুন শিক্ষার্থী ভর্তি বিজ্ঞপ্তি।',
    description:
      'আগ্রহী শিক্ষার্থীদের মাদ্রাসা অফিস থেকে অথবা ওয়েবসাইটের শিক্ষার্থী কর্ণার থেকে ভর্তি ফরম সংগ্রহ করে প্রয়োজনীয় কাগজপত্রসহ জমা দেওয়ার জন্য অনুরোধ করা যাচ্ছে।',
    link: '',
    is_new: 'yes',
  },
  {
    id: 5,
    type: 'notice',
    notice_date: '১০ জানুয়ারি ২০২৬',
    subject: 'উপবৃত্তি আবেদন ও ইউনিক আইডি সংক্রান্ত জরুরি বিজ্ঞপ্তি।',
    description:
      'যে সকল শিক্ষার্থীর জন্ম নিবন্ধন ও পিতা-মাতার এনআইডি তথ্য এখনো জমা দেওয়া হয়নি, তাদের আগামী ৭ কর্মদিবসের মধ্যে অফিস কক্ষে জমা দেওয়ার জন্য বলা হলো।',
    link: '',
    is_new: 'no',
  },
  {
    id: 6,
    type: 'notice',
    notice_date: '০৫ জানুয়ারি ২০২৬',
    subject: 'মাদ্রাসার ২০২৬ সালের ছুটির তালিকা প্রকাশ।',
    description:
      'গণপ্রজাতন্ত্রী বাংলাদেশ সরকারের শিক্ষা মন্ত্রণালয় ও মাদ্রাসা শিক্ষা অধিদপ্তরের নির্দেশনা অনুযায়ী ২০২৬ সালের ছুটির তালিকা প্রকাশ করা হলো।',
    link: 'holidays.php',
    is_new: 'no',
  },
  {
    id: 7,
    type: 'notice',
    notice_date: '২৮ ডিসেম্বর ২০২৫',
    subject: 'বার্ষিক পরীক্ষার ফলাফল ও মেধাতালিকা প্রকাশ সংক্রান্ত বিজ্ঞপ্তি।',
    description:
      'অত্র মাদ্রাসার বার্ষিক পরীক্ষার ফলাফল ও মেধাতালিকা অনলাইন রেজাল্ট পোর্টালে প্রকাশ করা হয়েছে। শিক্ষার্থীরা রোল নম্বর দিয়ে ফলাফল সংগ্রহ করতে পারবে।',
    link: 'merit-list.php',
    is_new: 'no',
  },
];

export const teachersCarousel = [
  { name: 'মোহাম্মদ রমিজ উদ্দীন', desg: 'অধ্যক্ষ', index: 'K2004885', phone: '01719568538', img: 'principal.jpg' },
  { name: 'মুহা: জয়নুল ওয়ারা', desg: 'উপাধ্যক্ষ', index: 'K363442', phone: '01779511848', img: 'joynul.jpg' },
  { name: 'মো: রফিকুল ইসলাম', desg: 'সহকারি অধ্যাপক', index: 'K074217', phone: '01719518665', img: 'islam.jpg' },
  { name: 'সুরাইয়া আক্তার', desg: 'সহকারি অধ্যাপক', index: 'K580457', phone: '01818281527', img: 'suraiya.jpg' },
  { name: 'শিরিনা আক্তার', desg: 'প্রভাষক (বাংলা)', index: 'K2021817', phone: '01721057569', img: 'shirina.jpg' },
  { name: 'মো: শুভ্র রেজা', desg: 'প্রভাষক (ইংরেজি)', index: 'K2021999', phone: '01740644474', img: 'shuvroreza.jpg' },
  { name: 'মাছুম বিল্লাহ', desg: 'প্রভাষক (আরবি)', index: 'M0041148', phone: '01729921360', img: 'sobuj.png' },
  { name: 'মাসুদ পারভেজ', desg: 'প্রভাষক (আইসিটি)', index: 'M0057163', phone: '01827332223', img: 'masud.png' },
  { name: 'মো: ইলিয়াছ হোসেন', desg: 'প্রভাষক (আরবি)', index: 'K580455', phone: '01916480590', img: 'elias.png' },
  { name: 'মো: ওসমান গণি', desg: 'প্রভাষক (আরবি)', index: 'K580456', phone: '01919839617', img: 'osman.jpg' },
  { name: 'জি. এম. মুজিবর রহমান ফরিদী', desg: 'সহকারি শিক্ষক', index: 'K074216', phone: '01750917462', img: 'mujibor.jpg' },
  { name: 'মো: মাহমুদুন্নবী', desg: 'সহকারি শিক্ষক', index: 'K363439', phone: '01727043976', img: 'mithu.jpg' },
  { name: 'জুলফিকার রহমান', desg: 'সহকারি শিক্ষক', index: 'M0041854', phone: '01767792249', img: 'zulfiker.jpg' },
  { name: 'মাছুম বিল্লাহ (২)', desg: 'সহকারি শিক্ষক', index: 'M0064387', phone: '01767978224', img: 'masum.png' },
  { name: 'এম. নাজমুল হোসাইন', desg: 'সহকারি শিক্ষক', index: 'M0063941', phone: '01942083278', img: 'nazmul.png' },
  { name: 'বাশিরুন নাহার', desg: 'সহকারি শিক্ষক', index: 'N2123446', phone: '01941241215', img: 'basirun.jpg' },
  { name: 'আশিকুর রহমান', desg: 'সহকারি শিক্ষক', index: 'N2128342', phone: '01949235572', img: 'ashik.jpg' },
  { name: 'শংকর দেব নাথ', desg: 'সহকারি শিক্ষক', index: 'N2128343', phone: '01724716812', img: 'babu.jpg' },
  { name: 'মারুফ হোসেন', desg: 'সহকারি শিক্ষক', index: 'M0041160', phone: '01781649450', img: 'maruf.jpg' },
  { name: 'ফরিদা পারভীন', desg: 'সহকারি শিক্ষক', index: 'M0041034', phone: '01770748343', img: 'forida.png' },
  { name: 'সাবনাজ পারভীন', desg: 'সহকারি শিক্ষক', index: 'M0041153', phone: '01312808789', img: 'sabnaj.png' },
  { name: 'সাদিয়া সুলতানা', desg: 'সহকারি শিক্ষক', index: 'M0063931', phone: '01990834509', img: 'sadiya.png' },
  { name: 'মো: গোলাম রব্বানী', desg: 'দাখিল ক্বারী', index: 'K074223', phone: '01928222143', img: 'rabbani.jpg' },
  { name: 'মোস্তফা রফিকুল হাসান', desg: 'ইবতেদায়ী প্রধান', index: 'K074224', phone: '01911837972', img: 'Satkhira.jpg' },
  { name: 'সাদিয়া আহছানী', desg: 'ইবতেদায়ী ক্বারী', index: 'N2112451', phone: '01950670038', img: 'sadiyaahsani.png' },
];

export const allTeachersAndStaff = [
  { name: 'মোহাম্মদ রমিজ উদ্দীন', designation: 'অধ্যক্ষ', index_no: 'K2004885', subject: 'আরবি', mpo_date: '২০২১-০৪-০১', mobile: '01719568538', photo: 'principal.jpg' },
  { name: 'মুহা: জয়নুল ওয়ারা', designation: 'উপাধ্যক্ষ', index_no: 'K363442', subject: 'আরবি', mpo_date: '১৯৯৩-০৮-১৫', mobile: '01779511848', photo: 'joynul.jpg' },
  { name: 'মো: রফিকুল ইসলাম', designation: 'সহকারি অধ্যাপক (আরবি)', index_no: 'K074217', subject: 'আরবি', mpo_date: '২০০১-০৪-০১', mobile: '01719518665', photo: 'islam.jpg' },
  { name: 'মো: ইলিয়াছ হোসেন', designation: 'প্রভাষক (আরবি)', index_no: 'K580455', subject: 'আরবি', mpo_date: '২০০১-০৬-০১', mobile: '01916480590', photo: 'elias.png' },
  { name: 'মো: ওসমান গণি', designation: 'প্রভাষক (আরবি)', index_no: 'K580456', subject: 'আরবি', mpo_date: '২০০১-০৬-০১', mobile: '01919839617', photo: 'osman.jpg' },
  { name: 'সুরাইয়া আক্তার', designation: 'প্রভাষক ( অর্থনীতি)', index_no: 'K580457', subject: 'অর্থনীতি', mpo_date: '২০০১-০৬-০১', mobile: '01818281527', photo: 'suraiya.jpg' },
  { name: 'শিরিনা আক্তার', designation: 'প্রভাষক (বাংলা)', index_no: 'K2021817', subject: 'বাংলা', mpo_date: '২০০৮-০১-০১', mobile: '01721057569', photo: 'shirina.jpg' },
  { name: 'মো: শুভ্র রেজা', designation: 'প্রভাষক (ইংরেজি)', index_no: 'K2021999', subject: 'ইংরেজি', mpo_date: '২০০৯-০১-০১', mobile: '01740644474', photo: 'shuvroreza.jpg' },
  { name: 'মাছুম বিল্লাহ', designation: 'প্রভাষক (আরবি)', index_no: 'M0041148', subject: 'আরবি', mpo_date: '২০২৩-১০-০১', mobile: '01515', photo: 'sobuj.png' },
  { name: 'মাসুদ পারভেজ', designation: 'প্রভাষক (আইসিটি)', index_no: 'M0057163', subject: 'আইসিটি', mpo_date: '২০২৪-০৯-০১', mobile: '01827332223', photo: 'masud.png' },
  { name: 'জি. এম. মুজিবর রহমান ফরিদী', designation: 'সহকারি শিক্ষক (মৌলভী)', index_no: 'K074216', subject: 'আরবি', mpo_date: '১৯৮৬-০৩-০১', mobile: '01750917462', photo: 'mujibor.jpg' },
  { name: 'মো: মাহমুদুন্নবী', designation: 'সহকারি শিক্ষক (মৌলভী)', index_no: 'K363439', subject: 'আরবি', mpo_date: '১৯৯৩-৯-০১', mobile: '01727043976', photo: 'mithu.jpg' },
  { name: 'জুলফিকার রহমান', designation: 'সহকারি শিক্ষক (মৌলভী)', index_no: 'M0041854', subject: 'ইসলামিক স্টাডিজ', mpo_date: '২০২৩-১০-০১', mobile: '01767792249', photo: 'zulfiker.jpg' },
  { name: 'মাসুম বিল্লাহ  (২)', designation: 'সহকারি শিক্ষক (মৌলভী)', index_no: 'M0064387', subject: 'আরবি', mpo_date: '২০২৫-০৯-০১', mobile: '01767978224', photo: 'masum.png' },
  { name: 'এম. নাজমুল হোসাইন', designation: 'সহকারি শিক্ষক (শারীরিক শিক্ষা)', index_no: 'M0063941', subject: 'শারীরিক শিক্ষা', mpo_date: '২০২৫-০৯-০১', mobile: '01942083278', photo: 'nazmul.png' },
  { name: 'বাশিরুন নাহার', designation: 'সহকারি শিক্ষক (আইসিটি)', index_no: 'N2123446', subject: 'আইসিটি', mpo_date: '২০১৯-০৭-০১', mobile: '01941241215', photo: 'basirun.jpg' },
  { name: 'আশিকুর রহমান', designation: 'সহকারি শিক্ষক (গণিত)', index_no: 'N2128342', subject: 'গণিত', mpo_date: '২০১৯-০৭-০১', mobile: '01949235572', photo: 'ashik.jpg' },
  { name: 'সাবনাজ পারভীন', designation: 'সহকারি শিক্ষক (কৃষি)', index_no: 'M0041153', subject: 'কৃষি শিক্ষা', mpo_date: '২০২৩-১০-০১', mobile: '01312808789', photo: 'sabnaj.png' },
  { name: 'শংকর দেব নাথ', designation: 'সহকারি শিক্ষক (সমাজ বিজ্ঞান)', index_no: 'N2128343', subject: 'সমাজ বিজ্ঞান', mpo_date: '২০১৯-০৭-০১', mobile: '01724716812', photo: 'babu.jpg' },
  { name: 'মারুফ হোসেন', designation: 'সহকারি শিক্ষক (ইংরেজি)', index_no: 'M0041160', subject: 'ইংরেজি', mpo_date: '২০২৩-১০-০১', mobile: '01781649450', photo: 'maruf.jpg' },
  { name: 'ফরিদা পারভীন', designation: 'সহকারি শিক্ষক (বাংলা)', index_no: 'M0041034', subject: 'বাংলা', mpo_date: '২০২৩-১০-০১', mobile: '01770748343', photo: 'forida.png' },
  { name: 'সাদিয়া সুলতানা', designation: 'সহকারি শিক্ষক (গার্হস্থ্য)', index_no: 'M0063931', subject: 'গার্হস্থ্য শিক্ষা', mpo_date: '২০২৫-০৯-০১', mobile: '01990834509', photo: 'sadiya.png' },
  { name: 'মো: গোলাম রব্বানী', designation: 'দাখিল ক্বারী', index_no: 'K074223', subject: 'তাজবিদ/আরবি', mpo_date: '১৯৮৬-০৩-০১', mobile: '01928222143', photo: 'rabbani.jpg' },
  { name: 'মোস্তফা রফিকুল হাসান', designation: 'ইবতেদায়ী প্রধান', index_no: 'K074224', subject: 'আরবি', mpo_date: '১৯৮৬-০৩-০১', mobile: '01911837972', photo: 'Satkhira.jpg' },
  { name: 'সাদিয়া আহছানী', designation: 'ইবতেদায়ী ক্বারী', index_no: 'N2112451', subject: 'তাজবিদ', mpo_date: '২০১৫-০৭-০১', mobile: '01950670038', photo: 'sadiyaahsani.png' },
  { name: 'মো: রমজান আলী', designation: 'অফিস সহকারী', index_no: 'K369473', subject: 'প্রশাসন', mpo_date: '১৯৯৭-০৩-০১', mobile: '01925043975', photo: 'ramzan.jpg' },
  { name: 'মোঃ হাসানুজ্জামান', designation: 'হিসাব সহকারী', index_no: 'M0016867', subject: 'হিসাব শাখা', mpo_date: '২০২১-১০-০১', mobile: '01923518218', photo: 'hasan.png' },
  { name: 'মোঃ হৃদয় আহছান', designation: 'কম্পিউটার অপারেটর', index_no: 'M0016870', subject: 'কম্পিউটার শাখা', mpo_date: '২০২১-১০-০১', mobile: '01983128139', photo: 'mim.png' },
  { name: 'তৌফিক আহম্মেদ', designation: 'ল্যাব অপারেটর', index_no: 'M0076844', subject: 'কম্পিউটার ল্যাব', mpo_date: 'চলমান', mobile: '01827227347', photo: 'towfiq.png' },
  { name: 'এএসএম শাহরিয়র হোসেন', designation: 'ল্যাব এসিসটেন্ট', index_no: 'M0076843', subject: 'বিজ্ঞান ল্যাব', mpo_date: 'চলমান', mobile: '01985314158', photo: 'sahriar.png' },
  { name: 'সামছুর রহমান', designation: 'পরিচ্ছন্নতা কর্মী', index_no: 'K369475', subject: 'অফিস সেবা', mpo_date: '১৯৯৭-০৩-০১', mobile: '01949221251', photo: 'pion.jpg' },
  { name: 'ইরানি পারভীন', designation: 'আয়া', index_no: 'M0014541', subject: 'সেবা', mpo_date: '২০২১-০৪-০১', mobile: '01969263668', photo: 'irani.png' },
  { name: 'মোঃ মিজানুর রহমান', designation: 'নিরাপত্তা কর্মী', index_no: 'M0014543', subject: 'নিরাপত্তা', mpo_date: '২০২১-০৪-০১', mobile: '01750309693', photo: 'mizanur.png' },
  { name: 'মোঃ জহিরুল ইসলাম', designation: 'নৈশ প্রহরী', index_no: 'M0016869', subject: 'নিরাপত্তা', mpo_date: '২০২১-১০-০১', mobile: '01911995620', photo: 'zohir.png' },
];

export const classMap = {
  '0': { name: 'শিশু', gid: '1191889934' },
  '1': { name: 'প্রথম', gid: '1997005098' },
  '2': { name: 'দ্বিতীয়', gid: '1134761251' },
  '3': { name: 'তৃতীয়', gid: '1588251736' },
  '4': { name: 'চতুর্থ', gid: '1148542445' },
  '5': { name: 'পঞ্চম', gid: '2018051935' },
  '6': { name: 'ষষ্ঠ', gid: '909549955' },
  '7': { name: 'সপ্তম', gid: '409341475' },
  '8': { name: 'অষ্টম', gid: '795045010' },
  '9': { name: 'নবম', gid: '462582001' },
  '10': { name: 'দশম', gid: '350912957' },
  '11': { name: 'আলিম ১ম বর্ষ ', gid: '1289051084' },
  '12': { name: 'আলিম ২য় বর্ষ ', gid: '153134693' },
};

export function convertToBengali(input) {
  const en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '.'];
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯', '.'];
  return String(input).replace(/[0-9.]/g, (ch) => {
    const idx = en.indexOf(ch);
    return idx >= 0 ? bn[idx] : ch;
  });
}

export function bnToEnNumber(str) {
  const bn = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  const en = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  return String(str).replace(/[০-৯]/g, (ch) => {
    const idx = bn.indexOf(ch);
    return idx >= 0 ? en[idx] : ch;
  });
}

export function isScienceGroupText(raw) {
  const txt = String(raw || '').trim();
  if (!txt) return false;
  return /বিজ্ঞান|science|\bsci\b/i.test(txt);
}

export function formatStudentNameWithGroup(name, isScience) {
  const base = String(name || '').trim();
  if (!base) return '—';
  if (!isScience) return base;
  if (/\(\s*বিজ্ঞান\s*\)/i.test(base)) return base;
  return `${base} (বিজ্ঞান)`;
}

export function getGradeInfo(mark, fullMark, isFailed = false) {
  if (isFailed || fullMark <= 0) return ['F', '0.00'];
  const percentage = Math.round(((mark / fullMark) * 100) * 1e6) / 1e6;
  if (percentage >= 80) return ['A+', '5.00'];
  if (percentage >= 70) return ['A', '4.00'];
  if (percentage >= 60) return ['A-', '3.50'];
  if (percentage >= 50) return ['B', '3.00'];
  if (percentage >= 40) return ['C', '2.00'];
  if (percentage >= 33) return ['D', '1.00'];
  return ['F', '0.00'];
}

export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

export function getBoardExamType(classId = '', className = '') {
  const cid = String(classId ?? '').trim();
  if (cid === '11' || cid === '12') return 'alim';
  if (cid === '9' || cid === '10') return 'dakhil';
  if (cid === '6' || cid === '7' || cid === '8') return 'junior';
  if (cid === '0' || cid === '1' || cid === '2' || cid === '3' || cid === '4' || cid === '5') return '';
  const raw = bnToEnNumber(String(className ?? '').trim());
  if (!raw) return '';
  if (/আলিম|alim|\b11(?:th)?\b|\b12(?:th)?\b/i.test(raw)) return 'alim';
  if (/নবম|দশম|দাখিল|dakhil|\b9(?:th)?\b|\b10(?:th)?\b/i.test(raw)) return 'dakhil';
  if (/ষষ্ঠ|সপ্তম|অষ্টম|\b6(?:th)?\b|\b7(?:th)?\b|\b8(?:th)?\b/i.test(raw)) return 'junior';
  return '';
}

export function stripSubjectDecorations(label) {
  return String(label || '')
    .normalize('NFC')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSubjectCanonical(str) {
  return bnToEnNumber(String(str || ''))
    .normalize('NFC')
    .toLowerCase()
    .replace(/য়/g, 'য়')
    .replace(/ী/g, 'ি')
    .replace(/ূ/g, 'ু')
    .replace(/[-–—_:.,/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/জীব(?:\s*বিজ্ঞান)?/g, 'জীববিজ্ঞান')
    .replace(/পদার্থ(?:\s*বিজ্ঞান)?/g, 'পদার্থবিজ্ঞান')
    .replace(/আল\s+ফিকহ/g, 'আল ফিকহ')
    .replace(/^ফিকহ$/g, 'আল ফিকহ')
    .replace(/(?:ইংরেজি|english|eng\b)/g, 'ইংরেজি')
    .replace(/(?:বাংলা|bangla|bengali)/g, 'বাংলা')
    .replace(/(?:আরবি|arabic)/g, 'আরবি');
}

export function parseSubjectPaperInfo(label) {
  const raw = String(label || '').trim();
  const hasPlus = raw.includes('+');
  const isOptionalTagged = /\(\s*(?:4th|৪র্থ|ঐচ্ছিক|optional|opt|অতিরিক্ত|extra)\s*\)/i.test(raw);
  const titleOnly = stripSubjectDecorations(raw);
  const alreadyCombined = /(?:১ম|প্রথম|1st|i)\s*(?:ও|এবং|&|and)\s*(?:২য়|২য়|দ্বিতীয়|দ্বিতীয়|2nd|ii)/i.test(titleOnly);

  const paper1Re = /(?:^|[\s\-–_])(?:(১ম|প্রথম|1st|paper[\s\-]*1|part[\s\-]*1|i)(?:\s*(?:পত্র|paper|part))?|(?:পত্র|paper)\s*[-–:]?\s*(?:১|1))$/iu;
  const paper2Re = /(?:^|[\s\-–_])(?:(২য়|২য়|দ্বিতীয়|দ্বিতীয়|2nd|paper[\s\-]*2|part[\s\-]*2|ii)(?:\s*(?:পত্র|paper|part))?|(?:পত্র|paper)\s*[-–:]?\s*(?:২|2))$/iu;
  const digit1Re = /(?:^|[\s\-–_])(১|1)$/u;
  const digit2Re = /(?:^|[\s\-–_])(২|2)$/u;

  let paper = 0;
  let baseTitle = titleOnly;

  if (!alreadyCombined) {
    if (paper1Re.test(titleOnly)) {
      paper = 1;
      baseTitle = titleOnly.replace(paper1Re, '').trim();
    } else if (paper2Re.test(titleOnly)) {
      paper = 2;
      baseTitle = titleOnly.replace(paper2Re, '').trim();
    } else if (digit1Re.test(titleOnly)) {
      paper = 1;
      baseTitle = titleOnly.replace(digit1Re, '').trim();
    } else if (digit2Re.test(titleOnly)) {
      paper = 2;
      baseTitle = titleOnly.replace(digit2Re, '').trim();
    }
  }

  baseTitle = baseTitle.replace(/[-–—:]+$/g, '').trim() || titleOnly;
  const canonicalBase = normalizeSubjectCanonical(baseTitle);
  const canonicalTitle = normalizeSubjectCanonical(titleOnly);
  const hasQuranWord = /কুরআন|কোরআন|কুরআনে|quran/i.test(canonicalTitle);
  const hasHadithWord = /হাদিস|হাদীস|hadith|hadis/i.test(canonicalTitle);

  return {
    raw,
    titleOnly,
    baseTitle,
    canonicalBase,
    paper,
    hasPlus,
    isOptionalTagged,
    isQuranOnly: hasQuranWord && !hasHadithWord,
    isHadithOnly: hasHadithWord && !hasQuranWord,
  };
}

export function shouldAutoCombinePapers(boardType, info1, info2) {
  if (!info1 || !info2) return false;
  if (info1.hasPlus) return true;
  if (!boardType) return false;
  if (boardType === 'dakhil' && ((info1.isQuranOnly && info2.isHadithOnly) || (info1.isHadithOnly && info2.isQuranOnly))) {
    return true;
  }
  if (info1.paper !== 1 || info2.paper !== 2) return false;
  if (!info1.canonicalBase || info1.canonicalBase !== info2.canonicalBase) return false;

  if (boardType === 'junior') {
    // Classes 6-8: Arabic 1st+2nd, Bangla 1st+2nd, English 1st+2nd combine
    return info1.canonicalBase === 'বাংলা' || info1.canonicalBase === 'ইংরেজি' || info1.canonicalBase === 'আরবি';
  }
  if (boardType === 'dakhil') {
    // Classes 9-10: Bangla 1+2, English 1+2, Arabic 1+2 combine (plus Quran+Hadith above)
    return info1.canonicalBase === 'বাংলা' || info1.canonicalBase === 'ইংরেজি' || info1.canonicalBase === 'আরবি';
  }
  if (boardType === 'alim') {
    // Alim (Classes 11-12): All two-paper subjects combine
    return true;
  }
  return false;
}

const PROTECTED_MAIN_RE = /কুরআন|কোরআন|quran|হাদিস|হাদীস|hadith|আকাঈদ|আকাইদ|aqaid|ফিকহ|fiqh|আরবি|arabic|বাংলা|bangla|bengali|ইংরেজি|english|তথ্য\s*ও\s*যোগাযোগ|ict|পদার্থ|physics|রসায়ন|রসায়ন|chemistry/i;
const GENERAL_MATH_ONLY_RE = /(?:^|\s)(?:সাধারণ\s*)?গণিত(?:\s|$)|^(?:general\s*)?math(?:ematics)?$/i;
const HIGHER_MATH_RE = /উচ্চতর\s*গণিত|higher\s*math/i;
const BIOLOGY_RE = /জীব\s*বিজ্ঞান|জীববিজ্ঞান|biology/i;
const AGRI_HOME_RE = /কৃষি|agriculture|গার্হস্থ্য|home\s*(?:science|economics)|শারীরিক|physical|চারু|কারু|ক্যারিয়ার|career/i;
const ALIM_OPTIONAL_ELECTIVE_RE = /পৌরনীতি|civics|অর্থনীতি|economics|যুক্তিবিদ্যা|logic|সমাজবিজ্ঞান|সমাজকর্ম|sociology|social\s*work|ভূগোল|geography|মনোবিজ্ঞান|psychology|উর্দু|urdu|ফারসি|persian|কৃষি|agriculture|গার্হস্থ্য|home\s*(?:science|economics)|উচ্চতর\s*গণিত|higher\s*math|জীব\s*বিজ্ঞান|জীববিজ্ঞান|biology/i;

export function isProtectedMainSubject(name) {
  const s = String(name || '').trim();
  if (!s) return false;
  if (HIGHER_MATH_RE.test(s)) return false;
  if (PROTECTED_MAIN_RE.test(s)) return true;
  if (GENERAL_MATH_ONLY_RE.test(s)) return true;
  return false;
}

export function pickOptionalSubjectIndex(subjects, { boardType = '', isScience = false, explicitOptionalText = '' } = {}) {
  if (!Array.isArray(subjects) || subjects.length === 0) return -1;

  // 1) Explicit per-row optional subject name (e.g. from a "৪র্থ বিষয়" column)
  const expText = normalizeSubjectCanonical(stripSubjectDecorations(explicitOptionalText));
  if (expText) {
    const idx = subjects.findIndex((s) => {
      const sn = normalizeSubjectCanonical(s.name);
      return sn === expText || sn.includes(expText) || expText.includes(sn);
    });
    if (idx >= 0) return idx;
  }

  // 2) Explicit column tag (e.g. "(4th)" / "(ঐচ্ছিক)" or admin checkbox)
  const taggedIdx = subjects.findIndex((s) => Boolean(s.isOptionalTagged));
  if (taggedIdx >= 0) return taggedIdx;

  // 3) Auto-detection only applies to Class 9-10 (dakhil) and Alim (11-12); not 1-5 or 6-8
  if (boardType !== 'dakhil' && boardType !== 'alim') return -1;

  const minCountForAuto = 6;
  if (subjects.length < minCountForAuto) return -1;

  // Priority A: Agriculture / Home Economics / Home Science (অতিরিক্ত: কৃষি / গার্হস্থ্য অর্থনীতি)
  const agriIdx = subjects.findIndex((s) => AGRI_HOME_RE.test(s.name) && !isProtectedMainSubject(s.name));
  if (agriIdx >= 0) return agriIdx;

  // Priority B: Science group with BOTH Biology and Higher Math -> Higher Math is default 4th subject
  const bioIdx = subjects.findIndex((s) => BIOLOGY_RE.test(s.name));
  const hMathIdx = subjects.findIndex((s) => HIGHER_MATH_RE.test(s.name));
  if (bioIdx >= 0 && hMathIdx >= 0) {
    return hMathIdx;
  }
  if (isScience && hMathIdx >= 0 && subjects.length >= minCountForAuto + 1) {
    return hMathIdx;
  }

  // Priority C: Alim General/Humanities extra elective beyond core subjects
  if (boardType === 'alim' && !isScience && subjects.length >= 7) {
    for (let i = subjects.length - 1; i >= 0; i--) {
      if (!isProtectedMainSubject(subjects[i].name) && ALIM_OPTIONAL_ELECTIVE_RE.test(subjects[i].name)) {
        return i;
      }
    }
  }

  return -1;
}

