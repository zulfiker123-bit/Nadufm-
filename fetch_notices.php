<?php
// ফাইলে কোনো স্পেস বা এন্টার দিয়ে শুরু করবেন না
require_once('db_config.php');

// ১. হেডলাইন ডাটা (Marquee এর জন্য)
$sql_h = "SELECT subject AS announcement FROM notices WHERE type='headline' ORDER BY id DESC LIMIT 5";
$res_h = $conn->query($sql_h);
$headlines = [];
if ($res_h && $res_h->num_rows > 0) {
    while($row = $res_h->fetch_assoc()) {
        $headlines[] = $row;
    }
}

// ২. নোটিশ বোর্ড ডাটা
$sql_n = "SELECT id, notice_date AS date, subject, description, link, is_new AS isNew 
          FROM notices WHERE type='notice' ORDER BY id DESC";
$res_n = $conn->query($sql_n);
$notices = [];
if ($res_n && $res_n->num_rows > 0) {
    while($row = $res_n->fetch_assoc()) {
        $notices[] = $row;
    }
}

// এখানে $conn->close() করার প্রয়োজন নেই
?>
