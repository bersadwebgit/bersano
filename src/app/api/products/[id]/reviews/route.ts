import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'برای ثبت نظر باید وارد حساب کاربری خود شوید.' }, { status: 401 });
    }

    const { id: productId } = await params;
    const body = await request.json();
    const { rating, comment, images } = body;

    if (!rating || !comment || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'اطلاعات وارد شده نامعتبر است.' }, { status: 400 });
    }

    const product = await prisma.product.findFirst({
      where: { id: productId, shopId: tokenUser.shopId },
      select: { shopId: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'محصول یافت نشد.' }, { status: 404 });
    }

    // Check if the user is a buyer
    const userOrders = await prisma.order.findMany({
      where: {
        userId: tokenUser.id as string,
        shopId: product.shopId,
        status: { in: ['paid', 'shipped', 'delivered'] },
        items: {
          some: {
            productId: productId
          }
        }
      }
    });

    const isBuyer = userOrders.length > 0;

    const review = await prisma.review.create({
      data: {
        shopId: product.shopId,
        productId,
        userId: tokenUser.id as string,
        rating: Number(rating),
        comment,
        isBuyer,
        images: images ? JSON.stringify(images) : null,
        status: 'pending' // Requires admin approval
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'نظر شما با موفقیت ثبت شد و پس از تایید نمایش داده خواهد شد.',
      review 
    });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json({ error: 'خطا در ثبت نظر.' }, { status: 500 });
  }
}