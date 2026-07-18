# 15 — استقرار و عملیات

## محیط توسعه محلی (Confirmed در مسیر)
- Windows + XAMPP path (`C:\xampp\htdocs\shop_final`) — PHP gateway می‌تواند جدا میزبانی شود
- `npm run dev` برای Next
Evidence: workspace path؛ package.json scripts

## Docker production-oriented
Services: postgres (pgvector:pg16), redis:7-alpine, serverless-redis-http, web, bale-bot, telegram-bot
- پورت DB/Redis عمداً publish نشده
- web فقط `127.0.0.1:3000:3000`
Evidence: `docker-compose.yml`

## Dockerfile
Multi-stage: deps → builder (`prisma generate`, `npm run build`) → runner standalone + entrypoint
Evidence: `Dockerfile:1-76`

## Entrypoint / migrations
`docker-entrypoint.sh` (مهاجرت در استارت — جزئیات را از فایل بخوانید در عملیات)
Evidence: Dockerfile ENTRYPOINT

## PHP AI Gateway
`deploy/ai-gateway/` جدا از container web؛ روی هاست خارجی (مثال URL در .env.example بدون secret واقعی)
Evidence: `.env.example` AI_GATEWAY_URL؛ deploy/ai-gateway

## Runbooks (بر اساس repo — نه فرض سرور)

### نصب تمیز
1. کپی `.env.example` → `.env` و پر کردن `[REDACTED]`ها
2. اطمینان از نصب pgvector روی DB (image رسمی compose آن را دارد)
3. `docker compose up -d --build`
4. تأیید health postgres/redis/web
5. تنظیم SystemSettingهای AI/SMS از سوپرادمین
6. استقرار PHP gateway + `private/ai-config.php`

### به‌روزرسانی روتین
1. backup DB volume
2. pull/build image جدید
3. `prisma migrate deploy` via entrypoint
4. smoke: login admin، یک API، gateway test

### Migration
- توجه: فقط ۴ migration tracked — قبل از production، baseline را تأیید کنید (20-UNVERIFIED)

### Rollback
- image قبلی + volume DB قبلی؛ migration برگشتی خودکار در repo تعریف نشده

### Disaster recovery (outline)
- backup منظم `postgres_data` و `uploads_data`
- بازسازی compose + restore volumes
- چرخش secrets

### Health checklist
- [ ] `GET` AI gateway health
- [ ] web `:3000` پاسخ
- [ ] postgres `pg_isready`
- [ ] redis ping via SRH
- [ ] super-admin login
- [ ] tenant subdomain resolves

### Post-deploy verification
- [ ] ساخت/ویرایش محصول
- [ ] یک پرداخت sandbox (اگر فعال)
- [ ] OTP SMS
- [ ] AI canonical + (آگاهانه) legacy paths
- [ ] upload تصویر

## خارج از repo (Unverified)
TLS، nginx کامل، DNS wildcard، فایروال، backup خودکار سرور.
