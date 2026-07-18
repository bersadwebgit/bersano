# 07 — احراز هویت، مجوز، چندمستأجری

## مکانیزم‌های Auth (Confirmed)
| نقش | Cookie / Session | ورود | بررسی |
|-----|------------------|------|-------|
| superadmin | `super_admin_token` | `/super-admin/login` | middleware + JWT role | 
| admin / staff | `admin_token` | `/admin/login` | middleware RBAC + `verifyAuth` |
| customer | `customer_token` | `/login` OTP/password | middleware profile/checkout |
| platform collaborator | platform session | `platform-auth` | `verifyPlatformSession` |

Evidence: `src/middleware.ts`؛ `src/lib/auth.ts`؛ `src/lib/admin-roles.ts`؛ `src/lib/platform-auth.ts`

## JWT
- Secret: `process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'`
- **Critical:** fallback سخت‌کدشده اگر env خالی باشد.
Evidence: `src/middleware.ts:12`؛ `src/lib/auth.ts:6`

## RBAC ادمین فروشگاه
نقش‌ها: `admin`, `product_manager`, `sales_manager`, `sales_product_manager`
Permissionها: products, orders, reports, reviews, blog, design, support, users, settings, system
Evidence: `src/lib/admin-roles.ts:1-50`

## Tenant resolution
`getTenantShop` در `src/lib/tenant.ts`:
1. نرمال‌سازی host (رد IP، رد دامنه اصلی مثل `bersana.ir` / `localhost` بدون ساب‌دامین)
2. استخراج subdomain در محیط local
3. lookup دامنه سفارشی از `ShopDomain` / settings
4. کش Redis با CacheKeys

Evidence: `src/lib/tenant.ts:6-120+`

## Prisma tenant extension
`TENANT_MODELS_LOWERCASE` + اجبار وجود `shopId` در where برای عملیات فیلترپذیر.
Evidence: `src/lib/prisma-tenant-extension.ts:4-50`

**Unverified:** آیا همه query pathها از client extended استفاده می‌کنند یا فقط `prisma` خام؟ نیاز تأیید `src/lib/prisma.ts`.

## تهدیدات مرزی مستأجر
| ریسک | وضعیت | Evidence |
|------|--------|----------|
| Default JWT secret | Critical confirmed | middleware:12 |
| اعتماد به host برای تطبیق shopId | Confirmed design | auth.ts:40-49 |
| `/api/*` غیر admin بدون middleware | Confirmed gap pattern | middleware فقط /api/admin |
| Superadmin بدون shop match | Confirmed exception | auth.ts:38 |
| لاگ verifyAuth | Medium | auth.ts:31-47 |
| Raw SQL بدون shop_id | نیاز بررسی هر query | product-search |


## ????????? ?????? ??????
???? ???? ?? [07B-SECURITY-FINDINGS.md](./07B-SECURITY-FINDINGS.md).

