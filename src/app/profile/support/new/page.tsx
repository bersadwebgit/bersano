import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import NewTicketClient from './NewTicketClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function NewTicketPage() {
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

  // Fetch user's recent orders for the dropdown
  const dbOrders = await prisma.order.findMany({
    where: { 
      userId: user.id,
      shopId: user.shopId
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  });

  const orders = dbOrders.map(order => ({
    id: order.id,
    displayId: order.id.slice(-8).toUpperCase(),
    date: new Date(order.createdAt).toLocaleDateString('fa-IR'),
  }));

  return <NewTicketClient orders={orders} />;
}
