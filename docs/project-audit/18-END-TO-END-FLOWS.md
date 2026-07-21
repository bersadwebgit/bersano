# 18 — جریان‌های End-to-End

برای هر سفر: UI → API → Auth → DB → خارجی. Failure paths خلاصه.

## 1) ثبت‌نام تاجر
UI register → API auth/register → ایجاد User+ShopSettings → redirect admin  
Auth: guest → admin_token  
Evidence: auth pages؛ User/ShopSettings models

## 2) OTP
UI login OTP → API OTP send/verify → `Otp` + SMS Melipayamak → JWT cookie  
Evidence: `Otp` model؛ `sms.ts`؛ rate-limiter

## 3–4) ساخت فروشگاه / AI seed
Admin setup → seed APIs / ShopSeedJob → store-seed libs → محصولات/محتوا  
Evidence: `src/lib/ai/store-seed/*`؛ ShopSeedJob

## 5) Admin login
`/admin/login` → JWT `admin_token` → middleware RBAC  
Evidence: middleware.ts:73-118

## 6–8) محصول + AI generation + embedding
Admin products UI → CRUD API (shopId) → optional AI routes (canonical product AI یا legacy ai-control) → mark dirty / `embedProduct`  
Evidence: product routes؛ product-embedding.ts؛ 09

## 9) Product search RAG
Prompt/search → `searchProducts` → embedding query → SQL cosine+trgm scoped shop_id  
Evidence: product-search.ts؛ migration RAG

## 10–12) Browse / cart / checkout
Storefront host tenant → product pages → cart APIs → `/checkout` (customer_token)  
Evidence: middleware checkout؛ CartItem

## 13–15) Payment / order
Checkout → payment provider request → callback verify → Order status → admin orders  
Evidence: zarinpal/zibal/digipay URLs؛ Order model

## 16–17) Profile / support ticket
`/profile` → Address APIs؛ tickets create/message  
Evidence: middleware profile؛ Ticket models

## 18) Wholesale request
UI wholesale → `WholesaleRequest` create → admin review  
Evidence: WholesaleRequest model؛ wholesale.ts

## 19–20) Blog / story-slider
Admin blog/stories/slider → CRUD + AI-control (اغلب legacy OR)  
Evidence: Blog*/Story/HeroSlide؛ ai-control routes

## 21–22) Super-admin config / Gateway enable
`/super-admin` → settings API upsert SystemSetting → `ai_gateway_enabled` + env AI_GATEWAY_* → test-gateway  
Evidence: super-admin settings route؛ test-gateway؛ config.ts

## 23–24) AI chat / gateway embedding
Customer chat API یا admin tools → canonical client → gateway → provider؛ embeddings via executeEmbedding  
Evidence: chat message route؛ product-embedding؛ gateway PHP

## 25) Domain connection
Admin/super domain UI → ShopDomain row → tenant resolve by host  
Evidence: ShopDomain؛ tenant.ts

## 26) Package/quota
Package limits on ShopSettings → checkShopQuota before AI → AiUsage log  
Evidence: usage.ts؛ Package model

### Failure paths مشترک
- 401/403 auth
- tenant mismatch در verifyAuth
- AI disabled / gateway misconfig
- SMS credential missing
- payment verify fail
- embedding config null → silent skip (Confirmed design در embedding)
