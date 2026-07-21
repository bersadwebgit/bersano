# 17 — کیفیت، تست، بدهی فنی

## نتایج دستورات امن (این ممیزی)

| چک | نتیجه | Evidence |
|----|--------|----------|
| `npm run` / scripts | بدون `test` | package.json:7-12 |
| TypeScript در build | **نادیده گرفته می‌شود** | next.config.ts:39-41 `ignoreBuildErrors: true` |
| `npx tsc --noEmit` | **Fail** — **81** خطای `error TS*`؛ exit code 2 | اجرای ممیزی 2026-07-19 |
| ESLint (`npm run lint`) | **Fail** — ✖ **2696** problems (**1720** errors, **976** warnings)؛ exit 1 | اجرای ممیزی 2026-07-19 |
| `npm test` | Missing script (Confirmed) | package.json |
| Production type-safety claim | **نمی‌توان ادعا کرد type-safe است** | ignoreBuildErrors + tsc fail |

### نمونه‌های خطای TypeScript (Confirmed، pre-existing)
- `src/app/pages/[slug]/page.tsx` — `permanentRedirect` تعریف‌نشده
- `src/app/checkout/CheckoutClient.tsx` — نوع درگاه `"snapppay"` با union فعلی ناسازگار
- `src/app/super-admin/page.tsx` — `CheckCircle2` تعریف‌نشده
- `src/lib/invalidate.ts` — `redis` possibly null
- `src/lib/ai/store-seed/profile.ts` — JsonValue vs InputJsonValue

این خطاها به‌خاطر `ignoreBuildErrors` ممکن است مانع `next build` نشوند — که خود یک **production risk** است.

## بدهی فنی (Confirmed)
1. Dual AI transport: canonical vs legacy OpenRouter direct (09)
2. Migration history ناقص (۴ فایل)
3. JWT_SECRET fallback
4. verifyAuth console logging
5. `.env.example` شامل NEXTAUTH_* بدون پکیج next-auth
6. صف فایل‌محور in-process (`queue.ts`) — مقیاس‌پذیری محدود در چند instance
7. صفحات/مسیرهای بسیار بزرگ (ai-agent, blog ai-control, super-admin page)

## Dead code / duplication (Partial)
- Duplicate AI clients: `openRouterFetch` + `executeChatCompletion`
- `ai-gateway.ts` فقط re-export است (لایه سازگاری) — Active shim
- `mock-data.ts` / `demo-data.ts` — demo/seed؛ نه لزوماً dead
Confidence: Probably unused برای برخی exportها بدون تحلیل static کامل — Cannot verify dynamically

## Production blockers
نگاه کنید به 01-EXECUTIVE-SUMMARY و یافته‌های Critical/High در امنیت.
