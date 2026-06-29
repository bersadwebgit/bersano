import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    const data = await req.json();
    const { action, password, isBlocked } = data;

    // Verify user belongs to this shop
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        shopId: payload.shopId,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'changePassword') {
      if (!password || password.length < 6) {
        return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      
      await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: { password: hashedPassword }
      });

      return NextResponse.json({ success: true, message: 'رمز عبور با موفقیت تغییر یافت' });
    } 
    
    if (action === 'changeGroup') {
      const { group } = data;
      const updatedUser = await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: { group }
      });
      return NextResponse.json({ success: true, message: 'گروه کاربر با موفقیت تغییر یافت', group: updatedUser.group });
    }

    if (action === 'toggleWholesaler') {
      const { isWholesaler, requestId, status } = data;
      if (typeof isWholesaler !== 'boolean') {
        return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
      }
      const updatedUser = await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: { isWholesaler }
      });

      if (requestId) {
        await prisma.wholesaleRequest.update({
          where: { id: requestId, shopId: payload.shopId },
          data: { status: status || (isWholesaler ? 'approved' : 'rejected') }
        });
      } else {
        await prisma.wholesaleRequest.updateMany({
          where: { userId, shopId: payload.shopId, status: 'pending' },
          data: { status: isWholesaler ? 'approved' : 'rejected' }
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: isWholesaler ? 'کاربر به عنوان همکار عمده‌فروش تایید شد' : 'کاربر از وضعیت همکار عمده‌فروش خارج شد', 
        isWholesaler: updatedUser.isWholesaler 
      });
    }

    if (action === 'updateCredit') {
      const { creditLimit, resetBalance } = data;
      if (typeof creditLimit !== 'number' || creditLimit < 0) {
        return NextResponse.json({ error: 'سقف اعتبار نامعتبر است' }, { status: 400 });
      }

      if (creditLimit < user.creditBalance) {
        return NextResponse.json({ error: 'سقف اعتبار نمی‌تواند کمتر از بدهی فعلی کاربر باشد' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: {
          creditLimit,
          creditBalance: resetBalance ? 0 : undefined
        }
      });

      return NextResponse.json({
        success: true,
        message: 'اعتبار کاربر با موفقیت بروزرسانی شد',
        creditLimit: updatedUser.creditLimit,
        creditBalance: updatedUser.creditBalance
      });
    }
    
    if (action === 'updateUser') {
      const { name, phone, email } = data;
      
      const updatedUser = await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: {
          name: name !== undefined ? name : undefined,
          phone: phone !== undefined ? phone : undefined,
          email: email !== undefined ? email : undefined,
        }
      });

      if (phone) {
        const primaryAddress = await prisma.address.findFirst({
          where: { userId, shopId: payload.shopId }
        });

        if (primaryAddress) {
          await prisma.address.update({
            where: { id: primaryAddress.id },
            data: { phone }
          });
        } else {
          await prisma.address.create({
            data: {
              shopId: payload.shopId,
              userId,
              title: 'آدرس اصلی',
              phone,
              state: 'ثبت نشده',
              city: 'ثبت نشده',
              address: 'ثبت نشده',
            }
          });
        }
      }

      return NextResponse.json({ success: true, message: 'اطلاعات کاربر با موفقیت بروزرسانی شد', user: updatedUser });
    }
    
    if (action === 'toggleBlock') {
      if (typeof isBlocked !== 'boolean') {
        return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: { isBlocked }
      });

      return NextResponse.json({ 
        success: true, 
        message: isBlocked ? 'کاربر مسدود شد' : 'کاربر رفع مسدودیت شد',
        isBlocked: updatedUser.isBlocked
      });
    }

    if (action === 'adjustPoints') {
      const { points, reason } = data;
      if (typeof points !== 'number') {
        return NextResponse.json({ error: 'امتیاز نامعتبر است' }, { status: 400 });
      }

      // Check settings to see if auto discount is triggered
      const shopSettings = await prisma.shopSettings.findUnique({
        where: { shopId: payload.shopId }
      });

      const previousPoints = user.loyaltyPoints;
      const newPoints = Math.max(0, previousPoints + points);

      const updatedUser = await prisma.user.update({
        where: { id: userId, shopId: payload.shopId },
        data: { loyaltyPoints: newPoints }
      });

      // Import loyalty helper and trigger auto discount checking if points increased
      if (points > 0 && shopSettings) {
        const { checkAndIssueAutoDiscount } = require('@/lib/loyalty');
        await checkAndIssueAutoDiscount({
          userId: user.id,
          shopId: payload.shopId,
          pointsBefore: previousPoints,
          pointsAfter: newPoints,
          shopSettings,
        });
      }

      return NextResponse.json({
        success: true,
        message: points >= 0 ? `${points} امتیاز افزوده شد.` : `${Math.abs(points)} امتیاز کسر شد.`,
        loyaltyPoints: updatedUser.loyaltyPoints
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
