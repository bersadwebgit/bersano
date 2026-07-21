import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { promises as fs, constants } from 'fs';
import path from 'path';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { resolveAiProviderConfig } from '@/lib/ai-provider/config';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('super_admin_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET() {
  const checks: Record<string, any> = {
    database: 'UNKNOWN',
    uploads: 'UNKNOWN',
    redis: 'UNKNOWN',
  };
  let isReady = true;

  // 1. Check Database Connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'OK';
  } catch (error: any) {
    checks.database = 'FAIL';
    isReady = false;
    console.error('[CRITICAL] [ReadinessCheck] Database connection failed:', error.message);
  }

  // 2. Check Uploads Directory Writable
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    await fs.access(uploadDir, constants.W_OK);
    checks.uploads = 'OK';
  } catch (error: any) {
    checks.uploads = 'FAIL';
    isReady = false;
    console.error('[CRITICAL] [ReadinessCheck] Uploads directory is not writable:', error.message);
  }

  // 3. Check Redis Connection (Optional/Non-fatal)
  if (redis) {
    try {
      await redis.ping();
      checks.redis = 'OK';
    } catch (error: any) {
      checks.redis = 'DEGRADED';
      console.warn('[WARN] [ReadinessCheck] Redis connection degraded:', error.message);
    }
  } else {
    checks.redis = 'DISABLED';
  }

  // 4. Check AI Status (Non-fatal)
  let aiStatus: 'healthy' | 'degraded' | 'unavailable' | 'misconfigured' = 'unavailable';
  let aiDetails: any = null;

  try {
    const aiConfig = await resolveAiProviderConfig();
    if (aiConfig.mode === 'disabled') {
      aiStatus = 'unavailable';
    } else if (aiConfig.mode === 'gateway') {
      // Fast reachability check
      try {
        const res = await fetch(aiConfig.gatewayUrl!, {
          method: 'GET',
          headers: {
            'X-Gateway-Token': aiConfig.gatewayToken || '',
          },
          signal: AbortSignal.timeout(2000), // 2-second timeout
        });
        if (res.ok) {
          aiStatus = 'healthy';
        } else {
          aiStatus = 'degraded';
        }
      } catch (e) {
        aiStatus = 'degraded';
      }
    } else if (aiConfig.mode === 'direct') {
      aiStatus = 'healthy';
    }

    aiDetails = {
      mode: aiConfig.mode,
      allowDirect: aiConfig.allowDirect,
      timeoutMs: aiConfig.timeoutMs,
    };
  } catch (error: any) {
    aiStatus = 'misconfigured';
    aiDetails = {
      error: error.message || String(error),
    };
  }

  checks.ai = aiStatus;

  // Protect detailed readiness information behind superadmin authentication
  const isSuperAdmin = await verifySuperAdmin();
  const responseBody: any = {
    ready: isReady,
    timestamp: new Date().toISOString(),
    checks,
  };

  if (isSuperAdmin) {
    responseBody.aiDetails = aiDetails;
  }

  const status = isReady ? 200 : 503;

  return NextResponse.json(responseBody, { status });
}
