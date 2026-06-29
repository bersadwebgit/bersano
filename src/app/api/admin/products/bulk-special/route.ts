import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { productIds, isSpecial, discount, specialEndsAt, confirmed } = data;

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'Product IDs are required and must be an array' }, { status: 400 });
    }

    if (!confirmed) {
      // Fetch products to show diff
      const products = await prisma.product.findMany({
        where: {
          shopId: payload.shopId,
          id: { in: productIds },
        },
        select: { id: true, title: true, price: true }
      });

      return NextResponse.json({
        needsConfirmation: true,
        message: `آیا از اعمال تغییرات گروهی روی ${products.length} محصول اطمینان دارید؟`,
        diff: {
          action: isSpecial ? 'apply_discount' : 'remove_discount',
          products: products.map(p => ({ id: p.id, title: p.title, price: p.price })),
          discount: discount,
          specialEndsAt: specialEndsAt
        }
      });
    }

    // Prepare update data
    const updateData: any = {
      isSpecial: !!isSpecial,
    };

    if (isSpecial) {
      if (discount !== undefined && discount !== null) {
        updateData.discount = parseFloat(discount);
      }
      if (specialEndsAt) {
        updateData.specialEndsAt = new Date(specialEndsAt);
      } else {
        // Default: 24 hours from now
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);
        updateData.specialEndsAt = tomorrow;
      }
    } else {
      updateData.specialEndsAt = null;
    }

    // Update products in database
    const updateResult = await prisma.product.updateMany({
      where: {
        shopId: payload.shopId,
        id: { in: productIds },
      },
      data: updateData,
    });

    return NextResponse.json({ 
      success: true, 
      count: updateResult.count,
      message: `${updateResult.count} محصول با موفقیت ویرایش شدند.`
    });
  } catch (error: any) {
    console.error('[ERROR] [BulkSpecialDeals]:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
