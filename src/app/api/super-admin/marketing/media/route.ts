import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardSuperAdmin } from '@/lib/super-admin-auth';
import { logMarketingAudit } from '@/lib/marketing-pages';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const media = await prisma.mediaAsset.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return NextResponse.json(media);
  } catch (error) {
    console.error('[marketing media GET]', error);
    return NextResponse.json({ error: 'خطا در دریافت رسانه‌ها' }, { status: 500 });
  }
}

/** Register a media asset by URL (platform media library, distinct from per-shop Media). */
export async function POST(request: Request) {
  const guard = await guardSuperAdmin(request);
  if ('response' in guard) return guard.response;
  try {
    const body = await request.json();
    const url = String(body.url || '').trim();
    const name = String(body.name || '').trim();
    if (!/^(https?:\/\/|\/)/.test(url)) {
      return NextResponse.json({ error: 'آدرس رسانه باید با http(s) یا / شروع شود' }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: 'نام رسانه الزامی است' }, { status: 400 });

    const asset = await prisma.mediaAsset.create({
      data: {
        url,
        name,
        type: body.type === 'video' ? 'video' : 'image',
        alt: body.alt ? String(body.alt).trim() : null,
        width: body.width ? Number(body.width) : null,
        height: body.height ? Number(body.height) : null,
        mime: body.mime ? String(body.mime) : null,
        uploadedBy: guard.admin.name || guard.admin.email || guard.admin.id,
      },
    });

    await logMarketingAudit({
      actorId: guard.admin.id,
      actorName: guard.admin.name || guard.admin.email,
      action: 'create',
      entity: 'media',
      entityId: asset.id,
      meta: { url },
    });

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    console.error('[marketing media POST]', error);
    return NextResponse.json({ error: 'خطا در ثبت رسانه' }, { status: 500 });
  }
}
