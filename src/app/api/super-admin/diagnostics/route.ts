import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET() {
  // 1. Verify Super Admin Auth
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const diagnostics: Record<string, any> = {
    database: { status: 'UNKNOWN' },
    redis: { status: 'UNKNOWN' },
    uploads: { status: 'UNKNOWN' },
    environment: {},
    appVersion: '3.0.0',
    timestamp: new Date().toISOString(),
  };

  // 2. Database Diagnostics
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1`;
    const elapsed = performance.now() - start;
    diagnostics.database = {
      status: 'OK',
      latencyMs: Math.round(elapsed),
    };
  } catch (error: any) {
    diagnostics.database = {
      status: 'FAIL',
      error: error.message,
    };
  }

  // 3. Redis Diagnostics
  if (redis) {
    try {
      const start = performance.now();
      await redis.ping();
      const elapsed = performance.now() - start;
      diagnostics.redis = {
        status: 'OK',
        latencyMs: Math.round(elapsed),
      };
    } catch (error: any) {
      diagnostics.redis = {
        status: 'FAIL',
        error: error.message,
      };
    }
  } else {
    diagnostics.redis = {
      status: 'DISABLED',
    };
  }

  // 4. Uploads Directory Diagnostics
  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    const stats = await fs.stat(uploadDir);
    diagnostics.uploads = {
      status: 'OK',
      exists: true,
      isDirectory: stats.isDirectory(),
    };
  } catch (error: any) {
    diagnostics.uploads = {
      status: 'FAIL',
      error: error.message,
    };
  }

  // 5. Safe Environment Variables (Hiding all secrets!)
  const safeEnvKeys = [
    'NODE_ENV',
    'NEXT_PUBLIC_APP_URL',
    'PORT',
    'TZ',
  ];
  
  for (const envKey of safeEnvKeys) {
    diagnostics.environment[envKey] = process.env[envKey] || 'NOT_SET';
  }

  // Add masked/boolean status for critical variables without exposing their values
  diagnostics.environment.DATABASE_URL_CONFIGURED = !!process.env.DATABASE_URL;
  diagnostics.environment.JWT_SECRET_CONFIGURED = !!process.env.JWT_SECRET;
  diagnostics.environment.OPENROUTER_API_KEY_CONFIGURED = !!process.env.OPENROUTER_API_KEY;

  return NextResponse.json(diagnostics);
}
