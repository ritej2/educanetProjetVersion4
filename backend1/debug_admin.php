<?php
require_once __DIR__ . '/config/database.php';

try {
    $conn = getDBConnection();
    $stmt = $conn->prepare("SELECT id, name, email, role FROM users WHERE email = 'admin@admin.com'");
    $stmt->execute();
    $user = $stmt->fetch();

    if ($user) {
        echo "Found user: " . $user['email'] . "\n";
        echo "Role: " . ($user['role'] ? $user['role'] : 'NULL') . "\n";
    } else {
        echo "Admin user not found.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>