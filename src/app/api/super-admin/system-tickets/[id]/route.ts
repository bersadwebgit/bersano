import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const decoded = await verifyAuth(request, 'superadmin');
    
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ticket = await prisma.systemTicket.findUnique({
      where: {
        id: resolvedParams.id,
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'asc',
          }
        }
      },
      allowCrossTenant: true
    } as any);

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const shop = await prisma.shopSettings.findUnique({
      where: { shopId: ticket.shopId },
      select: {
        shopName: true,
        subdomain: true,
      }
    });

    return NextResponse.json({ 
      ticket: {
        ...ticket,
        shop,
      }
    });
  } catch (error) {
    console.error('Error fetching system ticket for super-admin:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const { status, priority } = body;

    const data: any = {};
    if (status) data.status = status;
    if (priority) data.priority = priority;

    const ticket = await prisma.systemTicket.update({
      where: {
        id: resolvedParams.id,
      },
      data,
      allowCrossTenant: true
    } as any);

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error updating system ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
