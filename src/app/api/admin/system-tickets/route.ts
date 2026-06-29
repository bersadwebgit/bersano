import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = {
      shopId: decoded.shopId,
      ...(status ? { status } : {}),
    };

    const tickets = await prisma.systemTicket.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error('Error fetching system tickets:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { subject, description, priority, attachmentUrl } = body;

    if (!subject || !description) {
      return NextResponse.json({ error: 'Subject and description are required' }, { status: 400 });
    }

    const ticket = await prisma.systemTicket.create({
      data: {
        shopId: decoded.shopId,
        subject,
        description,
        priority: priority || 'normal',
        status: 'new',
        attachmentUrl,
        messages: {
          create: {
            senderId: decoded.id as string,
            senderRole: 'admin',
            message: description,
            attachmentUrl,
          }
        }
      },
      include: {
        messages: true,
      }
    });

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error('Error creating system ticket:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
