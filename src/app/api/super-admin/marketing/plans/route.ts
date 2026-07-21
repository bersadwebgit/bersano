import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

const KEY_RE = /^[a-z0-9_-]+$/;

function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) return input.map((s) => String(s).trim()).filter(Boolean);
  if (typeof input === 'string') return input.split('\n').map((s) => s.trim()).filter(Boolean);
  return [];
}

export async function GET(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const plans = await prisma.marketingPlan.findMany({ orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] });
    return NextResponse.json(plans);
  } catch (error) {
    console.error('[marketing plans GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت پلن‌ها' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const body = await request.json();
    const planKey = String(body.key || '').trim().toLowerCase();
    const name = String(body.name || '').trim();
    if (!KEY_RE.test(planKey)) return NextResponse.json({ error: 'کلید پلن نامعتبر است' }, { status: 400 });
    if (!name) return NextResponse.json({ error: 'نام پلن الزامی است' }, { status: 400 });

    const existing = await prisma.marketingPlan.findUnique({ where: { key: planKey } });
    if (existing) return NextResponse.json({ error: 'پلنی با این کلید وجود دارد' }, { status: 409 });

    const plan = await prisma.marketingPlan.create({
      data: {
        key: planKey,
        name,
        description: body.description ? String(body.description) : null,
        audience: body.audience ? String(body.audience) : null,
        priceLabel: String(body.priceLabel || ''),
        period: String(body.period || ''),
        annualPriceLabel: String(body.annualPriceLabel || ''),
        badge: body.badge ? String(body.badge) : null,
        ctaText: String(body.ctaText || 'شروع کنید'),
        ctaLink: String(body.ctaLink || '/register'),
        features: normalizeFeatures(body.features),
        highlighted: !!body.highlighted,
        isActive: body.isActive !== false,
        order: Number(body.order) || 0,
        packageId: body.packageId ? String(body.packageId) : null,
      },
    });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'create',
      entity: 'plan',
      entityId: plan.id,
      meta: { key: planKey },
    });

    try { revalidatePath('/pricing'); revalidatePath('/'); } catch {}

    return NextResponse.json(plan, { status: 201 });
  } catch (error) {
    console.error('[marketing plans POST]', error);
    return NextResponse.json({ error: 'خطا در ایجاد پلن' }, { status: 500 });
  }
}
