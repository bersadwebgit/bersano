import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { sendStoreSms } from '@/lib/sms';

export async function POST(request: Request) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json(
        { error: 'شماره موبایل الزامی است' },
        { status: 400 }
      );
    }

    // Normalize and validate Iranian phone number
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('+98')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith('98') && normalizedPhone.length === 11) {
      normalizedPhone = '0' + normalizedPhone.substring(2);
    } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
      normalizedPhone = '0' + normalizedPhone;
    }

    const iranPhoneRegex = /^09\d{9}$/;
    if (!iranPhoneRegex.test(normalizedPhone)) {
      return NextResponse.json(
        { error: 'شماره موبایل وارد شده معتبر نیست. نمونه معتبر: 09123456789' },
        { status: 400 }
      );
    }

    // Get current shop context
    const shop = await getTenantShop(undefined, true);
    if (!shop) {
      return NextResponse.json(
        { error: 'فروشگاهی یافت نشد' },
        { status: 500 }
      );
    }

    const now = new Date();

    // Check rate limit: 120 seconds between sends
    const recentOtp = await prisma.otp.findFirst({
      where: {
        phone: normalizedPhone,
        shopId: shop.shopId,
        createdAt: {
          gte: new Date(now.getTime() - 120 * 1000), // last 120 seconds
        },
      },
    });

    if (recentOtp) {
      const elapsedMs = now.getTime() - recentOtp.createdAt.getTime();
      const secondsLeft = Math.ceil((120 * 1000 - elapsedMs) / 1000);
      return NextResponse.json(
        { error: `لطفا پس از ${secondsLeft} ثانیه مجددا تلاش کنید` },
        { status: 429 }
      );
    }

    // Generate random 5-digit verification code
    const code = Math.floor(10000 + Math.random() * 90000).toString();

    // Set expiration time to 5 minutes from now
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    // Clean up older OTPs for this phone to avoid DB bloat
    await prisma.otp.deleteMany({
      where: {
        phone: normalizedPhone,
        shopId: shop.shopId,
      },
    });

    // Store the OTP in the database
    await prisma.otp.create({
      data: {
        phone: normalizedPhone,
        shopId: shop.shopId,
        code,
        expiresAt,
      },
    });

    // In development mode, always print the code to the console for easier testing
    console.log(`\n==============================================`);
    console.log(`[OTP SENT] Phone: ${normalizedPhone} | Code: ${code}`);
    console.log(`==============================================\n`);

    // Send SMS via the store's own SMS configuration
    const smsResult = await sendStoreSms(shop.shopId, 'otp', normalizedPhone, { code });

    if (!smsResult.success) {
      console.warn(`[WARN] [OTP/SMS]: Store SMS send failed. Error: ${smsResult.error}`);
      
      if (process.env.NODE_ENV === 'production') {
        // If SMS is not configured or disabled, let the user know specifically
        if (smsResult.error === 'SMS not configured' || smsResult.error === 'SMS is disabled or provider not set') {
          return NextResponse.json(
            { error: 'ورود پیامکی برای این فروشگاه فعال یا پیکربندی نشده است.' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { error: 'خطا در ارسال پیامک کد تایید. لطفا مجددا تلاش کنید.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'کد تایید ارسال شد',
      // Return the code in development to make it super easy for the user
      ...(process.env.NODE_ENV !== 'production' && { devCode: code })
    });
  } catch (error) {
    console.error('[ERROR] [OtpSendRoute]: Exception in route |', error);
    return NextResponse.json(
      { error: 'خطای سرور در ارسال کد تایید' },
      { status: 500 }
    );
  }
}
