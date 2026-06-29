import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const decoded = await verifyAuth(request, 'admin');
    
    if (!decoded || !decoded.shopId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const shippingStatus = searchParams.get('shippingStatus') || '';
    const paymentStatus = searchParams.get('paymentStatus') || '';
    const paymentMethod = searchParams.get('paymentMethod') || '';
    const city = searchParams.get('city') || '';
    const returnStatus = searchParams.get('returnStatus') || '';
    const timeframe = searchParams.get('timeframe') || 'all'; // today, yesterday, last_7_days, last_30_days, all
    const sort = searchParams.get('sort') || 'newest'; // newest, oldest, highest_amount, lowest_amount
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Date filters
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    let dateFilter = {};
    if (timeframe === 'today') {
      dateFilter = { createdAt: { gte: startOfToday } };
    } else if (timeframe === 'yesterday') {
      dateFilter = {
        createdAt: {
          gte: startOfYesterday,
          lt: startOfToday,
        },
      };
    } else if (timeframe === 'last_7_days') {
      dateFilter = { createdAt: { gte: sevenDaysAgo } };
    } else if (timeframe === 'last_30_days') {
      dateFilter = { createdAt: { gte: thirtyDaysAgo } };
    }

    // Build the query where clause
    const where: any = {
      shopId: decoded.shopId,
      ...dateFilter,
    };

    if (shippingStatus) {
      where.shippingStatus = shippingStatus;
    }
    if (paymentStatus) {
      where.paymentStatus = paymentStatus;
    }
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }
    if (returnStatus) {
      where.returnStatus = returnStatus;
    }

    // Advanced Text Search
    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { phone: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Sorting
    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'highest_amount') {
      orderBy = { finalAmount: 'desc' };
    } else if (sort === 'lowest_amount') {
      orderBy = { finalAmount: 'asc' };
    }

    // Execute paginated query
    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            }
          },
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  title: true,
                  imageUrl: true,
                  stock: true,
                }
              },
              variant: {
                select: {
                  id: true,
                  name: true,
                  stock: true,
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    // 1. Calculate Summary Statistics (Across the entire shop, not filtered)
    const allOrders = await prisma.order.findMany({
      where: { shopId: decoded.shopId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            product: { select: { stock: true, id: true, title: true } },
            variant: { select: { stock: true } }
          }
        }
      }
    });

    const summary = {
      totalCount: allOrders.length,
      newToday: allOrders.filter(o => new Date(o.createdAt) >= startOfToday).length,
      pendingCount: allOrders.filter(o => o.paymentStatus === 'paid' && (o.shippingStatus === 'new' || o.shippingStatus === 'processing')).length,
      shippingCount: allOrders.filter(o => o.shippingStatus === 'shipped').length,
      returnedCount: allOrders.filter(o => o.returnStatus === 'pending' || o.returnStatus === 'approved' || o.status === 'returned').length,
      revenueToday: allOrders
        .filter(o => new Date(o.createdAt) >= startOfToday && o.paymentStatus === 'paid')
        .reduce((sum, o) => sum + o.finalAmount, 0),
    };

    // 2. Compute Alerts
    const hours24Ago = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const days3Ago = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const alertsList: any[] = [];
    
    // Alert: Unpaid orders > 24 hours
    const unpaidOld = allOrders.filter(o => o.paymentStatus === 'pending' && new Date(o.createdAt) < hours24Ago);
    if (unpaidOld.length > 0) {
      alertsList.push({
        id: 'unpaid_old',
        type: 'warning',
        title: 'سفارشات پرداخت‌نشده قدیمی',
        message: `${unpaidOld.length} سفارش بیش از ۲۴ ساعت است که پرداخت نشده باقی مانده‌اند.`,
        count: unpaidOld.length,
      });
    }

    // Alert: Unsent orders > 3 days
    const unsentOld = allOrders.filter(o => o.paymentStatus === 'paid' && o.shippingStatus === 'new' && new Date(o.createdAt) < days3Ago);
    if (unsentOld.length > 0) {
      alertsList.push({
        id: 'unsent_old',
        type: 'danger',
        title: 'تاخیر در ارسال سفارشات',
        message: `${unsentOld.length} سفارش پرداخت‌شده بیش از ۳ روز است که ارسال نشده‌اند!`,
        count: unsentOld.length,
      });
    }

    // Alert: Failed payments
    const failedPayments = allOrders.filter(o => o.paymentStatus === 'failed');
    if (failedPayments.length > 0) {
      alertsList.push({
        id: 'failed_payments',
        type: 'info',
        title: 'پرداخت‌های ناموفق',
        message: `${failedPayments.length} تلاش برای پرداخت ناموفق ثبت شده است.`,
        count: failedPayments.length,
      });
    }

    // Alert: Unanswered return requests
    const unansweredReturns = allOrders.filter(o => o.returnStatus === 'pending');
    if (unansweredReturns.length > 0) {
      alertsList.push({
        id: 'unanswered_returns',
        type: 'warning',
        title: 'درخواست‌های مرجوعی بی‌پاسخ',
        message: `${unansweredReturns.length} درخواست مرجوعی در انتظار بررسی و پاسخ است.`,
        count: unansweredReturns.length,
      });
    }

    // Alert: Out of stock products in order items
    let outOfStockItemsCount = 0;
    allOrders.forEach(o => {
      if (o.shippingStatus === 'new' || o.shippingStatus === 'processing') {
        o.items.forEach(item => {
          const stock = item.variant ? (item.variant.stock || 0) : (item.product?.stock || 0);
          if (stock < item.quantity) {
            outOfStockItemsCount++;
          }
        });
      }
    });

    if (outOfStockItemsCount > 0) {
      alertsList.push({
        id: 'out_of_stock_orders',
        type: 'danger',
        title: 'کسری موجودی اقلام سفارش‌ها',
        message: `${outOfStockItemsCount} قلم کالا در سفارشات جاری وجود دارد که موجودی انبار آن‌ها کافی نیست!`,
        count: outOfStockItemsCount,
      });
    }

    // 3. Compute Reports Data
    // A. Revenue over last 7 days
    const dailyData: { [key: string]: { date: string, revenue: number, count: number } } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toLocaleDateString('fa-IR', { month: '2-digit', day: '2-digit' });
      dailyData[key] = { date: key, revenue: 0, count: 0 };
    }

    allOrders.forEach(o => {
      const d = new Date(o.createdAt);
      const key = d.toLocaleDateString('fa-IR', { month: '2-digit', day: '2-digit' });
      if (dailyData[key]) {
        dailyData[key].count++;
        if (o.paymentStatus === 'paid') {
          dailyData[key].revenue += o.finalAmount;
        }
      }
    });

    // B. Best-selling products
    const productSales: { [key: string]: { id: string, title: string, quantity: number, revenue: number } } = {};
    allOrders.forEach(o => {
      if (o.paymentStatus === 'paid') {
        o.items.forEach(item => {
          if (item.product) {
            const pId = item.product.id;
            if (!productSales[pId]) {
              productSales[pId] = {
                id: pId,
                title: item.product.title,
                quantity: 0,
                revenue: 0,
              };
            }
            productSales[pId].quantity += item.quantity;
            productSales[pId].revenue += item.price * item.quantity;
          }
        });
      }
    });

    const bestSellers = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // C. Top purchasing customers
    const customerPurchases: { [key: string]: { id: string, name: string, email: string, orderCount: number, totalSpent: number } } = {};
    allOrders.forEach(o => {
      if (o.paymentStatus === 'paid' && o.user) {
        const uId = o.user.id;
        if (!customerPurchases[uId]) {
          customerPurchases[uId] = {
            id: uId,
            name: o.user.name || 'کاربر بدون نام',
            email: o.user.email,
            orderCount: 0,
            totalSpent: 0,
          };
        }
        customerPurchases[uId].orderCount++;
        customerPurchases[uId].totalSpent += o.finalAmount;
      }
    });

    const topCustomers = Object.values(customerPurchases)
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    // D. Shipping performance
    const shippingPerformance: { [key: string]: { name: string, count: number, revenue: number } } = {};
    allOrders.forEach(o => {
      const carrier = o.shippingCarrier || 'نامشخص/پیک شهری';
      if (o.shippingStatus !== 'new') {
        if (!shippingPerformance[carrier]) {
          shippingPerformance[carrier] = {
            name: carrier,
            count: 0,
            revenue: 0,
          };
        }
        shippingPerformance[carrier].count++;
        shippingPerformance[carrier].revenue += o.shippingCost;
      }
    });

    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
    const averageOrderValue = paidOrders.length > 0 
      ? paidOrders.reduce((sum, o) => sum + o.finalAmount, 0) / paidOrders.length 
      : 0;

    const cancelledAndReturned = allOrders.filter(o => o.status === 'cancelled' || o.returnStatus === 'approved').length;
    const cancelReturnRate = allOrders.length > 0 
      ? (cancelledAndReturned / allOrders.length) * 100 
      : 0;

    const reports = {
      dailyRevenue: Object.values(dailyData),
      bestSellers,
      topCustomers,
      shippingPerformance: Object.values(shippingPerformance),
      averageOrderValue,
      cancelReturnRate,
    };

    return NextResponse.json({
      orders,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
      summary,
      alerts: alertsList,
      reports,
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
