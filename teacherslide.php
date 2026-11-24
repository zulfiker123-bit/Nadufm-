<?php

$teacher_carousel_html = <<<HTML
<div class="carousel-container">
    <div class="carousel-header">
        <h2><i class="fas fa-chalkboard-teacher"></i> আমাদের শিক্ষকবৃন্দ</h2>
        <div class="title-underline"></div>
    </div>
    
    <div class="carousel-slider-wrapper">
        <div class="carousel-slider">
HTML;

// শুধুমাত্র শিক্ষকদের ডাটা অ্যারে (২৫ জন)
$teachers_only = array(
    array('name' => 'মোহাম্মদ রমিজ উদ্দীন', 'desg' => 'অধ্যক্ষ', 'index' => 'K2004885', 'phone' => '01719568538', 'img' => 'principal.jpg'),
    array('name' => 'মুহা: জয়নুল ওয়ারা', 'desg' => 'উপাধ্যক্ষ', 'index' => 'K363442', 'phone' => '01779511848', 'img' => 'joynul.png'),
    array('name' => 'মো: রফিকুল ইসলাম', 'desg' => 'সহকারি অধ্যাপক', 'index' => 'K074217', 'phone' => '01719518665', 'img' => 'islam.jpg'),
    array('name' => 'সুরাইয়া আক্তার', 'desg' => 'সহকারি অধ্যাপক', 'index' => 'K580457', 'phone' => '01818281527', 'img' => 'suraiya.jpg'),
    array('name' => 'শিরিনা আক্তার', 'desg' => 'প্রভাষক (বাংলা)', 'index' => 'K2021817', 'phone' => '01721057569', 'img' => 'shirina.jpg'),
    array('name' => 'মো: শুভ্র রেজা', 'desg' => 'প্রভাষক (ইংরেজি)', 'index' => 'K2021999', 'phone' => '01740644474', 'img' => 'shuvroreza.jpg'),
    array('name' => 'মাছুম বিল্লাহ', 'desg' => 'প্রভাষক (আরবি)', 'index' => 'M0041148', 'phone' => '01729921360', 'img' => 'sobuj.png'),
    array('name' => 'মাসুদ পারভেজ', 'desg' => 'প্রভাষক (আইসিটি)', 'index' => 'M0057163', 'phone' => '01827332223', 'img' => 'masud.png'),
    array('name' => 'মো: ইলিয়াছ হোসেন', 'desg' => 'প্রভাষক (আরবি)', 'index' => 'K580455', 'phone' => '01916480590', 'img' => 'elias.png'),
    array('name' => 'মো: ওসমান গণি', 'desg' => 'প্রভাষক (আরবি)', 'index' => 'K580456', 'phone' => '01919839617', 'img' => 'osman.jpg'),
    array('name' => 'জি. এম. মুজিবর রহমান ফরিদী', 'desg' => 'সহকারি শিক্ষক', 'index' => 'K074216', 'phone' => '01750917462', 'img' => 'mujibor.jpg'),
    array('name' => 'মো: মাহমুদুন্নবী', 'desg' => 'সহকারি শিক্ষক', 'index' => 'K363439', 'phone' => '01727043976', 'img' => 'mithu.jpg'),
    array('name' => 'জুলফিকার রহমান', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0041854', 'phone' => '01767792249', 'img' => 'zulfiker.jpg'),
    array('name' => 'মাছুম বিল্লাহ (২)', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0064387', 'phone' => '01767978224', 'img' => 'masum.png'),
    array('name' => 'এম. নাজমুল হোসাইন', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0063941', 'phone' => '01942083278', 'img' => 'nazmul.png'),
    array('name' => 'বাশিরুন নাহার', 'desg' => 'সহকারি শিক্ষক', 'index' => 'N2123446', 'phone' => '01941241215', 'img' => 'basirun.jpg'),
    array('name' => 'আশিকুর রহমান', 'desg' => 'সহকারি শিক্ষক', 'index' => 'N2128342', 'phone' => '01949235572', 'img' => 'ashik.jpg'),
    array('name' => 'শংকর দেব নাথ', 'desg' => 'সহকারি শিক্ষক', 'index' => 'N2128343', 'phone' => '01724716812', 'img' => 'babu.jpg'),
    array('name' => 'মারুফ হোসেন', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0041160', 'phone' => '01781649450', 'img' => 'maruf.jpg'),
    array('name' => 'ফরিদা পারভীন', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0041034', 'phone' => '01770748343', 'img' => 'forida.png'),
    array('name' => 'সাবনাজ পারভীন', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0041153', 'phone' => '01312808789', 'img' => 'sabnaj.png'),
    array('name' => 'সাদিয়া সুলতানা', 'desg' => 'সহকারি শিক্ষক', 'index' => 'M0063931', 'phone' => '01990834509', 'img' => 'sadiya.png'),
    array('name' => 'মো: গোলাম রব্বানী', 'desg' => 'দাখিল ক্বারী', 'index' => 'K074223', 'phone' => '01928222143', 'img' => 'rabbani.jpg'),
    array('name' => 'মোস্তফা রফিকুল হাসান', 'desg' => 'ইবতেদায়ী প্রধান', 'index' => 'K074224', 'phone' => '01911837972', 'img' => 'Satkhira.jpg'),
    array('name' => 'সাদিয়া আহছানী', 'desg' => 'ইবতেদায়ী ক্বারী', 'index' => 'N2112451', 'phone' => '01950670038', 'img' => 'sadia.png'),
);

foreach ($teachers_only as $teacher) {
    $teacher_carousel_html .= '
    <div class="carousel-item">
        <div class="card-inner">
            <img class="teacher-photo" src="'.$teacher['img'].'" alt="'.$teacher['name'].'" />
            <div class="teacher-info">
                <h4>'.$teacher['name'].'</h4>
                <p class="desg-text">'.$teacher['desg'].'</p>
                <p><i class="fas fa-fingerprint"></i> ID: '.$teacher['index'].'</p>
                <p><i class="fas fa-phone-alt"></i> '.$teacher['phone'].'</p>
            </div>
        </div>
    </div>';
}

$teacher_carousel_html .= <<<HTML
        </div>
    </div>
    
    <div class="carousel-controls">
        <button class="prev-btn"><i class="fas fa-chevron-left"></i></button>
        <button class="next-btn"><i class="fas fa-chevron-right"></i></button>
    </div>
</div>

<style>
    .carousel-container { max-width: 1100px; margin: 20px auto; padding: 20px; background: #fff; border-radius: 15px; position: relative; overflow: hidden; box-shadow: 0 5px 20px rgba(0,0,0,0.1); }
    .carousel-header { text-align: center; margin-bottom: 25px; }
    .carousel-header h2 { color: #28a745; font-size: 26px; font-weight: bold; }
    .title-underline { width: 60px; height: 4px; background: #ffc107; margin: 5px auto; border-radius: 2px; }
    .carousel-slider-wrapper { overflow: hidden; padding: 10px 0; }
    .carousel-slider { display: flex; transition: transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
    .carousel-item { min-width: 25%; padding: 12px; box-sizing: border-box; }
    
    @media (max-width: 1024px) { .carousel-item { min-width: 33.33%; } }
    @media (max-width: 768px) { .carousel-item { min-width: 50%; } }
    @media (max-width: 480px) { .carousel-item { min-width: 100%; } }

    .card-inner { background: #ffffff; border: 1px solid #eee; border-radius: 12px; text-align: center; padding: 20px; transition: all 0.3s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
    .card-inner:hover { transform: translateY(-8px); border-color: #28a745; box-shadow: 0 10px 25px rgba(40,167,69,0.15); }
    
    .teacher-photo { width: 110px; height: 130px; object-fit: cover; border-radius: 10px; margin-bottom: 12px; border: 3px solid #f8f8f8; }
    .teacher-info h4 { margin: 8px 0; color: #1b5e20; font-size: 16px; font-weight: 700; height: 40px; display: flex; align-items: center; justify-content: center; }
    .desg-text { color: #28a745; font-weight: 600; font-size: 13px; margin-bottom: 8px !important; }
    .teacher-info p { margin: 4px 0; font-size: 12.5px; color: #555; }
    .teacher-info i { color: #28a745; width: 18px; }

    .carousel-controls { position: absolute; top: 55%; width: 100%; left: 0; display: flex; justify-content: space-between; transform: translateY(-50%); pointer-events: none; padding: 0 5px; }
    .prev-btn, .next-btn { background: #28a745; color: #fff; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; pointer-events: auto; transition: 0.3s; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
    .prev-btn:hover, .next-btn:hover { background: #1b5e20; transform: scale(1.1); }
</style>

<script>
    const slider = document.querySelector('.carousel-slider');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');
    let counter = 0;

    function getVisibleCards() {
        if (window.innerWidth <= 480) return 1;
        if (window.innerWidth <= 768) return 2;
        if (window.innerWidth <= 1024) return 3;
        return 4;
    }

    nextBtn.addEventListener('click', () => {
        const visible = getVisibleCards();
        const totalItems = document.querySelectorAll('.carousel-item').length;
        if (counter >= totalItems - visible) {
            counter = 0;
        } else {
            counter++;
        }
        updateSlider();
    });

    prevBtn.addEventListener('click', () => {
        if (counter <= 0) {
            const visible = getVisibleCards();
            counter = document.querySelectorAll('.carousel-item').length - visible;
        } else {
            counter--;
        }
        updateSlider();
    });

    function updateSlider() {
        const visible = getVisibleCards();
        const width = slider.clientWidth / visible;
        slider.style.transform = 'translateX(' + (-width * counter) + 'px)';
    }

    // উইন্ডো রিসাইজ করলে স্লাইডার ঠিক করা
    window.addEventListener('resize', () => {
        counter = 0;
        updateSlider();
    });

    // অটো স্লাইড (৫ সেকেন্ড পর পর)
    setInterval(() => { nextBtn.click(); }, 5000);
</script>
HTML;

echo $teacher_carousel_html;
?>
