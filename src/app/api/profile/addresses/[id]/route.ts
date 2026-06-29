import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: addressId } = await params;
    const data = await request.json();
    const { title, receiver, phone, province, city, street, plaque, unit, postalCode } = data;

    // Verify ownership
    const existingAddress = await prisma.address.findUnique({
      where: { 
        id: addressId,
        shopId: tokenUser.shopId as string
      }
    });

    if (!existingAddress || existingAddress.userId !== tokenUser.id) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 });
    }

    const updatedAddress = await prisma.address.update({
      where: { 
        id: addressId,
        shopId: tokenUser.shopId as string
      },
      data: {
        title,
        receiver,
        phone,
        state: province,
        city,
        street,
        address: street,
        plaque,
        unit,
        zipCode: postalCode,
      }
    });

    return NextResponse.json({ success: true, address: updatedAddress });
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const tokenUser = await verifyAuth(request, 'customer');
    
    if (!tokenUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: addressId } = await params;

    // Verify ownership
    const existingAddress = await prisma.address.findUnique({
      where: { 
        id: addressId,
        shopId: tokenUser.shopId as string
      }
    });

    if (!existingAddress || existingAddress.userId !== tokenUser.id) {
      return NextResponse.json({ error: 'Address not found or unauthorized' }, { status: 404 });
    }

    await prisma.address.delete({
      where: { 
        id: addressId,
        shopId: tokenUser.shopId as string
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
