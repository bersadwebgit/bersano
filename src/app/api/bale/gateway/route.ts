import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBaleBotMessage } from '@/lib/bale';

/**
 * Highly Secure Centralized Bale Bot Gateway Endpoint
 * URL: /api/bale/gateway
 * Supported Methods: POST
 * 
 * Header requirements:
 * - Authorization: Bearer <SUPER_ADMIN_BALE_BOT_API_KEY>
 * 
 * This API is called by the central Bale Bot backend engine to:
 * 1. Verify merchant phone and integration token.
 * 2. Link merchant's chat_id to their shop.
 * 3. Fetch list of latest orders or status for linked chats.
 */

// Helper to check security authorization header
async function verifyGatewayAuth(request: Request): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  const token = authHeader.substring(7).trim();

  // Load API Key from DB (system settings)
  const systemSetting = await prisma.systemSetting.findUnique({
    where: { key: 'central_bale_bot_api_key' }
  });

  const expectedKey = systemSetting?.value || process.env.CENTRAL_BALE_BOT_API_KEY || 'default-secret-bale-key';
  return token === expectedKey;
}

export async function POST(request: Request) {
  try {
    // 1. Verify API Header Security
    const isAuthorized = await verifyGatewayAuth(request);
    if (!isAuthorized) {
      console.warn('[SECURITY] [BaleGateway]: Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized gateway access' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter is required' }, { status: 400 });
    }

    // ACTION: LINK (Verify merchant phone and token and link chat_id)
    if (action === 'link') {
      const { phone, token, chatId } = body;

      if (!phone || !token || !chatId) {
        return NextResponse.json({ error: 'Missing phone, token or chatId' }, { status: 400 });
      }

      // Format input phone to match registered formats
      let normalizedInputPhone = phone.trim();
      if (normalizedInputPhone.startsWith('+98')) {
        normalizedInputPhone = '0' + normalizedInputPhone.substring(3);
      } else if (normalizedInputPhone.startsWith('98') && normalizedInputPhone.length === 11) {
        normalizedInputPhone = '0' + normalizedInputPhone.substring(2);
      } else if (normalizedInputPhone.startsWith('9') && normalizedInputPhone.length === 10) {
        normalizedInputPhone = '0' + normalizedInputPhone;
      }

      // Check if there is any shop where contactPhone equals the formatted input phone
      // and baleIntegrationToken equals the provided token.
      const shopSettings = await prisma.shopSettings.findFirst({
        where: {
          contactPhone: {
            contains: normalizedInputPhone.substring(1) // match the main part of the phone (e.g. 9123456789)
          },
          baleIntegrationToken: token.trim(),
        }
      });

      if (!shopSettings) {
        return NextResponse.json({
          success: false,
          error: 'شماره موبایل یا رمز یکبار مصرف وارد شده معتبر نیست. لطفاً مجدداً در پنل مدیریت بررسی کنید.'
        });
      }

      // Link Bale Chat ID and enable notifications
      await prisma.shopSettings.update({
        where: { id: shopSettings.id },
        data: {
          baleChatId: chatId.toString(),
          baleOrderNotificationsEnabled: true
        }
      });

      // Get Central Bot Token to send a welcome message
      const botTokenSetting = await prisma.systemSetting.findUnique({
        where: { key: 'central_bale_bot_token' }
      });
      const botToken = botTokenSetting?.value;

      if (botToken) {
        const welcomeMsg = `🎉 *اتصال موفقیت‌آمیز فروشگاه!*
🏪 فروشگاه *${shopSettings.shopName}* با موفقیت به اکانت بله شما متصل شد.
✅ از این پس گزارش و اعلان تمامی سفارشات جدید این فروشگاه مستقیماً در اینجا برای شما ارسال خواهد شد.`;
        await sendBaleBotMessage(botToken, chatId.toString(), welcomeMsg);
      }

      return NextResponse.json({
        success: true,
        message: 'فروشگاه شما با موفقیت متصل شد.',
        shopName: shopSettings.shopName
      });
    }

    // ACTION: GET_ORDERS (Fetch latest 5 orders for a linked chat_id)
    if (action === 'get_orders') {
      const { chatId } = body;
      if (!chatId) {
        return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 });
      }

      const shopSettings = await prisma.shopSettings.findFirst({
        where: { baleChatId: chatId.toString() }
      });

      if (!shopSettings) {
        return NextResponse.json({
          success: false,
          error: 'هیچ فروشگاه متصلی برای اکانت بله شما پیدا نشد. ابتدا ثبت‌نام کنید.'
        });
      }

      // Fetch latest 5 orders
      const orders = await prisma.order.findMany({
        where: { shopId: shopSettings.shopId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          totalAmount: true,
          finalAmount: true,
          paymentMethod: true,
          status: true,
          createdAt: true,
          phone: true
        }
      });

      return NextResponse.json({
        success: true,
        shopName: shopSettings.shopName,
        orders: orders.map(o => ({
          id: o.id,
          finalAmount: o.finalAmount,
          paymentMethod: o.paymentMethod,
          status: o.status,
          date: o.createdAt.toLocaleDateString('fa-IR'),
          phone: o.phone || 'ثبت نشده'
        }))
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    console.error('[ERROR] [BaleGateway]: Exception inside gateway route |', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
