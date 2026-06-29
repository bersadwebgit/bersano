import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTenantShop } from '@/lib/tenant';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { id } = await params;

    const session = await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!session || session.shopId !== shop.shopId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error('[ERROR] [ChatSessionDetail]: Error fetching session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const shop = await getTenantShop();
    if (!shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status, mode } = body;

    const session = await prisma.chatSession.findUnique({
      where: { id }
    });

    if (!session || session.shopId !== shop.shopId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const updated = await prisma.chatSession.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(mode ? { mode } : {}),
      }
    });

    return NextResponse.json({ session: updated });
  } catch (error) {
    console.error('[ERROR] [ChatSessionDetail]: Error updating session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
