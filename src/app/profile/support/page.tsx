import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import SupportClient from './SupportClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function SupportPage() {
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

  // Fetch real tickets from database
  const dbTickets = await prisma.ticket.findMany({
    where: { 
      userId: user.id,
      shopId: user.shopId
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      order: true
    }
  });

  // Map to the format expected by the client component
  const tickets = dbTickets.map(ticket => {
    return {
      id: ticket.id,
      displayId: ticket.id.slice(-8).toUpperCase(),
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status, // new, in_progress, answered, closed
      priority: ticket.priority,
      createdAt: new Date(ticket.createdAt).toLocaleDateString('fa-IR'),
      updatedAt: new Date(ticket.updatedAt).toLocaleDateString('fa-IR'),
      orderId: ticket.orderId ? ticket.orderId.slice(-8).toUpperCase() : null
    };
  });

  return <SupportClient initialTickets={tickets} />;
}
