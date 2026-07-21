import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { createPreviewToken } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

/** Issue a short-lived preview token and return the preview URL. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const page = await prisma.marketingPage.findUnique({ where: { id }, select: { slug: true } });
    if (!page) return NextResponse.json({ error: 'صفحه یافت نشد' }, { status: 404 });

    const ttl = 30;
    const token = await createPreviewToken(page.slug, ttl);
    const url = `/preview/${encodeURIComponent(page.slug)}?token=${encodeURIComponent(token)}`;

    return NextResponse.json({ url, slug: page.slug, expiresInMinutes: ttl });
  } catch (error) {
    console.error('[marketing preview POST]', error);
    return NextResponse.json({ error: 'خطا در ساخت لینک پیش‌نمایش' }, { status: 500 });
  }
}
