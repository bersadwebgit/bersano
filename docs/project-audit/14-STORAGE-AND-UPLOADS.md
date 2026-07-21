# 14 — ذخیره‌سازی و آپلود

## محل ذخیره
- Volume داکر: `uploads_data:/app/public/uploads`
Evidence: `docker-compose.yml:76-77`

## پردازش تصویر
- `sharp` dependency — فشرده‌سازی/تغییر اندازه در مسیرهای media
Evidence: `package.json`؛ استفاده‌ها در media/AI assistant routes

## حذف پس‌زمینه
- Poof: `https://api.poof.bg/v1/remove` + key از `poof_api_key`
Evidence: external URLs؛ media/process route (SystemSetting poof)

## ایزولاسیون مستأجر
**Confirmed (اکتشاف storage):** فایل‌ها عمدتاً **تخت** زیر `public/uploads/` هستند (بدون پوشه per-`shopId`). ایزولاسیون بیشتر در متادیتای DB است؛ دانستن URL برای fetch کافی است.
Evidence: الگوی write در media/chat/review upload؛ serve در `src/app/uploads/[...path]/route.ts`.

| مسیر | نکته Confirmed |
|------|----------------|
| `api/media` | ادمین/مشتری؛ ~10MB؛ sharp→webp |
| `api/reviews/upload` | مشتری؛ **بدون سقف حجم** در بررسی اکتشاف |
| `api/chat/upload` | بدون user JWT؛ وابسته به sessionId؛ ~5MB |
| uploads serve | `..` مسدود؛ SVG به‌صورت `image/svg+xml` → ریسک XSS |

## انواع فایل / محدودیت حجم
باید در هر upload route بررسی شود (MIME, size). فهرست مسیرهای upload از ROUTE-MATRIX با واژه upload/media.

## محصولات دیجیتال / DownloadToken
توکن‌های زمان‌دار برای دانلود — مدل `DownloadToken`.
Evidence: schema

## ریسک‌های امنیتی ذخیره‌سازی
| مورد | Severity | Status |
|------|----------|--------|
| اجرای فایل آپلودشده اگر در مسیر public قابل اجرا باشد | High | Suspected — نیاز تأیید nginx/static |
| نبود محدودیت اندازه | Medium | Unverified per-route |
| نشت فایل خصوصی | High | Unverified |
| Path traversal | High | بررسی validate در handlers |

توصیه: همه uploadها را با allowlist MIME + shopId prefix + nondeterministic names بازبینی کنید.
