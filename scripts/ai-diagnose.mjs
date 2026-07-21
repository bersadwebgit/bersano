import { randomUUID } from 'crypto';

function sanitizeSecret(val) {
  if (!val) return 'MISSING';
  return 'SET (REDACTED)';
}

function sanitizeUrl(url) {
  if (!url) return 'MISSING';
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.hostname}${parsed.pathname}`;
  } catch (e) {
    return 'INVALID_URL';
  }
}

async function run() {
  console.log('\n==================================================');
  console.log('       AI SUBSYSTEM OFFLINE DIAGNOSTIC TOOL        ');
  console.log('==================================================\n');

  const mode = process.env.AI_TRANSPORT_MODE || 'gateway';
  const gatewayUrl = process.env.AI_GATEWAY_URL || '';
  const gatewayToken = process.env.AI_GATEWAY_TOKEN || '';
  const directApiKey = process.env.OPENROUTER_API_KEY || '';
  const chatModel = process.env.AI_CHAT_MODEL_DEFAULT || 'google/gemini-2.5-flash-lite';
  const embeddingModel = process.env.AI_EMBEDDING_MODEL || 'openai/text-embedding-3-small';

  console.log('Environment Settings:');
  console.log(`- Transport Mode: ${mode}`);
  console.log(`- Gateway URL: ${sanitizeUrl(gatewayUrl)}`);
  console.log(`- Gateway Token: ${sanitizeSecret(gatewayToken)}`);
  console.log(`- Direct API Key: ${sanitizeSecret(directApiKey)}`);
  console.log(`- Chat Model: ${chatModel}`);
  console.log(`- Embedding Model: ${embeddingModel}\n`);

  let overallSuccess = true;

  // 1. Gateway Health Check
  if (mode === 'gateway') {
    console.log('1. Testing Gateway Health (GET)...');
    if (!gatewayUrl) {
      console.error('   ✗ FAILED: AI_GATEWAY_URL is not configured.');
      overallSuccess = false;
    } else {
      const startTime = Date.now();
      try {
        const res = await fetch(gatewayUrl, {
          method: 'GET',
          headers: {
            'X-Gateway-Token': gatewayToken,
          },
        });
        const duration = Date.now() - startTime;
        console.log(`   - Status: ${res.status}`);
        console.log(`   - Duration: ${duration}ms`);
        if (res.ok) {
          const body = await res.json().catch(() => ({}));
          console.log(`   - Gateway Status: ${body.status || 'unknown'}`);
          console.log(`   - Capabilities: ${JSON.stringify(body.capabilities || {})}`);
          console.log('   ✓ Gateway is reachable and healthy.\n');
        } else {
          console.error(`   ✗ FAILED: Gateway returned status ${res.status}`);
          overallSuccess = false;
        }
      } catch (err) {
        console.error(`   ✗ FAILED: Network/Connection error: ${err.message || err}\n`);
        overallSuccess = false;
      }
    }
  } else {
    console.log('1. Skipping Gateway Health Check (Direct mode active).\n');
  }

  // 2. Chat Completion Test
  console.log('2. Testing Chat Completion...');
  const chatRequestId = randomUUID();
  const chatStartTime = Date.now();

  try {
    let url, headers, body;
    if (mode === 'gateway') {
      url = gatewayUrl;
      headers = {
        'X-Gateway-Token': gatewayToken,
        'X-Request-Id': chatRequestId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      body = JSON.stringify({
        version: '1',
        requestId: chatRequestId,
        operation: 'chat.completions',
        payload: {
          model: chatModel,
          messages: [{ role: 'user', content: 'respond with only "pong"' }],
          temperature: 0.1,
          max_tokens: 5,
        },
      });
    } else {
      url = 'https://openrouter.ai/api/v1/chat/completions';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directApiKey}`,
        'HTTP-Referer': 'https://shop-builder.ir',
        'X-Title': 'SaaS Shop Builder',
      };
      body = JSON.stringify({
        model: chatModel,
        messages: [{ role: 'user', content: 'respond with only "pong"' }],
        temperature: 0.1,
        max_tokens: 5,
      });
    }

    if (mode === 'gateway' && !gatewayUrl) {
      console.error('   ✗ FAILED: AI_GATEWAY_URL is not configured.');
      overallSuccess = false;
    } else if (mode === 'direct' && !directApiKey) {
      console.error('   ✗ FAILED: OPENROUTER_API_KEY is not configured.');
      overallSuccess = false;
    } else {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      const duration = Date.now() - chatStartTime;
      console.log(`   - Status: ${res.status}`);
      console.log(`   - Duration: ${duration}ms`);
      console.log(`   - Request ID: ${chatRequestId}`);

      if (res.ok) {
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || '';
        console.log(`   - Response: "${text.trim()}"`);
        console.log('   ✓ Chat completion test passed.\n');
      } else {
        const errorText = await res.text();
        console.error(`   ✗ FAILED: Upstream returned status ${res.status}: ${errorText.slice(0, 200)}`);
        overallSuccess = false;
      }
    }
  } catch (err) {
    console.error(`   ✗ FAILED: Chat test crashed with error: ${err.message || err}\n`);
    overallSuccess = false;
  }

  // 3. Embedding Test
  console.log('3. Testing Embedding Generation...');
  const embedRequestId = randomUUID();
  const embedStartTime = Date.now();

  try {
    let url, headers, body;
    if (mode === 'gateway') {
      url = gatewayUrl;
      headers = {
        'X-Gateway-Token': gatewayToken,
        'X-Request-Id': embedRequestId,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      };
      body = JSON.stringify({
        version: '1',
        requestId: embedRequestId,
        operation: 'embeddings',
        payload: {
          model: embeddingModel,
          input: 'test diagnostic query',
        },
      });
    } else {
      url = 'https://openrouter.ai/api/v1/embeddings';
      headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${directApiKey}`,
      };
      body = JSON.stringify({
        model: embeddingModel,
        input: 'test diagnostic query',
      });
    }

    if (mode === 'gateway' && !gatewayUrl) {
      console.error('   ✗ FAILED: AI_GATEWAY_URL is not configured.');
      overallSuccess = false;
    } else if (mode === 'direct' && !directApiKey) {
      console.error('   ✗ FAILED: OPENROUTER_API_KEY is not configured.');
      overallSuccess = false;
    } else {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body,
      });
      const duration = Date.now() - embedStartTime;
      console.log(`   - Status: ${res.status}`);
      console.log(`   - Duration: ${duration}ms`);
      console.log(`   - Request ID: ${embedRequestId}`);

      if (res.ok) {
        const data = await res.json();
        const embedding = data.data?.[0]?.embedding;
        if (embedding && Array.isArray(embedding)) {
          console.log(`   - Vector Dimensions: ${embedding.length}`);
          console.log('   ✓ Embedding generation test passed.\n');
        } else {
          console.error('   ✗ FAILED: Response did not contain a valid embedding vector.');
          overallSuccess = false;
        }
      } else {
        const errorText = await res.text();
        console.error(`   ✗ FAILED: Upstream returned status ${res.status}: ${errorText.slice(0, 200)}`);
        overallSuccess = false;
      }
    }
  } catch (err) {
    console.error(`   ✗ FAILED: Embedding test crashed with error: ${err.message || err}\n`);
    overallSuccess = false;
  }

  console.log('==================================================');
  if (overallSuccess) {
    console.log('   ALL DIAGNOSTIC TESTS PASSED SUCCESSFULLY! (0)');
    console.log('==================================================\n');
    process.exit(0);
  } else {
    console.log('   DIAGNOSTIC TESTS FAILED! (1)');
    console.log('==================================================\n');
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
