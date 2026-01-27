<?php
require_once __DIR__ . '/config/database.php';
$db = getDBConnection();
echo "Converting tables to InnoDB...\n";

try {
    $db->exec("ALTER TABLE users ENGINE=InnoDB");
    $db->exec("ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Converted 'users' to InnoDB utf8mb4.\n";
} catch (PDOException $e) {
    echo "Error converting 'users': " . $e->getMessage() . "\n";
}

try {
    $db->exec("ALTER TABLE children ENGINE=InnoDB");
    $db->exec("ALTER TABLE children CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    echo "Converted 'children' to InnoDB utf8mb4.\n";
} catch (PDOException $e) {
    // children might not exist yet or error
    echo "Note on 'children': " . $e->getMessage() . "\n";
}

echo "Conversion complete.\n";
?>