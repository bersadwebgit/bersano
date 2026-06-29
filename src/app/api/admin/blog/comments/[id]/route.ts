import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, content } = await req.json();

    const comment = await prisma.blogComment.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'نظر پیدا نشد' }, { status: 404 });
    }

    const data: any = {};
    if (status) {
      if (!['pending', 'approved', 'rejected', 'spam'].includes(status)) {
        return NextResponse.json({ error: 'وضعیت معتبر نیست' }, { status: 400 });
      }
      data.status = status;
    }
    if (content !== undefined) {
      data.content = content.trim();
    }

    const updatedComment = await prisma.blogComment.update({
      where: {
        id,
        shopId: payload.shopId,
      },
      data,
    });

    return NextResponse.json({ comment: updatedComment });
  } catch (error) {
    console.error('[ERROR] [BlogCommentAdminPutId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const comment = await prisma.blogComment.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!comment) {
      return NextResponse.json({ error: 'نظر پیدا نشد' }, { status: 404 });
    }

    await prisma.blogComment.delete({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    return NextResponse.json({ success: true, message: 'نظر با موفقیت حذف شد' });
  } catch (error) {
    console.error('[ERROR] [BlogCommentAdminDeleteId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
