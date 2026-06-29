import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

function toEnglishDigits(str: string): string {
  const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let result = str;
  for (let i = 0; i < 10; i++) {
    result = result.replace(persianDigits[i], String(i)).replace(arabicDigits[i], String(i));
  }
  return result;
}

function toPersianDigits(str: string): string {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w)]);
}

function getPhoneVariants(phone: string): string[] {
  if (!phone) return [];
  const trimmed = phone.trim();
  if (!trimmed) return [];

  const variants = new Set<string>();
  variants.add(trimmed);
  
  // Convert to English digits and remove non-digits
  let clean = toEnglishDigits(trimmed);
  clean = clean.replace(/\D/g, '');
  
  if (clean) {
    variants.add(clean);
    
    // Normalize to 09...
    let normalized = clean;
    if (normalized.startsWith('0098')) {
      normalized = '0' + normalized.substring(4);
    } else if (normalized.startsWith('98') && normalized.length === 12) {
      normalized = '0' + normalized.substring(2);
    } else if (normalized.startsWith('+98')) {
      normalized = '0' + normalized.substring(3);
    } else if (!normalized.startsWith('0') && normalized.length === 10) {
      normalized = '0' + normalized;
    }
    
    variants.add(normalized);
    
    // Without leading zero
    let withoutZero = normalized;
    if (withoutZero.startsWith('0')) {
      withoutZero = withoutZero.substring(1);
    }
    variants.add(withoutZero);
    
    // With +98
    variants.add('+98' + withoutZero);
    
    // With 98
    variants.add('98' + withoutZero);
    
    // Spaced variant: 0912 345 6789
    if (normalized.length === 11) {
      const spaced = `${normalized.substring(0, 4)} ${normalized.substring(4, 7)} ${normalized.substring(7)}`;
      variants.add(spaced);
      
      const dashed = `${normalized.substring(0, 4)}-${normalized.substring(4, 7)}-${normalized.substring(7)}`;
      variants.add(dashed);
    }
  }
  
  // Also add Persian digit versions of all English digit variants to support Persian digits in DB
  const englishVariants = Array.from(variants);
  for (const variant of englishVariants) {
    variants.add(toPersianDigits(variant));
  }
  
  return Array.from(variants);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    if (!session || session.shopId !== decoded.shopId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Mark all customer messages in this session as read
    await prisma.chatMessage.updateMany({
      where: {
        sessionId: id,
        sender: 'customer',
        isRead: false,
      },
      data: {
        isRead: true,
      }
    });

    // If session is in AI mode, or if it's manual but doesn't have the "connection established" message yet
    let sessionUpdated = false;
    const hasEstablishMessage = session.messages.some(
      m => m.sender === 'admin' && m.message === 'اتصال به کارشناس برقرار شد'
    );

    if (session.mode === 'ai' || !hasEstablishMessage) {
      const newMode = 'manual';
      
      // Create the establishment message if it doesn't exist
      if (!hasEstablishMessage) {
        await prisma.chatMessage.create({
          data: {
            shopId: decoded.shopId,
            sessionId: id,
            sender: 'admin',
            message: 'اتصال به کارشناس برقرار شد',
            messageType: 'text',
            isRead: true,
          }
        });
      }

      if (session.mode === 'ai') {
        await prisma.chatSession.update({
          where: { id },
          data: { mode: newMode }
        });
      }
      
      sessionUpdated = true;
    }

    let finalSession = session;
    if (sessionUpdated) {
      const refreshed = await prisma.chatSession.findUnique({
        where: { id },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
      if (refreshed) {
        finalSession = refreshed;
      }
    }

    // CRM Customer Lookup
    let customerProfile: any = null;
    let customerOrders: any[] = [];

    const phone = finalSession.phone;
    const email = finalSession.email;

    let phoneVariants: string[] = [];
    if (phone) {
      phoneVariants = getPhoneVariants(phone);
    }

    if (phone || email) {
      // Find matching user in CRM
      const user = await prisma.user.findFirst({
        where: {
          shopId: decoded.shopId,
          OR: [
            ...(phoneVariants.length > 0 ? [{ phone: { in: phoneVariants } }] : []),
            ...(email ? [{ email }] : []),
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          group: true,
          loyaltyPoints: true,
          isBlocked: true,
          isWholesaler: true,
          avatarUrl: true,
          createdAt: true,
        }
      });

      if (user) {
        customerProfile = user;
        // Fetch user's orders
        customerOrders = await prisma.order.findMany({
          where: {
            shopId: decoded.shopId,
            OR: [
              { userId: user.id },
              ...(phoneVariants.length > 0 ? [{ phone: { in: phoneVariants } }] : []),
            ]
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            finalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
      } else {
        // No registered user, but search for orders placed with this phone
        customerOrders = await prisma.order.findMany({
          where: {
            shopId: decoded.shopId,
            OR: [
              ...(phoneVariants.length > 0 ? [{ phone: { in: phoneVariants } }] : []),
            ]
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            finalAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        });
      }
    }

    return NextResponse.json({
      session: finalSession,
      crm: {
        profile: customerProfile,
        orders: customerOrders,
      }
    });
  } catch (error) {
    console.error('[ERROR] [AdminChatDetail]: Error fetching session detail:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { status, mode } = body;

    const session = await prisma.chatSession.findUnique({
      where: { id }
    });

    if (!session || session.shopId !== decoded.shopId) {
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
    console.error('[ERROR] [AdminChatDetail]: Error updating session:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
