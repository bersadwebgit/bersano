import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'فروشگاه یافت نشد' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');

    if (!query) {
      return NextResponse.json({ products: [], posts: [] });
    }

    // Run parallel fast queries for both products and blog posts
    const [products, posts] = await Promise.all([
      prisma.product.findMany({
        where: {
          shopId: shop.shopId,
          isActive: true,
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          title: true,
          price: true,
          discount: true,
          imageUrl: true,
          stock: true,
          brand: true,
        },
        take: 5,
      }),
      prisma.blogPost.findMany({
        where: {
          shopId: shop.shopId,
          status: 'published',
          publishedAt: { lte: new Date() },
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { summary: { contains: query, mode: 'insensitive' } },
            { content: { contains: query, mode: 'insensitive' } },
          ]
        },
        select: {
          id: true,
          title: true,
          slug: true,
          featuredImage: true,
          publishedAt: true,
          summary: true,
        },
        take: 5,
      })
    ]);

    return NextResponse.json({ products, posts });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
