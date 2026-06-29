import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findFirst({
      where: { 
        id: tokenUser.id as string,
        shopId: tokenUser.shopId as string
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = await request.json();
    const { title, receiver, phone, province, city, street, plaque, unit, postalCode } = data;

    const newAddress = await prisma.address.create({
      data: {
        shopId: user.shopId,
        userId: user.id,
        title,
        receiver,
        phone,
        state: province,
        city,
        street,
        address: street, // fallback for address field
        plaque,
        unit,
        zipCode: postalCode,
      }
    });

    return NextResponse.json({ success: true, address: newAddress });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
