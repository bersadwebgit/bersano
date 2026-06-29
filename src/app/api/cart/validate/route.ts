import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { calculateWholesalePrice } from '@/lib/wholesale';

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request, 'customer');
    
    if (!user || !user.id || !user.shopId) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    const dbUser = await prisma.user.findFirst({
      where: { 
        id: user.id,
        shopId: user.shopId
      }
    });

    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: user.shopId }
    });

    const isWholesaleActive = !!(shopSettings?.wholesaleEnabled && dbUser?.isWholesaler);

    const { items } = await request.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'اطلاعات نامعتبر است' }, { status: 400 });
    }

    const productIds = items.map((i: any) => i.productId);
    
    const dbProducts = await prisma.product.findMany({
      where: { 
        id: { in: productIds },
        shopId: user.shopId as string
      },
      include: { variants: true }
    });

    const validatedItems = items.map((item: any) => {
      const dbProduct = dbProducts.find(p => p.id === item.productId);
      
      if (!dbProduct) {
        return { ...item, stockStatus: 'out_of_stock', currentStock: 0 };
      }
      
      let currentStock = dbProduct.stock;
      let originalPrice = dbProduct.price;
      
      if (item.variantId) {
        const variant = dbProduct.variants.find(v => v.id === item.variantId);
        if (!variant) {
          return { ...item, stockStatus: 'out_of_stock', currentStock: 0 };
        }
        currentStock = variant.stock;
        originalPrice = variant.price;
      }
      
      const discount = dbProduct.discount || 0;
      const discountMinQty = dbProduct.discountMinQty || 0;
      const isDiscountEligible = discount > 0 && (discountMinQty === 0 || item.quantity >= discountMinQty);
      let price = isDiscountEligible ? originalPrice - discount : originalPrice;
      
      if (isWholesaleActive) {
        const wholesalePriceObj = calculateWholesalePrice({
          price: originalPrice,
          discount: dbProduct.discount,
          wholesalePrice: dbProduct.wholesalePrice,
          wholesaleTiers: dbProduct.wholesaleTiers,
          wholesaleExclusivePrices: dbProduct.wholesaleExclusivePrices
        }, item.quantity, dbUser);
        price = wholesalePriceObj.unitPrice;
        originalPrice = wholesalePriceObj.originalPrice;
      }
      
      let stockStatus = 'in_stock';
      if (currentStock <= 0) {
        stockStatus = 'out_of_stock';
      } else if (currentStock < item.quantity) {
        stockStatus = 'not_enough';
      }
      
      return {
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        currentStock,
        stockStatus,
        price,
        originalPrice,
        discount: isDiscountEligible ? discount : 0,
        discountMinQty,
        categoryId: dbProduct.categoryId,
        type: dbProduct.type
      };
    });

    return NextResponse.json({ items: validatedItems });
  } catch (error: any) {
    console.error('Cart validation error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
