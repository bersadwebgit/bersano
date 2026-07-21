import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  const { id } = await params;
  try {
    await prisma.mediaAsset.delete({ where: { id } });
    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'delete',
      entity: 'media',
      entityId: id,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[marketing media DELETE]', error);
    return NextResponse.json({ error: 'خطا در حذف رسانه' }, { status: 500 });
  }
}
