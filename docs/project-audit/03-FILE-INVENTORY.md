# 03 — فهرست فایل‌ها

## خلاصه
- tracked documented in FILE-MATRIX: **772**
- ماشین‌خوان کامل: [FILE-MATRIX.csv](./FILE-MATRIX.csv)
- هر ردیف: path, category, purpose, runtime, status, evidence

## توزیع دسته
| Category | Count |
|----------|-------|
| static-asset | 286 |
| api-route | 185 |
| page | 87 |
| library | 67 |
| component | 63 |
| source-other | 25 |
| config | 7 |
| app-special | 7 |
| client-state | 7 |
| other | 6 |
| database | 6 |
| script | 5 |
| layout | 5 |
| cursor-rules | 4 |
| docker | 4 |
| docs-rules | 4 |
| deployment | 4 |

## نحوه استفاده
برای جزئیات هر فایل به CSV مراجعه کنید. فایل‌های بزرگ (مثل `super-admin/page.tsx`, `ai-agent/route.ts`, `blog/ai-control`) منطق چندبخشی دارند؛ outline در 08/09.

## دارایی‌های static
حدود ۲۸۶ فایل public (عمدتاً `.webp`) — گروه‌بندی‌شده به‌عنوان static-asset؛ رفتار خاص ندارند مگر مصرف در UI.

## وضعیت‌ها
پیش‌فرض inventory: `active`. موارد legacy AI در 09 جدا مشخص شده‌اند.
