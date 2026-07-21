# 02 — معماری سیستم

## هدف کسب‌وکار
فروشگاه‌ساز متمرکز: هر تاجر یک فروشگاه (tenant) روی همان هسته؛ شخصی‌سازی از DB/CSS variables؛ پکیج/سهمیه AI؛ دامنه اختصاصی؛ کانال‌های پیام و پرداخت ایرانی.

## اجزای سطح بالا

```mermaid
flowchart TB
  User[Browser User]
  Nginx[Reverse Proxy / Host Nginx - external]
  Web[Next.js web container :3000]
  PG[(PostgreSQL + pgvector)]
  Redis[(Redis + SRH HTTP proxy)]
  GW[PHP AI Gateway - external host]
  OR[OpenRouter / Embedding provider]
  SMS[Melipayamak / SMS.ir]
  Pay[Zarinpal / Zibal / Digipay]
  Tipax[Tipax API]
  Bots[bale-bot / telegram-bot containers]

  User --> Nginx --> Web
  Web --> PG
  Web --> Redis
  Web --> GW --> OR
  Web -.->|legacy direct AI| OR
  Web --> SMS
  Web --> Pay
  Web --> Tipax
  Bots --> PG
  Bots --> Web
```

Evidence: `docker-compose.yml`؛ `deploy/ai-gateway/index.php`؛ `src/lib/ai-provider/config.ts`

## Runtime boundaries
- **Server:** App Router RSC، API routes، Prisma، Redis، Sharp، queue فایل‌محور
- **Client:** کامپوننت‌های `use client`، Zustand stores
- **Deployment-only:** Docker، PHP gateway، bot scripts

## Tenant resolution lifecycle

```mermaid
sequenceDiagram
  participant B as Browser
  participant M as middleware.ts
  participant T as getTenantShop
  participant R as Redis cache
  participant DB as PostgreSQL

  B->>M: Request Host + path
  M->>M: Auth gates for admin/profile/super-admin
  M->>T: host normalize
  T->>R: cache lookup
  alt miss
    T->>DB: subdomain / ShopDomain / ShopSettings
  end
  T-->>M: shop context or null
```

Evidence: `src/lib/tenant.ts`؛ `src/middleware.ts`

## Authentication overview

```mermaid
flowchart LR
  SA[super_admin_token] --> SAP[/super-admin]
  AD[admin_token] --> ADM[/admin + /api/admin]
  CU[customer_token] --> PR[/profile /checkout]
  JWT[jose jwtVerify + JWT_SECRET]
  SA --> JWT
  AD --> JWT
  CU --> JWT
```

Evidence: `src/middleware.ts:40-184`؛ `src/lib/auth.ts:9-88`

## AI request flow (canonical)

```mermaid
sequenceDiagram
  participant API as API Route
  participant C as executeChatCompletion
  participant CFG as resolveAiProviderConfig
  participant Q as quota/usage
  participant GW as PHP Gateway
  participant OR as OpenRouter

  API->>C: slot + messages + shopId
  C->>Q: checkShopQuota
  C->>CFG: mode gateway|direct|disabled
  alt gateway
    C->>GW: POST + AI_GATEWAY_TOKEN
    GW->>OR: provider key on gateway host
  else direct
    C->>OR: openrouter_api_key from SystemSetting
  end
  C->>Q: logAiUsage / decrement
```

Evidence: `src/lib/ai-provider/client.ts`؛ `config.ts:32-57`

## Checkout / payment (منطقی)

```mermaid
flowchart TD
  Cart[Cart / Checkout page] --> OrderAPI[Order create API]
  OrderAPI --> PG[(Order + OrderItem)]
  OrderAPI --> Gateway{Payment provider}
  Gateway -->|Zarinpal| ZP[api.zarinpal.com]
  Gateway -->|Zibal| ZB[gateway.zibal.ir]
  Gateway -->|Digipay| DP[api.mydigipay.com]
  ZP --> Verify[Verify callback/API]
  ZB --> Verify
  DP --> Verify
  Verify --> Paid[Order paid + side effects SMS/notify]
```

Evidence: hardcoded URLs در `_raw-external-urls.txt`؛ libs `digipay.ts`؛ جستجوی zarinpal/zibal در src

## Store onboarding

```mermaid
flowchart LR
  Reg[Register merchant] --> Shop[Create ShopSettings]
  Shop --> Seed[AI seed / demo / ShopSeedJob]
  Seed --> Products[Products categories content]
  Products --> Embed[Optional embeddings]
```

Evidence: مدل‌های `ShopSeedProfile`, `ShopSeedJob`؛ `src/lib/ai/store-seed/*`

## Deployment topology

```mermaid
flowchart TB
  subgraph docker [docker-compose internal network]
    web[web]
    pg[postgres]
    redis[redis]
    srh[serverless-redis-http]
    bale[bale-bot]
    tg[telegram-bot]
    web --> pg
    web --> srh --> redis
    bale --> pg
    tg --> pg
  end
  Host[Host 127.0.0.1:3000] --> web
  ExtGW[External PHP AI Gateway] -.-> web
```

Evidence: `docker-compose.yml:1-118`

## Upload / media flow

```mermaid
flowchart LR
  Admin[Admin media UI] --> UploadAPI[Upload API]
  UploadAPI --> Disk[public/uploads volume]
  UploadAPI --> Sharp[sharp processing]
  UploadAPI --> Poof[Poof BG remove optional]
  Disk --> Public[/uploads served]
```

Evidence: `docker-compose.yml:76-77` volume `uploads_data`؛ `sharp` در package.json؛ `poof_api_key`

## Error / logging
- Perf/cache logs با `ENABLE_PERF_LOGS` / `ENABLE_CACHE_LOGS`
- AI usage در `AiUsage`
- verifyAuth دارای console.logهای تشخیصی

Evidence: env names؛ `auth.ts:31`؛ `ai-provider/usage.ts`
