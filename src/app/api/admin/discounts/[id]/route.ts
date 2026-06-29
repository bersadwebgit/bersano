import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = adminUser.shopId;

    const { id } = await params;
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

    // Check if discount code exists and belongs to this shop
    const existing = await prisma.discountCode.findFirst({
      where: {
        id,
        shopId
      }
    });

    if (!existing) {
      return NextResponse.json({ error: 'کد تخفیف یافت نشد' }, { status: 404 });
    }

    const duplicate = await prisma.discountCode.findFirst({
      where: {
        shopId: shopId,
        code: { equals: code.trim() },
        id: { not: id }
      }
    });

    if (duplicate) {
      return NextResponse.json({ error: 'این کد تخفیف قبلاً روی یک کوپن دیگر تعریف شده است' }, { status: 400 });
    }

    const updatedDiscount = await prisma.discountCode.update({
      where: {
        id,
        shopId,
      },
      data: {
        code: code.trim().toUpperCase(),
        discount: parseFloat(discount),
        type: type || 'percentage',
        maxUses: maxUses ? parseInt(maxUses) : null,
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
        targetUserId: targetUserId || null
      }
    });

    return NextResponse.json({ discountCode: updatedDiscount });
  } catch (error) {
    console.error('Error updating discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    if (!adminUser || !adminUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const shopId = adminUser.shopId;

    const { id } = await params;

    // Verify discount code belongs to shop
    const discount = await prisma.discountCode.findFirst({
      where: {
        id,
        shopId
      }
    });

    if (!discount) {
      return NextResponse.json({ error: 'کد تخفیف یافت نشد' }, { status: 404 });
    }

    await prisma.discountCode.delete({
      where: {
        id,
        shopId,
      }
    });

    return NextResponse.json({ success: true, message: 'کد تخفیف با موفقیت حذف شد' });
  } catch (error) {
    console.error('Error deleting discount code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
