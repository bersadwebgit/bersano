import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit, captureRevision } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

/** Validate that a string is parseable JSON (for raw JSON-LD). Returns null when empty. */
function validateStructuredData(raw: unknown): string | null | undefined {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  const str = String(raw).trim();
  if (!str) return null;
  try {
    JSON.parse(str);
  } catch {
    throw new Error('داده ساختاریافته (JSON-LD) معتبر نیست');
  }
  return str;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const page = await prisma.marketingPage.findUnique({
      where: { id },
      include: {
        sections: { orderBy: { order: 'asc' } },
        revisions: {
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: { id: true, label: true, isAutosave: true, authorName: true, createdAt: true },
        },
      },
    });
    if (!page) return NextResponse.json({ error: 'صفحه یافت نشد' }, { status: 404 });
    return NextResponse.json(page);
  } catch (error) {
    console.error('[marketing/pages/:id GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت صفحه' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (body.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) return NextResponse.json({ error: 'عنوان نمی‌تواند خالی باشد' }, { status: 400 });
      data.title = title;
    }
    if (body.metaTitle !== undefined) data.metaTitle = String(body.metaTitle || '').trim() || null;
    if (body.metaDesc !== undefined) data.metaDesc = String(body.metaDesc || '').trim() || null;
    if (body.canonicalUrl !== undefined) data.canonicalUrl = String(body.canonicalUrl || '').trim() || null;
    if (body.ogImage !== undefined) data.ogImage = String(body.ogImage || '').trim() || null;
    if (body.noindex !== undefined) data.noindex = !!body.noindex;
    if (body.structuredData !== undefined) {
      try {
        data.structuredData = validateStructuredData(body.structuredData);
      } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 400 });
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'داده‌ای برای به‌روزرسانی ارسال نشده' }, { status: 400 });
    }

    // Snapshot current state before editing SEO/meta so it can be rolled back.
    await captureRevision(id, { label: 'autosave', isAutosave: true, authorId: guard.admin.id, authorName: guard.admin.name || guard.admin.email });

    const page = await prisma.marketingPage.update({ where: { id }, data });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'update',
      entity: 'page',
      entityId: id,
      meta: { fields: Object.keys(data) },
    });

    return NextResponse.json(page);
  } catch (error) {
    console.error('[marketing/pages/:id PATCH]', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی صفحه' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const page = await prisma.marketingPage.findUnique({ where: { id }, select: { slug: true } });
    if (!page) return NextResponse.json({ error: 'صفحه یافت نشد' }, { status: 404 });

    await prisma.marketingPage.delete({ where: { id } });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'delete',
      entity: 'page',
      entityId: id,
      meta: { slug: page.slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing/pages/:id DELETE]', error);
    return NextResponse.json({ error: 'خطا در حذف صفحه' }, { status: 500 });
  }
}
