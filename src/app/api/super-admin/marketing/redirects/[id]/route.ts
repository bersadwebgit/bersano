import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.enabled !== undefined) data.enabled = !!body.enabled;
    if (body.toPath !== undefined) {
      const toPath = String(body.toPath).trim();
      if (!toPath) return NextResponse.json({ error: 'مقصد نامعتبر است' }, { status: 400 });
      data.toPath = toPath;
    }
    if (body.statusCode !== undefined) {
      const sc = Number(body.statusCode);
      if (![301, 302, 307, 308].includes(sc)) return NextResponse.json({ error: 'کد وضعیت نامعتبر است' }, { status: 400 });
      data.statusCode = sc;
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'داده‌ای برای به‌روزرسانی نیست' }, { status: 400 });
    }

    const redirect = await prisma.marketingRedirect.update({ where: { id }, data });
    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'update',
      entity: 'redirect',
      entityId: id,
    });
    return NextResponse.json(redirect);
  } catch (error) {
    console.error('[marketing redirect PATCH]', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی ریدایرکت' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;
  try {
    await prisma.marketingRedirect.delete({ where: { id } });
    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'delete',
      entity: 'redirect',
      entityId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing redirect DELETE]', error);
    return NextResponse.json({ error: 'خطا در حذف ریدایرکت' }, { status: 500 });
  }
}
