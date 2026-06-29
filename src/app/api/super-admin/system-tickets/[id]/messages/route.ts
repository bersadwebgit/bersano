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
    const decoded = await verifyAuth(request, 'superadmin');
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { message, attachmentUrl } = body;

    if (!message && !attachmentUrl) {
      return NextResponse.json({ error: 'Message or attachment is required' }, { status: 400 });
    }

    // Verify ticket exists
    const ticket = await prisma.systemTicket.findUnique({
      where: {
        id: resolvedParams.id,
      },
      allowCrossTenant: true
    } as any);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Create message
    const ticketMessage = await prisma.systemTicketMessage.create({
      data: {
        ticketId: resolvedParams.id,
        senderId: 'superadmin',
        senderRole: 'superadmin',
        message: message || '',
        attachmentUrl,
      }
    });

    // Update ticket status to answered
    await prisma.systemTicket.update({
      where: { id: resolvedParams.id },
      data: { 
        status: 'answered',
        updatedAt: new Date(),
      },
      allowCrossTenant: true
    } as any);

    // Notify the tenant admin about the super admin reply
    // Let's find the tenant admin user for this shop
    const tenantAdmin = await prisma.user.findFirst({
      where: {
        shopId: ticket.shopId,
        role: 'admin',
      }
    });

    if (tenantAdmin) {
      await prisma.notification.create({
        data: {
          shopId: ticket.shopId,
          userId: tenantAdmin.id,
          title: 'پاسخ جدید از مدیریت کل سیستم',
          message: `مدیر کل به تیکت پشتیبانی شما پاسخ داد: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`,
          type: 'info',
          linkUrl: `/admin/system-tickets/${ticket.id}`,
        },
      });
    }

    return NextResponse.json({ message: ticketMessage });
  } catch (error) {
    console.error('Error adding system ticket message from super-admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
