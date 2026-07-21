import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

const PATH_RE = /^\/[^\s]*$/;

export async function GET(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const redirects = await prisma.marketingRedirect.findMany({ orderBy: { createdAt: 'desc' } });
    return NextResponse.json(redirects);
  } catch (error) {
    console.error('[marketing redirects GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت ریدایرکت‌ها' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const body = await request.json();
    const fromPath = String(body.fromPath || '').trim();
    const toPath = String(body.toPath || '').trim();
    const statusCode = Number(body.statusCode) || 301;

    if (!PATH_RE.test(fromPath)) return NextResponse.json({ error: 'مسیر مبدأ باید با / شروع شود' }, { status: 400 });
    if (!toPath || (!PATH_RE.test(toPath) && !/^https?:\/\//.test(toPath))) {
      return NextResponse.json({ error: 'مسیر مقصد نامعتبر است' }, { status: 400 });
    }
    if (![301, 302, 307, 308].includes(statusCode)) {
      return NextResponse.json({ error: 'کد وضعیت نامعتبر است' }, { status: 400 });
    }
    if (fromPath === toPath) return NextResponse.json({ error: 'مبدأ و مقصد نباید یکسان باشند' }, { status: 400 });

    const existing = await prisma.marketingRedirect.findUnique({ where: { fromPath } });
    if (existing) return NextResponse.json({ error: 'ریدایرکتی برای این مسیر وجود دارد' }, { status: 409 });

    const redirect = await prisma.marketingRedirect.create({
      data: { fromPath, toPath, statusCode, enabled: body.enabled !== false },
    });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'create',
      entity: 'redirect',
      entityId: redirect.id,
      meta: { fromPath, toPath, statusCode },
    });

    return NextResponse.json(redirect, { status: 201 });
  } catch (error) {
    console.error('[marketing redirects POST]', error);
    return NextResponse.json({ error: 'خطا در ایجاد ریدایرکت' }, { status: 500 });
  }
}
