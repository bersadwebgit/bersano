import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { message, attachmentUrl } = data;

    if (!message && !attachmentUrl) {
      return NextResponse.json({ error: 'پیام یا فایل پیوست نمی‌تواند خالی باشد' }, { status: 400 });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { 
        id: resolvedParams.id,
        userId: tokenUser.id as string,
        shopId: tokenUser.shopId as string 
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const ticketMessage = await prisma.ticketMessage.create({
      data: {
        shopId: tokenUser.shopId as string,
        ticketId: ticket.id,
        senderId: tokenUser.id as string,
        isStaff: false,
        message: message || '',
        attachmentUrl: attachmentUrl || null
      }
    });

    // Update ticket status to "new" or "in_progress" depending on if it was closed
    if (ticket.status === 'closed' || ticket.status === 'answered') {
      await prisma.ticket.update({
        where: { 
          id: ticket.id,
          shopId: tokenUser.shopId as string
        },
        data: { status: 'new' }
      });
    } else {
      // Just update the updatedAt timestamp
      await prisma.ticket.update({
        where: { 
          id: ticket.id,
          shopId: tokenUser.shopId as string
        },
        data: { updatedAt: new Date() }
      });
    }

    return NextResponse.json(ticketMessage);
  } catch (error) {
    console.error('Error creating ticket message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
