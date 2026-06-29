import { prisma } from './prisma';

/**
 * Award loyalty points to a user based on their order amount
 */
export async function awardLoyaltyPoints(userId: string, shopId: string, amountSpent: number) {
  try {
    // 1. Fetch shop settings to check if customer club is enabled and get settings
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId }
    });

    if (!shopSettings || !shopSettings.customerClubEnabled) {
      return null;
    }

    const {
      loyaltyPointsRate,
      loyaltyDiscountThreshold,
      loyaltyDiscountAmount,
      loyaltyDiscountType
    } = shopSettings;

    if (loyaltyPointsRate <= 0) return null;

    // 2. Calculate points to add
    const pointsToAdd = Math.floor(amountSpent / loyaltyPointsRate);
    if (pointsToAdd <= 0) return null;

    // 3. Update user's loyalty points
    const user = await prisma.user.update({
      where: { id: userId, shopId },
      data: {
        loyaltyPoints: {
          increment: pointsToAdd
        }
      }
    });

    // 4. Check if user has crossed the threshold
    if (user.loyaltyPoints >= loyaltyDiscountThreshold) {
      // Calculate how many discount codes to generate (in case they got a huge amount of points at once)
      const codesToGenerate = Math.floor(user.loyaltyPoints / loyaltyDiscountThreshold);
      const pointsToDeduct = codesToGenerate * loyaltyDiscountThreshold;

      // Generate discount codes and notifications
      for (let i = 0; i < codesToGenerate; i++) {
        // Generate unique discount code
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const discountCodeStr = `CLUB-${randomStr}`;

        // Create the DiscountCode in the database
        await prisma.discountCode.create({
          data: {
            shopId,
            code: discountCodeStr,
            discount: loyaltyDiscountAmount,
            type: loyaltyDiscountType,
            maxUses: 1,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
          }
        });

        // Send Notification to the user
        const discountValueStr = loyaltyDiscountType === 'percentage' 
          ? `${loyaltyDiscountAmount}٪` 
          : `${loyaltyDiscountAmount.toLocaleString('fa-IR')} تومان`;

        await prisma.notification.create({
          data: {
            shopId,
            userId,
            title: '🎁 هدیه باشگاه مشتریان - کد تخفیف جدید',
            message: `تبریک! امتیازات شما در باشگاه مشتریان به حد نصاب رسید. کد تخفیف تک‌بار مصرف شما: ${discountCodeStr} با ارزش ${discountValueStr} برای شما صادر شد. (معتبر به مدت ۳۰ روز)`,
            type: 'success',
            linkUrl: '/cart',
          }
        });
      }

      // Deduct the points from user
      await prisma.user.update({
        where: { id: userId, shopId },
        data: {
          loyaltyPoints: {
            decrement: pointsToDeduct
          }
        }
      });
    }

    return pointsToAdd;
  } catch (error) {
    console.error('[ERROR] [Loyalty]: Failed to award loyalty points:', error);
    return null;
  }
}

/**
 * Check if user crossed the threshold and issue auto discount (used when points are manually adjusted)
 */
export async function checkAndIssueAutoDiscount({
  userId,
  shopId,
  pointsBefore,
  pointsAfter,
  shopSettings,
}: {
  userId: string;
  shopId: string;
  pointsBefore: number;
  pointsAfter: number;
  shopSettings: any;
}) {
  try {
    if (!shopSettings || !shopSettings.customerClubEnabled) {
      return;
    }

    const {
      loyaltyDiscountThreshold,
      loyaltyDiscountAmount,
      loyaltyDiscountType
    } = shopSettings;

    if (pointsAfter >= loyaltyDiscountThreshold) {
      const codesToGenerate = Math.floor(pointsAfter / loyaltyDiscountThreshold);
      const pointsToDeduct = codesToGenerate * loyaltyDiscountThreshold;

      for (let i = 0; i < codesToGenerate; i++) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const discountCodeStr = `CLUB-${randomStr}`;

        await prisma.discountCode.create({
          data: {
            shopId,
            code: discountCodeStr,
            discount: loyaltyDiscountAmount,
            type: loyaltyDiscountType,
            maxUses: 1,
            isActive: true,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Valid for 30 days
          }
        });

        const discountValueStr = loyaltyDiscountType === 'percentage' 
          ? `${loyaltyDiscountAmount}٪` 
          : `${loyaltyDiscountAmount.toLocaleString('fa-IR')} تومان`;

        await prisma.notification.create({
          data: {
            shopId,
            userId,
            title: '🎁 هدیه باشگاه مشتریان - کد تخفیف جدید',
            message: `تبریک! امتیازات شما در باشگاه مشتریان به حد نصاب رسید. کد تخفیف تک‌بار مصرف شما: ${discountCodeStr} با ارزش ${discountValueStr} برای شما صادر شد. (معتبر به مدت ۳۰ روز)`,
            type: 'success',
            linkUrl: '/cart',
          }
        });
      }

      await prisma.user.update({
        where: { id: userId, shopId },
        data: {
          loyaltyPoints: {
            decrement: pointsToDeduct
          }
        }
      });
    }
  } catch (error) {
    console.error('[ERROR] [Loyalty]: Failed to check and issue auto discount:', error);
  }
}
