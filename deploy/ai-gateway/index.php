<?php
/**
 * Enterprise-Grade multi-tenant PHP AI Gateway
 * Proxies chat completions (streaming & non-streaming) and embeddings.
 */

// Disable error display in production to prevent stack trace leakage, log instead.
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Load config file securely
$configFile = __DIR__ . '/private/ai-config.php';
if (!file_exists($configFile)) {
    // Check fallback for development / setup
    $configFile = __DIR__ . '/private/ai-config.example.php';
}

$config = file_exists($configFile) ? include($configFile) : null;

if (!$config || !is_array($config)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => 'AI Gateway configuration file is missing or invalid on host.',
            'code' => 'GATEWAY_CONFIG_ERROR'
        ]
    ]);
    exit;
}

$requestMethod = $_SERVER['REQUEST_METHOD'] ?? 'GET';

// 1. Health Check (GET)
if ($requestMethod === 'GET') {
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'status' => 'healthy',
        'gateway' => 'active',
        'capabilities' => [
            'chat.completions' => true,
            'embeddings' => true,
            'streaming' => true
        ],
        'timestamp' => time()
    ]);
    exit;
}

// 2. Authenticate POST Operations
if ($requestMethod !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => 'Only GET (health) and POST (operations) are allowed.',
            'code' => 'METHOD_NOT_ALLOWED'
        ]
    ]);
    exit;
}

// Extract and validate Token using timing-safe comparison
$headers = getallheaders();
$gatewayToken = $headers['X-Gateway-Token'] ?? $headers['x-gateway-token'] ?? '';

if (empty($gatewayToken) || empty($config['gateway_token']) || !hash_equals($config['gateway_token'], $gatewayToken)) {
    http_response_code(401);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => 'Unauthorized. Missing or invalid X-Gateway-Token.',
            'code' => 'UNAUTHORIZED'
        ]
    ]);
    exit;
}

// 3. Read and Decode Request Body
$rawBody = file_get_contents('php://input');
if (empty($rawBody)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => 'Empty request body.',
            'code' => 'BAD_REQUEST'
        ]
    ]);
    exit;
}

$requestData = json_decode($rawBody, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => 'Malformed JSON: ' . json_last_error_msg(),
            'code' => 'MALFORMED_JSON'
        ]
    ]);
    exit;
}

$operation = $requestData['operation'] ?? '';
$payload = $requestData['payload'] ?? null;

if (empty($operation) || !is_array($payload)) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => 'Missing operation or payload key.',
            'code' => 'BAD_REQUEST'
        ]
    ]);
    exit;
}

// Check allowed operations
if (!empty($config['allowed_operations']) && !in_array($operation, $config['allowed_operations'])) {
    http_response_code(403);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'error' => [
            'message' => "Operation '{$operation}' is forbidden by gateway policy.",
            'code' => 'OPERATION_FORBIDDEN'
        ]
    ]);
    exit;
}

// 4. Handle Operations
if ($operation === 'chat.completions') {
    $apiKey = $config['openrouter_api_key'] ?? '';
    if (empty($apiKey)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => ['message' => 'OpenRouter API key is not configured on gateway.', 'code' => 'CONFIG_ERROR']]);
        exit;
    }

    $model = $payload['model'] ?? '';
    if (!empty($config['allowed_models']) && !in_array($model, $config['allowed_models'])) {
        http_response_code(403);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => ['message' => "Model '{$model}' is not allowed.", 'code' => 'MODEL_FORBIDDEN']]);
        exit;
    }

    $isStream = isset($payload['stream']) && $payload['stream'] === true;

    $url = 'https://openrouter.ai/api/v1/chat/completions';
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
        'HTTP-Referer: https://shop-builder.ir',
        'X-Title: SaaS Shop Builder'
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, !$isStream);
    curl_setopt($ch, CURLOPT_TIMEOUT, 180);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 15);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    if ($isStream) {
        header('Content-Type: text/event-stream; charset=utf-8');
        header('X-Accel-Buffering: no'); // Tell Nginx/Cloudflare/LiteSpeed not to buffer
        header('Connection: keep-alive');

        // Turn off output buffering in PHP
        while (ob_get_level() > 0) {
            ob_end_clean();
        }
        ob_implicit_flush(true);

        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
            echo $data;
            if (ob_get_level() > 0) {
                ob_flush();
            }
            flush();
            return strlen($data);
        });

        curl_exec($ch);

        if (curl_errno($ch)) {
            $err = curl_error($ch);
            error_log("AI Gateway cURL streaming error: " . $err);
        }

        curl_close($ch);
        exit;
    } else {
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if (curl_errno($ch)) {
            $err = curl_error($ch);
            error_log("AI Gateway cURL error: " . $err);
            http_response_code(502);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode(['error' => ['message' => 'Upstream request timeout or network failure.', 'code' => 'UPSTREAM_FAILURE']]);
            curl_close($ch);
            exit;
        }

        curl_close($ch);

        http_response_code($httpCode);
        header('Content-Type: application/json; charset=utf-8');
        echo $response;
        exit;
    }

} elseif ($operation === 'embeddings') {
    $apiKey = $config['openai_api_key'] ?? $config['openrouter_api_key'] ?? '';
    if (empty($apiKey)) {
        http_response_code(500);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => ['message' => 'Embedding API key is not configured on gateway.', 'code' => 'CONFIG_ERROR']]);
        exit;
    }

    // Determine target based on which key is present
    $isOpenAI = !empty($config['openai_api_key']);
    $url = $isOpenAI ? 'https://api.openai.com/v1/embeddings' : 'https://openrouter.ai/api/v1/embeddings';

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    if (curl_errno($ch)) {
        $err = curl_error($ch);
        error_log("AI Gateway Embedding cURL error: " . $err);
        http_response_code(502);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['error' => ['message' => 'Upstream embedding request timeout or network failure.', 'code' => 'UPSTREAM_FAILURE']]);
        curl_close($ch);
        exit;
    }

    curl_close($ch);

    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo $response;
    exit;
}

// Catch-all fall through
http_response_code(400);
header('Content-Type: application/json; charset=utf-8');
echo json_encode([
    'error' => [
        'message' => "Unknown or unsupported operation '{$operation}'.",
        'code' => 'BAD_REQUEST'
    ]
]);
exit;

// Polyfill for environments missing getallheaders
if (!function_exists('getallheaders')) {
    function getallheaders() {
        $headers = [];
        foreach ($_SERVER as $name => $value) {
            if (substr($name, 0, 5) == 'HTTP_') {
                $headers[str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($name, 5)))))] = $value;
            }
        }
        return $headers;
    }
}
