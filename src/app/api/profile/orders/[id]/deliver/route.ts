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
      return NextResponse.json({ error: 'برای تغییر وضعیت سفارش باید وارد حساب کاربری خود شوید.' }, { status: 401 });
    }

    const { id: orderId } = await params;

    // Find the order and verify ownership
    const order = await prisma.order.findUnique({
      where: { 
        id: orderId,
        userId: tokenUser.id as string,
        shopId: tokenUser.shopId as string
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'سفارش مورد نظر یافت نشد.' }, { status: 404 });
    }

    if (order.status === 'delivered') {
      return NextResponse.json({ error: 'این سفارش قبلاً به عنوان تحویل شده ثبت شده است.' }, { status: 400 });
    }

    if (order.status === 'cancelled') {
      return NextResponse.json({ error: 'این سفارش لغو شده است و امکان تغییر وضعیت آن وجود ندارد.' }, { status: 400 });
    }

    if (order.status === 'returned') {
      return NextResponse.json({ error: 'این سفارش مرجوع شده است و امکان تغییر وضعیت آن وجود ندارد.' }, { status: 400 });
    }

    const now = new Date();
    
    // Parse status timeline
    let timeline: any[] = [];
    try {
      if (order.statusTimeline) {
        timeline = JSON.parse(order.statusTimeline);
      }
    } catch (e) {
      console.error('Error parsing status timeline:', e);
    }

    // Append new event
    timeline.push({
      title: 'تایید تحویل توسط خریدار',
      description: 'سفارش توسط خریدار تحویل گرفته شد و تحویل آن تایید گردید.',
      date: now.toISOString(),
    });

    // Update order status to delivered
    const updatedOrder = await prisma.order.update({
      where: { 
        id: orderId,
        shopId: tokenUser.shopId as string
      },
      data: {
        status: 'delivered',
        shippingStatus: 'delivered',
        statusTimeline: JSON.stringify(timeline)
      }
    });

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        shopId: order.shopId,
        userId: order.userId,
        title: 'تحویل سفارش تایید شد',
        message: `تحویل سفارش شماره ${order.id.slice(-8).toUpperCase()} با موفقیت توسط شما تایید شد.`,
        type: 'success',
        linkUrl: `/profile/orders/${order.id}`,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'تحویل سفارش با موفقیت تایید شد.',
      order: updatedOrder
    });

  } catch (error) {
    console.error('Error delivering order:', error);
    return NextResponse.json({ error: 'خطا در تایید تحویل سفارش.' }, { status: 500 });
  }
}
