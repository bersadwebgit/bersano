import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';
import { Invalidate } from '@/lib/invalidate';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, slug, description, seoTitle, seoDescription, icon, imageUrl, isActive, parentId } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'نام و نامک الزامی است' }, { status: 400 });
    }

    // Verify category belongs to shop
    const existingCategory = await prisma.category.findFirst({
      where: {
        id,
        shopId: shop.shopId
      }
    });

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    // Check if slug already exists for another category in this shop
    const existingSlug = await prisma.category.findFirst({
      where: {
        shopId: shop.shopId,
        slug,
        id: { not: id }
      }
    });

    if (existingSlug) {
      return NextResponse.json({ error: 'این نامک قبلاً استفاده شده است' }, { status: 400 });
    }

    // Check that parentId is not self
    if (parentId && parentId === id) {
      return NextResponse.json({ error: 'دسته‌بندی نمی‌تواند زیرمجموعه خودش باشد' }, { status: 400 });
    }

    const category = await prisma.category.update({
      where: {
        id,
        shopId: shop.shopId,
      },
      data: {
        name,
        slug,
        description,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        icon: icon || null,
        imageUrl: imageUrl || null,
        parentId: parentId || null,
        isActive
      }
    });

    await Invalidate.categories(shop.shopId);

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { id } = await params;

    // Verify category belongs to shop
    const category = await prisma.category.findFirst({
      where: {
        id,
        shopId: shop.shopId
      }
    });

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 });
    }

    await prisma.category.delete({
      where: {
        id,
        shopId: shop.shopId,
      }
    });

    await Invalidate.categories(shop.shopId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
