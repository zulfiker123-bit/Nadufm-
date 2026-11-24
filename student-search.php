<?php 
    include 'auth.php'; // পাসওয়ার্ড সুরক্ষা
    $pageTitle = "শিক্ষার্থী তথ্য অনুসন্ধান - নলতা আহছানিয়া দারুল উলুম মাদ্রাসা"; 
  
?>

<style>
    :root {
        --primary-gradient: linear-gradient(135deg, #2c6e49 0%, #1a472a 100%);
        --primary-color: #2c6e49;
        --bg-light: #f4f7f6;
    }
    body { background-color: var(--bg-light); font-family: 'Hind Siliguri', sans-serif; }

    /* সার্চ বক্স ডিজাইন */
    .search-section { padding: 40px 20px; text-align: center; }
    .search-card { background: white; max-width: 600px; margin: 0 auto; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
    .search-input { width: 70%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; font-size: 16px; outline: none; }
    .search-btn { background: var(--primary-gradient); color: white; padding: 12px 25px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; }

    #loading { display: none; margin-top: 15px; color: var(--primary-color); font-weight: bold; }

    /* প্রিন্ট লেআউট */
    #print-preview-section { display: none; background: #525659; padding: 30px 0; }
    
    .print-container {
        background: white; width: 210mm; height: 297mm; margin: 0 auto; padding: 10mm 15mm;
        position: relative; box-sizing: border-box; border: 4px double var(--primary-color); overflow: hidden;
    }

    .header-wrapper { display: flex; align-items: center; border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 15px; position: relative; z-index: 2; }
    .logo-top { width: 75px; margin-right: 15px; }
    .header-text h1 { color: var(--primary-color); margin: 0; font-size: 20px; font-weight: 800; }
    .photo-box { width: 100px; height: 120px; border: 1px solid #000; position: absolute; top: 0; right: 0; display: flex; align-items: center; justify-content: center; background: #fff; overflow: hidden; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }

    .form-title { text-align: center; margin: 8px 0; }
    .form-title span { background: var(--primary-color); color: #fff; padding: 3px 30px; border-radius: 50px; font-weight: bold; font-size: 14px; }

    .section-title { background: #f0f7f2; padding: 3px 10px; font-weight: bold; margin-top: 8px; border-left: 5px solid var(--primary-color); font-size: 13px; color: #1a472a; border-bottom: 1px solid #d1e7d9; }
    .field { display: flex; align-items: flex-end; margin-bottom: 7px; }
    .label { font-weight: 600; font-size: 12.5px; color: #222; white-space: nowrap; }
    .dotted-line { border-bottom: 1px dotted #555; flex-grow: 1; margin-left: 6px; height: 18px; color: #000; font-weight: bold; padding-left: 5px; font-size: 13px; }
    
    .row { display: flex; gap: 15px; }
    .col { flex: 1; }
    .signature-area { margin-top: 35px; display: flex; justify-content: space-between; }
    .sig-box { border-top: 1.5px solid #333; width: 160px; text-align: center; font-size: 12px; padding-top: 4px; font-weight: 600; }
    
        .search-card { background: white; max-width: 600px; margin: 30px auto; padding: 30px; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); text-align: center; }
    #multiple-results { display: none; max-width: 900px; margin: 20px auto; background: white; padding: 20px; border-radius: 12px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); }
    .res-table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; }
    .res-table th, .res-table td { padding: 12px; border: 1px solid #eee; text-align: left; }
    .res-table tr:hover { background: #f9fefb; }
    .view-btn { background: #2c6e49; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; }

    @media print {
        @page { size: A4; margin: 0; }
        body * { visibility: hidden; }
        #print-preview-section, #print-preview-section * { visibility: visible; }
        #print-preview-section { position: absolute; left: 0; top: 0; width: 210mm; background: white !important; }
        .no-print { display: none !important; }
    }
</style>

<main>
    <section class="search-section no-print">
        <div class="search-card">
            <h2 style="color: var(--primary-color);">🔍 শিক্ষার্থী তথ্য অনুসন্ধান</h2>
            <div style="margin-top: 20px;">
                <input type="text" id="searchQuery" class="search-input" placeholder="ID / নাম / মোবাইল / জন্ম নিবন্ধন">
                <button onclick="searchStudent()" id="srchBtn" class="search-btn">সার্চ করুন</button>
            </div>
            <div id="loading" style="display:none; margin-top:10px;">তথ্য খোঁজা হচ্ছে...</div>
        </div>
    </section>

    <section id="multiple-results" class="no-print">
        <h3>একাধিক শিক্ষার্থী পাওয়া গেছে:</h3>
        <table class="res-table">
            <thead>
                <tr style="background: #f1f8f4;">
                    <th>নাম (English)</th>
                    <th>আইডি</th>
                    <th>পিতার নাম</th>
                    <th>অ্যাকশন</th>
                </tr>
            </thead>
            <tbody id="result-list"></tbody>
        </table>
    </section>

    <section id="print-preview-section">
        <div style="text-align: center; margin-bottom: 15px;" class="no-print">
            <button onclick="window.print()" class="search-btn" style="background: #34495e;">🖨️ এখনই প্রিন্ট করুন</button>
            <button onclick="location.reload()" class="search-btn" style="background: #c0392b;">নতুন সার্চ</button>
        </div>

        <div class="print-container">
            <div class="header-wrapper">
                <img src="logo.png" class="logo-top"> 
                <div class="header-text">
                    <h1>নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা</h1>
                    <p>ডাকঘর: নলতা মোবারকনগর, উপজেলা: কালিগঞ্জ, জেলা: সাতক্ষীরা</p>
                    <p>স্থাপিত: ১৯৮৮ খ্রি. | EIIN: ১১৮৭৭৮</p>
                </div>
                <div class="photo-box" id="v-photo">ছবি</div>
            </div>

            <div class="form-title"><span>শিক্ষার্থী ব্যক্তিগত তথ্য কার্ড</span></div>

            <div class="section-title">১. শিক্ষার্থীর তথ্য</div>
            <div class="row">
                <div class="col field"><span class="label">আইডি নম্বর:</span><span class="dotted-line" id="v-id"></span></div>
                <div class="col field"><span class="label">লিঙ্গ:</span><span class="dotted-line" id="v-gender"></span></div>
            </div>
            <div class="field"><span class="label">শিক্ষার্থীর নাম (বাংলা):</span><span class="dotted-line" id="v-name-bn"></span></div>
            <div class="field"><span class="label">Student Name (EN):</span><span class="dotted-line" id="v-name-en"></span></div>
            <div class="row">
                <div class="col field"><span class="label">রক্তের গ্রুপ:</span><span class="dotted-line" id="v-blood"></span></div>
                <div class="col field"><span class="label">জন্ম তারিখ:</span><span class="dotted-line" id="v-dob"></span></div>
            </div>
            <div class="field"><span class="label">জন্ম নিবন্ধন নং:</span><span class="dotted-line" id="v-reg"></span></div>

            <div class="section-title">২. পিতা ও মাতার তথ্য</div>
            <div class="field"><span class="label">পিতার নাম (বাংলা):</span><span class="dotted-line" id="v-f-bn"></span></div>
            <div class="field"><span class="label">Father's Name (EN):</span><span class="dotted-line" id="v-f-en"></span></div>
            <div class="row">
                <div class="col field"><span class="label">পিতার এনআইডি নং:</span><span class="dotted-line" id="v-f-nid"></span></div>
                <div class="col field"><span class="label">পিতার জন্ম তারিখ:</span><span class="dotted-line" id="v-f-dob"></span></div>
            </div>
            <div class="field"><span class="label">মাতার নাম (বাংলা):</span><span class="dotted-line" id="v-m-bn"></span></div>
            <div class="field"><span class="label">Mother's Name (EN):</span><span class="dotted-line" id="v-m-en"></span></div>
            <div class="row">
                <div class="col field"><span class="label">মাতার এনআইডি নং:</span><span class="dotted-line" id="v-m-nid"></span></div>
                <div class="col field"><span class="label">মাতার জন্ম তারিখ:</span><span class="dotted-line" id="v-m-dob"></span></div>
            </div>

            <div class="section-title">৩. যোগাযোগ ও ঠিকানা</div>
            <div class="row">
                <div class="col field"><span class="label">মোবাইল নম্বর:</span><span class="dotted-line" id="v-mobile"></span></div>
                <div class="col field"><span class="label">নগদ নম্বর:</span><span class="dotted-line" id="v-nagad"></span></div>
            </div>
            <div class="field"><span class="label">গ্রাম ও ইউনিয়ন:</span><span class="dotted-line" id="v-addr"></span></div>
            <div class="row">
                <div class="col field"><span class="label">উপজেলা:</span><span class="dotted-line" id="v-upz"></span></div>
                <div class="col field"><span class="label">জেলা:</span><span class="dotted-line" id="v-dist"></span></div>
            </div>

            <div class="section-title">৪. পূর্ববর্তী প্রতিষ্ঠানের তথ্য</div>
            <div class="row">
                <div class="col field"><span class="label">প্রতিষ্ঠানের নাম:</span><span class="dotted-line" id="v-prev-sch"></span></div>
                <div class="col field"><span class="label">রেজিস্ট্রেশন/রোল:</span><span class="dotted-line" id="v-prev-reg"></span></div>
            </div>

            <div class="signature-area">
                <div class="sig-box">অভিভাবকের স্বাক্ষর</div>
                <div class="sig-box">আবেদনকারীর স্বাক্ষর</div>
                <div class="sig-box">অধ্যক্ষ/অফিস স্বাক্ষর</div>
            </div>
            <p style="text-align:center; font-size:10px; margin-top:15px;">সাবমিট টাইম: <span id="v-time"></span> | প্রিন্টেড বাই অনলাইন সিস্টেম</p>
        </div>
    </section>
</main>

<script>
    let allData = [];

    function searchStudent() {
        const query = document.getElementById('searchQuery').value;
        if (!query) return alert("অনুগ্রহ করে সার্চ বক্সে কিছু লিখুন!");

        document.getElementById('loading').style.display = 'block';
        document.getElementById('multiple-results').style.display = 'none';
        document.getElementById('print-preview-section').style.display = 'none';

        const scriptURL = 'https://script.google.com/macros/s/AKfycbze9QMzRJcCadXzDKcU0W12nigMYg0fOKk_4zY5JFWwo7R10L3PYx0YnjVNZXiWtA_npg/exec';

        fetch(`${scriptURL}?query=${encodeURIComponent(query)}`)
            .then(res => res.json())
            .then(data => {
                allData = data;
                if (data.length === 0) {
                    alert("দুঃখিত, কোনো তথ্য পাওয়া যায়নি!");
                } else if (data.length === 1) {
                    displayProfile(0); // একজন হলে সরাসরি প্রোফাইল
                } else {
                    // একাধিক হলে টেবিল দেখাবে
                    const list = document.getElementById('result-list');
                    list.innerHTML = "";
                    data.forEach((item, index) => {
                        list.innerHTML += `
                            <tr>
                                <td>${item.name_en}</td>
                                <td>${item.id}</td>
                                <td>${item.f_name_en}</td>
                                <td><button onclick="displayProfile(${index})" class="view-btn">দেখুন</button></td>
                            </tr>`;
                    });
                    document.getElementById('multiple-results').style.display = 'block';
                }
            })
            .finally(() => {
                document.getElementById('loading').style.display = 'none';
            });
    }

    function displayProfile(index) {
    const d = allData[index];

    // ১. শিক্ষার্থীর তথ্য
    setText('v-id', d.id);
    setText('v-name-bn', d.name_bn);
    setText('v-name-en', d.name_en);
    setText('v-gender', d.gender);
    setText('v-blood', d.blood);
    setText('v-dob', d.dob);
    setText('v-reg', d.birth_reg);

    // ২. পিতা ও মাতার তথ্য
    setText('v-f-bn', d.f_name_bn);
    setText('v-f-en', d.f_name_en);
    setText('v-f-nid', d.f_nid);
    setText('v-f-dob', d.f_dob);
    setText('v-m-bn', d.m_name_bn);
    setText('v-m-en', d.m_name_en);
    setText('v-m-nid', d.m_nid);
    setText('v-m-dob', d.m_dob);

    // ৩. যোগাযোগ ও ঠিকানা
    setText('v-mobile', d.mobile);
    setText('v-nagad', d.nagad);
    document.getElementById('v-addr').innerText = (d.village || '') + ", " + (d.union || '');
    setText('v-upz', d.upazila);
    setText('v-dist', d.district);

    // ৪. পূর্ববর্তী তথ্য
    setText('v-prev-sch', d.p_school);
    setText('v-prev-reg', d.p_reg);
    setText('v-time', d.timestamp);
    
   // ছবি দেখানোর কোড
const photoBox = document.getElementById('v-photo');
if (d.photo && d.photo !== "") {
    // এখানে চেক করুন ফটো লিংকটি সঠিক কি না
    photoBox.innerHTML = `<img src="${d.photo}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.innerHTML='ছবি লোড হয়নি'">`;
} else {
    photoBox.innerHTML = "ছবি নেই";
}


    document.getElementById('multiple-results').style.display = 'none';
    document.getElementById('print-preview-section').style.display = 'block';
}

// একটি ছোট হেল্পার ফাংশন যাতে কোড পরিষ্কার থাকে
function setText(id, value) {
    const el = document.getElementById(id);
    if(el) el.innerText = value || '---';
}

</script>


<?php include 'footer.php'; ?>
