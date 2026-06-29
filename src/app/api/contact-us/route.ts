import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'فروشگاه یافت نشد' }, { status: 404 });
    }

    const data = await request.json();
    const { name, email, phone, subject, message } = data;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'نام، ایمیل و پیام الزامی هستند' }, { status: 400 });
    }

    // 1. Find or create the user under this shop
    const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
    const hashedPassword = await bcrypt.hash(randomPassword, 10);

    const user = await prisma.user.upsert({
      where: {
        shopId: shop.shopId,
        shopId_email: {
          shopId: shop.shopId,
          email: email.toLowerCase().trim(),
        },
      },
      update: {
        name,
        phone: phone || undefined,
      },
      create: {
        shopId: shop.shopId,
        email: email.toLowerCase().trim(),
        name,
        phone: phone || null,
        password: hashedPassword,
        role: 'customer',
      },
    });

    // 2. Format description with selected subject/department if available
    let description = message;
    if (subject) {
      description = `موضوع انتخابی کاربر: ${subject}\n\nپیام:\n${message}`;
    }

    // 3. Create the ticket under 'contact' subject
    const ticket = await prisma.ticket.create({
      data: {
        shopId: shop.shopId,
        userId: user.id,
        subject: 'contact', // special subject for contact form messages
        description: description,
        status: 'new',
        priority: 'normal',
      },
    });

    // 4. Create a notification for the system/admin
    // (Optional, but good for UX)
    await prisma.notification.create({
      data: {
        shopId: shop.shopId,
        userId: user.id,
        title: 'پیام جدید از فرم تماس با ما',
        message: `یک پیام جدید از طرف ${name} (${email}) در فرم تماس با ما ثبت شد.`,
        type: 'info',
        linkUrl: `/admin/tickets/${ticket.id}`,
      },
    });

    // Return ticket with tracking helpful message
    return NextResponse.json({ 
      success: true, 
      ticket,
      trackingMessage: `پیام شما با موفقیت ثبت شد. کد پیگیری شما: \n\n${ticket.id}\n\nلطفاً این کد را ذخیره کنید. می‌توانید برای پیگیری پاسخ این پیام از دکمه «پیگیری پیام‌های قبلی» در بالای صفحه استفاده کنید.`
    });
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت پیام' }, { status: 500 });
  }
}
