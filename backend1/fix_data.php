<?php
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/models/UserModel.php';

echo "Starting data fix / migration...\n";

try {
    $conn = getDBConnection();
    $userModel = new User();

    // 1. Ensure Admin User Exists
    $adminEmail = 'admin@admin.com';
    $existingAdmin = $userModel->findByEmail($adminEmail);

    if (!$existingAdmin) {
        echo "Creating admin user ($adminEmail)...\n";
        // Create user via model (hashes password)
        // Note: User::create doesn't support role yet in my previous check of User.php
        // I need to insert it manually or update create() later. 
        // For now, I'll use User::create then update role manually.
        $userModel->create('Admin', $adminEmail, 'admin123'); // Password: admin123

        // Update role to admin
        $stmt = $conn->prepare("UPDATE users SET role = 'admin' WHERE email = :email");
        $stmt->execute(['email' => $adminEmail]);
        echo "Admin user created.\n";
    } else {
        echo "Admin user exists. updating role and resetting password.\n";
        // Update role
        $stmt = $conn->prepare("UPDATE users SET role = 'admin' WHERE email = :email");
        $stmt->execute(['email' => $adminEmail]);

        // Update password manually to ensure it is 'admin123'
        $newHash = password_hash('admin123', PASSWORD_BCRYPT);
        $stmtPwd = $conn->prepare("UPDATE users SET password_hash = :hash WHERE email = :email");
        $stmtPwd->execute(['hash' => $newHash, 'email' => $adminEmail]);
        echo "Admin password reset to 'admin123'.\n";
    }

    // 2. Clear old bad data? (Optional, per user request "script de fix")
    // For now, just ensuring admin is key.

    echo "Data fix completed.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>