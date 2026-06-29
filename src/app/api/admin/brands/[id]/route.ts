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
    const { name, logoUrl } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'نام برند الزامی است' }, { status: 400 });
    }

    // Verify ownership
    const existingBrand = await prisma.brand.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      },
    });

    if (!existingBrand || existingBrand.shopId !== payload.shopId) {
      return NextResponse.json({ error: 'برند یافت نشد' }, { status: 404 });
    }

    // Check if another brand has this name
    const duplicateBrand = await prisma.brand.findFirst({
      where: {
        shopId: payload.shopId,
        id: { not: id },
        name: {
          equals: name.trim(),
        },
      },
    });

    if (duplicateBrand) {
      return NextResponse.json({ error: 'برند دیگری با این نام از قبل وجود دارد' }, { status: 400 });
    }

    const brand = await prisma.brand.update({
      where: {
        id,
        shopId: payload.shopId,
      },
      data: {
        name: name.trim(),
        logoUrl: logoUrl !== undefined ? logoUrl : existingBrand.logoUrl,
      },
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('[ERROR] [Brands PUT]:', error);
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

    // Verify ownership
    const existingBrand = await prisma.brand.findFirst({
      where: {
        id,
        shopId: payload.shopId,
      },
    });

    if (!existingBrand || existingBrand.shopId !== payload.shopId) {
      return NextResponse.json({ error: 'برند یافت نشد' }, { status: 404 });
    }

    await prisma.brand.delete({
      where: {
        id,
        shopId: payload.shopId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[ERROR] [Brands DELETE]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
