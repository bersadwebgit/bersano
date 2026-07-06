# Production Deployment Guide: Missing Tables Fix

This guide outlines the steps to apply the idempotent migration in production to safely create the `PlatformCollaborator` and other missing tables (or columns) without losing or resetting any of your database data.

## Deployment Steps

To deploy this fix on your production server (`https://bersana.ir`), execute the following commands in sequence:

```bash
# 1. Navigate to the project directory on the server
cd /home/shop_final

# 2. Pull the latest code changes from your repository
git pull origin main

# 3. Build and spin up the Docker container in detached mode
docker compose up -d --build

# 4. Execute the idempotent database migration safely
docker compose exec web npx prisma migrate deploy

# 5. Restart the Next.js app container to apply any environment or schema updates
docker compose restart web
```

---

## Security Warning: SMS_ENCRYPTION_KEY

Ensure that `SMS_ENCRYPTION_KEY` is configured in your production `.env` file. It must be a strong 32+ character random string to secure tenant credentials properly.

To generate a secure key, you can run:
```bash
openssl rand -base64 32
```

Add it to your production `.env`:
```env
SMS_ENCRYPTION_KEY="your-secure-32-character-key"
```
