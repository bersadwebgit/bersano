import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { registerTipaxOrder, TipaxOrderData } from '@/lib/tipax';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'کاربر غیرمجاز' }, { status: 401 });
    }

    // Fetch the order with user details
    const order = await prisma.order.findFirst({
      where: {
        id,
        shopId: decoded.shopId,
      },
      include: {
        user: true,
      },
    });

    if (!order || order.shopId !== decoded.shopId) {
      return NextResponse.json({ error: 'سفارش یافت نشد' }, { status: 404 });
    }

    // Fetch shop settings to get Tipax API credentials
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: decoded.shopId },
    });

    if (!settings || !settings.tipaxEnabled) {
      return NextResponse.json(
        { error: 'وب‌سرویس تیپاکس در تنظیمات فروشگاه شما فعال نیست.' },
        { status: 400 }
      );
    }

    // Prepare Tipax order parameters
    const orderData: TipaxOrderData = {
      receiverName: order.user?.name || 'مشتری بدون نام',
      receiverPhone: order.phone || order.user?.phone || '',
      receiverAddress: order.address || 'آدرس ثبت نشده',
      receiverCity: order.city || settings.address?.split(' ')[0] || 'تهران',
      receiverState: order.state || settings.address?.split(' ')[0] || 'تهران',
      receiverZipCode: order.zipCode || undefined,
      senderName: settings.shopName || 'فروشگاه آنلاین',
      senderPhone: settings.contactPhone || '',
      senderAddress: settings.address || 'آدرس فرستنده ثبت نشده است',
      senderCity: settings.address?.split(' ')[0] || 'تهران',
      senderState: settings.address?.split(' ')[0] || 'تهران',
      itemsCount: 1, // Standard/Simplified order size
      totalValue: order.finalAmount,
      notes: order.userNotes || undefined,
    };

    // Call the Tipax Helper to register order
    const result = await registerTipaxOrder(
      {
        enabled: settings.tipaxEnabled,
        username: settings.tipaxUsername || undefined,
        password: settings.tipaxPassword || undefined,
        apiKey: settings.tipaxApiKey || undefined,
        sandbox: settings.tipaxSandbox || false,
        shippingMode: (settings.tipaxShippingMode as 'manual' | 'api') || 'manual',
      },
      orderData
    );

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    // Create a timeline event
    let currentTimeline: any[] = [];
    if (order.statusTimeline) {
      try {
        currentTimeline = JSON.parse(order.statusTimeline);
      } catch (e) {
        currentTimeline = [];
      }
    }

    const tipaxEvent = {
      status: 'shipped',
      title: 'ثبت در تیپاکس API',
      description: `سفارش با موفقیت در تیپاکس ثبت گردید. کد رهگیری: ${result.trackingCode}`,
      date: new Date().toISOString(),
    };
    currentTimeline.push(tipaxEvent);

    // Update the Order in Database
    const updatedOrder = await prisma.order.update({
      where: {
        id,
        shopId: decoded.shopId,
      },
      data: {
        shippingCarrier: 'Tipax',
        shippingTrackingCode: result.trackingCode,
        shippingStatus: 'shipped',
        statusTimeline: JSON.stringify(currentTimeline),
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      trackingCode: result.trackingCode,
      order: updatedOrder,
    });
  } catch (error: any) {
    console.error('[API Admin Orders Tipax] Error:', error);
    return NextResponse.json(
      { error: 'خطای داخلی سرور در ثبت مرسوله تیپاکس.' },
      { status: 500 }
    );
  }
}
