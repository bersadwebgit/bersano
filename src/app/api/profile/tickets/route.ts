import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tickets = await prisma.ticket.findMany({
      where: { 
        userId: tokenUser.id as string,
        shopId: tokenUser.shopId as string 
      },
      include: {
        order: {
          select: {
            id: true,
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json(tickets);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { subject, description, orderId, attachmentUrl } = data;

    if (!subject || !description) {
      return NextResponse.json({ error: 'موضوع و توضیحات الزامی است' }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        shopId: tokenUser.shopId as string,
        userId: tokenUser.id as string,
        subject,
        description,
        orderId: orderId || null,
        attachmentUrl: attachmentUrl || null,
        status: 'new'
      }
    });

    // Create a notification for the user
    await prisma.notification.create({
      data: {
        shopId: tokenUser.shopId as string,
        userId: tokenUser.id as string,
        title: 'تیکت جدید ثبت شد',
        message: `تیکت شما با موضوع "${subject}" با موفقیت ثبت شد و در اسرع وقت بررسی خواهد شد.`,
        type: 'success',
        linkUrl: `/profile/support/${ticket.id}`
      }
    });

    return NextResponse.json(ticket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
