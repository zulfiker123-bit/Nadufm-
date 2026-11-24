<?php 
include('auth.php'); 
    $pageTitle = "আয়-ব্যয় স্মার্ট রিপোর্ট - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 

?>

<style>
    .report-card { background: #fff; padding: 25px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.08); margin-bottom: 30px; }
    .stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
    .box { padding: 20px; border-radius: 12px; text-align: center; color: white; }
    .box-income { background: #27ae60; }
    .box-expense { background: #e74c3c; }
    .box-balance { background: #2980b9; }
    .amount { font-size: 28px; font-weight: bold; display: block; }
    
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; border: 1px solid #eee; text-align: center; }
    th { background: #f8f9fa; color: #333; }
    .loading { text-align: center; padding: 50px; font-size: 18px; color: #666; }
</style>

<main>
    <section id="notice-section">
        <div class="report-card">
            <h2 style="text-align:center;">📊 মাদ্রাসার আয়-ব্যয় সারসংক্ষেপ</h2>
            
            <div id="loader" class="loading">গুগল শিট থেকে তথ্য সংগ্রহ করা হচ্ছে...</div>

            <div class="stat-grid" id="stats-area" style="display:none;">
                <div class="box box-income">
                    <span>চলতি মাসের মোট আয়</span>
                    <span class="amount" id="monthly-income">৳ ০</span>
                </div>
                <div class="box box-expense">
                    <span>চলতি মাসের মোট ব্যয়</span>
                    <span class="amount" id="monthly-expense">৳ ০</span>
                </div>
                <div class="box box-balance">
                    <span>মোট বর্তমান ক্যাশ</span>
                    <span class="amount" id="total-balance">৳ ০</span>
                </div>
            </div>

            <div id="table-area" style="display:none;">
                <h3 style="margin-top:30px;">📅 মাসিক রিপোর্ট তালিকা</h3>
                <table>
                    <thead>
                        <tr>
                            <th>মাস ও বছর</th>
                            <th>মোট আয়</th>
                            <th>মোট ব্যয়</th>
                            <th>উদ্বৃত্ত/ঘাটতি</th>
                        </tr>
                    </thead>
                    <tbody id="report-table-body"></tbody>
                </table>
            </div>
        </div>

        <script>
            // আপনার দেওয়া নতুন CSV লিঙ্ক
            const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR3FdKRAA46EvP4MBCPiqwJ0tVAaxkbCBJbExtNePmOk781BwSQm_gf1xa7xE-YqNj_-XlEYrMpx6TL/pub?output=csv';

            async function loadReport() {
                try {
                    const response = await fetch(csvUrl);
                    const data = await response.text();
                    const rows = data.split('\n').slice(1); // হেডার বাদ দিয়ে

                    let totalIncome = 0;
                    let totalExpense = 0;
                    let monthlySummary = {};
                    
                    const now = new Date();
                    const currentMonthYear = now.toLocaleString('bn-BD', { month: 'long', year: 'numeric' });

                    rows.forEach(row => {
                        const cols = row.split(',');
                        if(cols.length < 5) return;

                        const dateStr = cols[0].trim();
                        const income = parseFloat(cols[2]) || 0;
                        const expense = parseFloat(cols[4]) || 0;
                        
                        const dateObj = new Date(dateStr);
                        if (!isNaN(dateObj)) {
                            const monthKey = dateObj.toLocaleString('bn-BD', { month: 'long', year: 'numeric' });
                            
                            totalIncome += income;
                            totalExpense += expense;

                            if (!monthlySummary[monthKey]) {
                                monthlySummary[monthKey] = { income: 0, expense: 0 };
                            }
                            monthlySummary[monthKey].income += income;
                            monthlySummary[monthKey].expense += expense;
                        }
                    });

                    // কার্ড আপডেট
                    const currentStats = monthlySummary[currentMonthYear] || { income: 0, expense: 0 };
                    document.getElementById('monthly-income').innerText = '৳ ' + currentStats.income.toLocaleString('bn-BD');
                    document.getElementById('monthly-expense').innerText = '৳ ' + currentStats.expense.toLocaleString('bn-BD');
                    document.getElementById('total-balance').innerText = '৳ ' + (totalIncome - totalExpense).toLocaleString('bn-BD');

                    // টেবিল তৈরি
                    let tableHTML = '';
                    for (let month in monthlySummary) {
                        const balance = monthlySummary[month].income - monthlySummary[month].expense;
                        tableHTML += `<tr>
                            <td>${month}</td>
                            <td style="color:green; font-weight:bold;">৳ ${monthlySummary[month].income.toLocaleString('bn-BD')}</td>
                            <td style="color:red; font-weight:bold;">৳ ${monthlySummary[month].expense.toLocaleString('bn-BD')}</td>
                            <td style="color:blue;">৳ ${balance.toLocaleString('bn-BD')}</td>
                        </tr>`;
                    }

                    document.getElementById('report-table-body').innerHTML = tableHTML;
                    document.getElementById('loader').style.display = 'none';
                    document.getElementById('stats-area').style.display = 'grid';
                    document.getElementById('table-area').style.display = 'block';

                } catch (error) {
                    document.getElementById('loader').innerHTML = '<span style="color:red;">ডেটা লোড করতে ব্যর্থ! অনুগ্রহ করে শিট পাবলিশ সেটিংস চেক করুন।</span>';
                }
            }

            loadReport();
        </script>


    </section>

</main>

<?php include 'footer.php'; ?>
