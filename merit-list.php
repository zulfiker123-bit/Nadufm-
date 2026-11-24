<?php
session_start();
// include('auth.php'); 

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
    "11" => ["name" => " আলিম ১ম বর্ষ ", "gid" => "1289051084"],
    "12" => ["name" => " আলিম ২য় বর্ষ ", "gid" => "153134693"]
];

function convertToBengali($number) {
    $en = array('0','1','2','3','4','5','6','7','8','9','.');
    $bn = array('০','১','২','৩','৪','৫','৬','৭','৮','৯','.');
    return str_replace($en, $bn, $number);
}

$merit_data = [];
$selected_class = $_GET['class_id'] ?? '';

if ($selected_class !== '' && array_key_exists($selected_class, $class_map)) {
    $selected_name = $class_map[$selected_class]['name'];
    $gid = $class_map[$selected_class]['gid'];
    
    $csv_url = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSYfZ7IOoN4gbjjSgT02E1ugUQvhPmL39Ch4gJns0GGbb9OrCO4Wm9hdmbpPaEerRC5m2S0-WOJQcV4/pub?output=csv&gid=" . $gid;

    if (($handle = fopen($csv_url, "r")) !== FALSE) {
        $headers = fgetcsv($handle);
        
        $subject_full_marks = [];
        for ($i = 3; $i < count($headers); $i++) {
            preg_match('/\((\d+)\)/', $headers[$i], $matches);
            $subject_full_marks[$i] = isset($matches[1]) ? (int)$matches[1] : 100;
        }

        while (($data = fgetcsv($handle)) !== FALSE) {
            if (empty($data[0])) continue;
            
            $obtained_total = 0; 
            $attempted_full_total = 0; 
            $fail_count = 0; 
            $is_absent_in_any = false;

            for ($i = 3; $i < count($headers); $i++) {
                $val = strtoupper(trim($data[$i]));
                
                // যদি ঘরে Absent/A লেখা থাকে
                if ($val === "A" || $val === "ABS" || $val === "ABSENT") {
                    $is_absent_in_any = true;
                } 
                // যদি ঘরটি খালি না হয় এবং সংখ্যা থাকে
                elseif ($val !== "") {
                    $mark = (float)$val;
                    $obtained_total += $mark;
                    $attempted_full_total += $subject_full_marks[$i];
                    
                    if ($mark < ($subject_full_marks[$i] * 0.33)) { 
                        $fail_count++; 
                    }
                }
                // ঘর একদম খালি থাকলে সেটা ঐ ছাত্রের বিষয়ের তালিকায় ধরবে না
            }

            $percentage = ($attempted_full_total > 0) ? ($obtained_total / $attempted_full_total) * 100 : 0;

            $merit_data[] = [
                'name' => $data[0],
                'roll' => trim($data[2]),
                'total' => $obtained_total,
                'pct' => $percentage,
                'fail' => $fail_count,
                'absent' => $is_absent_in_any
            ];
        }
        fclose($handle);

        // সর্টিং লজিক
        usort($merit_data, function($a, $b) {
            // ১. অনুপস্থিতরা সবার নিচে
            if ($a['absent'] !== $b['absent']) return $a['absent'] <=> $b['absent'];
            // ২. ফেলের সংখ্যা অনুযায়ী (০ ফেল আগে, তারপর ১, ২...)
            if ($a['fail'] !== $b['fail']) return $a['fail'] <=> $b['fail'];
            // ৩. পাসের হার অনুযায়ী মেধা
            return $b['pct'] <=> $a['pct'];
        });
    }
}
?>

<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>মেধাতালিকা - নলতা মাদরাসা</title>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root { --p-green: #1b5e20; --s-green: #2e7d32; --light: #f0fdf4; }
        body { font-family: 'Hind Siliguri', sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 1000px; margin: auto; background: #fff; padding: 30px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); border-top: 6px solid var(--p-green); }
        .header { text-align: center; border-bottom: 2px solid #eee; padding-bottom: 15px; margin-bottom: 20px; }
        .header h1 { color: var(--p-green); font-size: 28px; margin: 0; }
        .form-area { background: var(--light); padding: 20px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: center; gap: 10px; }
        select { padding: 10px; border-radius: 6px; border: 1px solid #cbd5e1; font-family: inherit; width: 220px; }
        .btn { background: var(--p-green); color: white; border: none; padding: 10px 25px; border-radius: 6px; cursor: pointer; font-weight: bold; transition: 0.2s; }
        .btn:hover { background: var(--s-green); }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background: var(--p-green); color: white; padding: 14px; text-align: center; font-size: 15px; }
        td { padding: 14px; border-bottom: 1px solid #f1f5f9; text-align: center; font-size: 16px; }
        tr:nth-child(even) { background: #fafafa; }
        .rank-badge { background: #dcfce7; color: #166534; font-weight: 800; padding: 4px 12px; border-radius: 4px; border: 1px solid #bbf7d0; }
        .status-pass { color: #15803d; font-weight: bold; }
        .status-fail { color: #b91c1c; font-weight: bold; }
        .status-abs { color: #64748b; font-style: italic; }
        .absent-row { opacity: 0.8; background: #f8fafc !important; }
        @media print { .no-print { display: none; } .container { box-shadow: none; border: 1px solid #ddd; } }
    </style>
</head>
<body>

<div class="container">
    <div class="header">
        <h1>নলতা আহছানিয়া দারুল উলুম ফাজিল মাদরাসা</h1>
        <p style="color: var(--s-green); font-weight: 600; margin: 5px 0;">বার্ষিক পরীক্ষার মেধাতালিকা - ২০২৬</p>
        <?php if($selected_class !== ''): ?>
            <div style="margin-top:10px;"><span style="background: var(--p-green); color: #fff; padding: 4px 15px; border-radius: 20px; font-size: 14px;">শ্রেণি: <?= $selected_name ?></span></div>
        <?php endif; ?>
    </div>

    <div class="form-area no-print">
        <form method="GET" style="display: flex; gap: 10px;">
            <select name="class_id" required>
                <option value="">শ্রেণি নির্বাচন করুন</option>
                <?php foreach($class_map as $id => $info): ?>
                    <option value="<?= $id ?>" <?= ($selected_class == $id) ? 'selected' : '' ?>><?= $info['name'] ?> শ্রেণি</option>
                <?php endforeach; ?>
            </select>
            <button type="submit" class="btn">🔍 মেধাতালিকা দেখুন</button>
        </form>
    </div>

    <?php if (!empty($merit_data)): ?>
    <table>
        <thead>
            <tr>
                <th>স্থান</th>
                <th>রোল</th>
                <th style="text-align: left;">শিক্ষার্থীর নাম</th>
                <th>প্রাপ্ত নম্বর</th>
                <th>গড় (%)</th>
                <th>ফলাফল</th>
            </tr>
        </thead>
        <tbody>
            <?php $rank = 1; foreach ($merit_data as $row): ?>
            <tr class="<?= $row['absent'] ? 'absent-row' : '' ?>">
                <td>
                    <span class="rank-badge">
                        <?= $row['absent'] ? '--' : convertToBengali($rank++) ?>
                    </span>
                </td>
                <td><?= convertToBengali($row['roll']) ?></td>
                <td style="text-align: left; font-weight: 600;"><?= htmlspecialchars($row['name']) ?></td>
                <td style="font-weight: bold;"><?= convertToBengali($row['total']) ?></td>
                <td><?= convertToBengali(round($row['pct'], 2)) ?>%</td>
                <td>
                    <?php if($row['absent']): ?>
                        <span class="status-abs">অনুপস্থিত (Absent)</span>
                    <?php elseif($row['fail'] > 0): ?>
                        <span class="status-fail">অকৃতকার্য (<?= convertToBengali($row['fail']) ?>টি)</span>
                    <?php else: ?>
                        <span class="status-pass">উত্তীর্ণ (Passed)</span>
                    <?php endif; ?>
                </td>
            </tr>
            <?php endforeach; ?>
        </tbody>
    </table>
    <div style="text-align:center;">
        <button onclick="window.print()" class="btn no-print" style="margin-top: 25px; background: #334155;">📄 রেজাল্ট শিট প্রিন্ট করুন</button>
    </div>
    <?php elseif($selected_class !== ''): ?>
        <p style="text-align: center; color: #b91c1c; font-weight: bold; padding: 20px;">কোনো ডেটা পাওয়া যায়নি। শিটটি সঠিক ফরম্যাটে পাবলিশ করা আছে কি না চেক করুন।</p>
    <?php endif; ?>
</div>

</body>
</html>
