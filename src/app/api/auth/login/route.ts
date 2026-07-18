import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getTenantShop } from '@/lib/tenant';
import { isAdminRole } from '@/lib/admin-roles';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ایمیل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    const shop = await getTenantShop(undefined, true);
    if (!shop) {
      return NextResponse.json({ error: 'فروشگاهی یافت نشد' }, { status: 500 });
    }

    // Find user
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, shopId: shop.shopId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'ایمیل یا رمز عبور اشتباه است' },
        { status: 401 }
      );
    }

    // Check if user is blocked
    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'حساب کاربری شما مسدود شده است. لطفا با پشتیبانی تماس بگیرید.' },
        { status: 403 }
      );
    }

    if (!isAdminRole(user.role)) {
      return NextResponse.json(
        { error: 'شما دسترسی به پنل مدیریت ندارید' },
        { status: 403 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'ایمیل یا رمز عبور اشتباه است' },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      shopId: user.shopId,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('1d')
      .sign(key);

    // Create response with cookie
    const response = NextResponse.json({ success: true });
    
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'admin_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 1 day
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'خطای سرور' },
      { status: 500 }
    );
  }
}
