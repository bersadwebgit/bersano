import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await verifyAuth(request, 'customer');
    if (!user || !user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || '';

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: user.id as string,
        shopId: user.shopId as string,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Fetch download tokens for this order
    const downloadTokens = await prisma.downloadToken.findMany({
      where: {
        shopId: user.shopId as string,
        orderId: order.id,
        userId: user.id as string,
      },
    });

    const mappedTokens = downloadTokens.map((tok) => {
      const item = order.items.find((i) => i.productId === tok.productId);
      return {
        token: tok.token,
        productTitle: item?.product.title || 'محصول دانلودی',
        fileSize: item?.product.fileSize || 'مشخص نشده',
        fileFormat: item?.product.fileFormat || 'ZIP',
        maxDownloads: tok.maxDownloads,
        expiresAt: tok.expiresAt ? new Date(tok.expiresAt).toLocaleDateString('fa-IR') : null,
      };
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        status: order.status,
        paymentStatus: order.paymentStatus,
        finalAmount: order.finalAmount,
      },
      downloadTokens: mappedTokens,
    });
  } catch (error) {
    console.error('Error in verify-status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
