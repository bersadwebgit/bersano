import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SingleTicketClient from './SingleTicketClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function SingleTicketPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  const token = customerToken;
  
  if (!token) {
    redirect('/login');
  }

  let payload;
  try {
    const verified = await jwtVerify(token, key);
    payload = verified.payload;
  } catch (err) {
    redirect('/login');
  }

  const user = await prisma.user.findFirst({
    where: { 
      id: payload.id as string,
      shopId: payload.shopId as string
    }
  });

  if (!user) {
    redirect('/login');
  }

  // Fetch the ticket
  const dbTicket = await prisma.ticket.findFirst({
    where: { 
      id: resolvedParams.id,
      userId: user.id,
      shopId: user.shopId
    },
    include: {
      order: {
        select: {
          id: true,
          createdAt: true,
          totalAmount: true
        }
      },
      messages: {
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  if (!dbTicket) {
    redirect('/profile/support');
  }

  const ticket = {
    id: dbTicket.id,
    displayId: dbTicket.id.slice(-8).toUpperCase(),
    subject: dbTicket.subject,
    description: dbTicket.description,
    status: dbTicket.status,
    priority: dbTicket.priority,
    createdAt: new Date(dbTicket.createdAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    updatedAt: new Date(dbTicket.updatedAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
    attachmentUrl: dbTicket.attachmentUrl,
    order: dbTicket.order ? {
      id: dbTicket.order.id,
      displayId: dbTicket.order.id.slice(-8).toUpperCase(),
      date: new Date(dbTicket.order.createdAt).toLocaleDateString('fa-IR'),
      amount: dbTicket.order.totalAmount
    } : null,
    messages: dbTicket.messages.map(msg => ({
      id: msg.id,
      isStaff: msg.isStaff,
      message: msg.message,
      attachmentUrl: msg.attachmentUrl,
      createdAt: new Date(msg.createdAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' })
    }))
  };

  return <SingleTicketClient key={ticket.id} ticket={ticket} />;
}
