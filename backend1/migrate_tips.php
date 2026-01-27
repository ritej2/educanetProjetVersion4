<?php
require_once __DIR__ . '/config/database.php';
try {
    $db = getDBConnection();

    // Check if columns exist
    $stmt = $db->query("SHOW COLUMNS FROM tips");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);

    if (!in_array('icon', $columns)) {
        $db->exec("ALTER TABLE tips ADD COLUMN icon VARCHAR(50) DEFAULT 'lightbulb' AFTER description");
        echo "Added 'icon' column.<br>";
    }

    if (!in_array('color', $columns)) {
        $db->exec("ALTER TABLE tips ADD COLUMN color VARCHAR(50) DEFAULT 'gradient-default' AFTER icon");
        echo "Added 'color' column.<br>";
    }

    if (!in_array('updated_at', $columns)) {
        $db->exec("ALTER TABLE tips ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP");
        echo "Added 'updated_at' column.<br>";
    }

    echo "Migration completed successfully!";
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>