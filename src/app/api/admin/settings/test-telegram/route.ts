import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sendTelegramBotMessage } from '@/lib/telegram';

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request, 'admin');
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const { botToken, chatId } = await request.json();

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'وارد کردن توکن بات و شناسه چت الزامی است' },
        { status: 400 }
      );
    }

    console.log(`[INFO] [TelegramTestRoute]: Testing Telegram bot connection for shopId: ${user.shopId}`);

    const testMessage = `🤖 *اتصال موفقیت‌آمیز بازوی تلگرام!*
🏪 این پیام جهت تست اتصال پیام‌رسان تلگرام برای فروشگاه شما ارسال شده است.
✅ تنظیمات شما به درستی پیکربندی شده و آماده دریافت اعلان‌های سفارشات است.`;

    const result = await sendTelegramBotMessage(botToken, chatId, testMessage);

    if (result.success) {
      return NextResponse.json({ success: true, message: 'پیام تست با موفقیت ارسال شد!' });
    } else {
      return NextResponse.json(
        { error: result.error || 'خطا در ارسال پیام تست' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('[ERROR] [TelegramTestRoute]: Exception in route |', error);
    return NextResponse.json(
      { error: error?.message || 'خطای سرور در ارسال پیام تست' },
      { status: 500 }
    );
  }
}
