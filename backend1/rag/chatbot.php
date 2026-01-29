<?php
/**
 * RAG Chatbot Script
 * Optimized for Angular integration and DB persistence.
 */

// Permettre à l'erreur de s'afficher pour le debug
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/config.php';
$pdo = getDBConnection();

/**
 * Log debug information
 */
function ragLog($msg)
{
    file_put_contents(__DIR__ . '/rag_debug.log', "[" . date('Y-m-d H:i:s') . "] " . $msg . PHP_EOL, FILE_APPEND);
}

/**
 * Cosine Similarity
 */
function cosineSimilarity($vec1, $vec2)
{
    if (count($vec1) !== count($vec2))
        return 0;
    $dotProduct = 0;
    $norm1 = 0;
    $norm2 = 0;
    for ($i = 0; $i < count($vec1); $i++) {
        $dotProduct += $vec1[$i] * $vec2[$i];
        $norm1 += $vec1[$i] ** 2;
        $norm2 += $vec2[$i] ** 2;
    }
    return ($norm1 == 0 || $norm2 == 0) ? 0 : $dotProduct / (sqrt($norm1) * sqrt($norm2));
}

/**
 * Save AI Response to DB
 */
function saveAIMessage($pdo, $conversationId, $content)
{
    if (!$conversationId || empty($content))
        return;
    try {
        $stmt = $pdo->prepare("INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'ai', ?)");
        $stmt->execute([$conversationId, $content]);
    } catch (Exception $e) {
        try {
            $stmt = $pdo->prepare("INSERT INTO chat_messages (conversation_id, sender, message) VALUES (?, 'bot', ?)");
            $stmt->execute([$conversationId, $content]);
        } catch (Exception $e2) {
            ragLog("DB Error: " . $e2->getMessage());
        }
    }
}

// 1. Get Input
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);
ragLog("Received: " . $rawInput);

$question = '';
$history = [];
$conversationId = null;

if ($input) {
    $conversationId = $input['conversation_id'] ?? null;
    $history = $input['messages'] ?? [];

    // Find last user message
    foreach (array_reverse($history) as $msg) {
        if (isset($msg['role']) && $msg['role'] === 'user') {
            $question = $msg['content'] ?? '';
            break;
        }
    }
} else {
    $question = $_GET['question'] ?? '';
}

if (empty($question)) {
    ragLog("Error: Question manquante");
    http_response_code(400);
    die(json_encode(['error' => 'Question manquante']));
}

try {
    // 2. Embed
    $resEmbed = callOllama('/api/embeddings', [
        'model' => OLLAMA_MODEL_EMBED,
        'prompt' => $question
    ]);

    if (!isset($resEmbed['embedding'])) {
        throw new Exception("Modèle d'embedding non disponible. Lancez 'ollama pull " . OLLAMA_MODEL_EMBED . "'");
    }

    $queryVector = $resEmbed['embedding'];

    // 3. Search Chunks
    $stmt = $pdo->query("SELECT content, embedding, source_file FROM document_chunks");
    $allChunks = $stmt->fetchAll();

    $contextText = "Aucun document source disponible.";
    if (!empty($allChunks)) {
        $results = [];
        foreach ($allChunks as $chunk) {
            $vec = json_decode($chunk['embedding'], true);
            if ($vec) {
                $sim = cosineSimilarity($queryVector, $vec);
                $results[] = ['content' => $chunk['content'], 'similarity' => $sim, 'source' => $chunk['source_file']];
            }
        }
        usort($results, function ($a, $b) {
            return $b['similarity'] <=> $a['similarity'];
        });

        $contextStrings = [];
        ragLog("Top matches for: " . $question);
        foreach (array_slice($results, 0, 5) as $c) {
            ragLog("Score: " . round($c['similarity'], 4) . " | Source: " . $c['source'] . " | Content: " . mb_substr($c['content'], 0, 50) . "...");
            if ($c['similarity'] > 0.35) { // Threshold légèrement réduit
                $contextStrings[] = "[" . $c['source'] . "]: " . $c['content'];
            }
        }
        if (!empty($contextStrings))
            $contextText = implode("\n", $contextStrings);
    }

    // 4. Prepare Ollama Chat
    $ragInstructions = "### INFORMATIONS IMPORTANTES (À UTILISER EN PRIORITÉ) :\n" . $contextText . "\n\n" .
        "RÈGLES POUR TA RÉPONSE :\n" .
        "- Si la réponse est dans les INFORMATIONS ci-dessus, tu DOIS l'utiliser.\n" .
        "- Ne dis pas 'Je vais chercher sur le site' ou 'D'après mes recherches'. Réponds directement.\n" .
        "- Si l'info n'est pas là, dis : 'Nos documents ne précisent pas cela, mais en général...'";

    // On remplace le premier message système (s'il existe) par une version fusionnée pour éviter les conflits
    if (count($history) > 0 && $history[0]['role'] === 'system') {
        $history[0]['content'] .= "\n\n" . $ragInstructions;
    } else {
        array_unshift($history, ['role' => 'system', 'content' => $ragInstructions]);
    }

    $ollamaData = [
        'model' => OLLAMA_MODEL_CHAT,
        'messages' => $history,
        'stream' => isset($input['stream']) ? $input['stream'] : false
    ];

    $ch = curl_init(OLLAMA_BASE_URL . '/api/chat');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($ollamaData));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

    $fullAIResponse = "";

    if ($ollamaData['stream']) {
        header('Content-Type: application/x-ndjson');
        // On utilise un tampon pour reconstruire la réponse complète pour la DB
        $streamBuffer = "";
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function ($ch, $data) use (&$fullAIResponse, &$streamBuffer) {
            echo $data;
            $streamBuffer .= $data;

            // Tentative d'extraction simple pour le stockage
            $lines = explode("\n", $data);
            foreach ($lines as $line) {
                $j = json_decode($line, true);
                if ($j && isset($j['message']['content'])) {
                    $fullAIResponse .= $j['message']['content'];
                }
            }

            if (ob_get_level() > 0)
                ob_flush();
            flush();
            return strlen($data);
        });
        curl_exec($ch);

        // Save to DB AFTER stream ends
        saveAIMessage($pdo, $conversationId, $fullAIResponse);
    } else {
        $response = curl_exec($ch);
        echo $response;
        $j = json_decode($response, true);
        if ($j && isset($j['message']['content'])) {
            saveAIMessage($pdo, $conversationId, $j['message']['content']);
        }
    }

    curl_close($ch);

} catch (Exception $e) {
    ragLog("Fatal Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}