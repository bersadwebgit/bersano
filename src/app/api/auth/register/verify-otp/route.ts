import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashOtp } from '@/lib/sms';

export async function POST(request: Request) {
  try {
    const { phone, code } = await request.json();

    if (!phone || !code) {
      return NextResponse.json(
        { error: 'شماره موبایل و کد تایید الزامی است' },
        { status: 400 }
      );
    }

    // Normalize phone number
    let normalizedPhone = phone.trim();
    if (normalizedPhone.startsWith('+98')) {
      normalizedPhone = '0' + normalizedPhone.substring(3);
    } else if (normalizedPhone.startsWith('98') && normalizedPhone.length === 11) {
      normalizedPhone = '0' + normalizedPhone.substring(2);
    } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
      normalizedPhone = '0' + normalizedPhone;
    }

    const now = new Date();
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone: normalizedPhone,
        shopId: 'saas_platform',
        expiresAt: {
          gt: now,
        },
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'کد تایید وارد شده اشتباه یا منقضی شده است.' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 5) {
      await prisma.otp.deleteMany({
        where: {
          phone: normalizedPhone,
          shopId: 'saas_platform',
        },
      });
      return NextResponse.json(
        { error: 'این کد تایید به دلیل تلاش‌های ناموفق مکرر مسدود شده است. لطفاً مجدداً کد جدید دریافت کنید.' },
        { status: 400 }
      );
    }

    const isMatch = otpRecord.code === hashOtp(code);

    if (!isMatch) {
      const newAttempts = otpRecord.attempts + 1;
      if (newAttempts >= 5) {
        await prisma.otp.deleteMany({
          where: {
            phone: normalizedPhone,
            shopId: 'saas_platform',
          },
        });
        return NextResponse.json(
          { error: 'این کد تایید به دلیل تلاش‌های ناموفق مکرر مسدود شده است. لطفاً مجدداً کد جدید دریافت کنید.' },
          { status: 400 }
        );
      }

      await prisma.otp.update({
        where: { id: otpRecord.id },
        data: { attempts: newAttempts },
      });

      return NextResponse.json(
        { error: `کد تایید وارد شده نادرست است. تعداد تلاش‌های باقی‌مانده: ${5 - newAttempts}` },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'کد تایید معتبر است.',
    });
  } catch (error) {
    console.error('Registration OTP verification error:', error);
    return NextResponse.json(
      { error: 'خطای سرور در تایید کد' },
      { status: 500 }
    );
  }
}
