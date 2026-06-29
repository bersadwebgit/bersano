import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const payload = await verifyAuth(req, 'admin');
    if (!payload || !payload.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requests = await prisma.wholesaleRequest.findMany({
      where: { shopId: payload.shopId },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch user details for each request
    const userIds = requests.map(r => r.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds }, shopId: payload.shopId },
      select: { id: true, name: true, email: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));
    const requestsWithUser = requests.map(reqItem => {
      const user = users.find(u => u.id === reqItem.userId);
      return {
        ...reqItem,
        user: user || { name: 'کاربر ناشناس', email: '' },
      };
    });

    return NextResponse.json({ requests: requestsWithUser });
  } catch (error) {
    console.error('Error fetching wholesale requests:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
