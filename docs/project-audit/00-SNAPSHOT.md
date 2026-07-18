# 00 — Snapshot مخزن

## هویت اجرا
| فیلد | مقدار |
|------|--------|
| تاریخ/زمان ممیزی | 2026-07-19 00:05:24 +13:00 |
| سیستم‌عامل | Microsoft Windows NT 10.0.26200.0 |
| ریشه مخزن | C:\\xampp\\htdocs\\shop_final |
| شاخه Git | main |
| Commit SHA | `1d19274cb192e82a8a82c0c116f4949a56d6f0af` |
| Ahead of origin/main | 1 commit |
| package | shop_final@0.1.0 |
| Node.js / npm | v22.18.0 / 10.9.3 |
| Next.js / React | 16.2.6 / 19.2.4 |
| TypeScript | ^5 |
| Prisma | ^5.22.0 |
| Tailwind | ^4 |

Evidence: `package.json` ؛ `git rev-parse HEAD` ؛ `node --version`

## شمارش‌ها
| مورد | تعداد |
|------|-------|
| tracked files | 773 |
| pages (`page.tsx`) | 86 |
| API routes | 185 |
| Prisma models | 45 |
| migrations | 4 |
| env vars documented | 34 |
| SystemSetting keys documented | 66 |
| FILE-MATRIX rows | 772 |

## npm scripts
`dev`, `build`, `start`, `lint`, `bale-bot`, `telegram-bot`

**Confirmed:** اسکریپت `test` وجود ندارد. Evidence: `package.json:7-12`

## کیفیت build
`typescript.ignoreBuildErrors: true`. Evidence: `next.config.ts:39-41`

## مستثنی‌ها
محتوای `node_modules`, `.next`, volumes، uploads runtime، logs — تولید/خارجی؛ فقط وجودشان مستند شده است.
