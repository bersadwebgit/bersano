# 09 — ممیزی زیرسیستم AI

## معماری هدف
- Model-agnostic slots via `getAiModel` + `SystemSetting` rows
- Transport: Gateway (PHP) یا Direct OpenRouter بر اساس `ai_gateway_enabled` + env
- Canonical client: `src/lib/ai-provider/client.ts` (`executeChatCompletion`, `executeEmbedding`)
- Wrapper: `callAiGateway` در `src/lib/ai-gateway.ts` → re-export از client

Evidence: `src/lib/ai-provider/config.ts:7-78`؛ `src/lib/ai-gateway.ts:1-24`؛ `src/lib/ai-model-resolver.ts:1-79`

## Model slots
`router|simple|complex|content|chat|embedding|fallback|wholesale`
Keys: `ai_model_*` + fallbackهای `openrouter_control_model` / `openrouter_model`
Hardcoded fallbacks در resolver. Evidence: `ai-model-resolver.ts:13-33`

## Config modes
| شرط | mode |
|-----|------|
| `ai_enabled` === false | disabled |
| `ai_gateway_enabled` === true + URL/TOKEN | gateway |
| else if `AI_ALLOW_DIRECT_OPENROUTER`===true + key | direct |
| else | throw configuration error |

Evidence: `config.ts:32-57`
**Confirmed:** بدون silent Gateway→Direct در config. مسیرهای `openRouterFetch` در عمل به همان client می‌رسند ولی با `skipQuotaCheck: true` (`openrouter-fetch.ts:127`).

## ادعاه‌ها (ارزیابی با Evidence — به‌روز پس از اکتشاف)
| ادعا | حکم | توضیح |
|------|-----|-------|
| همه AIها از canonical client | **Partial→True برای transport** | `openRouterFetch` URL را نادیده گرفته و به `executeChatCompletion` می‌رود |
| همه از Gateway پشتیبانی می‌کنند | **Partial→True via client** | هر مسیر عبوری از client در mode=gateway از Gateway می‌رود |
| Gateway≈Direct | **Partial** | transport بله؛ quota در wrapper یکسان نیست |
| Embeddings از Gateway وقتی enabled | **True** | `executeEmbedding` + `getEmbeddingConfig` |
| Streaming از Gateway | **Partial** | client + test-gateway؛ بیشتر adminها non-stream |
| کلید provider فقط روی gateway host | **True فقط در gateway mode** | Direct هنوز کلید روی app |
| بدون silent Gateway→Direct | **True** | config throw؛ auto-downgrade ندارد |
| Usage یکنواخت | **Partial** | `logAiUsage` در client؛ failure غالباً console-only |
| Quota یکنواخت | **False** | `openRouterFetch` → `skipQuotaCheck: true`؛ seed/queue نیز اغلب skip |
| همه slotها واقعاً استفاده می‌شوند | **Partial** | getAiModel در برخی؛ UX هنوز openrouter_* |

## مسیرهای Legacy Direct OpenRouter (Confirmed grep)
- `src/app/api/admin/ai-agent/route.ts`
- `src/app/api/admin/blog/ai-control/route.ts`
- `src/app/api/admin/blog/content-calendar/route.ts`
- `src/app/api/admin/blog/content-calendar/ai-control/route.ts`
- `src/app/api/admin/brands/ai-control/route.ts`
- `src/app/api/admin/categories/ai-control/route.ts`
- `src/app/api/admin/discounts/ai-control/route.ts`
- `src/app/api/admin/footer/ai-control/route.ts`
- `src/app/api/admin/header/ai-control/route.ts`
- `src/app/api/admin/import-export/ai-control/route.ts`
- `src/app/api/admin/media/ai-control/route.ts`
- `src/app/api/admin/orders/ai-control/route.ts`
- `src/app/api/admin/products/ai-control/route.ts`
- `src/app/api/admin/profile/ai-control/route.ts`
- `src/app/api/admin/reviews/ai-control/route.ts`
- `src/app/api/admin/settings/about-us/ai-control/route.ts`
- `src/app/api/admin/settings/ai-control/route.ts`
- `src/app/api/admin/settings/contact-us/ai-control/route.ts`
- `src/app/api/admin/settings/custom-home/ai-control/route.ts`
- `src/app/api/admin/shoppable/ai-control/route.ts`
- `src/app/api/admin/slider/ai-control/route.ts`
- `src/app/api/admin/staff/ai-control/route.ts`
- `src/app/api/admin/stories/ai-control/route.ts`
- `src/app/api/admin/system-tickets/ai-control/route.ts`
- `src/app/api/admin/tickets/ai-control/route.ts`
- `src/app/api/admin/users/ai-control/route.ts`
- `src/app/api/super-admin/blog/ai-control/route.ts`

## مسیرها/ماژول‌های Canonical (نمونه Confirmed)
- `src/app/api/admin/products/ai-seo/route.ts`
- `src/app/api/admin/products/ai-faqs/route.ts`
- `src/app/api/admin/products/ai-article/route.ts`
- `src/app/api/admin/products/ai-assistant/route.ts`
- `src/app/api/admin/products/ai-export/route.ts`
- `src/app/api/admin/products/ai-import/route.ts`
- `src/app/api/admin/products/ai-generate-all/route.ts`
- `src/app/api/admin/blog/comments/ai-control/route.ts`
- `src/app/api/super-admin/settings/test-gateway/route.ts`
- `src/lib/queue.ts`
- `src/lib/product-embedding.ts`

## PHP Gateway
- `deploy/ai-gateway/index.php`: GET health، POST chat/embeddings، auth با token
- Config: `private/ai-config.php` (example در repo؛ secrets = [REDACTED])
Evidence: `deploy/ai-gateway/index.php:1-60`

## Embeddings / RAG
- `buildProductText`, `getEmbeddingConfig`, `embedProduct`, `batchEmbedShopProducts`
- Search: `src/lib/product-search.ts` با cosine + trigram
Evidence: `product-embedding.ts:47-79`؛ migration RAG

## Queue AI jobs
`src/lib/queue.ts` type=`ai` → `executeChatCompletion` slot simple
Evidence: `queue.ts`

## Super-admin test
`/api/super-admin/settings/test-gateway` — health + chat + embedding + stream checks
Evidence: `src/app/api/super-admin/settings/test-gateway/route.ts`
