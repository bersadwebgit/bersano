# 12 — یکپارچه‌سازی‌های خارجی

مقادیر secret = `[REDACTED]`.

| سرویس | هدف | فایل‌ها / Evidence | Auth | وضعیت |
|-------|------|-------------------|------|--------|
| OpenRouter | LLM chat | `ai-provider/client.ts`, legacy ai-control | Bearer API key | Active dual-path |
| PHP AI Gateway | Proxy بدون افشای کلید روی app | `deploy/ai-gateway/index.php` | `AI_GATEWAY_TOKEN` | Active |
| Embedding provider | `/embeddings` | `product-embedding.ts`, gateway, `api.openai.com/v1` URL در کد | key/gateway | Active when configured |
| Pexels | تصاویر استوک | `pexels_api_key`, image-queries | API key | Active |
| Poof | حذف پس‌زمینه | `api.poof.bg`, media/process | `poof_api_key` | Active |
| Melipayamak | SMS OTP | `sms.ts`, env + encrypted settings | username/password | Active |
| SMS.ir | verify API URL present | `api.sms.ir` | Unverified usage depth | Referenced |
| Telegram | Bot messaging | `telegram.ts`, `scripts/telegram-bot.js` | bot token | Active |
| Bale | Bot messaging | `bale.ts`, `scripts/bale-bot.js` | bot token | Active |
| Tipax | Shipping | `tipax.ts`, `igtgatewayapi.tipax.ir` | Token API | Active |
| Zarinpal | Payment | `api.zarinpal.com/...` | Merchant config in shop | Active |
| Zibal | Payment | `gateway.zibal.ir` | Merchant config | Active |
| Digipay | Payment | `src/lib/digipay.ts` | OAuth/API | Active |
| Redis / Upstash REST | Cache | `redis.ts`, SRH proxy | `UPSTASH_REDIS_*` / SRH_TOKEN | Active |
| PostgreSQL + pgvector | DB/RAG | compose + prisma | DATABASE_URL | Active |
| Wikimedia Commons | image search URLs | hardcoded API | public | Referenced |
| Google Fonts Vazirmatn | UI font | fonts.googleapis.com | public | Active |
| QR Server | QR images | api.qrserver.com | public | Referenced |

فهرست خام URLها: `_raw-external-urls.txt` (شامل نمونه‌های demo/pexels و IPهای متادیتا SSRF-test مانند `169.254.169.254` که باید در validate-url بررسی شوند).

Evidence: `_raw-external-urls.txt`؛ libs فوق

## SSRF / URL validation
وجود دارد: `src/lib/validate-url.ts` — باید در مسیرهای fetch خارجی فراخوانی شود (تأیید per-call: Partial).
