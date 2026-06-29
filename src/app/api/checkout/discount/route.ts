import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { code, cartTotal, items } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'کد تخفیف الزامی است' }, { status: 400 });
    }

    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    // Case-insensitive search for code
    const discount = await prisma.discountCode.findFirst({
      where: { 
        code: { equals: code.trim() }, 
        isActive: true,
        shopId: shop.shopId
      },
    });

    if (!discount) {
      return NextResponse.json({ error: 'کد تخفیف نامعتبر یا غیرفعال است' }, { status: 404 });
    }

    const now = new Date();

    // 1. Check Start Date
    if (discount.startDate && discount.startDate > now) {
      return NextResponse.json({ error: 'زمان استفاده از این کد تخفیف هنوز شروع نشده است' }, { status: 400 });
    }

    // 2. Check Expiration Date
    if (discount.expiresAt && discount.expiresAt < now) {
      return NextResponse.json({ error: 'کد تخفیف منقضی شده است' }, { status: 400 });
    }

    // 3. Check Max Uses
    if (discount.maxUses && discount.usedCount >= discount.maxUses) {
      return NextResponse.json({ error: 'ظرفیت استفاده از این کد تخفیف تکمیل شده است' }, { status: 400 });
    }

    // 4. Try to verify user for user-specific limits & gender restriction
    let user = null;
    try {
      user = await verifyAuth(request, 'customer');
    } catch (e) {
      // Ignore auth error here since user might be applying code in cart before logging in
    }

    const dbUser = user && user.id ? await prisma.user.findFirst({ where: { id: user.id, shopId: user.shopId } }) : null;

    // 4.5 Check target user restriction
    if (discount.targetUserId) {
      if (!dbUser) {
        return NextResponse.json({ error: 'این کد تخفیف مخصوص یک مشتری خاص است. جهت استفاده ابتدا باید وارد حساب کاربری خود شوید' }, { status: 400 });
      }
      if (dbUser.id !== discount.targetUserId) {
        return NextResponse.json({ error: 'این کد تخفیف مخصوص یک مشتری خاص است و برای حساب کاربری شما معتبر نیست' }, { status: 400 });
      }
    }

    // 5. Check gender restriction
    if (discount.allowedGender && discount.allowedGender !== 'all') {
      if (!dbUser) {
        return NextResponse.json({ error: 'جهت استفاده از این کد تخفیف ابتدا باید وارد حساب کاربری خود شوید' }, { status: 400 });
      }
      if (!dbUser.gender) {
        return NextResponse.json({ error: 'لطفاً ابتدا جنسیت خود را در صفحه حساب کاربری تکمیل کنید' }, { status: 400 });
      }
      if (dbUser.gender !== discount.allowedGender) {
        return NextResponse.json({ error: 'این کد تخفیف با جنسیت حساب کاربری شما همخوانی ندارد' }, { status: 400 });
      }
    }

    // 6. Check Category Restrictions and calculate correct eligible cartTotal
    let finalMinOrderTotal = cartTotal || 0;

    if (discount.targetCategoryIds) {
      try {
        const allowedCats = JSON.parse(discount.targetCategoryIds);
        if (Array.isArray(allowedCats) && allowedCats.length > 0) {
          if (!items || items.length === 0) {
            return NextResponse.json({ error: 'اطلاعات سبد خرید جهت بررسی محدودیت دسته‌بندی دریافت نشد' }, { status: 400 });
          }

          const productIds = items.map((i: any) => i.productId);
          const products = await prisma.product.findMany({
            where: { 
              id: { in: productIds },
              shopId: shop.shopId
            },
            select: { id: true, categoryId: true }
          });

          const eligibleItems = items.filter((item: any) => {
            const prod = products.find(p => p.id === item.productId);
            return prod?.categoryId && allowedCats.includes(prod.categoryId);
          });

          if (eligibleItems.length === 0) {
            return NextResponse.json({ 
              error: 'این کد تخفیف فقط برای دسته‌بندی‌های خاصی معتبر است و محصولی از این دسته‌بندی‌ها در سبد خرید شما نیست' 
            }, { status: 400 });
          }

          // Calculate total of only eligible items
          const eligibleTotal = eligibleItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
          finalMinOrderTotal = eligibleTotal;
        }
      } catch (e) {
        console.error('Error validating category restrictions:', e);
      }
    }

    // 7. Check Minimum Order Amount (using eligible items subtotal if restricted, otherwise cart total)
    if (discount.minOrderAmount && finalMinOrderTotal < discount.minOrderAmount) {
      const minAmountStr = discount.minOrderAmount.toLocaleString('fa-IR');
      if (discount.targetCategoryIds && JSON.parse(discount.targetCategoryIds).length > 0) {
        return NextResponse.json({ 
          error: `مجموع اقلام دسته‌بندی‌های مجاز برای این تخفیف باید حداقل ${minAmountStr} تومان باشد` 
        }, { status: 400 });
      } else {
        return NextResponse.json({ 
          error: `حداقل مبلغ خرید برای استفاده از این کد تخفیف ${minAmountStr} تومان است` 
        }, { status: 400 });
      }
    }

    if (dbUser) {
      // 8. Check First Order Only
      if (discount.firstOrderOnly) {
        const orderCount = await prisma.order.count({
          where: {
            userId: dbUser.id,
            shopId: shop.shopId,
            paymentStatus: 'paid'
          }
        });
        if (orderCount > 0) {
          return NextResponse.json({ error: 'این کد تخفیف فقط برای اولین خرید معتبر است' }, { status: 400 });
        }
      }

      // 9. Check Max Uses Per User
      if (discount.maxUsesPerUser) {
        const userUsedCount = await prisma.order.count({
          where: {
            userId: dbUser.id,
            shopId: shop.shopId,
            discountCode: discount.code,
            paymentStatus: { in: ['paid', 'pending'] }
          }
        });
        if (userUsedCount >= discount.maxUsesPerUser) {
          return NextResponse.json({ 
            error: `شما قبلاً از این کد تخفیف استفاده کرده‌اید (حد مجاز: ${discount.maxUsesPerUser} بار)` 
          }, { status: 400 });
        }
      }
    }

    return NextResponse.json({ success: true, discount });
  } catch (error) {
    console.error('Discount error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
