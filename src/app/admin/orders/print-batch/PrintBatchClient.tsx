'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Printer, 
  FileText, 
  Truck, 
  ArrowRight, 
  CheckCircle, 
  MapPin, 
  Phone, 
  Mail, 
  MessageSquare 
} from 'lucide-react';
import Barcode from '@/components/Barcode';
import { numberToWordsPersian } from '@/utils/numberToWords';

interface InvoiceItem {
  id: string;
  title: string;
  quantity: number;
  price: number;
  originalPrice: number;
  discountAmount: number;
  variantName: string;
  sku: string;
}

interface InvoiceOrder {
  id: string;
  fullId: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod: string | null;
  paymentStatus: string | null;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  userNotes: string | null;
  shippingCarrier: string | null;
  shippingTrackingCode: string | null;
  shippingCost: number;
  taxAmount: number;
  buyerName: string;
  items: InvoiceItem[];
}

interface InvoiceShop {
  shopName: string;
  logoUrl: string | null;
  contactEmail: string;
  contactPhone: string;
  address: string;
  registrationNumber: string;
  economicCode: string;
  themeColor: string;
}

interface PrintBatchClientProps {
  orders: InvoiceOrder[];
  shop: InvoiceShop;
  initialMode: 'label' | 'invoice' | 'both';
}

export default function PrintBatchClient({ orders, shop, initialMode }: PrintBatchClientProps) {
  const [printMode, setPrintMode] = useState<'both' | 'invoice' | 'label'>(initialMode);
  const [pageSize, setPageSize] = useState<'A4' | 'A5'>('A4');
  const [a4Layout, setA4Layout] = useState<'single' | 'two-portrait' | 'two-landscape'>('single');

  useEffect(() => {
    // Auto trigger print dialog on page load
    const timer = setTimeout(() => {
      window.print();
    }, 1000);
    return () => clearTimeout(timer);
  }, [printMode, pageSize, a4Layout]);

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'درگاه پرداخت آنلاین';
    switch (method.toLowerCase()) {
      case 'online': return 'درگاه پرداخت اینترنتی';
      case 'card': return 'کارت به کارت';
      case 'cod': return 'پرداخت در محل (کارتخوان)';
      case 'wallet': return 'کیف پول الکترونیک';
      default: return method;
    }
  };

  const getPaymentStatusLabel = (status: string | null) => {
    if (!status) return 'در انتظار پرداخت';
    switch (status.toLowerCase()) {
      case 'paid': return 'موفق و تسویه شده';
      case 'pending': return 'در انتظار پرداخت';
      case 'failed': return 'ناموفق';
      case 'refunded': return 'مرجوع شده و برگشت وجه';
      default: return status;
    }
  };

  const getShippingCarrierLabel = (carrier: string | null) => {
    if (!carrier) return 'پست پیشتاز';
    switch (carrier.toLowerCase()) {
      case 'post': return 'پست پیشتاز';
      case 'peyk': return 'پیک موتوری شهری';
      case 'tipax': return 'تیپاکس (پس‌کرایه)';
      default: return carrier;
    }
  };

  // Construct list of individual printable blocks
  const printItems: {
    key: string;
    type: 'invoice' | 'label';
    order: InvoiceOrder;
  }[] = [];

  orders.forEach((order) => {
    if (printMode === 'invoice' || printMode === 'both') {
      printItems.push({
        key: `invoice-${order.fullId}`,
        type: 'invoice',
        order,
      });
    }
    if (printMode === 'label' || printMode === 'both') {
      printItems.push({
        key: `label-${order.fullId}`,
        type: 'label',
        order,
      });
    }
  });

  const isA5OrHalfA4 = pageSize === 'A5' || a4Layout !== 'single';

  // Group into pairs for two-in-one layout
  const pairs: (typeof printItems)[] = [];
  if (pageSize === 'A4' && a4Layout !== 'single') {
    for (let i = 0; i < printItems.length; i += 2) {
      pairs.push(printItems.slice(i, i + 2));
    }
  }

  const renderPrintItem = (item: typeof printItems[0], isHalfPage: boolean) => {
    const { order, type } = item;

    // Financials
    const subtotalOriginal = order.items.reduce((sum, item) => {
      return sum + (item.originalPrice || item.price) * item.quantity;
    }, 0);

    const itemDiscountsSum = order.items.reduce((sum, item) => {
      return sum + (item.discountAmount || 0) * item.quantity;
    }, 0);

    const couponDiscount = order.discountAmount || 0;
    const netSubtotal = Math.max(0, subtotalOriginal - itemDiscountsSum - couponDiscount);
    const calculatedTax = Math.round(netSubtotal * 0.1);
    const finalAmount = netSubtotal + order.shippingCost + calculatedTax;
    const finalAmountInWords = numberToWordsPersian(finalAmount);

    const orderDate = new Date(order.createdAt).toLocaleDateString('fa-IR');
    const invoiceDate = new Date().toLocaleDateString('fa-IR');

    // Layout configuration variables
    const paddingClass = isHalfPage ? 'p-4 sm:p-5 print:p-2' : 'p-6 sm:p-10 print:p-6';
    const textClass = isHalfPage ? 'text-[10px] print:text-[8px] print:leading-tight' : 'text-xs sm:text-[13px] print:text-[11px] print:leading-normal';
    const titleTextClass = isHalfPage ? 'text-sm font-black' : 'text-lg sm:text-xl font-black';
    const sectionTitleClass = isHalfPage ? 'text-[10px] font-black py-0.5 px-1.5' : 'text-xs px-4 py-1 font-black';
    const tableHeaderClass = isHalfPage 
      ? 'p-1 text-[8px] print:text-[7px] border-l border-slate-900' 
      : 'p-2.5 print:p-1.5 border-l border-slate-900';
    const tableRowClass = isHalfPage 
      ? 'p-1 text-[8px] print:text-[7px] border-l border-slate-300' 
      : 'p-2 print:p-1 border-l border-slate-300';
    const spacingClass = isHalfPage ? 'space-y-1.5 mb-2' : 'space-y-3 mb-4';
    const subSpacingClass = isHalfPage 
      ? 'grid grid-cols-1 md:grid-cols-4 gap-x-2 gap-y-1 p-1.5 font-medium' 
      : 'grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-1.5 p-3 font-medium print:p-1.5 print:gap-x-2 print:gap-y-1';
    const doubleSpacingClass = isHalfPage 
      ? 'grid grid-cols-2 md:grid-cols-5 gap-1 p-1.5' 
      : 'grid grid-cols-2 md:grid-cols-5 gap-3 p-3 text-center sm:text-right font-medium print:p-1.5 print:gap-1';
    const financialGridClass = isHalfPage 
      ? 'grid grid-cols-1 gap-1.5 mb-2' 
      : 'grid grid-cols-1 md:grid-cols-5 gap-4 mb-4 print:gap-3 print:mb-2';
    const financialsColLeft = isHalfPage ? 'space-y-1.5' : 'col-span-1 md:col-span-3 space-y-3 print:space-y-1.5';
    const financialsColRight = isHalfPage ? 'h-fit' : 'col-span-1 md:col-span-2 h-fit';
    const wordsBarClass = isHalfPage ? 'p-1.5 mb-1.5 text-[8px] print:text-[7px]' : 'p-2.5 mb-3 text-xs sm:text-[13px] print:text-[9px] print:p-1.5 print:mb-2';
    const stampClass = isHalfPage 
      ? 'pt-1.5 mt-1.5 border-t border-dashed border-slate-300 text-[8px] print:text-[7px] font-bold' 
      : 'pt-4 mt-3 border-t border-dashed border-slate-300 text-xs sm:text-[13px] print:text-[9px] print:pt-2 print:mt-2 font-bold';
    const barcodeHeight = isHalfPage ? 20 : 35;
    const barcodeWidth = isHalfPage ? 1.0 : 1.5;

    if (type === 'invoice') {
      return (
        <div 
          className={`bg-white text-slate-900 rounded-2xl shadow-md border border-slate-200/60 print:shadow-none print:border-0 print:rounded-none print-card-avoid ${paddingClass} ${textClass}`}
          style={{ 
            fontFamily: 'var(--font-vazirmatn), Vazir, sans-serif',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            width: '100%',
            boxSizing: 'border-box'
          }}
          dir="rtl"
        >
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start border-b-2 border-slate-900 pb-1.5 mb-2 print:pb-1 print:mb-1.5 gap-2">
            <div className="flex items-center gap-2 text-center sm:text-right print:gap-2">
              {shop.logoUrl ? (
                <div className={`relative ${isHalfPage ? 'w-8 h-8' : 'w-12 h-12'} rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0`}>
                  <Image
                    src={shop.logoUrl}
                    alt={shop.shopName}
                    fill
                    className="object-contain p-0.5"
                    unoptimized
                  />
                </div>
              ) : (
                <div className={`${isHalfPage ? 'w-8 h-8 text-xs' : 'w-12 h-12 text-xl'} rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black flex-shrink-0`}>
                  {shop.shopName.substring(0, 1)}
                </div>
              )}
              <div>
                <h1 className={`${titleTextClass} text-slate-900 tracking-tight`}>{shop.shopName}</h1>
                <p className="text-[8px] print:text-[6px] text-slate-500 font-extrabold mt-0.5">
                  صورتحساب رسمی فروش کالا و خدمات
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center sm:items-end">
              <h2 className={`${isHalfPage ? 'text-xs' : 'text-lg sm:text-xl'} font-black tracking-wider text-slate-900 mb-0.5 border-b border-slate-900 pb-0.5 w-fit px-1.5`}>
                صورتحساب فروش
              </h2>
              <div className="scale-75 sm:scale-90 origin-top-left sm:origin-top-right print:scale-50 print:mt-0 print:origin-top-left">
                <Barcode value={order.id} height={barcodeHeight} width={barcodeWidth} showText={true} />
              </div>
            </div>
          </div>

          {/* METADATA TABLES */}
          <div className={`${spacingClass}`}>
            
            {/* SELLER */}
            <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs">
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                ۱. مشخصات فروشنده
              </div>
              <div className={subSpacingClass}>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-bold text-slate-500">نام شخص حقیقی/حقوقی:</span>{' '}
                  <span className="font-black text-slate-900">{shop.shopName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">شماره ثبت / شناسه ملی:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{shop.registrationNumber || '-'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">کد اقتصادی:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{shop.economicCode || '-'}</span>
                </div>
                
                <div className="col-span-1 md:col-span-2 flex items-center gap-1">
                  <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">نشانی:</span>{' '}
                  <span className="text-slate-900 font-bold">{shop.address || 'ثبت نشده'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">تلفن تماس:</span>{' '}
                  <span className="font-mono font-bold text-slate-900" dir="ltr">{shop.contactPhone || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">پست الکترونیک:</span>{' '}
                  <span className="text-slate-900 font-mono font-bold text-[10px] print:text-[7px]">{shop.contactEmail || '-'}</span>
                </div>
              </div>
            </div>

            {/* BUYER */}
            <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs">
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                ۲. مشخصات خریدار
              </div>
              <div className={subSpacingClass}>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-bold text-slate-500">نام و نام خانوادگی / شرکت:</span>{' '}
                  <span className="font-black text-slate-900">{order.buyerName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">شماره تلفن:</span>{' '}
                  <span className="font-mono font-bold text-slate-900" dir="ltr">{order.phone || '-'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">کد پستی:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{order.zipCode || '-'}</span>
                </div>

                <div className="col-span-1 md:col-span-4 flex items-center gap-1">
                  <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">نشانی تحویل:</span>{' '}
                  <span className="text-slate-900 font-bold">
                    {order.address || 'ثبت نشده'} 
                    {(order.city || order.state) && ` (استان: ${order.state} - شهر: ${order.city})`}
                  </span>
                </div>
              </div>
            </div>

            {/* ORDER DETAILS */}
            <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs">
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                ۳. مشخصات سفارش و پرداخت
              </div>
              <div className={doubleSpacingClass}>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5 print:mb-0">شماره سفارش:</span>
                  <span className="font-mono font-black text-slate-900">#{order.id}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5 print:mb-0">ثبت سفارش:</span>
                  <span className="font-mono font-bold text-slate-900">{orderDate}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5 print:mb-0">صدور فاکتور:</span>
                  <span className="font-mono font-bold text-slate-900">{invoiceDate}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-0.5 print:mb-0">روش پرداخت:</span>
                  <span className="text-slate-900 font-extrabold">{getPaymentMethodLabel(order.paymentMethod)}</span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="font-bold text-slate-500 block mb-0.5 print:mb-0">وضعیت پرداخت:</span>
                  <span className={`font-black ${order.paymentStatus === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>
                    {getPaymentStatusLabel(order.paymentStatus)}
                  </span>
                </div>
              </div>
            </div>

          </div>

          {/* PRODUCTS TABLE */}
          <div className="border border-slate-900 rounded-lg overflow-hidden mb-3 shadow-xs">
            <table className="w-full text-right border-collapse text-[11px] print:text-[8px] print:leading-none">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-900 font-black text-slate-900">
                  <th className={`${tableHeaderClass} text-center w-8`}>ردیف</th>
                  <th className={tableHeaderClass}>نام و شرح کالا / محصول</th>
                  <th className={`${tableHeaderClass} text-center w-20`}>کد محصول (SKU)</th>
                  <th className={`${tableHeaderClass} text-center w-10`}>تعداد</th>
                  <th className={`${tableHeaderClass} text-left w-20`}>قیمت واحد</th>
                  <th className={`${tableHeaderClass} text-left w-16`}>تخفیف</th>
                  <th className={`${tableHeaderClass.replace('border-l border-slate-900', '')} text-left w-20`}>قیمت کل</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item, index) => {
                  const rowDiscountTotal = (item.discountAmount || 0) * item.quantity;
                  const rowNetTotal = item.price * item.quantity;

                  return (
                    <tr key={item.id} className="border-b border-slate-300 last:border-b-0">
                      <td className={`${tableRowClass} text-center font-mono font-bold text-slate-500`}>
                        {index + 1}
                      </td>
                      <td className={`${tableRowClass} font-black text-slate-900`}>
                        <div>{item.title}</div>
                        {item.variantName && (
                          <div className="text-[8px] print:text-[6px] text-slate-500 mt-0.5 font-bold">ویژگی: {item.variantName}</div>
                        )}
                      </td>
                      <td className={`${tableRowClass} text-center font-mono font-bold text-slate-600`}>
                        {item.sku}
                      </td>
                      <td className={`${tableRowClass} text-center font-mono font-black text-slate-900`}>
                        {item.quantity}
                      </td>
                      <td className={`${tableRowClass} text-left font-mono font-bold text-slate-800`}>
                        {(item.originalPrice || item.price).toLocaleString('fa-IR')}
                      </td>
                      <td className={`${tableRowClass} text-left font-mono font-bold text-red-600`}>
                        {rowDiscountTotal > 0 ? (
                          <span>{rowDiscountTotal.toLocaleString('fa-IR')}</span>
                        ) : (
                          <span className="text-slate-300">۰</span>
                        )}
                      </td>
                      <td className={`${tableRowClass.replace('border-l border-slate-300', '')} text-left font-mono font-black text-slate-900`}>
                        {rowNetTotal.toLocaleString('fa-IR')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* FINANCIALS & SHIPPING */}
          <div className={`${financialGridClass} page-break-inside-avoid`}>
            <div className={financialsColLeft}>
              <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs">
                <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                  ۴. اطلاعات ارسال مرسوله
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2 font-medium">
                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5 text-[9px] print:text-[7px]">روش ارسال:</span>
                    <span className="font-extrabold text-slate-900">{getShippingCarrierLabel(order.shippingCarrier)}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5 text-[9px] print:text-[7px]">کد رهگیری:</span>
                    <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-[9px] print:text-[7px] select-text">
                      {order.shippingTrackingCode || 'در انتظار صدور'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-500 block mb-0.5 text-[9px] print:text-[7px]">تاریخ تحویل:</span>
                    <span className="font-mono font-bold text-slate-900">سریعترین زمان</span>
                  </div>
                </div>
              </div>

              {order.userNotes && (
                <div className="border border-slate-900 p-2 rounded-lg space-y-0.5 bg-amber-50/15">
                  <div className="font-black text-slate-900 text-[9px] print:text-[7px] flex items-center gap-1">
                    <MessageSquare size={10} className="text-amber-700" />
                    <span>یادداشت خریدار:</span>
                  </div>
                  <div className="text-slate-700 leading-relaxed font-bold text-[9px] print:text-[7px]">{order.userNotes}</div>
                </div>
              )}
            </div>

            <div className={`${financialsColRight} border border-slate-900 rounded-lg overflow-hidden shadow-xs`}>
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 text-center ${sectionTitleClass}`}>
                ۵. محاسبات مالی فاکتور
              </div>
              <div className="divide-y divide-slate-200 text-[10px] print:text-[7px] print:leading-none">
                <div className="flex justify-between p-1.5 font-bold">
                  <span className="text-slate-500">جمع کل قبل تخفیف:</span>
                  <span className="font-mono font-bold text-slate-950">{subtotalOriginal.toLocaleString('fa-IR')}</span>
                </div>
                
                {(itemDiscountsSum > 0 || couponDiscount > 0) && (
                  <div className="flex justify-between p-1.5 text-red-600 font-bold">
                    <span>مجموع تخفیف‌ها:</span>
                    <span className="font-mono">-{(itemDiscountsSum + couponDiscount).toLocaleString('fa-IR')}</span>
                  </div>
                )}
                
                <div className="flex justify-between p-1.5 font-bold">
                  <span className="text-slate-500">جمع خالص:</span>
                  <span className="font-mono text-slate-950">{netSubtotal.toLocaleString('fa-IR')}</span>
                </div>

                <div className="flex justify-between p-1.5 font-bold">
                  <span className="text-slate-500">هزینه ارسال:</span>
                  <span className="font-mono text-slate-950">
                    {order.shippingCost === 0 ? 'رایگان' : `${order.shippingCost.toLocaleString('fa-IR')}`}
                  </span>
                </div>

                <div className="flex justify-between p-1.5 font-bold">
                  <span className="text-slate-500">مالیات بر ارزش افزوده (۱۰٪):</span>
                  <span className="font-mono text-slate-950">{calculatedTax.toLocaleString('fa-IR')}</span>
                </div>

                <div className="flex justify-between p-1.5 bg-slate-900 text-white font-black">
                  <span>جمع کل نهایی:</span>
                  <span className="font-mono">{finalAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            </div>
          </div>

          {/* WORDS BAR */}
          <div className={`border border-slate-900 bg-slate-50/50 rounded-lg flex justify-between items-center gap-2 page-break-inside-avoid ${wordsBarClass}`}>
            <div>
              <span className="font-black text-slate-900">مبلغ کل به حروف:</span>{' '}
              <span className="font-black text-blue-800">{finalAmountInWords} تومان</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] print:text-[6px] text-slate-400 font-bold">
              <CheckCircle size={10} className="text-green-600" />
              <span>تاییدیه پرداخت قطعی سیستم شتاب</span>
            </div>
          </div>

          {/* STAMP/SIGNATURES */}
          <div className={`grid grid-cols-2 gap-4 text-center page-break-inside-avoid ${stampClass}`}>
            <div className="flex flex-col items-center">
              <div className="text-slate-500 mb-0.5">مهر و امضاء فروشگاه</div>
              <div className={`${isHalfPage ? 'h-10' : 'h-16'} w-full flex items-center justify-center`}>
                <div className={`relative inline-flex items-center justify-center p-1.5 border border-dashed border-blue-500/85 rounded-full text-blue-600 font-black transform -rotate-12 ${isHalfPage ? 'scale-75' : 'scale-90'} select-none bg-white`}>
                  <div className="absolute inset-0.5 border border-blue-400 rounded-full opacity-50"></div>
                  <div className="flex flex-col items-center justify-center text-center px-2 py-0.5">
                    <span className="text-[5px] font-bold text-blue-500">مهر دیجیتال</span>
                    <span className="text-[10px] font-black tracking-wider my-0.5">{shop.shopName}</span>
                    <span className="text-[5px] font-black text-green-600 mt-0.5">تایید رسمی</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="text-slate-500 mb-0.5">محل امضاء خریدار</div>
              <div className={`${isHalfPage ? 'h-10' : 'h-16'} w-full flex items-center justify-center`}>
                <div className="inline-block px-3 py-1 border border-dashed border-slate-300 bg-slate-50/30 rounded-md text-[8px] text-slate-400">
                  گیرنده: <span className="font-extrabold text-slate-600">{order.buyerName}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      );
    } else if (type === 'label') {
      return (
        <div 
          className="bg-white text-slate-900 border-2 border-slate-900 rounded-xl flex flex-col justify-between shadow-md print:shadow-none print:border-2 print:rounded-none print-card-avoid"
          style={{ 
            minHeight: isHalfPage ? '190px' : '280px', 
            fontFamily: 'var(--font-vazirmatn), Vazir, sans-serif',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            width: '100%',
            boxSizing: 'border-box',
            padding: isHalfPage ? '8px' : '16px'
          }}
          dir="rtl"
        >
          <div className="flex justify-between items-start border-b border-slate-900 pb-1.5">
            <h2 className={`font-black bg-slate-900 text-white rounded-md select-none ${isHalfPage ? 'text-[9px] px-1.5 py-0.5' : 'text-xs sm:text-sm px-3 py-1'}`}>
              برچسب ارسال مرسوله پستی
            </h2>
            <div className="font-mono text-left font-bold space-y-0.5 text-[8px] sm:text-xs">
              <div>سفارش: #{order.id}</div>
              <div className="text-[8px] print:text-[7px]">حمل‌کننده: {getShippingCarrierLabel(order.shippingCarrier)}</div>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-2 text-xs sm:text-[13px] ${isHalfPage ? 'py-1 text-[9px] print:text-[8px] gap-1' : 'py-3'}`}>
            {/* Receiver */}
            <div className={`bg-slate-100/80 rounded-lg border border-slate-300 relative ${isHalfPage ? 'p-1.5 space-y-0.5 rounded-md' : 'p-3 space-y-1'}`}>
              <span className={`absolute right-4 bg-slate-900 text-white rounded-md font-black ${isHalfPage ? 'right-2 -top-2 px-1 text-[6px]' : '-top-3 px-2 py-0.5 text-[8px]'}`}>
                گیرنده مرسوله (خریدار):
              </span>
              <div className={`font-black text-slate-900 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>{order.buyerName}</div>
              <div><span className="font-bold text-slate-400">شماره تماس:</span> <span className="font-mono font-black">{order.phone || '-'}</span></div>
              <div><span className="font-bold text-slate-400">نشانی مقصد:</span> <span className="font-black text-slate-900">{order.address}</span></div>
              <div className="flex gap-4">
                <div><span className="font-bold text-slate-400">شهر:</span> <span className="font-bold text-slate-900">{order.state} / {order.city}</span></div>
                <div><span className="font-bold text-slate-400">کد پستی:</span> <span className="font-mono font-black">{order.zipCode || '-'}</span></div>
              </div>
            </div>

            {/* Sender */}
            <div className={`border border-slate-900 rounded-lg relative ${isHalfPage ? 'p-1.5 space-y-0.5 rounded-md' : 'p-3 space-y-1'}`}>
              <span className={`absolute right-4 bg-slate-900 text-white rounded-md font-black ${isHalfPage ? 'right-2 -top-2 px-1 text-[6px]' : '-top-3 px-2 py-0.5 text-[8px]'}`}>
                فرستنده (فروشگاه):
              </span>
              <div className="font-black text-slate-900">{shop.shopName}</div>
              <div><span className="font-bold text-slate-400">نشانی فرستنده:</span> <span className="text-slate-700">{shop.address || 'دفتر مرکزی فروشگاه'}</span></div>
              <div><span className="font-bold text-slate-400">پشتیبانی:</span> <span className="font-mono text-slate-700">{shop.contactPhone || '-'}</span></div>
            </div>
          </div>

          <div className="border-t border-slate-900 pt-1.5 flex justify-between items-center gap-2 text-[10px] font-bold">
            <div>
              <span className="text-slate-400 text-[8px]">کد رهگیری:</span>{' '}
              <span className="font-mono font-black text-slate-900 bg-slate-50 px-1 py-0.5 border border-slate-200 rounded text-[9px]">
                {order.shippingTrackingCode || 'نیاز به درج توسط پست'}
              </span>
            </div>
            {order.shippingTrackingCode ? (
              <div className="scale-[0.6] sm:scale-[0.8] origin-right">
                <Barcode value={order.shippingTrackingCode} height={20} width={1.0} showText={false} />
              </div>
            ) : (
              <div className="border border-slate-900 px-2 py-0.5 rounded bg-slate-50 text-[7px] text-slate-400">
                بارکد شرکت پست
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0b0f19] text-slate-900 pb-12 print:pb-0 print:bg-white">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: ${pageSize === 'A5' ? 'A5 portrait' : a4Layout === 'two-landscape' ? 'A4 landscape' : 'A4 portrait'};
            margin: ${pageSize === 'A5' ? '5mm 5mm' : '8mm 8mm'} !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
            background-color: #fff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          ::-webkit-scrollbar {
            display: none !important;
          }
          * {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }
          html, body, #__next, [data-reactroot], .flex-grow, .min-h-screen {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
          }
          .print-card-avoid {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}} />
      
      {/* STICKY CONTROL PANEL (HIDDEN ON PRINT) */}
      <div className="sticky top-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 shadow-md z-50 print:hidden select-none">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link 
              href="/admin/orders"
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"
              title="بازگشت به سفارش‌ها"
            >
              <ArrowRight size={18} />
            </Link>
            <div>
              <h1 className="text-sm font-black text-slate-950 dark:text-white flex items-center gap-1.5">
                <Printer size={16} className="text-blue-500" />
                <span>چاپ دسته‌ای سفارشات ({orders.length} مورد)</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">فروشگاه: {shop.shopName}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPrintMode('label')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                printMode === 'label'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950'
              }`}
            >
              <Truck size={14} />
              <span>فقط برچسب‌های پستی</span>
            </button>

            <button
              onClick={() => setPrintMode('invoice')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                printMode === 'invoice'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950'
              }`}
            >
              <FileText size={14} />
              <span>فقط فاکتورها</span>
            </button>

            <button
              onClick={() => setPrintMode('both')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                printMode === 'both'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400'
                  : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-950'
              }`}
            >
              <Printer size={14} />
              <span>فاکتور و برچسب با هم</span>
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-black transition-all shadow-md shadow-blue-500/10 active:scale-[0.98]"
            >
              <Printer size={14} />
              <span>شروع فرآیند چاپ</span>
            </button>
          </div>
        </div>

        {/* Page Size & Layout settings */}
        <div className="max-w-5xl mx-auto mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 text-xs font-bold text-slate-700 dark:text-slate-300 justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">سایز کاغذ:</span>
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => setPageSize('A4')}
                  className={`px-3 py-1 rounded-md transition-all ${pageSize === 'A4' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  A4
                </button>
                <button
                  onClick={() => {
                    setPageSize('A5');
                    setA4Layout('single');
                  }}
                  className={`px-3 py-1 rounded-md transition-all ${pageSize === 'A5' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  A5
                </button>
              </div>
            </div>

            {pageSize === 'A4' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">چیدمان صفحه:</span>
                <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
                  <button
                    onClick={() => setA4Layout('single')}
                    className={`px-3 py-1 rounded-md transition-all ${a4Layout === 'single' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    هر سند یک صفحه مجزا
                  </button>
                  <button
                    onClick={() => setA4Layout('two-portrait')}
                    className={`px-3 py-1 rounded-md transition-all ${a4Layout === 'two-portrait' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                    title="دو سند عمودی روی هم در یک صفحه"
                  >
                    دو سند در یک صفحه (عمودی)
                  </button>
                  <button
                    onClick={() => setA4Layout('two-landscape')}
                    className={`px-3 py-1 rounded-md transition-all ${a4Layout === 'two-landscape' ? 'bg-white dark:bg-slate-800 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700'}`}
                    title="دو سند افقی بغل هم در یک صفحه"
                  >
                    دو سند در یک صفحه (افقی)
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-medium">
            💡 برای چاپ بدون حاشیه اضافی، در تنظیمات مرورگر گزینه‌های Headers/Footers را خاموش و Margins را روی None قرار دهید.
          </div>
        </div>
      </div>

      {/* PRINT CONTAINERS LOOP */}
      <div className="mx-auto mt-6 px-4 sm:px-0 print:mt-0 print:px-0 max-w-[850px] print:max-w-full">
        {pageSize === 'A4' && a4Layout !== 'single' ? (
          pairs.map((pair, pairIndex) => {
            const isLandscape = a4Layout === 'two-landscape';
            return (
              <div 
                key={pairIndex} 
                className={`w-full print:w-full ${
                  isLandscape 
                    ? 'print:grid print:grid-cols-2 print:gap-4 print:items-start' 
                    : 'print:flex print:flex-col print:justify-between'
                } ${pairIndex > 0 ? 'print:break-before-page' : ''} space-y-6 print:space-y-0`}
                style={{ 
                  pageBreakBefore: pairIndex > 0 ? 'always' : 'auto',
                  breakBefore: pairIndex > 0 ? 'page' : 'auto',
                  minHeight: isLandscape ? '190mm' : '275mm',
                  height: 'auto'
                }}
              >
                {pair.map((item, itemIndex) => (
                  <div 
                    key={item.key} 
                    className={`${isLandscape ? 'w-full' : 'w-full h-[48%]'} flex flex-col justify-start`}
                  >
                    {renderPrintItem(item, true)}
                    {itemIndex === 0 && !isLandscape && <div className="h-6 print:hidden" />}
                  </div>
                ))}
                {/* For on-screen preview: spacing between pages */}
                <div className="h-10 w-full border-b border-dashed border-slate-300 print:hidden my-8" />
              </div>
            );
          })
        ) : (
          printItems.map((item, index) => (
            <div 
              key={item.key}
              className={`${index > 0 ? 'print:break-before-page' : ''} mb-6 print:mb-0`}
              style={{ 
                pageBreakBefore: index > 0 ? 'always' : 'auto',
                breakBefore: index > 0 ? 'page' : 'auto'
              }}
            >
              {renderPrintItem(item, pageSize === 'A5')}
              {/* For on-screen preview: spacing between pages */}
              <div className="h-10 w-full border-b border-dashed border-slate-300 print:hidden my-8" />
            </div>
          ))
        )}
      </div>

    </div>
  );
}
