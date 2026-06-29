import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { downloadAndOptimizeImage } from '@/lib/story-media';
import { Invalidate } from '@/lib/invalidate';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    const shopId = payload.shopId as string;

    const mediaType = data.mediaType || (data.mediaUrl?.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image');
    let mediaUrl = data.mediaUrl;
    let thumbnailUrl = data.thumbnailUrl;

    if (mediaType === 'image') {
      if (data.mediaUrl) {
        mediaUrl = await downloadAndOptimizeImage(data.mediaUrl, shopId, false);
      }
      if (data.thumbnailUrl) {
        thumbnailUrl = await downloadAndOptimizeImage(data.thumbnailUrl, shopId, true);
      } else if (data.mediaUrl) {
        thumbnailUrl = await downloadAndOptimizeImage(data.mediaUrl, shopId, true);
      }
    }
    
    const story = await prisma.story.update({
      where: { id, shopId: payload.shopId },
      data: {
        isActive: data.isActive !== undefined ? data.isActive : undefined,
        title: data.title,
        thumbnailUrl: thumbnailUrl !== undefined ? thumbnailUrl : undefined,
        mediaUrl: mediaUrl !== undefined ? mediaUrl : undefined,
        mediaType: data.mediaUrl || data.mediaType ? mediaType : undefined,
        text: data.text,
        linkUrl: data.linkUrl,
        linkText: data.linkText,
        category: data.category,
        duration: data.duration ? parseInt(data.duration) : undefined,
        displayLocation: data.displayLocation,
      }
    });

    await Invalidate.stories(shopId);

    return NextResponse.json(story);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update story' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.story.delete({
      where: { id, shopId: payload.shopId }
    });

    await Invalidate.stories(payload.shopId as string);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 });
  }
}
