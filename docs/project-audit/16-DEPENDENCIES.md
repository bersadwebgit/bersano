# 16 — وابستگی‌ها

منبع: `package.json` / lock / Docker images. بدون ارتقا در این ممیزی.

## Runtime مهم
| Package | Version | Purpose | Active? |
|---------|---------|---------|---------|
| next | 16.2.6 | App framework | Yes |
| react / react-dom | 19.2.4 | UI | Yes |
| @prisma/client + prisma | ^5.22.0 | ORM | Yes |
| jose | ^6.2.3 | JWT | Yes |
| @upstash/redis | ^1.38.0 | Cache client | Yes |
| bcryptjs | ^3.0.3 | Password hashes | Yes |
| sharp | ^0.34.5 | Images | Yes |
| melipayamak | ^1.0.5 | SMS SDK | Yes |
| isomorphic-dompurify | ^3.18.0 | Sanitize | Yes |
| zustand | ^5.0.13 | Client state | Yes |
| lucide-react | ^1.16.0 | Icons | Yes |
| embla-carousel-* | ^8.6.0 | Carousel | Yes |
| xlsx | ^0.18.5 | Excel import/export | Yes |
| three | ^0.184.0 | 3D (marketing/demo?) | Referenced — usage depth Partial |

## Dev
eslint 9, eslint-config-next 16.2.6, typescript ^5, tailwindcss ^4, types/*

## Docker images
- `pgvector/pgvector:pg16`
- `redis:7-alpine`
- `hiett/serverless-redis-http:latest`
- `node:20-alpine` (build)
- app image `shop-web:latest`

## PHP gateway
نیازمند PHP + curl روی هاست gateway؛ وابستگی composer در repo دیده نشد (single PHP file).

## نکات
- NextAuth در `.env.example` آمده ولی پکیج `next-auth` در dependencies نیست → احتمالاً legacy naming
- xlsx سابقه امنیتی دارد؛ فقط در import/export قابل اعتماد ادمین استفاده شود
Evidence: `package.json`؛ `.env.example`
