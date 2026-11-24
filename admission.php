<?php 
include('auth.php'); 
    $pageTitle = "অনলাইন ভর্তি ফরম - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 
    include 'header.php'; 
?>

<style>
    :root {
        --primary-gradient: linear-gradient(135deg, #2c6e49 0%, #1a472a 100%);
        --primary-color: #2c6e49;
        --bg-light: #f4f7f6;
    }

    body { background-color: var(--bg-light); font-family: 'Hind Siliguri', sans-serif; }

    /* ইনপুট ফরম সেকশন */
    #admission-form-section { display: block; padding: 20px; }
    .admission-card { background: #fff; max-width: 1000px; margin: 0 auto; border-radius: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); overflow: hidden; }
    .form-header-banner { background: var(--primary-gradient); padding: 30px; text-align: center; color: white; }
    .section-head { font-size: 1.3rem; font-weight: 700; color: #1a472a; margin: 35px 0 20px; padding: 12px 18px; background: #f0fdf4; border-left: 6px solid #2c6e49; border-radius: 4px; }
    .form-content { padding: 30px 40px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
    .input-box { display: flex; flex-direction: column; }
    .input-box label { font-weight: 600; margin-bottom: 5px; color: #444; }
    .input-box input, .input-box select { padding: 12px; border: 2px solid #edeff2; border-radius: 10px; font-family: 'Hind Siliguri'; }
    .btn-submit { background: var(--primary-gradient); color: white; padding: 15px 60px; border: none; border-radius: 50px; font-size: 1.1rem; font-weight: bold; cursor: pointer; }

    /* প্রিন্ট লেআউট */
    #print-preview-section { display: none; background: #525659; padding: 30px 0; }
    
    .print-container {
        background: white;
        width: 210mm;
        height: 297mm;
        margin: 0 auto;
        padding: 10mm 15mm;
        position: relative;
        box-sizing: border-box;
        border: 4px double var(--primary-color);
        overflow: hidden;
    }

    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 400px; opacity: 0.06; z-index: 0; pointer-events: none; }
    
    .header-wrapper { display: flex; align-items: center; border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 15px; position: relative; z-index: 2; }
    .logo-top { width: 75px; margin-right: 15px; }
    .header-text { text-align: left; max-width: 70%; }
    .header-text h1 { color: var(--primary-color); margin: 0; font-size: 20px; line-height: 1.2; font-weight: 800; }
    .header-text p { margin: 2px 0; font-size: 12px; font-weight: 600; color: #333; }

    .photo-box { width: 100px; height: 120px; border: 1px solid #000; position: absolute; top: 0; right: 0; display: flex; align-items: center; justify-content: center; background: #fff; z-index: 5; overflow: hidden; }
    .photo-box img { width: 100%; height: 100%; object-fit: cover; }

    .form-title { text-align: center; margin: 8px 0; }
    .form-title span { background: var(--primary-color); color: #fff; padding: 3px 30px; border-radius: 50px; font-weight: bold; font-size: 14px; }

    .section-title { background: #f0f7f2; padding: 3px 10px; font-weight: bold; margin-top: 8px; border-left: 5px solid var(--primary-color); font-size: 13px; color: #1a472a; border-bottom: 1px solid #d1e7d9; }
    .field { display: flex; align-items: flex-end; margin-bottom: 7px; }
    .label { font-weight: 600; font-size: 12.5px; color: #222; white-space: nowrap; }
    .dotted-line { border-bottom: 1px dotted #555; flex-grow: 1; margin-left: 6px; height: 18px; color: #000; font-weight: bold; padding-left: 5px; font-size: 13px; }
    
    .row { display: flex; gap: 15px; }
    .col { flex: 1; }

    .signature-area { margin-top: 80px; display: flex; justify-content: space-between; }
    .sig-box { border-top: 1.5px solid #333; width: 160px; text-align: center; font-size: 12px; padding-top: 4px; font-weight: 600; }

    /* কন্ট্রোল বাটন সমূহ */
    .btn-print { position: fixed; bottom: 30px; right: 30px; background: var(--primary-color); color: white; padding: 15px 30px; border: none; border-radius: 50px; cursor: pointer; font-weight: bold; z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
    .btn-new-student { position: fixed; bottom: 30px; left: 30px; background: #333; color: white; padding: 15px 30px; border: none; border-radius: 50px; cursor: pointer; font-weight: bold; z-index: 1000; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }

    @media print {
        @page { size: A4; margin: 0; }
        body * { visibility: hidden; }
        #print-preview-section, #print-preview-section * { visibility: visible; }
        #print-preview-section { position: absolute; left: 0; top: 0; width: 210mm; background: white !important; padding: 0 !important; margin: 0 !important; }
        .print-container { border: 1.5px solid var(--primary-color) !important; margin: 0 !important; }
        .no-print { display: none !important; }
    }
</style>

<main>
    <section id="admission-form-section">
        <div class="admission-card">
            <div class="form-header-banner">
                <h2>অনলাইন ভর্তি আবেদন ফরম</h2>
                <p>নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা, সাতক্ষীরা</p>
            </div>
            <div class="form-content">
                <form id="student-admission-form">
                    <div class="section-head">📂 ১. শিক্ষার্থীর প্রাথমিক তথ্য</div>
                    <div class="form-grid">
                        <div class="input-box"><label>Roll Number</label><input type="text" name="roll_no"></div>
                        <div class="input-box"><label>ID Number</label><input type="text" name="id_no"></div>
                        <div class="input-box"><label>শ্রেণী (Class) *</label><input type="text" name="student_class" required></div>
                        <div class="input-box"><label>শিক্ষার্থীর নাম (বাংলা) *</label><input type="text" name="name_bn" required></div>
                        <div class="input-box"><label>Student Name (English) *</label><input type="text" name="name_en" required></div>
                        <div class="input-box"><label>শিক্ষার্থীর ছবি *</label><input type="file" id="photoFile" accept="image/*" required></div>
                        <div class="input-box"><label>জন্ম তারিখ *</label><input type="date" name="dob" required></div>
                        <div class="input-box"><label>জন্ম নিবন্ধন নম্বর</label><input type="text" name="birth_reg"></div>
                        <div class="input-box"><label>রক্তের গ্রুপ</label><input type="text" name="blood_group"></div>
                        <div class="input-box"><label>লিঙ্গ *</label>
                            <select name="gender" required>
                                <option value="ছাত্র">ছাত্র</option>
                                <option value="ছাত্রী">ছাত্রী</option>
                            </select>
                        </div>
                    </div>

                    <div class="section-head">👨‍👩‍👦 ২. পিতা ও মাতার তথ্য</div>
                    <div class="form-grid">
                        <div class="input-box"><label>পিতার নাম (বাংলা)</label><input type="text" name="father_bn"></div>
                        <div class="input-box"><label>Father's Name (EN)</label><input type="text" name="father_en"></div>
                        <div class="input-box"><label>পিতার এনআইডি</label><input type="text" name="father_nid"></div>
                        <div class="input-box"><label>পিতার জন্ম তারিখ</label><input type="date" name="father_dob"></div>
                        <div class="input-box"><label>মাতার নাম (বাংলা)</label><input type="text" name="mother_bn"></div>
                        <div class="input-box"><label>Mother's Name (EN)</label><input type="text" name="mother_en"></div>
                        <div class="input-box"><label>মাতার এনআইডি</label><input type="text" name="mother_nid"></div>
                        <div class="input-box"><label>মাতার জন্ম তারিখ</label><input type="date" name="mother_dob"></div>
                    </div>

                    <div class="section-head">📞 ৩. যোগাযোগ ও ঠিকানা</div>
                    <div class="form-grid">
                        <div class="input-box"><label>মোবাইল নম্বর *</label><input type="tel" name="mobile" required></div>
                        <div class="input-box"><label>নগদ নম্বর</label><input type="tel" name="nagad"></div>
                        <div class="input-box"><label>গ্রাম/রাস্তা</label><input type="text" name="village"></div>
                        <div class="input-box"><label>ইউনিয়ন</label><input type="text" name="union"></div>
                        <div class="input-box"><label>উপজেলা</label><input type="text" name="upazila"></div>
                        <div class="input-box"><label>জেলা</label><input type="text" name="district"></div>
                    </div>

                    <div class="section-head">🎓 ৪. পূর্ববর্তী প্রতিষ্ঠানের তথ্য</div>
                    <div class="form-grid">
                        <div class="input-box"><label>প্রতিষ্ঠানের নাম</label><input type="text" name="prev_school"></div>
                        <div class="input-box"><label>রেজিস্ট্রেশন/রোল নম্বর</label><input type="text" name="prev_reg"></div>
                    </div>

                    <div style="text-align:center; margin-top:30px;">
                        <button type="submit" id="submitBtn" class="btn-submit">আবেদন সাবমিট ও প্রিন্ট কপি দেখুন</button>
                    </div>
                </form>
            </div>
        </div>
    </section>

    <section id="print-preview-section">
        <button class="btn-new-student no-print" onclick="addNewStudent()">➕ নতুন শিক্ষার্থী ভর্তি করুন</button>
        <button class="btn-print no-print" onclick="window.print()">🖨️ এখনই প্রিন্ট করুন</button>

        <div class="print-container">
            <img src="logo.png" class="watermark">
            <div class="header-wrapper">
                <img src="logo.png" class="logo-top"> 
                <div class="header-text">
                    <h1>নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা</h1>
                    <p>ডাকঘর: নলতা মোবারকনগর, উপজেলা: কালিগঞ্জ, জেলা: সাতক্ষীরা</p>
                    <p>স্থাপিত: ১৯৮৮ খ্রি. | EIIN: ১১৮৭৭৮</p>
                </div>
                <div class="photo-box" id="p-photo">ছবি</div>
            </div>

            <div class="form-title"><span>ভর্তি আবেদন ফরম</span></div>

            <div class="section-title">১. শিক্ষার্থীর তথ্য</div>
            <div class="row">
                <div class="col field"><span class="label">রোল নম্বর:</span><span class="dotted-line" id="v-roll"></span></div>
                <div class="col field"><span class="label">আইডি নম্বর:</span><span class="dotted-line" id="v-id"></span></div>
            </div>
            <div class="field"><span class="label">শিক্ষার্থীর নাম (বাংলা):</span><span class="dotted-line" id="v-name-bn"></span></div>
            <div class="field"><span class="label">Student Name (EN):</span><span class="dotted-line" id="v-name-en"></span></div>
            <div class="row">
                <div class="col field"><span class="label">শ্রেণী:</span><span class="dotted-line" id="v-class"></span></div>
                <div class="col field"><span class="label">লিঙ্গ:</span><span class="dotted-line" id="v-gender"></span></div>
                <div class="col field"><span class="label">রক্তের গ্রুপ:</span><span class="dotted-line" id="v-blood"></span></div>
            </div>
            <div class="row">
                <div class="col field"><span class="label">জন্ম তারিখ:</span><span class="dotted-line" id="v-dob"></span></div>
                <div class="col field"><span class="label">জন্ম নিবন্ধন নং:</span><span class="dotted-line" id="v-reg"></span></div>
            </div>

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

            <p style="text-align:center; font-size:10px; margin-top:12px;">আবেদনের তারিখ: <span id="v-date"></span> | প্রিন্টেড বাই অনলাইন সিস্টেম</p>
        </div>
    </section>
</main>

<script>
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxVBXTUjkLgAPF3HyGhJOR-USdo-SYZ3Zeoaq8sajX-PEY7I2bMMb8_ahsLd_Mkr7jl6g/exec';
    const form = document.getElementById('student-admission-form');

    form.addEventListener('submit', e => {
        e.preventDefault();
        document.getElementById('submitBtn').disabled = true;
        document.getElementById('submitBtn').innerText = "সাবমিট হচ্ছে...";

        const file = document.getElementById('photoFile').files[0];
        const fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onload = function(event) {
            const base64 = event.target.result;
            const formData = new FormData(form);
            const obj = Object.fromEntries(formData);
            obj.base64 = base64;

            fetch(scriptURL, { method: "POST", mode: "no-cors", body: JSON.stringify(obj) })
            .then(() => {
                // ভিউতে ডাটা বসানো
                document.getElementById('v-roll').innerText = obj.roll_no;
                document.getElementById('v-id').innerText = obj.id_no;
                document.getElementById('v-name-bn').innerText = obj.name_bn;
                document.getElementById('v-name-en').innerText = obj.name_en;
                document.getElementById('v-class').innerText = obj.student_class;
                document.getElementById('v-gender').innerText = obj.gender;
                document.getElementById('v-blood').innerText = obj.blood_group;
                document.getElementById('v-dob').innerText = obj.dob;
                document.getElementById('v-reg').innerText = obj.birth_reg;
                document.getElementById('v-f-bn').innerText = obj.father_bn;
                document.getElementById('v-f-en').innerText = obj.father_en;
                document.getElementById('v-f-nid').innerText = obj.father_nid;
                document.getElementById('v-f-dob').innerText = obj.father_dob;
                document.getElementById('v-m-bn').innerText = obj.mother_bn;
                document.getElementById('v-m-en').innerText = obj.mother_en;
                document.getElementById('v-m-nid').innerText = obj.mother_nid;
                document.getElementById('v-m-dob').innerText = obj.mother_dob;
                document.getElementById('v-mobile').innerText = obj.mobile;
                document.getElementById('v-nagad').innerText = obj.nagad;
                document.getElementById('v-addr').innerText = obj.village + ", " + (obj.union || '');
                document.getElementById('v-upz').innerText = obj.upazila;
                document.getElementById('v-dist').innerText = obj.district;
                document.getElementById('v-prev-sch').innerText = obj.prev_school;
                document.getElementById('v-prev-reg').innerText = obj.prev_reg;
                document.getElementById('v-date').innerText = new Date().toLocaleDateString('bn-BD');
                document.getElementById('p-photo').innerHTML = `<img src="${base64}">`;

                // ভিউ পরিবর্তন
                document.getElementById('admission-form-section').style.display = 'none';
                document.getElementById('print-preview-section').style.display = 'block';
                window.scrollTo(0,0);
            });
        };
    });

    // নতুন শিক্ষার্থী ভর্তি করার ফাংশন
    function addNewStudent() {
        form.reset(); // ফর্মের সব ইনপুট ক্লিয়ার করা
        document.getElementById('submitBtn').disabled = false; // সাবমিট বাটন সচল করা
        document.getElementById('submitBtn').innerText = "আবেদন সাবমিট ও প্রিন্ট কপি দেখুন";
        document.getElementById('admission-form-section').style.display = 'block';
        document.getElementById('print-preview-section').style.display = 'none';
        window.scrollTo(0,0);
    }
</script>

<?php include 'footer.php'; ?>
