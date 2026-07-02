import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      status,
      shippingStatus,
      paymentStatus,
      paymentMethod,
      shippingCarrier,
      shippingTrackingCode,
      shippingCost,
      taxAmount,
      trackingLink,
      adminNotes,
      returnStatus,
      returnReason,
      refundAmount,
      refundMethod,
      messageToCustomer, // direct message/notification
    } = body;

    // Fetch existing order with items
    const order = await prisma.order.findFirst({
      where: {
        id,
        shopId: decoded.shopId,
      },
      include: {
        items: true,
      }
    });

    if (!order || order.shopId !== decoded.shopId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const updateData: any = {};
    const timelineEvents: any[] = [];
    const now = new Date();

    // Track status timeline
    let timeline: any[] = [];
    try {
      if (order.statusTimeline) {
        timeline = JSON.parse(order.statusTimeline);
      }
    } catch (e) {
      console.error('Error parsing status timeline:', e);
    }

    // Status updates and timeline tracking
    if (status && status !== order.status) {
      updateData.status = status;
      
      let statusFa = status;
      if (status === 'pending') statusFa = 'در انتظار پرداخت';
      if (status === 'paid') statusFa = 'پرداخت شده';
      if (status === 'shipped') statusFa = 'ارسال شده';
      if (status === 'delivered') statusFa = 'تحویل شده';
      if (status === 'cancelled') statusFa = 'لغو شده';
      if (status === 'returned') statusFa = 'مرجوع شده';

      timelineEvents.push({
        title: `تغییر وضعیت عمومی سفارش`,
        description: `وضعیت سفارش به "${statusFa}" تغییر یافت.`,
        date: now.toISOString(),
      });

      // Stock adjustment if order is cancelled
      if (status === 'cancelled' && order.status !== 'cancelled') {
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.productVariant.update({
              where: {
                id: item.variantId,
                shopId: decoded.shopId,
              },
              data: { stock: { increment: item.quantity } }
            });
          } else {
            await prisma.product.update({
              where: {
                id: item.productId,
                shopId: decoded.shopId,
              },
              data: { stock: { increment: item.quantity } }
            });
          }
        }
      }
    }

    if (shippingStatus && shippingStatus !== order.shippingStatus) {
      updateData.shippingStatus = shippingStatus;

      let shipFa = shippingStatus;
      if (shippingStatus === 'new') shipFa = 'جدید / ثبت شده';
      if (shippingStatus === 'processing') shipFa = 'در انتظار پردازش (آماده‌سازی)';
      if (shippingStatus === 'shipped') shipFa = 'ارسال شده (تحویل به پیک/پست)';
      if (shippingStatus === 'delivered') shipFa = 'تکمیل شده (تحویل به مشتری)';

      timelineEvents.push({
        title: `تغییر وضعیت ارسال`,
        description: `وضعیت ارسال به "${shipFa}" تغییر یافت.`,
        date: now.toISOString(),
      });
    }

    if (paymentStatus && paymentStatus !== order.paymentStatus) {
      updateData.paymentStatus = paymentStatus;

      let payFa = paymentStatus;
      if (paymentStatus === 'pending') payFa = 'در انتظار پرداخت';
      if (paymentStatus === 'paid') payFa = 'پرداخت موفق';
      if (paymentStatus === 'failed') payFa = 'پرداخت ناموفق';
      if (paymentStatus === 'refunded') payFa = 'استرداد وجه';

      timelineEvents.push({
        title: `تغییر وضعیت پرداخت`,
        description: `وضعیت پرداخت به "${payFa}" تغییر یافت.`,
        date: now.toISOString(),
      });
    }

    // Other fields updates
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;
    if (shippingCarrier !== undefined) updateData.shippingCarrier = shippingCarrier;
    if (shippingTrackingCode !== undefined) updateData.shippingTrackingCode = shippingTrackingCode;
    if (shippingCost !== undefined) updateData.shippingCost = parseFloat(shippingCost || '0');
    if (taxAmount !== undefined) updateData.taxAmount = parseFloat(taxAmount || '0');
    if (trackingLink !== undefined) updateData.trackingLink = trackingLink;
    if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
    if (returnReason !== undefined) updateData.returnReason = returnReason;

    // Returns and cancellations logic
    if (returnStatus && returnStatus !== order.returnStatus) {
      updateData.returnStatus = returnStatus;
      
      let returnFa = returnStatus;
      if (returnStatus === 'none') returnFa = 'بدون مرجوعی';
      if (returnStatus === 'pending') returnFa = 'درخواست مرجوعی در انتظار بررسی';
      if (returnStatus === 'approved') returnFa = 'درخواست مرجوعی تایید شده';
      if (returnStatus === 'rejected') returnFa = 'درخواست مرجوعی رد شده';

      timelineEvents.push({
        title: `تغییر وضعیت درخواست مرجوعی`,
        description: `وضعیت درخواست مرجوعی به "${returnFa}" تغییر یافت.`,
        date: now.toISOString(),
      });

      // Stock adjustment if return is approved
      if (returnStatus === 'approved' && order.returnStatus !== 'approved') {
        for (const item of order.items) {
          if (item.variantId) {
            await prisma.productVariant.update({
              where: {
                id: item.variantId,
                shopId: decoded.shopId,
              },
              data: { stock: { increment: item.quantity } }
            });
          } else {
            await prisma.product.update({
              where: {
                id: item.productId,
                shopId: decoded.shopId,
              },
              data: { stock: { increment: item.quantity } }
            });
          }
        }
        updateData.refundDate = now;
      }
    }

    if (refundAmount !== undefined) updateData.refundAmount = parseFloat(refundAmount || '0');
    if (refundMethod !== undefined) updateData.refundMethod = refundMethod;

    // Build final timeline
    if (timelineEvents.length > 0) {
      timeline = [...timeline, ...timelineEvents];
      updateData.statusTimeline = JSON.stringify(timeline);
    }

    // Update the Order
    const updatedOrder = await prisma.order.update({
      where: {
        id,
        shopId: decoded.shopId,
      },
      data: updateData,
    });

    // Send SMS notifications asynchronously (non-blocking)
    const isBecomingShipped = (status === 'shipped' && order.status !== 'shipped') || (shippingStatus === 'shipped' && order.shippingStatus !== 'shipped');
    const isBecomingCancelled = (status === 'cancelled' && order.status !== 'cancelled');

    if (isBecomingShipped || isBecomingCancelled) {
      (async () => {
        try {
          const userDb = await prisma.user.findUnique({
            where: { id: order.userId }
          });
          const recipientPhone = order.phone || userDb?.phone;
          if (recipientPhone) {
            const customerName = userDb?.name || 'مشتری';
            const orderNumber = order.id.slice(-8).toUpperCase();

            if (isBecomingShipped) {
              const trackingCode = shippingTrackingCode || order.shippingTrackingCode || 'ثبت نشده';
              const { sendStoreSms } = await import('@/lib/sms');
              await sendStoreSms(decoded.shopId as string, 'order_shipped', recipientPhone, {
                customerName,
                orderNumber,
                trackingCode,
              });
            } else if (isBecomingCancelled) {
              const { sendStoreSms } = await import('@/lib/sms');
              await sendStoreSms(decoded.shopId as string, 'order_cancelled', recipientPhone, {
                customerName,
                orderNumber,
              });
            }
          }
        } catch (err) {
          console.error('[ERROR] [SMS]: Failed to send order status update SMS |', err);
        }
      })();
    }

    // Send Real-time Notification to Bale Bot on Status Changes
    try {
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: decoded.shopId }
      });

      if (shopSettings?.baleOrderNotificationsEnabled && shopSettings?.baleChatId) {
        let shouldSend = true;
        if (shopSettings.baleNotificationStatuses) {
          try {
            const allowedStatuses = JSON.parse(shopSettings.baleNotificationStatuses);
            if (Array.isArray(allowedStatuses) && !allowedStatuses.includes(status)) {
              shouldSend = false;
            }
          } catch (e) {}
        }

        if (shouldSend) {
          const systemBotToken = await prisma.systemSetting.findUnique({
            where: { key: 'central_bale_bot_token' }
          });

          if (systemBotToken && systemBotToken.value) {
            const currencyText = shopSettings.currency === 'IRT' ? 'تومان' : 'ریال';
            const statusMap: Record<string, string> = {
              pending: '⏳ در انتظار پرداخت',
              paid: '✅ پرداخت شده',
              shipped: '🚚 ارسال شده',
              delivered: '📦 تحویل شده',
              cancelled: '❌ لغو شده',
              returned: '🔄 مرجوع شده',
            };
            const statusText = statusMap[status] || status;

            const messageText = `🔔 *تغییر وضعیت سفارش!*
🏪 فروشگاه: ${shopSettings.shopName}
🆔 شماره سفارش: \`${order.id}\`
💰 مبلغ نهایی: *${order.finalAmount.toLocaleString('fa-IR')}* ${currencyText}
وضعیت جدید: ${statusText}`;

            const { sendBaleBotMessage } = await import('@/lib/bale');
            await sendBaleBotMessage(
              systemBotToken.value.trim(),
              shopSettings.baleChatId,
              messageText
            );
          }
        }
      }
    } catch (baleErr) {
      console.error('[ERROR] [BaleNotification]: Failed to send status update notification:', baleErr);
    }

    // Send Real-time Notification to Telegram Bot on Status Changes
    try {
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: decoded.shopId }
      });

      if (shopSettings?.telegramOrderNotificationsEnabled && shopSettings?.telegramChatId) {
        let shouldSend = true;
        if (shopSettings.telegramNotificationStatuses) {
          try {
            const allowedStatuses = JSON.parse(shopSettings.telegramNotificationStatuses);
            if (Array.isArray(allowedStatuses) && !allowedStatuses.includes(status)) {
              shouldSend = false;
            }
          } catch (e) {}
        }

        if (shouldSend) {
          const systemBotToken = await prisma.systemSetting.findUnique({
            where: { key: 'central_telegram_bot_token' }
          });

          if (systemBotToken && systemBotToken.value) {
            const currencyText = shopSettings.currency === 'IRT' ? 'تومان' : 'ریال';
            const statusMap: Record<string, string> = {
              pending: '⏳ در انتظار پرداخت',
              paid: '✅ پرداخت شده',
              shipped: '🚚 ارسال شده',
              delivered: '📦 تحویل شده',
              cancelled: '❌ لغو شده',
              returned: '🔄 مرجوع شده',
            };
            const statusText = statusMap[status] || status;

            const messageText = `🔔 *تغییر وضعیت سفارش!*
🏪 فروشگاه: ${shopSettings.shopName}
🆔 شماره سفارش: \`${order.id}\`
💰 مبلغ نهایی: *${order.finalAmount.toLocaleString('fa-IR')}* ${currencyText}
وضعیت جدید: ${statusText}`;

            const { sendTelegramBotMessage } = await import('@/lib/telegram');
            await sendTelegramBotMessage(
              systemBotToken.value.trim(),
              shopSettings.telegramChatId,
              messageText
            );
          }
        }
      }
    } catch (telegramErr) {
      console.error('[ERROR] [TelegramNotification]: Failed to send status update notification:', telegramErr);
    }

    // Award loyalty points if the order becomes paid
    const isBecomingPaid = (paymentStatus === 'paid' && order.paymentStatus !== 'paid') || (status === 'paid' && order.status !== 'paid');
    if (isBecomingPaid) {
      try {
        const { awardLoyaltyPoints } = await import('@/lib/loyalty');
        await awardLoyaltyPoints(order.userId, order.shopId, order.finalAmount);
      } catch (err) {
        console.error('Failed to award loyalty points on order update:', err);
      }
    }

    // Send notification/message to the customer if status changed OR if messageToCustomer is provided
    let notificationMessage = '';
    let notificationTitle = 'به‌روزرسانی سفارش';

    if (messageToCustomer) {
      notificationTitle = 'پیام از طرف مدیریت فروشگاه';
      notificationMessage = messageToCustomer;
    } else if (timelineEvents.length > 0) {
      notificationMessage = `سفارش شما با شناسه ${order.id.slice(-8).toUpperCase()} به‌روزرسانی شد:\n` + 
        timelineEvents.map(e => `• ${e.title}: ${e.description}`).join('\n');
    }

    if (notificationMessage) {
      await prisma.notification.create({
        data: {
          shopId: decoded.shopId,
          userId: order.userId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'info',
          linkUrl: `/profile/orders?orderId=${order.id}`,
        }
      });
    }

    return NextResponse.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
