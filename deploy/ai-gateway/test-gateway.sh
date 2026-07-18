#!/bin/bash
# Multi-Tenant AI Gateway Manual Verification Curl Script

if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: ./test-gateway.sh <GATEWAY_URL> <GATEWAY_TOKEN>"
  echo "Example: ./test-gateway.sh https://parsemtiaz.ir/ai-gateway/index.php MY_SUPER_TOKEN"
  exit 1
fi

URL="$1"
TOKEN="$2"

echo "========================================================="
echo "Testing Gateway Health (GET)..."
echo "========================================================="
curl -i -X GET "$URL"
echo -e "\n"

echo "========================================================="
echo "Testing Unauthorized request (No Token POST)..."
echo "========================================================="
curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -d '{"operation": "chat.completions", "payload": {}}'
echo -e "\n"

echo "========================================================="
echo "Testing Non-streaming Chat Completion (POST)..."
echo "========================================================="
curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Token: $TOKEN" \
  -d '{
    "operation": "chat.completions",
    "payload": {
      "model": "google/gemini-2.5-flash",
      "messages": [
        {"role": "user", "content": "say hello in 2 words"}
      ],
      "temperature": 0.2,
      "max_tokens": 10
    }
  }'
echo -e "\n"

echo "========================================================="
echo "Testing Streaming Chat Completion (POST)..."
echo "========================================================="
curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Token: $TOKEN" \
  -d '{
    "operation": "chat.completions",
    "payload": {
      "model": "google/gemini-2.5-flash",
      "messages": [
        {"role": "user", "content": "count from 1 to 5 very slowly, one number per line"}
      ],
      "temperature": 0.2,
      "max_tokens": 50,
      "stream": true
    }
  }'
echo -e "\n"

echo "========================================================="
echo "Testing Embedding Generation (POST)..."
echo "========================================================="
curl -i -X POST "$URL" \
  -H "Content-Type: application/json" \
  -H "X-Gateway-Token: $TOKEN" \
  -d '{
    "operation": "embeddings",
    "payload": {
      "model": "openai/text-embedding-3-small",
      "input": "test embedding"
    }
  }'
echo -e "\n"
echo "========================================================="
echo "Gateway manual test execution completed."
echo "========================================================="
