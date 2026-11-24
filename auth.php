<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

/**
 * লগইন তথ্য (এগুলো পরিবর্তন করতে পারেন)
 */
$valid_user = "nadufm"; 
$valid_pass = "11877890";

// লগআউট প্রসেস
if (isset($_GET['logout'])) {
    session_destroy();
    header("Location: " . $_SERVER['PHP_SELF']);
    exit;
}

// লগইন চেক
if (isset($_POST['login_process'])) {
    $input_user = $_POST['user_id'];
    $input_pass = $_POST['user_pass'];

    if ($input_user === $valid_user && $input_pass === $valid_pass) {
        $_SESSION['is_logged_in'] = true;
        $_SESSION['logged_user'] = $input_user;
        $_SESSION['last_login'] = date("h:i A");
    } else {
        $error = "ভুল ইউজার আইডি বা পাসওয়ার্ড!";
    }
}

// যদি লগইন না থাকে তবে নিচের সুন্দর ডিজাইনটি দেখাবে
if (!isset($_SESSION['is_logged_in']) || $_SESSION['is_logged_in'] !== true):
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>অ্যাডমিন লগইন - মাদ্রাসা ম্যানেজমেন্ট</title>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; }
        body {
            font-family: 'Hind Siliguri', sans-serif;
            margin: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
        }
        .login-container {
            background: #fff;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 15px 35px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
            text-align: center;
        }
        .login-header { margin-bottom: 30px; }
        .login-header h1 { font-size: 26px; color: #2c3e50; margin: 10px 0; }
        .login-header p { color: #7f8c8d; font-size: 14px; }
        
        .input-group { text-align: left; margin-bottom: 20px; }
        .input-group label { display: block; margin-bottom: 8px; font-weight: 600; color: #34495e; }
        .input-group input {
            width: 100%;
            padding: 12px 15px;
            border: 2px solid #e0e0e0;
            border-radius: 10px;
            font-size: 16px;
            transition: 0.3s;
            outline: none;
        }
        .input-group input:focus { border-color: #3498db; box-shadow: 0 0 8px rgba(52, 152, 219, 0.2); }
        
        .login-btn {
            width: 100%;
            padding: 14px;
            background: #27ae60;
            border: none;
            border-radius: 10px;
            color: white;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            transition: 0.3s;
        }
        .login-btn:hover { background: #219150; transform: translateY(-2px); }
        
        .error-msg {
            background: #fdeaea;
            color: #e74c3c;
            padding: 10px;
            border-radius: 8px;
            margin-bottom: 20px;
            font-size: 14px;
            border: 1px solid #fabebb;
        }
        .footer-text { margin-top: 25px; font-size: 12px; color: #bdc3c7; }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <div style="font-size: 50px;">🕌</div>
            <h1>অ্যাডমিন লগইন</h1>
            <p>আপনার ইউজার আইডি ও পাসওয়ার্ড দিন</p>
        </div>

        <?php if(isset($error)) echo "<div class='error-msg'>$error</div>"; ?>

        <form method="POST">
            <input type="hidden" name="login_process" value="1">
            <div class="input-group">
                <label>ইউজার আইডি</label>
                <input type="text" name="user_id" placeholder="আইডি লিখুন" required autofocus>
            </div>
            <div class="input-group">
                <label>পাসওয়ার্ড</label>
                <input type="password" name="user_pass" placeholder="পাসওয়ার্ড লিখুন" required>
            </div>
            <button type="submit" class="login-btn">লগইন করুন</button>
        </form>

        <p class="footer-text">© ২০২৬ | নলতা আহছানিয়া দারুল উলুম মাদ্রাসা</p>
    </div>
</body>
</html>
<?php 
exit; 
endif; 
?>
