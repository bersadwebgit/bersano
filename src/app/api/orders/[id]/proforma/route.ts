import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyAuth } from '@/lib/auth';
import { getTenantShop } from '@/lib/tenant';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Resolve tenant shop
    const tenantShop = await getTenantShop();
    if (!tenantShop) {
      return new NextResponse('مستأجر یافت نشد', { status: 404 });
    }

    // Authenticate user
    const tokenUser = await verifyAuth(req, 'customer').catch(() => null);
    const adminUser = await verifyAuth(req, 'admin').catch(() => null);
    const superAdminUser = await verifyAuth(req, 'superadmin').catch(() => null);

    const currentUser = tokenUser || adminUser || superAdminUser;
    if (!currentUser) {
      return new NextResponse('عدم دسترسی - لطفا وارد حساب خود شوید', { status: 401 });
    }

    // Await params resolution
    const resolvedParams = await params;
    const orderId = resolvedParams.id;

    // Fetch order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        shopId: tenantShop.shopId,
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
        user: true,
      },
    });

    if (!order) {
      return new NextResponse('سفارش یافت نشد', { status: 404 });
    }

    // Authorization check: Customers can only view their own proforma
    if (currentUser.role === 'customer' && order.userId !== currentUser.id) {
      return new NextResponse('عدم دسترسی به این پیش‌فاکتور', { status: 403 });
    }

    // Fetch Shop Settings
    const shopSettings = await prisma.shopSettings.findUnique({
      where: { shopId: tenantShop.shopId },
    });

    if (!shopSettings) {
      return new NextResponse('تنظیمات فروشگاه یافت نشد', { status: 404 });
    }

    // Save proformaUrl to order if not set
    const proformaUrlPath = `/api/orders/${order.id}/proforma`;
    if (order.proformaUrl !== proformaUrlPath) {
      await prisma.order.update({
        where: { id: order.id },
        data: { proformaUrl: proformaUrlPath },
      });
    }

    // Calculate dates
    const orderDate = new Date(order.createdAt);
    const validityDate = new Date(order.createdAt);
    validityDate.setDate(validityDate.getDate() + 7);

    const orderDateStr = orderDate.toLocaleDateString('fa-IR');
    const validityDateStr = validityDate.toLocaleDateString('fa-IR');
    const proformaNumber = `PRO-${order.id.slice(-8).toUpperCase()}`;

    // Generate HTML
    const html = `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>پیش‌فاکتور ${proformaNumber}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;700;900&display=swap');
    body {
      font-family: 'Vazirmatn', sans-serif;
    }
    @media print {
      .no-print {
        display: none !important;
      }
      body {
        background-color: white !important;
        color: black !important;
      }
      .print-border {
        border-color: #e2e8f0 !important;
      }
    }
  </style>
</head>
<body class="bg-gray-50 text-gray-800 p-4 sm:p-8">
  <div class="max-w-4xl mx-auto bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100 print-border">
    
    <!-- Action Buttons (No Print) -->
    <div class="no-print flex justify-between items-center mb-8 pb-4 border-b border-gray-100">
      <button onclick="window.history.back()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all">
        بازگشت
      </button>
      <button onclick="window.print()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm">
        چاپ پیش‌فاکتور (PDF)
      </button>
    </div>

    <!-- Header -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-gray-100 print-border">
      <div class="flex items-center gap-4">
        ${shopSettings.logoUrl ? `
          <img src="${shopSettings.logoUrl}" alt="${shopSettings.shopName}" class="w-16 h-16 object-contain rounded-xl" />
        ` : `
          <div class="w-16 h-16 bg-indigo-100 text-indigo-600 flex items-center justify-center rounded-xl font-black text-xl">
            ${shopSettings.shopName.slice(0, 2)}
          </div>
        `}
        <div>
          <h1 class="text-xl font-black text-gray-900">${shopSettings.shopName}</h1>
          <p class="text-xs text-gray-400 mt-1">پیش‌فاکتور رسمی فروش کالا و خدمات</p>
        </div>
      </div>
      <div class="text-right space-y-1 text-xs font-bold text-gray-500">
        <div><span class="text-gray-400">شماره پیش‌فاکتور:</span> <span class="text-gray-900">${proformaNumber}</span></div>
        <div><span class="text-gray-400">تاریخ صدور:</span> <span class="text-gray-900">${orderDateStr}</span></div>
        <div><span class="text-gray-400">تاریخ اعتبار (۷ روز):</span> <span class="text-gray-900 text-red-600">${validityDateStr}</span></div>
      </div>
    </div>

    <!-- Parties Info -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
      <!-- Seller Info -->
      <div class="bg-gray-50 dark:bg-gray-50/50 rounded-2xl p-4 border border-gray-100 print-border space-y-2">
        <h3 class="font-black text-xs text-indigo-700 mb-3">مشخصات فروشنده</h3>
        <div class="text-xs space-y-1.5 font-bold text-gray-600">
          <div><span class="text-gray-400">نام فروشگاه:</span> ${shopSettings.shopName}</div>
          ${shopSettings.contactPhone ? `<div><span class="text-gray-400">تلفن تماس:</span> ${shopSettings.contactPhone}</div>` : ''}
          ${shopSettings.contactEmail ? `<div><span class="text-gray-400">پست الکترونیک:</span> ${shopSettings.contactEmail}</div>` : ''}
          ${shopSettings.registrationNumber ? `<div><span class="text-gray-400">شماره ثبت:</span> ${shopSettings.registrationNumber}</div>` : ''}
          ${shopSettings.economicCode ? `<div><span class="text-gray-400">کد اقتصادی:</span> ${shopSettings.economicCode}</div>` : ''}
          ${shopSettings.address ? `<div><span class="text-gray-400">نشانی:</span> ${shopSettings.address}</div>` : ''}
        </div>
      </div>

      <!-- Buyer Info -->
      <div class="bg-gray-50 dark:bg-gray-50/50 rounded-2xl p-4 border border-gray-100 print-border space-y-2">
        <h3 class="font-black text-xs text-indigo-700 mb-3">مشخصات خریدار</h3>
        <div class="text-xs space-y-1.5 font-bold text-gray-600">
          <div><span class="text-gray-400">نام و نام خانوادگی:</span> ${order.user.name || 'مشتری گرامی'}</div>
          <div><span class="text-gray-400">تلفن همراه:</span> ${order.phone || order.user.phone || '-'}</div>
          <div><span class="text-gray-400">استان / شهر:</span> ${order.state || '-'}، ${order.city || '-'}</div>
          <div><span class="text-gray-400">نشانی تحویل:</span> ${order.address || '-'}</div>
          ${order.zipCode ? `<div><span class="text-gray-400">کد پستی:</span> ${order.zipCode}</div>` : ''}
        </div>
      </div>
    </div>

    <!-- Items Table -->
    <div class="border border-gray-100 print-border rounded-2xl overflow-hidden mb-8">
      <table class="w-full text-right border-collapse">
        <thead>
          <tr class="bg-indigo-50/50 text-indigo-900 text-xs font-black border-b border-gray-100 print-border">
            <th class="p-3 text-center w-12">ردیف</th>
            <th class="p-3">شرح کالا / خدمات</th>
            <th class="p-3 text-center w-16">تعداد</th>
            <th class="p-3 text-center w-20">واحد</th>
            <th class="p-3 text-left w-32">قیمت واحد (تومان)</th>
            <th class="p-3 text-left w-36">قیمت کل (تومان)</th>
          </tr>
        </thead>
        <tbody class="text-xs font-bold text-gray-700 divide-y divide-gray-100 print-border">
          ${order.items.map((item, idx) => {
            const unitPrice = item.price;
            const totalPrice = unitPrice * item.quantity;
            const unitName = item.product.wholesaleUnit || 'عدد';
            const variantSuffix = item.variant ? ` (${item.variant.name})` : '';

            return `
              <tr>
                <td class="p-3 text-center text-gray-400">${idx + 1}</td>
                <td class="p-3 text-gray-900">${item.product.title}${variantSuffix}</td>
                <td class="p-3 text-center">${item.quantity.toLocaleString('fa-IR')}</td>
                <td class="p-3 text-center text-gray-500">${unitName}</td>
                <td class="p-3 text-left">${unitPrice.toLocaleString('fa-IR')}</td>
                <td class="p-3 text-left text-gray-900">${totalPrice.toLocaleString('fa-IR')}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Summary & Totals -->
    <div class="flex flex-col sm:flex-row justify-between items-start gap-6">
      <!-- Notes / Terms -->
      <div class="w-full sm:w-1/2 space-y-2 text-[11px] font-bold text-gray-400">
        <p class="text-indigo-700 font-black text-xs">شرایط و ضوابط پیش‌فاکتور:</p>
        <ul class="list-disc list-inside space-y-1">
          <li>این سند صرفاً یک پیش‌فاکتور بوده و تا زمان تسویه نهایی فاقد اعتبار قانونی جهت تحویل کالا می‌باشد.</li>
          <li>قیمت‌های مندرج در این پیش‌فاکتور تا ۷ روز از تاریخ صدور معتبر و قطعی است.</li>
          <li>در صورت عدم پرداخت در مهلت مقرر، سفارش لغو شده و قیمت‌ها بر اساس نرخ روز محاسبه خواهد شد.</li>
        </ul>
        ${order.userNotes ? `<p class="mt-4"><strong class="text-gray-500">توضیحات مشتری:</strong> ${order.userNotes}</p>` : ''}
      </div>

      <!-- Financials -->
      <div class="w-full sm:w-1/2 bg-gray-50 dark:bg-gray-50/50 rounded-2xl p-4 border border-gray-100 print-border space-y-2.5 text-xs font-bold text-gray-600">
        <div class="flex justify-between">
          <span class="text-gray-400">جمع کل کالاها:</span>
          <span class="text-gray-900">${(order.totalAmount + order.discountAmount).toLocaleString('fa-IR')} تومان</span>
        </div>
        ${order.discountAmount > 0 ? `
          <div class="flex justify-between text-red-600">
            <span>تخفیف:</span>
            <span>${order.discountAmount.toLocaleString('fa-IR')} - تومان</span>
          </div>
        ` : ''}
        ${order.shippingCost > 0 ? `
          <div class="flex justify-between">
            <span>هزینه حمل و نقل:</span>
            <span>${order.shippingCost.toLocaleString('fa-IR')} تومان</span>
          </div>
        ` : ''}
        <div class="flex justify-between border-t border-gray-200 print-border pt-2.5 text-sm font-black text-indigo-700">
          <span>مبلغ قابل پرداخت:</span>
          <span>${order.finalAmount.toLocaleString('fa-IR')} تومان</span>
        </div>
      </div>
    </div>

    <!-- Signatures -->
    <div class="grid grid-cols-2 gap-4 mt-12 pt-12 border-t border-gray-100 print-border text-center text-xs font-bold text-gray-400">
      <div>
        <p class="mb-12">مهر و امضای فروشنده</p>
        <p class="text-gray-300">...........................</p>
      </div>
      <div>
        <p class="mb-12">امضا و تایید خریدار</p>
        <p class="text-gray-300">...........................</p>
      </div>
    </div>

  </div>
</body>
</html>
    `;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating proforma:', error);
    return new NextResponse('خطای سرور در تولید پیش‌فاکتور', { status: 500 });
  }
}
