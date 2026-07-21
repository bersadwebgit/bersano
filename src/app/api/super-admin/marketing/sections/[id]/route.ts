import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';
import { sanitizeHtml } from '@/lib/sanitize-html';

export const dynamic = 'force-dynamic';

/** Sanitize any known rich-text HTML fields inside a section's content. */
function sanitizeContent(type: string, content: Record<string, any>): Record<string, any> {
  if (!content || typeof content !== 'object') return {};
  const clone: Record<string, any> = { ...content };
  if (type === 'richText' && typeof clone.html === 'string') {
    clone.html = sanitizeHtml(clone.html);
  }
  return clone;
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const existing = await prisma.marketingSection.findUnique({ where: { id }, select: { id: true, type: true, pageId: true } });
    if (!existing) return NextResponse.json({ error: 'بخش یافت نشد' }, { status: 404 });

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.enabled !== undefined) data.enabled = !!body.enabled;
    if (body.themeVariant !== undefined && ['surface', 'muted', 'inverse'].includes(body.themeVariant)) {
      data.themeVariant = body.themeVariant;
    }
    if (body.visibility !== undefined && ['all', 'desktop', 'mobile'].includes(body.visibility)) {
      data.visibility = body.visibility;
    }
    if (body.anchorId !== undefined) data.anchorId = body.anchorId ? String(body.anchorId).trim() : null;
    if (body.content !== undefined && typeof body.content === 'object') {
      data.content = sanitizeContent(existing.type, body.content);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'داده‌ای برای به‌روزرسانی ارسال نشده' }, { status: 400 });
    }

    const section = await prisma.marketingSection.update({ where: { id }, data });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'update',
      entity: 'section',
      entityId: id,
      meta: { pageId: existing.pageId, fields: Object.keys(data) },
    });

    return NextResponse.json(section);
  } catch (error) {
    console.error('[marketing section PATCH]', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی بخش' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const existing = await prisma.marketingSection.findUnique({ where: { id }, select: { pageId: true } });
    if (!existing) return NextResponse.json({ error: 'بخش یافت نشد' }, { status: 404 });

    await prisma.marketingSection.delete({ where: { id } });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'delete',
      entity: 'section',
      entityId: id,
      meta: { pageId: existing.pageId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing section DELETE]', error);
    return NextResponse.json({ error: 'خطا در حذف بخش' }, { status: 500 });
  }
}
