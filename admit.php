<?php 
include('auth.php'); 
    $pageTitle = "এডমিট কার্ড ডাউনলোড - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 
    include 'header.php'; 
?>

<style>
    :root {
        --primary-color: #2c6e49;
        --secondary-color: #1a472a;
    }

    .search-container { max-width: 500px; margin: 50px auto; padding: 30px; background: #fff; border-radius: 15px; box-shadow: 0 5px 20px rgba(0,0,0,0.1); text-align: center; }
    .search-container h2 { color: var(--primary-color); margin-bottom: 20px; }
    .input-group { margin-bottom: 15px; text-align: left; }
    .input-group label { display: block; font-weight: bold; margin-bottom: 5px; }
    .input-group input, .input-group select { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; box-sizing: border-box; }
    .btn-search { width: 100%; padding: 12px; background: var(--primary-color); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 16px; }

    /* এডমিট কার্ড ডিজাইন */
    #admit-card-result { display: none; margin-top: 30px; }
    .admit-card { width: 180mm; margin: 0 auto; border: 4px double var(--primary-color); padding: 15px; position: relative; background: #fff; }
    .admit-header { display: flex; align-items: center; border-bottom: 2px solid var(--primary-color); padding-bottom: 10px; margin-bottom: 15px; }
    .admit-header img { width: 60px; margin-right: 15px; }
    .admit-title { text-align: center; flex-grow: 1; }
    .admit-title h1 { font-size: 18px; margin: 0; color: var(--primary-color); }
    .admit-title p { font-size: 12px; margin: 2px 0; }
    
    .admit-body { display: flex; gap: 20px; }
    .student-info { flex-grow: 1; }
    .info-row { display: flex; margin-bottom: 8px; border-bottom: 1px dotted #ccc; }
    .info-label { width: 120px; font-weight: bold; font-size: 14px; }
    .info-value { flex-grow: 1; font-size: 14px; }
    
    .student-photo { width: 100px; height: 110px; border: 1px solid #000; overflow: hidden; }
    .student-photo img { width: 100%; height: 100%; object-fit: cover; }

    .admit-footer { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 20px; }
    .sig { border-top: 1px solid #000; width: 130px; text-align: center; font-size: 12px; font-weight: bold; }

    .btn-print-admit { background: #e67e22; color: white; padding: 10px 25px; border: none; border-radius: 5px; cursor: pointer; margin-top: 20px; font-weight: bold; }

    @media print {
        header, footer, .search-container, .btn-print-admit, .no-print { display: none !important; }
        body { background: white; }
        #admit-card-result { display: block !important; margin: 0; }
        .admit-card { width: 100%; border: 2px solid #000; }
    }
</style>

<main>
    <div class="search-container no-print">
        <h2>এডমিট কার্ড ডাউনলোড</h2>
        <form id="searchForm">
            <div class="input-group">
                <label>শ্রেণী (Class)</label>
                <input type="text" id="search_class" placeholder="উদা: ফাজিল ১ম বর্ষ" required>
            </div>
            <div class="input-group">
                <label>রোল নম্বর (Roll)</label>
                <input type="text" id="search_roll" placeholder="রোল লিখুন" required>
            </div>
            <button type="submit" class="btn-search" id="searchBtn">তথ্য খুঁজুন</button>
        </form>
        <p id="error-msg" style="color:red; display:none; margin-top:15px;">দুঃখিত! কোনো তথ্য পাওয়া যায়নি।</p>
    </div>

    <div id="admit-card-result">
        <div class="admit-card">
            <div class="admit-header">
                <img src="logo.png" alt="Logo">
                <div class="admit-title">
                    <h1>নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা</h1>
                    <p>ডাকঘর: নলতা মোবারকনগর, কালিগঞ্জ, সাতক্ষীরা</p>
                    <div style="margin-top:5px;"><span style="background:var(--primary-color); color:#fff; padding:2px 15px; border-radius:20px; font-size:12px;">প্রবেশপত্র (Admit Card)</span></div>
                </div>
            </div>

            <div class="admit-body">
                <div class="student-info">
                    <div class="info-row"><span class="info-label">শিক্ষার্থীর নাম:</span><span class="info-value" id="res_name"></span></div>
                    <div class="info-row"><span class="info-label">পিতার নাম:</span><span class="info-value" id="res_father"></span></div>
                    <div class="info-row"><span class="info-label">শ্রেণী:</span><span class="info-value" id="res_class"></span></div>
                    <div class="info-row"><span class="info-label">রোল নম্বর:</span><span class="info-value" id="res_roll"></span></div>
                    <div class="info-row"><span class="info-label">আইডি নম্বর:</span><span class="info-value" id="res_id"></span></div>
                </div>
                <div class="student-photo" id="res_photo">
                    </div>
            </div>

            <div class="admit-footer">
                <div class="sig">শিক্ষার্থীর স্বাক্ষর</div>
                <div class="sig">পরীক্ষা নিয়ন্ত্রক</div>
                <div class="sig">অধ্যক্ষের স্বাক্ষর</div>
            </div>
        </div>
        
        <div style="text-align:center;">
            <button class="btn-print-admit no-print" onclick="window.print()">🖨️ প্রিন্ট করুন</button>
        </div>
    </div>
</main>

<script>
    // আপনার গুগল অ্যাপস স্ক্রিপ্ট ইউআরএল (ভর্তি ফর্মের স্ক্রিপ্টটিই কাজ করবে যদি সেখানে সার্চ ফাংশন থাকে)
    const scriptURL = 'https://script.google.com/macros/s/AKfycbxZR0c6PLITftRWpUKe0usjXg-orylIVmTxQ0lYwolDKx1G84wIb_sg8RxDqAoVg7Wh1g/exec';

    document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const roll = document.getElementById('search_roll').value;
        const sClass = document.getElementById('search_class').value;
        const btn = document.getElementById('searchBtn');
        const errorMsg = document.getElementById('error-msg');

        btn.disabled = true;
        btn.innerText = "খোঁজা হচ্ছে...";
        errorMsg.style.display = "none";

        // ডাটা সার্চ করার জন্য রিকোয়েস্ট (গুগল স্ক্রিপ্টে 'action=getStudent' থাকতে হবে)
        fetch(`${scriptURL}?action=getStudent&roll=${roll}&class=${sClass}`)
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                document.getElementById('res_name').innerText = data.name;
                document.getElementById('res_father').innerText = data.father;
                document.getElementById('res_class').innerText = data.class;
                document.getElementById('res_roll').innerText = data.roll;
                document.getElementById('res_id').innerText = data.id;
                document.getElementById('res_photo').innerHTML = `<img src="${data.photo}">`;
                
                document.querySelector('.search-container').style.display = 'none';
                document.getElementById('admit-card-result').style.display = 'block';
            } else {
                errorMsg.style.display = "block";
                btn.disabled = false;
                btn.innerText = "তথ্য খুঁজুন";
            }
        })
        .catch(error => {
            console.error('Error!', error.message);
            errorMsg.innerText = "সার্ভার সমস্যা! আবার চেষ্টা করুন।";
            errorMsg.style.display = "block";
            btn.disabled = false;
            btn.innerText = "তথ্য খুঁজুন";
        });
    });
</script>

<?php include 'footer.php'; ?>
