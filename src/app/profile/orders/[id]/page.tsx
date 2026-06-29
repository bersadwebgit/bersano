import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import SingleOrderClient from './SingleOrderClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function SingleOrderPage({ params }: { params: Promise<{ id: string }> }) {
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

  // Await the params resolution for Next.js 15+ compatibility
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  // Fetch real order from database
  const order = await prisma.order.findUnique({
    where: { 
      id: orderId,
      userId: user.id, // Ensure user can only see their own orders
      shopId: user.shopId
    },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  if (!order) {
    notFound();
  }

  // Fetch download tokens for this order
  const downloadTokens = await prisma.downloadToken.findMany({
    where: { 
      orderId: order.id,
      userId: user.id,
      shopId: user.shopId
    }
  });

  // Fetch existing reviews by this user for these products
  const existingReviews = await prisma.review.findMany({
    where: {
      userId: user.id,
      productId: { in: order.items.map(item => item.product.id) },
      shopId: user.shopId
    },
    select: {
      productId: true,
      status: true,
      rating: true,
      comment: true
    }
  });

  // Map to the format expected by the client component
  let statusId = 'current';
  if (order.status === 'delivered') statusId = 'delivered';
  else if (order.status === 'cancelled') statusId = 'cancelled';
  else if (order.status === 'returned') statusId = 'returned';

  const mappedOrder = {
    id: order.id.slice(-8).toUpperCase(),
    fullId: order.id,
    date: new Date(order.createdAt).toLocaleDateString('fa-IR'),
    status: statusId,
    exactStatus: order.status,
    deliveryTime: '-', // In a real app, calculate based on shipping method
    shippingType: order.shippingCarrier === 'tipax' ? 'تیپاکس (پس‌کرایه)' : (order.shippingCarrier === 'post' ? 'پست پیشتاز' : (order.shippingCarrier || 'پست پیشتاز')),
    trackingCode: order.shippingTrackingCode || '-', // Fetch from order if available
    totalAmount: order.totalAmount,
    shippingCost: order.shippingCost || 0, // Fetch from order if available
    packagingCost: 0, // Fetch from order if available
    discount: order.discountAmount,
    paidAmount: order.finalAmount,
    paymentType: order.paymentMethod === 'card_to_card' ? 'کارت به کارت (فیش بانکی)' : (order.paymentMethod || 'درگاه اینترنتی'),
    paymentStatus: order.paymentStatus === 'paid' ? 'موفق' : 'ناموفق یا در انتظار تایید فیش',
    paymentDate: new Date(order.createdAt).toLocaleDateString('fa-IR'),
    transactionId: order.cardToCardCode || '-', // Fetch from order if available
    userNotes: order.userNotes,
    adminNotes: order.adminNotes,
    cardToCardReceipt: order.cardToCardReceipt || null,
    cardToCardSenderCard: order.cardToCardSenderCard || null,
    cardToCardTime: order.cardToCardTime || null,
    items: order.items.map(item => {
      const tokenObj = downloadTokens.find(t => t.productId === item.product.id);
      const reviewObj = existingReviews.find(r => r.productId === item.product.id);
      return {
        id: item.product.id,
        title: item.product.title,
        imageUrl: item.product.imageUrl || '/placeholder.png',
        type: item.product.type,
        quantity: item.quantity,
        price: item.price,
        downloadToken: tokenObj?.token || null,
        downloadCount: tokenObj?.downloadCount || 0,
        maxDownloads: tokenObj?.maxDownloads || 0,
        expiresAt: tokenObj?.expiresAt ? new Date(tokenObj.expiresAt).toLocaleDateString('fa-IR') : null,
        hasReviewed: !!reviewObj,
        reviewStatus: reviewObj?.status || null,
        reviewRating: reviewObj?.rating || null,
        reviewComment: reviewObj?.comment || null,
      };
    })
  };

  return <SingleOrderClient order={mappedOrder} />;
}
