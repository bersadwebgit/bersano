// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  ShoppingCart, Search, Eye, CheckCircle, XCircle, Clock, Truck, Package, 
  TrendingUp, User, MapPin, CreditCard, AlertTriangle, Printer, Calendar, 
  DollarSign, MessageSquare, Filter, ArrowUpDown, ChevronDown, ChevronUp, 
  RefreshCw, FileText, Activity, Award, Send, Check, X, ChevronLeft, ChevronRight, Copy,
  Sparkles, Loader2, AlertCircle
} from 'lucide-react';

interface Order {
  id: string;
  status: string;
  shippingStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  phone: string | null;
  userNotes: string | null;
  adminNotes: string | null;
  shippingCarrier: string | null;
  shippingTrackingCode: string | null;
  shippingCost: number;
  taxAmount: number;
  trackingLink: string | null;
  returnReason: string | null;
  returnStatus: string;
  refundAmount: number;
  refundMethod: string | null;
  refundDate: string | null;
  statusTimeline: string | null;
  cardToCardReceipt: string | null;
  cardToCardCode: string | null;
  cardToCardSenderCard: string | null;
  cardToCardTime: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    phone: string | null;
  };
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    product: {
      id: string;
      title: string;
      imageUrl: string | null;
      stock: number;
    };
    variant: {
      id: string;
      name: string;
      stock: number;
    } | null;
  }>;
}

interface Summary {
  totalCount: number;
  newToday: number;
  pendingCount: number;
  shippingCount: number;
  returnedCount: number;
  revenueToday: number;
}

interface AlertItem {
  id: string;
  type: 'warning' | 'danger' | 'info';
  title: string;
  message: string;
  count: number;
}

interface BestSeller {
  id: string;
  title: string;
  quantity: number;
  revenue: number;
}

interface TopCustomer {
  id: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
}

interface ShippingPerformance {
  name: string;
  count: number;
  revenue: number;
}

interface Reports {
  dailyRevenue: Array<{ date: string; revenue: number; count: number }>;
  bestSellers: BestSeller[];
  topCustomers: TopCustomer[];
  shippingPerformance: ShippingPerformance[];
  averageOrderValue: number;
  cancelReturnRate: number;
}

export default function AdminOrdersDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'reports' | 'alerts'>('orders');
  
  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [pagination, setPagination] = useState({ total: 0, pages: 1, page: 1, limit: 10 });
  const [summary, setSummary] = useState<Summary>({ totalCount: 0, newToday: 0, pendingCount: 0, shippingCount: 0, returnedCount: 0, revenueToday: 0 });
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [reports, setReports] = useState<Reports>({
    dailyRevenue: [],
    bestSellers: [],
    topCustomers: [],
    shippingPerformance: [],
    averageOrderValue: 0,
    cancelReturnRate: 0
  });

  // UI State
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filters State
  const [search, setSearch] = useState('');
  const [shippingStatus, setShippingStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [city, setCity] = useState('');
  const [returnStatus, setReturnStatus] = useState('');
  const [timeframe, setTimeframe] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Batch & Quick Printing States
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [aiResponse, setAiResponse] = useState<{ success: boolean; explanation: string } | null>(null);
  const [aiPreviewData, setAiPreviewData] = useState<{
    explanation: string;
    action: string;
    printMode?: string;
    targets: Array<{
      id: string;
      shortId: string;
      customerName: string;
      customerPhone: string;
      currentStatus: string;
      proposedStatus: string;
      currentShippingStatus: string;
      proposedShippingStatus: string;
      currentPaymentStatus: string;
      proposedPaymentStatus: string;
      finalAmount: number;
    }>;
    warnings?: string[];
    rawResult: any;
  } | null>(null);
  const [isPrintingLabel, setIsPrintingLabel] = useState<string | null>(null);

  const handleQuickPrintLabel = (orderId: string) => {
    setIsPrintingLabel(orderId);
    
    const existingIframe = document.getElementById(`print-iframe-${orderId}`);
    if (existingIframe) {
      document.body.removeChild(existingIframe);
    }

    const iframe = document.createElement('iframe');
    iframe.id = `print-iframe-${orderId}`;
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.src = `/orders/${orderId}/invoice?print=label`;
    
    document.body.appendChild(iframe);
    
    iframe.onload = () => {
      setTimeout(() => {
        setIsPrintingLabel(null);
      }, 3000);
    };

    setTimeout(() => {
      setIsPrintingLabel(null);
      const el = document.getElementById(`print-iframe-${orderId}`);
      if (el) {
        document.body.removeChild(el);
      }
    }, 12000);
  };

  const handleBatchStatusChange = async (newStatus: string) => {
    if (selectedOrderIds.length === 0) return;
    setIsUpdating(true);
    let successCount = 0;
    try {
      for (const orderId of selectedOrderIds) {
        const res = await fetch(`/api/admin/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) successCount++;
      }
      fetchDashboardData();
      setSelectedOrderIds([]);
      setSuccessMessage(`وضعیت ${successCount} سفارش با موفقیت به '${newStatus === 'processing' ? 'آماده‌سازی' : 'ارسال شده'}' تغییر یافت.`);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (e) {
      console.error(e);
      setErrorMessage('خطا در بروزرسانی گروهی وضعیت‌ها');
    } finally {
      setIsUpdating(false);
    }
  };

  // Detail Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [shopSettings, setShopSettings] = useState<any>(null);
  const [isRegisteringTipax, setIsRegisteringTipax] = useState(false);
  const [modalTab, setModalTab] = useState<'general' | 'items' | 'timeline' | 'shipping' | 'return'>('general');
  
  // Quick Actions / Forms State inside Modal
  const [formStatus, setFormStatus] = useState('');
  const [formShippingStatus, setFormShippingStatus] = useState('');
  const [formPaymentStatus, setFormPaymentStatus] = useState('');
  const [formAdminNotes, setFormAdminNotes] = useState('');
  const [formMessageToCustomer, setFormMessageToCustomer] = useState('');
  const [formCarrier, setFormCarrier] = useState('');
  const [formTrackingCode, setFormTrackingCode] = useState('');
  const [formTrackingLink, setFormTrackingLink] = useState('');
  const [formShippingCost, setFormShippingCost] = useState(0);
  const [formTaxAmount, setFormTaxAmount] = useState(0);
  
  // Return Form State
  const [formReturnStatus, setFormReturnStatus] = useState('');
  const [formReturnReason, setFormReturnReason] = useState('');
  const [formRefundAmount, setFormRefundAmount] = useState(0);
  const [formRefundMethod, setFormRefundMethod] = useState('');

  // Print Invoice ref
  const printRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async (showLoading = true) => {
    if (showLoading === true || typeof showLoading !== 'boolean') {
      setLoading(true);
    }
    try {
      const queryParams = new URLSearchParams({
        search,
        shippingStatus,
        paymentStatus,
        paymentMethod,
        city,
        returnStatus,
        timeframe,
        sort,
        page: page.toString(),
        limit: limit.toString()
      });

      const res = await fetch(`/api/admin/orders?${queryParams.toString()}`);
      if (!res.ok) throw new Error('خطا در دریافت اطلاعات سفارشات');
      
      const data = await res.json();
      setOrders(data.orders || []);
      setPagination(data.pagination || { total: 0, pages: 1, page: 1, limit: 10 });
      setSummary(data.summary || { totalCount: 0, newToday: 0, pendingCount: 0, shippingCount: 0, returnedCount: 0, revenueToday: 0 });
      setAlerts(data.alerts || []);
      setReports(data.reports || {
        dailyRevenue: [],
        bestSellers: [],
        topCustomers: [],
        shippingPerformance: [],
        averageOrderValue: 0,
        cancelReturnRate: 0
      });

      // If an order ID exists in URL, let's open it
      const urlParams = new URLSearchParams(window.location.search);
      const orderIdToOpen = urlParams.get('orderId');
      if (orderIdToOpen && !selectedOrder) {
        const orderToOpen = data.orders.find((o: Order) => o.id === orderIdToOpen);
        if (orderToOpen) {
          handleOpenModal(orderToOpen);
        }
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResponse(null);
    setAiPreviewData(null);

    try {
      const res = await fetch('/api/admin/orders/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          preview: true
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در ارتباط با دستیار هوشمند رخ داد.');
      }

      if (data.success) {
        if (data.action === 'report') {
          setAiResponse({ success: true, explanation: data.explanation });
          setAiPrompt('');
        } else if (data.preview) {
          setAiPreviewData({
            explanation: data.explanation,
            action: data.action,
            printMode: data.printMode,
            targets: data.targets,
            warnings: data.warnings,
            rawResult: data.rawResult
          });
        }
      } else {
        setAiError(data.explanation || 'عملیات ناموفق بود. لطفاً پرامپت خود را واضح‌تر وارد کنید.');
      }
    } catch (err: any) {
      setAiError(err.message || 'خطای ارتباط با سرور.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiExecute = async () => {
    if (!aiPreviewData) return;
    setAiLoading(true);
    setAiError('');
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/admin/orders/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          execute: true,
          rawResult: aiPreviewData.rawResult
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در ثبت نهایی تغییرات رخ داد.');
      }

      if (data.success) {
        setAiResponse({ success: true, explanation: data.explanation });
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 5000);
        
        if (data.action === 'print_invoice' && data.targetOrderIds && data.targetOrderIds.length > 0) {
          window.open(`/admin/orders/print-batch?ids=${data.targetOrderIds.join(',')}&mode=${data.printMode || 'invoice'}`, '_blank');
        }

        setAiPreviewData(null);
        setAiPrompt('');
        fetchDashboardData();
      } else {
        setAiError(data.explanation || 'ثبت نهایی تغییرات ناموفق بود.');
        setSaveStatus('error');
      }
    } catch (err: any) {
      setAiError(err.message || 'خطای ارتباط با سرور.');
      setSaveStatus('error');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const intervalId = setInterval(() => {
      if (!document.hidden) {
        fetchDashboardData(false);
      }
    }, 15000);

    return () => clearInterval(intervalId);
  }, [search, shippingStatus, paymentStatus, paymentMethod, city, returnStatus, timeframe, sort, page, limit]);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setShopSettings(data.settings);
        }
      } catch (e) {
        console.error('Error fetching settings in orders:', e);
      }
    };
    fetchSettings();
  }, []);

  const handleRegisterTipax = async () => {
    if (!selectedOrder) return;
    setIsRegisteringTipax(true);
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/tipax`, {
        method: 'POST',
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'مرسوله با موفقیت در تیپاکس ثبت شد.');
        
        // Update local form states
        setFormCarrier('Tipax');
        setFormTrackingCode(data.trackingCode);
        setFormTrackingLink(`https://tipaxco.com/tracking?id=${data.trackingCode}`);
        setFormShippingStatus('shipped');
        
        // Refresh selectedOrder in place
        setSelectedOrder(prev => {
          if (!prev) return null;
          return {
            ...prev,
            shippingCarrier: 'Tipax',
            shippingTrackingCode: data.trackingCode,
            shippingStatus: 'shipped',
          };
        });

        // Also fetch updated orders list to sync table
        fetchDashboardData();
      } else {
        alert(data.error || 'خطا در ثبت مرسوله در تیپاکس');
      }
    } catch (e) {
      console.error('Error registering in Tipax:', e);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setIsRegisteringTipax(false);
    }
  };

  const handleOpenModal = (order: Order) => {
    setSelectedOrder(order);
    setModalTab('general');
    
    // Initialize forms
    setFormStatus(order.status);
    setFormShippingStatus(order.shippingStatus);
    setFormPaymentStatus(order.paymentStatus);
    setFormAdminNotes(order.adminNotes || '');
    setFormMessageToCustomer('');
    setFormCarrier(order.shippingCarrier || '');
    setFormTrackingCode(order.shippingTrackingCode || '');
    setFormTrackingLink(order.trackingLink || '');
    setFormShippingCost(order.shippingCost || 0);
    setFormTaxAmount(order.taxAmount || 0);
    
    setFormReturnStatus(order.returnStatus || 'none');
    setFormReturnReason(order.returnReason || '');
    setFormRefundAmount(order.refundAmount || 0);
    setFormRefundMethod(order.refundMethod || '');

    // Add orderId to URL history
    const url = new URL(window.location.href);
    url.searchParams.set('orderId', order.id);
    window.history.replaceState({}, '', url.toString());
  };

  const handleCloseModal = () => {
    setSelectedOrder(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('orderId');
    window.history.replaceState({}, '', url.toString());
  };

  const handleUpdateOrder = async (updatePayload: any, successMsg: string) => {
    if (!selectedOrder) return;
    setIsUpdating(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'خطا در ذخیره اطلاعات');
      }

      const updatedOrder = await res.json();
      
      // Update selected order details
      setSelectedOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          ...updatedOrder,
          // Merge user & items that are not returned by PUT directly but kept on client
          user: prev.user,
          items: prev.items
        };
      });

      // Keep form states in sync with DB updates
      if (updatedOrder.status !== undefined) setFormStatus(updatedOrder.status);
      if (updatedOrder.shippingStatus !== undefined) setFormShippingStatus(updatedOrder.shippingStatus);
      if (updatedOrder.paymentStatus !== undefined) setFormPaymentStatus(updatedOrder.paymentStatus);
      if (updatedOrder.adminNotes !== undefined) setFormAdminNotes(updatedOrder.adminNotes || '');
      if (updatedOrder.shippingCarrier !== undefined) setFormCarrier(updatedOrder.shippingCarrier || '');
      if (updatedOrder.shippingTrackingCode !== undefined) setFormTrackingCode(updatedOrder.shippingTrackingCode || '');
      if (updatedOrder.trackingLink !== undefined) setFormTrackingLink(updatedOrder.trackingLink || '');
      if (updatedOrder.shippingCost !== undefined) setFormShippingCost(updatedOrder.shippingCost || 0);
      if (updatedOrder.taxAmount !== undefined) setFormTaxAmount(updatedOrder.taxAmount || 0);
      if (updatedOrder.returnStatus !== undefined) setFormReturnStatus(updatedOrder.returnStatus || 'none');
      if (updatedOrder.returnReason !== undefined) setFormReturnReason(updatedOrder.returnReason || '');
      if (updatedOrder.refundAmount !== undefined) setFormRefundAmount(updatedOrder.refundAmount || 0);
      if (updatedOrder.refundMethod !== undefined) setFormRefundMethod(updatedOrder.refundMethod || '');

      // Refetch table data to sync lists & reports
      await fetchDashboardData();
      
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (error: any) {
      setErrorMessage(error.message || 'خطای سرور');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleQuickStatusChange = async (orderId: string, quickStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: quickStatus }),
      });
      if (res.ok) {
        fetchDashboardData();
        setSuccessMessage('وضعیت سفارش به سرعت تغییر یافت.');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert('خطا در ثبت وضعیت');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setShippingStatus('');
    setPaymentStatus('');
    setPaymentMethod('');
    setCity('');
    setReturnStatus('');
    setTimeframe('all');
    setSort('newest');
    setPage(1);
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper Badge Renderers
  const getShippingBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="px-3 py-1 bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><Activity size={13} /> جدید</span>;
      case 'processing':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><Clock size={13} /> آماده‌سازی</span>;
      case 'shipped':
        return <span className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><Truck size={13} /> ارسال شده</span>;
      case 'delivered':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><CheckCircle size={13} /> تحویل موفق</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs font-semibold w-fit">{status}</span>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><Clock size={13} /> در انتظار</span>;
      case 'paid':
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><CheckCircle size={13} /> پرداخت شده</span>;
      case 'failed':
        return <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><XCircle size={13} /> ناموفق</span>;
      case 'refunded':
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 rounded-full text-xs font-semibold flex items-center gap-1.5 w-fit"><RefreshCw size={13} /> استرداد وجه</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs font-semibold w-fit">{status}</span>;
    }
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'ثبت نشده';
    if (method === 'card') return <span className="flex items-center gap-1"><CreditCard size={14} className="text-blue-500" /> کارت به کارت / آنلاین</span>;
    if (method === 'wallet') return <span className="flex items-center gap-1"><Award size={14} className="text-purple-500" /> کیف پول</span>;
    if (method === 'cod') return <span className="flex items-center gap-1"><Truck size={14} className="text-amber-500" /> پرداخت در محل (COD)</span>;
    return method;
  };

  const getReturnStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-400 text-xs font-medium rounded-md border border-yellow-200 dark:border-yellow-900/40">بررسی مرجوعی</span>;
      case 'approved':
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 text-xs font-medium rounded-md border border-green-200 dark:border-green-900/40">مرجوعی تایید شده</span>;
      case 'rejected':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 text-xs font-medium rounded-md border border-red-200 dark:border-red-900/40">مرجوعی رد شده</span>;
      default:
        return null;
    }
  };

  const getRowClassName = (order: Order) => {
    const baseClass = "group transition-colors";
    
    if (order.paymentStatus === 'failed') {
      return `${baseClass} bg-red-50/15 hover:bg-red-50/30 dark:bg-red-950/5 dark:hover:bg-red-950/10`;
    }
    
    switch (order.shippingStatus) {
      case 'new':
        return `${baseClass} bg-sky-50/20 hover:bg-sky-50/40 dark:bg-sky-950/5 dark:hover:bg-sky-950/10`;
      case 'processing':
        return `${baseClass} bg-amber-50/20 hover:bg-amber-50/40 dark:bg-amber-950/5 dark:hover:bg-amber-950/10`;
      case 'shipped':
        return `${baseClass} bg-purple-50/15 hover:bg-purple-50/35 dark:bg-purple-950/5 dark:hover:bg-purple-950/10`;
      case 'delivered':
        return `${baseClass} bg-emerald-50/15 hover:bg-emerald-50/35 dark:bg-emerald-950/5 dark:hover:bg-emerald-950/10`;
      default:
        return `${baseClass} hover:bg-slate-50/50 dark:hover:bg-slate-850/40`;
    }
  };

  const getStickyTdClassName = (order: Order) => {
    const baseClass = "px-6 py-4 text-center sticky left-0 z-10 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.05)] transition-colors";
    
    if (order.paymentStatus === 'failed') {
      return `${baseClass} bg-[#fff8f8] dark:bg-[#1a1112] group-hover:bg-[#fecaca] dark:group-hover:bg-[#2d1215]`;
    }
    
    switch (order.shippingStatus) {
      case 'new':
        return `${baseClass} bg-[#f0f9ff] dark:bg-[#0f1b29] group-hover:bg-[#bae6fd] dark:group-hover:bg-[#1a2d3f]`;
      case 'processing':
        return `${baseClass} bg-[#fffbeb] dark:bg-[#1c1912] group-hover:bg-[#fef3c7] dark:group-hover:bg-[#2e2416]`;
      case 'shipped':
        return `${baseClass} bg-[#faf5ff] dark:bg-[#171221] group-hover:bg-[#e9d5ff] dark:group-hover:bg-[#261638]`;
      case 'delivered':
        return `${baseClass} bg-[#f0fdf4] dark:bg-[#101c15] group-hover:bg-[#bbf7d0] dark:group-hover:bg-[#182f20]`;
      default:
        return `${baseClass} bg-white dark:bg-[#0f172a] group-hover:bg-[#f8fafc] dark:group-hover:bg-[#1e293b]`;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 print:hidden select-none" dir="rtl">
      
      {/* Toast feedback messages */}
      {successMessage && (
        <div className="fixed top-4 left-4 z-50 bg-emerald-500 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3 animate-bounce">
          <CheckCircle size={22} />
          <span className="font-semibold text-sm">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-4 left-4 z-50 bg-red-500 text-white px-6 py-4 rounded-xl shadow-xl flex items-center gap-3">
          <XCircle size={22} />
          <span className="font-semibold text-sm">{errorMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <ShoppingCart className="w-6 h-6 text-blue-500" />
            مدیریت سفارشات فروشگاه
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
            پنل یکپارچه مدیریت فرآیندهای خرید، ارسال، مرجوعی، مالی و تحلیل سفارشات کاربران
          </p>
        </div>

        {/* Sync / Refresh Button */}
        <button 
          onClick={() => fetchDashboardData()}
          className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 shrink-0"
        >
          <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''}`} />
          به‌روزرسانی
        </button>
      </div>

      {/* Dashboard Sub-Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'orders' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <FileText size={18} />
          لیست سفارش‌ها و عملیات
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'reports' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <TrendingUp size={18} />
          گزارش‌ها و آنالیز رشد
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-6 py-3.5 text-sm font-bold border-b-2 transition-all flex items-center gap-2 relative ${
            activeTab === 'alerts' 
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' 
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          <AlertTriangle size={18} />
          اقدامات فوری و هشدارها
          {alerts.length > 0 && (
            <span className="absolute top-2 left-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center font-extrabold border border-white dark:border-slate-900">
              {alerts.length}
            </span>
          )}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Total Today */}
        {(() => {
          const isActive = timeframe === 'today' && shippingStatus === '' && paymentStatus === '' && returnStatus === '';
          return (
            <div 
              onClick={() => {
                if (isActive) {
                  setTimeframe('all');
                } else {
                  setActiveTab('orders');
                  setTimeframe('today');
                  setShippingStatus('');
                  setPaymentStatus('');
                  setPaymentMethod('');
                  setCity('');
                  setReturnStatus('');
                  setSearch('');
                  setPage(1);
                }
              }}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                isActive
                  ? 'border-blue-500 dark:border-blue-500 bg-blue-50/10 dark:bg-blue-950/10 shadow-blue-500/5 dark:shadow-blue-500/10 ring-1 ring-blue-500/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800/50 hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10'
              }`}
            >
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-gradient-to-tr from-slate-100/10 to-transparent dark:from-slate-800/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">سفارشات جدید امروز</span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight pt-0.5">
                      {summary.newToday}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-2xl transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-blue-500 text-white'
                      : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white'
                  }`}>
                    <ShoppingCart className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  کل سفارش‌های ثبت‌شده امروز
                </p>
              </div>
            </div>
          );
        })()}

        {/* Pending Processing */}
        {(() => {
          const isActive = shippingStatus === 'new';
          return (
            <div 
              onClick={() => {
                if (isActive) {
                  setShippingStatus('');
                } else {
                  setActiveTab('orders');
                  setShippingStatus('new');
                  setTimeframe('all');
                  setPaymentStatus('');
                  setPaymentMethod('');
                  setCity('');
                  setReturnStatus('');
                  setSearch('');
                  setPage(1);
                }
              }}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                isActive
                  ? 'border-amber-500 dark:border-amber-500 bg-amber-50/10 dark:bg-amber-950/10 shadow-amber-500/5 dark:shadow-amber-500/10 ring-1 ring-amber-500/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-800/50 hover:shadow-amber-500/5 dark:hover:shadow-amber-500/10'
              }`}
            >
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-gradient-to-tr from-slate-100/10 to-transparent dark:from-slate-800/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">در انتظار آماده‌سازی</span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight pt-0.5">
                      {summary.pendingCount}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-2xl transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-white'
                      : 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white'
                  }`}>
                    <Clock className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  سفارشات جدید منتظر بسته‌بندی
                </p>
              </div>
            </div>
          );
        })()}

        {/* Shipping */}
        {(() => {
          const isActive = shippingStatus === 'shipped';
          return (
            <div 
              onClick={() => {
                if (isActive) {
                  setShippingStatus('');
                } else {
                  setActiveTab('orders');
                  setShippingStatus('shipped');
                  setTimeframe('all');
                  setPaymentStatus('');
                  setPaymentMethod('');
                  setCity('');
                  setReturnStatus('');
                  setSearch('');
                  setPage(1);
                }
              }}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                isActive
                  ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-indigo-500/5 dark:shadow-indigo-500/10 ring-1 ring-indigo-500/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-800/50 hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10'
              }`}
            >
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-gradient-to-tr from-slate-100/10 to-transparent dark:from-slate-800/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">در حال ارسال</span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight pt-0.5">
                      {summary.shippingCount}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-2xl transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-indigo-500 text-white'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white'
                  }`}>
                    <Truck className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  سفارشات ارسالی به پست/پیک
                </p>
              </div>
            </div>
          );
        })()}

        {/* Returned / Cancelled */}
        {(() => {
          const isActive = returnStatus === 'pending';
          return (
            <div 
              onClick={() => {
                if (isActive) {
                  setReturnStatus('');
                } else {
                  setActiveTab('orders');
                  setReturnStatus('pending');
                  setTimeframe('all');
                  setShippingStatus('');
                  setPaymentStatus('');
                  setPaymentMethod('');
                  setSearch('');
                  setCity('');
                  setPage(1);
                }
              }}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                isActive
                  ? 'border-rose-500 dark:border-rose-500 bg-rose-50/10 dark:bg-rose-950/10 shadow-rose-500/5 dark:shadow-rose-500/10 ring-1 ring-rose-500/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-800/50 hover:shadow-rose-500/5 dark:hover:shadow-rose-500/10'
              }`}
            >
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-gradient-to-tr from-slate-100/10 to-transparent dark:from-slate-800/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">مرجوعی / لغو شده</span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight pt-0.5">
                      {summary.returnedCount}
                    </h3>
                  </div>
                  <div className={`p-3 rounded-2xl transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-rose-500 text-white'
                      : 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 group-hover:bg-rose-500 group-hover:text-white'
                  }`}>
                    <XCircle className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  سفارشات عودتی یا لغو شده
                </p>
              </div>
            </div>
          );
        })()}

        {/* Total revenue today */}
        {(() => {
          const isActive = timeframe === 'today' && paymentStatus === 'paid';
          return (
            <div 
              onClick={() => {
                if (isActive) {
                  setTimeframe('all');
                  setPaymentStatus('');
                } else {
                  setActiveTab('orders');
                  setTimeframe('today');
                  setPaymentStatus('paid');
                  setShippingStatus('');
                  setPaymentMethod('');
                  setReturnStatus('');
                  setSearch('');
                  setCity('');
                  setPage(1);
                }
              }}
              className={`bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border transition-all duration-300 relative overflow-hidden group flex flex-col justify-between cursor-pointer hover:-translate-y-1 ${
                isActive
                  ? 'border-emerald-500 dark:border-emerald-500 bg-emerald-50/10 dark:bg-emerald-950/10 shadow-emerald-500/5 dark:shadow-emerald-500/10 ring-1 ring-emerald-500/20'
                  : 'border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800/50 hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10'
              }`}
            >
              <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-gradient-to-tr from-slate-100/10 to-transparent dark:from-slate-800/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
              <div>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">درآمد فروش امروز</span>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight leading-tight pt-0.5">
                      {summary.revenueToday.toLocaleString()} <span className="text-xs font-normal text-slate-400">تومان</span>
                    </h3>
                  </div>
                  <div className={`p-3 rounded-2xl transition-all duration-300 shrink-0 ${
                    isActive
                      ? 'bg-emerald-500 text-white'
                      : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white'
                  }`}>
                    <TrendingUp className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                  از سفارشات موفق و پرداخت شده
                </p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* -------------------- TAB 1: ORDERS LIST -------------------- */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          {/* AI Prompt Control - Smart Assistant */}
          <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند سفارشات (کنترل با پرامپت)</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                    با نوشتن دستورهای متنی به زبان ساده، تمام بخش‌های سفارشات فروشگاه (تغییر وضعیت سفارش، پرداخت، ارسال، چاپ فاکتور و گزارش‌گیری پیشرفته) را به صورت هوشمند مدیریت کنید!
                  </p>
                </div>
              </div>
              <a
                href="/admin/agent"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-500 hover:to-pink-500 transition-all font-black text-xs shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-95 shrink-0"
              >
                <Sparkles size={13} className="animate-pulse text-pink-200" />
                <span>انتقال به حالت ایجنت یکپارچه ✨</span>
              </a>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="مثال: فاکتور مشتری علی تاجیک را چاپ کن یا وضعیت سفارش مشتری با موبایل 09123456789 به نهایی تغییر کنه..."
                  className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAiSubmit();
                    }
                  }}
                  disabled={aiLoading}
                />
                <button
                  type="button"
                  disabled={aiLoading || !aiPrompt.trim()}
                  onClick={handleAiSubmit}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0 border-0"
                >
                  {aiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      در حال پردازش...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      اعمال دستور
                    </>
                  )}
                </button>
              </div>

              {/* Suggestions */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center ml-1">پیشنهادها:</span>
                {[
                  'یک گزارش از وضعیت سفارشات بده',
                  'فاکتور مشتری علی تاجیک را چاپ کن',
                  'وضعیت سفارش مشتری با موبایل 09123456789 به نهایی تغییر کنه'
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setAiPrompt(sug)}
                    className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-xl transition-colors font-bold cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>

              {aiError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {/* AI Response Box (for reports/general info) */}
              {aiResponse && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 p-5 rounded-2xl space-y-3 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle className="w-3.5 h-3.5" />
                      </div>
                      پاسخ دستیار هوشمند
                    </div>
                    <button
                      onClick={() => setAiResponse(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                    {aiResponse.explanation}
                  </p>
                </div>
              )}

              {/* AI Confirmation Preview Box */}
              {aiPreviewData && (
                <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-4 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs">
                      <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                      {aiPreviewData.action === 'print_invoice'
                        ? `پیش‌نمایش و تایید نهایی چاپ ${aiPreviewData.printMode === 'label' ? 'رسید پستی' : aiPreviewData.printMode === 'both' ? 'فاکتور و رسید پستی' : 'فاکتور'}`
                        : 'پیش‌نمایش و تایید نهایی تغییرات هوشمند'}
                    </div>
                    <button
                      onClick={() => setAiPreviewData(null)}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                    {aiPreviewData.explanation}
                  </p>

                  {aiPreviewData.warnings && aiPreviewData.warnings.length > 0 && (
                    <div className="space-y-2">
                      {aiPreviewData.warnings.map((warning, idx) => (
                        <div key={idx} className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/20 rounded-2xl p-3.5 flex items-start gap-2.5 text-amber-800 dark:text-amber-400">
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400 animate-bounce" />
                          <p className="text-xs font-bold leading-relaxed">{warning}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Targets List */}
                  <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">لیست سفارشات هدف و مقادیر جدید:</span>
                    {aiPreviewData.targets.map((target) => (
                      <div key={target.id} className="flex flex-col md:flex-row md:items-center justify-between p-3.5 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/60 gap-3 text-xs font-bold">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
                            <ShoppingCart className="w-4 h-4" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="block text-slate-800 dark:text-slate-200">{target.customerName}</span>
                            <span className="block text-[9px] text-slate-400">شناسه سفارش: {target.shortId} | موبایل: {target.customerPhone}</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-left">
                          {/* Status Change */}
                          {target.currentStatus !== target.proposedStatus && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">وضعیت عمومی</span>
                              <span className="block text-slate-700 dark:text-slate-300">
                                <span className="line-through text-slate-400 text-[10px] ml-1">{target.currentStatus}</span>
                                <span className="text-purple-600 dark:text-purple-400 font-black">{target.proposedStatus}</span>
                              </span>
                            </div>
                          )}

                          {/* Shipping Status Change */}
                          {target.currentShippingStatus !== target.proposedShippingStatus && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">وضعیت ارسال</span>
                              <span className="block text-slate-700 dark:text-slate-300">
                                <span className="line-through text-slate-400 text-[10px] ml-1">{target.currentShippingStatus}</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-black">{target.proposedShippingStatus}</span>
                              </span>
                            </div>
                          )}

                          {/* Payment Status Change */}
                          {target.currentPaymentStatus !== target.proposedPaymentStatus && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">وضعیت پرداخت</span>
                              <span className="block text-slate-700 dark:text-slate-300">
                                <span className="line-through text-slate-400 text-[10px] ml-1">{target.currentPaymentStatus}</span>
                                <span className="text-emerald-600 dark:text-emerald-400 font-black">{target.proposedPaymentStatus}</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={handleAiExecute}
                      data-testid="save-status"
                      data-status-state={saveStatus}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2.5 rounded-xl font-black text-xs transition-all cursor-pointer border-0 flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {aiPreviewData.action === 'print_invoice' ? 'در حال آماده‌سازی برای چاپ...' : 'در حال اعمال تغییرات...'}
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          {aiPreviewData.action === 'print_invoice'
                            ? `تایید و چاپ ${aiPreviewData.printMode === 'label' ? 'رسید پستی' : aiPreviewData.printMode === 'both' ? 'فاکتور و رسید پستی' : 'فاکتور'}`
                            : 'تایید و اعمال نهایی تغییرات'}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={aiLoading}
                      onClick={() => setAiPreviewData(null)}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 px-4 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer border-0"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Main Search Input */}
              <div className="relative flex-1">
                <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="جستجو با شماره سفارش، نام مشتری، موبایل یا ایمیل..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-4 pr-11 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Toggle filters button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold border transition-all flex items-center gap-2 ${
                  showFilters || shippingStatus || paymentStatus || paymentMethod || city || returnStatus || timeframe !== 'all'
                    ? 'border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Filter size={16} />
                فیلترهای پیشرفته
                {(shippingStatus || paymentStatus || paymentMethod || city || returnStatus || timeframe !== 'all') && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </button>

              {/* Reset filter button */}
              {(search || shippingStatus || paymentStatus || paymentMethod || city || returnStatus || timeframe !== 'all' || sort !== 'newest') && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5"
                >
                  <X size={15} />
                  لغو فیلترها
                </button>
              )}
            </div>

            {/* Advanced Filters Drawer */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-100 dark:border-slate-850 animate-fadeIn">
                {/* Shipping Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">وضعیت ارسال مرسوله</label>
                  <select
                    value={shippingStatus}
                    onChange={(e) => setShippingStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">همه وضعیت‌های ارسال</option>
                    <option value="new">جدید (آماده نشده)</option>
                    <option value="processing">در حال پردازش (بسته‌بندی)</option>
                    <option value="shipped">ارسال شده (تحویل شرکت پست)</option>
                    <option value="delivered">تکمیل شده (تحویل مشتری)</option>
                  </select>
                </div>

                {/* Payment Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">وضعیت پرداخت</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">همه وضعیت‌های پرداخت</option>
                    <option value="pending">در انتظار پرداخت</option>
                    <option value="paid">پرداخت موفقیت‌آمیز</option>
                    <option value="failed">پرداخت ناموفق</option>
                    <option value="refunded">استرداد وجه شده</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">روش پرداخت</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">همه روش‌های پرداخت</option>
                    <option value="card">درگاه پرداخت / کارت</option>
                    <option value="wallet">کیف پول کاربری</option>
                    <option value="cod">پرداخت در محل</option>
                  </select>
                </div>

                {/* Return Status */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">درخواست‌های مرجوعی</label>
                  <select
                    value={returnStatus}
                    onChange={(e) => setReturnStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">همه سفارش‌ها</option>
                    <option value="pending">در انتظار بررسی مرجوعی</option>
                    <option value="approved">مرجوعی تایید شده</option>
                    <option value="rejected">مرجوعی رد شده</option>
                  </select>
                </div>

                {/* Timeframe Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">بازه زمانی ثبت</label>
                  <select
                    value={timeframe}
                    onChange={(e) => setTimeframe(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="all">کل تاریخچه فروشگاه</option>
                    <option value="today">امروز</option>
                    <option value="yesterday">دیروز</option>
                    <option value="last_7_days">۷ روز گذشته</option>
                    <option value="last_30_days">۳۰ روز گذشته</option>
                  </select>
                </div>

                {/* Sort Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">مرتب‌سازی بر اساس</label>
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="newest">جدیدترین‌ها</option>
                    <option value="oldest">قدیمی‌ترین‌ها</option>
                    <option value="highest_amount">بیشترین ارزش مالی</option>
                    <option value="lowest_amount">کمترین ارزش مالی</option>
                  </select>
                </div>

                {/* Delivery City */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">فیلتر شهر مقصد</label>
                  <input
                    type="text"
                    placeholder="مثال: تهران..."
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Orders Table Container */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-4 text-center w-12">
                      <input 
                        type="checkbox"
                        checked={orders.length > 0 && selectedOrderIds.length === orders.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedOrderIds(orders.map(o => o.id));
                          } else {
                            setSelectedOrderIds([]);
                          }
                        }}
                        className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4">شناسه سفارش</th>
                    <th className="px-6 py-4">مشتری</th>
                    <th className="px-6 py-4">تاریخ ثبت</th>
                    <th className="px-6 py-4">مبلغ نهایی</th>
                    <th className="px-6 py-4">اقلام</th>
                    <th className="px-6 py-4">وضعیت پرداخت</th>
                    <th className="px-6 py-4">وضعیت ارسال</th>
                    <th className="px-6 py-4">روش پرداخت</th>
                    <th className="px-6 py-4">شهر</th>
                    <th className="px-6 py-4">مرجوعی</th>
                    <th className="px-6 py-4 text-center sticky left-0 z-20 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 shadow-[4px_0_10px_-3px_rgba(0,0,0,0.05)]">عملیات مدیریت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-850 text-slate-700 dark:text-slate-300">
                  {loading ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-sm font-medium text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <RefreshCw size={24} className="animate-spin text-blue-500" />
                          در حال بارگذاری اطلاعات نهایی سفارشات...
                        </div>
                      </td>
                    </tr>
                  ) : orders.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-16 text-center text-sm font-medium text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Package size={36} className="text-slate-300 dark:text-slate-700" />
                          هیچ سفارشی با فیلترهای اعمال‌شده یافت نشد.
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id} className={getRowClassName(order)}>
                        {/* Checkbox */}
                        <td className="px-4 py-4 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrderIds(prev => [...prev, order.id]);
                              } else {
                                setSelectedOrderIds(prev => prev.filter(id => id !== order.id));
                              }
                            }}
                            className="rounded border-slate-350 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        
                        {/* Order ID */}
                        <td className="px-6 py-4 text-xs font-black text-slate-900 dark:text-white">
                          #{order.id.slice(-8).toUpperCase()}
                        </td>
                        
                        {/* Customer */}
                        <td className="px-6 py-4">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">{order.user.name || 'مشتری بدون نام'}</div>
                          <div className="text-[10px] text-slate-400 font-medium mt-0.5">{order.user.phone || order.user.email}</div>
                        </td>

                        {/* Order Date */}
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {new Date(order.createdAt).toLocaleDateString('fa-IR', {
                            year: 'numeric', month: '2-digit', day: '2-digit'
                          })}
                          <span className="block text-[10px] text-slate-400 font-normal mt-0.5">
                            {new Date(order.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>

                        {/* Amount */}
                        <td className="px-6 py-4 text-sm font-black text-slate-900 dark:text-white">
                          {order.finalAmount.toLocaleString()} <span className="text-[10px] font-normal text-slate-400">تومان</span>
                        </td>

                        {/* Number of Items */}
                        <td className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                          {order.items.reduce((sum, item) => sum + item.quantity, 0)} عدد
                        </td>

                        {/* Payment Status */}
                        <td className="px-6 py-4">
                          {getPaymentStatusBadge(order.paymentStatus)}
                        </td>

                        {/* Shipping Status */}
                        <td className="px-6 py-4">
                          {getShippingBadge(order.shippingStatus)}
                        </td>

                        {/* Payment Method */}
                        <td className="px-6 py-4 text-xs font-medium">
                          {getPaymentMethodLabel(order.paymentMethod)}
                        </td>

                        {/* Shipping City */}
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {order.city || '-'}
                        </td>

                        {/* Return indicator */}
                        <td className="px-6 py-4">
                          {getReturnStatusBadge(order.returnStatus)}
                        </td>

                        {/* Action buttons */}
                        <td className={getStickyTdClassName(order)}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenModal(order)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 rounded-lg transition-colors flex items-center justify-center"
                              title="بررسی کامل و مدیریت جزئیات"
                            >
                              <Eye size={16} />
                            </button>

                            {/* Quick Print Shipping Label */}
                            <button
                              onClick={() => handleQuickPrintLabel(order.id)}
                              disabled={isPrintingLabel === order.id}
                              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center ${
                                isPrintingLabel === order.id 
                                  ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' 
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30'
                              }`}
                              title="چاپ سریع برچسب ارسال پستی"
                            >
                              {isPrintingLabel === order.id ? (
                                <RefreshCw size={14} className="animate-spin text-emerald-500" />
                              ) : (
                                <Printer size={14} />
                              )}
                            </button>
                            
                            {/* Quick dispatch trigger if paid */}
                            {order.paymentStatus === 'paid' && order.shippingStatus === 'new' && (
                              <button
                                onClick={() => handleQuickStatusChange(order.id, 'processing')}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 rounded-lg transition-colors flex items-center justify-center"
                                title="تغییر سریع به آماده‌سازی"
                              >
                                <Clock size={16} />
                              </button>
                            )}

                            {order.shippingStatus === 'processing' && (
                              <button
                                onClick={() => handleQuickStatusChange(order.id, 'shipped')}
                                className="p-1.5 text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/30 rounded-lg transition-colors flex items-center justify-center"
                                title="تغییر سریع به ارسال شده"
                              >
                                <Truck size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {orders.length > 0 && (
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
                {/* Info */}
                <span className="font-medium text-slate-500 text-center sm:text-right">
                  نمایش سفارش {((page - 1) * pagination.limit) + 1} تا {Math.min(page * pagination.limit, pagination.total)} از کل {pagination.total} سفارش ثبت‌شده
                </span>

                {/* Limit selection & Pagination Controls */}
                <div className="flex flex-wrap items-center justify-center gap-6">
                  {/* Limit Selection */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-500">تعداد نمایش در صفحه:</span>
                    <select
                      value={limit}
                      onChange={(e) => {
                        setLimit(Number(e.target.value));
                        setPage(1); // Reset to page 1 on limit change
                      }}
                      className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-slate-700 dark:text-slate-300 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value={10}>۱۰ سفارش</option>
                      <option value={20}>۲۰ سفارش</option>
                      <option value={50}>۵۰ سفارش</option>
                      <option value={100}>۱۰۰ سفارش</option>
                    </select>
                  </div>

                  {/* Pagination Buttons */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg disabled:opacity-40 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="صفحه قبلی"
                      >
                        <ChevronRight size={16} />
                      </button>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        صفحه {page} از {pagination.pages}
                      </span>
                      <button
                        onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                        disabled={page === pagination.pages}
                        className="p-1.5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-lg disabled:opacity-40 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        title="صفحه بعدی"
                      >
                        <ChevronLeft size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------- TAB 2: REPORTS & ANALYTICS -------------------- */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Main reports cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* KPI 1 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                <DollarSign size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">میانگین ارزش هر سفارش (AOV)</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {Math.round(reports.averageOrderValue).toLocaleString()} <span className="text-xs font-normal text-slate-500">تومان</span>
                </h3>
              </div>
            </div>

            {/* KPI 2 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-red-500/10 rounded-xl text-red-600 dark:text-red-400">
                <XCircle size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">نرخ لغو و مرجوعی کل</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {reports.cancelReturnRate.toFixed(1)}%
                </h3>
              </div>
            </div>

            {/* KPI 3 */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="p-4 bg-green-500/10 rounded-xl text-green-600 dark:text-green-400">
                <Activity size={24} />
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block">تعداد سفارش کل پرداخت‌شده</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                  {orders.filter(o => o.paymentStatus === 'paid').length} <span className="text-xs font-normal text-slate-500">سفارش</span>
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily revenue chart (Pure CSS-driven bar chart!) */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={18} className="text-blue-500" />
                نمودار درآمد و تعداد فروش ۷ روز اخیر
              </h3>
              
              <div className="h-64 flex items-end gap-3 pt-6 border-b border-slate-100 dark:border-slate-800 pb-2">
                {reports.dailyRevenue.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-sm text-slate-400 font-medium">هیچ تراکنش موفقی ثبت نشده است</div>
                ) : (
                  reports.dailyRevenue.map((day, i) => {
                    const maxRev = Math.max(...reports.dailyRevenue.map(d => d.revenue), 1);
                    const percent = (day.revenue / maxRev) * 100;
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group cursor-pointer relative">
                        {/* Tooltip */}
                        <div className="absolute -top-12 bg-slate-900 text-white text-[10px] px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap text-center shadow-lg font-vazir">
                          <div>درآمد: {day.revenue.toLocaleString()} تومان</div>
                          <div>تعداد: {day.count} سفارش</div>
                        </div>

                        {/* Revenue Bar */}
                        <div 
                          style={{ height: `${percent}%`, minHeight: day.revenue > 0 ? '6px' : '0px' }}
                          className="w-full bg-gradient-to-t from-blue-600 to-sky-400 dark:from-blue-500 dark:to-sky-300 rounded-t-md hover:brightness-110 transition-all shadow-inner"
                        />
                        
                        {/* Date */}
                        <span className="text-[10px] font-bold text-slate-400 tracking-tight mt-1">{day.date}</span>
                      </div>
                    );
                  })
                )}
              </div>
              <p className="text-[10px] text-slate-400 text-center">نگه‌داشتن موس روی هر ستون جزئیات را نشان می‌دهد</p>
            </div>

            {/* Courier Carrier performance */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Truck size={18} className="text-purple-500" />
                تحلیل عملکرد شرکت‌های ارسال و توزیع
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {reports.shippingPerformance.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-12">هیچ فاکتور ارسالی ثبت نشده است.</p>
                ) : (
                  reports.shippingPerformance.map((perf, i) => (
                    <div key={i} className="py-3 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{perf.name}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">سفارشات ارسال‌شده</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{perf.count} مرسوله</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">درآمد ارسال: {perf.revenue.toLocaleString()} تومان</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products list */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award size={18} className="text-emerald-500" />
                پرفروش‌ترین و محبوب‌ترین محصولات
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {reports.bestSellers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-12">آماری در این بازه زمانی وجود ندارد.</p>
                ) : (
                  reports.bestSellers.map((prod, i) => (
                    <div key={i} className="py-3.5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white max-w-[250px] truncate">{prod.title}</h4>
                          <span className="text-[10px] text-slate-400 font-medium">آی‌دی: {prod.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{prod.quantity} عدد فروش رفته</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">ارزش فروش: {prod.revenue.toLocaleString()} تومان</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Top Purchasing Customers */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User size={18} className="text-blue-500" />
                بزرگترین مشتریان خریدار (باشگاه وفاداری)
              </h3>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {reports.topCustomers.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-12">هیچ خرید موفقی ثبت نشده است.</p>
                ) : (
                  reports.topCustomers.map((cust, i) => (
                    <div key={i} className="py-3.5 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                          {i + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{cust.name}</h4>
                          <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px] block">{cust.email}</span>
                        </div>
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{cust.orderCount} سفارش موفق</span>
                        <span className="block text-[10px] text-slate-400 mt-0.5">مجموع خرید: {cust.totalSpent.toLocaleString()} تومان</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- TAB 3: ALERTS AND ACTIONS -------------------- */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 p-5 rounded-2xl flex gap-4">
            <AlertTriangle className="text-amber-600 dark:text-amber-400 flex-shrink-0" size={24} />
            <div>
              <h3 className="text-sm font-bold text-amber-800 dark:text-amber-400">توجه: مدیریت هشدارهای جاری سیستم</h3>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 font-medium leading-relaxed">
                هشدارهای زیر به صورت اتوماتیک از تحلیل موجودی، زمان ثبت سفارشات و فرآیندهای مالی استخراج شده‌اند. رفع به موقع این اقدامات به بهبود رضایت مشتریان کمک شایانی می‌کند.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Urgent Alerts Feed */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity size={18} className="text-red-500" />
                لیست خطرات و اقدامات اصلاحی فوری
              </h3>

              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <CheckCircle size={36} className="text-emerald-500" />
                  <p className="text-sm font-bold">عالی! هیچ هشدار فعالی در سیستم وجود ندارد.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div 
                      key={alert.id}
                      className={`p-4 rounded-xl border flex justify-between items-start gap-3 ${
                        alert.type === 'danger' 
                          ? 'bg-red-50/50 border-red-100 dark:bg-red-950/10 dark:border-red-900/30' 
                          : alert.type === 'warning'
                          ? 'bg-amber-50/50 border-amber-100 dark:bg-amber-950/10 dark:border-amber-900/30'
                          : 'bg-blue-50/50 border-blue-100 dark:bg-blue-950/10 dark:border-blue-900/30'
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                          alert.type === 'danger' ? 'bg-red-500/10 text-red-600' : alert.type === 'warning' ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-600'
                        }`}>
                          <AlertTriangle size={16} />
                        </span>
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{alert.title}</h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{alert.message}</p>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => {
                          // Quick apply filter and go to orders tab
                          if (alert.id === 'unpaid_old') {
                            setPaymentStatus('pending');
                            setTimeframe('last_30_days');
                          } else if (alert.id === 'unsent_old') {
                            setPaymentStatus('paid');
                            setShippingStatus('new');
                          } else if (alert.id === 'failed_payments') {
                            setPaymentStatus('failed');
                          } else if (alert.id === 'unanswered_returns') {
                            setReturnStatus('pending');
                          }
                          setActiveTab('orders');
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-lg text-[10px] font-bold text-slate-700 dark:text-slate-300 transition-colors whitespace-nowrap shadow-sm"
                      >
                        بررسی و اقدام
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Out of stock alert panel */}
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Package size={18} className="text-red-500" />
                محصولات فاقد موجودی در سفارشات جاری
              </h3>

              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                محصولاتی که توسط مشتریان سفارش داده شده‌اند، اما در حال حاضر موجودی انبار آن‌ها صفر یا کمتر از تعداد سفارش است:
              </p>

              <div className="divide-y divide-slate-100 dark:divide-slate-850">
                {orders.length === 0 ? (
                  <p className="text-xs text-slate-400 py-8 text-center">اطلاعاتی در دسترس نیست.</p>
                ) : (
                  (() => {
                    const outOfStockItems: any[] = [];
                    orders.forEach(o => {
                      if (o.shippingStatus === 'new' || o.shippingStatus === 'processing') {
                        o.items.forEach(item => {
                          const stock = item.variant ? (item.variant.stock || 0) : (item.product?.stock || 0);
                          if (stock < item.quantity) {
                            outOfStockItems.push({
                              orderId: o.id,
                              title: item.product.title,
                              variantName: item.variant?.name || null,
                              ordered: item.quantity,
                              stock,
                            });
                          }
                        });
                      }
                    });

                    if (outOfStockItems.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-2">
                          <CheckCircle className="text-emerald-500" size={24} />
                          <p className="text-xs font-bold">هیچ کسری انبار برای سفارشات در حال آماده‌سازی وجود ندارد.</p>
                        </div>
                      );
                    }

                    return outOfStockItems.slice(0, 5).map((item, i) => (
                      <div key={i} className="py-3 flex justify-between items-center gap-4">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
                          {item.variantName && <span className="text-[10px] text-slate-400 mt-1 block">تنوع: {item.variantName}</span>}
                          <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">در سفارش: #{item.orderId.slice(-8).toUpperCase()}</span>
                        </div>
                        <div className="text-left">
                          <span className="text-xs font-black text-red-600 block">تعداد درخواستی: {item.ordered} عدد</span>
                          <span className="text-[10px] text-slate-400 font-medium">موجودی انبار: {item.stock} عدد</span>
                        </div>
                      </div>
                    ));
                  })()
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------- GENERAL DETAIL MODAL & PANEL -------------------- */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn select-none print:hidden">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-blue-100 dark:bg-blue-950/40 rounded-xl text-blue-600 dark:text-blue-400"><FileText size={20} /></span>
                <div>
                  <h2 className="text-lg font-black text-slate-900 dark:text-white">
                    جزئیات سفارش #{selectedOrder.id.slice(-8).toUpperCase()}
                  </h2>
                  <span className="text-xs text-slate-400 font-semibold">ثبت در {new Date(selectedOrder.createdAt).toLocaleString('fa-IR')}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`/orders/${selectedOrder.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <Printer size={15} />
                  چاپ فاکتور و برچسب
                </a>
                
                <button 
                  onClick={handleCloseModal}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 px-6 overflow-x-auto gap-2">
              <button
                onClick={() => setModalTab('general')}
                className={`py-3.5 text-xs font-bold border-b-2 transition-all px-3 ${
                  modalTab === 'general' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500'
                }`}
              >
                اطلاعات مشتری و آدرس
              </button>
              <button
                onClick={() => setModalTab('items')}
                className={`py-3.5 text-xs font-bold border-b-2 transition-all px-3 ${
                  modalTab === 'items' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500'
                }`}
              >
                اقلام خریداری شده ({selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)})
              </button>
              <button
                onClick={() => setModalTab('timeline')}
                className={`py-3.5 text-xs font-bold border-b-2 transition-all px-3 ${
                  modalTab === 'timeline' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500'
                }`}
              >
                تغییر وضعیت و تاریخچه
              </button>
              <button
                onClick={() => setModalTab('shipping')}
                className={`py-3.5 text-xs font-bold border-b-2 transition-all px-3 ${
                  modalTab === 'shipping' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500'
                }`}
              >
                مدیریت ارسال پست/پیک
              </button>
              <button
                onClick={() => setModalTab('return')}
                className={`py-3.5 text-xs font-bold border-b-2 transition-all px-3 ${
                  modalTab === 'return' ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400' : 'border-transparent text-slate-500'
                }`}
              >
                مدیریت مرجوعی و عودت
              </button>
            </div>

            {/* Modal Content Area */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              
              {/* TAB 1: General & Customer */}
              {modalTab === 'general' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Order Progress Stepper (مراحل گام به گام پیشرفت سفارش) */}
                  {(() => {
                    const steps = [
                      { id: 'registered', label: 'ثبت سفارش', icon: Clock },
                      { id: 'paid', label: 'تایید پرداخت', icon: CreditCard },
                      { id: 'processing', label: 'آماده‌سازی', icon: Package },
                      { id: 'shipped', label: 'ارسال مرسوله', icon: Truck },
                      { id: 'delivered', label: 'تحویل نهایی', icon: CheckCircle },
                    ];

                    let currentStepIndex = 0;
                    if (selectedOrder.status === 'cancelled') {
                      currentStepIndex = -1;
                    } else if (selectedOrder.shippingStatus === 'delivered' || selectedOrder.status === 'delivered') {
                      currentStepIndex = 4;
                    } else if (selectedOrder.shippingStatus === 'shipped' || selectedOrder.status === 'shipped') {
                      currentStepIndex = 3;
                    } else if (selectedOrder.shippingStatus === 'processing') {
                      currentStepIndex = 2;
                    } else if (selectedOrder.paymentStatus === 'paid' || selectedOrder.status === 'paid') {
                      currentStepIndex = 1;
                    } else {
                      currentStepIndex = 0;
                    }

                    return (
                      <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-850">
                        {selectedOrder.status === 'cancelled' ? (
                          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 font-extrabold text-xs">
                            <XCircle size={20} />
                            <span>این سفارش لغو یا ابطال شده است و امکان ادامه مراحل وجود ندارد.</span>
                          </div>
                        ) : (
                          <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 md:gap-2 relative">
                            {steps.map((step, idx) => {
                              const isCompleted = idx < currentStepIndex;
                              const isCurrent = idx === currentStepIndex;
                              
                              let statusColor = 'text-slate-400 bg-slate-100 dark:bg-slate-800 dark:text-slate-600 border border-slate-200 dark:border-slate-800';
                              
                              if (isCompleted) {
                                statusColor = 'text-white bg-emerald-500 border-emerald-500';
                              } else if (isCurrent) {
                                statusColor = 'text-white bg-blue-600 border-blue-600 ring-4 ring-blue-100 dark:ring-blue-900/30';
                              }

                              return (
                                <div key={step.id} className="flex-1 flex md:flex-col items-center gap-3 md:gap-2 relative">
                                  {/* Circle */}
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${statusColor} z-10`}>
                                    {isCompleted ? <Check size={16} className="stroke-[3]" /> : idx + 1}
                                  </div>
                                  
                                  {/* Label */}
                                  <div className="text-right md:text-center">
                                    <span className={`block text-xs font-black transition-colors ${isCurrent ? 'text-blue-600 dark:text-blue-400' : isCompleted ? 'text-emerald-600 dark:text-emerald-500' : 'text-slate-500'}`}>
                                      {step.label}
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                                      {idx === 0 && 'سفارش با موفقیت ثبت شد'}
                                      {idx === 1 && (selectedOrder.paymentStatus === 'paid' ? 'پرداخت تایید شد' : 'در انتظار پرداخت')}
                                      {idx === 2 && (selectedOrder.shippingStatus === 'processing' || selectedOrder.shippingStatus === 'shipped' || selectedOrder.shippingStatus === 'delivered' ? 'آماده‌سازی شد' : 'در انتظار آماده‌سازی')}
                                      {idx === 3 && (selectedOrder.shippingStatus === 'shipped' || selectedOrder.shippingStatus === 'delivered' ? 'تحویل باربری شد' : 'در انتظار ارسال')}
                                      {idx === 4 && (selectedOrder.shippingStatus === 'delivered' ? 'به دست مشتری رسید' : 'در راه مقصد')}
                                    </span>
                                  </div>

                                  {/* Connecting Line (desktop only) */}
                                  {idx < steps.length - 1 && (
                                    <div className={`hidden md:block absolute top-4 left-1/2 right-0 translate-x-4 h-0.5 w-[calc(100%-2rem)] -z-0 ${idx < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Smart Next-Step Guide Card (جعبه راهنمای اقدام بعدی هوشمند) */}
                  {(() => {
                    if (selectedOrder.status === 'cancelled') {
                      return (
                        <div className="bg-red-500/5 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 rounded-3xl p-5 flex items-start gap-4">
                          <span className="p-3 bg-red-100 dark:bg-red-950/50 rounded-2xl text-red-600 dark:text-red-400 mt-0.5"><XCircle size={22} /></span>
                          <div>
                            <h3 className="text-sm font-black text-red-900 dark:text-red-200">سفارش لغو یا ابطال شده است</h3>
                            <p className="text-xs text-red-700/80 dark:text-red-400/80 mt-1 font-semibold leading-relaxed">
                              این سفارش لغو یا ابطال شده است و نیاز به اقدام یا آماده‌سازی دیگری ندارد. در صورت مرجوعی، می‌توانید جزئیات مالی و عودت کالا را در تب مربوطه مدیریت کنید.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    // 1. Pending payment + Card-to-Card receipt uploaded
                    if (selectedOrder.paymentMethod === 'card_to_card' && selectedOrder.paymentStatus !== 'paid') {
                      return (
                        <div className="bg-amber-500/5 dark:bg-amber-950/10 border border-amber-200 dark:border-amber-900/30 rounded-3xl p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="p-2.5 bg-amber-100 dark:bg-amber-950/50 rounded-2xl text-amber-600 dark:text-amber-400 mt-0.5"><CreditCard size={18} /></span>
                            <div>
                              <h3 className="text-sm font-black text-amber-900 dark:text-amber-200">بررسی فیش و تایید واریز کارت‌به‌کارت (اقدام بعدی پیشنهادی)</h3>
                              <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1 font-semibold leading-relaxed">
                                مشتری پرداخت کارت‌به‌کارت انجام داده و جزئیات آن را ثبت کرده است. لطفاً حساب بانکی خود را بررسی کنید و در صورت صحت واریز مبلغ <span className="font-mono font-bold text-sm text-amber-900 dark:text-white bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded">{selectedOrder.finalAmount.toLocaleString()}</span> تومان، روی دکمه سبز رنگ زیر کلیک کنید:
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
                            <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-slate-400 block mb-1">کارت مبدا:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-white select-all">{selectedOrder.cardToCardSenderCard || 'ثبت نشده'}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-slate-400 block mb-1">کد پیگیری / ارجاع:</span>
                              <span className="font-bold text-slate-800 dark:text-white select-all">{selectedOrder.cardToCardCode || 'ثبت نشده'}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <span className="text-slate-400 block mb-1">زمان اعلام:</span>
                              <span className="font-bold text-slate-800 dark:text-white">{selectedOrder.cardToCardTime || 'ثبت نشده'}</span>
                            </div>
                          </div>

                          {selectedOrder.cardToCardReceipt && (
                            <div className="bg-white dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center gap-4">
                              <img src={selectedOrder.cardToCardReceipt} alt="Receipt" className="w-14 h-14 object-cover rounded-lg border dark:border-slate-850" />
                              <div>
                                <span className="text-xs font-bold text-slate-500 block mb-0.5">تصویر فیش بانکی آپلود شده</span>
                                <a 
                                  href={selectedOrder.cardToCardReceipt} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-bold"
                                >
                                  <Eye size={13} />
                                  مشاهده تصویر بزرگ در زبانه جدید
                                </a>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2.5 pt-2">
                            <button
                              onClick={async () => {
                                if (!confirm('آیا صحت فیش واریزی را تایید می‌کنید؟ با این کار وضعیت سفارش به "پرداخت شده" تغییر می‌کند.')) return;
                                await handleUpdateOrder({
                                  status: 'paid',
                                  paymentStatus: 'paid',
                                  adminNotes: `${selectedOrder.adminNotes || ''}\n[تایید فیش کارت به کارت در ${new Date().toLocaleString('fa-IR')}]`
                                }, 'سفارش با موفقیت تایید و وضعیت آن به "پرداخت شده" تغییر یافت.');
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Check size={14} className="stroke-[3]" />
                              تایید صحت فیش و پرداخت خریدار
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm('آیا می‌خواهید این فیش را رد کنید؟ وضعیت فیش به لغو شده تغییر می‌کند.')) return;
                                await handleUpdateOrder({
                                  status: 'cancelled',
                                  paymentStatus: 'failed',
                                  adminNotes: `${selectedOrder.adminNotes || ''}\n[رد فیش کارت به کارت در ${new Date().toLocaleString('fa-IR')}]`
                                }, 'فیش واریزی رد و سفارش با موفقیت ابطال شد.');
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <X size={14} className="stroke-[3]" />
                              رد فیش و ابطال این سفارش
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 2. Pending payment + Online Gateway / Other
                    if (selectedOrder.paymentStatus !== 'paid' && selectedOrder.status === 'pending') {
                      return (
                        <div className="bg-blue-500/5 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/30 rounded-3xl p-5 space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="p-2.5 bg-blue-100 dark:bg-blue-950/50 rounded-2xl text-blue-600 dark:text-blue-400 mt-0.5"><Clock size={18} /></span>
                            <div>
                              <h3 className="text-sm font-black text-blue-900 dark:text-blue-200">در انتظار تسویه و پرداخت خریدار (اقدام بعدی پیشنهادی)</h3>
                              <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1 font-semibold leading-relaxed">
                                خریدار فاکتور این سفارش را صادر کرده اما هنوز پرداخت آنلاین را نهایی نکرده است. در صورتی که مبلغ را به روش دیگری (مثل پوز یا نقدی) دریافت کرده‌اید، می‌توانید تسویه را دستی تایید کنید:
                              </p>
                            </div>
                          </div>
                          <div className="pt-1 flex">
                            <button
                              onClick={async () => {
                                if (!confirm('آیا می‌خواهید به صورت دستی پرداخت این سفارش را تایید کنید؟')) return;
                                await handleUpdateOrder({
                                  status: 'paid',
                                  paymentStatus: 'paid',
                                  adminNotes: `${selectedOrder.adminNotes || ''}\n[تایید دستی پرداخت در ${new Date().toLocaleString('fa-IR')}]`
                                }, 'سفارش تسویه شده و در وضعیت "آماده‌سازی" قرار گرفت.');
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Check size={14} className="stroke-[3]" />
                              تایید دستی دریافت وجه و تایید فاکتور
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 3. Paid & Shipping Status is New (Need to prepare)
                    if ((selectedOrder.status === 'paid' || selectedOrder.paymentStatus === 'paid') && selectedOrder.shippingStatus === 'new') {
                      return (
                        <div className="bg-indigo-500/5 dark:bg-indigo-950/10 border border-indigo-200 dark:border-indigo-900/30 rounded-3xl p-5 space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="p-2.5 bg-indigo-100 dark:bg-indigo-950/50 rounded-2xl text-indigo-600 dark:text-indigo-400 mt-0.5"><Package size={18} /></span>
                            <div>
                              <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200">شروع آماده‌سازی سفارش و بسته‌بندی در انبار (اقدام بعدی پیشنهادی)</h3>
                              <p className="text-xs text-indigo-700/80 dark:text-indigo-400/80 mt-1 font-semibold leading-relaxed">
                                پرداخت فاکتور با موفقیت نهایی شده است. اکنون زمان آن است که کالاها را جمع‌آوری کرده، فاکتور را چاپ کرده و بسته‌بندی را آغاز کنید. دکمه زیر را بزنید تا فرآیند آماده‌سازی رسماً شروع شود:
                              </p>
                            </div>
                          </div>
                          <div className="pt-1 flex">
                            <button
                              onClick={async () => {
                                await handleUpdateOrder({
                                  shippingStatus: 'processing',
                                  adminNotes: `${selectedOrder.adminNotes || ''}\n[تغییر وضعیت به در حال آماده‌سازی در ${new Date().toLocaleString('fa-IR')}]`
                                }, 'وضعیت سفارش به "در حال آماده‌سازی و بسته‌بندی" تغییر یافت.');
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Activity size={14} />
                              شروع فرآیند آماده‌سازی و بسته‌بندی اقلام
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 4. Shipping Status is Processing (Ready to Ship & Enter Tracking Code)
                    if (selectedOrder.shippingStatus === 'processing') {
                      return (
                        <div className="bg-blue-500/5 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/30 rounded-3xl p-5 space-y-4">
                          <div className="flex items-start gap-3">
                            <span className="p-2.5 bg-blue-100 dark:bg-blue-950/50 rounded-2xl text-blue-600 dark:text-blue-400 mt-0.5"><Truck size={18} /></span>
                            <div>
                              <h3 className="text-sm font-black text-blue-900 dark:text-blue-200">تحویل به باربری و ثبت کد رهگیری مرسوله (اقدام بعدی پیشنهادی)</h3>
                              <p className="text-xs text-blue-700/80 dark:text-blue-400/80 mt-1 font-semibold leading-relaxed">
                                پس از اتمام بسته‌بندی و تحویل مرسوله به اداره پست، تیپاکس یا پیک، نوع شرکت ارسال‌کننده و کد رهگیری پستی را در کادر زیر ثبت کنید تا سفارش به وضعیت "ارسال شده" تغییر یابد و پیامک پیگیری بلافاصله برای مشتری صادر شود:
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                            {/* Carrier selection */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 block">شرکت باربری / روش ارسال کننده:</label>
                              <input
                                type="text"
                                placeholder="مثال: پست پیشتاز، تیپاکس، اسنپ باکس..."
                                value={formCarrier}
                                onChange={(e) => setFormCarrier(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500"
                              />
                              {/* Clickable badges for extremely fast filling */}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {['پست پیشتاز', 'تیپاکس', 'پیک شهری', 'اسنپ باکس'].map((carrierName) => (
                                  <button
                                    key={carrierName}
                                    type="button"
                                    onClick={() => setFormCarrier(carrierName)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all ${
                                      formCarrier === carrierName 
                                        ? 'bg-blue-600 text-white shadow-xs' 
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-750'
                                    }`}
                                  >
                                    {carrierName}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Tracking Code */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] font-bold text-slate-500 block">کد رهگیری مرسوله پستی / کد پیگیری:</label>
                              <input
                                type="text"
                                placeholder="کد رهگیری ۲۴ رقمی پست، بارکد یا کد پیگیری..."
                                value={formTrackingCode}
                                onChange={(e) => setFormTrackingCode(e.target.value)}
                                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-left tracking-wider focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button
                              onClick={async () => {
                                if (!formCarrier) {
                                  alert('لطفاً ابتدا نام شرکت باربری یا روش ارسال را مشخص کنید.');
                                  return;
                                }
                                await handleUpdateOrder({
                                  shippingCarrier: formCarrier,
                                  shippingTrackingCode: formTrackingCode,
                                  shippingStatus: 'shipped',
                                  status: 'shipped',
                                  adminNotes: `${selectedOrder.adminNotes || ''}\n[ارسال سفارش با ${formCarrier} و کد رهگیری ${formTrackingCode || 'ثبت نشده'} در ${new Date().toLocaleString('fa-IR')}]`
                                }, 'کد رهگیری با موفقیت ثبت شد و پیامک پیگیری برای مشتری صادر شد.');
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Send size={13} />
                              ثبت فیش ارسال و تغییر وضعیت به "ارسال شده"
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 5. Shipped (Awaiting delivery confirmation)
                    if ((selectedOrder.shippingStatus === 'shipped' || selectedOrder.status === 'shipped') && selectedOrder.shippingStatus !== 'delivered') {
                      return (
                        <div className="bg-violet-500/5 dark:bg-violet-950/10 border border-violet-200 dark:border-violet-900/30 rounded-3xl p-5 space-y-3">
                          <div className="flex items-start gap-3">
                            <span className="p-2.5 bg-violet-100 dark:bg-violet-950/50 rounded-2xl text-violet-600 dark:text-violet-400 mt-0.5"><Truck size={18} /></span>
                            <div>
                              <h3 className="text-sm font-black text-violet-900 dark:text-violet-200">تحویل نهایی مرسوله به مشتری (اقدام بعدی پیشنهادی)</h3>
                              <p className="text-xs text-violet-700/80 dark:text-violet-400/80 mt-1 font-semibold leading-relaxed">
                                سفارش با موفقیت ارسال شده است (روش: {selectedOrder.shippingCarrier || 'نامشخص'} - کد رهگیری: {selectedOrder.shippingTrackingCode || 'ثبت نشده'}). پس از کسب اطمینان از دریافت کالا توسط مشتری، این سفارش را تکمیل کنید:
                              </p>
                            </div>
                          </div>
                          <div className="pt-1 flex">
                            <button
                              onClick={async () => {
                                await handleUpdateOrder({
                                  shippingStatus: 'delivered',
                                  status: 'delivered',
                                  adminNotes: `${selectedOrder.adminNotes || ''}\n[تایید تحویل نهایی سفارش به مشتری در ${new Date().toLocaleString('fa-IR')}]`
                                }, 'پرونده سفارش با موفقیت تکمیل و بسته شد.');
                              }}
                              disabled={isUpdating}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold rounded-xl flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <CheckCircle size={14} />
                              تایید تحویل مرسوله به خریدار و تکمیل نهایی سفارش
                            </button>
                          </div>
                        </div>
                      );
                    }

                    // 6. Delivered / Completed successfully
                    if (selectedOrder.status === 'delivered' || selectedOrder.shippingStatus === 'delivered') {
                      return (
                        <div className="bg-emerald-500/5 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-3xl p-5">
                          <div className="flex items-center gap-3.5 text-emerald-850 dark:text-emerald-400">
                            <span className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl text-emerald-600 dark:text-emerald-400"><CheckCircle size={20} /></span>
                            <div>
                              <h3 className="text-sm font-black">این سفارش با موفقیت تکمیل و بسته شده است</h3>
                              <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 mt-1 font-semibold">پرونده این سفارش با گذراندن تمامی مراحل (پرداخت، بسته‌بندی، ارسال و تحویل نهایی) با موفقیت بسته شده است.</p>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return null;
                  })()}

                  {/* Two-Column Elegant Dashboard Layout (چیدمان دو ستونه مدرن برای دسترسی یکپارچه) */}
                  <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 pt-2">
                    
                    {/* LEFT COLUMN: Customer Info, Shipping Address, and Admin Notes (2/5 size) */}
                    <div className="lg:col-span-2 space-y-6">
                      
                      {/* Customer Info Card */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-850 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850/60 pb-2">
                          <User size={15} className="text-blue-500" />
                          مشخصات خریدار سفارش
                        </h3>
                        
                        <div className="space-y-2.5 text-xs">
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-400">نام خریدار:</span>
                            <span className="text-slate-800 dark:text-slate-200">{selectedOrder.user.name || 'ثبت نشده'}</span>
                          </div>
                          
                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-400">شماره موبایل:</span>
                            <div className="flex items-center gap-1">
                              <a 
                                href={`tel:${selectedOrder.phone || selectedOrder.user.phone}`}
                                className="text-blue-600 dark:text-blue-400 hover:underline"
                              >
                                {selectedOrder.phone || selectedOrder.user.phone || '-'}
                              </a>
                              {(selectedOrder.phone || selectedOrder.user.phone) && (
                                <button 
                                  onClick={() => {
                                    navigator.clipboard.writeText(selectedOrder.phone || selectedOrder.user.phone || '');
                                    setSuccessMessage('شماره تماس مشتری با موفقیت کپی شد.');
                                    setTimeout(() => setSuccessMessage(''), 3000);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-900 rounded-md transition-all cursor-pointer"
                                  title="کپی شماره تماس"
                                >
                                  <Copy size={12} />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-400">پست الکترونیک:</span>
                            <span className="text-slate-750 dark:text-slate-350 select-all font-mono text-[11px]">{selectedOrder.user.email}</span>
                          </div>

                          <div className="flex justify-between items-center font-bold">
                            <span className="text-slate-400">کد کاربری خریدار:</span>
                            <span className="text-slate-400 select-all font-mono text-[10px]">{selectedOrder.user.id}</span>
                          </div>
                        </div>
                      </div>

                      {/* Delivery Address Card */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-850 space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850/60 pb-2">
                          <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <MapPin size={15} className="text-purple-500" />
                            نشانی دقیق ارسال مرسوله
                          </h3>
                          <button 
                            onClick={() => {
                              const fullAddressText = `${selectedOrder.state || ''}، ${selectedOrder.city || ''}، ${selectedOrder.address || ''} (کدپستی: ${selectedOrder.zipCode || ''}) - گیرنده: ${selectedOrder.user.name || ''} - تلفن: ${selectedOrder.phone || selectedOrder.user.phone || ''}`;
                              navigator.clipboard.writeText(fullAddressText);
                              setSuccessMessage('نشانی و اطلاعات گیرنده با موفقیت کپی شد.');
                              setTimeout(() => setSuccessMessage(''), 3000);
                            }}
                            className="p-1 px-2 text-[10px] bg-white dark:bg-slate-900 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 border border-slate-100 dark:border-slate-800 rounded-lg transition-all flex items-center gap-1 cursor-pointer font-black"
                            title="کپی کل آدرس و تلفن خریدار جهت چسباندن روی بسته"
                          >
                            <Copy size={11} />
                            کپی آدرس گیرنده
                          </button>
                        </div>
                        
                        <div className="space-y-3 text-xs">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-bold">
                              <span className="text-[10px] text-slate-400 block mb-0.5">استان مقصد:</span>
                              <span className="text-slate-800 dark:text-slate-200">{selectedOrder.state || '-'}</span>
                            </div>
                            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-bold">
                              <span className="text-[10px] text-slate-400 block mb-0.5">شهر مقصد:</span>
                              <span className="text-slate-800 dark:text-slate-200">{selectedOrder.city || '-'}</span>
                            </div>
                          </div>

                          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/60 font-bold">
                            <span className="text-[10px] text-slate-400 block mb-0.5">کد پستی گیرنده (۱۰ رقمی):</span>
                            <span className="text-slate-800 dark:text-slate-200 font-mono select-all tracking-wider text-xs">{selectedOrder.zipCode || '-'}</span>
                          </div>

                          <div className="font-bold">
                            <span className="text-[10px] text-slate-400 block mb-1">نشانی پستی دقیق:</span>
                            <p className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 leading-relaxed text-slate-700 dark:text-slate-300 text-xs">
                              {selectedOrder.address || 'آدرسی ثبت نشده است.'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Notes Card & Dynamic Admin Notes Edit */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-850 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850/60 pb-2">
                          <MessageSquare size={15} className="text-amber-500" />
                          یادداشت‌ها و توضیحات
                        </h3>

                        <div className="space-y-3 text-xs">
                          {selectedOrder.userNotes && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-400 font-bold">توضیحات خریدار هنگام خرید:</span>
                              <div className="bg-amber-500/5 text-amber-800 dark:text-amber-400/80 p-3 rounded-xl border border-amber-100 dark:border-amber-900/30 font-medium leading-relaxed">
                                {selectedOrder.userNotes}
                              </div>
                            </div>
                          )}

                          <div className="space-y-1.5 pt-1">
                            <label className="text-[10px] text-slate-400 font-black block">یادداشت اداری (پشت صحنه - مخصوص پرسنل):</label>
                            <textarea
                              value={formAdminNotes}
                              onChange={(e) => setFormAdminNotes(e.target.value)}
                              placeholder="توضیحات داخلی یا اطلاعات خاص مانند شماره تماس همکاران را اینجا بنویسید..."
                              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl resize-none h-20 text-xs leading-relaxed focus:ring-2 focus:ring-blue-500"
                            />
                            <div className="flex justify-end pt-0.5">
                              <button
                                type="button"
                                onClick={async () => {
                                  await handleUpdateOrder({ adminNotes: formAdminNotes }, 'یادداشت داخلی مدیریت با موفقیت بروزرسانی و ثبت شد.');
                                }}
                                disabled={isUpdating}
                                className="px-2.5 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg font-black text-[10px] hover:bg-slate-300 dark:hover:bg-slate-750 transition-all cursor-pointer"
                              >
                                {isUpdating ? 'در حال ثبت...' : 'بروزرسانی یادداشت مدیریت'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* RIGHT COLUMN: Purchased Items & Financial invoice summary (3/5 size) */}
                    <div className="lg:col-span-3 space-y-6">
                      
                      {/* Items Purchased List */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-850 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850/60 pb-2">
                          <Package size={15} className="text-emerald-500" />
                          اقلام فاکتور سفارش ({selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)} کالا)
                        </h3>

                        <div className="divide-y divide-slate-100 dark:divide-slate-850/60 max-h-96 overflow-y-auto space-y-3.5 pr-1">
                          {selectedOrder.items.map((item) => (
                            <div key={item.id} className="pt-3.5 first:pt-0 flex items-center justify-between gap-3 bg-white/40 dark:bg-slate-900/10 p-2.5 rounded-xl border border-slate-100/40 dark:border-slate-850/40">
                              <div className="flex items-center gap-3">
                                {item.product.imageUrl ? (
                                  <img src={item.product.imageUrl} alt={item.product.title} className="w-12 h-12 object-cover rounded-lg border dark:border-slate-800" />
                                ) : (
                                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                                    <Package size={20} />
                                  </div>
                                )}

                                <div>
                                  <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-relaxed line-clamp-2 max-w-[240px]">{item.product.title}</h4>
                                  {item.variant && (
                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[9px] text-slate-500 dark:text-slate-400 font-bold rounded-md mt-1 inline-block">
                                      ویژگی: {item.variant.name}
                                    </span>
                                  )}
                                  <span className="block text-[9px] text-slate-400 font-bold mt-0.5">موجودی انبار: {(item.variant ? item.variant.stock : item.product.stock) || 0} عدد</span>
                                </div>
                              </div>

                              <div className="text-left font-bold text-xs space-y-0.5 shrink-0">
                                <span className="text-slate-400 block text-[10px]">{item.quantity} عدد × {item.price.toLocaleString()} تومان</span>
                                <span className="text-slate-800 dark:text-slate-200 block">{(item.price * item.quantity).toLocaleString()} تومان</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Invoice Financial Invoice Summary */}
                      <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-3xl border border-slate-100 dark:border-slate-850 space-y-3.5">
                        <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-2 border-b border-slate-100 dark:border-slate-850/60 pb-2">
                          <CreditCard size={15} className="text-blue-500" />
                          خلاصه حساب و فاکتور نهایی
                        </h3>

                        <div className="space-y-3 text-xs">
                          <div className="flex justify-between font-semibold text-slate-500">
                            <span>مجموع قیمت اقلام:</span>
                            <span>{selectedOrder.totalAmount.toLocaleString()} تومان</span>
                          </div>
                          
                          {selectedOrder.discountAmount > 0 && (
                            <div className="flex justify-between font-black text-red-500">
                              <span>تخفیف کوپن/کد تخفیف:</span>
                              <span>-{selectedOrder.discountAmount.toLocaleString()} تومان</span>
                            </div>
                          )}
                          
                          <div className="flex justify-between font-semibold text-slate-500">
                            <span>هزینه حمل و نقل (ارسال):</span>
                            <span>{selectedOrder.shippingCost.toLocaleString()} تومان</span>
                          </div>
                          
                          {selectedOrder.taxAmount > 0 && (
                            <div className="flex justify-between font-semibold text-slate-500">
                              <span>مالیات بر ارزش افزوده:</span>
                              <span>{selectedOrder.taxAmount.toLocaleString()} تومان</span>
                            </div>
                          )}

                          <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                          
                          <div className="flex justify-between text-sm font-black text-slate-900 dark:text-white items-center bg-blue-500/5 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-100/50 dark:border-blue-950/50">
                            <span className="flex items-center gap-1">
                              <CheckCircle size={15} className="text-blue-500" />
                              مبلغ نهایی فاکتور:
                            </span>
                            <span className="text-blue-600 dark:text-blue-400 font-mono text-base">{selectedOrder.finalAmount.toLocaleString()} تومان</span>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* TAB 2: Order Items */}
              {modalTab === 'items' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="border border-slate-100 dark:border-slate-850 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-850 shadow-xs">
                    {selectedOrder.items.map((item) => (
                      <div key={item.id} className="p-4 flex items-center justify-between gap-4 bg-slate-50/20 dark:bg-slate-950/5 hover:bg-slate-50/50 dark:hover:bg-slate-855/20 transition-all">
                        <div className="flex items-center gap-3.5">
                          {/* Image */}
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt={item.product.title} className="w-16 h-16 object-cover rounded-xl border border-slate-150 dark:border-slate-800" />
                          ) : (
                            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                              <Package size={24} />
                            </div>
                          )}

                          <div>
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white leading-relaxed line-clamp-2 max-w-[320px]">{item.product.title}</h4>
                            {item.variant && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-bold rounded-md mt-1.5 inline-block">
                                ویژگی / تنوع: {item.variant.name}
                              </span>
                            )}
                            <span className="block text-[10px] text-slate-400 font-medium mt-1">تعداد انبار: {(item.variant ? item.variant.stock : item.product.stock) || 0} عدد موجود</span>
                          </div>
                        </div>

                        <div className="text-left space-y-1">
                          <span className="text-xs font-bold text-slate-400 block">{item.quantity} عدد × {item.price.toLocaleString()} تومان</span>
                          <span className="text-sm font-black text-slate-900 dark:text-white block">{(item.price * item.quantity).toLocaleString()} تومان</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial calculation list */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-3.5 w-full max-w-sm ml-auto">
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>جمع اقلام:</span>
                      <span>{selectedOrder.totalAmount.toLocaleString()} تومان</span>
                    </div>
                    {selectedOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-xs font-bold text-red-500">
                        <span>مبلغ تخفیف کوپن:</span>
                        <span>-{selectedOrder.discountAmount.toLocaleString()} تومان</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>هزینه حمل و نقل (ارسال):</span>
                      <span>{selectedOrder.shippingCost.toLocaleString()} تومان</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold text-slate-500">
                      <span>مالیات و عوارض ارزش افزوده:</span>
                      <span>{selectedOrder.taxAmount.toLocaleString()} تومان</span>
                    </div>
                    <div className="h-px bg-slate-200 dark:bg-slate-800 my-2"></div>
                    <div className="flex justify-between text-base font-black text-slate-900 dark:text-white">
                      <span>مبلغ قابل پرداخت:</span>
                      <span className="text-blue-600 dark:text-blue-400">{selectedOrder.finalAmount.toLocaleString()} تومان</span>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Status & Timeline */}
              {modalTab === 'timeline' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
                  {/* Status changing Form */}
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white">تغییر وضعیت‌های عمومی سفارش</h3>
                    
                    {/* Select Status */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500">وضعیت عمومی:</label>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                      >
                        <option value="pending">در انتظار پرداخت</option>
                        <option value="paid">پرداخت شده</option>
                        <option value="shipped">ارسال شده</option>
                        <option value="delivered">تحویل موفق</option>
                        <option value="cancelled">لغو شده</option>
                      </select>
                    </div>

                    {/* Select Shipping Status */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500">وضعیت آماده‌سازی و ارسال:</label>
                      <select
                        value={formShippingStatus}
                        onChange={(e) => setFormShippingStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                      >
                        <option value="new">جدید / ثبت شده</option>
                        <option value="processing">در حال آماده‌سازی (پردازش)</option>
                        <option value="shipped">تحویل داده شده به پست/پیک (ارسال شده)</option>
                        <option value="delivered">تحویل داده شده به خریدار (تکمیل شده)</option>
                      </select>
                    </div>

                    {/* Select Payment Status */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500">وضعیت دقیق تراکنش بانکی:</label>
                      <select
                        value={formPaymentStatus}
                        onChange={(e) => setFormPaymentStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                      >
                        <option value="pending">در انتظار پرداخت</option>
                        <option value="paid">پرداخت موفق</option>
                        <option value="failed">پرداخت ناموفق</option>
                        <option value="refunded">استرداد وجه عودتی</option>
                      </select>
                    </div>

                    {/* Admin notes edit */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-500">یادداشت اداری (سیستمی):</label>
                      <textarea
                        value={formAdminNotes}
                        onChange={(e) => setFormAdminNotes(e.target.value)}
                        placeholder="افزودن یادداشت درباره این سفارش..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs resize-none h-18"
                      />
                    </div>

                    {/* Direct customer notification message */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-blue-500 flex items-center gap-1">
                        <MessageSquare size={13} />
                        ارسال مستقیم پیام / نوتیفیکیشن اختصاصی به مشتری:
                      </label>
                      <textarea
                        value={formMessageToCustomer}
                        onChange={(e) => setFormMessageToCustomer(e.target.value)}
                        placeholder="متن پیام جهت اطلاع‌رسانی پیامکی یا پنلی به مشتری..."
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs resize-none h-18 text-blue-800 dark:text-blue-300"
                      />
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={() => {
                          const payload: any = {
                            status: formStatus,
                            shippingStatus: formShippingStatus,
                            paymentStatus: formPaymentStatus,
                            adminNotes: formAdminNotes,
                          };
                          if (formMessageToCustomer) {
                            payload.messageToCustomer = formMessageToCustomer;
                          }
                          handleUpdateOrder(payload, 'تغییرات وضعیت و ارسال پیام با موفقیت انجام شد.');
                        }}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isUpdating ? 'در حال ذخیره‌سازی...' : 'اعمال و بروزرسانی وضعیت'}
                      </button>
                    </div>
                  </div>

                  {/* Vertical history Timeline representation */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Activity size={15} className="text-blue-500" />
                      تاریخچه وضعیت زمانی سفارش (Timeline)
                    </h3>

                    <div className="relative pr-4 border-r-2 border-slate-200 dark:border-slate-800 mr-2 py-2 space-y-6">
                      {(() => {
                        let parsedTimeline: any[] = [];
                        try {
                          if (selectedOrder.statusTimeline) {
                            parsedTimeline = JSON.parse(selectedOrder.statusTimeline);
                          }
                        } catch (e) {
                          console.error(e);
                        }

                        if (parsedTimeline.length === 0) {
                          return (
                            <div className="flex items-start gap-3 relative">
                              <span className="absolute -right-6 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 shadow-md"></span>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">سفارش ثبت شد</h4>
                                <span className="text-[10px] text-slate-400 font-medium">{new Date(selectedOrder.createdAt).toLocaleString('fa-IR')}</span>
                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">سفارش توسط کاربر در سایت ثبت و نهایی گردید.</p>
                              </div>
                            </div>
                          );
                        }

                        return parsedTimeline.map((ev, i) => (
                          <div key={i} className="flex items-start gap-3 relative">
                            {/* Bullet */}
                            <span className="absolute -right-6 top-1.5 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white dark:border-slate-900 shadow-md"></span>
                            <div>
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white">{ev.title}</h4>
                              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                                {new Date(ev.date).toLocaleString('fa-IR')}
                              </span>
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-850">{ev.description}</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: Shipping Logistics */}
              {modalTab === 'shipping' && (
                <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Truck size={15} className="text-purple-500" />
                      تنظیمات رهگیری پستی و ارسال
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {shopSettings?.tipaxEnabled && (
                        <div className="sm:col-span-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
                          <div className="space-y-0.5 text-center sm:text-right">
                            <h4 className="text-xs font-black text-blue-900 dark:text-blue-200 flex items-center gap-1.5 justify-center sm:justify-start">
                              <Truck size={14} className="text-blue-600" />
                              اتصال هوشمند تیپاکس (Tipax API)
                            </h4>
                            <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold">
                              {shopSettings.tipaxShippingMode === 'api' 
                                ? 'می‌توانید اطلاعات این مرسوله را با یک کلیک به صورت خودکار در تیپاکس ثبت کرده و بارکد رهگیری دریافت کنید.' 
                                : 'برای ثبت خودکار، لطفا در تنظیمات، حالت نحوه ارسال را روی اتصال به وب‌سرویس قرار دهید.'}
                            </p>
                          </div>
                          {shopSettings.tipaxShippingMode === 'api' && (
                            <button
                              type="button"
                              onClick={handleRegisterTipax}
                              disabled={isRegisteringTipax}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shrink-0 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                            >
                              {isRegisteringTipax ? (
                                <>
                                  <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
                                  در حال ثبت...
                                </>
                              ) : (
                                <>
                                  <Truck size={14} />
                                  ثبت مرسوله در تیپاکس (API)
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                      {/* Courier Company Name */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">شرکت باربری / پست کننده:</label>
                        <input
                          type="text"
                          placeholder="مثال: پست پیشتاز، تیپاکس..."
                          value={formCarrier}
                          onChange={(e) => setFormCarrier(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                        />
                      </div>

                      {/* Tracking Code */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">کد رهگیری مرسوله (سفارش):</label>
                        <input
                          type="text"
                          placeholder="کد ۲۴ رقمی پست یا کد تیپاکس..."
                          value={formTrackingCode}
                          onChange={(e) => setFormTrackingCode(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-left tracking-wider"
                        />
                      </div>

                      {/* Tracking Link */}
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-[10px] font-bold text-slate-500">لینک صفحه سامانه رهگیری پست:</label>
                        <input
                          type="text"
                          placeholder="https://tracking.post.ir?id=..."
                          value={formTrackingLink}
                          onChange={(e) => setFormTrackingLink(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-left"
                        />
                      </div>

                      {/* Shipping Cost */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">هزینه ارسال اخذ شده (تومان):</label>
                        <input
                          type="number"
                          value={formShippingCost}
                          onChange={(e) => setFormShippingCost(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                        />
                      </div>

                      {/* Tax amount */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">مالیات ارزش افزوده فاکتور (تومان):</label>
                        <input
                          type="number"
                          value={formTaxAmount}
                          onChange={(e) => setFormTaxAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-slate-400 font-bold">ذخیره این فرم، اطلاعات حمل و نقل را بروزرسانی کرده و پیام حاوی لینک رهگیری برای خریدار ارسال می‌کند.</span>
                      <button
                        onClick={() => {
                          handleUpdateOrder({
                            shippingCarrier: formCarrier,
                            shippingTrackingCode: formTrackingCode,
                            trackingLink: formTrackingLink,
                            shippingCost: formShippingCost,
                            taxAmount: formTaxAmount,
                            // Set shipping status as shipped automatically if tracking code is added
                            ...(formTrackingCode && selectedOrder.shippingStatus === 'new' ? { shippingStatus: 'shipped' } : {})
                          }, 'اطلاعات توزیع و لجستیک با موفقیت ثبت شد.');
                        }}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isUpdating ? 'در حال ثبت...' : 'ذخیره اطلاعات ارسال مرسوله'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: Returns & Refunds */}
              {modalTab === 'return' && (
                <div className="space-y-6 animate-fadeIn max-w-xl mx-auto">
                  <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-100 dark:border-slate-850 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <RefreshCw size={15} className="text-red-500" />
                      مدیریت و عودت مرجوعی کالاها
                    </h3>

                    <div className="space-y-4">
                      {/* Reason of return */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">علت یا انگیزه مرجوعی کالا:</label>
                        <textarea
                          placeholder="مشتری کالا را به این دلیل عودت می‌دهد..."
                          value={formReturnReason}
                          onChange={(e) => setFormReturnReason(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs resize-none h-14"
                        />
                      </div>

                      {/* Return status */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">وضعیت بررسی درخواست مرجوعی:</label>
                        <select
                          value={formReturnStatus}
                          onChange={(e) => setFormReturnStatus(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                        >
                          <option value="none">بدون درخواست مرجوعی</option>
                          <option value="pending">در انتظار بررسی کادر اداری</option>
                          <option value="approved">تایید و بازگشت اقلام به انبار (بروزرسانی انبار)</option>
                          <option value="rejected">رد درخواست مرجوعی مشتری</option>
                        </select>
                      </div>

                      {/* Refund amount */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">مبلغ استرداد نهایی عودت داده شده (تومان):</label>
                        <input
                          type="number"
                          value={formRefundAmount}
                          onChange={(e) => setFormRefundAmount(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-red-600"
                        />
                      </div>

                      {/* Refund payment method */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500">روش بازپرداخت به مشتری:</label>
                        <input
                          type="text"
                          placeholder="مثال: شبا بانکی به شماره ...، کیف پول"
                          value={formRefundMethod}
                          onChange={(e) => setFormRefundMethod(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2">
                      <span className="text-[10px] text-slate-400 font-bold block max-w-sm">توجه: تایید مرجوعی، کالاها را مجدداً به موجودی انبار بازمی‌گرداند.</span>
                      <button
                        onClick={() => {
                          handleUpdateOrder({
                            returnReason: formReturnReason,
                            returnStatus: formReturnStatus,
                            refundAmount: formRefundAmount,
                            refundMethod: formRefundMethod,
                            // If return is approved, set order status as returned and payment status as refunded
                            ...(formReturnStatus === 'approved' ? { status: 'returned', paymentStatus: 'refunded' } : {})
                          }, 'وضعیت عودت و بازگشت به انبار با موفقیت ذخیره شد.');
                        }}
                        disabled={isUpdating}
                        className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isUpdating ? 'در حال ثبت...' : 'بروزرسانی پرونده مرجوعی'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* -------------------- HIDDEN PRINTABLE INVOICE / LABEL -------------------- */}
      {selectedOrder && (
        <div className="hidden print:block w-full text-black p-8 direction-rtl" style={{ direction: 'rtl', fontFamily: 'Vazir, sans-serif' }}>
          {/* Header invoice details */}
          <div className="border-b-4 border-double border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black">فاکتور فروش کالا</h1>
              <p className="text-xs text-slate-600 mt-1">سامانه متمرکز فروشگاه‌ساز SaaS</p>
            </div>
            <div className="text-left font-mono text-xs space-y-1">
              <div>شماره فاکتور: #{selectedOrder.id.slice(-8).toUpperCase()}</div>
              <div>تاریخ صدور فاکتور: {new Date().toLocaleDateString('fa-IR')}</div>
              <div>تاریخ ثبت سفارش: {new Date(selectedOrder.createdAt).toLocaleDateString('fa-IR')}</div>
            </div>
          </div>

          {/* Seller / Buyer grid */}
          <div className="grid grid-cols-2 gap-8 text-xs border border-slate-900 p-4 rounded-xl mb-6">
            <div className="space-y-2">
              <h3 className="font-extrabold text-sm border-b pb-1">مشخصات خریدار:</h3>
              <div><span className="font-bold">نام گیرنده:</span> {selectedOrder.user.name || '-'}</div>
              <div><span className="font-bold">شماره تماس:</span> {selectedOrder.phone || selectedOrder.user.phone || '-'}</div>
              <div><span className="font-bold">نشانی تحویل:</span> {selectedOrder.address || '-'}</div>
              <div><span className="font-bold">شهر مقصد:</span> {selectedOrder.city} - {selectedOrder.state}</div>
              <div><span className="font-bold">کد پستی گیرنده:</span> {selectedOrder.zipCode || '-'}</div>
            </div>

            <div className="space-y-2 border-r pr-6 border-slate-300">
              <h3 className="font-extrabold text-sm border-b pb-1">مشخصات مرسوله پستی:</h3>
              <div><span className="font-bold">شرکت پیک/پست:</span> {selectedOrder.shippingCarrier || 'خدمات پیک شهری'}</div>
              <div><span className="font-bold">کد رهگیری پستی:</span> {selectedOrder.shippingTrackingCode || 'ثبت نشده'}</div>
              <div><span className="font-bold">روش تسویه پرداخت:</span> {getPaymentMethodLabel(selectedOrder.paymentMethod)}</div>
              <div><span className="font-bold">وضعیت مالی:</span> {selectedOrder.paymentStatus === 'paid' ? 'تسویه کامل پرداخت شد' : 'در انتظار تسویه نقدی'}</div>
            </div>
          </div>

          {/* Table of products */}
          <table className="w-full text-right border border-slate-900 border-collapse mb-8 text-xs">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-900 font-bold">
                <th className="p-2 border-r border-slate-900 text-center w-12">ردیف</th>
                <th className="p-2 border-r border-slate-900">شرح کالا / محصول</th>
                <th className="p-2 border-r border-slate-900">ویژگی / تنوع</th>
                <th className="p-2 border-r border-slate-900 text-center w-16">تعداد</th>
                <th className="p-2 border-r border-slate-900 text-left">قیمت واحد (تومان)</th>
                <th className="p-2 text-left">جمع کل (تومان)</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder.items.map((item, index) => (
                <tr key={item.id} className="border-b border-slate-900">
                  <td className="p-2 border-r border-slate-900 text-center">{index + 1}</td>
                  <td className="p-2 border-r border-slate-900 font-bold">{item.product.title}</td>
                  <td className="p-2 border-r border-slate-900">{item.variant?.name || 'ساده'}</td>
                  <td className="p-2 border-r border-slate-900 text-center">{item.quantity}</td>
                  <td className="p-2 border-r border-slate-900 text-left">{(item.price).toLocaleString()}</td>
                  <td className="p-2 text-left">{(item.price * item.quantity).toLocaleString()}</td>
                </tr>
              ))}
              {/* Calculations rows */}
              <tr className="border-t border-slate-900 font-bold">
                <td colSpan={4} className="border-r border-slate-900"></td>
                <td className="p-2 border-r border-slate-900 text-left">جمع کل فاکتور:</td>
                <td className="p-2 text-left">{selectedOrder.totalAmount.toLocaleString()}</td>
              </tr>
              {selectedOrder.discountAmount > 0 && (
                <tr className="font-bold text-red-600">
                  <td colSpan={4} className="border-r border-slate-900"></td>
                  <td className="p-2 border-r border-slate-900 text-left">تخفیف فاکتور:</td>
                  <td className="p-2 text-left">-{selectedOrder.discountAmount.toLocaleString()}</td>
                </tr>
              )}
              {selectedOrder.shippingCost > 0 && (
                <tr className="font-bold">
                  <td colSpan={4} className="border-r border-slate-900"></td>
                  <td className="p-2 border-r border-slate-900 text-left">هزینه حمل و نقل:</td>
                  <td className="p-2 text-left">{selectedOrder.shippingCost.toLocaleString()}</td>
                </tr>
              )}
              {selectedOrder.taxAmount > 0 && (
                <tr className="font-bold">
                  <td colSpan={4} className="border-r border-slate-900"></td>
                  <td className="p-2 border-r border-slate-900 text-left">مالیات ارزش افزوده:</td>
                  <td className="p-2 text-left">{selectedOrder.taxAmount.toLocaleString()}</td>
                </tr>
              )}
              <tr className="bg-slate-200 font-black text-sm border-t-2 border-slate-900">
                <td colSpan={4} className="border-r border-slate-900"></td>
                <td className="p-2 border-r border-slate-900 text-left">مبلغ نهایی پرداخت شده:</td>
                <td className="p-2 text-left">{selectedOrder.finalAmount.toLocaleString()} تومان</td>
              </tr>
            </tbody>
          </table>

          {/* Footer of printing invoice */}
          <div className="grid grid-cols-2 gap-12 text-xs pt-12 mt-12 border-t border-slate-300">
            <div className="text-center font-bold">
              <div>امضاء و مهر فروشگاه</div>
              <div className="h-20"></div>
            </div>
            <div className="text-center font-bold">
              <div>امضاء و اثر انگشت خریدار</div>
              <div className="h-20"></div>
            </div>
          </div>

          {/* Label Card Separation */}
          <div className="page-break-before py-12 border-t-4 border-dashed border-slate-900 mt-20"></div>

          {/* Cargo dispatch address label card */}
          <div className="w-full border-4 border-slate-900 p-6 rounded-2xl flex flex-col justify-between" style={{ minHeight: '350px' }}>
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
              <h2 className="text-lg font-black bg-slate-900 text-white px-4 py-1.5 rounded-lg">برچسب ارسال مرسوله پستی</h2>
              <div className="font-mono text-sm text-left">
                <div>سفارش: #{selectedOrder.id.slice(-8).toUpperCase()}</div>
                <div>کریر: {selectedOrder.shippingCarrier || 'پست پیشتاز/پیک'}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 py-6 text-sm">
              <div className="bg-slate-100 p-4 rounded-xl border border-slate-300 space-y-2 relative">
                <span className="absolute right-3.5 -top-3 px-3 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-bold">گیرنده مرسوله:</span>
                <div className="font-extrabold text-base">{selectedOrder.user.name}</div>
                <div><span className="font-bold">شماره تماس:</span> {selectedOrder.phone || selectedOrder.user.phone || '-'}</div>
                <div><span className="font-bold">نشانی مقصد:</span> {selectedOrder.address}</div>
                <div className="flex gap-12">
                  <div><span className="font-bold">استان/شهر:</span> {selectedOrder.state} / {selectedOrder.city}</div>
                  <div><span className="font-bold">کد پستی:</span> {selectedOrder.zipCode || '-'}</div>
                </div>
              </div>

              <div className="border border-slate-900 p-4 rounded-xl space-y-1 relative">
                <span className="absolute right-3.5 -top-3 px-3 py-0.5 bg-slate-900 text-white rounded-md text-[10px] font-bold">فرستنده (فروشگاه):</span>
                <div className="font-extrabold">کادر پشتیبانی و انبار مرکزی فروشگاه ساز</div>
                <div className="text-xs">پشتیبانی متمرکز: تهران، خیابان انقلاب، ساختمان فناوری</div>
              </div>
            </div>

            <div className="border-t-2 border-slate-900 pt-4 flex justify-between items-center text-xs font-bold">
              <div>کد پیگیری مرسوله پستی: {selectedOrder.shippingTrackingCode || 'نیاز به ثبت توسط کادر ارسال'}</div>
              <div className="border border-slate-900 px-6 py-2 rounded-lg bg-slate-50">بارکد گیرنده (سیستم توزیع)</div>
            </div>
          </div>
        </div>
      )}

      {/* STICKY BATCH ACTIONS BAR */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900/95 dark:bg-slate-950/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex flex-col md:flex-row items-center gap-4 z-50 max-w-[95%] md:max-w-4xl select-none backdrop-blur-md animate-fadeIn">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 font-black text-xs text-white">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-bold text-slate-300">سفارش انتخاب شده</span>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 hidden md:block"></div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {/* Print Batch Labels */}
            <a
              href={`/admin/orders/print-batch?ids=${selectedOrderIds.join(',')}&mode=label`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all"
            >
              <Truck size={14} />
              <span>برچسب پستی دسته‌ای</span>
            </a>

            {/* Print Batch Invoices */}
            <a
              href={`/admin/orders/print-batch?ids=${selectedOrderIds.join(',')}&mode=invoice`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all"
            >
              <FileText size={14} />
              <span>چاپ رسمی فاکتورها</span>
            </a>

            {/* Print Batch Both */}
            <a
              href={`/admin/orders/print-batch?ids=${selectedOrderIds.join(',')}&mode=both`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-black transition-all"
            >
              <Printer size={14} />
              <span>فاکتور + برچسب با هم</span>
            </a>

            <div className="h-4 w-[1px] bg-slate-800 hidden lg:block"></div>

            {/* Batch Status: Processing */}
            <button
              onClick={() => handleBatchStatusChange('processing')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              <Clock size={14} />
              <span>تغییر به آماده‌سازی</span>
            </button>

            {/* Batch Status: Shipped */}
            <button
              onClick={() => handleBatchStatusChange('shipped')}
              disabled={isUpdating}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              <Truck size={14} />
              <span>تغییر به ارسال شده</span>
            </button>

            {/* Deselect All */}
            <button
              onClick={() => setSelectedOrderIds([])}
              className="px-2 py-1.5 text-slate-400 hover:text-white text-xs font-bold transition-colors"
            >
              لغو انتخاب
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
