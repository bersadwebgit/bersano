<?php
/**
 * AI Gateway Private Configuration Template
 * Rename this file to ai-config.php and place it in the same private folder.
 */

return [
    // Token that the Next.js SaaS server must present in the X-Gateway-Token header.
    // Ensure this is a strong, cryptographically secure random string.
    'gateway_token' => 'YOUR_SECURE_GATEWAY_TOKEN',

    // Upstream API keys.
    // The keys are kept on this private server, completely isolated from the Next.js server.
    'openrouter_api_key' => 'YOUR_OPENROUTER_API_KEY',
    
    // Optional: Separate key for OpenAI embeddings (if not using OpenRouter for embeddings)
    'openai_api_key' => 'YOUR_OPENAI_API_KEY',

    // Configurable model or operation policies if desired
    'allowed_operations' => ['chat.completions', 'embeddings'],
    'allowed_models' => [], // Leave empty to permit all models resolved by Next.js
];
