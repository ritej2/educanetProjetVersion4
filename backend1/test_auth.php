<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Content-Type: application/json');

$headers = function_exists('getallheaders') ? getallheaders() : [];
$apache_headers = function_exists('apache_request_headers') ? apache_request_headers() : 'N/A';

echo json_encode([
    'getallheaders' => $headers,
    'apache_request_headers' => $apache_headers,
    '$_SERVER_HTTP_AUTHORIZATION' => $_SERVER['HTTP_AUTHORIZATION'] ?? 'NOT SET',
    '$_SERVER_HTTP_X_TOKEN' => $_SERVER['HTTP_X_TOKEN'] ?? 'NOT SET',
    '$_SERVER_REDIRECT_HTTP_X_TOKEN' => $_SERVER['REDIRECT_HTTP_X_TOKEN'] ?? 'NOT SET',
    'PHP_SAPI' => php_sapi_name()
], JSON_PRETTY_PRINT);
?>