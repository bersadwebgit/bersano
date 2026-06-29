import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const category = await prisma.blogCategory.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی پیدا نشد' }, { status: 404 });
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error('[ERROR] [BlogCategoryAdminGetId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

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
    const { name, slug, description } = await req.json();

    if (!name || !slug) {
      return NextResponse.json({ error: 'نام و اسلاگ الزامی هستند' }, { status: 400 });
    }

    const category = await prisma.blogCategory.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی پیدا نشد' }, { status: 404 });
    }

    // Check if slug is taken by another category in this shop
    const existing = await prisma.blogCategory.findFirst({
      where: {
        shopId: payload.shopId,
        slug: slug.trim().toLowerCase(),
        NOT: { id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'دسته‌بندی دیگری با این اسلاگ وجود دارد' }, { status: 400 });
    }

    const updatedCategory = await prisma.blogCategory.update({
      where: {
        id,
        shopId: payload.shopId,
      },
      data: {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
        description: description ? description.trim() : null,
      }
    });

    return NextResponse.json({ category: updatedCategory });
  } catch (error) {
    console.error('[ERROR] [BlogCategoryAdminPutId]:', error);
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

    const category = await prisma.blogCategory.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'دسته‌بندی پیدا نشد' }, { status: 404 });
    }

    await prisma.blogCategory.delete({
      where: {
        id,
        shopId: payload.shopId,
      }
    });

    return NextResponse.json({ success: true, message: 'دسته‌بندی با موفقیت حذف شد' });
  } catch (error) {
    console.error('[ERROR] [BlogCategoryAdminDeleteId]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
