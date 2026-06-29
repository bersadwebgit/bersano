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
    const status = searchParams.get('status') || 'all'; // active, closed, all
    const mode = searchParams.get('mode') || 'all'; // ai, manual, all
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    const where: any = {
      shopId: decoded.shopId,
      ...(status !== 'all' ? { status } : {}),
      ...(mode !== 'all' ? { mode } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ]
      } : {})
    };

    const [sessions, total] = await Promise.all([
      prisma.chatSession.findMany({
        where,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1, // Get the last message for preview
          },
          _count: {
            select: {
              messages: {
                where: {
                  sender: 'customer',
                  isRead: false,
                }
              }
            }
          }
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.chatSession.count({ where }),
    ]);

    return NextResponse.json({
      sessions,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      }
    });
  } catch (error) {
    console.error('[ERROR] [AdminChatList]: Error listing chat sessions:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
