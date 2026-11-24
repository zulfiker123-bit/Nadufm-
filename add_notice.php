<?php
require_once('auth.php'); 

// ডাটাবেজ কানেকশন
$servername = "localhost";
$username = "nadufme1_notice"; 
$password = "nadufm118778";
$dbname = "nadufme1_notice";
$conn = new mysqli($servername, $username, $password, $dbname);
$conn->set_charset("utf8mb4"); // বাংলা ফন্ট সাপোর্টের জন্য

if ($conn->connect_error) { die("Connection failed: " . $conn->connect_error); }

$message = "";

// ১. ডিলিট করার লজিক (নোটিশ ও হেডলাইন উভয়ই ডিলিট হবে)
if (isset($_GET['delete'])) {
    $id = $_GET['delete'];
    $conn->query("DELETE FROM notices WHERE id=$id");
    $message = "<div class='bg-red-100 text-red-700 p-3 rounded mb-4 font-bold'>মুছে ফেলা হয়েছে!</div>";
}

// ২. নোটিশ সেভ করার লজিক (type='notice' হিসেবে সেভ হবে)
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['notice_submit'])) {
    $date = mysqli_real_escape_string($conn, $_POST['notice_date']);
    $subject = mysqli_real_escape_string($conn, $_POST['subject']);
    $description = mysqli_real_escape_string($conn, $_POST['description']);
    $link = $_POST['link'];
    $is_new = isset($_POST['is_new']) ? 'yes' : 'no';
    
    if (isset($_POST['update_id']) && !empty($_POST['update_id'])) {
        $id = $_POST['update_id'];
        $sql = "UPDATE notices SET notice_date='$date', subject='$subject', description='$description', link='$link', is_new='$is_new' WHERE id=$id";
    } else {
        // নতুন কলাম 'notice' টাইপ সেট করা হয়েছে
        $sql = "INSERT INTO notices (type, notice_date, subject, description, link, is_new) VALUES ('notice', '$date', '$subject', '$description', '$link', '$is_new')";
    }

    if ($conn->query($sql) === TRUE) {
        $message = "<div class='bg-green-100 text-green-700 p-3 rounded mb-4 font-bold'>সফলভাবে সম্পন্ন হয়েছে!</div>";
    }
}

// ৩. হেডলাইন সেভ করার লজিক (type='headline' হিসেবে সেভ হবে)
if ($_SERVER["REQUEST_METHOD"] == "POST" && isset($_POST['headline_submit'])) {
    $headline_text = mysqli_real_escape_string($conn, $_POST['headline_text']);
    if(!empty($headline_text)) {
        // হেডলাইন হিসেবে সেভ হচ্ছে
        $sql = "INSERT INTO notices (type, notice_date, subject) VALUES ('headline', NOW(), '$headline_text')";
        if($conn->query($sql)) {
            $message = "<div class='bg-blue-100 text-blue-700 p-3 rounded mb-4 font-bold'>হেডলাইন আপডেট হয়েছে!</div>";
        }
    }
}

// ৪. এডিট করার জন্য ডাটা নিয়ে আসা (শুধুমাত্র নোটিশ এডিট হবে)
$edit_data = ['id' => '', 'date' => '', 'subject' => '', 'description' => '', 'link' => '', 'isNew' => ''];
if (isset($_GET['edit'])) {
    $id = $_GET['edit'];
    $res = $conn->query("SELECT * FROM notices WHERE id=$id");
    if ($res->num_rows > 0) {
        $row = $res->fetch_assoc();
        $edit_data = [
            'id' => $row['id'], 
            'date' => $row['notice_date'], 
            'subject' => $row['subject'], 
            'description' => $row['description'], 
            'link' => $row['link'], 
            'isNew' => $row['is_new']
        ];
    }
}

// ৫. ডাটাবেজ থেকে ডাটা নিয়ে আসা (আলাদা ফিল্টার)
$notices = $conn->query("SELECT * FROM notices WHERE type='notice' ORDER BY id DESC");
$current_headline = $conn->query("SELECT * FROM notices WHERE type='headline' ORDER BY id DESC LIMIT 1")->fetch_assoc();
?>

<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>নোটিশ ম্যানেজমেন্ট | ড্যাশবোর্ড</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
    <style> body { font-family: 'Hind Siliguri', sans-serif; } </style>
</head>
<body class="bg-gray-50 min-h-screen">

    <header class="bg-white shadow-sm p-6 mb-8 border-b-2 border-emerald-600">
        <div class="container mx-auto flex flex-col md:flex-row items-center justify-center gap-6">
            <img src="logo.png" alt="Logo" class="w-20 h-20 object-contain">
            <div class="text-center">
                <h1 class="text-2xl font-bold text-emerald-900 leading-tight">নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী) মাদ্রাসা</h1>
                <p class="text-sm text-emerald-700 font-medium italic">অ্যাডমিন কন্ট্রোল প্যানেল</p>
            </div>
        </div>
    </header>

    <main class="container mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10">
        
        <div class="lg:col-span-1">
            <div class="bg-white p-6 rounded-xl shadow-md border border-blue-200 mb-6">
                <h3 class="text-lg font-bold mb-4 text-blue-700 border-b pb-2">📢 স্ক্রলিং হেডলাইন</h3>
                <form action="add_notice.php" method="POST" class="space-y-3">
                    <input type="text" name="headline_text" value="<?php echo $current_headline['subject'] ?? ''; ?>" placeholder="চলমান ঘোষণাটি লিখুন..." class="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required>
                    <button type="submit" name="headline_submit" class="w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition">হেডলাইন আপডেট করুন</button>
                </form>
            </div>

            <div class="bg-white p-6 rounded-xl shadow-md border border-gray-200 sticky top-5">
                <h3 class="text-lg font-bold mb-4 border-b pb-2 text-emerald-700">
                    <?php echo $edit_data['id'] ? "📝 নোটিশ এডিট করুন" : "➕ নতুন নোটিশ যোগ করুন"; ?>
                </h3>
                <?php echo $message; ?>
                <form action="add_notice.php" method="POST" class="space-y-4">
                    <input type="hidden" name="update_id" value="<?php echo $edit_data['id']; ?>">
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-600">তারিখ</label>
                        <input type="text" name="notice_date" placeholder="যেমন: ২০ জানুয়ারি ২০২৬" value="<?php echo $edit_data['date']; ?>" required class="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-600">বিষয় (Title)</label>
                        <input type="text" name="subject" value="<?php echo $edit_data['subject']; ?>" required class="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-600">বিস্তারিত বর্ণনা</label>
                        <textarea name="description" rows="5" class="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none"><?php echo $edit_data['description']; ?></textarea>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-600">লিংক (ঐচ্ছিক)</label>
                        <input type="text" name="link" value="<?php echo $edit_data['link']; ?>" class="w-full border p-2 rounded focus:ring-2 focus:ring-emerald-500 outline-none">
                    </div>

                    <div class="flex items-center gap-2 bg-gray-50 p-2 rounded">
                        <input type="checkbox" name="is_new" id="is_new" <?php echo ($edit_data['isNew'] == 'yes') ? 'checked' : ''; ?> class="w-4 h-4 accent-emerald-600">
                        <label for="is_new" class="text-sm text-gray-700 cursor-pointer font-semibold">নতুন ব্যাজ (NEW) দেখান</label>
                    </div>

                    <button type="submit" name="notice_submit" class="w-full bg-emerald-600 text-white py-2 rounded font-bold hover:bg-emerald-700 transition shadow-md">
                        <?php echo $edit_data['id'] ? "আপডেট করুন" : "পাবলিশ করুন"; ?>
                    </button>
                    <?php if($edit_data['id']): ?>
                        <a href="add_notice.php" class="block text-center text-sm text-red-500 mt-2 underline">পরিবর্তন বাতিল করুন</a>
                    <?php endif; ?>
                </form>
            </div>
        </div>

        <div class="lg:col-span-2">
            <div class="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200">
                <table class="w-full text-left border-collapse">
                    <thead class="bg-emerald-50 text-emerald-900 text-sm">
                        <tr>
                            <th class="p-4 border-b">তারিখ</th>
                            <th class="p-4 border-b">বিষয়</th>
                            <th class="p-4 border-b text-center">অ্যাকশন</th>
                        </tr>
                    </thead>
                    <tbody class="text-sm">
                        <?php if($notices->num_rows > 0): ?>
                            <?php while($row = $notices->fetch_assoc()): ?>
                            <tr class="hover:bg-gray-50 border-b transition">
                                <td class="p-4 font-semibold whitespace-nowrap"><?php echo $row['notice_date']; ?></td>
                                <td class="p-4 font-medium text-gray-700"><?php echo $row['subject']; ?></td>
                                <td class="p-4 flex justify-center gap-2">
                                    <a href="?edit=<?php echo $row['id']; ?>" class="bg-blue-50 text-blue-600 px-3 py-1 rounded border border-blue-200">এডিট</a>
                                    <a href="?delete=<?php echo $row['id']; ?>" onclick="return confirm('নিশ্চিত?')" class="bg-red-50 text-red-600 px-3 py-1 rounded border border-red-200">ডিলিট</a>
                                </td>
                            </tr>
                            <?php endwhile; ?>
                        <?php else: ?>
                            <tr><td colspan="3" class="p-10 text-center text-gray-400">কোন নোটিশ নেই।</td></tr>
                        <?php endif; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </main>
</body>
</html>
