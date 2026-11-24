<div class="news-ticker-container">
    <div class="fixed-title">ঘোষণা :</div>
    <div class="marquee-wrapper">
        <marquee behavior="scroll" direction="left" scrollamount="4" onmouseover="this.stop();" onmouseout="this.start();">
            <?php 
            // $headlines ভেরিয়েবলটি fetch_notices.php থেকে আসছে
            if (!empty($headlines)) {
                $announcements = array_column($headlines, 'announcement');
                echo implode(" &nbsp;&nbsp;&nbsp;&nbsp; ● &nbsp;&nbsp;&nbsp;&nbsp; ", $announcements);
            } else {
                echo "বর্তমানে কোনো বিশেষ ঘোষণা নেই।";
            }
            ?>
        </marquee>
    </div>
</div>
