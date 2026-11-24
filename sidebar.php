<style>
    /* --- জেনারেল সাইডবার কন্টেইনার --- */
    .sidebar-container {
        width: 100%;
        max-width: 300px; /* ডেস্কটপে ৩০০ পিক্সেল */
        padding: 15px;
        background-color: #f4f7f9;
        border: 1px solid #d1d1d1;
        font-family: 'SolaimanLipi', Arial, sans-serif;
        box-sizing: border-box;
    }

    /* --- মোবাইলের জন্য রেসপন্সিভ ডিজাইন --- */
    @media (max-width: 768px) {
        .sidebar-container {
            max-width: 100% !important; /* মোবাইলে ফুল উইডথ */
            width: 100% !important;
            padding: 20px !important;
            border: none; /* মোবাইল স্ক্রিনে বর্ডার সরিয়ে দিলে সুন্দর দেখায় */
        }

        .sidebar-title {
            font-size: 20px !important; /* মোবাইলে শিরোনাম একটু বড় */
            padding: 12px !important;
        }

        .speech-text {
            font-size: 16px !important; /* মোবাইলে পড়ার সুবিধার জন্য বড় টেক্সট */
            line-height: 1.8 !important;
        }

        .name-tag {
            font-size: 18px !important;
        }

        .admin-btn {
            padding: 15px !important; /* মোবাইলে বাটন বড় যাতে ক্লিক করতে সুবিধা হয় */
            font-size: 18px !important;
        }
    }

    /* টাইটেল স্টাইল (গাঢ় নীল) */
    .sidebar-title {
        background-color: #001f3f;
        color: white;
        text-align: center;
        padding: 10px;
        margin: 15px 0 10px 0;
        border-radius: 4px;
        font-size: 18px;
    }

    /* ছবি মাঝখানে এবং ছোট করার স্টাইল */
    .sidebar-img-wrapper {
        text-align: center;
        margin: 10px 0;
    }

    .profile-img {
        width: 130px; 
        height: 140px;
        object-fit: cover;
        
        border-radius: 8px;
        display: block;
        margin: 0 auto;
    }

    /* নাম এবং টেক্সট স্টাইল */
    .name-tag {
        text-align: center;
        font-weight: bold;
        color: #001f3f;
        margin-bottom: 8px;
        font-size: 15px;
    }

    .speech-text {
        font-size: 14px;
        line-height: 1.6;
        text-align: justify;
        color: #333;
        margin-bottom: 15px;
    }

    .read-more-button {
        color: #f5f5f5;
        font-weight: bold;
        text-decoration: none;
    }

    .banner-img {
        width: 100%;
        height: auto;
        border-radius: 5px;
        display: block;
        margin: 0 auto;
    }

    .admin-btn {
        display: block;
        background-color: #0056b3;
        color: white;
        text-align: center;
        padding: 10px;
        margin-bottom: 8px;
        text-decoration: none;
        border-radius: 5px;
        font-weight: bold;
        transition: 0.3s ease;
    }

    .admin-btn:hover {
        background-color: #001f3f;
        color: #ffd700;
    }
</style>

<aside class="sidebar-container">
    <h4 class="sidebar-title">সভাপতি</h4>
    <div class="sidebar-img-wrapper">
        <img src="president.jpg" alt="সভাপতির ছবি" class="profile-img">
    </div>
    <p class="name-tag">জনাব মোহাম্মদ রফিকুল ইসলাম</p>
    <p class="speech-text">
        "বিসমিল্লাহির রাহমানির রাহিম" নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসার ওয়েবসাইটে যুক্ত হওয়া সকল সম্মানিত অভিভাবক, শিক্ষক-শিক্ষিকা, শিক্ষার্থী ও শুভাকাঙ্ক্ষীকে জানাই আন্তরিক শুভেচ্ছা...
        <a href="presidentspeech.php" class="read-more-button">বিস্তারিত</a>
    </p>

    <hr> 
    <h4 class="sidebar-title">অধ্যক্ষ</h4>
    <div class="sidebar-img-wrapper">
        <img src="principal.jpg" alt="অধ্যক্ষের ছবি" class="profile-img">
    </div>
    <p class="name-tag">মুফতি মুহাদ্দিস মোহাম্মদ রমিজ উদ্দিন</p>
    <p class="speech-text">
        "আলহামদুলিল্লাহি রাব্বিল আলামীন।" নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসার ওয়েবসাইটে আগত সকল শুভাকাঙ্ক্ষী, সম্মানিত অভিভাবক ও স্নেহের শিক্ষার্থীদের জানাই মোবারকবাদ...
        <a href="principalspeech.php" class="read-more-button">বিস্তারিত</a>
    </p>

    <h4 class="sidebar-title">জরুরি হটলাইন</h4>
    <img src="hotline.jpg" alt="হটলাইন" class="banner-img">

    <h4 class="sidebar-title">User Panel</h4>
    <a href="https://webmail.nadufm.edu.bd" class="admin-btn">Email</a>
    <a href="/dashboard.php" class="admin-btn">Dashboard Login</a>
</aside>
