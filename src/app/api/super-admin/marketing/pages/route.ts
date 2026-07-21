import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;

  try {
    const pages = await prisma.marketingPage.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { _count: { select: { sections: true, revisions: true } } },
    });
    return NextResponse.json(pages);
  } catch (error) {
    console.error('[marketing/pages GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت صفحات' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;

  try {
    const body = await request.json();
    const slug = String(body.slug || '').trim().toLowerCase();
    const title = String(body.title || '').trim();

    if (!title) return NextResponse.json({ error: 'عنوان الزامی است' }, { status: 400 });
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json({ error: 'اسلاگ نامعتبر است (فقط حروف کوچک انگلیسی، عدد و خط تیره)' }, { status: 400 });
    }

    const existing = await prisma.marketingPage.findUnique({ where: { slug } });
    if (existing) return NextResponse.json({ error: 'صفحه‌ای با این اسلاگ وجود دارد' }, { status: 409 });

    const page = await prisma.marketingPage.create({
      data: { slug, title, status: 'draft' },
    });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'create',
      entity: 'page',
      entityId: page.id,
      meta: { slug, title },
    });

    return NextResponse.json(page, { status: 201 });
  } catch (error) {
    console.error('[marketing/pages POST]', error);
    return NextResponse.json({ error: 'خطا در ایجاد صفحه' }, { status: 500 });
  }
}
