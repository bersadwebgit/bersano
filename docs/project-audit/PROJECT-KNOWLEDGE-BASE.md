# PROJECT-KNOWLEDGE-BASE — پایگاه دانش فنی shop_final

> ممیزی خواندنی‌محور | Commit `1d19274cb192e82a8a82c0c116f4949a56d6f0af` | Branch `main` | تاریخ 2026-07-19  
> این فایل standalone است و به اسناد جزئی لینک می‌دهد. اسرار واقعی چاپ نمی‌شوند (`[REDACTED]`).

## فهرست مطالب
1. [هویت پروژه](#1-هویت-پروژه)
2. [هدف کسب‌وکار](#2-هدف-کسبوکار)
3. [نقش‌های کاربری](#3-نقشهای-کاربری)
4. [معماری](#4-معماری)
5. [درخت دایرکتوری](#5-درخت-دایرکتوری)
6. [خلاصه inventory فایل](#6-خلاصه-inventory-فایل)
7. [نقشه صفحات](#7-نقشه-صفحات)
8. [نقشه API](#8-نقشه-api)
9. [نقشه دیتابیس](#9-نقشه-دیتابیس)
10. [احراز هویت](#10-احراز-هویت)
11. [مجوزدهی](#11-مجوزدهی)
12. [چندمستأجری](#12-چندمستأجری)
13. [کاتالوگ ویژگی](#13-کاتالوگ-ویژگی)
14. [سیستم AI](#14-سیستم-ai)
15. [جستجو و RAG](#15-جستجو-و-rag)
16. [پرداخت‌ها](#16-پرداختها)
17. [سفارش‌ها](#17-سفارشها)
18. [پیام‌رسانی](#18-پیامرسانی)
19. [رسانه/ذخیره](#19-رسانهذخیره)
20. [CMS و بازاریابی](#20-cms-و-بازاریابی)
21. [ادمین](#21-ادمین)
22. [سوپرادمین](#22-سوپرادمین)
23. [تجربه مشتری](#23-تجربه-مشتری)
24. [متغیرهای محیطی](#24-متغیرهای-محیطی)
25. [System settings](#25-system-settings)
26. [یکپارچه‌سازی‌ها](#26-یکپارچهسازیها)
27. [امنیت](#27-امنیت)
28. [استقرار](#28-استقرار)
29. [Build و کیفیت](#29-build-و-کیفیت)
30. [باگ‌های شناخته‌شده](#30-باگهای-شناختهشده)
31. [بدهی فنی](#31-بدهی-فنی)
32. [مسدودکننده‌های production](#32-مسدودکنندههای-production)
33. [Unverified](#33-unverified)
34. [واژه‌نامه](#34-واژهنامه)
35. [جداول lookup سریع](#35-جداول-lookup-سریع)
36. [شاخص Evidence](#36-شاخص-evidence)

---

## 1) هویت پروژه
- نام پکیج: `shop_final@0.1.0`
- استک: Next.js 16.2.6, React 19.2.4, Prisma 5.22, PostgreSQL, Redis/Upstash, Docker, PHP AI Gateway
- Evidence: `package.json`؛ `docker-compose.yml`

## 2) هدف کسب‌وکار
SaaS فروشگاه‌ساز چندمستأجره با قالب واحد، دامنه/ساب‌دامین، پنل تاجر، سوپرادمین پلتفرم، AI محتوا/عملیات، پرداخت و پیام ایرانی.

## 3) نقش‌های کاربری
| نقش | Cookie | ورود |
|-----|--------|------|
| superadmin | `super_admin_token` | `/super-admin/login` |
| admin / product_manager / sales_manager / sales_product_manager | `admin_token` | `/admin/login` |
| customer | `customer_token` | `/login` |
| platform collaborator | platform session | platform-auth |

Evidence: `src/middleware.ts`؛ `src/lib/admin-roles.ts`؛ `src/lib/platform-auth.ts`

## 4) معماری
جزئیات و دیاگرام‌ها: [02-SYSTEM-ARCHITECTURE.md](./02-SYSTEM-ARCHITECTURE.md)

خلاصه: Browser → (nginx خارجی) → Next web → PostgreSQL/Redis؛ AI canonical → PHP Gateway → Provider؛ bots جدا.

## 5) درخت دایرکتوری
```
shop_final/
  src/app/          # pages + api (App Router)
  src/components/   # UI
  src/lib/          # domain libs (auth, tenant, ai, sms, ...)
  src/store/        # zustand
  prisma/           # schema + migrations
  deploy/ai-gateway/# PHP gateway
  scripts/          # bale/telegram bots
  public/           # static + uploads mount
  Dockerfile, docker-compose.yml
  docs/project-audit/  # این دانش‌نامه
```

## 6) خلاصه inventory فایل
- **772** tracked در [FILE-MATRIX.csv](./FILE-MATRIX.csv)
- توضیح: [03-FILE-INVENTORY.md](./03-FILE-INVENTORY.md)
- Snapshot: [00-SNAPSHOT.md](./00-SNAPSHOT.md)

## 7) نقشه صفحات
- **86** صفحه — [04-PAGES-AND-LAYOUTS.md](./04-PAGES-AND-LAYOUTS.md)
- گروه‌ها: marketing، admin، super-admin، storefront، auth

## 8) نقشه API
- **185** route — [05-API-ROUTE-MAP.md](./05-API-ROUTE-MAP.md) + [ROUTE-MATRIX.csv](./ROUTE-MATRIX.csv)
- Middleware محافظ `/api/admin`؛ بقیه per-handler

## 9) نقشه دیتابیس
- **45** مدل — [06-DATABASE-AND-MIGRATIONS.md](./06-DATABASE-AND-MIGRATIONS.md)
- **4** migration tracked + ناهمخوانی با schema کامل
- pgvector + pg_trgm در migration RAG

## 10) احراز هویت
JWT با `jose`؛ secret از `JWT_SECRET` با fallback خطرناک؛ cookies سه‌گانه؛ OTP مدل `Otp`.
Evidence: `auth.ts`؛ `middleware.ts:12`

## 11) مجوزدهی
RBAC در `admin-roles.ts`؛ `hasPermission` / `canAccessAdminPage` / `getApiPermission`.
Superadmin همه دسترسی‌ها.

## 12) چندمستأجری
`getTenantShop(host)`؛ `ShopDomain`؛ فیلد `shopId`؛ extension prisma؛ verifyAuth تطبیق shop.
جزئیات: [07-AUTH-SECURITY-TENANCY.md](./07-AUTH-SECURITY-TENANCY.md)

## 13) کاتالوگ ویژگی
[08-FEATURE-CATALOG.md](./08-FEATURE-CATALOG.md) — محصولات، سفارش، پرداخت، بلاگ، AI، دامنه، SMS، bots، عمده، …

## 14) سیستم AI
[09-AI-SUBSYSTEM.md](./09-AI-SUBSYSTEM.md)

**حکم کلیدی:** اکوسیستم دو مسیره است:
- Canonical: `executeChatCompletion` / Gateway
- Legacy: ده‌ها `openRouterFetch` → `https://openrouter.ai/api/v1/chat/completions`

بنابراین ادعای «همه AI از Gateway می‌روند» **نادرست** است.

## 15) جستجو و RAG
`product-embedding.ts` + `product-search.ts` + ستون vector + indexes.
اگر embedding config ناقص → skip خاموش (طراحی).

## 16) پرداخت‌ها
Zarinpal، Zibal، Digipay — URLها در کد؛ تنظیمات درگاه در سطح فروشگاه.
Evidence: external URL inventory؛ `digipay.ts`

## 17) سفارش‌ها
مدل‌های `Order`/`OrderItem`؛ admin orders + tipax؛ AI-control سفارش (legacy).

## 18) پیام‌رسانی
SMS Melipayamak (encrypted settings)؛ Telegram/Bale bots در compose + scripts.

## 19) رسانه/ذخیره
`public/uploads` volume؛ Sharp؛ Poof.
[14-STORAGE-AND-UPLOADS.md](./14-STORAGE-AND-UPLOADS.md)

## 20) CMS و بازاریابی
`(marketing)` pages + `saas_*` SystemSettings + `marketing-cms.ts`

## 21) ادمین
شل `/admin` با RBAC؛ ده‌ها ماژول مدیریت فروشگاه.

## 22) سوپرادمین
`/super-admin`؛ تنظیمات پلتفرم، پکیج‌ها، بلاگ پلتفرم، تست Gateway.

## 23) تجربه مشتری
استورفرانت tenant، سبد، checkout محافظت‌شده، پروفایل، چت، تیکت.

## 24) متغیرهای محیطی
[11-ENVIRONMENT-VARIABLES.md](./11-ENVIRONMENT-VARIABLES.md) + [ENV-MATRIX.csv](./ENV-MATRIX.csv) — **34** نام؛ مقادیر `[REDACTED]`

## 25) System settings
[10-SYSTEMSETTINGS.md](./10-SYSTEMSETTINGS.md) + [SETTING-MATRIX.csv](./SETTING-MATRIX.csv) — **66** کلید مستند

## 26) یکپارچه‌سازی‌ها
[12-EXTERNAL-INTEGRATIONS.md](./12-EXTERNAL-INTEGRATIONS.md) — حدود ۱۴ سرویس اصلی

## 27) امنیت
[07B-SECURITY-FINDINGS.md](./07B-SECURITY-FINDINGS.md)

Critical: JWT fallback + بک‌دور login سوپرادمین. High: CSRF/SameSite، XSS کامنت/SVG، آپلود تخت، default bot gateway keys، skip quota در `openRouterFetch`.

## 28) استقرار
[15-DEPLOYMENT-OPERATIONS.md](./15-DEPLOYMENT-OPERATIONS.md) — compose services، runbooks

## 29) Build و کیفیت
[17-QUALITY-TESTS-TECH-DEBT.md](./17-QUALITY-TESTS-TECH-DEBT.md)
- بدون `npm test`
- `ignoreBuildErrors: true` → نمی‌توان type-safe بودن build را ادعا کرد
- `npx tsc --noEmit`: **81** خطا (Confirmed)
- `npm run lint`: **2696** مشکل (1720 error / 976 warning) (Confirmed)

## 30) باگ‌های شناخته‌شده / مسائل confirmed
- Dual AI path ناسازگار با سیاست Gateway
- Migration history ناقص
- Logging حساس در verifyAuth

## 31) بدهی فنی
صف فایل‌محور؛ فایل‌های غول‌پیکر AI؛ NEXTAUTH در example؛ duplicate fetch AI

## 32) مسدودکننده‌های production
1. JWT_SECRET اجباری نشده
2. Type errors ممکن است در build پنهان شوند
3. Migrate-only ممکن است schema کامل را نسازد
4. AI legacy مانع «کلید فقط روی gateway»
5. نبود تست خودکار

## 33) Unverified
[20-UNVERIFIED-QUESTIONS.md](./20-UNVERIFIED-QUESTIONS.md) — ۱۵+ مورد

## 34) واژه‌نامه
| اصطلاح | معنی |
|--------|------|
| Tenant / shopId | شناسه فروشگاه برای ایزولاسیون |
| SystemSetting | تنظیم کلید/مقدار پلتفرم |
| Canonical AI client | `src/lib/ai-provider/client.ts` |
| Legacy AI | `openRouterFetch` مستقیم |
| Gateway | PHP proxy در `deploy/ai-gateway` |
| Slot | نوع مدل در `AiModelSlot` |
| SRH | serverless-redis-http proxy |

## 35) جداول lookup سریع
| نیاز | فایل |
|------|------|
| همه فایل‌ها | FILE-MATRIX.csv |
| همه API | ROUTE-MATRIX.csv |
| Env | ENV-MATRIX.csv |
| Settings | SETTING-MATRIX.csv |
| JSON ماشین | project-map.json |
| Executive | 01-EXECUTIVE-SUMMARY.md |
| AI | 09-AI-SUBSYSTEM.md |
| Flows | 18-END-TO-END-FLOWS.md |
| Impact | 19-CHANGE-IMPACT-MAP.md |

## 36) شاخص Evidence
| موضوع | Evidence کلیدی |
|-------|----------------|
| Snapshot | git SHA `1d19274…`؛ package.json |
| Middleware auth | `src/middleware.ts:40-184` |
| JWT fallback | `src/middleware.ts:12` |
| verifyAuth tenant | `src/lib/auth.ts:38-49` |
| RBAC | `src/lib/admin-roles.ts:1-50` |
| Tenant host | `src/lib/tenant.ts` |
| AI config modes | `src/lib/ai-provider/config.ts:32-57` |
| Model slots | `src/lib/ai-model-resolver.ts:2-33` |
| ignoreBuildErrors | `next.config.ts:39-41` |
| Compose | `docker-compose.yml` |
| RAG migration | `prisma/migrations/20260711230000_add_rag_indexes/migration.sql` |
| Legacy OpenRouter | grep `openrouter.ai/api/v1/chat/completions` |

---

## Completeness (این ممیزی)
| مورد | کشف‌شده | مستندشده |
|------|---------|----------|
| tracked files | 772 | 772 (FILE-MATRIX) |
| pages | 86 | 86 |
| API routes | 185 | 185 |
| models | 45 | 45 |
| migrations | 4 | 4 |
| env vars | 34 | 34 |
| SystemSetting keys | 66 | 66 |
| integrations (اصلی) | 14 | 14 |
| AI operations (مسیرهای مرتبط) | 52 در JSON | 09 + matrix |
| security findings | ≥10 | 07B |
| unverified | 15 | 20 |

**تأیید:** فقط فایل‌های زیر `docs/project-audit/` برای این ممیزی ایجاد/به‌روز شده‌اند؛ کد اپلیکیشن تغییر نکرده است.
