<?php
/**
 * RAG Configuration
 */

// Database connection (reuse existing)
require_once __DIR__ . '/../config/database.php';

// Ollama API Configuration
define('OLLAMA_BASE_URL', 'http://127.0.0.1:11434');
define('OLLAMA_MODEL_CHAT', 'llama3.2'); // User typically has llama3.2
define('OLLAMA_MODEL_EMBED', 'mxbai-embed-large'); // Common embedding model for Ollama

/**
 * Utility to make cURL requests to Ollama
 */
function callOllama($endpoint, $data)
{
    $ch = curl_init(OLLAMA_BASE_URL . $endpoint);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        throw new Exception('Curl error: ' . curl_error($ch));
    }
    curl_close($ch);

    return json_decode($response, true);
}
