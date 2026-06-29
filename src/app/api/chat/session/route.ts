import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    let { name, phone, email } = body;

    // Check if customer is logged in to pre-fill info
    try {
      const customer = await verifyAuth(request, 'customer');
      if (customer && customer.id) {
        const dbUser = await prisma.user.findUnique({
          where: { 
            id: customer.id,
            shopId: shop.shopId
          },
          select: { name: true, phone: true, email: true }
        });
        if (dbUser) {
          name = name || dbUser.name;
          phone = phone || dbUser.phone;
          email = email || dbUser.email;
        }
      }
    } catch (e) {
      // Not logged in or invalid token, ignore and use body values
    }

    // Load default mode from settings
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: shop.shopId },
      select: { chatSettings: true }
    });

    let defaultMode = 'ai';
    if (settings?.chatSettings) {
      try {
        const parsed = JSON.parse(settings.chatSettings);
        if (parsed.defaultMode) {
          defaultMode = parsed.defaultMode;
        }
      } catch (e) {
        console.error('[ERROR] [ChatSession]: Error parsing chat settings:', e);
      }
    }

    // Create session
    const session = await prisma.chatSession.create({
      data: {
        shopId: shop.shopId,
        name: name || null,
        phone: phone || null,
        email: email || null,
        mode: defaultMode,
        status: 'active',
      }
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[ERROR] [ChatSession]: Error creating chat session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
