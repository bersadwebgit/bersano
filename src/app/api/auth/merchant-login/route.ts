import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLES } from '@/lib/admin-roles';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'ایمیل و رمز عبور الزامی است' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { 
        email: email.toLowerCase(), 
        role: { in: [...ADMIN_ROLES] },
      },
      allowCrossTenant: true,
    } as any);

    if (!user) {
      return NextResponse.json(
        { error: 'حساب کاربری با این مشخصات یافت نشد.' },
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

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        { error: 'رمز عبور اشتباه است.' },
        { status: 401 }
      );
    }

    // Get the shop settings to find the subdomain
    const shop = await prisma.shopSettings.findUnique({
      where: { shopId: user.shopId },
      select: { subdomain: true, isApproved: true, isActive: true }
    });

    if (!shop) {
      return NextResponse.json(
        { error: 'فروشگاه مربوط به این حساب یافت نشد.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      subdomain: shop.subdomain,
      isApproved: shop.isApproved,
      isActive: shop.isActive
    });

  } catch (error) {
    console.error('Merchant login error:', error);
    return NextResponse.json(
      { error: 'خطای سرور' },
      { status: 500 }
    );
  }
}
