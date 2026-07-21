import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { captureRevision } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const revisions = await prisma.marketingRevision.findMany({
      where: { pageId: id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, label: true, isAutosave: true, authorName: true, createdAt: true },
    });
    return NextResponse.json(revisions);
  } catch (error) {
    console.error('[marketing revisions GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت تاریخچه' }, { status: 500 });
  }
}

/** Manual snapshot (e.g. before a risky edit). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    await captureRevision(id, {
      label: String(body.label || 'snapshot'),
      isAutosave: !!body.isAutosave,
      authorId: guard.admin.id,
      authorName: guard.admin.name || guard.admin.email,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error('[marketing revisions POST]', error);
    return NextResponse.json({ error: 'خطا در ثبت نسخه' }, { status: 500 });
  }
}
