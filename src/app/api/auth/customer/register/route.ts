import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getTenantShop } from '@/lib/tenant';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: Request) {
  try {
    const { email, password, name, phone } = await request.json();

    if (!email || !password || !name || !phone) {
      return NextResponse.json(
        { error: 'نام، ایمیل، شماره تماس و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json(
        { error: 'فروشگاهی یافت نشد' },
        { status: 500 }
      );
    }

    // Check if user already exists in this shop
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, shopId: shop.shopId },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'این ایمیل قبلا ثبت نام کرده است' },
        { status: 400 }
      );
    }

    // Check if user already exists with this phone in this shop
    const existingUserByPhone = await prisma.user.findFirst({
      where: { phone, shopId: shop.shopId },
    });

    if (existingUserByPhone) {
      return NextResponse.json(
        { error: 'این شماره تماس قبلا ثبت نام کرده است' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone,
        role: 'customer',
        shopId: shop.shopId,
      },
    });

    // Send welcome SMS notification asynchronously (non-blocking)
    if (phone) {
      const { sendStoreSms } = await import('@/lib/sms');
      sendStoreSms(shop.shopId, 'new_registration', phone, {
        customerName: name,
      }).catch(err => console.error('[ERROR] [SMS]: Failed to send welcome SMS |', err));
    }

    // Generate JWT
    const token = await new SignJWT({ 
      id: user.id, 
      email: user.email, 
      shopId: user.shopId,
      role: user.role 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('30d')
      .sign(key);

    // Create response with cookie
    const response = NextResponse.json({ 
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    });
    
    const isSecure = request.url.startsWith('https://') || request.headers.get('x-forwarded-proto') === 'https';

    response.cookies.set({
      name: 'customer_token',
      value: token,
      httpOnly: true,
      path: '/',
      secure: isSecure,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error('Customer registration error:', error);
    return NextResponse.json(
      { error: 'خطای سرور' },
      { status: 500 }
    );
  }
}
