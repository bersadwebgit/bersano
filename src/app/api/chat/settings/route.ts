import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: {
        chatSettings: true,
        themeColor: true,
        faqsConfig: true,
        contactPhone: true,
        address: true,
      }
    });

    let chatSettings = {
      enabled: true,
      requireName: true,
      requirePhone: true,
      requireEmail: false,
      welcomeMessage: 'سلام! چطور می‌توانم کمکتان کنم؟',
      defaultMode: 'ai',
      supportAvatar: '',
      supportName: 'پشتیبانی آنلاین',
    };

    if (settings?.chatSettings) {
      try {
        const parsed = JSON.parse(settings.chatSettings);
        chatSettings = {
          ...chatSettings,
          ...parsed
        };
      } catch (e) {
        console.error('[ERROR] [ChatSettings]: Error parsing chat settings:', e);
      }
    }

    return NextResponse.json({
      chatSettings,
      themeColor: settings?.themeColor || '#2563eb',
      faqsConfig: settings?.faqsConfig || '[]',
      contactPhone: settings?.contactPhone || '',
      address: settings?.address || '',
    });
  } catch (error) {
    console.error('[ERROR] [ChatSettings]: Error fetching chat settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
