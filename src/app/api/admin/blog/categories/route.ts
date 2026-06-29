import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await prisma.blogCategory.findMany({
      where: { shopId: payload.shopId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { posts: true }
        }
      }
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[ERROR] [BlogCategoriesAdminGet]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, slug, description } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'نام و اسلاگ الزامی هستند' }, { status: 400 });
    }

    // Check if slug already exists in this shop
    const existing = await prisma.blogCategory.findFirst({
      where: {
        shopId: payload.shopId,
        slug: slug.trim().toLowerCase(),
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'دسته‌بندی با این اسلاگ قبلاً تعریف شده است' }, { status: 400 });
    }

    const category = await prisma.blogCategory.create({
      data: {
        shopId: payload.shopId,
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description ? description.trim() : null,
      }
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('[ERROR] [BlogCategoriesAdminPost]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
