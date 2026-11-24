<?php 
    // ১. সবার আগে ডাটাবেজ থেকে তথ্য আনার লজিক ফাইলটি দিন
    include 'fetch_notices.php'; 

    $pageTitle = "নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 
    include 'header.php'; 
    include 'marquee.php';
?>

<main> 
    <?php 
        // ২. গুরুত্বপূর্ণ: notice.php ফাইলের ভেতর থেকে include 'header.php' লাইনটি মুছে দিন
        include 'notice.php'; 
        include 'history.php';
        include 'importantsite1.php';
        include 'importantsite2.php';
        include 'social-media.php';
    ?>
    
    <?php include 'sidebar.php'; ?>
</main>
    
<?php include 'teacherslide.php'; ?> 
<?php include 'footer.php'; ?>
