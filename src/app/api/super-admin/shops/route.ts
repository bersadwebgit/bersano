import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

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

export async function GET() {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const shops = await prisma.shopSettings.findMany({
      orderBy: { createdAt: 'desc' },
      include: { package: true },
      allowCrossTenant: true
    } as any);

    // Get user for each shop (the owner) and calculate stats
    const shopsWithUsers = await Promise.all(shops.map(async (shop) => {
      const user = await prisma.user.findFirst({
        where: { shopId: shop.shopId, role: 'admin' },
        select: { email: true, name: true, phone: true }
      });

      const productCount = await prisma.product.count({
        where: { shopId: shop.shopId }
      });

      const orderCount = await prisma.order.count({
        where: { shopId: shop.shopId }
      });

      const customerCount = await prisma.user.count({
        where: { shopId: shop.shopId, role: 'customer' }
      });

      const salesAggregate = await prisma.order.aggregate({
        where: { shopId: shop.shopId, paymentStatus: 'paid' },
        _sum: { finalAmount: true }
      });

      const totalSales = salesAggregate._sum.finalAmount || 0;

      return { 
        ...shop, 
        owner: user,
        stats: {
          productCount,
          orderCount,
          customerCount,
          totalSales
        }
      };
    }));

    return NextResponse.json(shopsWithUsers);
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const admin = await verifySuperAdmin();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { shopName, subdomain, ownerName, ownerEmail, ownerPassword } = body;

    if (!shopName || !subdomain || !ownerEmail || !ownerPassword) {
      return NextResponse.json({ error: 'لطفا تمام فیلدهای ضروری را پر کنید.' }, { status: 400 });
    }

    const normalizedSubdomain = subdomain.toLowerCase().trim();
    const normalizedEmail = ownerEmail.toLowerCase().trim();

    // Validate subdomain format (only alphanumeric and hyphens, no spaces, lowercase)
    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(normalizedSubdomain)) {
      return NextResponse.json(
        { error: 'ساب‌دامین فقط می‌تواند شامل حروف کوچک انگلیسی، اعداد و خط تیره (-) باشد.' },
        { status: 400 }
      );
    }

    // Check if subdomain is reserved
    const reservedSubdomains = ['admin', 'super-admin', 'api', 'www', 'mail', 'blog', 'shop', 'setup'];
    if (reservedSubdomains.includes(normalizedSubdomain)) {
      return NextResponse.json(
        { error: 'این ساب‌دامین رزرو شده است و قابل استفاده نیست.' },
        { status: 400 }
      );
    }

    // Check if subdomain exists
    const existingShop = await prisma.shopSettings.findUnique({
      where: { subdomain: normalizedSubdomain },
      allowCrossTenant: true
    } as any);

    if (existingShop) {
      return NextResponse.json({ error: 'این ساب‌دامین قبلاً ثبت شده است.' }, { status: 400 });
    }

    // Check if user email exists
    const existingUser = await prisma.user.findFirst({
      where: { email: normalizedEmail },
      allowCrossTenant: true
    } as any);

    if (existingUser) {
      return NextResponse.json({ error: 'این ایمیل قبلاً در سیستم ثبت شده است.' }, { status: 400 });
    }

    // Generate unique shopId
    const shopId = `shop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const hashedPassword = await bcrypt.hash(ownerPassword, 10);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: ownerName || null,
          shopId,
          role: 'admin',
        }
      });

      const shop = await tx.shopSettings.create({
        data: {
          shopId,
          shopName,
          subdomain: normalizedSubdomain,
          isApproved: true, // Auto-approve since super admin creates it
          isActive: true,
          themeColor: '#2563eb',
        }
      });

      return { user, shop };
    });

    return NextResponse.json({ success: true, shop: result.shop });
  } catch (error: any) {
    console.error('Error creating shop:', error);
    return NextResponse.json({ 
      error: `خطای سرور در ایجاد فروشگاه: ${error?.message || String(error)}` 
    }, { status: 500 });
  }
}
