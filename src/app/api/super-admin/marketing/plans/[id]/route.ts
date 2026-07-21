import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split('\n').map((s) => s.trim()).filter(Boolean);
  return [];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: 'نام نمی‌تواند خالی باشد' }, { status: 400 });
      data.name = name;
    }
    if (body.description !== undefined) data.description = body.description ? String(body.description) : null;
    if (body.audience !== undefined) data.audience = body.audience ? String(body.audience) : null;
    if (body.priceLabel !== undefined) data.priceLabel = String(body.priceLabel || '');
    if (body.period !== undefined) data.period = String(body.period || '');
    if (body.annualPriceLabel !== undefined) data.annualPriceLabel = String(body.annualPriceLabel || '');
    if (body.badge !== undefined) data.badge = body.badge ? String(body.badge) : null;
    if (body.ctaText !== undefined) data.ctaText = String(body.ctaText || 'شروع کنید');
    if (body.ctaLink !== undefined) data.ctaLink = String(body.ctaLink || '/register');
    if (body.features !== undefined) data.features = normalizeFeatures(body.features);
    if (body.highlighted !== undefined) data.highlighted = !!body.highlighted;
    if (body.isActive !== undefined) data.isActive = !!body.isActive;
    if (body.order !== undefined) data.order = Number(body.order) || 0;
    if (body.packageId !== undefined) data.packageId = body.packageId ? String(body.packageId) : null;

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'داده‌ای برای به‌روزرسانی نیست' }, { status: 400 });
    }

    const plan = await prisma.marketingPlan.update({ where: { id }, data });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'update',
      entity: 'plan',
      entityId: id,
      meta: { fields: Object.keys(data) },
    });

    try { revalidatePath('/pricing'); revalidatePath('/'); } catch {}

    return NextResponse.json(plan);
  } catch (error) {
    console.error('[marketing plan PATCH]', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی پلن' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;
  try {
    await prisma.marketingPlan.delete({ where: { id } });
    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'delete',
      entity: 'plan',
      entityId: id,
    });
    try { revalidatePath('/pricing'); revalidatePath('/'); } catch {}
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing plan DELETE]', error);
    return NextResponse.json({ error: 'خطا در حذف پلن' }, { status: 500 });
  }
}
