<?php
/**
 * Test suite for verifying PHP AI Gateway invariants.
 * Run via CLI: php deploy/ai-gateway/test-gateway.php
 */

echo "\n==================================================\n";
echo "       PHP AI GATEWAY INVARIANT TEST SUITE        \n";
echo "==================================================\n\n";

function runGateway($method, $headers, $body) {
    $tempFile = tempnam(sys_get_temp_dir(), 'php_gateway_test_');
    file_put_contents($tempFile, $body);
    
    $stdinHandle = fopen($tempFile, 'r');
    
    $cmd = '"' . PHP_BINARY . '" deploy/ai-gateway/index.php';
    $descriptors = [
        0 => $stdinHandle,
        1 => ["pipe", "w"], // stdout
        2 => ["pipe", "w"], // stderr
    ];
    
    $env = [
        'REQUEST_METHOD' => $method,
        'REMOTE_ADDR' => '127.0.0.1',
    ];
    foreach ($headers as $k => $v) {
        $env['HTTP_' . strtoupper(str_replace('-', '_', $k))] = $v;
    }
    
    $process = proc_open($cmd, $descriptors, $pipes, null, $env);
    if (is_resource($process)) {
        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        
        $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[2]);
        
        proc_close($process);
        fclose($stdinHandle);
        unlink($tempFile);
        return [
            'stdout' => $stdout,
            'stderr' => $stderr,
        ];
    }
    fclose($stdinHandle);
    unlink($tempFile);
    return null;
}

// 1. Test Config Load
echo "1. Testing Config Load...\n";
$configFile = __DIR__ . '/private/ai-config.example.php';
if (!file_exists($configFile)) {
    echo "   ✗ FAILED: Config template missing.\n";
    exit(1);
}
$config = include($configFile);
if (!is_array($config) || !isset($config['gateway_token'])) {
    echo "   ✗ FAILED: Config structure invalid.\n";
    exit(1);
}
echo "   ✓ Config loaded successfully.\n\n";

// 2. Test Health Check (GET)
echo "2. Testing Health Check (GET)...\n";
$res = runGateway('GET', [], '');
$stdout = $res['stdout'];
if (preg_match('/\{.*\}/s', $stdout, $matches)) {
    $response = json_decode($matches[0], true);
} else {
    $response = json_decode($stdout, true);
}
if ($response && isset($response['status']) && $response['status'] === 'healthy') {
    echo "   ✓ Health check returned healthy.\n\n";
} else {
    echo "   ✗ FAILED: Health check returned: " . json_encode($res) . "\n";
    exit(1);
}

// 3. Test Wrong Token
echo "3. Testing Authentication (Wrong Token)...\n";
$res = runGateway('POST', ['X-Gateway-Token' => 'wrong-token'], json_encode([
    'operation' => 'chat.completions',
    'payload' => ['model' => 'test']
]));
$stdout = $res['stdout'];
if (preg_match('/\{.*\}/s', $stdout, $matches)) {
    $response = json_decode($matches[0], true);
} else {
    $response = json_decode($stdout, true);
}
if ($response && isset($response['error']['code']) && $response['error']['code'] === 'UNAUTHORIZED') {
    echo "   ✓ Unauthorized token rejected correctly.\n\n";
} else {
    echo "   ✗ FAILED: Unauthorized token was not rejected correctly. Output: " . json_encode($res) . "\n";
    exit(1);
}

// 4. Test Malformed JSON
echo "4. Testing Malformed JSON...\n";
$res = runGateway('POST', ['X-Gateway-Token' => 'YOUR_SECURE_GATEWAY_TOKEN'], "{ malformed json");
$stdout = $res['stdout'];
if (preg_match('/\{.*\}/s', $stdout, $matches)) {
    $response = json_decode($matches[0], true);
} else {
    $response = json_decode($stdout, true);
}
if ($response && isset($response['error']['code']) && $response['error']['code'] === 'MALFORMED_JSON') {
    echo "   ✓ Malformed JSON rejected correctly.\n\n";
} else {
    echo "   ✗ FAILED: Malformed JSON was not rejected correctly. Output: " . json_encode($res) . "\n";
    exit(1);
}

// 5. Test Missing Model
echo "5. Testing Missing Model...\n";
$res = runGateway('POST', ['X-Gateway-Token' => 'YOUR_SECURE_GATEWAY_TOKEN'], json_encode([
    'operation' => 'chat.completions',
    'payload' => []
]));
$stdout = $res['stdout'];
if (preg_match('/\{.*\}/s', $stdout, $matches)) {
    $response = json_decode($matches[0], true);
} else {
    $response = json_decode($stdout, true);
}
if ($response && isset($response['error']['code']) && $response['error']['code'] === 'INVALID_MODEL') {
    echo "   ✓ Missing model rejected correctly.\n\n";
} else {
    echo "   ✗ FAILED: Missing model was not rejected correctly. Output: " . json_encode($res) . "\n";
    exit(1);
}

echo "==================================================\n";
echo "   ALL PHP GATEWAY INVARIANT TESTS PASSED! (0)    \n";
echo "==================================================\n\n";
exit(0);
