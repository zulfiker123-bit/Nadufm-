<?php 
    $pageTitle = "যোগাযোগ - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 
    include 'header.php'; 
?>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

<style>
    .contact-container {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        padding: 20px;
        justify-content: center;
    }
    .contact-card {
        background: #f9f9f9;
        border-top: 4px solid #28a745; /* মাদ্রাসা কালার */
        border-radius: 8px;
        padding: 20px;
        width: 300px;
        text-align: center;
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }
    .contact-card i {
        font-size: 30px;
        color: #28a745;
        margin-bottom: 15px;
    }
    .contact-card h3 {
        margin-bottom: 10px;
        color: #333;
    }
    .contact-card p, .contact-card a {
        color: #555;
        text-decoration: none;
        font-size: 16px;
    }
    .social-links {
        margin-top: 20px;
        text-align: center;
    }
    .social-links a {
        display: inline-block;
        margin: 5px 10px;
        padding: 10px 20px;
        color: white;
        border-radius: 5px;
        text-decoration: none;
        transition: 0.3s;
        font-weight: bold;
    }
    .fb-page { background: #1877F2; }
    .fb-group { background: #25d366; }
    .yt-channel { background: #FF0000; }
    
    .social-links a:hover { opacity: 0.8; }
    
    .map-header {
        text-align: center;
        color: #28a745;
        margin-top: 40px;
        font-size: 24px;
    }
</style>

<main>
    <section id="contact-section" style="padding: 40px 10px;">
        <h2 style="text-align: center; color: green; font-size: 28px; margin-bottom: 30px;">যোগাযোগের তথ্য</h2>

        <div class="contact-container">
            <div class="contact-card">
                <i class="fas fa-map-marker-alt"></i>
                <h3>ঠিকানা</h3>
     <p>নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা<br>নলতা মোবারকনগর, কালিগঞ্জ, সাতক্ষীরা।
EIIN NO: 118778 </p>
            </div>

            <div class="contact-card">
                <i class="fas fa-phone-alt"></i>
                <h3>ফোন করুন</h3>
        <p>অফিস: 01309118778</p>
    <p>অধ্যক্ষ: +8801719568538</p>
                <p>উপাধ্যক্ষ: 01779511848</p>


            </div>

            <div class="contact-card">
                <i class="fas fa-envelope"></i>
                <h3>ইমেইল</h3>
                <p><a href="mailto:Naltaalimmadrasha@gmail.com">Naltaalimmadrasha@gmail.com</a></p>
            </div>
        </div>

        <div class="social-links">
            <h3 style="color: #333; margin-bottom: 15px;">আমাদের সাথে যুক্ত থাকুন</h3>
            <a href="https://www.facebook.com/share/17HzDbCshg/" target="_blank" class="fb-page"><i class="fab fa-facebook"></i> ফেসবুক পেজ</a>
            <a href="https://www.facebook.com/share/g/17itvqVRUy/" target="_blank" class="fb-group"><i class="fas fa-users"></i> ফেসবুক গ্রুপ</a>
            <a href="https://youtube.com/@naltamadrasah?si=x5gWDy6DonmID9nZ" target="_blank" class="yt-channel"><i class="fab fa-youtube"></i> ইউটিউব চ্যানেল</a>
        </div>

        <h2 class="map-header">গুগল ম্যাপে মাদ্রাসা</h2>
        <div style="width: 100%; height: 350px; margin-top: 15px; border: 2px solid #ddd; border-radius: 10px; overflow: hidden;">
            <iframe
                src="https://maps.google.com/maps?q=নলতা%20আহছানিয়া%20দারুল%20উলুম%20ফাজিল%20মাদ্রাসা&t=&z=14&ie=UTF8&iwloc=&output=embed"
                width="100%"
                height="100%"
                frameborder="0"
                style="border:0;"
                allowfullscreen=""
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade">
            </iframe>
        </div>

        <br>

    </section>

    
</main>

<?php include 'footer.php'; ?>
