import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'فروشگاه یافت نشد' }, { status: 404 });
    }

    const body = await request.json();
    const { ticketId, contact } = body;

    if (!ticketId || !contact) {
      return NextResponse.json({ error: 'کد تیکت و اطلاعات تماس الزامی هستند' }, { status: 400 });
    }

    const cleanContact = contact.toLowerCase().trim();

    // Find the ticket belonging to this shop, with correct id
    const ticket = await prisma.ticket.findFirst({
      where: {
        id: ticketId.trim(),
        shopId: shop.shopId,
        subject: 'contact',
        user: {
          OR: [
            { email: cleanContact },
            { phone: contact.trim() }
          ]
        }
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          }
        },
        messages: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ error: 'پیام یا تیکت معتبری با این مشخصات یافت نشد' }, { status: 404 });
    }

    // Map database fields to standard response structure
    const mappedTicket = {
      id: ticket.id,
      displayId: ticket.id.slice(-8).toUpperCase(),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      createdAt: new Date(ticket.createdAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      updatedAt: new Date(ticket.updatedAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      user: {
        name: ticket.user.name,
        email: ticket.user.email,
        phone: ticket.user.phone,
      },
      messages: ticket.messages.map(msg => ({
        id: msg.id,
        isStaff: msg.isStaff,
        message: msg.message,
        createdAt: new Date(msg.createdAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      }))
    };

    return NextResponse.json({ success: true, ticket: mappedTicket });
  } catch (error) {
    console.error('[ERROR] [ContactTrackApi]:', error);
    return NextResponse.json({ error: 'خطای سرور در بازیابی تیکت' }, { status: 500 });
  }
}
