// --- নেভিগেশন মেনু টগল ---
function toggleMenu() {
    var nav = document.getElementById("mainNav");
    nav.classList.toggle("active");
}

// --- শিক্ষক ক্যারোসেল স্ক্রিপ্ট ---
document.addEventListener('DOMContentLoaded', function() {
    const slider = document.querySelector('.carousel-slider');
    const items = document.querySelectorAll('.carousel-item');
    const nextBtn = document.querySelector('.next-btn');
    const prevBtn = document.querySelector('.prev-btn');

    if (!slider || items.length === 0) return; // ক্যারোসেল না থাকলে স্ক্রিপ্ট বন্ধ

    let currentIndex = 0;
    const totalItems = items.length;
    const itemMargin = 20; // CSS-এ দেওয়া মার্জিন

    function getVisibleItems() {
        if (window.innerWidth <= 768) {
            return 1; // মোবাইলে একটি আইটেম
        } else if (window.innerWidth <= 1024) {
            return 2; // ট্যাবলেটে দুটি
        } else {
            return 4; // ডেক্সটপে চারটি
        }
    }

    function getItemWidth() {
        // অভিভাবক কন্টেইনারের প্রস্থ (padding 20px বাদ দিয়ে)
        const containerWidth = slider.parentElement.clientWidth - 40; 
        const visible = getVisibleItems();
        // কন্টেইনারের প্রস্থ থেকে মোট মার্জিন বাদ দিয়ে দৃশ্যমান আইটেমের সংখ্যা দিয়ে ভাগ করে একটি আইটেমের প্রস্থ
        return (containerWidth - (itemMargin * (visible - 1))) / visible;
    }

    function updateSlider() {
        const visible = getVisibleItems();
        const width = getItemWidth() + itemMargin; 
        slider.style.transform = `translateX(-${currentIndex * width}px)`;

        // বাটন ডিসেবল/এনেবল লজিক
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex >= (totalItems - visible);
    }

    function nextSlide() {
        const visible = getVisibleItems();
        if (currentIndex < totalItems - visible) {
            currentIndex++;
        } else {
            currentIndex = 0; // লুপ করার জন্য
        }
        updateSlider();
    }

    function prevSlide() {
        const visible = getVisibleItems();
        if (currentIndex > 0) {
            currentIndex--;
        } else {
            // লুপ করার জন্য: যদি লুপ করতে না চান, তবে শুধু return;
            currentIndex = totalItems - visible > 0 ? totalItems - visible : 0; 
        }
        updateSlider();
    }

    nextBtn.addEventListener('click', function() {
        nextSlide();
        resetAutoScroll();
    });
    prevBtn.addEventListener('click', function() {
        prevSlide();
        resetAutoScroll();
    });

    window.addEventListener('resize', () => {
        // রিসাইজ হলে currentIndex ঠিক করা
        const maxIndex = totalItems - getVisibleItems();
        if (currentIndex > maxIndex && maxIndex > 0) {
            currentIndex = maxIndex;
        } else if (maxIndex <= 0) {
            currentIndex = 0;
        }
        updateSlider();
    });

    // ৩ সেকেন্ড পর পর অটো স্ক্রোল
    let autoScrollInterval = setInterval(nextSlide, 3000);

    function resetAutoScroll() {
        clearInterval(autoScrollInterval);
        autoScrollInterval = setInterval(nextSlide, 3000);
    }

    updateSlider(); // লোডের সময় একবার কল করা
});
const API_URL = 'fetch_notice.php'; // ফাইলটির নাম যেন একদম সঠিক থাকে
