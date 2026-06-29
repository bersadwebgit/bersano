import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: productId } = await params;
    const { phone, variantId } = await req.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'شماره موبایل الزامی است' },
        { status: 400 }
      );
    }

    // Normalize and validate Iranian phone number
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('+98')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith('98') && normalizedPhone.length === 11) {
      normalizedPhone = '0' + normalizedPhone.substring(2);
    } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
      normalizedPhone = '0' + normalizedPhone;
    }

    const iranPhoneRegex = /^09\d{9}$/;
    if (!iranPhoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'شماره موبایل وارد شده معتبر نیست. نمونه معتبر: 09123456789' },
        { status: 400 }
      );
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json(
        { error: 'فروشگاهی یافت نشد' },
        { status: 500 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        shopId: shop.shopId,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'محصول یافت نشد' },
        { status: 404 }
      );
    }

    // Check if request already exists
    const existingRequest = await prisma.productNotificationRequest.findFirst({
      where: {
        shopId: shop.shopId,
        productId,
        variantId: variantId || null,
        phone: normalizedPhone,
        isNotified: false,
      },
    });

    if (existingRequest) {
      return NextResponse.json({
        success: true,
        message: 'درخواست شما قبلاً ثبت شده است و به محض موجود شدن کالا، اطلاع‌رسانی خواهد شد.',
      });
    }

    // Create notification request
    await prisma.productNotificationRequest.create({
      data: {
        shopId: shop.shopId,
        productId,
        variantId: variantId || null,
        phone: normalizedPhone,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'درخواست شما با موفقیت ثبت شد. به محض موجود شدن کالا به شما اطلاع داده خواهد شد.',
    });
  } catch (error) {
    console.error('[ERROR] [NotifyMeRoute]:', error);
    return NextResponse.json(
      { error: 'خطای سرور در ثبت درخواست اطلاع‌رسانی' },
      { status: 500 }
    );
  }
}
