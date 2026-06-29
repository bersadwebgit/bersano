import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = decoded.shopId;

    // Run lightweight count queries in parallel
    const [pendingOrdersCount, newTicketsCount, unreadChatsCount] = await Promise.all([
      prisma.order.count({
        where: {
          shopId,
          paymentStatus: 'paid',
          shippingStatus: { in: ['new', 'processing'] }
        }
      }),
      prisma.ticket.count({
        where: {
          shopId,
          status: 'new'
        }
      }),
      prisma.chatSession.count({
        where: {
          shopId,
          status: 'active',
          messages: {
            some: {
              sender: 'customer',
              isRead: false
            }
          }
        }
      })
    ]);

    return NextResponse.json({
      pendingOrdersCount,
      newTicketsCount,
      unreadChatsCount
    });
  } catch (error) {
    console.error('[ERROR] [AdminCounts]: Error fetching counts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
