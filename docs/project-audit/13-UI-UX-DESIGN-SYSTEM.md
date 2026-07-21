# 13 — UI / UX / Design System

## RTL و فارسی
UI پیش‌فرض RTL و فارسی. قوانین workspace نیز RTL-first هستند.
Evidence: صفحات admin/marketing؛ قوانین `.cursor/rules`

## فونت
Vazirmatn از Google Fonts در URLهای خارجی.
Evidence: `_raw-external-urls.txt` → fonts.googleapis.com Vazirmatn

## Tailwind
نسخه 4 (`@tailwindcss/postcss`, `tailwindcss` ^4).
Evidence: `package.json` devDependencies

## Theme / برندینگ مستأجر
رنگ‌ها و توکن‌ها از تنظیمات فروشگاه / CSS variables (طراحی Master Template).
Helper: `theme-color-from-prompt.ts`, `colors.ts`
Evidence: libs؛ ShopSettings JSON fields در schema

## پوسته‌ها
| Shell | مسیر تقریبی |
|-------|-------------|
| Marketing | `(marketing)/layout.tsx` |
| Admin | `admin/layout.tsx` |
| Super-admin | `super-admin/layout.tsx` |
| Storefront | layout ریشه + کامپوننت‌های store |

## کامپوننت‌ها
~63 فایل در `src/components/` — FILE-MATRIX category=component.
آیکون‌ها: `lucide-react`.
Carousel: embla.
State: zustand (`src/store` در client-state).

## ریسک‌های UI (Suspected/Partial)
- صفحات بسیار بزرگ client مثل `super-admin/page.tsx` → bundle/maintainability
- XSS اگر HTML تولید AI بدون sanitize رندر شود — وجود `sanitize-html.ts` و `isomorphic-dompurify`؛ تأیید همه call-siteها: Unverified کامل

Evidence: package.json deps؛ `src/lib/sanitize-html.ts`
