import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Verify ticket belongs to shop
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: resolvedParams.id,
        shopId: decoded.shopId,
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create message
    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        ticketId: resolvedParams.id,
        shopId: decoded.shopId,
        senderId: decoded.id as string,
        isStaff: true,
        message,
      }
    });

    // Update ticket status to answered
    await prisma.ticket.updateMany({
      where: { 
        id: resolvedParams.id,
        shopId: decoded.shopId
      },
      data: { status: 'answered' }
    });

    // Notify the customer about the admin reply
    await prisma.notification.create({
      data: {
        shopId: decoded.shopId,
        userId: ticket.userId,
        title: 'پاسخ جدید به تیکت شما',
        message: `پشتیبانی به تیکت شما پاسخ داد: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`,
        type: 'info',
        linkUrl: `/profile/support/${ticket.id}`,
      },
    });

    return NextResponse.json({ message: ticketMessage });
  } catch (error) {
    console.error('Error adding ticket message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
