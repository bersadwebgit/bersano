import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'superadmin');
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status } : {};

    const tickets = await prisma.systemTicket.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      allowCrossTenant: true
    } as any);

    const ticketsWithShops = await Promise.all(
      tickets.map(async (ticket) => {
        const shop = await prisma.shopSettings.findUnique({
          where: { shopId: ticket.shopId },
          select: {
            shopName: true,
            subdomain: true,
          }
        });
        return {
          ...ticket,
          shop,
        };
      })
    );

    return NextResponse.json({ tickets: ticketsWithShops });
  } catch (error) {
    console.error('Error fetching super-admin system tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
