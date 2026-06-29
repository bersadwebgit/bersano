import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/prisma';
import { redirect, notFound } from 'next/navigation';
import { getTenantShop } from '@/lib/tenant';
import InvoiceClient from './InvoiceClient';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-change-in-production';
const key = new TextEncoder().encode(JWT_SECRET);

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const cookieStore = await cookies();
  const customerToken = cookieStore.get('customer_token')?.value;
  const adminToken = cookieStore.get('admin_token')?.value;
  const superAdminToken = cookieStore.get('super_admin_token')?.value;

  let payload: any = null;
  let role: 'customer' | 'admin' | 'superadmin' | null = null;
  let customerPayload: any = null;

  if (customerToken) {
    try {
      const verified = await jwtVerify(customerToken, key);
      customerPayload = verified.payload;
    } catch (err) {}
  }

  const resolvedSearchParams = await searchParams;
  const buyerView = resolvedSearchParams.view === 'customer';

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

  if (!payload && customerToken) {
    try {
      const verified = await jwtVerify(customerToken, key);
      payload = verified.payload;
      role = 'customer';
    } catch (err) {}
  }

  if (!payload) {
    redirect('/login');
  }

  // Resolve current tenant shop
  const tenantShop = await getTenantShop();
  if (!tenantShop) {
    notFound();
  }

  // Await params resolution for Next.js 15+ compatibility
  const resolvedParams = await params;
  const orderId = resolvedParams.id;

  // Fetch real order from database
  const order = await prisma.order.findFirst({
    where: { 
      id: orderId,
      shopId: tenantShop.shopId
    },
    include: {
      items: {
        include: {
          product: true,
          variant: true
        }
      },
      user: true
    }
  });

  if (!order) {
    notFound();
  }

  if (buyerView && customerPayload && order.userId === customerPayload.id) {
    payload = customerPayload;
    role = 'customer';
  }

  // Auth checks
  if (role === 'customer' && order.userId !== payload.id) {
    // Customers can only view their own invoices
    redirect('/login');
  }

  if (role === 'admin' && order.shopId !== payload.shopId) {
    // Admins can only view invoices from their own shop
    redirect('/login');
  }

  // Fetch Shop Settings
  const shopSettings = await prisma.shopSettings.findUnique({
    where: { shopId: order.shopId }
  });

  if (!shopSettings) {
    notFound();
  }

  // Fetch download tokens for this order
  const downloadTokens = await prisma.downloadToken.findMany({
    where: { 
      orderId: order.id,
      shopId: tenantShop.shopId
    }
  });

  // Map database order to format expected by InvoiceClient
  const mappedOrder = {
    id: order.id.slice(-8).toUpperCase(),
    fullId: order.id,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    finalAmount: order.finalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    address: order.address,
    city: order.city,
    state: order.state,
    zipCode: order.zipCode,
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
      const tokenObj = downloadTokens.find(t => t.productId === item.product.id);
      return {
        id: item.product.id,
        title: item.product.title,
        quantity: item.quantity,
        price: item.price,
        originalPrice,
        discountAmount,
        variantName: item.variant?.name || '',
        sku: item.product.id.slice(-6).toUpperCase(),
        type: item.product.type,
        downloadToken: tokenObj?.token || null
      };
    })
  };

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

  const clientRole = buyerView ? 'customer' : role;

  return <InvoiceClient order={mappedOrder} shop={mappedShop} userRole={clientRole} />;
}
