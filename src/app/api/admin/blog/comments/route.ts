import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status'); // pending, approved, rejected, spam
    const search = searchParams.get('search');

    const where: any = {
      shopId: payload.shopId,
    };

    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const comments = await prisma.blogComment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            slug: true,
          }
        },
        parent: {
          select: {
            id: true,
            name: true,
            content: true,
          }
        }
      }
    });

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('[ERROR] [BlogCommentsAdminGet]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// Post reply from admin
export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId, parentId, content } = await req.json();

    if (!postId || !content) {
      return NextResponse.json({ error: 'آیدی پست و متن پاسخ الزامی هستند' }, { status: 400 });
    }

    // Verify the post exists and belongs to this shop
    const post = await prisma.blogPost.findFirst({
      where: {
        id: postId,
        shopId: payload.shopId,
      }
    });

    if (!post) {
      return NextResponse.json({ error: 'پست پیدا نشد' }, { status: 404 });
    }

    // Create the reply (admin replies are auto-approved!)
    const comment = await prisma.blogComment.create({
      data: {
        shopId: payload.shopId,
        postId,
        parentId: parentId || null,
        name: payload.name || 'مدیر سایت',
        email: payload.email,
        content: content.trim(),
        status: 'approved', // Auto-approved
      }
    });

    return NextResponse.json({ comment });
  } catch (error) {
    console.error('[ERROR] [BlogCommentsAdminPostReply]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
