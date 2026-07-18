# Multi-Tenant PHP AI Gateway for SaaS Shop Builder

This is a production-ready, ultra-lightweight PHP Gateway that acts as a secure, non-buffering proxy for AI operations (chat completions and embeddings). It isolates upstream provider credentials (like OpenRouter or OpenAI keys) on a host that is outside restricted jurisdictions, ensuring uninterrupted AI capabilities.

## Architecture

```
[Next.js Server] 
      │ 
      ├── (X-Gateway-Token) ──> [PHP AI Gateway (parsemtiaz.ir)]
                                      │
                                      ├── (Bearer API Key) ──> [OpenRouter / OpenAI]
```

## Setup and Deployment

1. **Upload Files:** Upload the `deploy/ai-gateway` directory to your web hosting public folder (e.g. inside `public_html/ai-gateway/` on cPanel/LiteSpeed shared hosting).
2. **Configure Secrets:**
   - Go to `private/` directory.
   - Rename `ai-config.example.php` to `ai-config.php`.
   - Edit `ai-config.php` and fill in your secure token, OpenRouter API key, and optional OpenAI key.
3. **File Permissions:** 
   - Keep `private/` folder permissions to `750` or `700` if possible.
   - Keep `private/ai-config.php` permissions to `600` or `640` so it is not readable by other tenants on shared hosting.

## Security Controls Implemented

- **Timing-Safe Authentication:** Validates headers using `hash_equals()` to prevent timing-attack exploits.
- **Provider Key Isolation:** The Next.js Iranian server never directly stores or sends the upstream provider key.
- **Streaming Preservation:** Disables output buffering dynamically, allowing chunk-by-chunk proxying for real-time Server-Sent Events (SSE).
- **TLS Hardening:** Fully enforces HTTPS verification (`CURLOPT_SSL_VERIFYPEER` and `CURLOPT_SSL_VERIFYHOST`).
- **No Stack Traces:** Silent error logging to PHP system log. Never exposes internals or keys to clients.
- **SSRF Block:** Only targets official and static upstream domains (`openrouter.ai` and `api.openai.com`). No dynamic upstream routing is accepted.

## Local/Verification Testing

You can use the provided `test-gateway.sh` shell script to perform curl tests on your deployed gateway:

```bash
bash test-gateway.sh https://yourdomain.com/ai-gateway/YOUR_SECRET_TOKEN
```
