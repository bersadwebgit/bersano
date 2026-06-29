import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function POST(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'مغازه یافت نشد' }, { status: 404 });
    }

    const { productId, variantId, phone } = await request.json();

    if (!productId || !phone) {
      return NextResponse.json({ error: 'شناسه محصول و شماره تماس الزامی هستند' }, { status: 400 });
    }

    // Check if duplicate request exists
    const existing = await prisma.productNotificationRequest.findFirst({
      where: {
        shopId: shop.shopId,
        productId,
        variantId: variantId || null,
        phone,
        isNotified: false
      }
    });

    if (existing) {
      return NextResponse.json({ 
        success: true, 
        message: 'درخواست شما قبلا ثبت شده است. به محض موجود شدن کالا به شما اطلاع داده خواهد شد.' 
      });
    }

    // Create a new request
    await prisma.productNotificationRequest.create({
      data: {
        shopId: shop.shopId,
        productId,
        variantId: variantId || null,
        phone,
        isNotified: false
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'درخواست اطلاع‌رسانی شما با موفقیت ثبت شد. به محض شارژ مجدد انبار، پیامک اطلاع‌رسانی ارسال خواهد شد.' 
    });
  } catch (error: any) {
    console.error('[ERROR] [ProductNotification]', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت درخواست' }, { status: 500 });
  }
}
