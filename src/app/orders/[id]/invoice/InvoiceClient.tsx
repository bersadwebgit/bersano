'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Printer, ArrowRight, Phone, Mail, MapPin, FileText, CheckCircle, 
  Settings, Store, User, CreditCard, Truck, MessageSquare, 
  Trash2, PenTool, Upload, Check, Eye, ChevronDown, ShieldCheck
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
  type?: string;
  downloadToken?: string | null;
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
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
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

export default function InvoiceClient({ order, shop, userRole }: { order: InvoiceOrder; shop: InvoiceShop; userRole: 'customer' | 'admin' | 'superadmin' | null }) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isCustomer = userRole === 'customer';
  const isAllDigital = order.items.every(item => item.type === 'digital');

  // --- CONFIG / INTERACTIVE STATES ---
  const [invoiceType, setInvoiceType] = useState<'formal' | 'standard'>('formal');
  const [showLogo, setShowLogo] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showQrCode, setShowQrCode] = useState(true);
  const [showShippingLabel, setShowShippingLabel] = useState(!isAllDigital && !isCustomer);
  const [printMode, setPrintMode] = useState<'both' | 'invoice' | 'label'>(
    isCustomer || isAllDigital ? 'invoice' : 'both'
  );
  
  // Custom Paper Size & Layout States
  const [pageSize, setPageSize] = useState<'A4' | 'A5'>('A4');
  const [a4Layout, setA4Layout] = useState<'single' | 'two-portrait' | 'two-landscape'>('single');

  // Seller settings
  const [shopName, setShopName] = useState(shop.shopName);
  const [registrationNumber, setRegistrationNumber] = useState(shop.registrationNumber || '');
  const [economicCode, setEconomicCode] = useState(shop.economicCode || '');
  const [shopPhone, setShopPhone] = useState(shop.contactPhone || '');
  const [shopEmail, setShopEmail] = useState(shop.contactEmail || '');
  const [shopAddress, setShopAddress] = useState(shop.address || '');

  // Buyer settings
  const [buyerName, setBuyerName] = useState(order.buyerName);
  const [buyerPhone, setBuyerPhone] = useState(order.phone || '');
  const [buyerZipCode, setBuyerZipCode] = useState(order.zipCode || '');
  const [buyerAddress, setBuyerAddress] = useState(order.address || '');
  const [buyerCity, setBuyerCity] = useState(order.city || '');
  const [buyerState, setBuyerState] = useState(order.state || '');

  // Order & Financials
  const [paymentMethod, setPaymentMethod] = useState(order.paymentMethod || 'online');
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || 'pending');
  const [paymentTrackingCode, setPaymentTrackingCode] = useState('TRX-' + order.fullId.slice(-8).toUpperCase());
  const [shippingCarrier, setShippingCarrier] = useState(order.shippingCarrier || 'post');
  const [shippingTrackingCode, setShippingTrackingCode] = useState(order.shippingTrackingCode || '');
  const [estDeliveryDate, setEstDeliveryDate] = useState(() => {
    return new Date(
      new Date(order.createdAt).getTime() + 3 * 24 * 60 * 60 * 1000
    ).toLocaleDateString('fa-IR');
  });

  const [shippingCost, setShippingCost] = useState(isAllDigital ? 0 : (order.shippingCost || 0));
  const [isCalculatedTax10, setIsCalculatedTax10] = useState(true);
  const [taxAmount, setTaxAmount] = useState(order.taxAmount || 0);

  // Notes & terms
  const [userNotes, setUserNotes] = useState(order.userNotes || '');
  const [warrantyPolicy, setWarrantyPolicy] = useState(
    isAllDigital
      ? `۱. با توجه به ماهیت دیجیتال و دانلودی کالا، پس از خرید و فعال‌سازی لینک دانلود، امکان انصراف از خرید و مرجوعی وجه وجود ندارد.\n` +
        `۲. لینک‌های دانلود به صورت دائمی در حساب کاربری شما بخش «دانلودهای من» فعال و در دسترس خواهند بود.\n` +
        `۳. در صورت بروز هرگونه مشکل در فرآیند دانلود یا خرابی فایل‌ها، مراتب را سریعاً به پشتیبانی فروشگاه اطلاع دهید.`
      : `۱. در صورت مغایرت کالا با مشخصات مندرج در سایت، مراتب را حداکثر ظرف مدت ۲۴ ساعت به پشتیبانی اطلاع دهید.\n` +
        `۲. امکان مرجوعی کالا به علت انصراف از خرید تا ۷ روز پس از دریافت، به شرط باز نشدن پلمب کالا میسر است.\n` +
        `۳. مسئولیت فیزیکی کالا پس از خروج از انبار بر عهده شرکت حمل‌کننده می‌باشد.`
  );
  const [thankYouMessage, setThankYouMessage] = useState(
    `از خرید شما صمیمانه سپاسگزاریم و آرزومند رضایت کامل شما از محصولات دریافتی هستیم.`
  );

  // Signature settings
  const [signatureType, setSignatureType] = useState<'none' | 'digital' | 'draw' | 'upload'>('digital');
  const [issuerName, setIssuerName] = useState('مدیریت فروشگاه');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Sidebar accordions state
  const [activeAccordion, setActiveAccordion] = useState<string | null>('layout');

  const toggleAccordion = (name: string) => {
    setActiveAccordion(activeAccordion === name ? null : name);
  };

  const handlePrint = () => {
    window.print();
  };

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

  // --- DRAWING CANVAS LOGIC ---
  useEffect(() => {
    if (signatureType !== 'draw') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#1e3a8a'; // beautiful blue ink color for signature
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const handleStart = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      ctx.beginPath();
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      ctx.moveTo(x, y);
      setIsDrawing(true);
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = ('touches' in e) ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
      const y = ('touches' in e) ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const handleEnd = () => {
      if (isDrawing) {
        setIsDrawing(false);
        // Save base64
        setSignatureImage(canvas.toDataURL('image/png'));
      }
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleEnd);

    canvas.addEventListener('touchstart', handleStart, { passive: false });
    canvas.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEnd);

      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [signatureType, isDrawing]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureImage(null);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (result) {
          const img = new window.Image();
          img.onload = () => {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const ctx = tempCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const pngDataUrl = tempCanvas.toDataURL('image/png');
              setSignatureImage(pngDataUrl);
            } else {
              setSignatureImage(result as string);
            }
          };
          img.src = result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // --- CALCULATIONS ---
  const subtotalOriginal = order.items.reduce((sum, item) => {
    return sum + (item.originalPrice || item.price) * item.quantity;
  }, 0);

  const itemDiscountsSum = order.items.reduce((sum, item) => {
    return sum + (item.discountAmount || 0) * item.quantity;
  }, 0);

  const couponDiscount = order.discountAmount || 0;
  const netSubtotal = Math.max(0, subtotalOriginal - itemDiscountsSum - couponDiscount);
  const calculatedTax = isCalculatedTax10 ? Math.round(netSubtotal * 0.1) : taxAmount;
  const finalAmount = netSubtotal + shippingCost + calculatedTax;
  const finalAmountInWords = numberToWordsPersian(finalAmount);

  const qrCodeUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/orders/${order.fullId}/invoice`
    : `https://shop_final.com/orders/${order.fullId}/invoice`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrCodeUrl)}`;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const printParam = params.get('print');
      if (printParam === 'label') {
        setPrintMode('label');
        setTimeout(() => {
          window.print();
        }, 800);
      } else if (printParam === 'invoice') {
        setPrintMode('invoice');
        setTimeout(() => {
          window.print();
        }, 800);
      } else if (printParam === 'both') {
        setPrintMode('both');
        setTimeout(() => {
          window.print();
        }, 800);
      }
    }
  }, []);

  // Load general print settings from localStorage on mount
  useEffect(() => {
    if (isCustomer) return;
    try {
      const savedInvoiceType = localStorage.getItem('print_invoiceType');
      if (savedInvoiceType) setInvoiceType(savedInvoiceType as any);

      const savedShowLogo = localStorage.getItem('print_showLogo');
      if (savedShowLogo) setShowLogo(savedShowLogo === 'true');

      const savedShowBarcode = localStorage.getItem('print_showBarcode');
      if (savedShowBarcode) setShowBarcode(savedShowBarcode === 'true');

      const savedShowQrCode = localStorage.getItem('print_showQrCode');
      if (savedShowQrCode) setShowQrCode(savedShowQrCode === 'true');

      const savedShowShippingLabel = localStorage.getItem('print_showShippingLabel');
      if (savedShowShippingLabel) setShowShippingLabel(savedShowShippingLabel === 'true');

      const savedPageSize = localStorage.getItem('print_pageSize');
      if (savedPageSize) setPageSize(savedPageSize as any);

      const savedA4Layout = localStorage.getItem('print_a4Layout');
      if (savedA4Layout) setA4Layout(savedA4Layout as any);

      const savedSignatureType = localStorage.getItem('print_signatureType');
      if (savedSignatureType) setSignatureType(savedSignatureType as any);

      const savedIssuerName = localStorage.getItem('print_issuerName');
      if (savedIssuerName) setIssuerName(savedIssuerName);

      const savedSignatureImage = localStorage.getItem('print_signatureImage');
      if (savedSignatureImage) setSignatureImage(savedSignatureImage);

      const savedWarrantyPolicy = localStorage.getItem('print_warrantyPolicy');
      if (savedWarrantyPolicy) setWarrantyPolicy(savedWarrantyPolicy);

      const savedThankYouMessage = localStorage.getItem('print_thankYouMessage');
      if (savedThankYouMessage) setThankYouMessage(savedThankYouMessage);
    } catch (err) {
      console.error('Failed to load print settings from localStorage:', err);
    }
  }, [isCustomer]);

  // Save general print settings to localStorage when they change
  useEffect(() => {
    if (isCustomer) return;
    try {
      localStorage.setItem('print_invoiceType', invoiceType);
      localStorage.setItem('print_showLogo', String(showLogo));
      localStorage.setItem('print_showBarcode', String(showBarcode));
      localStorage.setItem('print_showQrCode', String(showQrCode));
      localStorage.setItem('print_showShippingLabel', String(showShippingLabel));
      localStorage.setItem('print_pageSize', pageSize);
      localStorage.setItem('print_a4Layout', a4Layout);
      localStorage.setItem('print_signatureType', signatureType);
      localStorage.setItem('print_issuerName', issuerName);
      if (signatureImage) {
        localStorage.setItem('print_signatureImage', signatureImage);
      } else {
        localStorage.removeItem('print_signatureImage');
      }
      localStorage.setItem('print_warrantyPolicy', warrantyPolicy);
      localStorage.setItem('print_thankYouMessage', thankYouMessage);
    } catch (err) {
      console.error('Failed to save print settings to localStorage:', err);
    }
  }, [
    isCustomer, invoiceType, showLogo, showBarcode, showQrCode, 
    showShippingLabel, pageSize, a4Layout, signatureType, 
    issuerName, signatureImage, warrantyPolicy, thankYouMessage
  ]);

  const orderDate = new Date(order.createdAt).toLocaleDateString('fa-IR');
  const invoiceDate = new Date().toLocaleDateString('fa-IR');

  // Construct list of individual printable blocks
  const printItems: {
    key: string;
    type: 'invoice' | 'label';
  }[] = [];

  if (printMode === 'invoice' || printMode === 'both') {
    printItems.push({
      key: `invoice-${order.fullId}`,
      type: 'invoice',
    });
  }
  if (showShippingLabel && (printMode === 'label' || printMode === 'both')) {
    printItems.push({
      key: `label-${order.fullId}`,
      type: 'label',
    });
  }

  const isA5OrHalfA4 = pageSize === 'A5' || a4Layout !== 'single';

  // Group into pairs for two-in-one layout
  const pairs: (typeof printItems)[] = [];
  if (pageSize === 'A4' && a4Layout !== 'single') {
    for (let i = 0; i < printItems.length; i += 2) {
      pairs.push(printItems.slice(i, i + 2));
    }
  }

  const renderPrintItem = (item: typeof printItems[0], isHalfPage: boolean) => {
    const { type } = item;

    // Layout configuration variables
    const paddingClass = isHalfPage ? 'p-4 sm:p-5 print:p-2' : 'p-8 sm:p-10 print:p-4';
    const textClass = isHalfPage ? 'text-[10px] print:text-[8px] print:leading-tight' : 'text-xs sm:text-[13px] print:text-[11px] print:leading-normal';
    const titleTextClass = isHalfPage ? 'text-sm font-black' : 'text-xl sm:text-2xl font-black';
    const sectionTitleClass = isHalfPage ? 'text-[10px] font-black py-0.5 px-1.5' : 'text-xs px-4 py-1.5 font-black';
    const tableHeaderClass = isHalfPage 
      ? 'p-1 text-[8px] print:text-[7px] border-l border-slate-900' 
      : 'p-3 print:p-1 text-center w-12 print:w-8 print:text-[10px] border-l border-slate-900';
    const tableRowClass = isHalfPage 
      ? 'p-1 text-[8px] print:text-[7px] border-l border-slate-300' 
      : 'p-3 print:p-1 border-l border-slate-300';
    const spacingClass = isHalfPage ? 'space-y-1.5 mb-2' : 'grid grid-cols-1 print:grid-cols-2 gap-3 mb-4 print:mb-1.5 print:text-[10px] print:gap-1.5';
    const subSpacingClass = isHalfPage 
      ? 'gap-x-2 gap-y-1 p-1.5 font-medium' 
      : 'grid grid-cols-1 md:grid-cols-4 print:grid-cols-1 gap-x-4 gap-y-2 p-3 font-medium print:p-1.5 print:gap-y-0.5';
    const doubleSpacingClass = isHalfPage 
      ? 'gap-1 p-1.5' 
      : 'grid grid-cols-2 md:grid-cols-5 gap-3 p-3 text-center sm:text-right font-medium print:p-1.5 print:gap-0.5';
    const financialGridClass = isHalfPage 
      ? 'grid grid-cols-1 gap-1.5 mb-2' 
      : 'grid grid-cols-1 md:grid-cols-5 gap-6 print:gap-1.5 mb-6 print:mb-1.5 page-break-inside-avoid';
    const financialsColLeft = isHalfPage ? 'space-y-1.5' : 'col-span-1 md:col-span-3 space-y-4 print:space-y-1';
    const financialsColRight = isHalfPage ? 'h-fit' : 'col-span-1 md:col-span-2 h-fit';
    const wordsBarClass = isHalfPage ? 'p-1.5 mb-1.5 text-[8px] print:text-[7px]' : 'p-3.5 print:p-1 mb-6 print:mb-1.5 flex flex-col sm:flex-row justify-between items-center gap-3 print:gap-1';
    const warrantyGridClass = isHalfPage 
      ? 'grid grid-cols-1 gap-1 pt-1.5 mt-1.5 text-[8px] print:text-[7px]' 
      : 'grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-1.5 pt-5 print:pt-1 border-t-2 border-slate-300 text-[11px] print:text-[8px] text-slate-500';
    const stampClass = isHalfPage 
      ? 'pt-1.5 mt-1.5 border-t border-dashed border-slate-300 text-[8px] print:text-[7px] font-bold' 
      : 'grid grid-cols-2 gap-8 print:gap-1.5 text-center pt-8 print:pt-1.5 mt-5 print:mt-1.5 border-t border-dashed border-slate-300 text-xs sm:text-[13px] print:text-[9px] font-bold page-break-inside-avoid';
    const stampHeightClass = isHalfPage ? 'h-10' : 'h-32 print:h-11';
    const barcodeHeight = isHalfPage ? 20 : 28;
    const barcodeWidth = isHalfPage ? 1.0 : 1.25;

    if (type === 'invoice') {
      return (
        <div 
          className={`bg-white text-slate-900 rounded-2xl shadow-lg border border-slate-200/60 print:shadow-none print:border-0 print:rounded-none print-card-avoid ${paddingClass} ${textClass}`}
          dir="rtl"
          style={{ 
            fontFamily: 'var(--font-vazirmatn), Vazir, sans-serif',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          {/* HEADER SECTION */}
          <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start border-b-2 border-slate-900 pb-2 mb-2 sm:pb-3 sm:mb-3 print:pb-1.5 print:mb-1.5 gap-2">
            
            {/* Logo & Store details */}
            <div className="flex items-center gap-2 text-center sm:text-right print:gap-2">
              {showLogo && (
                shop.logoUrl ? (
                  <div className={`relative ${isHalfPage ? 'w-10 h-10' : 'w-16 h-16'} rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0`}>
                    <Image
                      src={shop.logoUrl}
                      alt={shopName}
                      fill
                      className="object-contain p-1"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className={`${isHalfPage ? 'w-10 h-10 text-lg' : 'w-16 h-16 text-2xl'} rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black flex-shrink-0`}>
                    {shopName.substring(0, 1)}
                  </div>
                )
              )}
              <div>
                <h1 className={`${titleTextClass} text-slate-900 tracking-tight`}>{shopName}</h1>
                <p className="text-[8px] print:text-[6px] text-slate-500 font-extrabold mt-0.5">
                  {invoiceType === 'formal' ? 'صورتحساب رسمی فروش کالا و خدمات' : 'برگه سفارش و فاکتور فروشگاهی'}
                </p>
              </div>
            </div>

            {/* Document Title, Barcode & Metadata */}
            <div className="flex flex-col items-center sm:items-end">
              <h2 className={`${isHalfPage ? 'text-xs' : 'text-lg sm:text-xl'} font-black tracking-wider text-slate-900 mb-1 border-b border-slate-900 pb-0.5 w-fit px-1.5`}>
                صورتحساب فروش
              </h2>
              {showBarcode && (
                <div className="scale-75 sm:scale-90 origin-top-left sm:origin-top-right print:scale-50 print:mt-0 print:origin-top-left">
                  <Barcode value={order.id} height={barcodeHeight} width={barcodeWidth} showText={true} />
                </div>
              )}
            </div>

          </div>

          {/* METADATA TABLES */}
          <div className={spacingClass}>
            
            {/* SECTION 1: SELLER DETAILS */}
            <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                ۱. مشخصات فروشنده
              </div>
              <div className={`grid grid-cols-1 ${subSpacingClass} flex-grow`}>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-bold text-slate-500">نام حقیقی/حقوقی:</span>{' '}
                  <span className="font-black text-slate-900">{shopName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">شماره ثبت / شناسه ملی:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{registrationNumber || '-'}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">کد اقتصادی:</span>{' '}
                  <span className="font-mono font-bold text-slate-900">{economicCode || '-'}</span>
                </div>
                
                <div className="col-span-1 md:col-span-2 flex items-center gap-1">
                  <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">نشانی:</span>{' '}
                  <span className="text-slate-900 font-bold">{shopAddress || 'ثبت نشده'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Phone size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">تلفن:</span>{' '}
                  <span className="font-mono font-bold text-slate-900" dir="ltr">{shopPhone || '-'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Mail size={10} className="text-slate-400 flex-shrink-0" />
                  <span className="font-bold text-slate-500">ایمیل:</span>{' '}
                  <span className="text-slate-900 font-mono font-bold text-[10px] print:text-[7px]">{shopEmail || '-'}</span>
                </div>
              </div>
            </div>

            {/* SECTION 2: BUYER DETAILS */}
            <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs flex flex-col justify-between">
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                ۲. مشخصات خریدار
              </div>
              <div className={`grid grid-cols-1 ${subSpacingClass} flex-grow`}>
                <div className="col-span-1 md:col-span-2">
                  <span className="font-bold text-slate-500">نام و نام خانوادگی / شرکت:</span>{' '}
                  <span className="font-black text-slate-900">{buyerName}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500">شماره تلفن:</span>{' '}
                  <span className="font-mono font-bold text-slate-900" dir="ltr">{buyerPhone || '-'}</span>
                </div>
                {!isAllDigital ? (
                  <>
                    <div>
                      <span className="font-bold text-slate-500">کد پستی:</span>{' '}
                      <span className="font-mono font-bold text-slate-900">{buyerZipCode || '-'}</span>
                    </div>

                    <div className="col-span-1 md:col-span-4 flex items-center gap-1">
                      <MapPin size={10} className="text-slate-400 flex-shrink-0" />
                      <span className="font-bold text-slate-500">نشانی تحویل:</span>{' '}
                      <span className="text-slate-900 font-bold">
                        {buyerAddress || 'ثبت نشده'} 
                        {(buyerCity || buyerState) && ` (استان: ${buyerState} - شهر: ${buyerCity})`}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-bold text-slate-500">نوع تحویل:</span>{' '}
                      <span className="font-black text-blue-700">دانلود آنی و دیجیتال</span>
                    </div>
                    <div className="col-span-1 md:col-span-4 flex items-center gap-1.5 bg-blue-50/50 border border-blue-100 rounded-lg p-2 mt-1 print:p-1 print:mt-0.5 print:border-0 print:bg-transparent">
                      <CheckCircle size={10} className="text-blue-600 flex-shrink-0" />
                      <span className="font-bold text-slate-500">وضعیت تحویل:</span>{' '}
                      <span className="text-blue-800 font-black">لینک‌های دانلود در انتهای فاکتور فعال هستند.</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* SECTION 3: ORDER AND PAYMENT DETAILS */}
            <div className="col-span-1 print:col-span-2 border border-slate-900 rounded-lg overflow-hidden shadow-xs">
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                ۳. مشخصات سفارش و پرداخت
              </div>
              <div className={doubleSpacingClass}>
                <div>
                  <span className="font-bold text-slate-500 block mb-1 print:mb-0">شماره سفارش:</span>
                  <span className="font-mono font-black text-slate-900">#{order.id}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-1 print:mb-0">تاریخ ثبت سفارش:</span>
                  <span className="font-mono font-bold text-slate-900">{orderDate}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-1 print:mb-0">تاریخ صدور فاکتور:</span>
                  <span className="font-mono font-bold text-slate-900">{invoiceDate}</span>
                </div>
                <div>
                  <span className="font-bold text-slate-500 block mb-1 print:mb-0">روش پرداخت:</span>
                  <span className="text-slate-900 font-extrabold">{getPaymentMethodLabel(paymentMethod)}</span>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <span className="font-bold text-slate-500 block mb-1 print:mb-0">وضعیت پرداخت:</span>
                  <span className={`font-black ${paymentStatus === 'paid' ? 'text-green-700' : 'text-amber-700'}`}>
                    {getPaymentStatusLabel(paymentStatus)}
                  </span>
                </div>
              </div>
              {/* Payment Tracking Code Row */}
              <div className="border-t border-slate-200 px-4 py-1.5 bg-slate-50/40 text-[10px] print:text-[8px] flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-500">کد پیگیری پرداخت الکترونیک:</span>{' '}
                  <span className="font-mono font-black text-blue-800">{paymentTrackingCode || 'ثبت نشده'}</span>
                </div>
                <div className="text-[9px] text-slate-400 font-bold">تراکنش معتبر بانکی سیستم شتاب</div>
              </div>
            </div>

          </div>

          {/* PRODUCTS TABLE */}
          <div className="border border-slate-900 rounded-lg overflow-hidden mb-3 print:mb-1.5 shadow-xs">
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

          {/* FINANCIAL CALCULATIONS & SHIPPING SECTION */}
          <div className={`${financialGridClass}`}>
            
            {/* Shipping Info Card (Left) */}
            <div className={financialsColLeft}>
              
              {!isAllDigital ? (
                <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs">
                  <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                    ۴. اطلاعات ارسال مرسوله
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 font-medium">
                    <div>
                      <span className="font-bold text-slate-500 block mb-0.5 text-[9px] print:text-[7px]">روش ارسال:</span>
                      <span className="font-extrabold text-slate-900">{getShippingCarrierLabel(shippingCarrier)}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-0.5 text-[9px] print:text-[7px]">کد رهگیری:</span>
                      <span className="font-mono font-black text-slate-900 bg-slate-100 border border-slate-200 px-1 py-0.5 rounded text-[9px] print:text-[7px] select-text">
                        {shippingTrackingCode || 'در انتظار صدور'}
                      </span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-500 block mb-0.5 text-[9px] print:text-[7px]">تاریخ تحویل:</span>
                      <span className="font-mono font-bold text-slate-900">{estDeliveryDate}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border border-slate-900 rounded-lg overflow-hidden shadow-xs bg-blue-50/5">
                  <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 ${sectionTitleClass}`}>
                    ۴. اطلاعات و لینک‌های دانلود فایل
                  </div>
                  <div className="p-2 space-y-1">
                    <p className="text-slate-600 font-bold text-[9px] print:text-[7px] leading-relaxed">
                      این سفارش شامل محصولات دیجیتال است. لینک‌های مستقیم دانلود در زیر آمده است:
                    </p>
                    <div className="space-y-1 print:space-y-0.5 pt-0.5">
                      {order.items.map((item, idx) => {
                        if (item.type === 'digital' && item.downloadToken) {
                          const downloadUrl = typeof window !== 'undefined'
                            ? `${window.location.origin}/api/downloads/${item.downloadToken}`
                            : `/api/downloads/${item.downloadToken}`;
                          return (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 p-1 bg-white border border-slate-200 rounded text-[9px] print:text-[7px]">
                              <div className="font-black text-slate-900 flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-mono text-[8px]">{idx + 1}</span>
                                <span>{item.title}</span>
                              </div>
                              <span className="hidden print:inline font-mono text-[8px] text-blue-700 font-bold ltr text-left">
                                {downloadUrl}
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Order User Notes if any */}
              {userNotes && (
                <div className="border border-slate-900 p-2 rounded-lg space-y-0.5 bg-amber-50/15">
                  <div className="font-black text-slate-900 text-[9px] print:text-[7px] flex items-center gap-1">
                    <MessageSquare size={10} className="text-amber-700" />
                    <span>یادداشت خریدار:</span>
                  </div>
                  <div className="text-slate-700 leading-relaxed font-bold text-[9px] print:text-[7px]">{userNotes}</div>
                </div>
              )}

            </div>

            {/* Financial Calculations Card (Right) */}
            <div className={`${financialsColRight} border border-slate-900 rounded-lg overflow-hidden shadow-xs`}>
              <div className={`bg-slate-100 border-b border-slate-900 font-black text-slate-900 text-center ${sectionTitleClass}`}>
                ۵. محاسبات مالی فاکتور
              </div>
              <div className="divide-y divide-slate-200 text-[10px] print:text-[7px] print:leading-none">
                <div className="flex justify-between p-1.5 font-bold">
                  <span className="text-slate-500">جمع قبل از تخفیف:</span>
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

                {!isAllDigital && (
                  <div className="flex justify-between p-1.5 font-bold">
                    <span className="text-slate-500">هزینه بسته‌بندی/ارسال:</span>
                    <span className="font-mono text-slate-950">
                      {shippingCost === 0 ? 'رایگان' : `${shippingCost.toLocaleString('fa-IR')}`}
                    </span>
                  </div>
                )}

                <div className="flex justify-between p-1.5 font-bold">
                  <span className="text-slate-500">مالیات (۱۰٪):</span>
                  <span className="font-mono text-slate-950">{calculatedTax.toLocaleString('fa-IR')}</span>
                </div>

                <div className="flex justify-between p-1.5 bg-slate-900 text-white font-black">
                  <span>جمع نهایی:</span>
                  <span className="font-mono">{finalAmount.toLocaleString('fa-IR')} تومان</span>
                </div>
              </div>
            </div>

          </div>

          {/* AMOUNT IN WORDS BAR */}
          <div className={`border border-slate-900 bg-slate-50/50 rounded-lg flex justify-between items-center gap-2 page-break-inside-avoid ${wordsBarClass}`}>
            <div>
              <span className="font-black text-slate-900">به حروف:</span>{' '}
              <span className="font-black text-blue-800">{finalAmountInWords} تومان</span>
            </div>
            <div className="flex items-center gap-1 text-[8px] print:text-[6px] text-slate-400 font-bold">
              <CheckCircle size={10} className="text-green-600" />
              <span>پرداخت قطعی شتاب</span>
            </div>
          </div>

          {/* WARRANTY, TERMS & QR CODE */}
          <div className={warrantyGridClass}>
            
            {/* Left/Middle terms */}
            <div className="space-y-1 col-span-2">
              {warrantyPolicy && (
                <>
                  <h4 className="font-black text-slate-900 text-[10px] print:text-[8px]">شرایط گارانتی و مرجوعی کالا:</h4>
                  <div className="leading-relaxed whitespace-pre-line font-medium text-slate-600">{warrantyPolicy}</div>
                </>
              )}
              {thankYouMessage && (
                <div className="font-bold text-slate-900 mt-1 pt-0.5 border-t border-slate-100">
                  پیام تشکر: {thankYouMessage}
                </div>
              )}
            </div>

            {/* Right QR Code verification */}
            {showQrCode && (
              <div className="flex flex-col items-center justify-center border-r border-slate-200 pr-2 gap-1 print:gap-0.5">
                <div className={`relative ${isHalfPage ? 'w-12 h-12' : 'w-18 h-18 print:w-14 print:h-14'} bg-white p-0.5 border border-slate-300 rounded-md`}>
                  <img
                    src={qrImageUrl}
                    alt="QR Code"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-[7px] text-center font-bold text-slate-400">تایید اصالت فاکتور</span>
              </div>
            )}

          </div>

          {/* SIGNATURES SECTION */}
          <div className={stampClass}>
            
            {/* Store Signature & Seal */}
            <div className="flex flex-col items-center">
              <div className="text-slate-500 mb-1">مهر و امضاء فروشگاه ({issuerName})</div>
              
              <div className={`${stampHeightClass} w-full flex items-center justify-center`}>
                {signatureType === 'digital' && (
                  <div className="relative inline-flex items-center justify-center p-2 border border-dashed border-blue-500/85 rounded-full text-blue-600 font-black text-[8px] transform -rotate-12 scale-100 select-none bg-white">
                    <div className="absolute inset-0.5 border border-blue-400 rounded-full opacity-50"></div>
                    <div className="flex flex-col items-center justify-center text-center px-3 py-1">
                      <span className="text-[6px] font-bold text-blue-500">مهر دیجیتال</span>
                      <span className="text-[10px] font-black tracking-wider my-0.5">{shopName}</span>
                      <span className="text-[6px] font-medium text-slate-400">{issuerName}</span>
                      <span className="text-[6px] font-black text-green-600 mt-0.5">تایید رسمی</span>
                    </div>
                  </div>
                )}

                {(signatureType === 'draw' || signatureType === 'upload') && signatureImage ? (
                  <div className={`relative ${isHalfPage ? 'h-10 w-24' : 'h-24 w-44'} flex items-center justify-center`}>
                    <img 
                      src={signatureImage} 
                      alt="Signature" 
                      className="max-h-full max-w-full object-contain mix-blend-multiply" 
                    />
                  </div>
                ) : (
                  signatureType !== 'none' && signatureType !== 'digital' && (
                    <div className="inline-block px-3 py-1.5 border border-dashed border-slate-200 bg-slate-50/50 rounded-lg text-[8px] text-slate-400">
                      در انتظار امضاء
                    </div>
                  )
                )}

                {signatureType === 'none' && (
                  <div className="inline-block px-4 py-2 border border-slate-200 bg-slate-50/50 rounded-xl text-[8px] text-slate-400">
                    محل مهر و امضای رسمی
                  </div>
                )}
              </div>
            </div>

            {/* Buyer Delivery Confirm */}
            <div className="flex flex-col items-center">
              <div className="text-slate-500 mb-1">امضاء و اثر انگشت خریدار</div>
              <div className={`${stampHeightClass} w-full flex items-center justify-center`}>
                <div className="inline-block px-4 py-2 border border-dashed border-slate-300 bg-slate-50/30 rounded-xl text-[8px] text-slate-400">
                  تحویل گیرنده: <span className="font-extrabold text-slate-600">{buyerName}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      );
    } else if (type === 'label') {
      return (
        <div 
          className="w-full bg-white text-slate-900 border-2 border-slate-900 rounded-xl flex flex-col justify-between shadow-lg print:shadow-none print:border-2 print:rounded-none print-card-avoid" 
          style={{ 
            minHeight: isHalfPage ? '190px' : '280px', 
            fontFamily: 'var(--font-vazirmatn), Vazir, sans-serif',
            WebkitPrintColorAdjust: 'exact',
            printColorAdjust: 'exact',
            padding: isHalfPage ? '8px' : '16px'
          }}
          dir="rtl"
        >
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-1.5">
            <h2 className={`font-black bg-slate-900 text-white rounded-md select-none ${isHalfPage ? 'text-[9px] px-1.5 py-0.5' : 'text-xs sm:text-sm px-3 py-1'}`}>
              برچسب ارسال مرسوله پستی
            </h2>
            <div className="font-mono text-left font-bold space-y-0.5 text-[8px] sm:text-xs">
              <div>سفارش: #{order.id}</div>
              <div>حمل‌کننده: {getShippingCarrierLabel(shippingCarrier)}</div>
            </div>
          </div>

          <div className={`grid grid-cols-1 gap-2 text-xs sm:text-[13px] ${isHalfPage ? 'py-1 text-[9px] print:text-[8px] gap-1' : 'py-3'}`}>
            {/* Receiver Info */}
            <div className={`bg-slate-100/80 rounded-lg border border-slate-300 relative ${isHalfPage ? 'p-1.5 space-y-0.5 rounded-md' : 'p-3 space-y-1'}`}>
              <span className={`absolute right-4 bg-slate-900 text-white rounded-md font-black ${isHalfPage ? 'right-2 -top-2 px-1 text-[6px]' : '-top-3 px-2 py-0.5 text-[8px]'}`}>
                گیرنده مرسوله (خریدار):
              </span>
              <div className={`font-black text-slate-900 ${isHalfPage ? 'text-xs' : 'text-sm'}`}>{buyerName}</div>
              <div><span className="font-bold text-slate-500">شماره تماس:</span> <span className="font-mono font-black">{buyerPhone || '-'}</span></div>
              <div><span className="font-bold text-slate-500">نشانی مقصد:</span> <span className="font-black text-slate-900">{buyerAddress}</span></div>
              <div className="flex gap-4">
                <div><span className="font-bold text-slate-500">شهر:</span> <span className="font-bold text-slate-900">{buyerState} / {buyerCity}</span></div>
                <div><span className="font-bold text-slate-500">کد پستی:</span> <span className="font-mono font-black">{buyerZipCode || '-'}</span></div>
              </div>
            </div>

            {/* Sender Info */}
            <div className={`border border-slate-900 rounded-lg relative ${isHalfPage ? 'p-1.5 space-y-0.5 rounded-md' : 'p-3 space-y-1'}`}>
              <span className={`absolute right-4 bg-slate-900 text-white rounded-md font-black ${isHalfPage ? 'right-2 -top-2 px-1 text-[6px]' : '-top-3 px-2 py-0.5 text-[8px]'}`}>
                فرستنده (فروشگاه):
              </span>
              <div className="font-black text-slate-900">{shopName}</div>
              <div><span className="font-bold text-slate-500">نشانی فرستنده:</span> <span className="font-semibold text-slate-700">{shopAddress || 'دفتر مرکزی انبار فروشگاه'}</span></div>
              <div><span className="font-bold text-slate-500">تلفن پشتیبانی:</span> <span className="font-mono font-bold text-slate-700">{shopPhone || '-'}</span></div>
            </div>
          </div>

          {/* Carrier Details Barcode Placeholder */}
          <div className="border-t border-slate-900 pt-1.5 flex justify-between items-center gap-2 text-[10px] font-bold">
            <div>
              <span className="text-slate-500 text-[8px]">کد رهگیری پستی:</span>{' '}
              <span className="font-mono font-black text-slate-900 bg-slate-50 px-1 py-0.5 border border-slate-200 rounded text-[9px]">
                {shippingTrackingCode || 'نیاز به درج توسط پست'}
              </span>
            </div>
            {shippingTrackingCode ? (
              <div className="scale-[0.6] sm:scale-[0.8] origin-right">
                <Barcode value={shippingTrackingCode} height={20} width={1.0} showText={false} />
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
    <div className={`min-h-screen bg-slate-50 dark:bg-[#0b0f19] flex flex-col print:block ${isCustomer ? '' : 'lg:flex-row'}`}>
      {isCustomer ? (
        <div className="print:hidden sticky top-0 z-20 bg-white dark:bg-[#121a2a] border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
          <div className="max-w-[850px] mx-auto flex items-center justify-between gap-3">
            <Link
              href={`/profile/orders/${order.fullId}`}
              className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
            >
              <ArrowRight size={15} />
              <span>بازگشت به جزئیات سفارش</span>
            </Link>
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-sm transition-all"
            >
              <Printer size={15} />
              <span>چاپ فاکتور</span>
            </button>
          </div>
        </div>
      ) : (
      /* ----------------- LEFT SIDEBAR: INTERACTIVE CONTROL PANEL (HIDDEN ON PRINT) ----------------- */
      <div className="w-full lg:w-[420px] bg-white dark:bg-[#121a2a] border-b lg:border-b-0 lg:border-l border-slate-200 dark:border-slate-800 p-5 flex-shrink-0 print:hidden h-auto lg:h-screen overflow-y-auto sticky top-0 select-none shadow-xl z-10 transition-colors duration-300">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Link 
            href="/admin/orders"
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          >
            <ArrowRight size={15} />
            <span>بازگشت به سفارش‌ها</span>
          </Link>
          <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-extrabold text-sm">
            <Settings size={16} />
            <span>تنظیمات چاپ فاکتور</span>
          </div>
        </div>

        {/* PRINT ACTIONS BUTTONS */}
        <div className="mb-6 space-y-2">
          <div className="space-y-2.5">
            {!isAllDigital ? (
              <>
                <button
                  onClick={() => {
                    setPrintMode('both');
                    setTimeout(() => window.print(), 100);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
                >
                  <Printer size={16} />
                  <span>چاپ فاکتور و برچسب با هم</span>
                </button>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setPrintMode('invoice');
                      setTimeout(() => window.print(), 100);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-200/50 dark:border-slate-750"
                  >
                    <FileText size={14} />
                    <span>فقط چاپ فاکتور</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      setPrintMode('label');
                      setTimeout(() => window.print(), 100);
                    }}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-755 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold transition-all border border-slate-200/50 dark:border-slate-750"
                  >
                    <Truck size={14} />
                    <span>فقط چاپ برچسب</span>
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => {
                  setPrintMode('invoice');
                  setTimeout(() => window.print(), 100);
                }}
                className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white rounded-xl text-sm font-black shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] transition-all"
              >
                <Printer size={16} />
                <span>چاپ فاکتور فروش دانلودی</span>
              </button>
            )}
          </div>
          <p className="text-[10px] text-center text-slate-400 mt-2">
            {!isAllDigital 
              ? 'می‌توانید فاکتور و برچسب پستی را همزمان یا به صورت جداگانه پرینت بگیرید.'
              : 'این سفارش شامل محصولات دانلودی است و فاقد برچسب ارسال پستی می‌باشد.'}
          </p>
        </div>

        {/* ACCORDION MODULES */}
        <div className="space-y-3">
          
          {/* MODULE 1: LAYOUT & VISIBILITY */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('layout')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <Store size={14} className="text-slate-400" />
                <span>طرح و قالب کلی فاکتور</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'layout' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'layout' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-4 text-xs">
                {/* Invoice Type */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500">نوع قالب فاکتور:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setInvoiceType('formal')}
                      className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                        invoiceType === 'formal' 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      فاکتور رسمی مالیاتی
                    </button>
                    <button
                      onClick={() => setInvoiceType('standard')}
                      className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                        invoiceType === 'standard' 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      فاکتور فروش ساده
                    </button>
                  </div>
                </div>

                {/* Paper Size */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <label className="font-bold text-slate-500">سایز کاغذ چاپ:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setPageSize('A4')}
                      className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                        pageSize === 'A4' 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      کاغذ A4
                    </button>
                    <button
                      onClick={() => {
                        setPageSize('A5');
                        setA4Layout('single');
                      }}
                      className={`py-2 px-3 rounded-lg border text-center font-bold transition-all ${
                        pageSize === 'A5' 
                          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      کاغذ A5
                    </button>
                  </div>
                </div>

                {/* A4 Layout Grid Options */}
                {pageSize === 'A4' && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                    <label className="font-bold text-slate-500">چیدمان صفحه (مخصوص A4):</label>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setA4Layout('single')}
                        className={`py-2 px-3 rounded-lg border text-right font-bold transition-all text-xs flex items-center justify-between ${
                          a4Layout === 'single' 
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>هر سند یک صفحه مجزا (تمام صفحه)</span>
                        <span className="text-[10px] text-slate-400">۱ سند</span>
                      </button>
                      <button
                        onClick={() => setA4Layout('two-portrait')}
                        className={`py-2 px-3 rounded-lg border text-right font-bold transition-all text-xs flex items-center justify-between ${
                          a4Layout === 'two-portrait' 
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                        title="مناسب برای چاپ فاکتور و برچسب پستی در یک صفحه"
                      >
                        <span>دو سند در یک صفحه (عمودی / روی هم)</span>
                        <span className="text-[10px] text-slate-400">۲ سند</span>
                      </button>
                      <button
                        onClick={() => setA4Layout('two-landscape')}
                        className={`py-2 px-3 rounded-lg border text-right font-bold transition-all text-xs flex items-center justify-between ${
                          a4Layout === 'two-landscape' 
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400' 
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>دو سند در یک صفحه (افقی / بغل هم)</span>
                        <span className="text-[10px] text-slate-400">۲ سند</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Visibility Toggles */}
                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <label className="font-bold text-slate-500">نمایش بخش‌ها در فاکتور:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={showLogo}
                        onChange={(e) => setShowLogo(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>لوگو فروشگاه</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={showBarcode}
                        onChange={(e) => setShowBarcode(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>بارکد سفارش</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={showQrCode}
                        onChange={(e) => setShowQrCode(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <span>QR Code فاکتور</span>
                    </label>
                    {!isAllDigital && (
                      <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-600 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={showShippingLabel}
                          onChange={(e) => setShowShippingLabel(e.target.checked)}
                          className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-4 w-4"
                        />
                        <span>برچسب پستی ارسال</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* MODULE 2: SELLER DETAILS */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('seller')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <Store size={14} className="text-slate-400" />
                <span>۱. مشخصات فروشنده (فروشگاه)</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'seller' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'seller' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">نام فروشگاه:</label>
                    <input
                      type="text"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">شماره تلفن:</label>
                    <input
                      type="text"
                      value={shopPhone}
                      onChange={(e) => setShopPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500 font-sans">شماره ثبت / شناسه ملی:</label>
                    <input
                      type="text"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                      placeholder="شناسه ملی ۱۱ رقمی"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">کد اقتصادی:</label>
                    <input
                      type="text"
                      value={economicCode}
                      onChange={(e) => setEconomicCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                      placeholder="کد اقتصادی ۱۲ رقمی"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">نشانی فروشنده:</label>
                  <textarea
                    rows={2}
                    value={shopAddress}
                    onChange={(e) => setShopAddress(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-semibold resize-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">ایمیل پشتیبانی:</label>
                  <input
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>

          {/* MODULE 3: BUYER DETAILS */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('buyer')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <span>۲. مشخصات خریدار (مشتری)</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'buyer' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'buyer' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">نام و نام خانوادگی:</label>
                    <input
                      type="text"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-semibold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">تلفن مشتری:</label>
                    <input
                      type="text"
                      value={buyerPhone}
                      onChange={(e) => setBuyerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                    />
                  </div>
                </div>

                {!isAllDigital ? (
                  <>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">استان:</label>
                        <input
                          type="text"
                          value={buyerState}
                          onChange={(e) => setBuyerState(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">شهر:</label>
                        <input
                          type="text"
                          value={buyerCity}
                          onChange={(e) => setBuyerCity(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-semibold"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-500">کد پستی:</label>
                        <input
                          type="text"
                          value={buyerZipCode}
                          onChange={(e) => setBuyerZipCode(e.target.value)}
                          className="w-full px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">نشانی کامل تحویل:</label>
                      <textarea
                        rows={2}
                        value={buyerAddress}
                        onChange={(e) => setBuyerAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 transition-all font-semibold resize-none"
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg text-blue-700 dark:text-blue-400 font-semibold text-[11px]">
                    این سفارش شامل محصولات دانلودی است و نیاز به آدرس پستی ندارد. تحویل به صورت آنی و دیجیتال انجام می‌شود.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODULE 4: ORDER & PAYMENT INFO */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('payment')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <CreditCard size={14} className="text-slate-400" />
                <span>۳. جزئیات پرداخت و سفارش</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'payment' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'payment' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-3.5 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">روش پرداخت:</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="online">درگاه پرداخت اینترنتی</option>
                      <option value="card">کارت به کارت</option>
                      <option value="cod">پرداخت در محل (کارتخوان)</option>
                      <option value="wallet">کیف پول الکترونیک</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">وضعیت پرداخت:</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                    >
                      <option value="paid">پرداخت شده / موفق</option>
                      <option value="pending">در انتظار پرداخت</option>
                      <option value="failed">ناموفق / لغو شده</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">کد پیگیری تراکنش بانکی (پرداخت):</label>
                  <input
                    type="text"
                    value={paymentTrackingCode}
                    onChange={(e) => setPaymentTrackingCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-center"
                    placeholder="مانند: ۱۰۲۹۳۸۴۷۵۶"
                  />
                </div>
              </div>
            )}
          </div>

          {/* MODULE 5: SHIPPING INFO */}
          {!isAllDigital && (
            <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
              <button
                onClick={() => toggleAccordion('shipping')}
                className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Truck size={14} className="text-slate-400" />
                  <span>۴. اطلاعات ارسال مرسوله</span>
                </div>
                <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'shipping' ? 'rotate-180' : ''}`} />
              </button>
              
              {activeAccordion === 'shipping' && (
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-3.5 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">روش ارسال:</label>
                      <select
                        value={shippingCarrier}
                        onChange={(e) => setShippingCarrier(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                      >
                        <option value="post">پست پیشتاز</option>
                        <option value="peyk">پیک موتوری شهری</option>
                        <option value="tipax">تیپاکس (پس‌کرایه)</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-500">تاریخ تخمینی تحویل:</label>
                      <input
                        type="text"
                        value={estDeliveryDate}
                        onChange={(e) => setEstDeliveryDate(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">کد رهگیری مرسوله پستی:</label>
                    <input
                      type="text"
                      value={shippingTrackingCode}
                      onChange={(e) => setShippingTrackingCode(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-center"
                      placeholder="مثال: ۱۲۳۴۵۶۷۸۹۰۱۲۳۴۵۶۷۸۹۰۱۲۳"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODULE 6: FINANCIAL ADJUSTMENTS */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('financials')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-slate-400" />
                <span>۵. تنظیمات و تعدیلات مالی</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'financials' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'financials' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">هزینه بسته‌بندی و ارسال (تومان):</label>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono font-bold"
                  />
                </div>

                <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-850">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-500">مالیات بر ارزش افزوده (۱۰٪):</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isCalculatedTax10}
                        onChange={(e) => setIsCalculatedTax10(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 dark:bg-slate-850 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:left-0.5 rtl:peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      <span className="mr-2 text-[10px] font-bold text-slate-400">محاسبه خودکار</span>
                    </label>
                  </div>

                  {!isCalculatedTax10 && (
                    <div className="space-y-1">
                      <label className="font-semibold text-slate-400">مبلغ مالیات سفارشی (تومان):</label>
                      <input
                        type="number"
                        value={taxAmount}
                        onChange={(e) => setTaxAmount(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-mono font-bold"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* MODULE 7: SIGNATURES AND STAMP */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('signature')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <PenTool size={14} className="text-slate-400" />
                <span>تنظیم مهر و امضای فروشنده</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'signature' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'signature' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-4 text-xs">
                
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">نوع امضاء فروشگاه:</label>
                  <select
                    value={signatureType}
                    onChange={(e) => {
                      setSignatureType(e.target.value as any);
                      if (e.target.value === 'digital') {
                        setSignatureImage(null);
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="none">بدون امضاء و مهر</option>
                    <option value="digital">مهر دیجیتال پیش‌فرض سیستمی</option>
                    <option value="draw">ترسیم امضاء جدید روی صفحه</option>
                    <option value="upload">آپلود عکس فیزیکی مهر/امضاء</option>
                  </select>
                </div>

                {signatureType !== 'none' && (
                  <div className="space-y-1">
                    <label className="font-bold text-slate-500">نام صادرکننده فاکتور / سمت:</label>
                    <input
                      type="text"
                      value={issuerName}
                      onChange={(e) => setIssuerName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold"
                      placeholder="مانند: علی تاجیک / مدیریت انبار"
                    />
                  </div>
                )}

                {/* CANVAS DRAWING PAD */}
                {signatureType === 'draw' && (
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-500">قلم ترسیم امضاء:</span>
                      <button
                        onClick={clearCanvas}
                        className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 font-black"
                      >
                        <Trash2 size={12} />
                        <span>پاک کردن بوم</span>
                      </button>
                    </div>
                    
                    <div className="relative border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 overflow-hidden cursor-crosshair">
                      <canvas
                        ref={canvasRef}
                        width={300}
                        height={130}
                        className="w-full block bg-white"
                      />
                    </div>
                    <p className="text-[9px] text-slate-400">
                      با لمس یا کلیک روی کادر فوق، امضای خود را ترسیم نمایید. امضا به صورت آنی روی فاکتور منعکس می‌گردد.
                    </p>
                  </div>
                )}

                {/* IMAGE UPLOAD FILE INPUT */}
                {signatureType === 'upload' && (
                  <div className="space-y-2 border-t border-slate-100 dark:border-slate-850 pt-3">
                    <span className="font-bold text-slate-500">انتخاب عکس مهر یا امضاء:</span>
                    <label className="w-full border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center py-4 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors">
                      <Upload size={18} className="text-slate-400 mb-1" />
                      <span className="text-[10px] font-bold text-slate-500">انتخاب فایل تصویر</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/jpg, image/webp"
                        onChange={handleSignatureUpload}
                        className="hidden"
                      />
                    </label>
                    {signatureImage && (
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2">
                        <span className="text-[10px] text-green-600 flex items-center gap-1 font-bold">
                          <Check size={12} /> تصویر بارگذاری شد
                        </span>
                        <button
                          onClick={() => setSignatureImage(null)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* MODULE 8: WARRANTY & CUSTOM TEXTS */}
          <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-[#152136]/50">
            <button
              onClick={() => toggleAccordion('texts')}
              className="w-full flex items-center justify-between p-4 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#152136] transition-all"
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="text-slate-400" />
                <span>پیام تشکر و قوانین فاکتور</span>
              </div>
              <ChevronDown size={14} className={`transform transition-transform ${activeAccordion === 'texts' ? 'rotate-180' : ''}`} />
            </button>
            
            {activeAccordion === 'texts' && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-[#121a2a] space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500">یادداشت سفارش خریدار:</label>
                  <textarea
                    rows={2}
                    value={userNotes}
                    onChange={(e) => setUserNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold resize-none"
                    placeholder="توضیحات خاص سفارش..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">متن گارانتی و مرجوعی کالا:</label>
                  <textarea
                    rows={4}
                    value={warrantyPolicy}
                    onChange={(e) => setWarrantyPolicy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-500">متن پیام تشکر از خرید:</label>
                  <textarea
                    rows={2}
                    value={thankYouMessage}
                    onChange={(e) => setThankYouMessage(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 font-semibold resize-none"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
      )}

      {/* ----------------- RIGHT SIDE: BEAUTIFUL PRINT-READY LIVE INVOICE ----------------- */}
      <div className="flex-grow p-4 sm:p-8 md:p-12 overflow-y-auto h-auto lg:h-screen print:h-auto print:p-0 print:overflow-visible print:bg-white bg-slate-200/55 dark:bg-[#0f1422]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            @page {
              size: ${pageSize === 'A5' ? 'A5 portrait' : a4Layout === 'two-landscape' ? 'A4 landscape' : 'A4 portrait'};
              margin: ${pageSize === 'A5' ? '5mm 5mm' : '5mm 6mm'} !important;
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
            body, html, body * {
              font-family: var(--font-vazirmatn), Vazir, 'Vazirmatn', sans-serif !important;
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

        <div className="max-w-[850px] mx-auto print:max-w-full">
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
    </div>
  );
}
