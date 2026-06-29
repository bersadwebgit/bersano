import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const brands = await prisma.brand.findMany({
      where: { shopId: payload.shopId },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ brands });
  } catch (error) {
    console.error('[ERROR] [Brands GET]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, logoUrl } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'نام برند الزامی است' }, { status: 400 });
    }

    // Check if brand already exists
    const existingBrand = await prisma.brand.findFirst({
      where: {
        shopId: payload.shopId,
        name: {
          equals: name.trim(),
        },
      },
    });

    if (existingBrand) {
      return NextResponse.json({ error: 'برند با این نام از قبل وجود دارد' }, { status: 400 });
    }

    const brand = await prisma.brand.create({
      data: {
        shopId: payload.shopId,
        name: name.trim(),
        logoUrl: logoUrl || null,
      },
    });

    return NextResponse.json({ brand });
  } catch (error) {
    console.error('[ERROR] [Brands POST]:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
