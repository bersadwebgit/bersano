import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { promises as fs, constants } from 'fs';
import path from 'path';

export async function GET() {
  const checks: Record<string, any> = {
    database: 'UNKNOWN',
    uploads: 'UNKNOWN',
    redis: 'UNKNOWN',
  };
  let isReady = true;

  // 1. Check Database Connection
  try {
    // Run a fast, lightweight raw query
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
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    // Check write access
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
      // Try a fast ping or simple get
      await redis.ping();
      checks.redis = 'OK';
    } catch (error: any) {
      checks.redis = 'DEGRADED';
      console.warn('[WARN] [ReadinessCheck] Redis connection degraded (falling back to database):', error.message);
    }
  } else {
    checks.redis = 'DISABLED';
  }

  const status = isReady ? 200 : 503;

  return NextResponse.json(
    {
      ready: isReady,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status }
  );
}
