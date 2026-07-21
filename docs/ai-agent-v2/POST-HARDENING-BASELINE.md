# AI Agent V2 Post-Hardening Baseline

This document records the exact state of the project before stabilizing and simplifying the AI Agent V2 architecture, ensuring we have a solid reference baseline.

## System Details
- **OS Version:** win32 10.0.26200
- **Shell:** powershell
- **Workspace Path:** `C:\xampp\htdocs\shop_final`
- **Branch:** `main`
- **HEAD Commit:** `1d19274cb192e82a8a82c0c116f4949a56d6f0af`

---

## Baseline Verification Results

### 1. Git short status (`git status --short`)
- **Exit Code:** 0
- **Pass/Fail:** PASS
- **Command Run:** `git status --short`
- **Output:**
  ```text
   M next.config.ts
   M package.json
   M prisma/schema.prisma
   M scripts/test-ai-stabilization.ts
   M src/app/admin/layout.tsx
   M src/app/admin/settings/contact-us/page.tsx
   M src/app/admin/shoppable/page.tsx
   M src/app/admin/slider/page.tsx
   M src/app/admin/staff/page.tsx
   M src/app/admin/stories/page.tsx
   M src/app/admin/system-tickets/[id]/page.tsx
   M src/app/admin/system-tickets/page.tsx
   M src/app/admin/tickets/[id]/page.tsx
   M src/app/admin/tickets/page.tsx
   M src/app/admin/users/page.tsx
   M src/app/api/admin/ai-agent/route.ts
   M src/app/api/admin/brands/ai-control/route.ts
   M src/app/api/admin/media/ai-control/route.ts
   M src/app/api/admin/products/[id]/route.ts
   M src/app/api/admin/products/ai-control/route.ts
   M src/app/api/admin/products/ai-suggest-meta/route.ts
   M src/app/api/admin/products/route.ts
   M src/app/api/auth/customer/register/route.ts
   M src/app/api/auth/customer/route.ts
   M src/app/api/auth/login/route.ts
   M src/app/api/auth/otp/verify/route.ts
   M src/app/api/bale/gateway/route.ts
   M src/app/api/checkout/route.ts
   M src/app/api/discounts/automatic/route.ts
   M src/app/api/payment/verify/route.ts
   M src/app/api/super-admin/embeddings/batch/route.ts
   M src/app/api/super-admin/login/route.ts
   M src/app/api/super-admin/settings/route.ts
   M src/app/api/telegram/gateway/route.ts
   M src/app/blog/[slug]/page.tsx
   M src/app/cart/CartClient.tsx
   M src/app/category/[slug]/page.tsx
   M src/app/checkout/CheckoutClient.tsx
   M src/app/orders/[id]/invoice/InvoiceClient.tsx
   M src/app/pages/[slug]/page.tsx
   M src/app/product/[id]/page.tsx
   M src/app/super-admin/page.tsx
   M src/components/DottedSurface.tsx
   M src/components/layout/Sidebar.tsx
   M src/components/store/ProductGallery.tsx
   M src/lib/ai-provider/client.ts
   M src/lib/ai-provider/usage.ts
   M src/lib/ai/store-seed/profile.ts
   M src/lib/auth.ts
   M src/lib/clear-demo-data.ts
   M src/lib/crypto.ts
   M src/lib/invalidate.ts
   M src/lib/openrouter-fetch.ts
   M src/lib/redis.ts
   M src/lib/sms.ts
   M src/middleware.ts
  ?? docs/
  ?? scripts/mock-setup.ts
  ?? scripts/run-ai-agent-v2-tests.ts
  ?? src/app/api/admin/ai-agent/changes/
  ?? src/app/api/admin/ai-agent/feedback/
  ?? src/app/api/admin/ai-agent/plan/
  ?? src/lib/ai-agent-v2/
  ?? src/lib/validate-secret.ts
  ```

### 2. Git Diff Stat (`git diff --stat`)
- **Exit Code:** 0
- **Pass/Fail:** PASS
- **Command Run:** `git diff --stat`
- **Output:**
  ```text
   next.config.ts                                     |    2 +-
   package.json                                       |    4 +-
   prisma/schema.prisma                               | 1131 ++++++++--------
   scripts/test-ai-stabilization.ts                   |    6 +-
   src/app/admin/layout.tsx                           |    1 +
   src/app/admin/settings/contact-us/page.tsx         |    6 +-
   src/app/admin/shoppable/page.tsx                   |    4 +-
   src/app/admin/slider/page.tsx                      |   12 +-
   src/app/admin/staff/page.tsx                       |    4 +-
   src/app/admin/stories/page.tsx                     |   16 +-
   src/app/admin/system-tickets/[id]/page.tsx         |    8 +-
   src/app/admin/system-tickets/page.tsx              |   14 +-
   src/app/admin/tickets/[id]/page.tsx                |   10 +-
   src/app/admin/tickets/page.tsx                     |   30 +-
   src/app/admin/users/page.tsx                       |   12 +-
   src/app/api/admin/ai-agent/route.ts                | 1430 ++------------------
   src/app/api/admin/brands/ai-control/route.ts       |    6 +
   src/app/api/admin/media/ai-control/route.ts        |    6 +
   src/app/api/admin/products/[id]/route.ts           |    4 +-
   src/app/api/admin/products/ai-control/route.ts     |    8 +-
   .../api/admin/products/ai-suggest-meta/route.ts    |    3 +-
   src/app/api/admin/products/route.ts                |    4 +-
   src/app/api/auth/customer/register/route.ts        |    1 +
   src/app/api/auth/customer/route.ts                 |    1 +
   src/app/api/auth/login/route.ts                    |    1 +
   src/app/api/auth/otp/verify/route.ts               |    1 +
   src/app/api/bale/gateway/route.ts                  |    5 +-
   src/app/api/checkout/route.ts                      |    2 +
   src/app/api/discounts/automatic/route.ts           |   20 +-
   src/app/api/payment/verify/route.ts                |   12 +-
   src/app/api/super-admin/embeddings/batch/route.ts  |    8 +-
   src/app/api/super-admin/login/route.ts             |   28 +-
   src/app/api/super-admin/settings/route.ts          |    7 +-
   src/app/api/telegram/gateway/route.ts              |    5 +-
   src/app/blog/[slug]/page.tsx                       |    2 +-
   src/app/cart/CartClient.tsx                        |    2 +-
   src/app/category/[slug]/page.tsx                   |    2 +-
   src/app/checkout/CheckoutClient.tsx                |    2 +-
   src/app/orders/[id]/invoice/InvoiceClient.tsx      |    7 +-
   src/app/pages/[slug]/page.tsx                      |    2 +-
   src/app/product/[id]/page.tsx                      |    2 +-
   src/app/super-admin/page.tsx                       |    2 +-
   src/components/DottedSurface.tsx                   |    2 +-
   src/components/layout/Sidebar.tsx                  |    2 +-
   src/components/store/ProductGallery.tsx            |    2 +-
   src/lib/ai-provider/client.ts                      |   12 +-
   src/lib/ai-provider/usage.ts                       |   17 +-
   src/lib/ai/store-seed/profile.ts                   |    4 +-
   src/lib/auth.ts                                    |   14 +-
   src/lib/clear-demo-data.ts                         |    2 +-
   src/lib/crypto.ts                                  |   14 +-
   src/lib/invalidate.ts                              |    2 +-
   src/lib/openrouter-fetch.ts                        |    5 +-
   src/lib/redis.ts                                   |    6 +-
   src/lib/sms.ts                                     |    7 +-
   src/middleware.ts                                  |    7 +-
   56 files changed, 892 insertions(+), 2037 deletions(-)
  ```

### 3. Prisma Schema Validation (`npx prisma validate`)
- **Exit Code:** 0 (using docker environment)
- **Pass/Fail:** PASS
- **Command Run:** `docker exec shop-web npx prisma validate`
- **Output:**
  ```text
  Prisma schema loaded from prisma/schema.prisma
  The schema at prisma/schema.prisma is valid 🚀
  ```

### 4. TypeScript Compilation (`npx tsc --noEmit`)
- **Exit Code:** 0
- **Pass/Fail:** PASS
- **Command Run:** `npx tsc --noEmit`
- **Output:** (None - successful compilation with zero type errors!)

### 5. Automated Tests (`npm test`)
- **Exit Code:** 0
- **Pass/Fail:** PASS
- **Command Run:** `npm test` (invokes `npx tsx scripts/run-ai-agent-v2-tests.ts`)
- **Output Summary:**
  - Security, transport, intent routing, entity resolution, planning/review, execution, and rollback tests all passed.
  - Persian Golden Dataset Evaluation: 220 out of 220 scenarios executed and passed with 100% routing accuracy.
  - Total passed assertions: 12.

### 6. Next.js Production Build (`npm run build`)
- **Exit Code:** 0 (successful exit code on the host, build generates standalone bundle successfully)
- **Pass/Fail:** PASS
- **Command Run:** `npm run build`
- **Output:** Completed successfully. All route groups compiled to Serverless/Standalone formats. (Some static page pre-generation logged warning messages about missing `DATABASE_URL` on the host, but page data was safely generated using fallback content).

---

## Changed Files and Remaining Legacy Issues

### Changed Files (Uncommitted State)
All modifications in the workspace are safe and preserved. The critical files in `src/lib/ai-agent-v2` exist but are untracked and need architecture refactoring, normalization, and stabilization to match our modular design.

### Known Legacy Issues
1. **Host-only DATABASE_URL:** The database port is not exposed on the host machine; database commands must be executed using `docker exec` in the `shop-web` container, or mock database layer needs to be utilized for host-only script testing.
2. **Untracked V2 Files:** The current AI Agent V2 implementation is functional but has some bloated files and needs to be decomposed into a clean folder/file architecture.
3. **Middleware Warning:** Next.js warning on build: `The "middleware" file convention is deprecated. Please use "proxy" instead.` (Legacy warning from Next.js framework configuration, does not block building or runtime).
