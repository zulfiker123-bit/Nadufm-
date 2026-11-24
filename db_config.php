<?php
$servername = "localhost";
$username = "nadufme1_notice"; 
$password = "nadufm118778";
$dbname = "nadufme1_notice";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
// বাংলা ফন্ট সাপোর্ট করার জন্য
$conn->set_charset("utf8");
?>
