import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause: any = { shopId: adminUser.shopId as string };
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        product: { select: { title: true, imageUrl: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { productId, userName, avatarUrl, rating, comment, isBuyer, showOnHomepage, images } = body;

    if (!productId || !rating || !comment || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'اطلاعات وارد شده نامعتبر است.' }, { status: 400 });
    }

    // Create dummy user with custom name and avatar
    const dummyUser = await prisma.user.create({
      data: {
        shopId: adminUser.shopId as string,
        email: `manual-${Date.now()}-${Math.round(Math.random() * 1E5)}@shop.com`,
        name: userName || 'خریدار سایت',
        avatarUrl: avatarUrl || null,
        password: 'manual-reviews-password-not-used',
        role: 'customer'
      }
    });

    const review = await prisma.review.create({
      data: {
        shopId: adminUser.shopId as string,
        productId,
        userId: dummyUser.id,
        rating: Number(rating),
        comment,
        isBuyer: !!isBuyer,
        images: images ? JSON.stringify(images) : null,
        status: 'approved', // Manual reviews are approved for the product page
        showOnHomepage: !!showOnHomepage // Set based on admin selection
      }
    });

    return NextResponse.json({ success: true, review });
  } catch (error) {
    console.error('Error creating manual review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
