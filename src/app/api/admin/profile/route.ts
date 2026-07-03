import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { id: decoded.id as string, shopId: decoded.shopId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        shopId: true,
        isBlocked: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json({ error: 'حساب کاربری شما مسدود شده است.' }, { status: 403 });
    }

    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: decoded.shopId },
      select: { shopName: true, productType: true, isApproved: true, isActive: true, subdomain: true, customDomain: true, package: true, packageExpiresAt: true, hasDemoData: true, setupWizardCompleted: true, mahakEnabled: true }
    });

    return NextResponse.json({ 
      user,
      shopName: shopSettings?.shopName || '',
      productType: shopSettings?.productType || 'both',
      isApproved: shopSettings?.isApproved ?? false,
      isActive: shopSettings?.isActive ?? true,
      subdomain: shopSettings?.subdomain || '',
      customDomain: shopSettings?.customDomain || '',
      hasDemoData: shopSettings?.hasDemoData ?? false,
      setupWizardCompleted: shopSettings?.setupWizardCompleted ?? false,
      activePackage: shopSettings?.packageExpiresAt && new Date(shopSettings.packageExpiresAt) > new Date() ? shopSettings.package : null,
      mahakEnabled: shopSettings?.mahakEnabled ?? false,
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, email, currentPassword, newPassword, avatarUrl, shopName } = data;

    const user = await prisma.user.findFirst({
      where: { id: decoded.id as string, shopId: decoded.shopId },
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

    await prisma.user.updateMany({
      where: { id: decoded.id as string, shopId: decoded.shopId },
      data: updateData,
    });

    const updatedUser = await prisma.user.findFirst({
      where: { id: decoded.id as string, shopId: decoded.shopId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
    });

    if (shopName !== undefined) {
      await prisma.shopSettings.upsert({
        where: { shopId: decoded.shopId },
        update: { shopName },
        create: {
          shopId: decoded.shopId,
          shopName,
          isApproved: true,
        }
      });
    }

    return NextResponse.json({ success: true, user: updatedUser, shopName });
  } catch (error: any) {
    console.error('Error updating admin profile:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'این ایمیل قبلا ثبت شده است.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
