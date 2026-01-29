<?php


require_once __DIR__ . '/../../config/cors.php';
require_once __DIR__ . '/../../models/Message.php';
require_once __DIR__ . '/../../models/Conversation.php';
require_once __DIR__ . '/../../utils/JWTHandler.php';
require_once __DIR__ . '/../../utils/Response.php';


$payload = JWT::verifyRequest();
if (!$payload) {
    Response::unauthorized();
}

$userId = $payload['user_id'];
$messageModel = new Message();
$conversationModel = new Conversation();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':

        $conversationId = $_GET['conversation_id'] ?? null;

        if (!$conversationId) {
            Response::error('ID de conversation requis');
        }

        $conversation = $conversationModel->findById($conversationId);
        if (!$conversation || $conversation['user_id'] != $userId) {
            Response::unauthorized('Accès non autorisé à cette conversation');
        }

        $messages = $messageModel->getConversationMessages($conversationId);
        Response::success($messages);
        break;

    case 'POST':
        $input = json_decode(file_get_contents('php://input'), true);


        if (empty($input['conversation_id']) || empty($input['role']) || empty($input['content'])) {
            $missing = [];
            if (empty($input['conversation_id']))
                $missing[] = 'conversation_id';
            if (empty($input['role']))
                $missing[] = 'role';
            if (empty($input['content']))
                $missing[] = 'content';
            Response::error('Données manquantes : ' . implode(', ', $missing) . '. Input: ' . json_encode($input));
        }

        // Map 'ai' to 'bot' for compatibility with some schema versions
        $role = $input['role'];
        if ($role === 'ai')
            $role = 'bot';
        if ($role === 'assistant')
            $role = 'bot';

        $conversation = $conversationModel->findById($input['conversation_id']);
        if (!$conversation || $conversation['user_id'] != $userId) {
            Response::unauthorized('Accès non autorisé à cette conversation');
        }


        $message = $messageModel->create(
            $input['conversation_id'],
            $role,
            $input['content']
        );

        // Update conversation timestamp
        $conversationModel->touch($input['conversation_id']);

        Response::success($message, 'Message enregistré', 201);
        break;

    default:
        Response::error('Method not allowed', 405);
}
?>