import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const now = new Date();

    // Fetch active quantity-based discount codes
    const discounts = await prisma.discountCode.findMany({
      where: {
        shopId: shop.shopId,
        isActive: true,
        minQuantity: { gt: 0 },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: now } }
        ],
        OR: [
          { startDate: null },
          { startDate: { lt: now } }
        ]
      },
      orderBy: {
        discount: 'desc' // Prioritize higher discount values
      }
    });

    // Filter out codes that have exceeded max uses
    const validDiscounts = discounts.filter(d => !d.maxUses || d.usedCount < d.maxUses);

    return NextResponse.json({ discounts: validDiscounts });
  } catch (error) {
    console.error('Error fetching automatic discounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
