# 08 — کاتالوگ ویژگی‌ها

هر ویژگی: نقش، ورودی UI، API، مدل، وضعیت. جزئیات عمیق در اسناد تخصصی.

## ثبت‌نام تاجر و ساخت فروشگاه
- نقش: guest → admin
- صفحات: register/login marketing/store
- مدل‌ها: `User`, `ShopSettings`, `Package`
- وضعیت: Confirmed وجود مدل/flows؛ جزئیات E2E در 18
Evidence: `User`, `ShopSettings` در schema؛ pages auth

## Setup wizard / AI seed / demo
- libs: `src/lib/ai/store-seed/*`, `demo-data.ts`, `clear-demo-data.ts`
- مدل‌ها: `ShopSeedProfile`, `ShopSeedJob`
- وضعیت: Confirmed implementation files
Evidence: `src/lib/ai/store-seed/`؛ schema seed models

## محصولات / واریانت / دسته / برند / موجودی
- Admin pages تحت `/admin/products`, categories, brands
- API: `/api/admin/products/**`, categories, brands
- مدل‌ها: `Product`, `ProductVariant`, `Category`, `Brand`
- AI ابزارها: ai-control (legacy OR) + ai-seo/faqs/article/... (canonical)
Evidence: schema Product؛ API routes؛ 09

## عمده / B2B
- فیلدهای Product wholesale*؛ `WholesaleRequest`؛ `src/lib/wholesale.ts`
- تنظیمات shop wholesaleEnabled در ShopSettings (JSON/fields)
Evidence: schema؛ wholesale.ts

## تخفیف / سبد / سفارش / پرداخت
- مدل‌ها: `DiscountCode`, `CartItem`, `Order`, `OrderItem`
- درگاه‌ها: Zarinpal, Zibal, Digipay
Evidence: schema؛ `digipay.ts`؛ URLهای درگاه

## ارسال Tipax
- `src/lib/tipax.ts`؛ APIهای order tipax
Evidence: tipax.ts؛ `igtgatewayapi.tipax.ir`

## دیجیتال / دانلود
- `DownloadToken`؛ صفحات downloads ادمین
Evidence: schema DownloadToken

## نظرات / علاقه‌مندی / اعلان
- `Review`, `Notification`, `ProductNotificationRequest`
Evidence: schema

## پروفایل مشتری / آدرس
- `/profile`؛ `Address`؛ customer_token
Evidence: middleware؛ Address model

## تیکت پشتیبانی فروشگاه / سیستم
- `Ticket`, `TicketMessage`, `SystemTicket*`
- AI-control legacy روی tickets
Evidence: schema؛ tickets ai-control

## استوری / اسلایدر / shoppable / هدر / فوتر / custom home
- مدل‌ها: `Story`, `HeroSlide`, `ProductSet*`
- صفحات admin مربوطه + ai-control legacy
Evidence: schema؛ admin pages

## مدیا / حذف پس‌زمینه
- `Media`؛ Sharp؛ Poof API
Evidence: media process route؛ poof_api_key

## بلاگ فروشگاه + تقویم محتوا
- `BlogPost`, `BlogCategory`, `BlogComment`
- AI blog-control legacy؛ comments canonical نمونه
Evidence: schema؛ blog routes

## بلاگ پلتفرم
- `PlatformBlog*` + collaborator
- super-admin blog ai-control legacy OpenRouter
Evidence: migration platform blog؛ super-admin blog route

## دامنه‌ها
- `ShopDomain` + tenant resolution
Evidence: schema؛ tenant.ts

## SMS / Telegram / Bale
- `src/lib/sms.ts`, `telegram.ts`, `bale.ts`؛ bots در compose
Evidence: docker-compose bots؛ SystemSetting central_* 

## Analytics
- `PageView`
Evidence: schema

## وفاداری / حسابداری Mahak
- `loyalty.ts`؛ admin accounting/mahak page
Evidence: files exist — عمق یکپارچگی: Partial/Needs confirmation در runtime

## Import/Export
- `export.ts`, `import-worker.ts`, queue type import/export
Evidence: queue.ts؛ import-worker.ts

## Staff ادمین
- نقش‌های admin-roles؛ users/staff APIs
Evidence: admin-roles.ts

## پکیج / سهمیه AI
- `Package`؛ quota در `ai-provider/usage.ts`؛ `AiUsage`
Evidence: usage.ts؛ AiUsage model

## Rate limiting
- `src/lib/rate-limiter.ts` (`isRateLimited`)
Evidence: rate-limiter.ts

## جستجو / RAG
- embedding + product-search
Evidence: product-embedding.ts؛ product-search.ts؛ migration RAG

## SEO generation / AI analyst / AI agent
- products ai-seo*؛ dashboard ai-analyst؛ `/admin/agent` + ai-agent route (legacy OR)
Evidence: related routes

## CMS بازاریابی
- `saas_*` SystemSettings؛ marketing pages؛ `marketing-cms.ts`
Evidence: super-admin settings؛ (marketing) pages
