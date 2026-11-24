<?php
$pageTitle = "শিক্ষক কর্মচারী- নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা";
include 'header.php';

// আগের সিরিয়াল অনুযায়ী এবং NID-র বদলে ইনডেক্স নম্বর যুক্ত ডাটা
$teachers = array(
    array(
        'name' => 'মোহাম্মদ রমিজ উদ্দীন',
        'designation' => 'অধ্যক্ষ',
        'index_no' => 'K2004885',
        'subject' => 'আরবি',
        'mpo_date' => '২০২১-০৪-০১',
        'mobile' => '01719568538',
        'photo' => 'principal.jpg',
        'box_class' => 'box-institution'
    ),
    array(
        'name' => 'মুহা: জয়নুল ওয়ারা',
        'designation' => 'উপাধ্যক্ষ',
        'index_no' => 'K363442',
        'subject' => 'আরবি',
        'mpo_date' => '১৯৯৩-০৮-১৫',
        'mobile' => '01779511848',
        'photo' => 'joynul.jpg',
        'box_class' => 'box-institution'
    ),
    array(
        'name' => 'মো: রফিকুল ইসলাম',
        'designation' => 'সহকারি অধ্যাপক (আরবি)',
        'index_no' => 'K074217',
        'subject' => 'আরবি',
        'mpo_date' => '২০০১-০৪-০১',
        'mobile' => '01719518665',
        'photo' => 'islam.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মো: ইলিয়াছ হোসেন',
        'designation' => 'প্রভাষক (আরবি)',
        'index_no' => 'K580455',
        'subject' => 'আরবি',
        'mpo_date' => '২০০১-০৬-০১',
        'mobile' => '01916480590',
        'photo' => 'elias.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মো: ওসমান গণি',
        'designation' => 'প্রভাষক (আরবি)',
        'index_no' => 'K580456',
        'subject' => 'আরবি',
        'mpo_date' => '২০০১-০৬-০১',
        'mobile' => '01919839617',
        'photo' => 'osman.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'সুরাইয়া আক্তার',
        'designation' => 'প্রভাষক ( অর্থনীতি)',
        'index_no' => 'K580457',
        'subject' => 'অর্থনীতি',
        'mpo_date' => '২০০১-০৬-০১',
        'mobile' => '01818281527',
        'photo' => 'suraiya.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'শিরিনা আক্তার',
        'designation' => 'প্রভাষক (বাংলা)',
        'index_no' => 'K2021817',
        'subject' => 'বাংলা',
        'mpo_date' => '২০০৮-০১-০১',
        'mobile' => '01721057569',
        'photo' => 'shirina.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মো: শুভ্র রেজা',
        'designation' => 'প্রভাষক (ইংরেজি)',
        'index_no' => 'K2021999',
        'subject' => 'ইংরেজি',
        'mpo_date' => '২০০৯-০১-০১',
        'mobile' => '01740644474',
        'photo' => 'shuvroreza.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মাছুম বিল্লাহ',
        'designation' => 'প্রভাষক (আরবি)',
        'index_no' => 'M0041148',
        'subject' => 'আরবি',
        'mpo_date' => '২০২৩-১০-০১',
        'mobile' => '01515',
        'photo' => 'sobuj.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মাসুদ পারভেজ',
        'designation' => 'প্রভাষক (আইসিটি)',
        'index_no' => 'M0057163',
        'subject' => 'আইসিটি',
        'mpo_date' => '২০২৪-০৯-০১',
        'mobile' => '01827332223',
        'photo' => 'masud.png',
        'box_class' => 'box-web-4'
    ),
    
    array(
        'name' => 'জি. এম. মুজিবর রহমান ফরিদী',
        'designation' => 'সহকারি শিক্ষক (মৌলভী)',
        'index_no' => 'K074216',
        'subject' => 'আরবি',
        'mpo_date' => '১৯৮৬-০৩-০১',
        'mobile' => '01750917462',
        'photo' => 'mujibor.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মো: মাহমুদুন্নবী',
        'designation' => 'সহকারি শিক্ষক (মৌলভী)',
        'index_no' => 'K363439',
        'subject' => 'আরবি',
        'mpo_date' => '১৯৯৩-৯-০১',
        'mobile' => '01727043976',
        'photo' => 'mithu.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'জুলফিকার রহমান',
        'designation' => 'সহকারি শিক্ষক (মৌলভী)',
        'index_no' => 'M0041854',
        'subject' => 'ইসলামিক স্টাডিজ',
        'mpo_date' => '২০২৩-১০-০১',
        'mobile' => '01767792249',
        'photo' => 'zulfiker.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মাসুম বিল্লাহ  (২)',
        'designation' => 'সহকারি শিক্ষক (মৌলভী)',
        'index_no' => 'M0064387',
        'subject' => 'আরবি',
        'mpo_date' => '২০২৫-০৯-০১',
        'mobile' => '01767978224',
        'photo' => 'masum.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'এম. নাজমুল হোসাইন',
        'designation' => 'সহকারি শিক্ষক (শারীরিক শিক্ষা)',
        'index_no' => 'M0063941',
        'subject' => 'শারীরিক শিক্ষা',
        'mpo_date' => '২০২৫-০৯-০১',
        'mobile' => '01942083278',
        'photo' => 'nazmul.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'বাশিরুন নাহার',
        'designation' => 'সহকারি শিক্ষক (আইসিটি)',
        'index_no' => 'N2123446',
        'subject' => 'আইসিটি',
        'mpo_date' => '২০১৯-০৭-০১',
        'mobile' => '01941241215',
        'photo' => 'basirun.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'আশিকুর রহমান',
        'designation' => 'সহকারি শিক্ষক (গণিত)',
        'index_no' => 'N2128342',
        'subject' => 'গণিত',
        'mpo_date' => '২০১৯-০৭-০১',
        'mobile' => '01949235572',
        'photo' => 'ashik.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'সাবনাজ পারভীন',
        'designation' => 'সহকারি শিক্ষক (কৃষি)',
        'index_no' => 'M0041153',
        'subject' => 'কৃষি শিক্ষা',
        'mpo_date' => '২০২৩-১০-০১',
        'mobile' => '01312808789',
        'photo' => 'sabnaj.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'শংকর দেব নাথ',
        'designation' => 'সহকারি শিক্ষক (সমাজ বিজ্ঞান)',
        'index_no' => 'N2128343',
        'subject' => 'সমাজ বিজ্ঞান',
        'mpo_date' => '২০১৯-০৭-০১',
        'mobile' => '01724716812',
        'photo' => 'babu.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মারুফ হোসেন',
        'designation' => 'সহকারি শিক্ষক (ইংরেজি)',
        'index_no' => 'M0041160',
        'subject' => 'ইংরেজি',
        'mpo_date' => '২০২৩-১০-০১',
        'mobile' => '01781649450',
        'photo' => 'maruf.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'ফরিদা পারভীন',
        'designation' => 'সহকারি শিক্ষক (বাংলা)',
        'index_no' => 'M0041034',
        'subject' => 'বাংলা',
        'mpo_date' => '২০২৩-১০-০১',
        'mobile' => '01770748343',
        'photo' => 'forida.png',
        'box_class' => 'box-web-4'
    ),
    
    array(
        'name' => 'সাদিয়া সুলতানা',
        'designation' => 'সহকারি শিক্ষক (গার্হস্থ্য)',
        'index_no' => 'M0063931',
        'subject' => 'গার্হস্থ্য শিক্ষা',
        'mpo_date' => '২০২৫-০৯-০১',
        'mobile' => '01990834509',
        'photo' => 'sadiya.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মো: গোলাম রব্বানী',
        'designation' => 'দাখিল ক্বারী',
        'index_no' => 'K074223',
        'subject' => 'তাজবিদ/আরবি',
        'mpo_date' => '১৯৮৬-০৩-০১',
        'mobile' => '01928222143',
        'photo' => 'rabbani.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মোস্তফা রফিকুল হাসান',
        'designation' => 'ইবতেদায়ী প্রধান',
        'index_no' => 'K074224',
        'subject' => 'আরবি',
        'mpo_date' => '১৯৮৬-০৩-০১',
        'mobile' => '01911837972',
        'photo' => 'Satkhira.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'সাদিয়া আহছানী',
        'designation' => 'ইবতেদায়ী ক্বারী',
        'index_no' => 'N2112451',
        'subject' => 'তাজবিদ',
        'mpo_date' => '২০১৫-০৭-০১',
        'mobile' => '01950670038',
        'photo' => 'sadiyaahsani.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মো: রমজান আলী',
        'designation' => 'অফিস সহকারী',
        'index_no' => 'K369473',
        'subject' => 'প্রশাসন',
        'mpo_date' => '১৯৯৭-০৩-০১',
        'mobile' => '01925043975',
        'photo' => 'ramzan.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মোঃ হাসানুজ্জামান',
        'designation' => 'হিসাব সহকারী',
        'index_no' => 'M0016867',
        'subject' => 'হিসাব শাখা',
        'mpo_date' => '২০২১-১০-০১',
        'mobile' => '01923518218',
        'photo' => 'hasan.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মোঃ হৃদয় আহছান',
        'designation' => 'কম্পিউটার অপারেটর',
        'index_no' => 'M0016870',
        'subject' => 'কম্পিউটার শাখা',
        'mpo_date' => '২০২১-১০-০১',
        'mobile' => '01983128139',
        'photo' => 'mim.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'তৌফিক আহম্মেদ',
        'designation' => 'ল্যাব অপারেটর',
        'index_no' => 'M0076844',
        'subject' => 'কম্পিউটার ল্যাব',
        'mpo_date' => 'চলমান',
        'mobile' => '01827227347',
        'photo' => 'towfiq.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'এএসএম শাহরিয়র হোসেন',
        'designation' => 'ল্যাব এসিসটেন্ট',
        'index_no' => 'M0076843',
        'subject' => 'বিজ্ঞান ল্যাব',
        'mpo_date' => 'চলমান',
        'mobile' => '01985314158',
        'photo' => 'sahriar.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'সামছুর রহমান',
        'designation' => 'পরিচ্ছন্নতা কর্মী',
        'index_no' => 'K369475',
        'subject' => 'অফিস সেবা',
        'mpo_date' => '১৯৯৭-০৩-০১',
        'mobile' => '01949221251',
        'photo' => 'pion.jpg',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'ইরানি পারভীন',
        'designation' => 'আয়া',
        'index_no' => 'M0014541',
        'subject' => 'সেবা',
        'mpo_date' => '২০২১-০৪-০১',
        'mobile' => '01969263668',
        'photo' => 'irani.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মোঃ মিজানুর রহমান',
        'designation' => 'নিরাপত্তা কর্মী',
        'index_no' => 'M0014543',
        'subject' => 'নিরাপত্তা',
        'mpo_date' => '২০২১-০৪-০১',
        'mobile' => '01750309693',
        'photo' => 'mizanur.png',
        'box_class' => 'box-web-4'
    ),
    array(
        'name' => 'মোঃ জহিরুল ইসলাম',
        'designation' => 'নৈশ প্রহরী',
        'index_no' => 'M0016869',
        'subject' => 'নিরাপত্তা',
        'mpo_date' => '২০২১-১০-০১',
        'mobile' => '01911995620',
        'photo' => 'zohir.png',
        'box_class' => 'box-web-4'
    )
);
?>

<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

<style>
    .teacher-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 25px;
        padding: 20px;
    }
    .staff-card {
        background: #ffffff;
        border-radius: 15px;
        box-shadow: 0 5px 20px rgba(0,0,0,0.08);
        overflow: hidden;
        transition: all 0.3s ease;
        border: 1px solid #eee;
    }
    .staff-card:hover {
        transform: translateY(-8px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    .image-container {
        background: linear-gradient(to bottom, #f9f9f9, #e8f5e9);
        padding: 25px 0;
        text-align: center;
        border-bottom: 4px solid #28a745;
    }
    .staff-img {
        width: 130px;
        height: 150px;
        object-fit: cover;
        border-radius: 10px;
        border: 4px solid #fff;
        box-shadow: 0 4px 10px rgba(0,0,0,0.15);
    }
    .staff-info {
        padding: 20px;
    }
    .staff-name {
        color: #1b5e20;
        font-size: 18px;
        font-weight: 700;
        margin-bottom: 12px;
        text-align: center;
        min-height: 50px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .staff-details-list {
        list-style: none;
        padding: 0;
        margin: 0;
        font-size: 14px;
        color: #444;
    }
    .staff-details-list li {
        padding: 7px 0;
        border-bottom: 1px solid #f1f1f1;
        display: flex;
        align-items: center;
    }
    .staff-details-list li:last-child {
        border-bottom: none;
    }
    .staff-details-list i {
        width: 25px;
        color: #28a745;
        font-size: 14px;
    }
    .label-text {
        font-weight: 600;
        color: #333;
        margin-right: 5px;
    }
    .contact-link {
        color: #444;
        text-decoration: none;
    }
    .contact-link:hover {
        color: #28a745;
    }
</style>

<main>
    <section id="notice-section">
        <div style="text-align: center; margin: 40px 0;">
            <h2 style="color: #28a745; font-size: 30px; margin-bottom: 10px; font-weight: bold;">শিক্ষক ও কর্মচারীবৃন্দ</h2>
            <div style="width: 80px; height: 4px; background: #ffc107; margin: 0 auto; border-radius: 2px;"></div>
            <p style="color: #666; margin-top: 15px; font-size: 17px;">নলতা আহছানিয়া দারুল উলুম ফাজিল মাদ্রাসা</p>
        </div>

        <div class="teacher-grid">
            <?php foreach ($teachers as $teacher): ?>
            <div class="staff-card">
                <div class="image-container">
                    <img src="<?php echo !empty($teacher['photo']) ? $teacher['photo'] : 'default-avatar.png'; ?>" 
                         alt="<?php echo $teacher['name']; ?>" 
                         class="staff-img" />
                </div>
                
                <div class="staff-info">
                    <div class="staff-name"><?php echo $teacher['name']; ?></div>
                    <ul class="staff-details-list">
                        <li><i class="fas fa-user-tie"></i> <span class="label-text">পদবি:</span> <?php echo $teacher['designation']; ?></li>
                        <li><i class="fas fa-book"></i> <span class="label-text">বিষয়:</span> <?php echo $teacher['subject']; ?></li>
                        <li><i class="fas fa-fingerprint"></i> <span class="label-text">ইনডেক্স:</span> <?php echo $teacher['index_no']; ?></li>
                        <li><i class="fas fa-calendar-check"></i> <span class="label-text">এমপিও:</span> <?php echo $teacher['mpo_date']; ?></li>
                        <li>
                            <i class="fas fa-phone-alt"></i> 
                            <span class="label-text">মোবাইল:</span> 
                            <a href="tel:<?php echo $teacher['mobile']; ?>" class="contact-link"><?php echo $teacher['mobile']; ?></a>
                        </li>
                    </ul>
                </div>
            </div>
            <?php endforeach; ?>
        </div>

        <?php include 'importantsite1.php'; ?>
    </section>
  
</main>
<?php include 'footer.php'; ?>
