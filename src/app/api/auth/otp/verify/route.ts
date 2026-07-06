import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { ADMIN_ROLES, isAdminRole } from '@/lib/admin-roles';
import { hashOtp, maskPhone } from '@/lib/sms';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { phone, code, role = 'customer' } = await request.json();

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

    const shop = await getTenantShop(undefined, true);
    if (!shop) {
      return NextResponse.json(
        { error: 'فروشگاهی یافت نشد' },
        { status: 500 }
      );
    }

    const now = new Date();

    // Verify OTP code
    const otpRecord = await prisma.otp.findFirst({
      where: {
        phone: normalizedPhone,
        shopId: shop.shopId,
        expiresAt: {
          gt: now, // Must not be expired
        },
      },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: 'کد تایید وارد شده اشتباه یا منقضی شده است' },
        { status: 400 }
      );
    }

    if (otpRecord.attempts >= 5) {
      await prisma.otp.deleteMany({
        where: {
          phone: normalizedPhone,
          shopId: shop.shopId,
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
            shopId: shop.shopId,
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

    // OTP is verified successfully! Delete it immediately to prevent replay attacks
    await prisma.otp.deleteMany({
      where: {
        phone: normalizedPhone,
        shopId: shop.shopId,
      },
    });

    let user = await prisma.user.findFirst({
      where: {
        phone: normalizedPhone,
        shopId: shop.shopId,
        ...(role === 'admin'
          ? { role: { in: [...ADMIN_ROLES] } }
          : { role }),
      },
    });

    if (!user) {
      if (role === 'admin') {
        return NextResponse.json(
          { error: 'حساب مدیریت با این شماره تماس یافت نشد. لطفا با ایمیل و رمز عبور وارد شوید.' },
          { status: 404 }
        );
      }

      // Customer role - register dynamically
      const placeholderEmail = `${normalizedPhone}@phone.local`;
      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      // Create user
      user = await prisma.user.create({
        data: {
          phone: normalizedPhone,
          email: placeholderEmail,
          password: hashedPassword,
          name: `کاربر ${normalizedPhone.substring(7)}`, // friendly default name using last 4 digits
          role: 'customer',
          shopId: shop.shopId,
        },
      });

      const loggedPhone = process.env.NODE_ENV === 'production' ? maskPhone(normalizedPhone) : normalizedPhone;
      console.log(`[INFO] [OTP_VERIFY]: Dynamically registered new customer for phone ${loggedPhone}`);
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'حساب کاربری شما مسدود شده است. لطفا با پشتیبانی تماس بگیرید.' },
        { status: 403 }
      );
    }

    const isAdminLogin = role === 'admin' && isAdminRole(user.role);

    const token = await new SignJWT({
      id: user.id,
      email: user.email,
      shopId: user.shopId,
      role: user.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime(isAdminLogin ? '1d' : '30d')
      .sign(key);

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
    const cookieName = isAdminLogin ? 'admin_token' : 'customer_token';
    const maxAge = isAdminLogin ? 60 * 60 * 24 : 60 * 60 * 24 * 30;

    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: cookieName,
      value: token,
      httpOnly: true,
      path: '/',
      secure: isSecure,
      maxAge: maxAge,
    });

    return response;
  } catch (error) {
    console.error('[ERROR] [OtpVerifyRoute]: Exception in route |', error);
    return NextResponse.json(
      { error: 'خطای سرور در تایید کد' },
      { status: 500 }
    );
  }
}
