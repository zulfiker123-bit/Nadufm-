<?php
// ১. ডাটাবেজ কানেকশন
require_once('db_config.php');
$conn->set_charset("utf8mb4");

// ২. আইডি রিসিভ করা
$notice_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($notice_id === 0) {
    header("Location: index.php");
    exit();
}

// ৩. ডাটাবেজ থেকে তথ্য আনা
$sql = "SELECT * FROM notices WHERE id = $notice_id";
$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $row = $result->fetch_assoc();
    
    // ৪. লজিক: যদি লিংকটি একটি আসল ওয়েবসাইট লিংক হয় (যেমন http দিয়ে শুরু)
    $ext_link = trim($row['link']);
    if (!empty($ext_link) && $ext_link !== '#' && (stripos($ext_link, 'http') === 0)) {
        header("Location: " . $ext_link);
        exit();
    }

    $subject = $row['subject'];
    $date = $row['notice_date'];
    $description = !empty($row['description']) ? $row['description'] : "এই নোটিশটির কোনো বিস্তারিত বর্ণনা পাওয়া যায়নি।";
} else {
    // আইডি না পাওয়া গেলে হোমপেজে যাবে না, বরং এরর দেখাবে (টেস্ট করার জন্য)
    die("Error: নোটিশটি ডাটাবেজে পাওয়া যায়নি। আইডি: " . $notice_id);
}
?>

<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo htmlspecialchars($subject); ?></title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: 'Hind Siliguri', sans-serif; background: #f0f2f5; }
        .letterhead { background: white; max-width: 800px; margin: 30px auto; padding: 50px; min-height: 1000px; box-shadow: 0 0 20px rgba(0,0,0,0.1); border-top: 8px solid #059669; position: relative; }
        .details { line-height: 1.8; font-size: 1.15rem; text-align: justify; white-space: pre-line; margin-top: 30px; color: #1a1a1a; }
        @media print { .no-print { display: none; } .letterhead { margin: 0; box-shadow: none; border: none; width: 100%; } }
    </style>
</head>
<body>

    <div class="no-print flex justify-center gap-4 py-6">
        <a href="index.php" class="bg-gray-600 text-white px-6 py-2 rounded-full font-bold shadow hover:bg-gray-700">← মূল পাতায় যান</a>
        <button onclick="window.print()" class="bg-emerald-600 text-white px-8 py-2 rounded-full font-bold shadow hover:bg-emerald-700">প্রিন্ট / PDF ডাউনলোড</button>
    </div>

    <div class="letterhead">
        <div class="flex justify-between items-center border-b-2 border-emerald-800 pb-6 mb-8">
            <img src="logo.png" alt="Logo" class="w-20 h-20">
            <div class="text-center">
                <h1 class="text-2xl font-bold text-emerald-900 leading-tight">নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা</h1>
                <p class="text-xs text-gray-600 font-semibold uppercase tracking-widest mt-1">Nalta Ahsania Darul Ulum Fazil Degree Madrasah</p>
                <p class="text-sm text-emerald-700 font-medium">নলতা শরীফ, কালিগঞ্জ, সাতক্ষীরা</p>
            </div>
            <div class="w-20"></div>
        </div>

        <div class="flex justify-between mb-10 text-gray-700 font-bold">
            <p>স্মারক: NADUFM/<?php echo date('Y'); ?>/<?php echo $notice_id; ?></p>
            <p>তারিখ: <?php echo htmlspecialchars($date); ?></p>
        </div>

        <div class="text-center mb-10">
            <h2 class="text-xl font-bold border-b-2 border-black inline-block pb-1">বিষয়: <?php echo htmlspecialchars($subject); ?></h2>
        </div>

        <div class="details">
            <?php echo nl2br(htmlspecialchars($description)); ?>
        </div>

        <div class="mt-40 text-right">
            <div class="inline-block text-center">
                <div class="w-48 border-t border-black mb-1"></div>
                <p class="font-bold text-lg">অধ্যক্ষ</p>
                <p class="text-sm text-gray-700">নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা</p>
            </div>
        </div>
    </div>
</body>
</html>
