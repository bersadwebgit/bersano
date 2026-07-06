import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mockStories } from '@/lib/mock-data';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';
import { downloadAndOptimizeImage } from '@/lib/story-media';
import { Invalidate } from '@/lib/invalidate';
import { checkIdempotency, saveIdempotency } from '@/lib/idempotency';

export async function GET() {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const hasRealProducts = await prisma.product.count({
      where: { shopId: shop.shopId, isDemo: false, isSampleData: false }
    }) > 0;

    const stories = await prisma.story.findMany({
      where: { 
        shopId: shop.shopId,
        ...(hasRealProducts ? { isDemo: false } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    
    return NextResponse.json(stories);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idempotencyKey = request.headers.get('x-idempotency-key');
    if (idempotencyKey) {
      const cached = await checkIdempotency(idempotencyKey);
      if (cached) {
        return NextResponse.json(cached);
      }
    }

    const data = await request.json();
    const shopId = payload.shopId as string;

    // default expiresAt to 24 hours from now if not provided
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const mediaType = data.mediaType || (data.mediaUrl?.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image');
    let mediaUrl = data.mediaUrl;
    let thumbnailUrl = data.thumbnailUrl;

    if (mediaType === 'image') {
      mediaUrl = await downloadAndOptimizeImage(data.mediaUrl, shopId, false);
      thumbnailUrl = await downloadAndOptimizeImage(data.thumbnailUrl || data.mediaUrl, shopId, true);
    }

    const story = await prisma.story.create({
      data: {
        shopId,
        title: data.title,
        thumbnailUrl: thumbnailUrl,
        mediaUrl: mediaUrl,
        mediaType,
        text: data.text || null,
        linkUrl: data.linkUrl || null,
        linkText: data.linkText || null,
        category: data.category || null,
        duration: data.duration ? parseInt(data.duration) : 5,
        isActive: data.isActive !== undefined ? data.isActive : true,
        displayLocation: data.displayLocation || 'both',
        expiresAt
      }
    });

    await Invalidate.stories(shopId);

    if (idempotencyKey) {
      await saveIdempotency(idempotencyKey, story);
    }

    return NextResponse.json(story);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 });
  }
}