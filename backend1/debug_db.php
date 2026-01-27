<?php
require_once __DIR__ . '/config/database.php';
$db = getDBConnection();
$stmt = $db->query("SHOW CREATE TABLE users");
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo "<pre>";
print_r($row);
echo "</pre>";
?>