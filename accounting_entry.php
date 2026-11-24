<?php 
include('auth.php'); 
    $pageTitle = "হিসাব এন্ট্রি - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 
  
?>

<style>
    .input-box {
        max-width: 900px;
        margin: 20px auto;
        background: #fff;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 5px 25px rgba(0,0,0,0.1);
        border-top: 5px solid #2c3e50;
    }
    .form-title {
        text-align: center;
        margin-bottom: 25px;
        color: #2c3e50;
        font-size: 24px;
        font-weight: bold;
    }
    .entry-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 25px;
        margin-bottom: 20px;
    }
    .section-label {
        font-size: 18px;
        font-weight: bold;
        margin-bottom: 15px;
        padding-bottom: 5px;
        border-bottom: 2px solid #eee;
    }
    .income-label { color: #27ae60; }
    .expense-label { color: #e74c3c; }

    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 600; color: #555; }
    .form-group input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 15px;
        transition: 0.3s;
    }
    .btn-submit {
        width: 100%;
        background: #2c3e50;
        color: #fff;
        padding: 15px;
        border: none;
        border-radius: 6px;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
    }
    .btn-submit:hover { background: #1a252f; }
    #status {
        margin-top: 15px;
        padding: 10px;
        text-align: center;
        border-radius: 5px;
        display: none;
    }
    @media (max-width: 768px) {
        .entry-columns { grid-template-columns: 1fr; }
    }
</style>

<main>
    <section id="notice-section">
        <div class="input-box">
            <div class="form-title">  নলতা আহছানিয়া দারুল উলুম ফাজিল ডিগ্রী  মাদ্রাসা আয়-ব্যয় এন্ট্রি ফর্ম</div>
            
            <form id="accounting-form">
                <div class="form-group" style="max-width: 300px; margin: 0 auto 25px auto;">
                    <label style="text-align: center;">📅 লেনদেনের তারিখ</label>
                    <input type="date" name="date" id="date-input" required>
                </div>

                <div class="entry-columns">
                    <div class="income-side">
                        <div class="section-label income-label">আয় (Credit)</div>
                        <div class="form-group">
                            <label>আয়ের উৎস</label>
                            <input type="text" name="income_source" placeholder="উৎস লিখুন (যেমন: দান)">
                        </div>
                        <div class="form-group">
                            <label>আয়ের পরিমাণ (৳)</label>
                            <input type="number" name="income_amount" placeholder="0">
                        </div>
                    </div>

                    <div class="expense-side">
                        <div class="section-label expense-label">ব্যয় (Debit)</div>
                        <div class="form-group">
                            <label>ব্যয়ের খাত</label>
                            <input type="text" name="expense_sector" placeholder="খাত লিখুন (যেমন: বিদ্যুৎ বিল)">
                        </div>
                        <div class="form-group">
                            <label>ব্যয়ের পরিমাণ (৳)</label>
                            <input type="number" name="expense_amount" placeholder="0">
                        </div>
                    </div>
                </div>
<button type="submit" class="btn-submit" id="submit-btn"> Save  </button>
                
                <div style="display: flex; gap: 10px; margin-top: 15px;">
                    <a href="dashboard.php" style="flex: 1; text-decoration: none;">
                        <button type="button" style="width: 100%; background: #34495e; color: #fff; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
Go to Dashboard
                        </button>
                    </a>
                    <a href="index.php" style="flex: 1; text-decoration: none;">
                        <button type="button" style="width: 100%; background: #7f8c8d; color: #fff; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                            🏠 Home Page
                        </button>
                    </a>
                </div>

                <div id="status"></div>
            </form>
        </div>
    </section>
</main>

            </form>
        </div>

    </section>

</main>

<script>
    document.getElementById('date-input').valueAsDate = new Date();

    // আপনার দেওয়া সঠিক Apps Script URL এখানে বসানো হয়েছে
    const scriptURL = 'https://script.google.com/macros/s/AKfycbx3otv2ll9TfSrGJStOCPSK98FcvUyhkG_Ry00nu_hwO2gAWC9g7diWUZ_5MwVqqqnS/exec'; 
    
    const form = document.getElementById('accounting-form');
    const status = document.getElementById('status');
    const btn = document.getElementById('submit-btn');

    form.addEventListener('submit', e => {
        e.preventDefault();
        
        btn.disabled = true;
        btn.innerText = "ডাটা পাঠানো হচ্ছে...";
        status.style.display = "block";
        status.style.background = "#f0f0f0";
        status.style.color = "#333";
        status.innerText = "অপেক্ষা করুন, ডাটা প্রসেস হচ্ছে...";

        // খালি ইনপুট চেক করে ০ বসানো
        let formData = new FormData(form);
        if(!formData.get('income_amount')) formData.set('income_amount', '0');
        if(!formData.get('expense_amount')) formData.set('expense_amount', '0');

        fetch(scriptURL, { method: 'POST', body: formData})
            .then(response => {
                btn.disabled = false;
                btn.innerText = "শিটে সেভ করুন";
                status.style.background = "#d4edda";
                status.style.color = "#155724";
                status.innerText = "অভিনন্দন! সফলভাবে সেভ হয়েছে।";
                form.reset();
                document.getElementById('date-input').valueAsDate = new Date();
                setTimeout(() => { status.style.display = "none"; }, 5000);
            })
            .catch(error => {
                btn.disabled = false;
                btn.innerText = "আবার চেষ্টা করুন";
                status.style.background = "#f8d7da";
                status.style.color = "#721c24";
                status.innerText = "দুঃখিত! কানেকশন ত্রুটি হয়েছে। Apps Script এর 'Anyone' এক্সেস চেক করুন।";
                console.error('Error!', error.message);
            });
    });
</script>

<?php  ?>
