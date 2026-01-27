<?php
require_once __DIR__ . '/models/UserModel.php';

try {
    $conn = getDBConnection();
    $stmt = $conn->query("SELECT * FROM users");
    $users = $stmt->fetchAll();

    echo "Total Users: " . count($users) . "\n";
    foreach ($users as $u) {
        echo "ID: " . $u['id'] . " | Email: " . $u['email'] . " | Role: " . ($u['role'] ?? 'NULL') . "\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>