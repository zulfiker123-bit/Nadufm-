<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
include('fetch_notices.php');
?>

<?php include('fetch_notices.php'); ?>
<section id="notice-section">
    <div class="notice-header">
        <h3> নোটিশ বোর্ড</h3>
    </div>
    <div class="notice-board-container">
        <ul class="notice-list" id="notice-list-container">
            <li class="notice-item">
                <a href="#" class="notice-link">
                    <span class="notice-subject" style="text-align:center; width:100%">নোটিশ লোড হচ্ছে...</span>
                </a>
            </li>
        </ul>
        
        <div class="view-all" style="display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px;">
            <button id="prevBtn" onclick="changePage(-1)" class="read-more-button" style="border:none; cursor:pointer; padding: 5px 15px;">আগে</button>
            <div id="page-numbers" style="display: flex; gap: 5px;"></div>
            <button id="nextBtn" onclick="changePage(1)" class="read-more-button" style="border:none; cursor:pointer; padding: 5px 15px;">পরে</button>
        </div>
    </div>


<style>
    .page-num {
        padding: 5px 12px;
        background: #fff;
        border: 1px solid #ddd;
        color: #333;
        text-decoration: none;
        cursor: pointer;
        border-radius: 4px;
        font-weight: bold;
    }
    .page-num.active {
        background: #28a745; 
        color: #fff;
        border-color: #28a745;
    }
    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>

<script>
    // PHP থেকে ডাটা জাভাস্ক্রিপ্টে ইনজেক্ট করা
    const allData = <?php echo json_encode($notices); ?>;
    
    const itemsPerPage = 5; 
    let currentPage = 1;
    const noticeIcons = ["fas fa-bell", "fas fa-info-circle", "fas fa-exclamation-triangle", "fas fa-bullhorn", "fas fa-envelope"];

    function renderNotices() {
        const container = document.getElementById('notice-list-container');
        container.innerHTML = "";
        
        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const pagedItems = allData.slice(start, end);

        if (pagedItems.length === 0) {
            container.innerHTML = '<li class="notice-item"><span class="notice-subject" style="text-align:center; width:100%">কোনো নোটিশ পাওয়া যায়নি।</span></li>';
            return;
        }

        pagedItems.forEach((item, index) => {
            const isNew = item.isNew && item.isNew.toString().trim().toLowerCase() === 'yes';
            const iconClass = noticeIcons[index % noticeIcons.length];

            // লিংকের লজিক: লিংক না থাকলে view_notice.php?id=... তে যাবে
            const targetLink = (item.link && item.link !== "#" && item.link.trim() !== "") 
                               ? item.link 
                               : `view_notice.php?id=${item.id}`;

            const li = document.createElement('li');
            li.className = `notice-item`;
            li.innerHTML = `
                <a href="${targetLink}" target="_blank" class="notice-link">
                    <span class="notice-icon"><i class="${iconClass}"></i></span>
                    <span class="notice-date">${item.date}</span>
                    <span class="notice-subject">
                        ${item.subject} 
                        ${isNew ? '<span class="new-badge">NEW</span>' : ''}
                    </span>
                </a>`;
            container.appendChild(li);
        });

        setupPagination();
    }

    function setupPagination() {
        const totalPages = Math.ceil(allData.length / itemsPerPage);
        const pageNumbersContainer = document.getElementById('page-numbers');
        pageNumbersContainer.innerHTML = "";

        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement('span');
            btn.innerText = i;
            btn.className = `page-num ${i === currentPage ? 'active' : ''}`;
            btn.onclick = function() {
                currentPage = i;
                renderNotices();
                // স্ক্রল করে নোটিশ বোর্ডের শুরুতে নিয়ে যাওয়া
                document.getElementById('notice-section').scrollIntoView({ behavior: 'smooth' });
            };
            pageNumbersContainer.appendChild(btn);
        }

        document.getElementById('prevBtn').disabled = (currentPage === 1);
        document.getElementById('nextBtn').disabled = (currentPage === totalPages || totalPages === 0);
    }

    function changePage(step) {
        currentPage += step;
        renderNotices();
    }

    document.addEventListener('DOMContentLoaded', renderNotices);
</script>
