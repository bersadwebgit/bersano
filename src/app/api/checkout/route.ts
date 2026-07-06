import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { calculateWholesalePrice } from '@/lib/wholesale';
import crypto from 'crypto';
import { sendBaleBotMessage } from '@/lib/bale';
import { sendTelegramBotMessage } from '@/lib/telegram';
import { getDigipayToken, createDigipayTicket } from '@/lib/digipay';
import { sendStoreSms } from '@/lib/sms';

class CheckoutError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function POST(request: Request) {
  try {
    const user = await verifyAuth(request, 'customer');
    
    if (!user || !user.id || !user.shopId) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      items, 
      discountCode, 
      userNotes, 
      address, 
      deliverToOther, 
      otherReceiverName, 
      otherReceiverPhone,
      buyerName,
      buyerEmail,
      buyerPhone,
      isDigital,
      paymentMethod = 'online',
      onlineGateway = 'zarinpal',
      cardToCardReceipt = null,
      cardToCardCode = null,
      cardToCardSenderCard = null,
      cardToCardReceiverCard = null,
      cardToCardTime = null,
      shippingCarrier = 'post',
      shippingCost = 0,
      officialInvoice = false,
      wholesalePaymentType = null
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'سبد خرید خالی است' }, { status: 400 });
    }

    // Idempotency check
    let idempotencyKey = request.headers.get('idempotency-key') || body.idempotencyKey;
    if (!idempotencyKey) {
      // Generate based on order context to prevent double-clicks
      const sortedItems = [...(items || [])].sort((a, b) => 
        (String(a.productId) + String(a.variantId || '')).localeCompare(String(b.productId) + String(b.variantId || ''))
      );
      const contextStr = `${user.id}-${user.shopId}-${JSON.stringify(sortedItems)}-${discountCode || ''}-${paymentMethod}-${onlineGateway}`;
      idempotencyKey = crypto.createHash('sha256').update(contextStr).digest('hex');
    }

    const existingOrder = await prisma.order.findFirst({
      where: {
        shopId: user.shopId as string,
        idempotencyKey: idempotencyKey
      },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (existingOrder) {
      console.log(`[INFO] [Checkout] Duplicate request detected. Returning existing order. | { orderId: "${existingOrder.id}", idempotencyKey: "${idempotencyKey}" }`);
      
      if (existingOrder.paymentStatus === 'paid') {
        const downloadTokens = await prisma.downloadToken.findMany({
          where: { 
            shopId: user.shopId as string,
            orderId: existingOrder.id 
          }
        });
        const mappedTokens = downloadTokens.map(t => {
          const item = existingOrder.items.find(i => i.productId === t.productId);
          return {
            token: t.token,
            productTitle: item?.product?.title || 'محصول دیجیتال',
            fileSize: item?.product?.fileSize || 'مشخص نشده',
            fileFormat: item?.product?.fileFormat || 'ZIP',
            maxDownloads: t.maxDownloads,
            expiresAt: t.expiresAt ? new Date(t.expiresAt).toLocaleDateString('fa-IR') : null
          };
        });
        return NextResponse.json({ success: true, orderId: existingOrder.id, downloadTokens: mappedTokens });
      }

      const isOnlinePayment = existingOrder.paymentMethod === 'online' || existingOrder.paymentMethod === 'deposit';
      if (isOnlinePayment) {
        if (existingOrder.paymentAuthority) {
          const settings = await prisma.shopSettings.findUnique({
            where: { shopId: user.shopId as string }
          });
          
          if (settings) {
            const useZibal = settings.zibalEnabled && settings.zibalMerchantId && (onlineGateway === 'zibal' || !settings.zarinpalEnabled);
            const useZarinpal = settings.zarinpalEnabled && settings.zarinpalMerchantId && (onlineGateway === 'zarinpal' || !settings.zibalEnabled);
            const useDigipay = settings.digipayEnabled && onlineGateway === 'digipay';

            if (useZibal) {
              return NextResponse.json({
                success: true,
                orderId: existingOrder.id,
                paymentUrl: `https://gateway.zibal.ir/start/${existingOrder.paymentAuthority}`,
              });
            } else if (useZarinpal) {
              const isSandbox = !!settings.zarinpalSandbox;
              const startPayUrl = isSandbox
                ? 'https://sandbox.zarinpal.com/pg/StartPay'
                : 'https://www.zarinpal.com/pg/StartPay';
              return NextResponse.json({
                success: true,
                orderId: existingOrder.id,
                paymentUrl: `${startPayUrl}/${existingOrder.paymentAuthority}`,
              });
            } else if (useDigipay) {
              let paymentUrl = '';
              if (existingOrder.adminNotes && existingOrder.adminNotes.startsWith('Payment URL: ')) {
                paymentUrl = existingOrder.adminNotes.replace('Payment URL: ', '').trim();
              }
              if (paymentUrl) {
                return NextResponse.json({
                  success: true,
                  orderId: existingOrder.id,
                  paymentUrl,
                });
              }
            }
          }
        }
        
        // If it's an online payment but has no paymentAuthority, delete it and let the flow re-create it.
        await prisma.order.delete({
          where: { 
            id: existingOrder.id,
            shopId: user.shopId as string
          } as any
        });
      } else {
        // Offline payment, already created, just return success
        return NextResponse.json({ success: true, orderId: existingOrder.id });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const settings = await tx.shopSettings.findUnique({
        where: { shopId: user.shopId as string }
      });

      const dbUser = await tx.user.findUnique({
        where: { 
          id: user.id as string,
          shopId: user.shopId as string
        }
      });

      if (!dbUser) {
        throw new CheckoutError('کاربر یافت نشد', 404);
      }

      const isWholesaleActive = settings?.wholesaleEnabled && dbUser.isWholesaler;

      let totalAmount = 0;
      
      // Verify prices from DB
      const productIds = items.map((i: any) => i.productId);
      const dbProducts = await tx.product.findMany({
        where: { 
          id: { in: productIds },
          shopId: user.shopId as string
        },
        include: { variants: true }
      });

      const validatedItems = items.map((item: any) => {
        const dbProduct = dbProducts.find(p => p.id === item.productId);
        if (!dbProduct) throw new CheckoutError(`محصول ${item.productId} یافت نشد`, 404);
        
        let price = dbProduct.price;
        
        if (item.variantId) {
          const variant = dbProduct.variants.find(v => v.id === item.variantId);
          if (!variant) throw new CheckoutError(`تنوع ${item.variantId} یافت نشد`, 404);
          price = variant.price;
          if (variant.stock < item.quantity) throw new CheckoutError(`موجودی برای ${variant.name} کافی نیست`, 400);
        } else {
          if (dbProduct.stock < item.quantity) throw new CheckoutError(`موجودی برای ${dbProduct.title} کافی نیست`, 400);
        }
        
        if (isWholesaleActive) {
          const moq = dbProduct.moq || 1;
          if (item.quantity < moq) {
            throw new CheckoutError(`حداقل مقدار سفارش برای محصول "${dbProduct.title}" تعداد ${moq} عدد می‌باشد.`, 400);
          }

          const wholesalePriceObj = calculateWholesalePrice({
            price: price,
            discount: dbProduct.discount,
            wholesalePrice: dbProduct.wholesalePrice,
            wholesaleTiers: dbProduct.wholesaleTiers,
            wholesaleExclusivePrices: dbProduct.wholesaleExclusivePrices
          }, item.quantity, dbUser);

          price = wholesalePriceObj.unitPrice;
        } else if (dbProduct.discount) {
          const minQty = dbProduct.discountMinQty || 0;
          if (minQty === 0 || item.quantity >= minQty) {
            price = price - dbProduct.discount;
          }
        }
        
        totalAmount += price * item.quantity;
        
        return {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          price: price
        };
      });

      let discountAmount = 0;
      let finalAmount = totalAmount;
      let appliedDiscountCode: string | null = null;

      // Handle discount
      if (discountCode) {
        // Race-condition-safe check and locking using SELECT FOR UPDATE
        const discountCodes = await tx.$queryRaw<any[]>`
          SELECT * FROM "DiscountCode"
          WHERE code = ${discountCode.trim()} AND "isActive" = true AND "shop_id" = ${user.shopId}
          LIMIT 1
          FOR UPDATE
        `;
        const dbDiscount = discountCodes[0];

        if (!dbDiscount) {
          throw new CheckoutError('کد تخفیف نامعتبر یا غیرفعال است', 400);
        }

        const now = new Date();

        // 1. Check Start Date
        if (dbDiscount.startDate && new Date(dbDiscount.startDate) > now) {
          throw new CheckoutError('زمان استفاده از این کد تخفیف هنوز شروع نشده است', 400);
        }

        // 2. Check Expiration Date
        if (dbDiscount.expiresAt && new Date(dbDiscount.expiresAt) < now) {
          throw new CheckoutError('کد تخفیف منقضی شده است', 400);
        }

        // 3. Check Max Uses
        if (dbDiscount.maxUses && dbDiscount.usedCount >= dbDiscount.maxUses) {
          throw new CheckoutError('ظرفیت استفاده از این کد تخفیف تکمیل شده است', 400);
        }

        // 3.5. Check Target User Restriction
        if (dbDiscount.targetUserId) {
          if (!dbUser || dbUser.id !== dbDiscount.targetUserId) {
            throw new CheckoutError('این کد تخفیف مخصوص یک مشتری خاص است و برای حساب کاربری شما معتبر نیست', 400);
          }
        }

        // 4. Check Gender Restriction
        if (dbDiscount.allowedGender && dbDiscount.allowedGender !== 'all') {
          if (!dbUser.gender) {
            throw new CheckoutError('لطفاً ابتدا جنسیت خود را در صفحه حساب کاربری تکمیل کنید', 400);
          }
          if (dbUser.gender !== dbDiscount.allowedGender) {
            throw new CheckoutError('این کد تخفیف با جنسیت حساب کاربری شما همخوانی ندارد', 400);
          }
        }

        // 5. Check Category Restrictions and calculate correct eligible base total
        let baseTotalForDiscount = totalAmount;
        let hasCategoryRestriction = false;
        let hasProductRestriction = false;

        if (dbDiscount.targetCategoryIds) {
          try {
            const allowedCats = JSON.parse(dbDiscount.targetCategoryIds);
            if (Array.isArray(allowedCats) && allowedCats.length > 0) {
              hasCategoryRestriction = true;
              
              const eligibleItems = validatedItems.filter((item: any) => {
                const prod = dbProducts.find(p => p.id === item.productId);
                return prod?.categoryId && allowedCats.includes(prod.categoryId);
              });

              if (eligibleItems.length === 0) {
                throw new CheckoutError('این کد تخفیف فقط برای دسته‌بندی‌های خاصی معتبر است و محصولی از این دسته‌بندی‌ها در سبد خرید شما نیست', 400);
              }

              // subtotal of only eligible items
              baseTotalForDiscount = eligibleItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            }
          } catch (e: any) {
            console.error('Error parsing targetCategoryIds in checkout:', e);
            if (e instanceof CheckoutError) throw e;
          }
        }

        // 5.2 Check Product Restrictions and calculate correct eligible base total
        if (dbDiscount.targetProductIds) {
          try {
            const allowedProds = JSON.parse(dbDiscount.targetProductIds);
            if (Array.isArray(allowedProds) && allowedProds.length > 0) {
              hasProductRestriction = true;
              const eligibleItems = validatedItems.filter((item: any) => allowedProds.includes(item.productId));

              if (eligibleItems.length === 0) {
                throw new CheckoutError('این کد تخفیف فقط برای محصولات خاصی معتبر است و هیچ‌کدام از این محصولات در سبد خرید شما نیست', 400);
              }

              // subtotal of only eligible items
              baseTotalForDiscount = eligibleItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);
            }
          } catch (e: any) {
            console.error('Error parsing targetProductIds in checkout:', e);
            if (e instanceof CheckoutError) throw e;
          }
        }

        // 5.5 Check Minimum Quantity Restriction
        if (dbDiscount.minQuantity && dbDiscount.minQuantity > 0) {
          let eligibleItems = validatedItems;

          if (dbDiscount.targetProductIds) {
            try {
              const allowedProds = JSON.parse(dbDiscount.targetProductIds);
              if (Array.isArray(allowedProds) && allowedProds.length > 0) {
                eligibleItems = eligibleItems.filter((item: any) => allowedProds.includes(item.productId));
              }
            } catch (e) {}
          }

          if (dbDiscount.targetCategoryIds) {
            try {
              const allowedCats = JSON.parse(dbDiscount.targetCategoryIds);
              if (Array.isArray(allowedCats) && allowedCats.length > 0) {
                eligibleItems = eligibleItems.filter((item: any) => {
                  const prod = dbProducts.find(p => p.id === item.productId);
                  return prod?.categoryId && allowedCats.includes(prod.categoryId);
                });
              }
            } catch (e) {}
          }

          const hasMinQty = eligibleItems.some((item: any) => item.quantity >= dbDiscount.minQuantity);
          if (!hasMinQty) {
            throw new CheckoutError(`برای استفاده از این کد تخفیف باید حداقل ${dbDiscount.minQuantity} عدد از محصولات مجاز را در سبد خرید خود داشته باشید`, 400);
          }
        }

        // 6. Check Minimum Order Amount
        if (dbDiscount.minOrderAmount && baseTotalForDiscount < dbDiscount.minOrderAmount) {
          const minAmountStr = dbDiscount.minOrderAmount.toLocaleString('fa-IR');
          if (hasCategoryRestriction) {
            throw new CheckoutError(`مجموع اقلام دسته‌بندی‌های مجاز برای این تخفیف باید حداقل ${minAmountStr} تومان باشد`, 400);
          } else if (hasProductRestriction) {
            throw new CheckoutError(`مجموع اقلام محصولات مجاز برای این تخفیف باید حداقل ${minAmountStr} تومان باشد`, 400);
          } else {
            throw new CheckoutError(`حداقل مبلغ خرید برای استفاده از این کد تخفیف ${minAmountStr} تومان است`, 400);
          }
        }

        // 7. Check First Order Only
        if (dbDiscount.firstOrderOnly) {
          const orderCount = await tx.order.count({
            where: {
              userId: user.id as string,
              shopId: user.shopId as string,
              paymentStatus: 'paid'
            }
          });
          if (orderCount > 0) {
            throw new CheckoutError('این کد تخفیف فقط برای اولین خرید معتبر است', 400);
          }
        }

        // 8. Check Max Uses Per User
        if (dbDiscount.maxUsesPerUser) {
          const userUsedCount = await tx.order.count({
            where: {
              userId: user.id as string,
              shopId: user.shopId as string,
              discountCode: dbDiscount.code,
              paymentStatus: { in: ['paid', 'pending'] }
            }
          });
          if (userUsedCount >= dbDiscount.maxUsesPerUser) {
            throw new CheckoutError(`شما قبلاً از این کد تخفیف استفاده کرده‌اید (حد مجاز: ${dbDiscount.maxUsesPerUser} بار)`, 400);
          }
        }

        // 9. Calculate discount amount
        if (dbDiscount.type === 'percentage') {
          discountAmount = (baseTotalForDiscount * dbDiscount.discount) / 100;
          // Apply max discount limit if set
          if (dbDiscount.maxDiscountAmount && discountAmount > dbDiscount.maxDiscountAmount) {
            discountAmount = dbDiscount.maxDiscountAmount;
          }
        } else {
          discountAmount = Math.min(baseTotalForDiscount, dbDiscount.discount);
        }

        finalAmount = Math.max(0, totalAmount - discountAmount);
        appliedDiscountCode = dbDiscount.code;

        // Increment used count
        await tx.discountCode.update({
          where: { 
            id: dbDiscount.id,
            shopId: user.shopId as string
          } as any,
          data: { usedCount: { increment: 1 } }
        });
      }

      // Calculate Shipping/Freight for Wholesalers
      let finalShippingCost = 0;
      if (!isDigital) {
        if (isWholesaleActive) {
          if (shippingCarrier === 'freight') {
            // Calculate weight/volume from validated products
            let totalWeight = 0;
            let totalVolume = 0;
            for (const item of items) {
              const p = dbProducts.find((p: any) => p.id === item.productId);
              if (p) {
                totalWeight += (p.weight || 0) * item.quantity;
                totalVolume += (p.volume || 0) * item.quantity;
              }
            }

            const computedWeight = totalWeight > 0 ? totalWeight : items.reduce((sum: number, item: any) => sum + item.quantity * 1, 0); // fallback 1kg
            const computedVolume = totalVolume > 0 ? totalVolume : items.reduce((sum: number, item: any) => sum + item.quantity * 0.5, 0); // fallback 0.5 dm3

            // Base rate: 50,000 + 2000 per kg + 5000 per dm3
            finalShippingCost = 50000 + (computedWeight * 2000) + (computedVolume * 5000);
          } else if (shippingCarrier === 'ex_works') {
            finalShippingCost = 0;
          } else {
            finalShippingCost = parseFloat(shippingCost as any) || 0;
          }
        } else {
          finalShippingCost = parseFloat(shippingCost as any) || 0;
        }
      }

      finalAmount += finalShippingCost;

      // B2B Wholesale Payment Method Logic
      let isCreditProcessed = false;
      let wholesaleDepositAmt = 0;
      let wholesaleSettlementAmt = 0;
      let orderStatus = 'pending';
      let paymentStatus = 'pending';

      if (paymentMethod === 'credit') {
        if (!isWholesaleActive) {
          throw new CheckoutError('پرداخت اعتباری فقط برای خریداران عمده فعال است', 400);
        }

        // Lock User row to prevent credit limit race conditions
        const users = await tx.$queryRaw<any[]>`
          SELECT * FROM "User"
          WHERE id = ${dbUser.id} AND "shop_id" = ${user.shopId}
          LIMIT 1
          FOR UPDATE
        `;
        const lockedUser = users[0];
        if (!lockedUser) {
          throw new CheckoutError('کاربر یافت نشد', 404);
        }

        const remainingCredit = lockedUser.creditLimit - lockedUser.creditBalance;
        if (remainingCredit < finalAmount) {
          throw new CheckoutError(`اعتبار شما کافی نیست. موجودی اعتبار: ${remainingCredit.toLocaleString('fa-IR')} تومان ، مبلغ فاکتور: ${finalAmount.toLocaleString('fa-IR')} تومان`, 400);
        }

        // Deduct credit limit (increment balance)
        await tx.user.update({
          where: { 
            id: dbUser.id,
            shopId: user.shopId as string
          } as any,
          data: { creditBalance: { increment: finalAmount } }
        });

        isCreditProcessed = true;
        orderStatus = 'paid';
        paymentStatus = 'paid';
      } else if (paymentMethod === 'deposit') {
        if (!isWholesaleActive) {
          throw new CheckoutError('پرداخت چندمرحله‌ای فقط برای خریداران عمده فعال است', 400);
        }

        // 30% Down payment
        wholesaleDepositAmt = finalAmount * 0.3;
        wholesaleSettlementAmt = finalAmount * 0.7;
      } else if (paymentMethod === 'card_to_card') {
        orderStatus = 'pending';
        paymentStatus = 'pending';
      }

      // Format address and receiver info
      let finalAddress = address || 'آدرس ثبت نشده';
      let finalPhone = null;
      
      if (isDigital) {
        finalAddress = `خرید دیجیتال (تحویل به ایمیل: ${buyerEmail || user.email})`;
        finalPhone = buyerPhone || user.phone || null;
      } else if (deliverToOther) {
        finalAddress = `${finalAddress} (تحویل به شخص دیگر: ${otherReceiverName || 'بدون نام'})`;
        finalPhone = otherReceiverPhone || null;
      }

      const finalNotes = isDigital 
        ? `نام خریدار: ${buyerName || 'ثبت نشده'}\nایمیل خریدار: ${buyerEmail || 'ثبت نشده'}\nموبایل خریدار: ${buyerPhone || 'ثبت نشده'}\n${userNotes || ''}`
        : userNotes;

      // Create Order
      const order = await tx.order.create({
        data: {
          shopId: user.shopId as string,
          userId: user.id as string,
          idempotencyKey,
          totalAmount,
          discountAmount,
          discountCode: appliedDiscountCode,
          finalAmount,
          paymentMethod,
          isWholesale: isWholesaleActive,
          wholesalePaymentType: paymentMethod === 'credit' ? 'credit' : (paymentMethod === 'deposit' ? 'deposit' : 'regular'),
          wholesaleDepositAmount: wholesaleDepositAmt,
          wholesaleSettlementAmount: wholesaleSettlementAmt,
          officialInvoice: !!officialInvoice,
          status: orderStatus,
          paymentStatus: paymentStatus,
          cardToCardReceipt,
          cardToCardCode,
          cardToCardSenderCard,
          cardToCardReceiverCard,
          cardToCardTime,
          userNotes: finalNotes || undefined,
          address: finalAddress || undefined,
          phone: finalPhone || undefined,
          shippingCarrier: isDigital ? null : (shippingCarrier || 'post'),
          shippingCost: isDigital ? 0 : finalShippingCost,
          items: {
            create: validatedItems.map((item: any) => ({
              shopId: user.shopId as string,
              productId: item.productId,
              variantId: item.variantId || undefined,
              quantity: item.quantity,
              price: item.price
            }))
          }
        }
      });

      // Default flow (gateways disabled / Offline Mock Payment)
      const isOnlinePayment = paymentMethod === 'online' || paymentMethod === 'deposit';
      const useZibal = isOnlinePayment && settings?.zibalEnabled && settings?.zibalMerchantId && (onlineGateway === 'zibal' || !settings.zarinpalEnabled);
      const useZarinpal = isOnlinePayment && settings?.zarinpalEnabled && settings?.zarinpalMerchantId && (onlineGateway === 'zarinpal' || !settings.zibalEnabled);
      const useDigipay = isOnlinePayment && settings?.digipayEnabled && onlineGateway === 'digipay';

      if (!useZibal && !useZarinpal && !useDigipay) {
        for (const item of validatedItems) {
          const dbProduct = dbProducts.find(p => p.id === item.productId);
          const itemTitle = dbProduct ? dbProduct.title : item.productId;

          if (item.variantId) {
            const updatedRows = await tx.$executeRaw`
              UPDATE "ProductVariant"
              SET stock = stock - ${item.quantity}
              WHERE id = ${item.variantId} AND "shop_id" = ${user.shopId} AND stock >= ${item.quantity}
            `;
            if (updatedRows === 0) {
              throw new CheckoutError(`موجودی برای تنوع محصول "${itemTitle}" کافی نیست`, 400);
            }
            // Decrement parent product stock by same quantity to keep in sync
            await tx.$executeRaw`
              UPDATE "Product"
              SET stock = stock - ${item.quantity}
              WHERE id = ${item.productId} AND "shop_id" = ${user.shopId}
            `;
          } else {
            const updatedRows = await tx.$executeRaw`
              UPDATE "Product"
              SET stock = stock - ${item.quantity}
              WHERE id = ${item.productId} AND "shop_id" = ${user.shopId} AND stock >= ${item.quantity}
            `;
            if (updatedRows === 0) {
              throw new CheckoutError(`موجودی برای محصول "${itemTitle}" کافی نیست`, 400);
            }
          }
        }
      }

      return {
        order,
        settings,
        dbUser,
        validatedItems,
        dbProducts,
        isWholesaleActive,
        wholesaleDepositAmt,
        finalShippingCost,
        finalAddress,
        finalPhone
      };
    });

    const {
      order,
      settings,
      dbUser,
      validatedItems,
      dbProducts,
      isWholesaleActive,
      wholesaleDepositAmt,
      finalShippingCost,
      finalAddress,
      finalPhone
    } = result;

    // Check if Zibal or ZarinPal Payment Gateway is enabled (and if payment method is online or deposit)
    const isOnlinePayment = paymentMethod === 'online' || paymentMethod === 'deposit';
    const useZibal = isOnlinePayment && settings?.zibalEnabled && settings?.zibalMerchantId && (onlineGateway === 'zibal' || !settings.zarinpalEnabled);
    const useZarinpal = isOnlinePayment && settings?.zarinpalEnabled && settings?.zarinpalMerchantId && (onlineGateway === 'zarinpal' || !settings.zibalEnabled);

    if (useZibal) {
      try {
        const basePayAmount = paymentMethod === 'deposit' ? wholesaleDepositAmt : finalAmount;
        const taxAmount = Math.round(basePayAmount * 0.09);
        const payTotal = basePayAmount + taxAmount;
        
        // Zibal amount must be in Rials
        let zibalAmount = Math.round(payTotal);
        if (settings.currency !== 'IRR') {
          zibalAmount = Math.round(payTotal * 10);
        }
        
        // Ensure amount is at least 1000 Rials (Zibal minimum is 1000 Rials)
        if (zibalAmount < 1000) {
          zibalAmount = 1000;
        }

        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const callbackUrl = `${protocol}://${host}/api/payment/verify?orderId=${order.id}&gateway=zibal`;

        const isSandbox = !!settings.zibalSandbox;
        const zibalMerchant = isSandbox ? 'zibal' : settings.zibalMerchantId;
        const zibalRequestUrl = 'https://gateway.zibal.ir/v1/request';

        console.log(`[INFO] [PaymentService] Initiating Zibal payment | { orderId: "${order.id}", amount: ${zibalAmount}, isSandbox: ${isSandbox} }`);

        const userDb = await prisma.user.findFirst({
          where: { 
            id: user.id,
            shopId: user.shopId
          },
          select: { phone: true, email: true }
        });

        const rawPhone = buyerPhone || otherReceiverPhone || userDb?.phone;
        const normalizedPhone = normalizePhoneNumber(rawPhone);

        const zbRes = await fetch(zibalRequestUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            merchant: zibalMerchant,
            amount: zibalAmount,
            callbackUrl: callbackUrl,
            description: `پرداخت سفارش شماره ${order.id.slice(-8).toUpperCase()}`,
            orderId: order.id,
            ...(normalizedPhone ? { mobile: normalizedPhone } : {}),
          }),
        });

        const zbData = await zbRes.json();

        if (zbRes.ok && zbData.result === 100 && zbData.trackId) {
          const trackId = String(zbData.trackId);

          // Update order with trackId as paymentAuthority
          await prisma.order.update({
            where: { 
              id: order.id,
              shopId: user.shopId as string
            } as any,
            data: { paymentAuthority: trackId },
          });

          return NextResponse.json({
            success: true,
            orderId: order.id,
            paymentUrl: `https://gateway.zibal.ir/start/${trackId}`,
          });
        } else {
          console.error('[ERROR] [PaymentService] Zibal initialization failed:', zbData);
          const errorMsg = zbData.message || 'پاسخ نامعتبر از درگاه پرداخت زیبال';
          return NextResponse.json({ error: `خطا در اتصال به درگاه پرداخت زیبال: ${errorMsg}` }, { status: 400 });
        }
      } catch (err: any) {
        console.error('[ERROR] [PaymentService] Zibal exception:', err);
        return NextResponse.json({ error: 'خطای سیستمی در اتصال به درگاه پرداخت زیبال' }, { status: 500 });
      }
    } else if (useZarinpal) {
      try {
        const basePayAmount = paymentMethod === 'deposit' ? wholesaleDepositAmt : finalAmount;
        const taxAmount = Math.round(basePayAmount * 0.09);
        const payTotal = basePayAmount + taxAmount;
        
        // ZarinPal amount must be in Tomans
        let zarinpalAmount = Math.round(payTotal);
        if (settings.currency === 'IRR') {
          zarinpalAmount = Math.round(payTotal / 10);
        }
        
        // Ensure amount is at least 100 tomans (ZarinPal minimum)
        if (zarinpalAmount < 100) {
          zarinpalAmount = 100;
        }

        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const callbackUrl = `${protocol}://${host}/api/payment/verify?orderId=${order.id}&gateway=zarinpal`;

        const isSandbox = !!settings.zarinpalSandbox;
        const zarinpalUrl = isSandbox
          ? 'https://sandbox.zarinpal.com/pg/v4/payment/request.json'
          : 'https://api.zarinpal.com/pg/v4/payment/request.json';

        const startPayUrl = isSandbox
          ? 'https://sandbox.zarinpal.com/pg/StartPay'
          : 'https://www.zarinpal.com/pg/StartPay';

        console.log(`[INFO] [PaymentService] Initiating ZarinPal payment | { orderId: "${order.id}", amount: ${zarinpalAmount}, isSandbox: ${isSandbox} }`);

        const metadata: any = {};
        const userDb = await prisma.user.findFirst({
          where: { 
            id: user.id,
            shopId: user.shopId
          },
          select: { phone: true, email: true }
        });

        const rawPhone = buyerPhone || otherReceiverPhone || userDb?.phone;
        const normalizedPhone = normalizePhoneNumber(rawPhone);
        if (normalizedPhone) {
          metadata.mobile = normalizedPhone;
        }

        const rawEmail = buyerEmail || userDb?.email;
        if (rawEmail && typeof rawEmail === 'string' && rawEmail.includes('@')) {
          metadata.email = rawEmail.trim();
        }

        const zpRes = await fetch(zarinpalUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            merchant_id: settings.zarinpalMerchantId,
            amount: zarinpalAmount,
            callback_url: callbackUrl,
            description: `پرداخت سفارش شماره ${order.id.slice(-8).toUpperCase()}`,
            ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
          }),
        });

        const zpData = await zpRes.json();

        if (zpRes.ok && zpData.data && zpData.data.authority) {
          const authority = zpData.data.authority;

          // Update order with authority
          await prisma.order.update({
            where: { 
              id: order.id,
              shopId: user.shopId as string
            } as any,
            data: { paymentAuthority: authority },
          });

          return NextResponse.json({
            success: true,
            orderId: order.id,
            paymentUrl: `${startPayUrl}/${authority}`,
          });
        } else {
          console.error('[ERROR] [PaymentService] ZarinPal initialization failed:', zpData);
          const errorMsg = zpData.errors?.message || 'پاسخ نامعتبر از درگاه پرداخت زرین‌پال';
          return NextResponse.json({ error: `خطا در اتصال به درگاه پرداخت زرین‌پال: ${errorMsg}` }, { status: 400 });
        }
      } catch (err: any) {
        console.error('[ERROR] [PaymentService] ZarinPal exception:', err);
        return NextResponse.json({ error: 'خطای سیستمی در اتصال به درگاه پرداخت' }, { status: 500 });
      }
    } else if (isOnlinePayment && settings?.digipayEnabled && onlineGateway === 'digipay') {
      try {
        const basePayAmount = paymentMethod === 'deposit' ? wholesaleDepositAmt : finalAmount;
        const taxAmount = Math.round(basePayAmount * 0.09);
        const payTotal = basePayAmount + taxAmount;
        
        // DigiPay amount must be in Rials
        let digipayAmount = Math.round(payTotal);
        if (settings.currency !== 'IRR') {
          digipayAmount = Math.round(payTotal * 10);
        }

        const host = request.headers.get('host') || 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const callbackUrl = `${protocol}://${host}/api/payment/verify?orderId=${order.id}&gateway=digipay`;

        console.log(`[INFO] [PaymentService] Initiating DigiPay payment | { orderId: "${order.id}", amount: ${digipayAmount} }`);

        // 1. Get token
        const token = await getDigipayToken(
          settings.digipayClientId || '',
          settings.digipayClientSecret || '',
          settings.digipayUsername || '',
          settings.digipayPassword || '',
          !!settings.digipaySandbox
        );

        if (!token) {
          return NextResponse.json({ error: 'خطا در احراز هویت سیستم دیجی‌پی. لطفا تنظیمات درگاه را بررسی کنید.' }, { status: 400 });
        }

        // 2. Construct basket details
        const basketItems = validatedItems.map((item: any) => {
          const dbProduct = dbProducts.find(p => p.id === item.productId);
          return {
            sellerId: user.shopId as string,
            supplierId: user.shopId as string,
            productCode: item.variantId || item.productId,
            brand: dbProduct?.brand || 'نامشخص',
            productType: 1, // Default to Durable
            count: item.quantity,
            categoryId: dbProduct?.categoryId || 'Mobile',
          };
        });

        const basketDetails = {
          basketId: order.id,
          items: basketItems,
        };

        const userDb = await prisma.user.findFirst({
          where: { 
            id: user.id,
            shopId: user.shopId
          },
          select: { phone: true }
        });

        const rawPhone = buyerPhone || otherReceiverPhone || userDb?.phone || user.phone || '';
        const normalizedPhone = normalizePhoneNumber(rawPhone) || rawPhone;

        // 3. Create ticket
        const ticketRes = await createDigipayTicket(
          token,
          digipayAmount,
          normalizedPhone,
          order.id,
          callbackUrl,
          basketDetails,
          !!settings.digipaySandbox
        );

        if (ticketRes && ticketRes.result && ticketRes.result.status === 0 && ticketRes.ticket && ticketRes.redirectUrl) {
          // Update order with ticket
          await prisma.order.update({
            where: { 
              id: order.id,
              shopId: user.shopId as string
            } as any,
            data: { 
              paymentAuthority: ticketRes.ticket,
              adminNotes: `Payment URL: ${ticketRes.redirectUrl}`
            },
          });

          return NextResponse.json({
            success: true,
            orderId: order.id,
            paymentUrl: ticketRes.redirectUrl,
          });
        } else {
          const errorMsg = ticketRes?.result?.message || 'پاسخ نامعتبر از درگاه پرداخت دیجی‌پی';
          console.error('[ERROR] [PaymentService] DigiPay initialization failed:', ticketRes);
          return NextResponse.json({ error: `خطا در اتصال به درگاه پرداخت دیجی‌پی: ${errorMsg}` }, { status: 400 });
        }
      } catch (err: any) {
        console.error('[ERROR] [PaymentService] DigiPay exception:', err);
        return NextResponse.json({ error: 'خطای سیستمی در اتصال به درگاه پرداخت دیجی‌پی' }, { status: 500 });
      }
    }

    // Default flow stock reduction is already performed atomically inside the transaction above.

    // Generate secure download tokens for digital products in this order
    const createdTokens = [];
    for (const item of validatedItems) {
      const dbProduct = dbProducts.find(p => p.id === item.productId);
      if (dbProduct && dbProduct.type === 'digital') {
        const token = crypto.randomUUID();
        const expiryDate = dbProduct.downloadExpiryDays && dbProduct.downloadExpiryDays > 0 
          ? new Date(Date.now() + dbProduct.downloadExpiryDays * 24 * 60 * 60 * 1000) 
          : null;

        const created = await prisma.downloadToken.create({
          data: {
            shopId: user.shopId as string,
            orderId: order.id,
            productId: item.productId,
            userId: user.id as string,
            token,
            buyerEmail: buyerEmail || user.email || null,
            maxDownloads: dbProduct.downloadLimit || null,
            expiresAt: expiryDate,
          }
        });

        createdTokens.push({
          token: created.token,
          productTitle: dbProduct.title,
          fileSize: dbProduct.fileSize || 'مشخص نشده',
          fileFormat: dbProduct.fileFormat || 'ZIP',
          maxDownloads: created.maxDownloads,
          expiresAt: created.expiresAt ? new Date(created.expiresAt).toLocaleDateString('fa-IR') : null
        });

        // Log using structured logger rule
        console.log(`[INFO] [DownloadService] Secure download token created | { orderId: "${order.id}", productId: "${item.productId}", userId: "${user.id}", token: "${token}", buyerEmail: "${buyerEmail || user.email}" }`);
      }
    }

    // Send Bale Bot notification if enabled
    if (settings?.baleOrderNotificationsEnabled && settings?.baleChatId) {
      try {
        // Enforce customized notification statuses if set
        let shouldSend = true;
        if (settings.baleNotificationStatuses) {
          try {
            const allowedStatuses = JSON.parse(settings.baleNotificationStatuses);
            if (Array.isArray(allowedStatuses) && !allowedStatuses.includes('new_order')) {
              shouldSend = false;
            }
          } catch (e) {}
        }

        if (shouldSend) {
          const systemBotToken = await prisma.systemSetting.findUnique({
            where: { key: 'central_bale_bot_token' }
          });

          if (systemBotToken && systemBotToken.value) {
            const pMethodMap: Record<string, string> = {
              online: 'پرداخت آنلاین',
              card_to_card: 'کارت به کارت',
              deposit: 'بیعانه (پرداخت چندمرحله‌ای)',
              credit: 'پرداخت اعتباری (اقساطی)',
            };
            const methodText = pMethodMap[paymentMethod] || paymentMethod;
            const customerName = buyerName || user.name || dbUser?.name || 'مشتری مهمان';
            const customerPhone = buyerPhone || otherReceiverPhone || dbUser?.phone || user.phone || 'ثبت نشده';
            const currencyText = settings.currency === 'IRT' ? 'تومان' : 'ریال';
            
            const messageText = `🛒 *سفارش جدید ثبت شد!*
🏪 فروشگاه: ${settings.shopName}
🆔 شماره سفارش: \`${order.id}\`
💰 مبلغ نهایی: *${finalAmount.toLocaleString('fa-IR')}* ${currencyText}
👤 خریدار: ${customerName}
📞 تلفن خریدار: ${customerPhone}
💳 روش پرداخت: ${methodText}
📍 آدرس تحویل: ${finalAddress}`;

            await sendBaleBotMessage(
              systemBotToken.value.trim(),
              settings.baleChatId,
              messageText
            );
          }
        }
      } catch (baleErr) {
        console.error('[ERROR] [BaleNotification]: Failed to send order notification:', baleErr);
      }
    }

    // Send Telegram Bot notification if enabled
    if (settings?.telegramOrderNotificationsEnabled && settings?.telegramChatId) {
      try {
        // Enforce customized notification statuses if set
        let shouldSend = true;
        if (settings.telegramNotificationStatuses) {
          try {
            const allowedStatuses = JSON.parse(settings.telegramNotificationStatuses);
            if (Array.isArray(allowedStatuses) && !allowedStatuses.includes('new_order')) {
              shouldSend = false;
            }
          } catch (e) {}
        }

        if (shouldSend) {
          const systemBotToken = await prisma.systemSetting.findUnique({
            where: { key: 'central_telegram_bot_token' }
          });

          if (systemBotToken && systemBotToken.value) {
            const pMethodMap: Record<string, string> = {
              online: 'پرداخت آنلاین',
              card_to_card: 'کارت به کارت',
              deposit: 'بیعانه (پرداخت چندمرحله‌ای)',
              credit: 'پرداخت اعتباری (اقساطی)',
            };
            const methodText = pMethodMap[paymentMethod] || paymentMethod;
            const customerName = buyerName || user.name || dbUser?.name || 'مشتری مهمان';
            const customerPhone = buyerPhone || otherReceiverPhone || dbUser?.phone || user.phone || 'ثبت نشده';
            const currencyText = settings.currency === 'IRT' ? 'تومان' : 'ریال';
            
            const messageText = `🛒 *سفارش جدید ثبت شد!*
🏪 فروشگاه: ${settings.shopName}
🆔 شماره سفارش: \`${order.id}\`
💰 مبلغ نهایی: *${finalAmount.toLocaleString('fa-IR')}* ${currencyText}
👤 خریدار: ${customerName}
📞 تلفن خریدار: ${customerPhone}
💳 روش پرداخت: ${methodText}
📍 آدرس تحویل: ${finalAddress}`;

            await sendTelegramBotMessage(
              systemBotToken.value.trim(),
              settings.telegramChatId,
              messageText
            );
          }
        }
      } catch (telegramErr) {
        console.error('[ERROR] [TelegramNotification]: Failed to send order notification:', telegramErr);
      }
    }

    // Send SMS notifications asynchronously (non-blocking)
    const customerPhone = buyerPhone || otherReceiverPhone || dbUser?.phone || user.phone;
    if (customerPhone) {
      const customerName = buyerName || user.name || dbUser?.name || 'مشتری';
      const orderNumber = order.id.slice(-8).toUpperCase();
      const amountStr = finalAmount.toLocaleString('fa-IR');
      
      // Send to customer
      sendStoreSms(user.shopId as string, 'order_placed_customer', customerPhone, {
        customerName,
        orderNumber,
        totalAmount: amountStr,
      }).catch(err => console.error('[ERROR] [SMS]: Failed to send customer order placed SMS |', err));

      // Send to admin
      let adminPhone = settings?.contactPhone;
      try {
        const smsConf = typeof settings?.smsConfig === 'string' ? JSON.parse(settings.smsConfig) : settings?.smsConfig;
        if (smsConf?.adminPhone) {
          adminPhone = smsConf.adminPhone;
        }
      } catch (e) {}

      if (adminPhone) {
        sendStoreSms(user.shopId as string, 'order_placed_admin', adminPhone, {
          orderNumber,
          totalAmount: amountStr,
        }).catch(err => console.error('[ERROR] [SMS]: Failed to send admin order placed SMS |', err));
      }
    }

    return NextResponse.json({ success: true, orderId: order.id, downloadTokens: createdTokens });
  } catch (error: any) {
    console.error('Checkout error:', error);
    const status = error.status || 500;
    return NextResponse.json({ error: error.message || 'خطای سرور' }, { status });
  }
}

function toEnglishDigits(str: string): string {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return result;
}

function normalizePhoneNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  
  let clean = toEnglishDigits(phone.trim());
  clean = clean.replace(/\D/g, ''); // remove non-digits
  
  if (clean.startsWith('+98')) {
    clean = '0' + clean.substring(3);
  } else if (clean.startsWith('98') && clean.length === 12) {
    clean = '0' + clean.substring(2);
  } else if (!clean.startsWith('0') && clean.length === 10) {
    clean = '0' + clean;
  }
  
  if (/^09\d{9}$/.test(clean)) {
    return clean;
  }
  
  return null;
}