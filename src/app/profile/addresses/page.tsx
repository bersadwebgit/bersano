import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import AddressesClient from './AddressesClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function AddressesPage() {
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

  // Fetch real addresses from database
  const dbAddresses = await prisma.address.findMany({
    where: { 
      userId: user.id,
      shopId: user.shopId
    },
    orderBy: { createdAt: 'desc' }
  });

  // Map to the format expected by the client component
  const addresses = dbAddresses.map((address, index) => ({
    id: address.id,
    title: address.title,
    receiver: address.receiver,
    phone: address.phone,
    province: address.state,
    city: address.city,
    street: address.street || address.address,
    plaque: address.plaque || '',
    unit: address.unit || '',
    postalCode: address.zipCode || '',
    isDefault: index === 0, // First address is default for now
  }));

  return <AddressesClient initialAddresses={addresses} />;
}
