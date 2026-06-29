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
    const { message, attachmentUrl } = body;

    if (!message && !attachmentUrl) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
    }

    // Verify ticket belongs to shop
    const ticket = await prisma.systemTicket.findFirst({
      where: {
        id: resolvedParams.id,
        shopId: decoded.shopId,
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create message
    const ticketMessage = await prisma.systemTicketMessage.create({
      data: {
        ticketId: resolvedParams.id,
        senderId: decoded.id as string,
        senderRole: 'admin',
        message: message || '',
        attachmentUrl,
      }
    });

    // Update ticket status to in_progress (or new if it was answered/closed)
    await prisma.systemTicket.update({
      where: { id: resolvedParams.id },
      data: { 
        status: 'new', // Mark as new again so super admin knows there's a new reply from the merchant
        updatedAt: new Date(),
      }
    });

    return NextResponse.json({ message: ticketMessage });
  } catch (error) {
    console.error('Error adding system ticket message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
