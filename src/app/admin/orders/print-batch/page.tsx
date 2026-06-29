import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import PrintBatchClient from './PrintBatchClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

interface SearchParamsProps {
  searchParams: Promise<{
    ids?: string;
    mode?: 'label' | 'invoice' | 'both';
  }>;
}

export default async function PrintBatchPage({ searchParams }: SearchParamsProps) {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get('admin_token')?.value;
  const superAdminToken = cookieStore.get('super_admin_token')?.value;

  let payload: any = null;
  let role: 'admin' | 'superadmin' | null = null;

  if (superAdminToken) {
    try {
      const verified = await jwtVerify(superAdminToken, key);
      payload = verified.payload;
      role = 'superadmin';
    } catch (err) {}
  }

  if (!payload && adminToken) {
    try {
      const verified = await jwtVerify(adminToken, key);
      payload = verified.payload;
      role = 'admin';
    } catch (err) {}
  }

  if (!payload) {
    redirect('/login');
  }

  // Await searchParams for Next.js 15 compatibility
  const resolvedSearchParams = await searchParams;
  const idsString = resolvedSearchParams.ids || '';
  const printMode = resolvedSearchParams.mode || 'label';

  if (!idsString) {
    redirect('/admin/orders');
  }

  const ids = idsString.split(',').filter(Boolean);

  if (ids.length === 0) {
    redirect('/admin/orders');
  }

  // Fetch all requested orders
  // If role is admin, restrict to their shopId
  const orders = await prisma.order.findMany({
    where: {
      id: { in: ids },
      ...(role === 'admin' ? { shopId: payload.shopId } : {})
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      },
      user: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  if (orders.length === 0) {
    notFound();
  }

  // Fetch shop settings (all orders are from the same shop in normal operations, so we take from first order)
  const shopId = orders[0].shopId;
  const shopSettings = await prisma.shopSettings.findUnique({
    where: { shopId }
  });

  if (!shopSettings) {
    notFound();
  }

  // Map orders to expected format
  const mappedOrders = orders.map(order => ({
    id: order.id.slice(-8).toUpperCase(),
    fullId: order.id,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    finalAmount: order.finalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    address: order.address || '',
    city: order.city || '',
    state: order.state || '',
    zipCode: order.zipCode || '',
    phone: order.phone || order.user.phone || '',
    userNotes: order.userNotes,
    shippingCarrier: order.shippingCarrier,
    shippingTrackingCode: order.shippingTrackingCode,
    shippingCost: order.shippingCost,
    taxAmount: order.taxAmount,
    buyerName: order.user.name || 'مشتری گرامی',
    items: order.items.map(item => {
      const originalPrice = item.product.price;
      const discountAmount = item.product.price > item.price ? (item.product.price - item.price) : 0;
      return {
        id: item.product.id,
        title: item.product.title,
        quantity: item.quantity,
        price: item.price,
        originalPrice,
        discountAmount,
        variantName: item.variant?.name || '',
        sku: item.product.id.slice(-6).toUpperCase()
      };
    })
  }));

  const mappedShop = {
    shopName: shopSettings.shopName,
    logoUrl: shopSettings.logoUrl,
    contactEmail: shopSettings.contactEmail || '',
    contactPhone: shopSettings.contactPhone || '',
    address: shopSettings.address || '',
    registrationNumber: shopSettings.registrationNumber || '',
    economicCode: shopSettings.economicCode || '',
    themeColor: shopSettings.themeColor || '#3b82f6'
  };

  return (
    <PrintBatchClient 
      orders={mappedOrders} 
      shop={mappedShop} 
      initialMode={printMode} 
    />
  );
}
