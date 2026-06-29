import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;

    const body = await request.json();
    const { mediaId } = body;

    if (!mediaId) {
      return NextResponse.json({ error: 'لطفا تصویر مورد نظر را انتخاب کنید.' }, { status: 400 });
    }

    // 1. Fetch the media item
    const mediaItem = await prisma.media.findFirst({
      where: { id: mediaId, shopId },
    });

    if (!mediaItem || mediaItem.shopId !== shopId) {
      return NextResponse.json({ error: 'رسانه یافت نشد یا دسترسی غیرمجاز است.' }, { status: 404 });
    }

    if (mediaItem.type !== 'image') {
      return NextResponse.json({ error: 'فقط می‌توانید پس‌زمینه تصاویر را حذف کنید.' }, { status: 400 });
    }

    // 2. Fetch the shop's active package and check limit
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId },
      include: { package: true },
    });

    if (!shop) {
      return NextResponse.json({ error: 'تنظیمات فروشگاه یافت نشد.' }, { status: 404 });
    }

    const isPackageActive = shop.packageExpiresAt ? new Date(shop.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? shop.package : null;

    if (!activePackage) {
      return NextResponse.json({ error: 'برای استفاده از این ویژگی نیاز به فعال‌سازی پکیج اشتراک دارید.' }, { status: 403 });
    }

    let packageFeatures: any = {};
    try {
      packageFeatures = JSON.parse(activePackage.features);
    } catch (e) {
      console.error('Error parsing features:', e);
    }

    if (!packageFeatures.bgRemovalEnabled) {
      return NextResponse.json({ error: 'قابلیت حذف پس‌زمینه در پکیج فعلی شما فعال نیست. لطفا پکیج خود را ارتقا دهید.' }, { status: 403 });
    }

    const bgRemovalLimit = parseInt(packageFeatures.bgRemovalLimit) || 0;
    const bgRemovalCount = shop.bgRemovalCount || 0;

    if (bgRemovalLimit > 0 && bgRemovalCount >= bgRemovalLimit) {
      return NextResponse.json({ error: `سهمیه حذف پس‌زمینه پکیج شما (${bgRemovalLimit} عدد) به پایان رسیده است.` }, { status: 403 });
    }

    // 3. Fetch the Poof.bg API key from global settings
    const systemSetting = await prisma.systemSetting.findUnique({
      where: { key: 'poof_api_key' },
    });

    const poofApiKey = systemSetting?.value;

    if (!poofApiKey) {
      return NextResponse.json({ error: 'سرویس هوش مصنوعی حذف پس‌زمینه در حال حاضر پیکربندی نشده است. لطفا بعدا تلاش کنید یا به پشتیبانی اطلاع دهید.' }, { status: 503 });
    }

    // 4. Read local image file from disk
    const filename = path.basename(mediaItem.url);
    const localFilePath = path.join(process.cwd(), 'public', 'uploads', filename);

    try {
      await fs.access(localFilePath);
    } catch (e) {
      return NextResponse.json({ error: 'فایل تصویر روی سرور یافت نشد.' }, { status: 404 });
    }

    const fileBuffer = await fs.readFile(localFilePath);
    const fileBlob = new Blob([fileBuffer], { type: 'image/png' });

    // 5. Build FormData and send to Poof API
    const formData = new FormData();
    formData.append('image_file', fileBlob, filename);

    const poofResponse = await fetch('https://api.poof.bg/v1/remove', {
      method: 'POST',
      headers: {
        'x-api-key': poofApiKey,
      },
      body: formData,
    });

    if (!poofResponse.ok) {
      const errorText = await poofResponse.text();
      console.error('Poof API error response:', errorText);
      return NextResponse.json({ error: 'خطایی در پردازش تصویر توسط هوش مصنوعی رخ داد. لطفا دوباره تلاش کنید.' }, { status: 502 });
    }

    const responseBuffer = await poofResponse.arrayBuffer();
    const finalBuffer = Buffer.from(responseBuffer);

    // 6. Save the background-removed PNG/WebP to disk
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const resultFilename = `${uniqueSuffix}-removed-bg.png`;
    const resultFilePath = path.join(process.cwd(), 'public', 'uploads', resultFilename);

    await fs.writeFile(resultFilePath, finalBuffer);

    const resultUrl = `/uploads/${resultFilename}`;

    // 7. Create a new record in Media table
    const originalNameWithoutExt = mediaItem.name.substring(0, mediaItem.name.lastIndexOf('.')) || mediaItem.name;
    const newMediaItem = await prisma.media.create({
      data: {
        shopId,
        url: resultUrl,
        type: 'image',
        name: `${originalNameWithoutExt}-بدون-پس‌زمینه.png`,
        alt: `${mediaItem.alt || originalNameWithoutExt} بدون پس‌زمینه`,
        size: finalBuffer.length,
        originalId: mediaItem.id,
        originalUrl: mediaItem.url,
      },
    });

    // 8. Increment the bgRemovalCount in ShopSettings
    await prisma.shopSettings.update({
      where: { shopId },
      data: {
        bgRemovalCount: {
          increment: 1,
        },
      },
    });

    return NextResponse.json({
      success: true,
      media: newMediaItem,
    });
  } catch (error) {
    console.error('Error in remove-bg API endpoint:', error);
    return NextResponse.json({ error: 'خطای سرور در پردازش درخواست.' }, { status: 500 });
  }
}
