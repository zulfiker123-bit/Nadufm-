<?php 
include('auth.php'); 

$class_map = [
    "0"  => ["name" => "শিশু", "gid" => "1191889934"],
    "1"  => ["name" => "প্রথম", "gid" => "1997005098"],
    "2"  => ["name" => "দ্বিতীয়", "gid" => "1134761251"],
    "3"  => ["name" => "তৃতীয়", "gid" => "1588251736"],
    "4"  => ["name" => "চতুর্থ", "gid" => "1148542445"],
    "5"  => ["name" => "পঞ্চম", "gid" => "2018051935"],
    "6"  => ["name" => "ষষ্ঠ", "gid" => "909549955"],
    "7"  => ["name" => "সপ্তম", "gid" => "409341475"],
    "8"  => ["name" => "অষ্টম", "gid" => "795045010"],
    "9"  => ["name" => "নবম", "gid" => "462582001"],
    "10" => ["name" => "দশম", "gid" => "350912957"],
    "11" => ["name" => "আলিম ১ম বর্ষ ", "gid" => "1289051084"],
    "12" => ["name" => "আলিম ২য় বর্ষ ", "gid" => "153134693"]
];

function convertToBengali($number) {
    $en = array('0','1','2','3','4','5','6','7','8','9','.');
    $bn = array('০','১','২','৩','৪','৫','৬','৭','৮','৯','.');
    return str_replace($en, $bn, $number);
}

function bnToEnNumber($str) {
    $bn = array('০','১','২','৩','৪','৫','৬','৭','৮','৯');
    $en = array('0','1','2','3','4','5','6','7','8','9');
    return str_replace($bn, $en, $str);
}

// গ্রেড ক্যালকুলেশন ফাংশন
function getGradeInfo($mark, $full_mark, $is_failed = false) {
    if ($is_failed || $full_mark <= 0) return ["F", "0.00"];
    $percentage = ($mark / $full_mark) * 100;
    if ($percentage >= 80) return ["A+", "5.00"];
    if ($percentage >= 70) return ["A", "4.00"];
    if ($percentage >= 60) return ["A-", "3.50"];
    if ($percentage >= 50) return ["B", "3.00"];
    if ($percentage >= 40) return ["C", "2.00"];
    if ($percentage >= 33) return ["D", "1.00"];
    return ["F", "0.00"];
}

if (isset($_POST['page_password']) && $_POST['page_password'] === $correct_password) $_SESSION['is_logged_in'] = true;
if (!isset($_SESSION['is_logged_in'])):
?>
<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8"><title>Login</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
    body { display:flex; justify-content:center; align-items:center; min-height:100vh; background:#f0fdf4; font-family: sans-serif; margin:0; }
    .login-card { background:#fff; padding:40px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1); border-top: 5px solid #166534; width:100%; max-width:350px; text-align:center; }
    input { width:100%; padding:12px; margin:15px 0; border:1px solid #d1d5db; border-radius:8px; box-sizing: border-box; }
    button { width:100%; padding:12px; background:#166534; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:bold; transition: 0.3s; }
    button:hover { background: #15803d; }
</style>
</head><body>
    <div class="login-card">
        <h2 style="color:#166534; margin-bottom:20px;">রেজাল্ট পোর্টাল</h2>
        <form method="POST">
            <input type="password" name="page_password" placeholder="পাসওয়ার্ড লিখুন" required>
            <button type="submit">অ্যাক্সেস করুন</button>
        </form>
    </div>
</body></html>
<?php exit; endif; ?>

<?php
$student_result = null; 
$selected_class_name = "";

if (isset($_POST['view_result'])) {
    $search_class = $_POST['student_class'];
    $selected_class_name = $class_map[$search_class]['name'];
    $search_roll = trim($_POST['roll_number']);
    $gid = $class_map[$search_class]['gid'];

    $csv_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSYfZ7IOoN4gbjjSgT02E1ugUQvhPmL39Ch4gJns0GGbb9OrCO4Wm9hdmbpPaEerRC5m2S0-WOJQcV4/pub?output=csv&gid=" . $gid;

    if (($handle = fopen($csv_url, "r")) !== FALSE) {
        $headers = fgetcsv($handle);
        while (($data = fgetcsv($handle)) !== FALSE) {
            if (empty($data[0])) continue;
            if (trim($data[2]) != $search_roll) continue;

            $tm = 0; $tfm = 0; $fc = 0; $subs = []; $skip = [];

            for ($i = 3; $i < count($headers); $i++) {
                if (in_array($i, $skip)) continue;
                $h1 = trim($headers[$i]); 
                $v1 = trim($data[$i]);
                $clean_name = function($name) { return trim(preg_replace('/\s*[\(\[].*?[\)\]]/u', '', $name)); };

                if (strpos($h1, '+') !== false && isset($headers[$i+1])) {
                    $h2 = trim($headers[$i+1]); 
                    $v2 = trim($data[$i+1]);
                    $h1_en = bnToEnNumber($h1); $h2_en = bnToEnNumber($h2);
                    preg_match('/\((\d+)\)/', $h1_en, $m1); preg_match('/\((\d+)\)/', $h2_en, $m2);
                    $f1 = isset($m1[1]) ? (float)$m1[1] : 0; $f2 = isset($m2[1]) ? (float)$m2[1] : 0;
                    $m1_val = ($v1==="ABS"||$v1==="") ? 0 : (float)$v1; $m2_val = ($v2==="ABS"||$v2==="") ? 0 : (float)$v2;
                    
                    $subject_fail = ($m1_val < ($f1*0.33) || $m2_val < ($f2*0.33) || $v1==="ABS" || $v2==="ABS");
                    if ($subject_fail) $fc++;

                    $subs[] = [
                        'name' => $clean_name($h1) . "  " . $clean_name($h2), 
                        'fm' => ($f1 + $f2), 
                        'obtained' => ($v1===""?"০":convertToBengali($v1)) . " + " . ($v2===""?"০":convertToBengali($v2)), 
                        'display_avg' => ($m1_val + $m2_val) / 2, 
                        'sum' => ($m1_val + $m2_val),
                        'is_fail' => $subject_fail
                    ];
                    $tm += ($m1_val + $m2_val); $tfm += ($f1 + $f2); $skip[] = $i + 1;
                } else {
                    if ($h1 == "" || $v1 == "") continue;
                    $h1_en = bnToEnNumber($h1); preg_match('/\((\d+)\)/', $h1_en, $m);
                    $f = isset($m[1]) ? (float)$m[1] : 0;
                    $mv = ($v1==="ABS") ? 0 : (float)$v1;
                    
                    $subject_fail = ($mv < ($f*0.33) || $v1==="ABS");
                    if ($subject_fail) $fc++;

                    $subs[] = [
                        'name' => $clean_name($h1), 
                        'fm' => $f, 
                        'obtained' => convertToBengali($v1), 
                        'display_avg' => $mv, 
                        'sum' => $mv,
                        'is_fail' => $subject_fail
                    ];
                    $tm += $mv; $tfm += $f;
                }
            }
            $student_result = ['name' => $data[0], 'roll' => $data[2], 'subs' => $subs, 'total' => $tm, 'tfm' => $tfm, 'fail' => $fc];
            break;
        }
        fclose($handle);
    }
}
?>

<!DOCTYPE html>
<html lang="bn"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ফলাফল পোর্টাল - নলতা আহছানিয়া দারুল উলুম ফাজিল ( ডিগ্রী) মাদরাসা</title>
<style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap');
    body { font-family: 'Hind Siliguri', sans-serif; background: #f0fdf4; margin: 0; padding: 20px; color: #1e293b; }
    .search-wrapper { max-width: 500px; margin: 40px auto; background: #fff; border-radius: 20px; overflow: hidden; box-shadow: 0 15px 35px rgba(22, 101, 52, 0.1); border: 1px solid #e2e8f0; }
    .search-header { background: #166534; color: white; padding: 30px 20px; text-align: center; }
    .search-header img { width: 80px; margin-bottom: 10px; background: white; padding: 5px; border-radius: 50%; }
    .search-body { padding: 30px; }
    .form-group { margin-bottom: 20px; }
    label { display: block; margin-bottom: 8px; font-weight: 600; color: #166534; }
    select, input[type="text"] { width: 100%; padding: 12px 15px; border: 2px solid #e2e8f0; border-radius: 10px; font-family: inherit; box-sizing: border-box; }
    .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .btn { padding: 12px; border-radius: 10px; cursor: pointer; font-weight: bold; border: none; transition: 0.3s; text-align: center; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 8px; }
    .btn-search { background: #166534; color: white; width: 100%; }
    .btn-merit { background: #0369a1; color: white; }

    .marksheet { background: #fff; max-width: 650px; margin: 20px auto; padding: 25px; border: 2px solid #166534; border-radius: 10px; }
    .header-table { width: 100%; margin-bottom: 10px; }
    .grade-chart { border-collapse: collapse; font-size: 9px; text-align: center; border: 1px solid #166534; float: right; }
    .grade-chart td, .grade-chart th { border: 1px solid #166534; padding: 1px 4px; }
    .info-bar { display: flex; justify-content: space-between; margin: 10px 0; font-size: 15px; font-weight: bold; border-bottom: 2px solid #166534; padding-bottom: 5px; }
    table.main-table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table.main-table th, table.main-table td { border: 1px solid #166534; padding: 6px; text-align: center; }
    table.main-table th { background: #166534; color: white; }
    .status-box { margin-top: 15px; border: 2px solid #166534; display: flex; font-weight: bold; font-size: 14px; }
    .status-box div { flex: 1; padding: 8px; border-right: 1px solid #166534; text-align: center; }
    .promoted { color: #15803d; } .failed { color: #b91c1c; }
    @media print { .no-print { display: none; } body { background: white; padding: 0; } .marksheet { border: 1.5px solid #166534; margin: 0 auto; width: 98%; } }
</style>
</head><body>

<div class="container">
    <div class="no-print">
        <?php if (!$student_result): ?>
        <div class="search-wrapper">
            <div class="search-header">
                <img src="logo.png" alt="Logo" onerror="this.src='https://via.placeholder.com/80?text=LOGO'">
                <h2>নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী)মাদরাসা</h2>
                <p>অনলাইন ফলাফল পোর্টাল</p>
            </div>
            <div class="search-body">
                <form method="POST">
                    <div class="form-group">
                        <label>শিক্ষার্থীর শ্রেণি</label>
                        <select name="student_class" required>
                            <option value="" disabled selected>শ্রেণি নির্বাচন করুন</option>
                            <?php foreach($class_map as $k => $v) echo "<option value='$k'>{$v['name']} শ্রেণি</option>"; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>রোল নম্বর</label>
                        <input type="text" name="roll_number" placeholder="রোল নম্বর লিখুন" required>
                    </div>
                    <div class="btn-group">
                        <button type="submit" name="view_result" class="btn btn-search">🚀 ফলাফল দেখুন</button>
                        <a href="merit-list.php" class="btn btn-merit">🏆 মেধা তালিকা</a>
                    </div>
                </form>
            </div>
        </div>
        <?php else: ?>
            <div style="text-align: center; margin-bottom: 20px;">
                <button onclick="window.print()" class="btn btn-search" style="display:inline-flex; width:auto; padding:10px 30px;">🖨️ প্রিন্ট করুন</button>
                <a href="" class="btn btn-merit" style="display:inline-flex; width:auto; padding:10px 30px;">🔍 নতুনভাবে খুঁজুন</a>
            </div>
        <?php endif; ?>
    </div>

    <?php if ($student_result): ?>
    <div class="marksheet">
        <table class="header-table">
            <tr>
                <td width="70"><img src="logo.png" style="width:65px;" onerror="this.src='https://via.placeholder.com/60?text=LOGO'"></td>
                <td style="text-align: center;">
                    <h1 style="margin:0; color:#166534; font-size: 20px;">নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা</h1>
                    <p style="margin:2px; font-size: 13px; font-weight: bold;">নলতা শরীফ, সাতক্ষীরা</p>
                    <span style="background:#166534; color:#fff; padding:2px 15px; border-radius:15px; font-size:11px;">একাডেমিক ট্রান্সক্রিপ্ট - ২০২৫</span>
                </td>
                <td width="90">
                    <table class="grade-chart">
                        <tr><th>LG</th><th>GP</th></tr>
                        <tr><td>A+</td><td>5.0</td></tr>
                        <tr><td>A</td><td>4.0</td></tr>
                        <tr><td>A-</td><td>3.5</td></tr>
                        <tr><td>B</td><td>3.0</td></tr>
                        <tr><td>C</td><td>2.0</td></tr>
                        <tr><td>D</td><td>1.0</td></tr>
                        <tr><td>F</td><td>0.0</td></tr>
                    </table>
                </td>
            </tr>
        </table>

        <div class="info-bar">
            <span>নাম: <?= htmlspecialchars($student_result['name']) ?></span>
            <span>শ্রেণি: <?= $selected_class_name ?></span>
            <span>রোল: <?= convertToBengali($student_result['roll']) ?></span>
        </div>

        <table class="main-table">
            <thead>
                <tr>
                    <th width="5%">নং</th>
                    <th width="40%">বিষয়ের নাম</th>
                    <th width="10%">পূর্ণমান</th>
                    <th width="15%">প্রাপ্ত নম্বর</th>
                    <th width="10%">গড়</th>
                    <th width="10%">গ্রেড</th>
                    <th width="10%">জিপি</th>
                </tr>
            </thead>
            <tbody>
                <?php 
                $sl = 1; $total_gp = 0; 
                $fail_count = $student_result['fail'];
                foreach ($student_result['subs'] as $s): 
                    $g = getGradeInfo($s['sum'], $s['fm'], $s['is_fail']);
                    $total_gp += (float)$g[1];
                ?>
                <tr>
                    <td><?= convertToBengali($sl++) ?></td>
                    <td style="text-align:left; padding-left:10px; font-weight:600;"><?= $s['name'] ?></td>
                    <td><?= convertToBengali($s['fm']) ?></td>
                    <td style="font-weight:bold; font-size:11px;"><?= $s['obtained'] ?></td>
                    <td><?= convertToBengali(round($s['display_avg'], 1)) ?></td>
                    <td style="font-weight:bold; color:<?= $g[0]=='F'?'#b91c1c':'#166534'?>"><?= $g[0] ?></td>
                    <td><?= convertToBengali($g[1]) ?></td>
                </tr>
                <?php endforeach; ?>
            </tbody>
        </table>

        <?php 
            // লজিক পরিবর্তন: ফেল কাউন্ট ০ হলে Passed, নতুবা Failed
            $status = ($fail_count == 0) ? "Passed" : "Failed";
            $gpa_val = ($fail_count > 0) ? 0.00 : ($total_gp / max(count($student_result['subs']), 1));
            $css = ($status == "Failed") ? "failed" : "promoted";
        ?>

        <div class="status-box">
            <div style="background:#f8fafc; flex:1.2;">ফলাফল: <span class="<?= $css ?>"><?= $status ?></span></div>
            <div>মোট প্রাপ্ত: <?= convertToBengali($student_result['total']) ?></div>
            <div>GPA: <?= convertToBengali(number_format($gpa_val, 2)) ?></div>
        </div>

        <div style="margin-top:45px; display:flex; justify-content:space-between; padding:0 10px; color:#166534; font-size:12px; font-weight:bold;">
            <div style="text-align:center;"><p style="border-top:1px solid #166534; width:120px; padding-top:5px;">শ্রেণি শিক্ষকের স্বাক্ষর</p></div>
            <div style="text-align:center;"><p style="border-top:1px solid #166534; width:120px; padding-top:5px;">অভিভাবকের স্বাক্ষর</p></div>
            <div style="text-align:center;"><p style="border-top:1px solid #166534; width:120px; padding-top:5px;">অধ্যক্ষ</p></div>
        </div>
    </div>
    <?php endif; ?>
</div>
<div>
                    </a>
                    <a href="index.php" style="flex: 1; text-decoration: none;">
                        <button type="button" style="width: 100%; background: #7f8c8d; color: #fff; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer;">
                             Exit
                        </button>
                    </a>
</div>
</body></html>
