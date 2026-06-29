import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { isAdminRole } from '@/lib/admin-roles';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    
    if (!adminUser || !isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { status, showOnHomepage } = await request.json();

    // Verify review belongs to admin's shop
    const review = await prisma.review.findFirst({
      where: {
        id,
        shopId: adminUser.shopId,
      }
    });

    if (!review || review.shopId !== adminUser.shopId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) {
      if (!['approved', 'rejected', 'pending', 'homepage_only'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (showOnHomepage !== undefined) {
      updateData.showOnHomepage = !!showOnHomepage;
    }

    const updatedReview = await prisma.review.update({
      where: {
        id,
        shopId: adminUser.shopId,
      },
      data: updateData
    });

    return NextResponse.json({ success: true, review: updatedReview });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await verifyAuth(request, 'admin');
    
    if (!adminUser || !isAdminRole(adminUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify review belongs to admin's shop
    const review = await prisma.review.findFirst({
      where: {
        id,
        shopId: adminUser.shopId,
      }
    });

    if (!review || review.shopId !== adminUser.shopId) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.review.delete({
      where: {
        id,
        shopId: adminUser.shopId,
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
