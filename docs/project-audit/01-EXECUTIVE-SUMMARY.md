# 01 — خلاصه اجرایی

## حکم کلی
`shop_final` یک پلتفرم **SaaS چندمستأجره فروشگاه‌ساز** روی **Next.js 16 + Prisma + PostgreSQL (+pgvector) + Redis/Upstash** است. یک codebase مشترک، ایزولاسیون سطری با `shopId`/`shop_id`، دامنه/ساب‌دامین برای تشخیص فروشگاه، پنل ادمین فروشگاه، سوپرادمین پلتفرم، مارکتینگ SaaS، و استورفرانت مستأجر.

Evidence: `package.json`؛ `prisma/schema.prisma`؛ `src/lib/tenant.ts`؛ `docker-compose.yml`

## آنچه تأیید شد (Confirmed)
| موضوع | وضعیت |
|-------|--------|
| 772 فایل tracked | inventory کامل در FILE-MATRIX.csv |
| 86 صفحه App Router | 04 + CSV |
| 185 API route | ROUTE-MATRIX.csv |
| 45 مدل Prisma | schema |
| 4 migration tracked | ناهمخوانی با schema کامل |
| Auth سه لایه cookie JWT | middleware + auth.ts |
| RBAC نقش‌های staff | admin-roles.ts |
| AI دو مسیره: canonical + legacy OpenRouter مستقیم | 09 |
| `ignoreBuildErrors: true` | next.config.ts:39-41 |
| بدون اسکریپت test | package.json |
| JWT_SECRET fallback خطرناک | middleware.ts:12 |

## Production blockers (اولویت)
1. **Critical:** JWT_SECRET پیش‌فرض — Evidence: `src/middleware.ts:12`
2. **Critical:** بک‌دور ورود سوپرادمین hardcode — Evidence: `src/app/api/super-admin/login/route.ts:55-79` (جزئیات در 07B؛ مقادیر = `[REDACTED]`)
3. **High:** Typecheck در build نادیده — `next.config.ts:39-41` + **81** خطای `tsc`
4. **High:** تاریخچه migration ناقص (۴ فایل) در برابر schema بزرگ
5. **High:** `openRouterFetch` با `skipQuotaCheck: true` — دور زدن سهمیه — `openrouter-fetch.ts:127`
6. **High:** CSRF (بدون SameSite)، XSS کامنت/SVG، آپلود تخت public — 07B
7. **High:** نبود تست خودکار؛ lint با **2696** مشکل

## نقاط قوت معماری
- تشخیص tenant مبتنی بر host + ShopDomain
- Docker با شبکه داخلی و bind فقط `127.0.0.1:3000`
- تصویر Postgres با pgvector
- شروع canonical AI provider + PHP gateway
- RBAC و middleware برای admin pages/APIs

## محدوده ممیزی
فقط مستندات زیر `docs/project-audit/`. هیچ تغییر application/DB/secret اعمال نشد.

## بهترین فایل‌ها برای AI بعدی
1. [PROJECT-KNOWLEDGE-BASE.md](./PROJECT-KNOWLEDGE-BASE.md)
2. [project-map.json](./project-map.json)
