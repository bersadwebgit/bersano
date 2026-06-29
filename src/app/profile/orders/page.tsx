import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect } from 'next/navigation';
import OrdersClient from './OrdersClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function OrdersPage() {
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

  // Fetch real orders from database
  const dbOrders = await prisma.order.findMany({
    where: { 
      userId: user.id,
      shopId: user.shopId
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: {
        include: {
          product: true
        }
      }
    }
  });

  // Map to the format expected by the client component
  const orders = dbOrders.map(order => {
    let statusId = 'current';
    if (order.status === 'delivered') statusId = 'delivered';
    else if (order.status === 'cancelled') statusId = 'cancelled';
    else if (order.status === 'returned') statusId = 'returned';

    return {
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
      paymentType: order.paymentMethod || 'درگاه اینترنتی',
      paymentStatus: 'موفق', // Fetch from order if available
      paymentDate: new Date(order.createdAt).toLocaleDateString('fa-IR'),
      transactionId: '-', // Fetch from order if available
      userNotes: order.userNotes,
      adminNotes: order.adminNotes,
      isWholesale: order.isWholesale,
      wholesalePaymentType: order.wholesalePaymentType,
      wholesaleDepositAmount: order.wholesaleDepositAmount,
      wholesaleSettlementAmount: order.wholesaleSettlementAmount,
      proformaUrl: order.proformaUrl,
      officialInvoice: order.officialInvoice,
      items: order.items.map(item => ({
        id: item.product.id,
        title: item.product.title,
        imageUrl: item.product.imageUrl || '/placeholder.png'
      }))
    };
  });

  return <OrdersClient initialOrders={orders} />;
}
