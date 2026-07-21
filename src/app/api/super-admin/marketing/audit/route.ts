import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const logs = await prisma.marketingAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return NextResponse.json(logs);
  } catch (error) {
    console.error('[marketing audit GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت گزارش فعالیت' }, { status: 500 });
  }
}
