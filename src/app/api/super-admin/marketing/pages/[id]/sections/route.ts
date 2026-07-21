import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

const ALLOWED_TYPES = [
  'hero', 'featureGrid', 'pricing', 'comparison', 'faq', 'cta', 'trustBar', 'richText', 'stats', 'steps', 'logos',
];

/** Add a new section to a page (appended to the end). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id: pageId } = await params;

  try {
    const body = await request.json();
    const type = String(body.type || '').trim();
    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json({ error: 'نوع بخش نامعتبر است' }, { status: 400 });
    }

    const page = await prisma.marketingPage.findUnique({ where: { id: pageId }, select: { id: true } });
    if (!page) return NextResponse.json({ error: 'صفحه یافت نشد' }, { status: 404 });

    const last = await prisma.marketingSection.findFirst({
      where: { pageId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (last?.order ?? -1) + 1;

    const section = await prisma.marketingSection.create({
      data: {
        pageId,
        type,
        order: nextOrder,
        content: body.content && typeof body.content === 'object' ? body.content : {},
        themeVariant: ['surface', 'muted', 'inverse'].includes(body.themeVariant) ? body.themeVariant : 'surface',
        anchorId: body.anchorId ? String(body.anchorId).trim() : null,
        visibility: ['all', 'desktop', 'mobile'].includes(body.visibility) ? body.visibility : 'all',
      },
    });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'create',
      entity: 'section',
      entityId: section.id,
      meta: { pageId, type },
    });

    return NextResponse.json(section, { status: 201 });
  } catch (error) {
    console.error('[marketing sections POST]', error);
    return NextResponse.json({ error: 'خطا در افزودن بخش' }, { status: 500 });
  }
}

/** Reorder sections: body = { order: [sectionId, ...] } in the desired order. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id: pageId } = await params;

  try {
    const body = await request.json();
    const orderIds: string[] = Array.isArray(body.order) ? body.order : [];
    if (orderIds.length === 0) {
      return NextResponse.json({ error: 'ترتیب نامعتبر است' }, { status: 400 });
    }

    const sections = await prisma.marketingSection.findMany({
      where: { pageId },
      select: { id: true },
    });
    const validIds = new Set(sections.map((s) => s.id));
    if (!orderIds.every((oid) => validIds.has(oid))) {
      return NextResponse.json({ error: 'شناسه بخش نامعتبر است' }, { status: 400 });
    }

    await prisma.$transaction(
      orderIds.map((sid, idx) =>
        prisma.marketingSection.update({ where: { id: sid }, data: { order: idx } }),
      ),
    );

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'update',
      entity: 'section',
      meta: { pageId, action: 'reorder' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing sections PATCH reorder]', error);
    return NextResponse.json({ error: 'خطا در تغییر ترتیب بخش‌ها' }, { status: 500 });
  }
}
