import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { enabled, requireName, requirePhone, requireEmail, welcomeMessage, defaultMode, supportAvatar, supportName, faqsConfig } = body;

    const chatSettings = {
      enabled: enabled !== undefined ? enabled : true,
      requireName: requireName !== undefined ? requireName : true,
      requirePhone: requirePhone !== undefined ? requirePhone : true,
      requireEmail: requireEmail !== undefined ? requireEmail : false,
      welcomeMessage: welcomeMessage || 'سلام! چطور می‌توانم کمکتان کنم؟',
      defaultMode: defaultMode || 'ai',
      supportAvatar: supportAvatar || '',
      supportName: supportName || 'پشتیبانی آنلاین',
    };

    const updated = await prisma.shopSettings.update({
      where: { shopId: decoded.shopId },
      data: {
        chatSettings: JSON.stringify(chatSettings),
        faqsConfig: faqsConfig !== undefined ? (typeof faqsConfig === 'string' ? faqsConfig : JSON.stringify(faqsConfig)) : undefined,
      },
      select: {
        chatSettings: true,
        faqsConfig: true,
      }
    });

    return NextResponse.json({
      chatSettings: JSON.parse(updated.chatSettings || '{}'),
      faqsConfig: updated.faqsConfig || '[]',
    });
  } catch (error) {
    console.error('[ERROR] [AdminChatSettings]: Error updating chat settings:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
