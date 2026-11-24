<?php 
    $pageTitle = "ছাত্র ছাত্রী - নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা"; 
    include 'header.php'; 
?>

<style>
    /* লেআউট কন্ট্রোল */
    main {
        display: flex;
        flex-wrap: wrap;
        gap: 20px;
        max-width: 1200px;
        margin: 20px auto;
        padding: 0 15px;
    }

    #notice-section {
        flex: 1;
        min-width: 300px;
    }

    /* কার্ড গ্রিড ডিজাইন */
    .student-options-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 15px;
        margin-top: 25px;
    }

    .card-item {
        background: #ffffff;
        border-radius: 12px;
        padding: 25px 15px;
        text-align: center;
        text-decoration: none !important;
        border: 1px solid #eef0f2;
        transition: all 0.3s ease;
        display: block;
        box-shadow: 0 4px 6px rgba(0,0,0,0.02);
    }

    .card-item:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0,0,0,0.08);
        border-color: #1e7e34;
    }

    .icon-box {
        font-size: 35px;
        margin-bottom: 12px;
        display: block;
        transition: 0.3s;
    }

    .card-item:hover .icon-box {
        transform: scale(1.2);
    }

    .card-item h3 {
        font-size: 17px;
        color: #333;
        margin: 0;
        font-weight: 600;
    }

    /* সাইডবার অ্যাডজাস্টমেন্ট */
    aside {
        width: 300px;
    }

    @media (max-width: 768px) {
        aside { width: 100%; order: 2; }
        #notice-section { order: 1; }
    }
</style>

<main>

    <section id="notice-section">
         <h2 style=" text-align: center; color: green;">শিক্ষার্থী কর্ণার</h2>

      <div class="student-options-grid">
    <a href="admission.php" class="card-item">
        <span class="icon-box">📝</span>
        <h3>ভর্তি ফরম</h3>
    </a>
    <a href="https://www.ebmeb.gov.bd/" class="card-item">
        <span class="icon-box">🆔</span>
        <h3>রেজিস্ট্রেশন</h3>
    </a>
    <a href="admit.php" class="card-item">
        <span class="icon-box">📄</span>
        <h3>এডমিট</h3>
    </a>
    <a href="student-info.php" class="card-item">
        <span class="icon-box">👤</span>
        <h3>ছাত্র ছাত্রী তথ্য</h3>
    </a>
    <a href="result.php" class="card-item">
        <span class="icon-box">🎓</span>
        <h3>ফলাফল</h3>
    </a>
    <a href="fees.php" class="card-item">
        <span class="icon-box">💳</span>
        <h3>ফি পরিশোধ</h3>
    </a>
    <a href="syllabus.php" class="card-item">
        <span class="icon-box">📚</span>
        <h3>সিলেবাস</h3>
    </a>
    <a href="routine.php" class="card-item">
        <span class="icon-box">📅</span>
        <h3>ক্লাস রুটিন</h3>
    </a>
    <a href="holidays.php" class="card-item">
        <span class="icon-box">🏖️</span>
        <h3>ছুটির তালিকা</h3>
    </a>
    <a href="calendar.php" class="card-item">
        <span class="icon-box">🗓️</span>
        <h3>একাডেমিক ক্যালেন্ডার</h3>
    </a>
</div>

         <?php include 'importantsite1.php'; ?>
    </section>

</main>

<?php include 'footer.php'; ?>
