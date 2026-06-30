import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { sendOtpSms } from '@/lib/sms';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

async function verifySuperAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('super_admin_token')?.value;

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, key);
    if (payload.role !== 'superadmin') return null;
    return payload;
  } catch (error) {
    return null;
  }
}

export async function POST(request: Request) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, phone, code, currentPassword, newPassword } = body;

    if (action === 'send-otp') {
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

      const now = new Date();

      // Check rate limit: 120 seconds between sends
      const recentOtp = await prisma.otp.findFirst({
        where: {
          phone: normalizedPhone,
          shopId: 'system',
          createdAt: {
            gte: new Date(now.getTime() - 120 * 1000), // last 120 seconds
          },
        },
        allowCrossTenant: true,
      } as any);

      if (recentOtp) {
        const elapsedMs = now.getTime() - recentOtp.createdAt.getTime();
        const secondsLeft = Math.ceil((120 * 1000 - elapsedMs) / 1000);
        return NextResponse.json(
          { error: `لطفا پس از ${secondsLeft} ثانیه مجددا تلاش کنید` },
          { status: 429 }
        );
      }

      // Generate random 5-digit verification code
      const otpCode = Math.floor(10000 + Math.random() * 90000).toString();

      // Set expiration time to 5 minutes from now
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

      // Clean up older OTPs for this phone to avoid DB bloat
      await prisma.otp.deleteMany({
        where: {
          phone: normalizedPhone,
          shopId: 'system',
        },
        allowCrossTenant: true,
      } as any);

      // Store the OTP in the database
      await prisma.otp.create({
        data: {
          phone: normalizedPhone,
          shopId: 'system',
          code: otpCode,
          expiresAt,
        },
      } as any);

      console.log(`\n==============================================`);
      console.log(`[SUPER ADMIN OTP SENT] Phone: ${normalizedPhone} | Code: ${otpCode}`);
      console.log(`==============================================\n`);

      // Send SMS via Melipayamak
      const smsResult = await sendOtpSms(normalizedPhone, otpCode);

      if (!smsResult.success) {
        console.warn(`[WARN] [SUPER-ADMIN OTP/SMS]: SMS send failed. Error: ${smsResult.error}`);
        if (process.env.NODE_ENV === 'production') {
          return NextResponse.json(
            { error: 'خطا در ارسال پیامک کد تایید. لطفا مجددا تلاش کنید.' },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: 'کد تایید ارسال شد',
        ...(process.env.NODE_ENV !== 'production' && { devCode: otpCode })
      });
    }

    if (action === 'change-password') {
      if (!currentPassword || !newPassword || !phone || !code) {
        return NextResponse.json(
          { error: 'تمام فیلدها الزامی هستند' },
          { status: 400 }
        );
      }

      let normalizedPhone = phone.trim();
      if (normalizedPhone.startsWith('+98')) {
        normalizedPhone = '0' + normalizedPhone.substring(3);
      } else if (normalizedPhone.startsWith('98') && normalizedPhone.length === 11) {
        normalizedPhone = '0' + normalizedPhone.substring(2);
      } else if (normalizedPhone.startsWith('9') && normalizedPhone.length === 10) {
        normalizedPhone = '0' + normalizedPhone;
      }

      // Verify OTP code
      const otpRecord = await prisma.otp.findFirst({
        where: {
          phone: normalizedPhone,
          code: code.trim(),
          shopId: 'system',
          expiresAt: {
            gte: new Date(),
          },
        },
        allowCrossTenant: true,
      } as any);

      if (!otpRecord) {
        return NextResponse.json(
          { error: 'کد تایید نادرست یا منقضی شده است' },
          { status: 400 }
        );
      }

      // Delete the OTP record so it can't be reused
      await prisma.otp.deleteMany({
        where: {
          phone: normalizedPhone,
          shopId: 'system',
        },
        allowCrossTenant: true,
      } as any);

      // Find the superadmin user in the database
      const user = await prisma.user.findFirst({
        where: { role: 'superadmin' },
        allowCrossTenant: true,
      } as any);

      const hashedNewPassword = await bcrypt.hash(newPassword, 10);

      if (user) {
        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
          return NextResponse.json(
            { error: 'رمز عبور فعلی نادرست است' },
            { status: 400 }
          );
        }

        // Update user
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedNewPassword,
            phone: normalizedPhone,
          },
        } as any);
      } else {
        // Verify current password against hardcoded fallback
        if (currentPassword !== 'admin123') {
          return NextResponse.json(
            { error: 'رمز عبور فعلی نادرست است' },
            { status: 400 }
          );
        }

        // Create a new superadmin user in the database
        await prisma.user.create({
          data: {
            email: 'admin@admin.com',
            password: hashedNewPassword,
            phone: normalizedPhone,
            role: 'superadmin',
            shopId: 'system',
            name: 'مدیر اصلی پلتفرم',
          },
        } as any);
      }

      return NextResponse.json({
        success: true,
        message: 'رمز عبور با موفقیت تغییر یافت',
      });
    }

    return NextResponse.json({ error: 'اکشن نامعتبر است' }, { status: 400 });
  } catch (error) {
    console.error('[ERROR] [ChangePasswordRoute]: Exception in route |', error);
    return NextResponse.json(
      { error: 'خطای سرور در تغییر رمز عبور' },
      { status: 500 }
    );
  }
}
