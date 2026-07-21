# 19 — Change Impact Map

| هسته | اگر تغییر کند چه می‌شکند | تست/چک دستی | Migration? | Cache? | Docker restart? |
|------|--------------------------|-------------|------------|--------|-----------------|
| `prisma/schema.prisma` | همه ORM callers | migrate + smoke CRUD | Yes | Maybe | web |
| `src/middleware.ts` | همه auth صفحات/API admin | login همه نقش‌ها | No | No | web |
| `src/lib/tenant.ts` | همه فروشگاه‌ها/دامنه‌ها | subdomain + custom domain | No | Invalidate Redis | web |
| `src/lib/auth.ts` | APIهای محافظت‌شده | token mismatch cross-shop | No | No | web |
| `src/lib/admin-roles.ts` | RBAC staff | هر نقش | No | No | web |
| `src/lib/ai-provider/*` | AI canonical | gateway+direct tests | No | config cache 5s | web |
| `src/lib/openrouter-fetch.ts` | همه legacy AI | هر ai-control | No | No | web |
| `src/lib/ai-model-resolver.ts` | انتخاب مدل | getAiModel slots | No | invalidateModelCache | web |
| `product-embedding.ts` / `product-search.ts` | RAG | embed+search | Maybe indexes | No | web |
| SystemSetting keys | پلتفرم | super-admin save | No | model/config caches | web |
| `Dockerfile` / compose | استقرار | rebuild up | Maybe | volumes | Yes |
| env AI_GATEWAY_* / JWT_SECRET | امنیت و AI | restart با env جدید | No | No | Yes |
| admin/store layouts | UI shells | visual smoke | No | No | web |
| checkout/payment libs | درآمد | sandbox pay | No | No | web |
| PHP `deploy/ai-gateway` | همه canonical AI | test-gateway | No | No | gateway host |

## ماژول‌های وابسته به AI dual-path
تغییر فقط canonical **مسیرهای legacy را درست نمی‌کند**. باید `openRouterFetch` callers نیز به‌روز شوند.
Evidence: 09-AI-SUBSYSTEM.md
