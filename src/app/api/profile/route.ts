import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { 
        id: tokenUser.id as string,
        shopId: tokenUser.shopId as string
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthDate: true,
        gender: true,
        role: true,
        avatarUrl: true,
        shopId: true,
        isBlocked: true,
        isWholesaler: true,
        creditLimit: true,
        creditBalance: true,
        wholesaleGroup: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: 'حساب کاربری شما مسدود شده است.' }, { status: 403 });
    }

    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: user.shopId },
      select: { shopName: true, subdomain: true, customDomain: true, productType: true, wholesaleEnabled: true, contactPhone: true }
    });

    return NextResponse.json({ 
      user,
      shopName: shopSettings?.shopName || '',
      subdomain: shopSettings?.subdomain || '',
      customDomain: shopSettings?.customDomain || '',
      productType: shopSettings?.productType || 'both',
      wholesaleEnabled: shopSettings?.wholesaleEnabled || false,
      contactPhone: shopSettings?.contactPhone || ''
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, phone, email, birthDate, gender, currentPassword, newPassword, avatarUrl, shopName } = data;

    const user = await prisma.user.findUnique({
      where: { 
        id: tokenUser.id as string,
        shopId: tokenUser.shopId as string
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: 'حساب کاربری شما مسدود شده است.' }, { status: 403 });
    }

    const updateData: any = {
      name,
      email,
      birthDate,
      gender,
    };

    if (avatarUrl !== undefined) {
      updateData.avatarUrl = avatarUrl;
    }

    // If changing password
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'برای تغییر رمز عبور، وارد کردن رمز عبور فعلی الزامی است' }, { status: 400 });
      }
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return NextResponse.json({ error: 'رمز عبور فعلی اشتباه است' }, { status: 400 });
      }
      updateData.password = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { 
        id: tokenUser.id as string,
        shopId: tokenUser.shopId as string
      } as any,
      data: updateData,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        birthDate: true,
        gender: true,
        role: true,
        avatarUrl: true,
      }
    });

    if (shopName !== undefined) {
      await prisma.shopSettings.upsert({
        where: { shopId: user.shopId },
        update: { shopName },
        create: {
          shopId: user.shopId,
          shopName,
          isApproved: true,
        }
      });
    }

    return NextResponse.json({ success: true, user: updatedUser, shopName });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'این ایمیل قبلا ثبت شده است.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
