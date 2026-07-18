import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getTenantShop } from '@/lib/tenant';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'ایمیل و رمز عبور الزامی است' }, { status: 400 });
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'فروشگاهی یافت نشد' }, { status: 500 });
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, shopId: shop.shopId },
    });

    if (!user || user.role !== 'customer') {
      return NextResponse.json({ error: 'ایمیل یا رمز عبور اشتباه است' }, { status: 401 });
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: 'حساب کاربری شما مسدود شده است. لطفا با پشتیبانی فروشگاه تماس بگیرید.' },
        { status: 403 }
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: 'ایمیل یا رمز عبور اشتباه است' }, { status: 401 });
    }

    const token = await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      shopId: user.shopId,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(key);

    const response = NextResponse.json({ success: true, user: { id: user.id, name: user.name, email: user.email } });
    
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'customer_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isSecure,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Customer login error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}