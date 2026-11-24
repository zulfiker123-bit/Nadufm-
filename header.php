<?php
// header.php: Contains the document head and the main header/navigation structure.
?>
<!DOCTYPE html>
<html lang="bn">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>নলতা আহছানিয়া দারুল উলুম ফাজিল( ডিগ্রী )মাদ্রাসা</title>
    
    <link rel="shortcut icon" href="logo.png" type="image/x-icon">
    <link rel="icon" href="logo.png" type="image/png">
    <link rel="apple-touch-icon" href="logo.png">

    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>

<body>

     <header class="main-header">
        <div class="header-top">
            <div class="logo-area">
                <img src="logo.png" alt="লোগো" class="logo">
                <div class="title-description">
                    <h1>নলতা আহছানিয়া দারুল উলুম ফাজিল (ডিগ্রী )মাদ্রাসা</h1>
                    <p class="site-description"> নলতা শরীফ, কালিগঞ্জ, সাতক্ষীরা EIIN:118778 Phone: +8801719568538, naltaalimmadrasha@gmail.com</p>
                </div>
            </div>

            <div class="menu-icon" onclick="toggleMenu()">
                <div class="bar"></div>
                <div class="bar"></div>
                <div class="bar"></div>
            </div>
        </div>

         <nav class="main-nav" id="mainNav">
            <ul>
                <li> <button> <a href="index.php"><img src="home-icon.png" alt="Home" class="nav-icon"> </a></button></li>
                <li><button><a href="about.php">আমাদের সম্পর্কে</a ></button> </li> 
                <li><button><a href="teacher-list.php">শিক্ষক-কর্মচারী</a></button></li>
                <li><button><a href="contact.php">যোগাযোগ</a></button></li>
                <li><button><a href="student.php">ছাত্র-ছাত্রী তথ্য</a></button></li>
                <li><button><a href="governingbody.php">গভর্নিং বডি </a></button></li>
                <li><button><a href="result.php">ফলাফল</a></button></li>
            </ul>
        </nav>
    </header>
      <?php 
     ?>
   
     <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>

