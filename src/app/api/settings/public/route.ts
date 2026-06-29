import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function GET(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: {
        shopName: true,
        logoUrl: true,
        faviconUrl: true,
        themeColor: true,
        currency: true,
        language: true,
        bottomNavConfig: true,
        zarinpalEnabled: true,
        zarinpalSandbox: true,
        zibalEnabled: true,
        zibalSandbox: true,
        digipayEnabled: true,
        digipaySandbox: true,
        cardToCardEnabled: true,
        cardNumber: true,
        cardHolderName: true,
        cardBankName: true,
        cardSheba: true,
        cardToCardConfig: true,
        tipaxEnabled: true,
        tipaxSandbox: true,
        tipaxShippingMode: true,
      }
    });

    if (settings && settings.cardToCardEnabled && settings.cardToCardConfig) {
      try {
        const cards = JSON.parse(settings.cardToCardConfig);
        if (Array.isArray(cards) && cards.length > 0) {
          // Get start of current month
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

          // Get paid/delivered orders for card-to-card in this month
          const orders = await prisma.order.findMany({
            where: {
              shopId: shop.shopId,
              paymentMethod: 'card_to_card',
              status: { in: ['paid', 'shipped', 'delivered'] },
              createdAt: { gte: startOfMonth }
            },
            select: {
              finalAmount: true,
              cardToCardReceiverCard: true
            }
          });

          // Calculate accumulated volume for each card
          const volumes: Record<string, number> = {};
          orders.forEach(o => {
            const card = o.cardToCardReceiverCard || '';
            const amount = o.finalAmount || 0;
            // Handle IRR/IRT conversion if needed, but we keep raw finalAmount as same currency
            volumes[card] = (volumes[card] || 0) + amount;
          });

          // Map card info with current month usage and limit check
          const processedCards = cards.map((c: any) => {
            const currentVolume = volumes[c.cardNumber] || 0;
            const limit = c.monthlyLimit || 10000000;
            return {
              ...c,
              currentMonthlyVolume: currentVolume,
              hasReachedLimit: currentVolume >= limit
            };
          });

          // Inject computed cards back
          (settings as any).processedCards = processedCards;
        }
      } catch (err) {
        console.error('[ERROR] [SettingsPublic] calculating card volumes:', err);
      }
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error('[ERROR] [SettingsPublic]: Error fetching public settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
