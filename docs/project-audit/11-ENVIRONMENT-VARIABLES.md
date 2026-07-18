# 11 — متغیرهای محیطی

**قانون:** مقادیر واقعی هرگز چاپ نمی‌شوند؛ همه `[REDACTED]`.

## ماتریس (34)
| Name | Secret? | Example | Sources |
|------|---------|---------|---------|
| `AI_ALLOW_DIRECT_OPENROUTER` | non-secret | [REDACTED] | see code/docker/.env.example |
| `AI_GATEWAY_TIMEOUT_MS` | non-secret | [REDACTED] | see code/docker/.env.example |
| `AI_GATEWAY_TOKEN` | secret | [REDACTED] | see code/docker/.env.example |
| `AI_GATEWAY_URL` | non-secret | [REDACTED] | see code/docker/.env.example |
| `CENTRAL_BALE_BOT_API_KEY` | secret | [REDACTED] | see code/docker/.env.example |
| `CENTRAL_TELEGRAM_BOT_API_KEY` | secret | [REDACTED] | see code/docker/.env.example |
| `DATABASE_URL` | non-secret | [REDACTED] | see code/docker/.env.example |
| `DB_PASSWORD` | secret | [REDACTED] | see code/docker/.env.example |
| `DB_USER` | non-secret | [REDACTED] | see code/docker/.env.example |
| `DISABLE_AUTO_BALE_BOT` | non-secret | [REDACTED] | see code/docker/.env.example |
| `DISABLE_AUTO_TELEGRAM_BOT` | non-secret | [REDACTED] | see code/docker/.env.example |
| `ENABLE_CACHE_LOGS` | non-secret | [REDACTED] | see code/docker/.env.example |
| `ENABLE_PERF_LOGS` | non-secret | [REDACTED] | see code/docker/.env.example |
| `JWT_SECRET` | secret | [REDACTED] | see code/docker/.env.example |
| `MELIPAYAMAK_PASSWORD` | secret | [REDACTED] | see code/docker/.env.example |
| `MELIPAYAMAK_PATTERN_CODE` | non-secret | [REDACTED] | see code/docker/.env.example |
| `MELIPAYAMAK_USERNAME` | non-secret | [REDACTED] | see code/docker/.env.example |
| `NEXTAUTH_SECRET` | secret | [REDACTED] | see code/docker/.env.example |
| `NEXTAUTH_URL` | non-secret | [REDACTED] | see code/docker/.env.example |
| `NODE_ENV` | non-secret | [REDACTED] | see code/docker/.env.example |
| `OPENROUTER_API_KEY` | secret | [REDACTED] | see code/docker/.env.example |
| `OTP_HASH_SECRET` | secret | [REDACTED] | see code/docker/.env.example |
| `PEXELS_API_KEY` | secret | [REDACTED] | see code/docker/.env.example |
| `POSTGRES_DB` | non-secret | [REDACTED] | see code/docker/.env.example |
| `POSTGRES_PASSWORD` | secret | [REDACTED] | see code/docker/.env.example |
| `POSTGRES_USER` | non-secret | [REDACTED] | see code/docker/.env.example |
| `REDIS_PASSWORD` | secret | [REDACTED] | see code/docker/.env.example |
| `SMS_ENCRYPTION_KEY` | secret | [REDACTED] | see code/docker/.env.example |
| `SRH_CONNECTION_STRING` | non-secret | [REDACTED] | see code/docker/.env.example |
| `SRH_MODE` | non-secret | [REDACTED] | see code/docker/.env.example |
| `SRH_TOKEN` | secret | [REDACTED] | see code/docker/.env.example |
| `SUPER_ADMIN_SECRET` | secret | [REDACTED] | see code/docker/.env.example |
| `UPSTASH_REDIS_REST_TOKEN` | secret | [REDACTED] | see code/docker/.env.example |
| `UPSTASH_REDIS_REST_URL` | non-secret | [REDACTED] | see code/docker/.env.example |

فایل ماشین‌خوان: [ENV-MATRIX.csv](./ENV-MATRIX.csv)

## مقایسه .env.example vs runtime
.env.example شامل: DB_USER, DB_PASSWORD, REDIS_PASSWORD, SRH_TOKEN, NEXTAUTH_*, OPENROUTER_API_KEY, PEXELS_API_KEY, SUPER_ADMIN_SECRET, MELIPAYAMAK_*, SMS_ENCRYPTION_KEY, AI_GATEWAY_*

کد همچنین `JWT_SECRET`, `OTP_HASH_SECRET`, `UPSTASH_REDIS_*`, `DATABASE_URL`, `DISABLE_AUTO_*_BOT`, `ENABLE_*_LOGS` را می‌خواند.

**Inconsistency confirmed:** `NEXTAUTH_SECRET` در example هست اما auth پروژه مبتنی بر jose/JWT_SECRET است (NextAuth به‌عنوان dependency اصلی دیده نشد در package.json). Status: legacy/unused-likely.

Evidence: `.env.example`؛ `package.json`؛ `src/lib/auth.ts:6`

## Docker propagation
`docker-compose.yml` برای web: DATABASE_URL, UPSTASH_*, AI_GATEWAY_*, DISABLE_AUTO_*_BOT
JWT_SECRET و SMS_ENCRYPTION_KEY در compose صریحاً لیست نشده‌اند → باید از env_file/host بیایند یا خطر fallback.
Evidence: `docker-compose.yml:61-70`
