<?php
require_once __DIR__ . '/models/UserModel.php';

$userModel = new User();
$email = 'admin@admin.com';
$user = $userModel->findByEmail($email);

echo "--- Row from DB ---\n";
echo json_encode($user, JSON_PRETTY_PRINT) . "\n";

echo "\n--- Sanitized ---\n";
$sanitized = $userModel->sanitize($user);
echo json_encode($sanitized, JSON_PRETTY_PRINT) . "\n";
?>