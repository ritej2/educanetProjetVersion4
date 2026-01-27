<?php
require_once __DIR__ . '/../config/database.php';

try {
    $db = getDBConnection();
    echo "Connected to database...\n";

    // 1. Add role column - SKIPPED (Handled by migrate_db.php)
    // $stmt = $db->query("SHOW COLUMNS FROM users LIKE 'role'");
    // if ($stmt->fetch()) { ... }
    echo "Skipping 'role' column check (handled by base migration).\n";

    // 2. Create admin_logs table
    $db->exec("
        CREATE TABLE IF NOT EXISTS admin_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            admin_id INT NOT NULL,
            action VARCHAR(255) NOT NULL,
            details TEXT,
            ip_address VARCHAR(45),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
    echo "Created/Verified 'admin_logs' table.\n";

    // 3. Insert specific Default Admin
    $adminEmail = 'admin@gmail.com';
    $stmt = $db->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$adminEmail]);

    if (!$stmt->fetch()) {
        // password: admin123
        $hash = password_hash('admin123', PASSWORD_BCRYPT);
        $stmt = $db->prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'admin')");
        $stmt->execute(['Administrator', $adminEmail, $hash]);
        echo "Default Admin user created (admin@gmail.com / admin123).\n";
    } else {
        echo "Admin user already exists. Updating role to 'admin' just in case.\n";
        $stmt = $db->prepare("UPDATE users SET role = 'admin' WHERE email = ?");
        $stmt->execute([$adminEmail]);
    }

    echo "Migration completed successfully!\n";

} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>