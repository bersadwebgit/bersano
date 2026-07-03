# Platform Reliability & Server Configuration Guide

This guide documents the critical server, Nginx, and Docker configurations required to ensure high availability, robustness, and fail-safe multi-tenant operations for the `shop_final` platform.

---

## 1. Nginx Reverse Proxy Configuration

Nginx acts as the entry point for all incoming traffic. Proper proxy headers and timeouts are critical for correct tenant resolution and preventing timeouts during heavy operations (like import/export).

### Recommended Nginx Virtual Host Configuration

```nginx
# Upstream Next.js application
upstream nextjs_upstream {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    listen [::]:80;
    server_name *.bersana.ir bersana.ir;

    # Redirect all HTTP traffic to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name *.bersana.ir bersana.ir;

    # SSL Certificates (Wildcard for subdomains)
    ssl_certificate /etc/letsencrypt/live/bersana.ir/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bersana.ir/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Client Upload Limit (Must match application MAX_FILE_SIZE of 10MB)
    client_max_body_size 10M;

    # Timeouts (To support long-running admin operations like import/export)
    proxy_connect_timeout 300s;
    proxy_send_timeout    300s;
    proxy_read_timeout    300s;
    send_timeout          300s;

    # Gzip Compression
    gzip on;
    gzip_proxied any;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
    gzip_vary on;

    # Static Assets Caching (Next.js Static Files)
    location /_next/static/ {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Static Uploads (Served directly or proxied with immutable cache)
    location /uploads/ {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        expires 365d;
        add_header Cache-Control "public, max-age=31536000, immutable";
        
        # Fallback to application route if file is missing (to return transparent 1x1 PNG)
        try_files $uri @fallback;
    }

    # Main Application Proxy
    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Connection "";

        # Essential Proxy Headers for Multi-Tenant Subdomain Resolution
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # Disable caching for dynamic HTML, APIs, and Admin routes
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate";
    }

    location @fallback {
        proxy_pass http://nextjs_upstream;
    }
}
```

---

## 2. Docker Compose & Restart Policies

To guarantee high availability, all services in `docker-compose.yml` are configured with `restart: always` or `restart: unless-stopped` policies, and healthchecks are enabled to ensure dependencies are fully ready before web traffic is routed.

### Healthcheck Specifications
- **PostgreSQL:** Uses `pg_isready` to verify database availability.
- **Redis:** Uses `redis-cli ping` with authentication to verify cache availability.
- **Web Service:** Depends on `postgres` and `serverless-redis-http` being fully started and healthy before launching.

---

## 3. Server Action Mismatch & Deployment Safety

During a rolling deployment, users with active browser sessions might attempt to trigger Server Actions from an older deployment, resulting in a `Failed to find Server Action` error.

### Client-Side Auto-Recovery
The platform includes a global error listener in `src/app/layout.tsx` that automatically intercepts chunk loading errors and Server Action mismatches, triggering a full browser refresh (`window.location.reload()`) to fetch the latest build assets and action hashes.

---

## 4. Health & Diagnostics Endpoints

The platform provides dedicated health endpoints for monitoring and orchestration (e.g., Kubernetes, Docker Swarm, or Uptime Kuma).

### 4.1 Liveness Endpoint (`/api/health/liveness`)
- **Purpose:** Verifies if the Next.js application process is alive.
- **Access:** Public.
- **Response:** `200 OK`
  ```json
  { "status": "OK", "timestamp": "2026-07-04T05:45:00.000Z" }
  ```

### 4.2 Readiness Endpoint (`/api/health/readiness`)
- **Purpose:** Verifies that critical dependencies (Database, Writable Uploads storage) are fully ready to accept traffic.
- **Access:** Public.
- **Response:** `200 OK` (or `503 Service Unavailable` if any critical dependency fails)
  ```json
  {
    "ready": true,
    "timestamp": "2026-07-04T05:45:00.000Z",
    "checks": {
      "database": "OK",
      "uploads": "OK",
      "redis": "OK"
    }
  }
  ```

### 4.3 Diagnostics Endpoint (`/api/super-admin/diagnostics`)
- **Purpose:** Provides deep runtime diagnostics for platform administrators.
- **Access:** Super-admin only (requires `super_admin_token` cookie).
- **Security:** Strictly masks and hides all database credentials, JWT secrets, and API keys.
- **Response:** `200 OK`
  ```json
  {
    "database": { "status": "OK", "latencyMs": 12 },
    "redis": { "status": "OK", "latencyMs": 2 },
    "uploads": { "status": "OK", "exists": true, "isDirectory": true },
    "environment": {
      "NODE_ENV": "production",
      "NEXT_PUBLIC_APP_URL": "https://bersana.ir",
      "DATABASE_URL_CONFIGURED": true,
      "JWT_SECRET_CONFIGURED": true,
      "OPENROUTER_API_KEY_CONFIGURED": true
    },
    "appVersion": "3.0.0",
    "timestamp": "2026-07-04T05:45:00.000Z"
  }
  ```

---

## 5. Safe Rollback & Backup Strategy

### 5.1 Database Backups (PostgreSQL)
Run this command on the host machine to create a compressed database backup:
```bash
docker exec -t shop-postgres pg_dumpall -c -U ${DB_USER} | gzip > /backups/db_backup_$(date +%F).sql.gz
```

### 5.2 Uploads Directory Backups
Since the uploads directory is mounted as a persistent Docker volume (`uploads_data`), backup the volume directory directly from the host:
```bash
tar -czf /backups/uploads_backup_$(date +%F).tar.gz /var/lib/docker/volumes/shop_final_uploads_data/_data
```

### 5.3 Safe Rollback Procedure
If a deployment fails or introduces regressions:
1. **Revert Code:** Checkout the last stable git commit or tag.
2. **Rebuild Container:** Run `docker compose build web && docker compose up -d web`.
3. **No DB Impact:** Since the database schema is backward-compatible and no destructive migrations were executed, rollback will not result in any data loss or require database restoration.
