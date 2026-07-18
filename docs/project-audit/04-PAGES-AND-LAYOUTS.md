# 04 — نقشه صفحات و Layoutها

## Layout hierarchy (Confirmed)
Layoutهای tracked در FILE-MATRIX با category=`layout` (حدود ۵ فایل)، از جمله:
- `src/app/layout.tsx`
- `src/app/(marketing)/layout.tsx`
- `src/app/admin/layout.tsx`
- `src/app/super-admin/layout.tsx`

## Middleware protection
Evidence: `src/middleware.ts:40-184`
- `/super-admin` → `super_admin_token` + role `superadmin`
- `/admin` → `admin_token` + RBAC (`canAccessAdminPage`)
- `/api/admin` → `admin_token` + `getApiPermission`
- `/profile`, `/checkout` → `customer_token`
- `/login`, `/register` → redirect اگر customer لاگین است

## جدول صفحات (86)
| URL | فایل | نوع | Auth |
|-----|------|-----|------|
| /ai | `src/app/(marketing)/ai/page.tsx` | server | public |
| /compare/custom-website | `src/app/(marketing)/compare/custom-website/page.tsx` | server | public |
| /compare/instagram | `src/app/(marketing)/compare/instagram/page.tsx` | server | public |
| /demo | `src/app/(marketing)/demo/page.tsx` | client | public |
| /digital-products | `src/app/(marketing)/digital-products/page.tsx` | server | public |
| /features | `src/app/(marketing)/features/page.tsx` | server | public |
| /instagram-shop | `src/app/(marketing)/instagram-shop/page.tsx` | server | public |
| /marketing-tools | `src/app/(marketing)/marketing-tools/page.tsx` | server | public |
| /payments-shipping | `src/app/(marketing)/payments-shipping/page.tsx` | server | public |
| /pricing | `src/app/(marketing)/pricing/page.tsx` | client | public |
| /seo-content | `src/app/(marketing)/seo-content/page.tsx` | server | public |
| /wholesale | `src/app/(marketing)/wholesale/page.tsx` | server | public |
| /admin/accounting/mahak | `src/app/admin/accounting/mahak/page.tsx` | client | admin_token+RBAC |
| /admin/agent | `src/app/admin/agent/page.tsx` | client | admin_token+RBAC |
| /admin/blog/[id]/edit | `src/app/admin/blog/[id]/edit/page.tsx` | client | admin_token+RBAC |
| /admin/blog/categories | `src/app/admin/blog/categories/page.tsx` | client | admin_token+RBAC |
| /admin/blog/comments | `src/app/admin/blog/comments/page.tsx` | client | admin_token+RBAC |
| /admin/blog/new | `src/app/admin/blog/new/page.tsx` | client | admin_token+RBAC |
| /admin/blog | `src/app/admin/blog/page.tsx` | client | admin_token+RBAC |
| /admin/categories/[id]/edit | `src/app/admin/categories/[id]/edit/page.tsx` | client | admin_token+RBAC |
| /admin/categories/new | `src/app/admin/categories/new/page.tsx` | client | admin_token+RBAC |
| /admin/categories | `src/app/admin/categories/page.tsx` | client | admin_token+RBAC |
| /admin/chat | `src/app/admin/chat/page.tsx` | client | admin_token+RBAC |
| /admin/dashboard | `src/app/admin/dashboard/page.tsx` | client | admin_token+RBAC |
| /admin/discounts | `src/app/admin/discounts/page.tsx` | client | admin_token+RBAC |
| /admin/downloads | `src/app/admin/downloads/page.tsx` | server | admin_token+RBAC |
| /admin/footer | `src/app/admin/footer/page.tsx` | client | admin_token+RBAC |
| /admin/header | `src/app/admin/header/page.tsx` | client | admin_token+RBAC |
| /admin/import-export | `src/app/admin/import-export/page.tsx` | client | admin_token+RBAC |
| /admin/login | `src/app/admin/login/page.tsx` | client | admin_token+RBAC |
| /admin/media | `src/app/admin/media/page.tsx` | client | admin_token+RBAC |
| /admin/orders | `src/app/admin/orders/page.tsx` | client | admin_token+RBAC |
| /admin/orders/print-batch | `src/app/admin/orders/print-batch/page.tsx` | server | admin_token+RBAC |
| /admin | `src/app/admin/page.tsx` | server | admin_token+RBAC |
| /admin/products/[id]/edit | `src/app/admin/products/[id]/edit/page.tsx` | client | admin_token+RBAC |
| /admin/products/new | `src/app/admin/products/new/page.tsx` | client | admin_token+RBAC |
| /admin/products | `src/app/admin/products/page.tsx` | client | admin_token+RBAC |
| /admin/profile | `src/app/admin/profile/page.tsx` | client | admin_token+RBAC |
| /admin/reviews | `src/app/admin/reviews/page.tsx` | client | admin_token+RBAC |
| /admin/settings/about-us | `src/app/admin/settings/about-us/page.tsx` | client | admin_token+RBAC |
| /admin/settings/contact-us | `src/app/admin/settings/contact-us/page.tsx` | client | admin_token+RBAC |
| /admin/settings/custom-home | `src/app/admin/settings/custom-home/page.tsx` | client | admin_token+RBAC |
| /admin/settings/domains | `src/app/admin/settings/domains/page.tsx` | client | admin_token+RBAC |
| /admin/settings | `src/app/admin/settings/page.tsx` | client | admin_token+RBAC |
| /admin/shoppable | `src/app/admin/shoppable/page.tsx` | client | admin_token+RBAC |
| /admin/slider | `src/app/admin/slider/page.tsx` | client | admin_token+RBAC |
| /admin/staff | `src/app/admin/staff/page.tsx` | client | admin_token+RBAC |
| /admin/stories | `src/app/admin/stories/page.tsx` | client | admin_token+RBAC |
| /admin/system-tickets/[id] | `src/app/admin/system-tickets/[id]/page.tsx` | client | admin_token+RBAC |
| /admin/system-tickets/new | `src/app/admin/system-tickets/new/page.tsx` | client | admin_token+RBAC |
| /admin/system-tickets | `src/app/admin/system-tickets/page.tsx` | client | admin_token+RBAC |
| /admin/tickets/[id] | `src/app/admin/tickets/[id]/page.tsx` | client | admin_token+RBAC |
| /admin/tickets | `src/app/admin/tickets/page.tsx` | client | admin_token+RBAC |
| /admin/users | `src/app/admin/users/page.tsx` | client | admin_token+RBAC |
| /b/[id] | `src/app/b/[id]/page.tsx` | server | public |
| /blog/[slug] | `src/app/blog/[slug]/page.tsx` | server | public |
| /blog | `src/app/blog/page.tsx` | server | public |
| /cart | `src/app/cart/page.tsx` | server | public |
| /category/[slug] | `src/app/category/[slug]/page.tsx` | server | public |
| /checkout | `src/app/checkout/page.tsx` | server | customer_token |
| /faq | `src/app/faq/page.tsx` | server | public |
| /login | `src/app/login/page.tsx` | server | guest-preferred |
| /orders/[id]/invoice | `src/app/orders/[id]/invoice/page.tsx` | server | public |
| / | `src/app/page.tsx` | server | public |
| /pages/[slug] | `src/app/pages/[slug]/page.tsx` | server | public |
| /product/[id] | `src/app/product/[id]/page.tsx` | server | public |
| /profile/addresses | `src/app/profile/addresses/page.tsx` | server | customer_token |
| /profile/downloads | `src/app/profile/downloads/page.tsx` | server | customer_token |
| /profile/favorites | `src/app/profile/favorites/page.tsx` | client | customer_token |
| /profile/notifications | `src/app/profile/notifications/page.tsx` | client | customer_token |
| /profile/orders/[id] | `src/app/profile/orders/[id]/page.tsx` | server | customer_token |
| /profile/orders | `src/app/profile/orders/page.tsx` | server | customer_token |
| /profile | `src/app/profile/page.tsx` | server | customer_token |
| /profile/security | `src/app/profile/security/page.tsx` | client | customer_token |
| /profile/support/[id] | `src/app/profile/support/[id]/page.tsx` | server | customer_token |
| /profile/support/new | `src/app/profile/support/new/page.tsx` | server | customer_token |
| /profile/support | `src/app/profile/support/page.tsx` | server | customer_token |
| /register | `src/app/register/page.tsx` | server | guest-preferred |
| /shop | `src/app/shop/page.tsx` | server | public |
| /shoppable/[slug] | `src/app/shoppable/[slug]/page.tsx` | server | public |
| /super-admin/blog/[id]/edit | `src/app/super-admin/blog/[id]/edit/page.tsx` | client | super_admin_token |
| /super-admin/blog/new | `src/app/super-admin/blog/new/page.tsx` | client | super_admin_token |
| /super-admin/blog | `src/app/super-admin/blog/page.tsx` | client | super_admin_token |
| /super-admin/login | `src/app/super-admin/login/page.tsx` | client | super_admin_token |
| /super-admin | `src/app/super-admin/page.tsx` | client | super_admin_token |
| /wholesale-request | `src/app/wholesale-request/page.tsx` | server | public |

> وجود صفحه به‌معنی تأیید E2E کامل نیست. برای منطق داده به API و Prisma مراجعه کنید.
