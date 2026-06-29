import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;
    const { id } = await params;

    const media = await prisma.media.findFirst({
      where: { id, shopId },
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Delete file from filesystem
    try {
      const filename = media.url.split('/').pop();
      if (filename) {
        const filepath = path.join(process.cwd(), 'public', 'uploads', filename);
        await unlink(filepath);
      }
    } catch (fsError) {
      console.error('Failed to delete file from filesystem:', fsError);
      // Continue to delete from database even if file deletion fails
    }

    // Delete from database
    await prisma.media.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to delete media' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(request, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const shopId = payload.shopId;
    const { id } = await params;
    const body = await request.json();

    const media = await prisma.media.findFirst({
      where: { id, shopId },
    });

    if (!media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    const updatedMedia = await prisma.media.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : media.name,
        alt: body.alt !== undefined ? body.alt : media.alt,
      },
    });

    return NextResponse.json(updatedMedia);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Failed to update media' }, { status: 500 });
  }
}
