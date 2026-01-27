<?php
require_once __DIR__ . '/config/database.php';
try {
    $db = getDBConnection();
    $stmt = $db->query("DESCRIBE tips");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($columns, JSON_PRETTY_PRINT);
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>