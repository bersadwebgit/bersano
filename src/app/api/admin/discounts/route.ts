import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = adminUser.shopId;

    const discounts = await prisma.discountCode.findMany({
      where: { shopId },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ discounts });
  } catch (error) {
    console.error('Error fetching discounts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = adminUser.shopId;

    const body = await request.json();
    const { 
      code, 
      discount, 
      type, 
      maxUses, 
      isActive, 
      expiresAt, 
      startDate, 
      minOrderAmount, 
      minQuantity,
      maxDiscountAmount, 
      maxUsesPerUser, 
      firstOrderOnly,
      targetCategoryIds,
      targetProductIds,
      allowedGender,
      targetUserId
    } = body;

    if (!code || discount === undefined) {
      return NextResponse.json({ error: 'کد تخفیف و مقدار تخفیف الزامی هستند' }, { status: 400 });
    }

    // Check if code already exists for this shop
    const existing = await prisma.discountCode.findFirst({
      where: {
        shopId,
        code: { equals: code.trim() }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'این کد تخفیف قبلاً تعریف شده است' }, { status: 400 });
    }

    const discountCode = await prisma.discountCode.create({
      data: {
        shopId,
        code: code.trim().toUpperCase(),
        discount: parseFloat(discount),
        type: type || 'percentage',
        maxUses: maxUses ? parseInt(maxUses) : null,
        usedCount: 0,
        isActive: isActive !== undefined ? isActive : true,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        startDate: startDate ? new Date(startDate) : null,
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        minQuantity: minQuantity ? parseInt(minQuantity) : null,
        maxDiscountAmount: maxDiscountAmount ? parseFloat(maxDiscountAmount) : null,
        maxUsesPerUser: maxUsesPerUser ? parseInt(maxUsesPerUser) : 1,
        firstOrderOnly: firstOrderOnly || false,
        targetCategoryIds: targetCategoryIds || "[]",
        targetProductIds: targetProductIds || "[]",
        allowedGender: allowedGender || "all",
        targetUserId: targetUserId || ""
      }
    });

    return NextResponse.json({ discountCode });
  } catch (error) {
    console.error('Error creating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
