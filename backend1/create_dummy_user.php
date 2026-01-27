<?php
require_once __DIR__ . '/models/UserModel.php';

echo "Creating dummy users...\n";

try {
    $userModel = new User();

    // Create dummy user
    $email = 'parent@test.com';
    $existing = $userModel->findByEmail($email);

    if (!$existing) {
        $userModel->create('Didier Deschamps', $email, 'password123');
        echo "Created User: $email / password123\n";
    } else {
        echo "User $email already exists.\n";
    }

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>