import fs from 'fs';
import path from 'path';

const dir = 'docs/project-audit';

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, ''));
  return lines.slice(1).map((line) => {
    const cols = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQ = !inQ;
        continue;
      }
      if (ch === ',' && !inQ) {
        cols.push(cur);
        cur = '';
        continue;
      }
      cur += ch;
    }
    cols.push(cur);
    const obj = {};
    headers.forEach((h, i) => (obj[h] = cols[i] || ''));
    return obj;
  });
}

function w(name, content) {
  fs.writeFileSync(path.join(dir, name), content, 'utf8');
  console.log('wrote', name, content.length);
}

const pages = parseCsv(fs.readFileSync(path.join(dir, '_pages-detail.csv'), 'utf8'));
const routes = parseCsv(fs.readFileSync(path.join(dir, 'ROUTE-MATRIX.csv'), 'utf8'));
const envs = fs
  .readFileSync(path.join(dir, '_raw-env-names.txt'), 'utf8')
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const settings = parseCsv(fs.readFileSync(path.join(dir, 'SETTING-MATRIX.csv'), 'utf8'));
const files = fs
  .readFileSync(path.join(dir, '_raw-tracked-files.txt'), 'utf8')
  .trim()
  .split(/\r?\n/)
  .filter(Boolean);
const fileMatrix = parseCsv(fs.readFileSync(path.join(dir, 'FILE-MATRIX.csv'), 'utf8'));

const models = [
  'Story',
  'Media',
  'User',
  'Address',
  'ShopSettings',
  'MenuItem',
  'Category',
  'Product',
  'Brand',
  'ProductVariant',
  'CartItem',
  'DiscountCode',
  'Order',
  'OrderItem',
  'HeroSlide',
  'Review',
  'Notification',
  'Ticket',
  'TicketMessage',
  'PageView',
  'DownloadToken',
  'Otp',
  'SmsLog',
  'BlogCategory',
  'BlogPost',
  'BlogComment',
  'ProductSet',
  'ProductSetItem',
  'ProductNotificationRequest',
  'SystemTicket',
  'SystemTicketMessage',
  'Package',
  'SystemSetting',
  'ChatSession',
  'ChatMessage',
  'WholesaleRequest',
  'AiUsage',
  'ShopDomain',
  'ShopSeedProfile',
  'ShopSeedJob',
  'PlatformCollaborator',
  'PlatformBlogCategory',
  'PlatformBlogTag',
  'PlatformBlogPost',
  'PlatformBlogPostTag',
];

const legacyAi = [
  'src/app/api/admin/ai-agent/route.ts',
  'src/app/api/admin/blog/ai-control/route.ts',
  'src/app/api/admin/blog/content-calendar/route.ts',
  'src/app/api/admin/blog/content-calendar/ai-control/route.ts',
  'src/app/api/admin/brands/ai-control/route.ts',
  'src/app/api/admin/categories/ai-control/route.ts',
  'src/app/api/admin/discounts/ai-control/route.ts',
  'src/app/api/admin/footer/ai-control/route.ts',
  'src/app/api/admin/header/ai-control/route.ts',
  'src/app/api/admin/import-export/ai-control/route.ts',
  'src/app/api/admin/media/ai-control/route.ts',
  'src/app/api/admin/orders/ai-control/route.ts',
  'src/app/api/admin/products/ai-control/route.ts',
  'src/app/api/admin/profile/ai-control/route.ts',
  'src/app/api/admin/reviews/ai-control/route.ts',
  'src/app/api/admin/settings/about-us/ai-control/route.ts',
  'src/app/api/admin/settings/ai-control/route.ts',
  'src/app/api/admin/settings/contact-us/ai-control/route.ts',
  'src/app/api/admin/settings/custom-home/ai-control/route.ts',
  'src/app/api/admin/shoppable/ai-control/route.ts',
  'src/app/api/admin/slider/ai-control/route.ts',
  'src/app/api/admin/staff/ai-control/route.ts',
  'src/app/api/admin/stories/ai-control/route.ts',
  'src/app/api/admin/system-tickets/ai-control/route.ts',
  'src/app/api/admin/tickets/ai-control/route.ts',
  'src/app/api/admin/users/ai-control/route.ts',
  'src/app/api/super-admin/blog/ai-control/route.ts',
];

const canonicalProductAi = [
  'src/app/api/admin/products/ai-seo/route.ts',
  'src/app/api/admin/products/ai-faqs/route.ts',
  'src/app/api/admin/products/ai-article/route.ts',
  'src/app/api/admin/products/ai-assistant/route.ts',
  'src/app/api/admin/products/ai-export/route.ts',
  'src/app/api/admin/products/ai-import/route.ts',
  'src/app/api/admin/products/ai-generate-all/route.ts',
  'src/app/api/admin/blog/comments/ai-control/route.ts',
  'src/app/api/super-admin/settings/test-gateway/route.ts',
  'src/lib/queue.ts',
  'src/lib/product-embedding.ts',
];

w(
  '00-SNAPSHOT.md',
  `# 00 — Snapshot مخزن

## هویت اجرا
| فیلد | مقدار |
|------|--------|
| تاریخ/زمان ممیزی | 2026-07-19 00:05:24 +13:00 |
| سیستم‌عامل | Microsoft Windows NT 10.0.26200.0 |
| ریشه مخزن | C:\\\\xampp\\\\htdocs\\\\shop_final |
| شاخه Git | main |
| Commit SHA | \`1d19274cb192e82a8a82c0c116f4949a56d6f0af\` |
| Ahead of origin/main | 1 commit |
| package | shop_final@0.1.0 |
| Node.js / npm | v22.18.0 / 10.9.3 |
| Next.js / React | 16.2.6 / 19.2.4 |
| TypeScript | ^5 |
| Prisma | ^5.22.0 |
| Tailwind | ^4 |

Evidence: \`package.json\` ؛ \`git rev-parse HEAD\` ؛ \`node --version\`

## شمارش‌ها
| مورد | تعداد |
|------|-------|
| tracked files | ${files.length} |
| pages (\`page.tsx\`) | ${pages.length} |
| API routes | ${routes.length} |
| Prisma models | ${models.length} |
| migrations | 4 |
| env vars documented | ${envs.length} |
| SystemSetting keys documented | ${settings.length} |
| FILE-MATRIX rows | ${fileMatrix.length} |

## npm scripts
\`dev\`, \`build\`, \`start\`, \`lint\`, \`bale-bot\`, \`telegram-bot\`

**Confirmed:** اسکریپت \`test\` وجود ندارد. Evidence: \`package.json:7-12\`

## کیفیت build
\`typescript.ignoreBuildErrors: true\`. Evidence: \`next.config.ts:39-41\`

## مستثنی‌ها
محتوای \`node_modules\`, \`.next\`, volumes، uploads runtime، logs — تولید/خارجی؛ فقط وجودشان مستند شده است.
`
);

const pageTable = pages
  .map((p) => `| ${p.url} | \`${p.file}\` | ${p.componentType} | ${p.auth} |`)
  .join('\n');
const routeTable = routes
  .map(
    (r) =>
      `| \`${r.path}\` | ${r.methods} | \`${r.sourceFile}\` | ${r.authPattern} | ${r.tenantMention} |`
  )
  .join('\n');

w(
  '04-PAGES-AND-LAYOUTS.md',
  `# 04 — نقشه صفحات و Layoutها

## Layout hierarchy (Confirmed)
Layoutهای tracked در FILE-MATRIX با category=\`layout\` (حدود ۵ فایل)، از جمله:
- \`src/app/layout.tsx\`
- \`src/app/(marketing)/layout.tsx\`
- \`src/app/admin/layout.tsx\`
- \`src/app/super-admin/layout.tsx\`

## Middleware protection
Evidence: \`src/middleware.ts:40-184\`
- \`/super-admin\` → \`super_admin_token\` + role \`superadmin\`
- \`/admin\` → \`admin_token\` + RBAC (\`canAccessAdminPage\`)
- \`/api/admin\` → \`admin_token\` + \`getApiPermission\`
- \`/profile\`, \`/checkout\` → \`customer_token\`
- \`/login\`, \`/register\` → redirect اگر customer لاگین است

## جدول صفحات (${pages.length})
| URL | فایل | نوع | Auth |
|-----|------|-----|------|
${pageTable}

> وجود صفحه به‌معنی تأیید E2E کامل نیست. برای منطق داده به API و Prisma مراجعه کنید.
`
);

w(
  '05-API-ROUTE-MAP.md',
  `# 05 — نقشه API Routes

## خلاصه
- تعداد: **${routes.length}** فایل \`route.ts\`
- ماتریس کامل ماشین‌خوان: [ROUTE-MATRIX.csv](./ROUTE-MATRIX.csv)
- middleware فقط \`/api/admin\` را با cookie ادمین می‌بندد. Evidence: \`src/middleware.ts:120-148\`
- تطبیق tenant برای non-superadmin در \`verifyAuth\`: \`payload.shopId === getTenantShop(host).shopId\`. Evidence: \`src/lib/auth.ts:38-49\`

## ماتریس
| Path | Methods | Source | Auth | Tenant |
|------|---------|--------|------|--------|
${routeTable}

## گروه‌بندی auth (تقریبی از heuristic)
نگاه کنید به ستون \`authPattern\` در ROUTE-MATRIX. مقادیر رایج: \`verifyAuth:admin\`, \`verifyAuth:customer\`, \`platform/superadmin\`, \`tenant-public?\`, \`public-or-mixed\`.

**Unverified per-handler:** برای مسیرهای \`check-manually\` / \`public-or-mixed\` باید بدنه handler جدا خوانده شود.

## AI dual-path (Confirmed)
- Legacy direct OpenRouter (\`openRouterFetch\` → \`https://openrouter.ai/api/v1/chat/completions\`): ${legacyAi.length} فایل اصلی فهرست‌شده در 09
- Canonical (\`callAiGateway\` / \`executeChatCompletion\` / \`executeEmbedding\`): مسیرهای محصول AI و embedding و test-gateway و بخشی از comments

Evidence: repository grep \`openrouter.ai/api/v1/chat/completions\`
`
);

const modelRows = models
  .map(
    (m) =>
      `| ${m} | \`prisma/schema.prisma\` | اغلب دارای \`shopId\` مگر پلتفرمی | confirmed |`
  )
  .join('\n');

w(
  '06-DATABASE-AND-MIGRATIONS.md',
  `# 06 — دیتابیس و Migrations

## معماری
- DBMS: PostgreSQL (Docker image \`pgvector/pgvector:pg16\`). Evidence: \`docker-compose.yml:2-8\`
- ORM: Prisma 5.22. Evidence: \`package.json\`
- اتصال: \`DATABASE_URL\`. Evidence: \`prisma/schema.prisma:5-8\`
- ایزولاسیون: ستون \`shop_id\` / فیلد \`shopId\` + extension اختیاری \`prisma-tenant-extension.ts\`

## مدل‌ها (${models.length})
| Model | Schema | Tenant | Status |
|-------|--------|--------|--------|
${modelRows}

### نکات مهم مدل‌ها (Confirmed از schema)
- \`Product.title\` (نه name)؛ فیلدهای عمده: \`wholesalePrice\`, \`wholesaleTiers\`, \`moq\`, \`isWholesaleOnly\`
- \`SystemSetting\`: key/value با \`key String @id\`
- \`ShopSettings\`: یکتا با \`shopId\`
- \`AiUsage\`: ثبت مصرف AI
- \`ShopDomain\`: دامنه سفارشی
- \`Product.embedding\` / \`embeddingUpdatedAt\`: RAG (Unsupported vector) — با migration RAG

Evidence: \`prisma/schema.prisma\` (مدل‌ها از خط ~10 به بعد)

## Migrations tracked (4)
| نام | تغییرات خلاصه | ریسک |
|-----|----------------|------|
| \`20260702000000_add_telegram_settings\` | تنظیمات تلگرام | پایین |
| \`20260706000000_add_platform_collaborators_and_blog\` | همکار پلتفرم + بلاگ پلتفرم | متوسط |
| \`20260707000000_add_product_variant_sku\` | SKU واریانت | پایین |
| \`20260711230000_add_rag_indexes\` | \`pg_trgm\` + \`vector\` + HNSW + gin title | بالا اگر extension نصب نباشد |

Evidence: \`prisma/migrations/*/migration.sql\` ؛ RAG: \`20260711230000_add_rag_indexes/migration.sql:1-12\`

## Discrepancy مهم (Confirmed)
فقط **۴** migration در git وجود دارد در حالی که schema کامل ده‌ها مدل دارد. احتمال قوی: schema اولیه با \`db push\` یا migrations حذف‌شده ساخته شده. **Production deploy با \`migrate deploy\` Alone ممکن است ناکافی باشد** مگر baseline جداگانه.

Status: confirmed-discrepancy — نیاز به تأیید اپراتور.

## Raw SQL / pgvector
- \`product-embedding.ts\` و \`product-search.ts\` از \`Prisma.sql\` استفاده می‌کنند.
- Index HNSW در migration RAG داخل همان فایل است (نه جدا با \`prisma:no-transaction\` طبق قانون AI.mdc) — **نیاز تأیید رفتار Prisma روی CONCURRENTLY/HNSW**.

Evidence: migration RAG؛ \`src/lib/product-embedding.ts\`؛ \`src/lib/product-search.ts\`
`
);

w(
  '07-AUTH-SECURITY-TENANCY.md',
  `# 07 — احراز هویت، مجوز، چندمستأجری

## مکانیزم‌های Auth (Confirmed)
| نقش | Cookie / Session | ورود | بررسی |
|-----|------------------|------|-------|
| superadmin | \`super_admin_token\` | \`/super-admin/login\` | middleware + JWT role | 
| admin / staff | \`admin_token\` | \`/admin/login\` | middleware RBAC + \`verifyAuth\` |
| customer | \`customer_token\` | \`/login\` OTP/password | middleware profile/checkout |
| platform collaborator | platform session | \`platform-auth\` | \`verifyPlatformSession\` |

Evidence: \`src/middleware.ts\`؛ \`src/lib/auth.ts\`؛ \`src/lib/admin-roles.ts\`؛ \`src/lib/platform-auth.ts\`

## JWT
- Secret: \`process.env.JWT_SECRET || 'your-super-secret-key-change-in-production'\`
- **Critical:** fallback سخت‌کدشده اگر env خالی باشد.
Evidence: \`src/middleware.ts:12\`؛ \`src/lib/auth.ts:6\`

## RBAC ادمین فروشگاه
نقش‌ها: \`admin\`, \`product_manager\`, \`sales_manager\`, \`sales_product_manager\`
Permissionها: products, orders, reports, reviews, blog, design, support, users, settings, system
Evidence: \`src/lib/admin-roles.ts:1-50\`

## Tenant resolution
\`getTenantShop\` در \`src/lib/tenant.ts\`:
1. نرمال‌سازی host (رد IP، رد دامنه اصلی مثل \`bersana.ir\` / \`localhost\` بدون ساب‌دامین)
2. استخراج subdomain در محیط local
3. lookup دامنه سفارشی از \`ShopDomain\` / settings
4. کش Redis با CacheKeys

Evidence: \`src/lib/tenant.ts:6-120+\`

## Prisma tenant extension
\`TENANT_MODELS_LOWERCASE\` + اجبار وجود \`shopId\` در where برای عملیات فیلترپذیر.
Evidence: \`src/lib/prisma-tenant-extension.ts:4-50\`

**Unverified:** آیا همه query pathها از client extended استفاده می‌کنند یا فقط \`prisma\` خام؟ نیاز تأیید \`src/lib/prisma.ts\`.

## تهدیدات مرزی مستأجر
| ریسک | وضعیت | Evidence |
|------|--------|----------|
| Default JWT secret | Critical confirmed | middleware:12 |
| اعتماد به host برای تطبیق shopId | Confirmed design | auth.ts:40-49 |
| \`/api/*\` غیر admin بدون middleware | Confirmed gap pattern | middleware فقط /api/admin |
| Superadmin بدون shop match | Confirmed exception | auth.ts:38 |
| لاگ verifyAuth | Medium | auth.ts:31-47 |
| Raw SQL بدون shop_id | نیاز بررسی هر query | product-search |
`
);

w(
  '09-AI-SUBSYSTEM.md',
  `# 09 — ممیزی زیرسیستم AI

## معماری هدف
- Model-agnostic slots via \`getAiModel\` + \`SystemSetting\` rows
- Transport: Gateway (PHP) یا Direct OpenRouter بر اساس \`ai_gateway_enabled\` + env
- Canonical client: \`src/lib/ai-provider/client.ts\` (\`executeChatCompletion\`, \`executeEmbedding\`)
- Wrapper: \`callAiGateway\` در \`src/lib/ai-gateway.ts\` → re-export از client

Evidence: \`src/lib/ai-provider/config.ts:7-78\`؛ \`src/lib/ai-gateway.ts:1-24\`؛ \`src/lib/ai-model-resolver.ts:1-79\`

## Model slots
\`router|simple|complex|content|chat|embedding|fallback|wholesale\`
Keys: \`ai_model_*\` + fallbackهای \`openrouter_control_model\` / \`openrouter_model\`
Hardcoded fallbacks در resolver. Evidence: \`ai-model-resolver.ts:13-33\`

## Config modes
| شرط | mode |
|-----|------|
| \`ai_enabled\` === false | disabled |
| \`ai_gateway_enabled\` === true + URL/TOKEN | gateway |
| else if \`AI_ALLOW_DIRECT_OPENROUTER\`===true + key | direct |
| else | throw configuration error |

Evidence: \`config.ts:32-57\`
**Confirmed:** در حالت gateway، fallback خاموش به direct وجود ندارد داخل resolver config (خطا می‌دهد اگر gateway ناقص باشد). اما مسیرهای legacy اصلاً از این resolver استفاده نمی‌کنند.

## ادعاه‌ها (ارزیابی با Evidence)
| ادعا | حکم | توضیح |
|------|-----|-------|
| همه AIها از canonical client | **False** | ${legacyAi.length} مسیر هنوز \`openRouterFetch\` مستقیم |
| همه از Gateway پشتیبانی می‌کنند | **False / Partial** | فقط مسیرهای migrated |
| Gateway≈Direct | **Partial** | برای client بله؛ برای legacy خیر |
| Embeddings از Gateway وقتی enabled | **Partial/True مسیر embedding** | \`product-embedding.ts\` از \`executeEmbedding\` / config mode |
| Streaming از Gateway | **Partial** | PHP gateway capabilities streaming=true؛ test-gateway تست می‌کند |
| کلید provider روی سرور خارجی در Gateway | **Intended True** برای canonical | کلید در PHP private config |
| بدون silent Gateway→Direct | **True برای config** | False برای اکوسیستم کلی چون legacy direct است |
| Usage یکنواخت | **False** | canonical \`logAiUsage\`؛ legacy جدا/ناقص |
| Quota یکنواخت | **False** | canonical \`checkShopQuota\`؛ legacy اغلب جدا |
| همه slotها واقعاً استفاده می‌شوند | **Partial** | getAiModel برای برخی؛ بسیاری هنوز openrouter_* |

## مسیرهای Legacy Direct OpenRouter (Confirmed grep)
${legacyAi.map((f) => `- \`${f}\``).join('\n')}

## مسیرها/ماژول‌های Canonical (نمونه Confirmed)
${canonicalProductAi.map((f) => `- \`${f}\``).join('\n')}

## PHP Gateway
- \`deploy/ai-gateway/index.php\`: GET health، POST chat/embeddings، auth با token
- Config: \`private/ai-config.php\` (example در repo؛ secrets = [REDACTED])
Evidence: \`deploy/ai-gateway/index.php:1-60\`

## Embeddings / RAG
- \`buildProductText\`, \`getEmbeddingConfig\`, \`embedProduct\`, \`batchEmbedShopProducts\`
- Search: \`src/lib/product-search.ts\` با cosine + trigram
Evidence: \`product-embedding.ts:47-79\`؛ migration RAG

## Queue AI jobs
\`src/lib/queue.ts\` type=\`ai\` → \`executeChatCompletion\` slot simple
Evidence: \`queue.ts\`

## Super-admin test
\`/api/super-admin/settings/test-gateway\` — health + chat + embedding + stream checks
Evidence: \`src/app/api/super-admin/settings/test-gateway/route.ts\`
`
);

const envTable = envs
  .map((e) => {
    const secret = /SECRET|PASSWORD|TOKEN|KEY/.test(e) ? 'secret' : 'non-secret';
    return `| \`${e}\` | ${secret} | [REDACTED] | see code/docker/.env.example |`;
  })
  .join('\n');

w(
  '11-ENVIRONMENT-VARIABLES.md',
  `# 11 — متغیرهای محیطی

**قانون:** مقادیر واقعی هرگز چاپ نمی‌شوند؛ همه \`${'[REDACTED]'}\`.

## ماتریس (${envs.length})
| Name | Secret? | Example | Sources |
|------|---------|---------|---------|
${envTable}

فایل ماشین‌خوان: [ENV-MATRIX.csv](./ENV-MATRIX.csv)

## مقایسه .env.example vs runtime
\.env.example شامل: DB_USER, DB_PASSWORD, REDIS_PASSWORD, SRH_TOKEN, NEXTAUTH_*, OPENROUTER_API_KEY, PEXELS_API_KEY, SUPER_ADMIN_SECRET, MELIPAYAMAK_*, SMS_ENCRYPTION_KEY, AI_GATEWAY_*

کد همچنین \`JWT_SECRET\`, \`OTP_HASH_SECRET\`, \`UPSTASH_REDIS_*\`, \`DATABASE_URL\`, \`DISABLE_AUTO_*_BOT\`, \`ENABLE_*_LOGS\` را می‌خواند.

**Inconsistency confirmed:** \`NEXTAUTH_SECRET\` در example هست اما auth پروژه مبتنی بر jose/JWT_SECRET است (NextAuth به‌عنوان dependency اصلی دیده نشد در package.json). Status: legacy/unused-likely.

Evidence: \`.env.example\`؛ \`package.json\`؛ \`src/lib/auth.ts:6\`

## Docker propagation
\`docker-compose.yml\` برای web: DATABASE_URL, UPSTASH_*, AI_GATEWAY_*, DISABLE_AUTO_*_BOT
JWT_SECRET و SMS_ENCRYPTION_KEY در compose صریحاً لیست نشده‌اند → باید از env_file/host بیایند یا خطر fallback.
Evidence: \`docker-compose.yml:61-70\`
`
);

const setTable = settings
  .map((s) => `| \`${s.key}\` | ${s.secret} | ${s.scope} | ${s.status} |`)
  .join('\n');

w(
  '10-SYSTEMSETTINGS.md',
  `# 10 — SystemSetting keys

جدول \`SystemSetting\` کلید/مقدار پلتفرمی است (نه per-shop مگر استفاده‌های خاص).

## ماتریس (${settings.length})
| Key | Secret | Scope | Status |
|-----|--------|-------|--------|
${setTable}

فایل: [SETTING-MATRIX.csv](./SETTING-MATRIX.csv)

## گروه‌ها
- **AI models/gateway:** \`ai_model_*\`, \`ai_enabled\`, \`ai_gateway_*\`, \`ai_embedding_*\`, \`openrouter_*\`
- **CMS SaaS:** \`saas_*\`
- **SMS:** \`global_melipayamak_*\` (رمزنگاری‌شده با SMS_ENCRYPTION_KEY)
- **Messaging:** \`central_bale_*\`, \`central_telegram_*\`
- **Media:** \`pexels_api_key\`, \`poof_api_key\`
- **Blog AI:** \`blog_ai_*\`, \`platform_blog_*_model\`, \`ai_seo_*\`

UI نوشتن اصلی: \`src/app/api/super-admin/settings/route.ts\` + \`src/app/super-admin/page.tsx\`
Cache invalidate: \`invalidateModelCache\`, \`invalidateAiProviderConfigCache\`

Evidence: \`src/app/api/super-admin/settings/route.ts:397-521\`
`
);

// file inventory summary by category
const byCat = {};
for (const f of fileMatrix) {
  byCat[f.category] = (byCat[f.category] || 0) + 1;
}
const catRows = Object.entries(byCat)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => `| ${k} | ${v} |`)
  .join('\n');

w(
  '03-FILE-INVENTORY.md',
  `# 03 — فهرست فایل‌ها

## خلاصه
- tracked documented in FILE-MATRIX: **${fileMatrix.length}**
- ماشین‌خوان کامل: [FILE-MATRIX.csv](./FILE-MATRIX.csv)
- هر ردیف: path, category, purpose, runtime, status, evidence

## توزیع دسته
| Category | Count |
|----------|-------|
${catRows}

## نحوه استفاده
برای جزئیات هر فایل به CSV مراجعه کنید. فایل‌های بزرگ (مثل \`super-admin/page.tsx\`, \`ai-agent/route.ts\`, \`blog/ai-control\`) منطق چندبخشی دارند؛ outline در 08/09.

## دارایی‌های static
حدود ۲۸۶ فایل public (عمدتاً \`.webp\`) — گروه‌بندی‌شده به‌عنوان static-asset؛ رفتار خاص ندارند مگر مصرف در UI.

## وضعیت‌ها
پیش‌فرض inventory: \`active\`. موارد legacy AI در 09 جدا مشخص شده‌اند.
`
);

console.log('core docs generated');
