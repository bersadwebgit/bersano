# 06 — دیتابیس و Migrations

## معماری
- DBMS: PostgreSQL (Docker image `pgvector/pgvector:pg16`). Evidence: `docker-compose.yml:2-8`
- ORM: Prisma 5.22. Evidence: `package.json`
- اتصال: `DATABASE_URL`. Evidence: `prisma/schema.prisma:5-8`
- ایزولاسیون: ستون `shop_id` / فیلد `shopId` + extension اختیاری `prisma-tenant-extension.ts`

## مدل‌ها (45)
| Model | Schema | Tenant | Status |
|-------|--------|--------|--------|
| Story | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Media | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| User | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Address | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ShopSettings | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| MenuItem | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Category | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Product | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Brand | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ProductVariant | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| CartItem | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| DiscountCode | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Order | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| OrderItem | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| HeroSlide | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Review | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Notification | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Ticket | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| TicketMessage | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| PageView | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| DownloadToken | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Otp | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| SmsLog | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| BlogCategory | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| BlogPost | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| BlogComment | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ProductSet | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ProductSetItem | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ProductNotificationRequest | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| SystemTicket | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| SystemTicketMessage | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| Package | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| SystemSetting | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ChatSession | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ChatMessage | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| WholesaleRequest | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| AiUsage | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ShopDomain | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ShopSeedProfile | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| ShopSeedJob | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| PlatformCollaborator | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| PlatformBlogCategory | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| PlatformBlogTag | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| PlatformBlogPost | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |
| PlatformBlogPostTag | `prisma/schema.prisma` | اغلب دارای `shopId` مگر پلتفرمی | confirmed |

### نکات مهم مدل‌ها (Confirmed از schema)
- `Product.title` (نه name)؛ فیلدهای عمده: `wholesalePrice`, `wholesaleTiers`, `moq`, `isWholesaleOnly`
- `SystemSetting`: key/value با `key String @id`
- `ShopSettings`: یکتا با `shopId`
- `AiUsage`: ثبت مصرف AI
- `ShopDomain`: دامنه سفارشی
- `Product.embedding` / `embeddingUpdatedAt`: RAG (Unsupported vector) — با migration RAG

Evidence: `prisma/schema.prisma` (مدل‌ها از خط ~10 به بعد)

## Migrations tracked (4)
| نام | تغییرات خلاصه | ریسک |
|-----|----------------|------|
| `20260702000000_add_telegram_settings` | تنظیمات تلگرام | پایین |
| `20260706000000_add_platform_collaborators_and_blog` | همکار پلتفرم + بلاگ پلتفرم | متوسط |
| `20260707000000_add_product_variant_sku` | SKU واریانت | پایین |
| `20260711230000_add_rag_indexes` | `pg_trgm` + `vector` + HNSW + gin title | بالا اگر extension نصب نباشد |

Evidence: `prisma/migrations/*/migration.sql` ؛ RAG: `20260711230000_add_rag_indexes/migration.sql:1-12`

## Discrepancy مهم (Confirmed)
فقط **۴** migration در git وجود دارد در حالی که schema کامل ده‌ها مدل دارد. احتمال قوی: schema اولیه با `db push` یا migrations حذف‌شده ساخته شده. **Production deploy با `migrate deploy` Alone ممکن است ناکافی باشد** مگر baseline جداگانه.

Status: confirmed-discrepancy — نیاز به تأیید اپراتور.

## Raw SQL / pgvector
- `product-embedding.ts` و `product-search.ts` از `Prisma.sql` استفاده می‌کنند.
- Index HNSW در migration RAG داخل همان فایل است (نه جدا با `prisma:no-transaction` طبق قانون AI.mdc) — **نیاز تأیید رفتار Prisma روی CONCURRENTLY/HNSW**.

Evidence: migration RAG؛ `src/lib/product-embedding.ts`؛ `src/lib/product-search.ts`
