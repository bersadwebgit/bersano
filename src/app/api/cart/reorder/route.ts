import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const tokenUser = await verifyAuth(req, 'customer');
    if (!tokenUser || !tokenUser.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { orderId } = data;

    if (!orderId) {
      return NextResponse.json({ error: 'شناسه سفارش الزامی است' }, { status: 400 });
    }

    // Fetch the past order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: tokenUser.id,
        shopId: tokenUser.shopId,
      },
      include: {
        items: {
          include: {
            product: {
              include: {
                variants: true,
              },
            },
            variant: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'سفارش یافت نشد' }, { status: 404 });
    }

    const itemsToAdd: any[] = [];
    const skippedItems: string[] = [];

    for (const item of order.items) {
      const product = item.product;

      // 1. Check if product exists and is active
      if (!product || !product.isActive) {
        skippedItems.push(item.product?.title || 'محصول نامشخص');
        continue;
      }

      // 2. Check stock
      let availableStock = product.stock;
      let variantObj = null;

      if (item.variantId) {
        variantObj = product.variants.find(v => v.id === item.variantId);
        if (!variantObj) {
          skippedItems.push(`${product.title} (تنوع نامشخص)`);
          continue;
        }
        availableStock = variantObj.stock;
      }

      if (availableStock <= 0) {
        skippedItems.push(`${product.title}${variantObj ? ` (${variantObj.name})` : ''} (ناموجود)`);
        continue;
      }

      // 3. Determine quantity (respect MOQ)
      const moq = product.moq || 1;
      let quantity = item.quantity;
      if (quantity < moq) {
        quantity = moq;
      }

      // Cap quantity to available stock
      if (quantity > availableStock) {
        quantity = availableStock;
      }

      if (quantity <= 0) {
        skippedItems.push(`${product.title}${variantObj ? ` (${variantObj.name})` : ''} (ناموجود)`);
        continue;
      }

      // 4. Construct CartItem object
      const cartItemId = item.variantId ? `${product.id}-${item.variantId}` : product.id;
      itemsToAdd.push({
        id: cartItemId,
        productId: product.id,
        variantId: item.variantId || undefined,
        categoryId: product.categoryId,
        title: product.title,
        price: variantObj ? variantObj.price : product.price,
        discount: product.discount || 0,
        imageUrl: product.imageUrl || '/placeholder.png',
        quantity,
        stockStatus: 'in_stock',
        currentStock: availableStock,
        type: product.type,
        moq,
        wholesaleUnitSize: product.wholesaleUnitSize,
        isWholesaleOnly: product.isWholesaleOnly,
        discountMinQty: product.discountMinQty,
        colorName: variantObj?.name || undefined,
        colorCode: variantObj?.colorCode || undefined,
      });
    }

    return NextResponse.json({
      success: true,
      itemsToAdd,
      skippedItems,
    });
  } catch (error) {
    console.error('Error reordering cart items:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
