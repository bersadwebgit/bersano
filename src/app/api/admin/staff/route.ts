import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';
import { ADMIN_ROLES } from '@/lib/admin-roles';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId || payload.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const staff = await prisma.user.findMany({
      where: {
        shopId: payload.shopId,
        role: { in: ADMIN_ROLES },
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId || payload.role !== 'admin') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    const data = await req.json();
    const { name, email, phone, password, role } = data;

    if (!email || !password || !role) {
      return NextResponse.json({ error: 'ایمیل، رمز عبور و نقش الزامی هستند' }, { status: 400 });
    }

    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'نقش انتخاب شده نامعتبر است' }, { status: 400 });
    }

    // Fetch active package features and current staff count to enforce limits
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: payload.shopId as string },
      include: { package: true }
    });

    const isPackageActive = shopSettings?.packageExpiresAt ? new Date(shopSettings.packageExpiresAt) > new Date() : false;
    const activePackage = isPackageActive ? shopSettings?.package : null;
    
    let staffEnabled = false;
    let maxStaff = 0;

    if (activePackage) {
      try {
        const features = JSON.parse(activePackage.features);
        staffEnabled = !!features.staffEnabled;
        if (features.maxStaff && features.maxStaff > 0) {
          maxStaff = parseInt(features.maxStaff);
        }
      } catch (e) {
        console.error("Error parsing package features:", e);
      }
    }

    if (!staffEnabled) {
      return NextResponse.json({ 
        error: 'قابلیت مدیریت همکاران در پکیج فعلی شما فعال نیست. برای استفاده از این قابلیت، لطفا پکیج خود را ارتقا دهید.' 
      }, { status: 403 });
    }

    if (maxStaff > 0) {
      const currentStaffCount = await prisma.user.count({
        where: {
          shopId: payload.shopId,
          role: { in: ADMIN_ROLES },
        },
      });

      if (currentStaffCount >= maxStaff) {
        return NextResponse.json({ 
          error: `شما به حد نصاب تعریف همکار پکیج خود (${maxStaff} همکار) رسیده‌اید. برای افزایش ظرفیت، لطفاً پکیج خود را ارتقا دهید.` 
        }, { status: 403 });
      }
    }

    // Check if user already exists in this shop
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        shopId: payload.shopId,
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'کاربری با این ایمیل در فروشگاه شما از قبل وجود دارد' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newStaff = await prisma.user.create({
      data: {
        shopId: payload.shopId,
        email: email.toLowerCase(),
        password: hashedPassword,
        name: name || null,
        phone: phone || null,
        role,
        isBlocked: false,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isBlocked: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, staff: newStaff }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
