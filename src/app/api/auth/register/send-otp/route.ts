import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpSms } from '@/lib/sms';

export async function POST(request: Request) {
  try {
    const { phone, email, subdomain } = await request.json();

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

    // 1. Check duplicate phone among store owners (admins)
    const existingUserByPhone = await prisma.user.findFirst({
      where: { 
        phone: normalizedPhone,
        role: 'admin'
      },
      allowCrossTenant: true
    } as any);

    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'این شماره موبایل قبلاً برای یک فروشگاه دیگر ثبت شده است.' },
        { status: 400 }
      );
    }

    // 2. Check duplicate email if provided
    if (email) {
      const existingUserByEmail = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase().trim(),
          role: 'admin'
        },
        allowCrossTenant: true
      } as any);

      if (existingUserByEmail) {
        return NextResponse.json(
          { error: 'این ایمیل قبلاً برای یک فروشگاه دیگر ثبت شده است.' },
          { status: 400 }
        );
      }
    }

    // 3. Check duplicate subdomain if provided
    if (subdomain) {
      const existingShop = await prisma.shopSettings.findUnique({
        where: { subdomain: subdomain.toLowerCase().trim() },
        allowCrossTenant: true
      } as any);

      if (existingShop) {
        return NextResponse.json(
          { error: 'این ساب‌دامین قبلاً ثبت شده است. لطفاً نام دیگری انتخاب کنید.' },
          { status: 400 }
        );
      }
    }

    const now = new Date();

    // Check rate limit: 120 seconds between sends
    const recentOtp = await prisma.otp.findFirst({
      where: {
        phone: normalizedPhone,
        shopId: 'saas_platform',
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

    // Clean up older OTPs for this phone on saas_platform
    await prisma.otp.deleteMany({
      where: {
        phone: normalizedPhone,
        shopId: 'saas_platform',
      },
    });

    // Store the OTP in the database
    await prisma.otp.create({
      data: {
        phone: normalizedPhone,
        shopId: 'saas_platform',
        code,
        expiresAt,
      },
    });

    // In development mode, always print the code to the console for easier testing
    console.log(`\n==============================================`);
    console.log(`[REGISTRATION OTP SENT] Phone: ${normalizedPhone} | Code: ${code}`);
    console.log(`==============================================\n`);

    // Send SMS via Melipayamak
    const smsResult = await sendOtpSms(normalizedPhone, code);

    if (!smsResult.success) {
      return NextResponse.json(
        { error: `خطا در ارسال پیامک تایید: ${smsResult.error || 'ارسال پیامک تایید با خطا مواجه شد'}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'کد تایید پیامک شد.',
      ...(process.env.NODE_ENV !== 'production' && { devCode: code })
    });

  } catch (error) {
    console.error('Registration OTP send error:', error);
    return NextResponse.json(
      { error: 'خطای سرور در ارسال کد تایید' },
      { status: 500 }
    );
  }
}
