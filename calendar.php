<?php 
    $pageTitle = "শিক্ষাপঞ্জি ও ক্যালেন্ডার ২০২৬ - নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা";
    include 'header.php'; 
?>

<style>
    :root {
        --gov-red: #da251d; 
        --gov-green: #006a4e; 
        --bright-gold: #d4af37;
    }

    body { background: #f4f6f9; font-family: 'Kalpurush', sans-serif !important; }

    #calendar-full-view { padding: 40px 15px; }

    .main-wrapper {
        max-width: 1380px;
        margin: 0 auto;
        background: #fff;
        border: 4px solid var(--gov-red);
        padding: 30px;
        border-radius: 15px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }

    .madrasha-header {
        display: flex;
        align-items: center;
        background: linear-gradient(135deg, var(--gov-green), #0a3d1d);
        padding: 5px;
        border-radius: 12px;
        border-bottom: 5px solid var(--bright-gold);
        margin-bottom: 10px;
        color: white;
        gap: 10px;
    }

    .m-logo-frame img { width: 90px; height: 90px; border-radius: 50%; border: 3px solid var(--bright-gold); background: #fff; }
    .header-text h1 { margin: 0; font-size: 30px; color: #fff; }

    .calendar-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 5px;
    }

    .month-box { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: #fff; }
    .month-title { background: var(--gov-green); color: white; padding: 8px; text-align: center; font-weight: bold; font-size: 22px; }
    
    .week-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        background: #f1f1f1;
        font-size: 20px;
        text-align: center;
        padding: 5px 0;
        font-weight: bold;
    }
    .week-days div:nth-child(6) { color: var(--gov-red); } /* শুক্র */
    .week-days div:nth-child(7) { color: #005a32; } /* শনি */

    .days-grid { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 18px; }
    .day-cell { padding: 5px 0; border-bottom: 1px solid #eee; border-right: 1px solid #eee; min-height: 25px; position: relative; }

    /* ছুটির স্টাইল */
    .fri-red { color: var(--gov-red); font-weight: bold; background: #fff5f5; }
    .sat-green { color: var(--gov-green); font-weight: bold; background: #f0fdf4; }
    
    /* সাধারণ ছুটির লাল গোল চিহ্ন */
    .hld-circle {
        background: var(--gov-red);
        color: white;
        border-radius: 50%;
        width: 26px; height: 26px; line-height: 26px;
        display: inline-block; font-weight: bold;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }

    .holiday-table-container { margin-top: 35px; }
    .h-table { width: 100%; border-collapse: collapse; background: #fff; border: 2px solid var(--gov-green); }
    .h-table th, .h-table td { border: 1px solid #ddd; padding: 12px; text-align: center; font-size: 15px; }
    .h-table th { background: var(--gov-green); color: white; }
    .text-left { text-align: left !important; }

    .legend-footer {
        margin-top: 15px;
        display: flex;
        justify-content: center;
        gap: 10px;
        font-weight: bold;
        padding: 5px;
        background: #fff;
        border-radius: 10px;
    }

    @media (max-width: 1200px) { .calendar-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 600px) { .calendar-grid { grid-template-columns: repeat(1, 1fr); } }
</style>

<div id="calendar-full-view">
    <div class="main-wrapper">
        
        <div class="madrasha-header">
            <div class="m-logo-frame"><img src="logo.png" alt="Logo"></div>
            <div class="header-text">
                <h1>নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা</h1>
      <h2 style=" text-align: center;">একাডেমিক ক্যালেন্ডার ২০২৬ </h2>
                <p style=" text-align: center;"> নলতা মোবারকনগর , কালিগঞ্জ, সাতক্ষীরা </p>
            </div>
        </div>

        <div class="calendar-grid">
            <?php 
                function render_calendar($title, $start, $total, $h_list = []) {
                    $weeks = ['রবি', 'সোম', 'মঙ্গল', 'বুধ', 'বৃহ', 'শুক্র', 'শনি'];
                    echo '<div class="month-box"><div class="month-title">'.$title.'</div>';
                    echo '<div class="week-days">';
                    foreach($weeks as $w) echo '<div>'.$w.'</div>';
                    echo '</div><div class="days-grid">';
                    
                    for($i=0; $i<$start; $i++) echo '<div class="day-cell"></div>';
                    
                    for($d=1; $d<=$total; $d++) {
                        $pos = ($d + $start - 1) % 7; 
                        $class = "day-cell";
                        if($pos == 5) $class .= " fri-red"; 
                        if($pos == 6) $class .= " sat-green"; 
                        
                        echo '<div class="'.$class.'">';
                        if(in_array($d, $h_list)) {
                            // যদি শুক্রবার বা শনিবার হয়, তবুও গোল দাগ থাকবে যেহেতু আপনি সব ছুটি লাল চেয়েছেন
                            echo '<span class="hld-circle">'.$d.'</span>';
                        } else {
                            echo $d;
                        }
                        echo '</div>';
                    }
                    echo '</div></div>';
                }

                // ২০২৬ সালের সঠিক বার অনুযায়ী ডেটা
                render_calendar("জানুয়ারি", 4, 31, [17]);
                render_calendar("ফেব্রুয়ারি", 0, 28, array_merge([4, 5], range(15, 28)));
                render_calendar("মার্চ", 0, 31, range(1, 26));
                render_calendar("এপ্রিল", 3, 30, [14]);
                render_calendar("মে", 5, 31, array_merge([1], range(24, 31)));
                render_calendar("জুন", 1, 30, array_merge(range(1, 11), [16, 26]));
                render_calendar("জুলাই", 3, 31, []);
                render_calendar("আগস্ট", 6, 31, [5, 12, 26, 27]);
                render_calendar("সেপ্টেম্বর", 2, 30, [4, 24]);
                render_calendar("অক্টোবর", 4, 31, [20, 21, 22]);
                render_calendar("নভেম্বর", 0, 30, []);
                render_calendar("ডিসেম্বর", 2, 31, range(13, 24));
            ?>
        </div>

        <div class="holiday-table-container">
            <table class="h-table">
                <thead>
                    <tr>
                        <th>ক্র.</th>
                        <th>ছুটির উপলক্ষ</th>
                        <th>তারিখ ও বার</th>
                        <th>দিন</th>
                    </tr>
                </thead>
                <tbody>
                    <tr><td>১</td><td class="text-left">শবে-ই-মিরাজ</td><td>১৭ জানুয়ারি (শনিবার)</td><td>০১</td></tr>
                    <tr><td>২</td><td class="text-left">শবে-ই-বরাত</td><td>০৪-০৫ ফেব্রুয়ারি</td><td>০২</td></tr>
                    <tr><td>৩</td><td class="text-left">রমজান, শহীদ দিবস, শবে-কদর, ঈদ-উল-ফিতর ও স্বাধীনতা দিবস</td><td>১৫ ফেব্রুয়ারি - ২৬ মার্চ</td><td>৩০</td></tr>
                    <tr><td>৪</td><td class="text-left">বাংলা নববর্ষ</td><td>১৪ এপ্রিল (মঙ্গলবার)</td><td>০১</td></tr>
                    <tr><td>৫</td><td class="text-left">মে দিবস ও বুদ্ধ পূর্ণিমা</td><td>০১ মে (শুক্রবার)</td><td>-</td></tr>
                    <tr><td>৬</td><td class="text-left">ঈদুল আজহা ও গ্রীষ্মকালীন অবকাশ</td><td>২৪ মে - ১১ জুন</td><td>১৫</td></tr>
                    <tr><td>৭</td><td class="text-left">হিজরি নববর্ষ</td><td>১৬ জুন (মঙ্গলবার)</td><td>০১</td></tr>
                    <tr><td>৮</td><td class="text-left">পবিত্র আশুরা</td><td>২৬ জুন (শুক্রবার)</td><td>-</td></tr>
                    <tr><td>৯</td><td class="text-left">জুলাই গণঅভ্যুত্থান দিবস</td><td>০৫ আগস্ট (বুধবার)</td><td>০১</td></tr>
                    <tr><td>১০</td><td class="text-left">আখেরি চাহার সোম্বা</td><td>১২ আগস্ট (বুধবার)</td><td>০১</td></tr>
                    <tr><td>১১</td><td class="text-left">পবিত্র ঈদে মিলাদুন্নবী (সা.)</td><td>২৬ - ২৭ আগস্ট</td><td>০২</td></tr>
                    <tr><td>১২</td><td class="text-left">জন্মাষ্টমী</td><td>০৪ সেপ্টেম্বর (শুক্রবার)</td><td>-</td></tr>
                    <tr><td>১৩</td><td class="text-left">ফাতেহা-ই-ইয়াজদাহম</td><td>২৪ সেপ্টেম্বর (বৃহস্পতিবার)</td><td>০১</td></tr>
                    <tr><td>১৪</td><td class="text-left">দুর্গাপূজা</td><td>২০ - ২২ অক্টোবর</td><td>০৩</td></tr>
                    <tr><td>১৫</td><td class="text-left">বিজয় দিবস, যিশু খ্রিস্টের জন্মদিন ও শীতকালীন অবকাশ</td><td>১৩ - ২৪ ডিসেম্বর</td><td>১০</td></tr>
                    <tr><td colspan="3"><b>প্রতিষ্ঠান প্রধানের সংরক্ষিত ছুটি</b></td><td><b>০৩</b></td></tr>
                    <tr style="background:#f9f9f9; font-weight:bold;">
                        <td colspan="3">সর্বমোট ছুটি</td>
                        <td>৭০ দিন</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="legend-footer">
            <span style="color:var(--gov-red)">🔴 শুক্রবার: সাপ্তাহিক ছুটি</span>
            <span style="color:var(--gov-green)">🟢 শনিবার: মাদ্রাসা ছুটি</span>
            <span><span class="hld-circle" style="width:20px; height:20px; line-height:20px; font-size:12px;">#</span> সাধারণ ছুটি</span>
        </div>
    </div>
</div>

<?php include 'footer.php'; ?>
