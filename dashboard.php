<?php 
/**
 * ১. সেশন শুরু এবং লগআউট লজিক সবার আগে রাখতে হবে
 */
session_start();

// Logout Logic
if (isset($_GET['logout'])) {
    // সেশন ডেটা ক্লিয়ার করা
    $_SESSION = array();
    
    // সেশন কুকি ডিলিট করা (ব্রাউজার লেভেলে নিরাপত্তার জন্য)
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    // সেশন ধ্বংস করা
    session_destroy();
    
    // হোমপেজে পাঠিয়ে দেওয়া
    header("Location: index.php"); 
    exit();
}

/**
 * ২. অথেন্টিকেশন ফাইল চেক
 */
include('auth.php'); 

/**
 * ৩. কনফিগারেশন এবং ড্যাশবোর্ড ডেটা
 */
$institution_name = "Nalta Ahsania Darul Ulum Fazil (Degree) Madrasah";

$sheets = [
    "Notice Management" => [
        "link" => "add_notice.php",
        "icon" => "📢", "desc" => "Add new notices and edit existing ones."
    ],
    "Result Entry" => [
        "link" => "https://docs.google.com/spreadsheets/d/1RGowuXBvvCAokWgEgapvcV0Watju7hVwO-alZPksMFI/edit?usp=drivesdk",
        "icon" => "✍️", "desc" => "Input marks based on class and department."
    ],
    "Accounting Entry" => [
        "link" => "accounting_entry.php",
        "icon" => "💰", "desc" => "Daily income and expenditure entry."
    ],
    "Accounting Report" => [
        "link" => "accounting_report.php",
        "icon" => "📊", "desc" => "View monthly and annual financial reports."
    ],
    "View/Search Result" => [
        "link" => "view_result.php",
        "icon" => "🔎", "desc" => "View and print student marksheets by roll."
    ],
    "Student Profile" => [
        "link" => "student-search.php",
        "icon" => "👤", "desc" => "Comprehensive student data search and print."
    ],
    "Admission Info" => [
        "link" => "https://docs.google.com/spreadsheets/d/1MWQwfg2mH5z9Lzd5jnRUqh9qBhUY0C7ShL4l7Plw0Jc/edit",
        "icon" => "🎓", "desc" => "New student admission list (Google Sheets)."
    ],
    "Staff & Teachers" => [
        "link" => "https://docs.google.com/spreadsheets/d/1MyHFvmHwarKohxVgszzK_TRWXbV4IKU7ubSAgKp-VvE/edit",
        "icon" => "👨‍🏫", "desc" => "Database of teachers and office staff."
    ],
];

$current_sheet = isset($_GET['sheet']) ? $_GET['sheet'] : null;
?>

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $institution_name; ?> - Dashboard</title>
    <link href="https://fonts.googleapis.com/css2?family=Segoe+UI:wght@400;600;700&display=swap" rel="stylesheet">
    
    <style>
        :root {
            --primary: #2c3e50;
            --accent: #27ae60;
            --bg: #f8f9fa;
            --white: #ffffff;
            --text: #333;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: var(--bg);
            margin: 0;
            color: var(--text);
        }

        .navbar {
            background: var(--white);
            padding: 15px 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .logo-area { display: flex; align-items: center; gap: 15px; }

        .main-content { max-width: 1200px; margin: 30px auto; padding: 0 20px; }

        /* Menu Grid */
        .menu-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 25px;
        }
        .menu-item {
            background: var(--white);
            padding: 25px;
            border-radius: 15px;
            text-decoration: none;
            color: inherit;
            transition: 0.3s;
            text-align: center;
            border-bottom: 4px solid #ddd;
        }
        .menu-item:hover {
            transform: translateY(-5px);
            border-bottom-color: var(--accent);
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .icon-box { font-size: 40px; margin-bottom: 15px; }

        /* Viewer Area */
        .view-container { background: white; padding: 20px; border-radius: 15px; box-shadow: 0 5px 15px rgba(0,0,0,0.05); }
        iframe { width: 100%; height: 85vh; border: 1px solid #eee; border-radius: 10px; }
        
        .back-btn {
            display: inline-block; margin-bottom: 15px; padding: 10px 20px;
            background: #2c3e50; color: white; text-decoration: none; border-radius: 8px;
        }
        
        .logout-btn { 
            color: #e74c3c; 
            border: 1px solid #e74c3c; 
            padding: 5px 15px; 
            border-radius: 5px; 
            text-decoration: none; 
            font-weight: bold; 
            transition: 0.2s;
        }
        .logout-btn:hover { background: #e74c3c; color: white; }
    </style>
</head>
<body>

    <div class="navbar">
        <div class="logo-area">
            <span style="font-size: 28px;">🕌</span>
            <div>
                <div style="font-weight: 700; font-size: 18px; line-height: 1.2;"><?php echo $institution_name; ?></div>
                <small style="color: #27ae60;">Admin Control Panel</small>
            </div>
        </div>
        <div>
            <span style="margin-right: 15px;">👤 <b><?php echo $_SESSION['logged_user']; ?></b></span>
            <a href="?logout=1" class="logout-btn">Logout</a>
        </div>
    </div>

    <div class="main-content">
        <?php if (!$current_sheet): ?>
            <h2 style="margin-bottom: 25px;">Management Modules</h2>
            <div class="menu-grid">
                <?php foreach ($sheets as $name => $info): ?>
                    <a href="?sheet=<?php echo urlencode($name); ?>" class="menu-item">
                        <div class="icon-box"><?php echo $info['icon']; ?></div>
                        <h3 style="margin: 0 0 10px 0;"><?php echo $name; ?></h3>
                        <p style="font-size: 13px; color: #666; margin: 0;"><?php echo $info['desc']; ?></p>
                    </a>
                <?php endforeach; ?>
            </div>
        <?php else: ?>
            <div class="view-container">
                <a href="<?php echo $_SERVER['PHP_SELF']; ?>" class="back-btn">⬅ Back to Dashboard</a>
                <h3 style="margin-bottom: 15px; color: var(--accent);">📂 Currently Viewing: <?php echo $current_sheet; ?></h3>
                <iframe src="<?php echo $sheets[$current_sheet]['link']; ?>"></iframe>
            </div>
        <?php endif; ?>
    </div>

    <div style="text-align: center; padding: 30px; color: #999; font-size: 12px;">
        © 2026 | Madrasah Automation System | Nalta Ahsania Darul Ulum Fazil Madrasah
    </div>

</body>
</html>
