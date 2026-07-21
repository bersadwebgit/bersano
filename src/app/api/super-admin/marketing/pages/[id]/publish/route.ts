import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit, captureRevision } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

/**
 * Publish workflow.
 * body.action: 'publish' | 'schedule' | 'unpublish' | 'archive'
 * body.scheduledAt (ISO) required for 'schedule'.
 * Captures a labeled revision and revalidates public paths on state change.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const page = await prisma.marketingPage.findUnique({ where: { id }, select: { id: true, slug: true } });
    if (!page) return NextResponse.json({ error: 'صفحه یافت نشد' }, { status: 404 });

    const body = await request.json();
    const action = String(body.action || '');
    const data: Record<string, unknown> = {};

    if (action === 'publish') {
      data.status = 'published';
      data.publishedAt = new Date();
      data.scheduledAt = null;
    } else if (action === 'schedule') {
      const when = new Date(body.scheduledAt);
      if (isNaN(when.getTime()) || when.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'زمان انتشار باید در آینده باشد' }, { status: 400 });
      }
      data.status = 'scheduled';
      data.scheduledAt = when;
      data.publishedAt = when;
    } else if (action === 'unpublish') {
      data.status = 'draft';
      data.publishedAt = null;
      data.scheduledAt = null;
    } else if (action === 'archive') {
      data.status = 'archived';
    } else {
      return NextResponse.json({ error: 'عملیات نامعتبر است' }, { status: 400 });
    }

    // Snapshot the exact state being published/changed.
    await captureRevision(id, {
      label: action,
      authorId: guard.admin.id,
      authorName: guard.admin.name || guard.admin.email,
    });

    const updated = await prisma.marketingPage.update({ where: { id }, data });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: action === 'schedule' ? 'schedule' : 'publish',
      entity: 'page',
      entityId: id,
      meta: { slug: page.slug, action },
    });

    // Best-effort cache revalidation for public surfaces.
    try {
      revalidatePath('/');
      revalidatePath(`/${page.slug}`);
      revalidatePath('/sitemap.xml');
    } catch (e) {
      console.error('[marketing publish] revalidate failed', e);
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[marketing publish POST]', error);
    return NextResponse.json({ error: 'خطا در انتشار صفحه' }, { status: 500 });
  }
}
