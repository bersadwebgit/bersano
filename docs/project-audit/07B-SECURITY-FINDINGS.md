# امنیت — یافته‌های کد (ضمیمه اجرایی برای 07 و 01)

ممیزی غیرمخرب؛ بدون exploit.  
منابع تکمیلی اکتشاف: [auth/tenancy/AI](44aa21bc-fbfd-4d53-bfe3-2beca885a5b5)، [integrations/security](445690e4-a7c9-4eaf-a177-694c470c9af8)، [pages/API/Prisma](083729f9-6d84-4477-a852-58805d572b1e).

| ID | Severity | عنوان | Evidence | سناریو | Mitigation موجود | توصیه |
|----|----------|-------|----------|--------|------------------|-------|
| SEC-01 | Critical | JWT_SECRET پیش‌فرض | `src/middleware.ts:12`, `src/lib/auth.ts:6` | جعل JWT اگر env خالی | هیچ | fail-boot بدون env |
| SEC-02 | Critical | بک‌دور ورود سوپرادمین hardcode | `src/app/api/super-admin/login/route.ts:55-79` | ورود با زوج ایمیل/رمز تست ثابت وقتی سوپرادمین DB نباشد | کامنت «testing» | حذف کامل از production |
| SEC-03 | High | ignoreBuildErrors | `next.config.ts:39-41` | باگ نوعی به production | — | خاموش + رفع 81 خطای tsc |
| SEC-04 | High | Default کلید gateway بله/تلگرام | `api/bale/gateway`, `api/telegram/gateway` | Bearer با default شناخته‌شده | override از DB/env | حذف default |
| SEC-05 | High | Default `SMS_ENCRYPTION_KEY` / OTP pepper | `src/lib/crypto.ts:3`؛ `sms.ts` | رمزگشایی SMS creds / جعل OTP hash | هشدار prod ناقص | اجباری کردن env |
| SEC-06 | High | CSRF — کوکی بدون `sameSite` | مثلاً `auth/login` cookie flags | POST بین‌سایتی با cookie قربانی | httpOnly(+secure) | SameSite + CSRF token |
| SEC-07 | High | Stored XSS کامنت بلاگ / SVG دسته | blog comment render + `CategoryIcon` | HTML/SVG مخرب | DOMPurify روی پست نه کامنت | sanitize یکسان |
| SEC-08 | High | آپلود تخت public + SVG MIME + chat بدون user auth | `uploads/[...path]`؛ `chat/upload`؛ `reviews/upload` بدون size | XSS/DoS/نشت URL | traversal نسبی | per-shop dir، block SVG، auth+limit |
| SEC-09 | High | `openRouterFetch` → `skipQuotaCheck: true` | `openrouter-fetch.ts:127` | دور زدن سهمیه ماهانه AI روی مسیرهای legacy | quota در canonical | حذف skip یا enforce در wrapper |
| SEC-10 | Medium | verifyAuth debug logs | `auth.ts:31-47` | نشت عملیاتی در log | — | حذف |
| SEC-11 | Medium | Collaborator UI vs API mismatch | `middleware.ts:58-59` vs `verifyPlatformSession` | همکاران از UI سوپرادمین بلاک، بخشی از API مجاز | — | هم‌ترازی نقش‌ها |
| SEC-12 | Medium | Tenant extension پوشش ناقص مدل‌ها | `prisma-tenant-extension.ts:4-34` | مدل‌های خارج لیست بدون گارد where | shopId دستی در بعضی مسیرها | تکمیل لیست / raw SQL audit |
| SEC-13 | Medium | `checkShopQuota` fail-open | `ai-provider/usage.ts` | خطای Redis/DB → اجازه درخواست | — | fail-closed |
| SEC-14 | Medium | `/api/payment/verify` عمومی | payment verify route | دستکاری callback (وابسته به verify درگاه) | verify gateway | امضا/idempotency سخت |
| SEC-15 | Low | xlsx / OTP volume | package + rate-limiter | فایل/بمب SMS | rate limit جزئی | سخت‌گیری بیشتر |

**Counts (پس از ادغام اکتشاف):** Critical **2**، High **7**، Medium **5**، Low **1**.

مقادیر واقعی secret/بک‌دور در این سند چاپ نمی‌شوند؛ فقط مسیر Evidence.
