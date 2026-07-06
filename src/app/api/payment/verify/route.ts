import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { getDigipayToken, verifyDigipayPayment, deliverDigipayPurchase } from '@/lib/digipay';

export async function GET(request: Request) {
  let orderId = '';
  try {
    const { searchParams } = new URL(request.url);
    orderId = searchParams.get('orderId') || '';
    const authority = searchParams.get('Authority') || '';
    const status = searchParams.get('Status') || '';

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
    }

    // Fetch the order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        user: true,
      },
      allowCrossTenant: true
    } as any);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const redirectUrl = (statusParam: string, extra = '') => {
      return NextResponse.redirect(`${protocol}://${host}/checkout?orderId=${order.id}&status=${statusParam}${extra}`);
    };

    // If transaction already paid
    if (order.paymentStatus === 'paid') {
      return redirectUrl('success');
    }

    const gateway = searchParams.get('gateway') || 'zarinpal';

    if (gateway === 'digipay') {
      const trackingCode = searchParams.get('trackingCode') || '';
      const status = searchParams.get('result') || '';
      const type = parseInt(searchParams.get('type') || '0') || 0;

      if (status !== 'SUCCESS' || !trackingCode) {
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'cancelled',
            paymentStatus: 'failed',
            adminNotes: 'تراکنش دیجی‌پی ناموفق بود یا توسط کاربر لغو شد.',
          },
        });
        return redirectUrl('failed', '&error=cancelled');
      }

      // Load shop settings to get credentials
      const settings = await prisma.shopSettings.findUnique({
        where: { shopId: order.shopId },
      });

      if (!settings || !settings.digipayEnabled) {
        return redirectUrl('failed', '&error=config_missing');
      }

      // 1. Get access token
      const token = await getDigipayToken(
        settings.digipayClientId || '',
        settings.digipayClientSecret || '',
        settings.digipayUsername || '',
        settings.digipayPassword || '',
        !!settings.digipaySandbox
      );

      if (!token) {
        return redirectUrl('failed', '&error=auth_failed');
      }

      // 2. Verify payment
      const verifyRes = await verifyDigipayPayment(
        token,
        trackingCode,
        order.id,
        type,
        !!settings.digipaySandbox
      );

      if (verifyRes && verifyRes.result && verifyRes.result.status === 0) {
        // 3. Deliver purchase if Credit/BNPL (type 5 or 13)
        if (type === 5 || type === 13) {
          const productCodes = order.items.map(i => i.variantId || i.productId);
          await deliverDigipayPurchase(
            token,
            order.id,
            trackingCode,
            productCodes,
            type,
            !!settings.digipaySandbox
          );
        }

        // Perform updates inside a transaction to maintain atomicity
        try {
          await prisma.$transaction(async (tx) => {
            // Lock the order row and check if already paid
            const lockedOrder = await tx.order.findUnique({
              where: { id: order.id, shopId: order.shopId },
              select: { paymentStatus: true }
            });

            if (lockedOrder?.paymentStatus === 'paid') {
              return;
            }

            // 1. Update order status
            await tx.order.update({
              where: { id: order.id, shopId: order.shopId },
              data: {
                status: 'paid',
                paymentStatus: 'paid',
                adminNotes: `DigiPay Tracking Code: ${trackingCode} | Type: ${type}`,
              },
            });

            // 2. Reduce product stock
            for (const item of order.items) {
              if (item.variantId) {
                const updatedRows = await tx.$executeRaw`
                  UPDATE "ProductVariant"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.variantId} AND stock >= ${item.quantity}
                `;
                if (updatedRows === 0) {
                  throw new Error(`موجودی برای تنوع محصول "${item.product.title}" کافی نیست`);
                }
                // Decrement parent product stock by same quantity to keep in sync
                await tx.$executeRaw`
                  UPDATE "Product"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.productId}
                `;
              } else {
                const updatedRows = await tx.$executeRaw`
                  UPDATE "Product"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.productId} AND stock >= ${item.quantity}
                `;
                if (updatedRows === 0) {
                  throw new Error(`موجودی برای محصول "${item.product.title}" کافی نیست`);
                }
              }
            }

            // 3. Generate download tokens for digital products
            for (const item of order.items) {
              if (item.product.type === 'digital') {
                const downloadToken = crypto.randomUUID();
                const dbProduct = item.product;
                const expiryDate = dbProduct.downloadExpiryDays && dbProduct.downloadExpiryDays > 0 
                  ? new Date(Date.now() + dbProduct.downloadExpiryDays * 24 * 60 * 60 * 1000) 
                  : null;

                let buyerEmail = order.user.email;
                const emailMatch = order.userNotes?.match(/ایمیل خریدار: ([^\n]*)/);
                if (emailMatch && emailMatch[1]) {
                  buyerEmail = emailMatch[1].trim();
                }

                await tx.downloadToken.create({
                  data: {
                    shopId: order.shopId,
                    orderId: order.id,
                    productId: item.productId,
                    userId: order.userId,
                    token: downloadToken,
                    buyerEmail: buyerEmail || null,
                    maxDownloads: dbProduct.downloadLimit || null,
                    expiresAt: expiryDate,
                  },
                });
              }
            }
          });
        } catch (transError: any) {
          console.error('[ERROR] [PaymentVerify DigiPay] Transaction failed:', transError);
          await prisma.order.update({
            where: { id: order.id, shopId: order.shopId },
            data: {
              status: 'cancelled',
              paymentStatus: 'failed',
              adminNotes: `خطای موجودی یا ثبت سفارش: ${transError.message || 'نامشخص'}`,
            },
          });
          return redirectUrl('failed', `&error=stock_error&message=${encodeURIComponent(transError.message || 'خطا در ثبت سفارش')}`);
        }

        // Award loyalty points
        try {
          const { awardLoyaltyPoints } = await import('@/lib/loyalty');
          await awardLoyaltyPoints(order.userId, order.shopId, order.finalAmount);
        } catch (err) {
          console.error('Failed to award loyalty points on payment verify:', err);
        }

        return redirectUrl('success', `&refId=${trackingCode}`);
      } else {
        const errorMsg = verifyRes?.result?.message || 'تایید تراکنش دیجی‌پی ناموفق بود';
        console.error('[ERROR] [PaymentVerify] DigiPay verification failed:', verifyRes);
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'failed',
            paymentStatus: 'failed',
            adminNotes: `DigiPay verification error: ${errorMsg}`,
          },
        });
        return redirectUrl('failed', `&error=verification_failed&message=${encodeURIComponent(errorMsg)}`);
      }
    }

    if (gateway === 'zibal') {
      const trackId = searchParams.get('trackId') || '';
      const zibalSuccess = searchParams.get('success') || '';

      if (zibalSuccess !== '1' || !trackId) {
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'cancelled',
            paymentStatus: 'failed',
            adminNotes: 'تراکنش زیبال توسط کاربر لغو شد یا ناموفق بود.',
          },
        });
        return redirectUrl('failed', '&error=cancelled');
      }

      // Load shop settings to get merchant ID and sandbox mode
      const settings = await prisma.shopSettings.findUnique({
        where: { shopId: order.shopId },
      });

      if (!settings || !settings.zibalMerchantId) {
        return redirectUrl('failed', '&error=config_missing');
      }

      const isSandbox = !!settings.zibalSandbox;
      const zibalMerchant = isSandbox ? 'zibal' : settings.zibalMerchantId;
      const verifyUrl = 'https://gateway.zibal.ir/v1/verify';

      console.log(`[INFO] [PaymentVerify] Requesting Zibal verification | { orderId: "${order.id}", trackId: "${trackId}", isSandbox: ${isSandbox} }`);

      const zbRes = await fetch(verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          merchant: zibalMerchant,
          trackId: parseInt(trackId) || trackId,
        }),
      });

      const zbData = await zbRes.json();

      if (zbRes.ok && (zbData.result === 100 || zbData.result === 201)) {
        const refNumber = String(zbData.refNumber || '');

        // Perform updates inside a transaction to maintain atomicity
        try {
          await prisma.$transaction(async (tx) => {
            // Lock the order row and check if already paid
            const lockedOrder = await tx.order.findUnique({
              where: { id: order.id, shopId: order.shopId },
              select: { paymentStatus: true }
            });

            if (lockedOrder?.paymentStatus === 'paid') {
              return;
            }

            // 1. Update order status
            await tx.order.update({
              where: { id: order.id, shopId: order.shopId },
              data: {
                status: 'paid',
                paymentStatus: 'paid',
                adminNotes: `Zibal Ref Number: ${refNumber}`,
              },
            });

            // 2. Reduce product stock
            for (const item of order.items) {
              if (item.variantId) {
                const updatedRows = await tx.$executeRaw`
                  UPDATE "ProductVariant"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.variantId} AND stock >= ${item.quantity}
                `;
                if (updatedRows === 0) {
                  throw new Error(`موجودی برای تنوع محصول "${item.product.title}" کافی نیست`);
                }
                // Decrement parent product stock by same quantity to keep in sync
                await tx.$executeRaw`
                  UPDATE "Product"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.productId}
                `;
              } else {
                const updatedRows = await tx.$executeRaw`
                  UPDATE "Product"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.productId} AND stock >= ${item.quantity}
                `;
                if (updatedRows === 0) {
                  throw new Error(`موجودی برای محصول "${item.product.title}" کافی نیست`);
                }
              }
            }
          });
        } catch (transError: any) {
          console.error('[ERROR] [PaymentVerify Zibal] Transaction failed:', transError);
          await prisma.order.update({
            where: { id: order.id, shopId: order.shopId },
            data: {
              status: 'cancelled',
              paymentStatus: 'failed',
              adminNotes: `خطای موجودی یا ثبت سفارش: ${transError.message || 'نامشخص'}`,
            },
          });
          return redirectUrl('failed', `&error=stock_error&message=${encodeURIComponent(transError.message || 'خطا در ثبت سفارش')}`);
        }

        // Award loyalty points if customer club is enabled
        try {
          if (settings.customerClubEnabled && order.userId) {
            const pointsEarned = Math.floor(order.finalAmount / settings.loyaltyPointsRate);
            if (pointsEarned > 0) {
              await prisma.user.update({
                where: { id: order.userId, shopId: order.shopId },
                data: { loyaltyPoints: { increment: pointsEarned } },
              });
              await prisma.notification.create({
                data: {
                  userId: order.userId,
                  shopId: order.shopId,
                  title: 'امتیاز وفاداری جدید',
                  message: `شما بابت خرید خود ${pointsEarned.toLocaleString('fa-IR')} امتیاز وفاداری دریافت کردید!`,
                  type: 'info',
                },
              });
            }
          }
        } catch (err) {
          console.error('Failed to award loyalty points on payment verify:', err);
        }

        return redirectUrl('success');
      } else {
        console.error('[ERROR] [PaymentVerify] Zibal verification failed:', zbData);
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'cancelled',
            paymentStatus: 'failed',
            adminNotes: `تایید تراکنش زیبال ناموفق بود: ${zbData.message || 'پاسخ نامعتبر'}`,
          },
        });
        return redirectUrl('failed', `&error=verification_failed&message=${encodeURIComponent(zbData.message || '')}`);
      }
    }

    if (status !== 'OK' || !authority) {
      await prisma.order.update({
        where: { id: order.id, shopId: order.shopId },
        data: {
          status: 'cancelled',
          paymentStatus: 'failed',
          adminNotes: 'تراکنش توسط کاربر لغو شد یا درگاه ناموفق بود.',
        },
      });
      return redirectUrl('failed', '&error=cancelled');
    }

    // Load shop settings to get merchant ID and sandbox mode
    const settings = await prisma.shopSettings.findUnique({
      where: { shopId: order.shopId },
    });

    if (!settings || !settings.zarinpalMerchantId) {
      return redirectUrl('failed', '&error=config_missing');
    }

    const isSandbox = !!settings.zarinpalSandbox;
    const verifyUrl = isSandbox
      ? 'https://sandbox.zarinpal.com/pg/v4/payment/verify.json'
      : 'https://api.zarinpal.com/pg/v4/payment/verify.json';

    // Calculate total amount in Tomans (same calculation as checkout)
    const taxAmount = Math.round(order.finalAmount * 0.09);
    const payTotal = order.finalAmount + taxAmount;
    
    let zarinpalAmount = Math.round(payTotal);
    if (settings.currency === 'IRR') {
      zarinpalAmount = Math.round(payTotal / 10);
    }
    if (zarinpalAmount < 100) {
      zarinpalAmount = 100;
    }

    console.log(`[INFO] [PaymentVerify] Requesting ZarinPal verification | { orderId: "${order.id}", amount: ${zarinpalAmount}, isSandbox: ${isSandbox} }`);

    const zpRes = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        merchant_id: settings.zarinpalMerchantId,
        amount: zarinpalAmount,
        authority: authority,
      }),
    });

    const zpData = await zpRes.json();

    if (zpRes.ok && zpData.data && (zpData.data.code === 100 || zpData.data.code === 101)) {
      const refId = String(zpData.data.ref_id);

      // Perform updates inside a transaction to maintain atomicity
      try {
        await prisma.$transaction(async (tx) => {
          // Lock the order row and check if already paid
          const lockedOrder = await tx.order.findUnique({
            where: { id: order.id, shopId: order.shopId },
            select: { paymentStatus: true }
          });

          if (lockedOrder?.paymentStatus === 'paid') {
            return;
          }

          // 1. Update order status
          await tx.order.update({
            where: { id: order.id, shopId: order.shopId },
            data: {
              status: 'paid',
              paymentStatus: 'paid',
              adminNotes: `ZarinPal Ref ID: ${refId}`,
            },
          });

          // 2. Reduce product stock
          for (const item of order.items) {
            if (item.variantId) {
              const updatedRows = await tx.$executeRaw`
                UPDATE "ProductVariant"
                SET stock = stock - ${item.quantity}
                WHERE id = ${item.variantId} AND stock >= ${item.quantity}
              `;
              if (updatedRows === 0) {
                throw new Error(`موجودی برای تنوع محصول "${item.product.title}" کافی نیست`);
              }
              // Decrement parent product stock by same quantity to keep in sync
              await tx.$executeRaw`
                UPDATE "Product"
                SET stock = stock - ${item.quantity}
                WHERE id = ${item.productId}
              `;
            } else {
              const updatedRows = await tx.$executeRaw`
                UPDATE "Product"
                SET stock = stock - ${item.quantity}
                WHERE id = ${item.productId} AND stock >= ${item.quantity}
              `;
              if (updatedRows === 0) {
                throw new Error(`موجودی برای محصول "${item.product.title}" کافی نیست`);
              }
            }
          }

          // 3. Generate download tokens for digital products
          for (const item of order.items) {
            if (item.product.type === 'digital') {
              const token = crypto.randomUUID();
              const dbProduct = item.product;
              const expiryDate = dbProduct.downloadExpiryDays && dbProduct.downloadExpiryDays > 0 
                ? new Date(Date.now() + dbProduct.downloadExpiryDays * 24 * 60 * 60 * 1000) 
                : null;

              // Extract buyer email from user notes if present
              let buyerEmail = order.user.email;
              const emailMatch = order.userNotes?.match(/ایمیل خریدار: ([^\n]*)/);
              if (emailMatch && emailMatch[1]) {
                buyerEmail = emailMatch[1].trim();
              }

              await tx.downloadToken.create({
                data: {
                  shopId: order.shopId,
                  orderId: order.id,
                  productId: item.productId,
                  userId: order.userId,
                  token,
                  buyerEmail: buyerEmail || null,
                  maxDownloads: dbProduct.downloadLimit || null,
                  expiresAt: expiryDate,
                },
              });

              console.log(`[INFO] [PaymentVerify] Secure download token created for order: ${order.id} | token: ${token}`);
            }
          }
        });
      } catch (transError: any) {
        console.error('[ERROR] [PaymentVerify ZarinPal] Transaction failed:', transError);
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'cancelled',
            paymentStatus: 'failed',
            adminNotes: `خطای موجودی یا ثبت سفارش: ${transError.message || 'نامشخص'}`,
          },
        });
        return redirectUrl('failed', `&error=stock_error&message=${encodeURIComponent(transError.message || 'خطا در ثبت سفارش')}`);
      }

      // Award loyalty points
      try {
        const { awardLoyaltyPoints } = await import('@/lib/loyalty');
        await awardLoyaltyPoints(order.userId, order.shopId, order.finalAmount);
      } catch (err) {
        console.error('Failed to award loyalty points on payment verify:', err);
      }

      console.log(`[INFO] [PaymentVerify] Payment verified successfully | { orderId: "${order.id}", refId: "${refId}" }`);
      return redirectUrl('success', `&refId=${refId}`);
    } else {
      console.error('[ERROR] [PaymentVerify] Verification failed:', zpData);
      const errorMsg = zpData.errors?.message || 'ناموفق بودن تراکنش';
      
      await prisma.order.update({
        where: { id: order.id, shopId: order.shopId },
        data: {
          status: 'failed',
          paymentStatus: 'failed',
          adminNotes: `ZarinPal verification error: ${errorMsg}`,
        },
      });

      return redirectUrl('failed', `&error=verification_failed&message=${encodeURIComponent(errorMsg)}`);
    }
  } catch (err: any) {
    console.error('[ERROR] [PaymentVerify] Exception:', err);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId') || '';
    const gateway = searchParams.get('gateway') || '';

    if (gateway === 'digipay') {
      const body = await request.json().catch(() => ({}));
      const trackingCode = body.trackingCode || '';
      const status = body.result || '';
      const type = parseInt(body.type) || 0;

      if (!orderId) {
        return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          user: true,
        },
        allowCrossTenant: true
      } as any);

      if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      const host = request.headers.get('host') || 'localhost:3000';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';
      const redirectUrl = (statusParam: string, extra = '') => {
        return NextResponse.redirect(`${protocol}://${host}/checkout?orderId=${order.id}&status=${statusParam}${extra}`);
      };

      if (order.paymentStatus === 'paid') {
        return redirectUrl('success');
      }

      if (status !== 'SUCCESS' || !trackingCode) {
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'cancelled',
            paymentStatus: 'failed',
            adminNotes: 'تراکنش دیجی‌پی ناموفق بود یا توسط کاربر لغو شد.',
          },
        });
        return redirectUrl('failed', '&error=cancelled');
      }

      // Load shop settings to get credentials
      const settings = await prisma.shopSettings.findUnique({
        where: { shopId: order.shopId },
      });

      if (!settings || !settings.digipayEnabled) {
        return redirectUrl('failed', '&error=config_missing');
      }

      // 1. Get access token
      const token = await getDigipayToken(
        settings.digipayClientId || '',
        settings.digipayClientSecret || '',
        settings.digipayUsername || '',
        settings.digipayPassword || '',
        !!settings.digipaySandbox
      );

      if (!token) {
        return redirectUrl('failed', '&error=auth_failed');
      }

      // 2. Verify payment
      const verifyRes = await verifyDigipayPayment(
        token,
        trackingCode,
        order.id,
        type,
        !!settings.digipaySandbox
      );

      if (verifyRes && verifyRes.result && verifyRes.result.status === 0) {
        // 3. Deliver purchase if Credit/BNPL (type 5 or 13)
        if (type === 5 || type === 13) {
          const productCodes = order.items.map(i => i.variantId || i.productId);
          await deliverDigipayPurchase(
            token,
            order.id,
            trackingCode,
            productCodes,
            type,
            !!settings.digipaySandbox
          );
        }

        // Perform updates inside a transaction to maintain atomicity
        try {
          await prisma.$transaction(async (tx) => {
            // Lock the order row and check if already paid
            const lockedOrder = await tx.order.findUnique({
              where: { id: order.id, shopId: order.shopId },
              select: { paymentStatus: true }
            });

            if (lockedOrder?.paymentStatus === 'paid') {
              return;
            }

            // 1. Update order status
            await tx.order.update({
              where: { id: order.id, shopId: order.shopId },
              data: {
                status: 'paid',
                paymentStatus: 'paid',
                adminNotes: `DigiPay Tracking Code: ${trackingCode} | Type: ${type}`,
              },
            });

            // 2. Reduce product stock
            for (const item of order.items) {
              if (item.variantId) {
                const updatedRows = await tx.$executeRaw`
                  UPDATE "ProductVariant"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.variantId} AND stock >= ${item.quantity}
                `;
                if (updatedRows === 0) {
                  throw new Error(`موجودی برای تنوع محصول "${item.product.title}" کافی نیست`);
                }
                // Decrement parent product stock by same quantity to keep in sync
                await tx.$executeRaw`
                  UPDATE "Product"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.productId}
                `;
              } else {
                const updatedRows = await tx.$executeRaw`
                  UPDATE "Product"
                  SET stock = stock - ${item.quantity}
                  WHERE id = ${item.productId} AND stock >= ${item.quantity}
                `;
                if (updatedRows === 0) {
                  throw new Error(`موجودی برای محصول "${item.product.title}" کافی نیست`);
                }
              }
            }

            // 3. Generate download tokens for digital products
            for (const item of order.items) {
              if (item.product.type === 'digital') {
                const downloadToken = crypto.randomUUID();
                const dbProduct = item.product;
                const expiryDate = dbProduct.downloadExpiryDays && dbProduct.downloadExpiryDays > 0 
                  ? new Date(Date.now() + dbProduct.downloadExpiryDays * 24 * 60 * 60 * 1000) 
                  : null;

                let buyerEmail = order.user.email;
                const emailMatch = order.userNotes?.match(/ایمیل خریدار: ([^\n]*)/);
                if (emailMatch && emailMatch[1]) {
                  buyerEmail = emailMatch[1].trim();
                }

                await tx.downloadToken.create({
                  data: {
                    shopId: order.shopId,
                    orderId: order.id,
                    productId: item.productId,
                    userId: order.userId,
                    token: downloadToken,
                    buyerEmail: buyerEmail || null,
                    maxDownloads: dbProduct.downloadLimit || null,
                    expiresAt: expiryDate,
                  },
                });
              }
            }
          });
        } catch (transError: any) {
          console.error('[ERROR] [PaymentVerify DigiPay] Transaction failed:', transError);
          await prisma.order.update({
            where: { id: order.id, shopId: order.shopId },
            data: {
              status: 'cancelled',
              paymentStatus: 'failed',
              adminNotes: `خطای موجودی یا ثبت سفارش: ${transError.message || 'نامشخص'}`,
            },
          });
          return redirectUrl('failed', `&error=stock_error&message=${encodeURIComponent(transError.message || 'خطا در ثبت سفارش')}`);
        }

        // Award loyalty points
        try {
          const { awardLoyaltyPoints } = await import('@/lib/loyalty');
          await awardLoyaltyPoints(order.userId, order.shopId, order.finalAmount);
        } catch (err) {
          console.error('Failed to award loyalty points on payment verify:', err);
        }

        return redirectUrl('success', `&refId=${trackingCode}`);
      } else {
        const errorMsg = verifyRes?.result?.message || 'تایید تراکنش دیجی‌پی ناموفق بود';
        console.error('[ERROR] [PaymentVerify] DigiPay verification failed:', verifyRes);
        await prisma.order.update({
          where: { id: order.id, shopId: order.shopId },
          data: {
            status: 'failed',
            paymentStatus: 'failed',
            adminNotes: `DigiPay verification error: ${errorMsg}`,
          },
        });
        return redirectUrl('failed', `&error=verification_failed&message=${encodeURIComponent(errorMsg)}`);
      }
    }

    return NextResponse.json({ error: 'Method not allowed for this gateway' }, { status: 405 });
  } catch (err: any) {
    console.error('[ERROR] [PaymentVerify POST] Exception:', err);
    return NextResponse.json({ error: 'Internal server error during verification' }, { status: 500 });
  }
}
