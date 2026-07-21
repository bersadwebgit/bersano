import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { rollbackToRevision } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const revision = await prisma.marketingRevision.findUnique({
      where: { id },
      select: { pageId: true, page: { select: { slug: true } } },
    });
    if (!revision) return NextResponse.json({ error: 'نسخه یافت نشد' }, { status: 404 });

    const ok = await rollbackToRevision(id, { id: guard.admin.id, name: guard.admin.name || guard.admin.email });
    if (!ok) return NextResponse.json({ error: 'بازگردانی ناموفق بود' }, { status: 500 });

    try {
      revalidatePath('/');
      if (revision.page?.slug) revalidatePath(`/${revision.page.slug}`);
    } catch (e) {
      console.error('[marketing rollback] revalidate failed', e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing rollback POST]', error);
    return NextResponse.json({ error: 'خطا در بازگردانی نسخه' }, { status: 500 });
  }
}
