'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  Users, 
  AlertTriangle, 
  MessageSquare, 
  Headphones, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  XCircle, 
  Activity, 
  RotateCcw, 
  RefreshCw,
  Pin,
  PinOff,
  Sparkles,
  BarChart2,
  Layers,
  ArrowLeft,
  Calendar,
  Zap,
  Phone,
  ArrowRight,
  ShieldCheck,
  ThumbsUp,
  LineChart,
  UserCheck,
  HeartHandshake,
  Download,
  Settings,
  Globe,
  Bot,
  Image as ImageIcon
} from 'lucide-react';
import { exportToCSV, exportToExcel } from '@/lib/export';
import SetupWizard from '@/components/admin/SetupWizard';

// Formatting helpers
const formatPrice = (price: number) => {
  return `${price.toLocaleString('fa-IR')} تومان`;
};

const formatNum = (num: number) => {
  return num.toLocaleString('fa-IR');
};

interface StatCardProps {
  title: string;
  value: string;
  subValue?: string;
  icon: any;
  colorTheme: 'emerald' | 'blue' | 'indigo' | 'amber';
  trend?: {
    percentage: number;
    isPositive: boolean;
  };
}

// Sparkline graph drawing helper
function MiniSparkline({ isPositive, colorTheme }: { isPositive: boolean; colorTheme: string }) {
  const points = isPositive 
    ? '0,25 15,20 30,22 45,10 60,15 75,5 90,8 105,2'
    : '0,2 15,8 30,5 45,15 60,10 75,22 90,20 105,25';

  const colorMap = {
    emerald: { stroke: 'stroke-emerald-500', fill: 'url(#glow-emerald)' },
    blue: { stroke: 'stroke-blue-500', fill: 'url(#glow-blue)' },
    indigo: { stroke: 'stroke-indigo-500', fill: 'url(#glow-indigo)' },
    amber: { stroke: 'stroke-amber-500', fill: 'url(#glow-amber)' }
  };

  const theme = colorMap[colorTheme as keyof typeof colorMap] || colorMap.blue;
  
  return (
    <div className="w-16 xs:w-20 sm:w-24 h-10 opacity-70 group-hover:opacity-100 transition-all duration-300 shrink-0">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 105 30">
        <defs>
          <linearGradient id="glow-emerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="glow-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="glow-indigo" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="glow-amber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path
          d={`M ${points} L 105,30 L 0,30 Z`}
          fill={theme.fill}
        />
        <path
          d={`M ${points}`}
          fill="none"
          className={`${theme.stroke}`}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function StatCard({ title, value, subValue, icon: Icon, trend, colorTheme }: StatCardProps) {
  const themeClasses = {
    emerald: {
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white',
      borderHover: 'hover:border-emerald-200 dark:hover:border-emerald-800/50',
      shadowHover: 'hover:shadow-emerald-500/5 dark:hover:shadow-emerald-500/10'
    },
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 group-hover:bg-blue-500 group-hover:text-white',
      borderHover: 'hover:border-blue-200 dark:hover:border-blue-800/50',
      shadowHover: 'hover:shadow-blue-500/5 dark:hover:shadow-blue-500/10'
    },
    indigo: {
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500 group-hover:text-white',
      borderHover: 'hover:border-indigo-200 dark:hover:border-indigo-800/50',
      shadowHover: 'hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10'
    },
    amber: {
      iconBg: 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white',
      borderHover: 'hover:border-amber-200 dark:hover:border-amber-800/50',
      shadowHover: 'hover:shadow-amber-500/5 dark:hover:shadow-amber-500/10'
    }
  };

  const selectedTheme = themeClasses[colorTheme] || themeClasses.blue;

  // Determine standard font-size class based on text length to prevent overflow inside cards
  const valueLength = value.length;
  const valueFontSizeClass = valueLength > 18
    ? 'text-base xs:text-lg sm:text-xl lg:text-[15px] xl:text-lg'
    : valueLength > 14
      ? 'text-lg xs:text-xl sm:text-2xl lg:text-[18px] xl:text-xl'
      : 'text-xl xs:text-2xl sm:text-3xl lg:text-xl xl:text-2xl';

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl p-4 xs:p-5 sm:p-6 shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300 ${selectedTheme.borderHover} ${selectedTheme.shadowHover} hover:-translate-y-1 relative overflow-hidden group flex flex-col justify-between`}>
      {/* Decorative gradient blur background on hover */}
      <div className="absolute -right-10 -bottom-10 w-28 h-28 bg-gradient-to-tr from-slate-100/10 to-transparent dark:from-slate-800/10 rounded-full blur-xl group-hover:scale-150 transition-all duration-500 pointer-events-none" />
      
      <div>
        <div className="flex justify-between items-start gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            <span className="text-[11px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block truncate" title={title}>{title}</span>
            <h3 className={`${valueFontSizeClass} font-black text-slate-800 dark:text-white tracking-tight leading-tight pt-0.5 break-words`} title={value}>
              {value}
            </h3>
          </div>
          <div className={`p-3 rounded-2xl transition-all duration-300 shrink-0 ${selectedTheme.iconBg}`}>
            <Icon className="w-5.5 h-5.5 transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        {subValue && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-2.5 flex items-start sm:items-center flex-wrap gap-1 leading-relaxed" title={subValue}>
            <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0 mt-0.5 sm:mt-0" />
            <span className="break-all xs:break-normal">{subValue}</span>
          </p>
        )}
      </div>

      <div className="flex items-end justify-between mt-5 pt-4 border-t border-slate-50 dark:border-slate-800/50 gap-2">
        {trend ? (
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 min-w-0">
            <span className={`flex items-center text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
              trend.isPositive 
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
            }`}>
              {trend.isPositive ? <TrendingUp className="w-3 h-3 ml-0.5" /> : <TrendingDown className="w-3 h-3 ml-0.5" />}
              {formatNum(Number(Math.abs(trend.percentage).toFixed(1)))}%
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">نسبت به قبل</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-bold truncate">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            وضعیت مطلوب
          </div>
        )}

        <MiniSparkline isPositive={trend ? trend.isPositive : true} colorTheme={colorTheme} />
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pinnedWidgets, setPinnedWidgets] = useState<string[]>([]);
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [activeExportMenu, setActiveExportMenu] = useState<string | null>(null);
  const [greeting, setGreeting] = useState('وقت بخیر');
  const [showWizard, setShowWizard] = useState(false);

  // AI Analyst States
  const [analystOpen, setAnalystOpen] = useState(false);
  const [analystPinned, setAnalystPinned] = useState(false);
  const [analystLoading, setAnalystLoading] = useState(false);
  const [analystData, setAnalystData] = useState<any>(null);
  const [analystError, setAnalystError] = useState('');
  const [analystType, setAnalystType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [analystManualCount, setAnalystManualCount] = useState<number>(0);
  const [shopAgeInDays, setShopAgeInDays] = useState<number>(0);

  // Load saved analysis on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedType = localStorage.getItem('ai_analyst_type') as 'daily' | 'weekly' | 'monthly' || 'daily';
      setAnalystType(savedType);

      const saved = localStorage.getItem(`ai_analyst_data_${savedType}`);
      if (saved) {
        try {
          setAnalystData(JSON.parse(saved));
        } catch (e) {}
      }

      const pinned = localStorage.getItem('ai_analyst_pinned') === 'true';
      setAnalystPinned(pinned);

      const open = localStorage.getItem('ai_analyst_open') === 'true';
      setAnalystOpen(pinned || open);

      // Fetch initial state from API in background to load manualCount and shopAge
      fetch(`/api/admin/dashboard/ai-analyst?type=${savedType}`)
        .then(res => res.json())
        .then(result => {
          if (result.success) {
            setAnalystManualCount(result.manualCount ?? 0);
            setShopAgeInDays(result.shopAgeInDays ?? 0);
            if (result.analysis && !saved) {
              setAnalystData(result.analysis);
              localStorage.setItem(`ai_analyst_data_${savedType}`, JSON.stringify(result.analysis));
            }
          }
        }).catch(() => {});
    }
  }, []);

  const handleToggleOpen = () => {
    const newOpen = !analystOpen;
    setAnalystOpen(newOpen);
    localStorage.setItem('ai_analyst_open', String(newOpen));
    if (!newOpen && analystPinned) {
      setAnalystPinned(false);
      localStorage.setItem('ai_analyst_pinned', 'false');
    }
  };

  const toggleAnalystPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newPinned = !analystPinned;
    setAnalystPinned(newPinned);
    localStorage.setItem('ai_analyst_pinned', String(newPinned));
    if (newPinned) {
      setAnalystOpen(true);
      localStorage.setItem('ai_analyst_open', 'true');
    }
  };

  const loadAnalystData = async (typeToLoad: 'daily' | 'weekly' | 'monthly', isManual = false) => {
    setAnalystLoading(true);
    setAnalystError('');
    try {
      const method = isManual ? 'POST' : 'GET';
      const res = await fetch(`/api/admin/dashboard/ai-analyst?type=${typeToLoad}`, {
        method
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'خطایی در دریافت تحلیل هوشمند رخ داد.');
      }
      if (result.success && result.analysis) {
        setAnalystData(result.analysis);
        setAnalystManualCount(result.manualCount ?? 0);
        setShopAgeInDays(result.shopAgeInDays ?? 0);
        localStorage.setItem(`ai_analyst_data_${typeToLoad}`, JSON.stringify(result.analysis));
      } else if (result.disabled) {
        setAnalystData(null);
        setAnalystError(result.reason);
      } else {
        throw new Error('تحلیل هوشمند ناموفق بود.');
      }
    } catch (error: any) {
      setAnalystError(error.message || 'خطای ارتباط با سرور.');
    } finally {
      setAnalystLoading(false);
    }
  };

  const handleTabChange = (newType: 'daily' | 'weekly' | 'monthly') => {
    setAnalystType(newType);
    localStorage.setItem('ai_analyst_type', newType);
    setAnalystError('');
    
    const saved = localStorage.getItem(`ai_analyst_data_${newType}`);
    if (saved) {
      try {
        setAnalystData(JSON.parse(saved));
        // Fetch in background to update manualCount
        fetch(`/api/admin/dashboard/ai-analyst?type=${newType}`)
          .then(res => res.json())
          .then(result => {
            if (result.success) {
              setAnalystManualCount(result.manualCount ?? 0);
              setShopAgeInDays(result.shopAgeInDays ?? 0);
            }
          }).catch(() => {});
        return;
      } catch (e) {}
    }
    
    loadAnalystData(newType, false);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard');
      if (res.ok) {
        const stats = await res.json();
        setData(stats);
      }
    } catch (error) {
      console.error('[ERROR] [Dashboard]: Error fetching dashboard statistics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/admin/profile');
      if (res.ok) {
        const profileData = await res.json();
        setProfile(profileData);
      }
    } catch (error) {
      console.error('[ERROR] [Dashboard]: Failed to fetch profile info', error);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchProfile();
    
    // Set Persian Greeting based on system time
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) setGreeting('صبح عالی بخیر');
    else if (hour >= 11 && hour < 15) setGreeting('ظهر بخیر');
    else if (hour >= 15 && hour < 18) setGreeting('بعدازظهر بخیر');
    else if (hour >= 18 && hour < 22) setGreeting('عصر شما بخیر');
    else setGreeting('شب شما آرام و بخیر');

    // Load pinned widgets from localStorage
    const savedPinned = localStorage.getItem('dashboard-pinned-widgets');
    if (savedPinned) {
      try {
        setPinnedWidgets(JSON.parse(savedPinned));
      } catch (e) {
        console.error('Failed to parse pinned widgets:', e);
      }
    }
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveExportMenu(null);
    };
    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const togglePinWidget = (widgetId: string) => {
    setPinnedWidgets(prev => {
      const next = prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId];
      localStorage.setItem('dashboard-pinned-widgets', JSON.stringify(next));
      return next;
    });
  };

  const handleExport = (id: string, format: 'excel' | 'csv') => {
    let headers: string[] = [];
    let rows: any[][] = [];
    let filename = '';

    const { financials, orders, inventory, customers, traffic, alerts } = data || {};

    if (id === 'financial_kpis') {
      filename = 'گزارش_عملکرد_مالی_و_درآمد';
      headers = ['بخش عملکرد', 'درآمد این دوره (تومان)', 'درآمد دوره قبل (تومان)', 'تغییر درصد'];
      rows = [
        ['امروز', financials?.today?.revenue || 0, financials?.today?.prevRevenue || 0, `${(financials?.today?.percentage || 0).toFixed(1)}%`],
        ['این هفته', financials?.week?.revenue || 0, financials?.week?.prevRevenue || 0, `${(financials?.week?.percentage || 0).toFixed(1)}%`],
        ['این ماه', financials?.month?.revenue || 0, financials?.month?.prevRevenue || 0, `${(financials?.month?.percentage || 0).toFixed(1)}%`],
        ['میانگین ارزش سبد خرید (AOV)', Math.round(financials?.aov || 0), '-', '-']
      ];
    } else if (id === 'orders_breakdown') {
      filename = 'گزارش_وضعیت_سفارشات';
      headers = ['وضعیت سفارش', 'تعداد'];
      rows = [
        ['در انتظار پرداخت', orders?.pending || 0],
        ['جدید (آماده پردازش)', orders?.new || 0],
        ['در حال ارسال مرسولات', orders?.shipped || 0],
        ['تحویل‌شده و نهایی', orders?.delivered || 0],
        ['مرجوعی / لغو شده', orders?.cancelled || 0],
        ['کل سفارشات ثبت شده', orders?.total || 0]
      ];
    } else if (id === 'traffic_chart') {
      filename = 'گزارش_ترافیک_هفتگی_و_نرخ_تبدیل';
      headers = ['تاریخ', 'روز هفته', 'بازدیدکننده یکتا (IP)', 'کل صفحات مشاهده شده', 'سفارش‌های نهایی', 'نرخ تبدیل تقریبی'];
      rows = (traffic?.chartData || []).map((day: any) => [
        day.date,
        day.dayName,
        day.visitors,
        day.pageViews,
        day.orders,
        day.visitors > 0 ? `${((day.orders / day.visitors) * 100).toFixed(1)}%` : '۰%'
      ]);
    } else if (id === 'traffic_sources') {
      filename = 'گزارش_منابع_ورودی_ترافیک';
      headers = ['منبع ورودی ترافیک', 'تعداد کاربر یکتا', 'درصد سهم ورودی'];
      rows = (traffic?.sources || []).map((source: any) => [
        source.name,
        source.count,
        `${source.percentage}%`
      ]);
    } else if (id === 'customers_stats') {
      filename = 'گزارش_شاخص_وفاداری_و_مشتریان';
      headers = ['شاخص مشتریان', 'مقدار (نفر / درصد)'];
      rows = [
        ['ثبت‌نام جدید (۳۰ روز اخیر)', `${customers?.newCount || 0} نفر`],
        ['خریداران فعال (۳۰ روز اخیر)', `${customers?.activeCount || 0} نفر`],
        ['نرخ وفاداری و بازگشت مشتری (Retention)', `${(customers?.retentionRate || 0).toFixed(1)}%`],
        ['کل باشگاه مشتریان', `${customers?.totalCustomers || 0} نفر`]
      ];
    } else if (id === 'low_stock') {
      filename = 'گزارش_کالاهای_رو_به_اتمام_انبار';
      headers = ['شناسه محصول', 'عنوان محصول', 'قیمت فروش (تومان)', 'تعداد باقیمانده'];
      rows = (inventory?.lowStock || []).map((prod: any) => [
        prod.id,
        prod.title,
        prod.price,
        prod.stock === 0 ? 'ناموجود' : prod.stock
      ]);
    } else if (id === 'top_vs_unsold') {
      filename = 'گزارش_تحلیل_فروش_و_کاتالوگ_محصولات';
      headers = ['بخش تحلیل کاتالوگ', 'عنوان محصول', 'قیمت فروش (تومان)', 'تعداد فروش / تاریخ ایجاد'];
      
      const topSellingRows = (inventory?.topSelling || []).map((prod: any, idx: number) => [
        `پرفروش‌ترین کالا (رتبه ${idx + 1})`,
        prod.title,
        prod.price,
        `${prod.salesCount} عدد فروش`
      ]);
      
      const unsoldRows = (inventory?.unsold || []).map((prod: any) => [
        'بدون فروش اخیر (نیازمند تخفیف)',
        prod.title,
        prod.price,
        new Date(prod.createdAt).toLocaleDateString('fa-IR')
      ]);
      
      rows = [...topSellingRows, ...unsoldRows];
    } else if (id === 'latest_tickets') {
      filename = 'گزارش_تیکت‌های_پشتیبانی_اخیر';
      headers = ['شناسه تیکت', 'موضوع تیکت', 'اولویت', 'کاربر تیکت‌دهنده', 'تاریخ ایجاد'];
      rows = (alerts?.urgentTickets || []).map((ticket: any) => {
        const subjectTxt = ticket.subject === 'return' ? 'درخواست مرجوعی کالا' : 
                           ticket.subject === 'shipping' ? 'مشکل در ارسال بار' : 
                           ticket.subject === 'payment' ? 'اختلال درگاه پرداخت' : 'سایر موارد فنی';
        const priorityTxt = ticket.priority === 'urgent' ? 'فوری / بحرانی' : ticket.priority === 'high' ? 'مهم' : 'معمولی';
        return [
          ticket.id,
          subjectTxt,
          priorityTxt,
          ticket.user?.name || 'مشتری جدید',
          new Date(ticket.createdAt).toLocaleDateString('fa-IR')
        ];
      });
    } else if (id === 'pending_reviews') {
      filename = 'گزارش_نظرات_تازه_منتظر_تایید';
      headers = ['کاربر دیدگاه‌دهنده', 'امتیاز داده شده', 'متن دیدگاه / کامنت', 'محصول مربوطه'];
      rows = (alerts?.urgentReviews || []).map((rev: any) => [
        rev.user?.name || 'کاربر میهمان',
        rev.rating,
        rev.comment,
        rev.product?.title || 'محصول حذف شده'
      ]);
    } else if (id === 'failed_payments') {
      filename = 'گزارش_پرداخت‌های_ناموفق';
      headers = ['شناسه سفارش', 'مبلغ نهایی (تومان)', 'نام کاربر', 'شماره تماس کاربر', 'تاریخ سفارش'];
      rows = (alerts?.failedPaymentsList || []).map((item: any) => [
        item.id,
        item.finalAmount,
        item.user?.name || 'کاربر',
        item.user?.phone || 'نامشخص',
        new Date(item.createdAt).toLocaleDateString('fa-IR')
      ]);
    }

    if (rows.length === 0) {
      console.warn('[WARN] [Export]: No data available to export for widget', id);
      return;
    }

    if (format === 'csv') {
      exportToCSV(rows, headers, filename);
    } else {
      exportToExcel(rows, headers, filename);
    }
  };

  const handleGlobalExport = (format: 'excel' | 'csv') => {
    const { financials, orders, inventory, customers, traffic, alerts } = data || {};
    const headers = ['بخش آماری / ستون ۱', 'جزئیات آماری / ستون ۲', 'مقدار / ستون ۳', 'درصد تغییر / ستون ۴'];
    const rows: any[][] = [];
    const filename = 'گزارش_جامع_داشبورد_مدیریت';

    // 1. Financial Performance
    rows.push(['--- عملکرد مالی و درآمد ---', '', '', '']);
    rows.push(['درآمد امروز', financials?.today?.revenue || 0, `دوره قبل: ${financials?.today?.prevRevenue || 0}`, `${(financials?.today?.percentage || 0).toFixed(1)}%`]);
    rows.push(['درآمد این هفته', financials?.week?.revenue || 0, `دوره قبل: ${financials?.week?.prevRevenue || 0}`, `${(financials?.week?.percentage || 0).toFixed(1)}%`]);
    rows.push(['درآمد این ماه', financials?.month?.revenue || 0, `دوره قبل: ${financials?.month?.prevRevenue || 0}`, `${(financials?.month?.percentage || 0).toFixed(1)}%`]);
    rows.push(['میانگین سبد خرید (AOV)', Math.round(financials?.aov || 0), '-', '-']);
    rows.push(['', '', '', '']); // spacer

    // 2. Orders Status
    rows.push(['--- وضعیت سفارشات ---', '', '', '']);
    rows.push(['در انتظار پرداخت', orders?.pending || 0, '', '']);
    rows.push(['جدید (آماده پردازش)', orders?.new || 0, '', '']);
    rows.push(['در حال ارسال', orders?.shipped || 0, '', '']);
    rows.push(['تحویل‌شده و نهایی', orders?.delivered || 0, '', '']);
    rows.push(['مرجوعی / لغو شده', orders?.cancelled || 0, '', '']);
    rows.push(['کل سفارشات', orders?.total || 0, '', '']);
    rows.push(['', '', '', '']); // spacer

    // 3. Traffic Chart (last 7 days)
    rows.push(['--- آنالیز ترافیک و نرخ تبدیل (۷ روز اخیر) ---', '', '', '']);
    rows.push(['تاریخ / روز', 'بازدیدکننده یکتا', 'کل صفحات مشاهده شده', 'سفارش‌های نهایی']);
    if (traffic?.chartData) {
      for (const day of traffic.chartData) {
        rows.push([`${day.dayName} (${day.date})`, day.visitors, day.pageViews, `${day.orders} سفارش`]);
      }
    }
    rows.push(['', '', '', '']); // spacer

    // 4. Traffic Sources
    rows.push(['--- منابع ورودی ترافیک ---', '', '', '']);
    if (traffic?.sources) {
      for (const source of traffic.sources) {
        rows.push([source.name, `${source.count} کاربر`, `${source.percentage}%`, '']);
      }
    }
    rows.push(['', '', '', '']); // spacer

    // 5. Customer loyalty
    rows.push(['--- وفاداری مشتریان ---', '', '', '']);
    rows.push(['ثبت‌نام جدید (۳۰ روزه)', `${customers?.newCount || 0} نفر`, '', '']);
    rows.push(['خریداران فعال (۳۰ روزه)', `${customers?.activeCount || 0} نفر`, '', '']);
    rows.push(['نرخ وفاداری و بازگشت مشتری', `${(customers?.retentionRate || 0).toFixed(1)}%`, '', '']);
    rows.push(['کل باشگاه مشتریان', `${customers?.totalCustomers || 0} نفر`, '', '']);
    rows.push(['', '', '', '']); // spacer

    // 6. Low stock
    rows.push(['--- وضعیت موجودی کالاها (رو به اتمام) ---', '', '', '']);
    rows.push(['شناسه محصول', 'عنوان محصول', 'قیمت فروش (تومان)', 'تعداد باقیمانده']);
    if (inventory?.lowStock) {
      for (const prod of inventory.lowStock) {
        rows.push([prod.id, prod.title, prod.price, prod.stock === 0 ? 'ناموجود' : prod.stock]);
      }
    }
    rows.push(['', '', '', '']); // spacer

    // 7. Top vs Unsold
    rows.push(['--- تحلیل فروش کالاها ---', '', '', '']);
    rows.push(['نوع تحلیل', 'عنوان محصول', 'قیمت فروش (تومان)', 'جزئیات فروش/تاریخ ایجاد']);
    if (inventory?.topSelling) {
      inventory.topSelling.forEach((prod: any, idx: number) => {
        rows.push([`پرفروش‌ترین کالا (رتبه ${idx + 1})`, prod.title, prod.price, `${prod.salesCount} عدد فروش`]);
      });
    }
    if (inventory?.unsold) {
      inventory.unsold.forEach((prod: any) => {
        rows.push(['کالای بدون فروش اخیر', prod.title, prod.price, new Date(prod.createdAt).toLocaleDateString('fa-IR')]);
      });
    }

    if (format === 'csv') {
      exportToCSV(rows, headers, filename);
    } else {
      exportToExcel(rows, headers, filename);
    }
  };

  // Modern shimmering loading screen matching new responsive layout
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 animate-pulse select-none">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div className="space-y-2">
            <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
            <div className="h-4 w-96 bg-slate-100 dark:bg-slate-900 rounded-lg"></div>
          </div>
          <div className="h-11 w-32 bg-slate-200 dark:bg-slate-800 rounded-xl"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 bg-slate-100 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800"></div>
          ))}
        </div>
        <div className="h-40 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-[450px] bg-slate-100 dark:bg-slate-900 rounded-2xl lg:col-span-2"></div>
          <div className="h-[450px] bg-slate-100 dark:bg-slate-900 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  const { financials, orders, inventory, customers, traffic, alerts, readiness } = data || {};

  const maxChartVal = traffic?.chartData 
    ? Math.max(...traffic.chartData.map((d: any) => Math.max(d.visitors, d.pageViews || 1)), 1) 
    : 100;

  const checklist = [
    { id: 'logo', label: 'تنظیم لوگوی فروشگاه', status: readiness?.logoSet, link: '/admin/settings', desc: 'آپلود لوگو برای هویت بصری فروشگاه' },
    { id: 'contact', label: 'ثبت اطلاعات تماس', status: readiness?.contactSet, link: '/admin/settings', desc: 'ثبت شماره تلفن و ایمیل جهت ارتباط خریداران' },
    { id: 'product', label: 'تعریف حداقل یک محصول فعال', status: readiness?.hasActiveProduct, link: '/admin/products/new', desc: 'افزودن اولین کالا برای شروع فروش' },
    { id: 'payment', label: 'فعال‌سازی روش پرداخت', status: readiness?.paymentSet, link: '/admin/settings', desc: 'اتصال درگاه پرداخت یا کارت به کارت' },
    { id: 'shipping', label: 'فعال‌سازی روش ارسال', status: readiness?.shippingSet, link: '/admin/settings', desc: 'تنظیم روش‌های ارسال کالا مانند تیپاکس' },
    { id: 'domain', label: 'اتصال دامنه اختصاصی', status: readiness?.domainSet, link: '/admin/settings/domains', desc: 'اتصال دامنه شخصی یا استفاده از ساب‌دامین' },
  ];

  const urgentTasks = [
    ...(orders?.new > 0 ? [{ id: 'new_orders', label: `${formatNum(orders.new)} سفارش جدید پرداخت‌شده`, desc: 'در انتظار تدارک و ارسال کالا', link: '/admin/orders', type: 'warning' }] : []),
    ...(alerts?.noImageProductsCount > 0 ? [{ id: 'no_image', label: `${formatNum(alerts.noImageProductsCount)} محصول بدون عکس`, desc: 'محصولات بدون تصویر جلب اعتماد نمی‌کنند', link: '/admin/products', type: 'info' }] : []),
    ...(alerts?.outOfStockProductsCount > 0 ? [{ id: 'out_of_stock', label: `${formatNum(alerts.outOfStockProductsCount)} محصول ناموجود`, desc: 'موجودی این کالاها به اتمام رسیده است', link: '/admin/products', type: 'danger' }] : []),
    ...(alerts?.failedPaymentsCount > 0 ? [{ id: 'failed_payments', label: `${formatNum(alerts.failedPaymentsCount)} پرداخت ناموفق (سبد رها شده)`, desc: 'مشتریانی که در پرداخت ناموفق بوده‌اند', link: '/admin/orders', type: 'danger' }] : []),
    ...(alerts?.incompletePaymentSettings ? [{ id: 'incomplete_payment', label: 'تنظیمات درگاه پرداخت ناقص است', desc: 'درگاه فعال است اما اطلاعات اتصال وارد نشده', link: '/admin/settings', type: 'danger' }] : []),
    ...(alerts?.notificationBotDisabled ? [{ id: 'bot_disabled', label: 'ربات‌های اعلان سفارش غیرفعال هستند', desc: 'برای دریافت اعلان سفارش روی بله یا تلگرام', link: '/admin/settings', type: 'info' }] : []),
  ];

  const shortcuts = [
    { label: 'افزودن محصول جدید', desc: 'تعریف کالای فیزیکی یا دیجیتال', icon: Package, link: '/admin/products/new', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30' },
    { label: 'مدیریت سفارش‌ها', desc: 'بررسی و تغییر وضعیت سفارشات', icon: ShoppingCart, link: '/admin/orders', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'ویرایش صفحه اصلی', desc: 'تغییر چیدمان و بنرهای سایت', icon: Settings, link: '/admin/settings/custom-home', color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/30' },
    { label: 'اتصال دامنه اختصاصی', desc: 'تنظیم دامنه شخصی دات‌آی‌آر یا دات‌کام', icon: Globe, link: '/admin/settings/domains', color: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30' },
    { label: 'کتابخانه تصاویر و رسانه', desc: 'مدیریت فایل‌ها و عکس‌های آپلود شده', icon: ImageIcon, link: '/admin/media', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' },
    { label: 'دستیار هوشمند فروشگاه', desc: 'تولید محتوا و تحلیل هوشمند با هوش مصنوعی', icon: Sparkles, link: '/admin/agent', color: 'text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-950/30' },
  ];

  // Widget Wrapper with enhanced glassmorphic and elegant styling
  const renderWidgetWrapper = (id: string, title: string, icon: any, children: React.ReactNode, isPinnedContainer = false) => {
    const isPinned = pinnedWidgets.includes(id);
    const hasDataToExport = data && [
      'orders_breakdown', 'traffic_chart', 'traffic_sources', 
      'customers_stats', 'low_stock', 'top_vs_unsold', 
      'latest_tickets', 'pending_reviews', 'failed_payments'
    ].includes(id);
    
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col min-w-0 relative group transition-all duration-300 hover:shadow-md hover:border-slate-200 dark:hover:border-slate-800">
        {/* Widget Header */}
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-850 pb-4 mb-5 select-none gap-4">
          <h3 className="text-[12px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-2.5 min-w-0 flex-1">
            <span className="p-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors shrink-0">
              {icon}
            </span>
            <span className="overflow-x-auto whitespace-nowrap scrollbar-none py-0.5">
              {title}
            </span>
          </h3>
          
          <div className="flex items-center gap-1.5 shrink-0">
            {hasDataToExport && (
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveExportMenu(prev => prev === id ? null : id);
                  }}
                  className={`p-2 rounded-xl transition-all duration-300 ${
                    activeExportMenu === id
                      ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/40'
                      : 'text-slate-300 hover:text-blue-600 hover:bg-slate-50 dark:text-slate-600 dark:hover:text-blue-400 dark:hover:bg-slate-800'
                  }`}
                  title="خروجی گرفتن از آمار این بخش"
                >
                  <Download className="w-4 h-4" />
                </button>

                {activeExportMenu === id && (
                  <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-2.5 z-50 animate-fade-in text-[10px] font-black text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(id, 'excel');
                        setActiveExportMenu(null);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      خروجی Excel (.xls)
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(id, 'csv');
                        setActiveExportMenu(null);
                      }}
                      className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors cursor-pointer border-none"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      خروجی استاندارد CSV
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => togglePinWidget(id)}
              className={`p-2 rounded-xl transition-all duration-300 ${
                isPinned 
                  ? 'text-blue-600 bg-blue-50 hover:bg-blue-100 dark:text-blue-400 dark:bg-blue-950/40 dark:hover:bg-blue-900/30 shadow-sm' 
                  : 'text-slate-300 hover:text-slate-600 hover:bg-slate-50 dark:text-slate-600 dark:hover:text-slate-400 dark:hover:bg-slate-800'
              }`}
              title={isPinned ? "برداشتن سنجاق از دسترسی سریع" : "سنجاق کردن به بخش دسترسی سریع"}
            >
              {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4 rotate-45 group-hover:rotate-0 transition-transform" />}
            </button>
          </div>
        </div>

        {/* Widget Body */}
        <div className="flex-1 flex flex-col min-w-0">
          {children}
        </div>
      </div>
    );
  };

  // Render Widget Helper with Custom layouts and dynamic content
  const renderWidget = (id: string, isPinnedSection = false) => {
    switch (id) {
      case 'orders_breakdown':
        return renderWidgetWrapper(
          'orders_breakdown',
          'وضعیت سفارشات و چرخه تدارکات',
          <Layers className="w-4.5 h-4.5" />,
          <div className="relative">
            {/* Visual connector line behind nodes (desktop layout only) */}
            <div className="hidden lg:block absolute top-[44px] left-12 right-12 h-1 bg-gradient-to-r from-amber-200 via-indigo-100 to-emerald-200 dark:from-amber-950/20 dark:via-indigo-950/20 dark:to-emerald-950/20 rounded-full -z-0" />
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-5 relative z-10">
              <Link href="/admin/orders?status=pending" className="bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-amber-200 dark:hover:border-amber-900/40 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 group">
                <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-amber-100/50 dark:border-amber-900/20">
                  <Clock className="w-5.5 h-5.5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">در انتظار پرداخت</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-2 tracking-tight">{formatNum(orders?.pending || 0)}</p>
              </Link>

              <Link href="/admin/orders?status=paid" className="bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-blue-200 dark:hover:border-blue-900/40 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 group">
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-blue-100/50 dark:border-blue-900/20">
                  <Package className="w-5.5 h-5.5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">جدید (آماده پردازش)</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-2 tracking-tight">{formatNum(orders?.new || 0)}</p>
              </Link>

              <Link href="/admin/orders?status=shipped" className="bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 group">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-indigo-100/50 dark:border-indigo-900/20">
                  <Truck className="w-5.5 h-5.5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">در حال ارسال مرسولات</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-2 tracking-tight">{formatNum(orders?.shipped || 0)}</p>
              </Link>

              <Link href="/admin/orders?status=delivered" className="bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-emerald-200 dark:hover:border-emerald-900/40 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 group">
                <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-emerald-100/50 dark:border-emerald-900/20">
                  <CheckCircle2 className="w-5.5 h-5.5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">تحویل‌شده و نهایی</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-2 tracking-tight">{formatNum(orders?.delivered || 0)}</p>
              </Link>

              <Link href="/admin/orders?status=cancelled" className="bg-slate-50/40 dark:bg-slate-900/20 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center hover:border-rose-200 dark:hover:border-rose-900/40 transition-all duration-300 hover:shadow-sm hover:-translate-y-0.5 group col-span-2 sm:col-span-1">
                <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-2xl flex items-center justify-center mb-3.5 transition-all duration-300 group-hover:scale-110 shadow-sm border border-rose-100/50 dark:border-rose-900/20">
                  <XCircle className="w-5.5 h-5.5" />
                </div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">مرجوعی / لغو شده</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-200 mt-2 tracking-tight">{formatNum(orders?.cancelled || 0)}</p>
              </Link>
            </div>
          </div>,
          isPinnedSection
        );

      case 'traffic_chart':
        return renderWidgetWrapper(
          'traffic_chart',
          'آنالیز ترافیک و نرخ تبدیل هوشمند (۷ روز اخیر)',
          <LineChart className="w-4.5 h-4.5" />,
          <div className="flex flex-col flex-1">
            <div className="flex items-center gap-5 text-[11px] font-black text-slate-400 dark:text-slate-500 mb-6 select-none">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/50"></span>
                بازدیدکننده یکتا (IP)
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 bg-indigo-300 dark:bg-indigo-800 rounded-full shadow-sm shadow-indigo-300/50"></span>
                کل صفحات مشاهده شده
              </span>
            </div>
            
            {/* Elegant SVG/CSS Bar Chart with interactive highlights */}
            <div className="flex-1 flex items-end justify-between h-64 px-2 border-b border-slate-100 dark:border-slate-800 pb-3 gap-2 sm:gap-3 select-none relative">
              {/* Horizontal faint background grid lines */}
              <div className="absolute inset-x-0 top-0 bottom-4 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-slate-100 dark:border-slate-800/60 w-full" />
                <div className="border-b border-slate-100 dark:border-slate-800/60 w-full" />
                <div className="border-b border-slate-100 dark:border-slate-800/60 w-full" />
                <div className="border-b border-slate-100 dark:border-slate-800/60 w-full" />
              </div>

              {traffic?.chartData?.map((day: any, idx: number) => {
                const visitorHeight = (day.visitors / maxChartVal) * 100;
                const viewHeight = (day.pageViews / maxChartVal) * 100;
                const isHovered = hoveredDay === idx;
                const anyHovered = hoveredDay !== null;

                return (
                  <div 
                    key={idx} 
                    className="flex flex-col items-center flex-1 group/bar relative z-10 h-full justify-end"
                    onMouseEnter={() => setHoveredDay(idx)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {/* Glowing day indicator */}
                    {isHovered && (
                      <div className="absolute inset-x-[-4px] top-0 bottom-0 bg-blue-500/[0.02] dark:bg-blue-500/[0.04] rounded-xl border-x border-blue-500/10 -z-10 animate-fade-in" />
                    )}

                    {/* Highly Polished Glassmorphic Tooltip */}
                    <div className={`absolute bottom-full mb-3 bg-slate-950/95 dark:bg-slate-900/98 text-white text-[10px] rounded-2xl py-3 px-3.5 transition-all duration-300 pointer-events-none z-20 flex flex-col gap-1.5 whitespace-nowrap shadow-xl border border-slate-800 dark:border-slate-800/50 backdrop-blur-md ${
                      isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95 pointer-events-none'
                    }`}>
                      <p className="font-black border-b border-slate-800 pb-1.5 mb-1.5 text-center text-blue-400 text-[11px] flex items-center justify-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {day.dayName} ({day.date})
                      </p>
                      <p className="flex justify-between gap-5 font-bold text-slate-300">
                        <span>بازدیدکننده یکتا:</span> 
                        <span className="text-white font-black">{formatNum(day.visitors)}</span>
                      </p>
                      <p className="flex justify-between gap-5 font-bold text-slate-300">
                        <span>کل بازدیدها:</span> 
                        <span className="text-white font-black">{formatNum(day.pageViews)}</span>
                      </p>
                      <div className="border-t border-slate-800 my-1 pt-1.5 flex justify-between gap-5 font-bold text-emerald-400">
                        <span className="flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />
                          سفارش‌های نهایی:
                        </span>
                        <span className="font-black">{formatNum(day.orders)} عدد</span>
                      </div>
                      <p className="flex justify-between gap-5 font-bold text-sky-400 text-[9px] border-t border-slate-800/60 pt-1">
                        <span>نرخ تبدیل تقریبی:</span>
                        <span>{day.visitors > 0 ? formatNum(Number(((day.orders / day.visitors) * 100).toFixed(1))) : '۰'}%</span>
                      </p>
                    </div>
                    
                    {/* Chart Bars (Clean & minimal colors) */}
                    <div className="w-full flex justify-center items-end gap-1.5 h-48 mb-1">
                      {/* Total Page Views Bar */}
                      <div 
                        className={`w-2.5 sm:w-3.5 bg-indigo-100 dark:bg-indigo-950/40 rounded-t-lg transition-all duration-500 ease-out ${
                          anyHovered ? (isHovered ? 'bg-indigo-200 dark:bg-indigo-950/70' : 'opacity-40') : ''
                        }`}
                        style={{ height: `${Math.max(viewHeight, 8)}%` }}
                      ></div>
                      {/* Unique Visitors Bar */}
                      <div 
                        className={`w-2.5 sm:w-3.5 bg-blue-500/85 rounded-t-lg transition-all duration-500 ease-out shadow-sm shadow-blue-500/10 ${
                          anyHovered ? (isHovered ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'opacity-40') : 'group-hover/bar:bg-blue-500'
                        }`}
                        style={{ height: `${Math.max(visitorHeight, 15)}%` }}
                      ></div>
                    </div>
                    
                    {/* X Axis Labels */}
                    <span className={`text-[10px] mt-2 transition-colors duration-200 font-bold ${
                      isHovered ? 'text-blue-500 font-black' : 'text-slate-400 dark:text-slate-500'
                    }`}>{day.date}</span>
                  </div>
                );
              })}
            </div>

            {/* Sub chart KPI analytics panels */}
            <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 text-center">
              <div className="p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">بازدید یکتای امروز</p>
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">{formatNum(traffic?.today || 0)}</p>
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20">
                  <TrendingUp className="w-2.5 h-2.5" />
                  تبدیل: {formatNum(Number(traffic?.conversionToday?.toFixed(1) || 0))}%
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">بازدید یکتای هفتگی</p>
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">{formatNum(traffic?.week || 0)}</p>
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20">
                  <TrendingUp className="w-2.5 h-2.5" />
                  تبدیل: {formatNum(Number(traffic?.conversionWeek?.toFixed(1) || 0))}%
                </span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/30">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">بازدید یکتای ماهانه</p>
                <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-1">{formatNum(traffic?.month || 0)}</p>
                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-extrabold mt-1 px-1.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/20">
                  <TrendingUp className="w-2.5 h-2.5" />
                  تبدیل: {formatNum(Number(traffic?.conversionMonth?.toFixed(1) || 0))}%
                </span>
              </div>
            </div>
          </div>,
          isPinnedSection
        );

      case 'traffic_sources':
        return renderWidgetWrapper(
          'traffic_sources',
          'منابع ورودی ترافیک کاربران (۳۰ روزه)',
          <Sparkles className="w-4.5 h-4.5 text-yellow-500" />,
          <div className="space-y-4.5 flex-1 justify-center flex flex-col select-none">
            {traffic?.sources?.map((source: any, idx: number) => {
              // Custom colors based on source
              const sourceColor = source.name.includes('گوگل') ? 'bg-blue-500' :
                                  source.name.includes('مستقیم') ? 'bg-emerald-500' :
                                  source.name.includes('اینستاگرام') ? 'bg-pink-500' :
                                  source.name.includes('تلگرام') ? 'bg-cyan-500' : 'bg-amber-500';

              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-black">
                    <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${sourceColor}`} />
                      {source.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {formatNum(source.percentage)}% <span className="text-[10px] font-medium text-slate-400">({formatNum(source.count)} کاربر)</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-50 dark:bg-slate-800/60 h-2 rounded-full overflow-hidden border border-slate-100/10">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${sourceColor}`} 
                      style={{ width: `${source.percentage}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>,
          isPinnedSection
        );

      case 'customers_stats':
        return renderWidgetWrapper(
          'customers_stats',
          'وفاداری مشتریان و بازگشت خرید',
          <HeartHandshake className="w-4.5 h-4.5" />,
          <div className="flex flex-col flex-1 justify-between gap-6 select-none">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 text-center hover:border-slate-200 dark:hover:border-slate-750 transition-all duration-300">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">ثبت‌نام جدید (۳۰ روزه)</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{formatNum(customers?.newCount || 0)} نفر</p>
              </div>
              <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 text-center hover:border-slate-200 dark:hover:border-slate-750 transition-all duration-300">
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500">خریداران فعال (۳۰ روزه)</p>
                <p className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">{formatNum(customers?.activeCount || 0)} نفر</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex justify-between text-[11px] font-black">
                <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                  نرخ وفاداری و بازگشت مشتری (Retention)
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-black">{formatNum(Number(customers?.retentionRate?.toFixed(1) || 0))}%</span>
              </div>
              <div className="w-full bg-slate-50 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-100/10">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-1000 ease-out" 
                  style={{ width: `${customers?.retentionRate || 0}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold pt-1">
                <span>کل باشگاه مشتریان: {formatNum(customers?.totalCustomers || 0)} نفر</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">فوق‌العاده عالی</span>
              </div>
            </div>
          </div>,
          isPinnedSection
        );

      case 'low_stock':
        return renderWidgetWrapper(
          'low_stock',
          'وضعیت موجودی انبار کالاها (رو به اتمام)',
          <AlertTriangle className="w-4.5 h-4.5 text-amber-500" />,
          <div className="flex-1 flex flex-col min-w-0">
            {inventory?.lowStock?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">موجود انبار در وضعیت عالی است</p>
              </div>
            ) : (
              <div className="flex-1 overflow-x-auto custom-scrollbar min-w-0">
                <table className="w-full text-right text-[11px] min-w-[350px]">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 dark:text-slate-500 pb-2 select-none font-bold">
                      <th className="py-2.5 font-black">تصویر</th>
                      <th className="py-2.5 pr-2 font-black">عنوان محصول</th>
                      <th className="py-2.5 font-black">قیمت فروش</th>
                      <th className="py-2.5 text-center font-black">درصد سلامت انبار</th>
                      <th className="py-2.5 text-center font-black">تعداد باقیمانده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800/20">
                    {inventory?.lowStock?.map((prod: any) => {
                      const stockPct = prod.stock === 0 ? 0 : prod.stock >= 5 ? 100 : (prod.stock / 5) * 100;
                      const barColor = prod.stock === 0 ? 'bg-red-500' :
                                       prod.stock <= 2 ? 'bg-orange-500' : 'bg-amber-500';

                      return (
                        <tr key={prod.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                          <td className="py-2.5">
                            <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden shadow-sm">
                              {prod.imageUrl ? (
                                <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700 bg-slate-100 dark:bg-slate-800"><Package size={14} /></div>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 pr-2 font-black text-slate-700 dark:text-slate-300 max-w-[140px] truncate" title={prod.title}>
                            {prod.title}
                          </td>
                          <td className="py-2.5 font-bold text-slate-500 dark:text-slate-400">{formatPrice(prod.price)}</td>
                          <td className="py-2.5 px-4">
                            <div className="w-full bg-slate-50 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden border border-slate-100/10">
                              <div className={`h-full rounded-full ${barColor}`} style={{ width: `${stockPct}%` }} />
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black shadow-sm ${
                              prod.stock === 0 
                                ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' 
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                            }`}>
                              {prod.stock === 0 ? 'ناموجود شد!' : `${formatNum(prod.stock)} عدد`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>,
          isPinnedSection
        );

      case 'top_vs_unsold':
        return renderWidgetWrapper(
          'top_vs_unsold',
          'تحلیل فروش کالاها و بهینه‌سازی کاتالوگ',
          <Sparkles className="w-4.5 h-4.5 text-yellow-500" />,
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
            {/* Top products */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-850 pb-2 select-none uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                کالاهای پرفروش و محبوب
              </h4>
              {inventory?.topSelling?.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8">هنوز هیچ فروشی ثبت نشده است</p>
              ) : (
                <div className="space-y-3.5">
                  {inventory?.topSelling?.map((prod: any, i: number) => (
                    <div key={prod.id || i} className="flex items-center gap-3 bg-slate-50/20 dark:bg-slate-900/10 p-2 rounded-2xl border border-slate-100/10 hover:border-slate-100 dark:hover:border-slate-800 transition-all duration-300">
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-750 bg-slate-100 dark:bg-slate-800"><Package size={14} /></div>
                          )}
                        </div>
                        {/* Gold, Silver, Bronze Badges */}
                        <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white border border-white shadow-sm ${
                          i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-600' : 'bg-slate-500'
                        }`}>
                          {i + 1}
                        </div>
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 truncate" title={prod.title}>{prod.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{formatPrice(prod.price)}</p>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 text-[10px] font-black px-2.5 py-1 rounded-full shrink-0 shadow-sm">
                        {formatNum(prod.salesCount)} فروش
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unsold products */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 border-b border-slate-50 dark:border-slate-850 pb-2 select-none uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                کالاهای بدون فروش اخیر
              </h4>
              {inventory?.unsold?.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-8 font-bold text-emerald-500">همه کالاها فروش داشته‌اند! آفرین</p>
              ) : (
                <div className="space-y-3.5">
                  {inventory?.unsold?.map((prod: any, i: number) => (
                    <div key={prod.id || i} className="flex items-center gap-3 bg-slate-50/20 dark:bg-slate-900/10 p-2 rounded-2xl border border-slate-100/10 hover:border-slate-100 dark:hover:border-slate-800 transition-all duration-300">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 dark:border-slate-800 shrink-0 overflow-hidden shadow-sm">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-750 bg-slate-100 dark:bg-slate-800"><Package size={14} /></div>
                        )}
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="text-xs font-black text-slate-750 dark:text-slate-350 truncate" title={prod.title}>{prod.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{formatPrice(prod.price)}</p>
                      </div>
                      <span className="bg-slate-50 text-slate-500 dark:bg-slate-800/60 dark:text-slate-400 text-[10px] font-black px-2.5 py-1 rounded-full shrink-0">
                        نیازمند تخفیف
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>,
          isPinnedSection
        );

      case 'latest_orders':
        return renderWidgetWrapper(
          'latest_orders',
          'سفارش‌های جدید و در انتظار پردازش',
          <ShoppingCart className="w-4.5 h-4.5 text-emerald-500" />,
          <div className="flex-1 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin">
            {!orders?.latestList || orders.latestList.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950/20 text-slate-400 flex items-center justify-center mb-3">
                  <ShoppingCart className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">هیچ سفارش جدیدی یافت نشد</p>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1 flex flex-col justify-start pl-1">
                {orders.latestList.map((order: any) => (
                  <Link href={`/admin/orders?search=${order.id}`} key={order.id} className="group block bg-slate-50/40 hover:bg-white dark:bg-slate-900/10 dark:hover:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 transition-all duration-300 hover:shadow-sm">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[150px] font-black flex items-center gap-1.5" title={order.id}>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        سفارش {order.id.slice(-8).toUpperCase()}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                        order.status === 'paid' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        order.status === 'pending' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {order.status === 'paid' ? 'پرداخت شده' : order.status === 'pending' ? 'در انتظار پرداخت' : order.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-slate-800/20 pt-2.5">
                      <span className="text-slate-500 dark:text-slate-400 flex flex-col gap-0.5">
                        <span>مشتری: <strong className="text-slate-600 dark:text-slate-300 font-black">{order.user?.name || 'مشتری جدید'}</strong></span>
                        <span>مبلغ: <strong className="text-slate-700 dark:text-slate-200 font-black">{formatPrice(order.finalAmount)}</strong></span>
                      </span>
                      <span className="flex items-center gap-1 self-end">
                        <Calendar className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>,
          isPinnedSection
        );

      case 'latest_tickets':
        return renderWidgetWrapper(
          'latest_tickets',
          'پشتیبانی و تیکت‌های اخیر در انتظار پاسخ',
          <Headphones className="w-4.5 h-4.5" />,
          <div className="flex-1 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin">
            {alerts?.urgentTickets?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">هیچ تیکت بدون پاسخی وجود ندارد</p>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1 flex flex-col justify-start pl-1">
                {alerts?.urgentTickets?.map((ticket: any) => (
                  <Link href={`/admin/tickets/${ticket.id}`} key={ticket.id} className="group block bg-slate-50/40 hover:bg-white dark:bg-slate-900/10 dark:hover:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 transition-all duration-300 hover:shadow-sm">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-[150px] font-black flex items-center gap-1.5" title={ticket.subject}>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        {ticket.subject === 'return' ? 'درخواست مرجوعی کالا' : 
                         ticket.subject === 'shipping' ? 'مشکل در ارسال بار' : 
                         ticket.subject === 'payment' ? 'اختلال درگاه پرداخت' : 'سایر موارد فنی'}
                      </span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm ${
                        ticket.priority === 'urgent' ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' :
                        ticket.priority === 'high' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {ticket.priority === 'urgent' ? 'فوری / بحرانی' : ticket.priority === 'high' ? 'مهم' : 'معمولی'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-4 text-[10px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-slate-800/20 pt-2.5">
                      <span className="text-slate-500 dark:text-slate-400">کاربر: <strong className="text-slate-600 dark:text-slate-300 font-black">{ticket.user?.name || 'مشتری جدید'}</strong></span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>,
          isPinnedSection
        );

      case 'pending_reviews':
        return renderWidgetWrapper(
          'pending_reviews',
          'دیدگاه‌های تازه (در انتظار تایید مدیریت)',
          <MessageSquare className="w-4.5 h-4.5 text-blue-500" />,
          <div className="flex-1 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin">
            {alerts?.urgentReviews?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">نظری برای تایید ثبت نشده است</p>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1 flex flex-col justify-start pl-1">
                {alerts?.urgentReviews?.map((rev: any) => (
                  <div key={rev.id} className="bg-slate-50/40 dark:bg-slate-900/10 p-3.5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 hover:shadow-sm transition-all duration-300">
                    <div className="flex justify-between items-center font-bold">
                      <span className="text-[11px] text-slate-800 dark:text-slate-200 font-black flex items-center gap-1.5">
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center font-bold text-[10px]">
                          {rev.user?.name ? rev.user.name.charAt(0) : 'ک'}
                        </span>
                        {rev.user?.name || 'کاربر میهمان'}
                      </span>
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5 font-black bg-amber-500/5 px-2 py-0.5 rounded-full border border-amber-500/10">
                        ★ {formatNum(rev.rating)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 line-clamp-2 leading-relaxed italic bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-50 dark:border-slate-800/50">
                      « {rev.comment} »
                    </p>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-2.5 font-bold truncate max-w-[280px]">محصول: <span className="text-slate-500 dark:text-slate-400 font-black">{rev.product?.title}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>,
          isPinnedSection
        );

      case 'failed_payments':
        return renderWidgetWrapper(
          'failed_payments',
          'پرداخت‌های ناموفق (پیگیری هوشمند فروش)',
          <XCircle className="w-4.5 h-4.5 text-rose-500" />,
          <div className="flex-1 flex flex-col max-h-[320px] overflow-y-auto scrollbar-thin">
            {alerts?.failedPaymentsList?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center flex-1">
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-black text-slate-500 dark:text-slate-400">تلاش پرداخت ناموفقی نداشته‌اید</p>
              </div>
            ) : (
              <div className="space-y-3.5 flex-1 flex flex-col justify-start pl-1">
                {alerts?.failedPaymentsList?.map((pay: any) => (
                  <div key={pay.id} className="group bg-slate-50/40 dark:bg-slate-900/10 p-3.5 rounded-2xl border border-slate-100/80 dark:border-slate-800/80 shadow-sm flex flex-col gap-2.5 hover:shadow-md transition-all duration-300">
                    <div className="flex justify-between items-center text-xs font-black">
                      <span className="text-slate-700 dark:text-slate-300">{pay.user?.name || 'مشتری ناشناس'}</span>
                      <span className="text-rose-600 dark:text-rose-400 font-black">{formatPrice(pay.finalAmount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-slate-500 font-bold border-t border-slate-50 dark:border-slate-800/20 pt-2">
                      <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                        <Phone className="w-3 h-3 text-blue-500 animate-bounce" />
                        همراه: {pay.user?.phone ? formatNum(pay.user.phone) : 'بدون شماره'}
                      </span>
                      <span>{new Date(pay.createdAt).toLocaleDateString('fa-IR')}</span>
                    </div>
                    {pay.user?.phone && (
                      <a 
                        href={`tel:${pay.user.phone}`} 
                        className="mt-1 w-full bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-3 rounded-xl text-[10px] font-black text-center transition-all duration-200 shadow-sm shadow-blue-500/10 flex items-center justify-center gap-1 hover:shadow-md hover:scale-[1.01]"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        تماس جهت پیگیری و بازیابی سبد خرید
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>,
          isPinnedSection
        );

      default:
        return null;
    }
  };

  // Visibility calculation for widgets
  const showOrdersBreakdown = !pinnedWidgets.includes('orders_breakdown');
  const showTrafficChart = !pinnedWidgets.includes('traffic_chart');
  const showTrafficSources = !pinnedWidgets.includes('traffic_sources');
  const showCustomersStats = !pinnedWidgets.includes('customers_stats');
  const showLowStock = !pinnedWidgets.includes('low_stock');
  const showTopVsUnsold = !pinnedWidgets.includes('top_vs_unsold');
  const showLatestOrders = !pinnedWidgets.includes('latest_orders');
  const showLatestTickets = !pinnedWidgets.includes('latest_tickets');
  const showPendingReviews = !pinnedWidgets.includes('pending_reviews');
  const showFailedPayments = !pinnedWidgets.includes('failed_payments');

  const rightColWidgetsCount = (showTrafficSources ? 1 : 0) + (showCustomersStats ? 1 : 0);
  const showTrafficRow = showTrafficChart || rightColWidgetsCount > 0;
  const showInventoryRow = showLowStock || showTopVsUnsold;

  const alertWidgetsCount = (showLatestOrders ? 1 : 0) + (showLatestTickets ? 1 : 0) + (showPendingReviews ? 1 : 0) + (showFailedPayments ? 1 : 0);
  const showAlertsRow = alertWidgetsCount > 0;

  const alertGridClass = alertWidgetsCount >= 4
    ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
    : alertWidgetsCount === 3 
      ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
      : alertWidgetsCount === 2 
        ? "grid grid-cols-1 md:grid-cols-2 gap-6" 
        : "grid grid-cols-1 gap-6";

  return (
    <div className="max-w-7xl mx-auto space-y-8 select-none">
      
      {showWizard && profile && (
        <SetupWizard
          shopName={profile.shopName || ''}
          contactPhone={profile.phone || ''}
          contactEmail={profile.email || ''}
          onComplete={() => {
            setShowWizard(false);
            window.location.reload();
          }}
        />
      )}

      {profile && profile.setupWizardCompleted === false && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-6 md:p-8 text-white shadow-2xl shadow-indigo-500/10">
          {/* Ambient Glows */}
          <div className="absolute -right-20 -top-20 w-64 h-64 bg-violet-600/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse delay-1000"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-4 max-w-xl text-right">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 text-violet-300 border border-violet-500/20 text-[10px] font-black tracking-wide">
                <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                دستیار هوشمند راه‌اندازی فروشگاه فعال است
              </div>
              
              <h2 className="text-xl md:text-2xl font-black leading-tight">
                فروشگاه جدید شما آماده پرواز است! 🚀
              </h2>
              
              <p className="text-xs md:text-sm text-slate-300 font-bold leading-relaxed">
                برای اینکه سایت شما از حالت خام خارج شده و دکوراسیون، رنگ‌بندی، منوها و محصولات نمونه متناسب با صنف شما به طور خودکار چیده شوند، جادوگر هوش مصنوعی را آغاز کنید. این فرآیند کمتر از ۳۰ ثانیه زمان می‌برد!
              </p>

              {/* Bullet points of features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px] font-black text-slate-200 text-right" dir="rtl">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-violet-500/20 text-violet-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  تنظیم رنگ‌بندی و هویت بصری فروشگاه
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-violet-500/20 text-violet-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  ایجاد محصولات تستی و دسته‌بندی‌های صنف شما
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-violet-500/20 text-violet-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  نگارش هوشمند بیانیه برند و متون سئو
                </div>
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-violet-500/20 text-violet-400 rounded-lg shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  ثبت اطلاعات تماس و آدرس پشتیبانی
                </div>
              </div>
            </div>

            <div className="shrink-0 w-full md:w-auto flex flex-col items-center gap-3">
              {/* Glowing Orb Illustration */}
              <div className="hidden md:flex items-center justify-center w-24 h-24 relative mb-2">
                <div className="absolute inset-0 bg-violet-500/10 rounded-full blur-lg animate-pulse"></div>
                <div className="absolute inset-0 border border-dashed border-violet-500/30 rounded-full animate-spin" style={{ animationDuration: '12s' }}></div>
                <div className="w-14 h-14 bg-gradient-to-tr from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-violet-600/30 border border-white/20">
                  <Sparkles className="w-7 h-7 text-white animate-pulse" />
                </div>
              </div>

              <button
                onClick={() => setShowWizard(true)}
                className="w-full md:w-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black text-xs shadow-lg shadow-violet-600/20 hover:shadow-xl hover:shadow-violet-600/30 transition-all hover:scale-[1.03] active:scale-[0.97] flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                شروع راه‌اندازی هوشمند ✨
              </button>
              <span className="text-[9px] text-slate-400 font-bold">راه‌اندازی خودکار در ۳ گام ساده</span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Welcome Banner and System Status */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.04] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
        <div className="absolute right-0 top-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
        
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-800 dark:text-white">
              {profile?.user?.name ? `${profile.user.name} عزیز، ${greeting}` : `مدیر گرامی، ${greeting}`}
            </h1>
            <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
          </div>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1.5">
            <LayoutDashboard className="w-4 h-4 text-slate-400" />
            فروشگاه شما: <strong className="text-blue-600 dark:text-blue-400 font-black">{profile?.shopName || 'در حال بارگذاری...'}</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10 w-full md:w-auto shrink-0">
          {/* Active System Status capsule for sensitive websites */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/10 dark:border-emerald-500/5 font-extrabold text-[10px] shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            هسته‌ی مرکزی سیستم: فعال و پایدار
          </div>

          {data && (
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveExportMenu(prev => prev === 'global_dashboard' ? null : 'global_dashboard');
                }}
                className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl font-black text-[11px] shadow-sm transition-all duration-200 active:scale-95 cursor-pointer w-full md:w-auto hover:shadow-md ${
                  activeExportMenu === 'global_dashboard'
                    ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-900'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-750'
                }`}
                title="دانلود گزارش جامع کل داشبورد"
              >
                <Download className="w-3.5 h-3.5 text-blue-500" />
                خروجی جامع داشبورد
              </button>

              {activeExportMenu === 'global_dashboard' && (
                <div className="absolute left-0 mt-2 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-150 dark:border-slate-800 py-2.5 z-50 animate-fade-in text-[10px] font-black text-right">
                  <div className="px-4 py-1.5 border-b border-slate-50 dark:border-slate-800 mb-1.5 text-slate-400 dark:text-slate-500 select-none">
                    کل گزارش‌های آماری (یکجا)
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGlobalExport('excel');
                      setActiveExportMenu(null);
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors border-none cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    خروجی Excel جامع (.xls)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGlobalExport('csv');
                      setActiveExportMenu(null);
                    }}
                    className="w-full text-right px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors border-none cursor-pointer"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    خروجی CSV جامع (.csv)
                  </button>
                </div>
              )}
            </div>
          )}

          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center justify-center gap-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-800 px-4 py-2.5 rounded-xl font-black text-[11px] shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer w-full md:w-auto hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-500' : 'text-slate-400'}`} />
            به‌روزرسانی داده‌ها
          </button>
        </div>
      </div>

      {/* مرکز کنترل و آماده‌سازی فروشگاه (Control Center & Store Readiness) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ستون اول و دوم: چک‌لیست آماده‌سازی و میانبرهای سریع */}
        <div className="lg:col-span-2 space-y-6">
          {/* بخش چک‌لیست آماده‌سازی */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 dark:border-slate-800/50 pb-4 select-none">
              <div className="space-y-1">
                <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  چک‌لیست راه‌اندازی و آماده‌سازی فروشگاه
                </h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">مراحل زیر را تکمیل کنید تا فروشگاه شما آماده پذیرش مشتری و ثبت سفارش شود.</p>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex-1 sm:w-32 bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${readiness?.percentage || 0}%` }}
                  />
                </div>
                <span className="text-xs font-black text-blue-600 dark:text-blue-400 shrink-0">
                  {formatNum(readiness?.percentage || 0)}٪ تکمیل شده
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {checklist.map((item) => (
                <div 
                  key={item.id} 
                  className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                    item.status 
                      ? 'bg-emerald-500/[0.02] border-emerald-500/10 dark:border-emerald-500/5' 
                      : 'bg-slate-500/[0.01] border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="mt-0.5 shrink-0">
                    {item.status ? (
                      <div className="p-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-lg">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-1 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-lg animate-pulse">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h3 className={`text-xs font-black truncate ${item.status ? 'text-slate-700 dark:text-slate-300' : 'text-slate-800 dark:text-white'}`}>
                      {item.label}
                    </h3>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed truncate">
                      {item.desc}
                    </p>
                    {!item.status && (
                      <Link 
                        href={item.link} 
                        className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 dark:text-blue-400 hover:underline pt-1"
                      >
                        <span>تکمیل این مرحله</span>
                        <ArrowLeft className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* بخش میانبرهای سریع */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="border-b border-slate-50 dark:border-slate-800/50 pb-3 select-none">
              <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                دسترسی‌های سریع و کارهای روزمره
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">برای انجام کارهای پرتکرار روزانه از میانبرهای زیر استفاده کنید.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {shortcuts.map((shortcut, index) => {
                const Icon = shortcut.icon;
                return (
                  <Link 
                    key={index} 
                    href={shortcut.link}
                    className="flex items-start gap-3.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 hover:border-slate-200 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-all group cursor-pointer"
                  >
                    <div className={`p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110 ${shortcut.color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <h3 className="text-xs font-black text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {shortcut.label}
                      </h3>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                        {shortcut.desc}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* ستون سوم: کارهای فوری و ضروری */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col h-full space-y-4">
          <div className="border-b border-slate-50 dark:border-slate-800/50 pb-3 select-none">
            <h2 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse" />
              کارهای فوری و ضروری
            </h2>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">مواردی که نیاز به بررسی و اقدام سریع دارند.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 max-h-[460px] pr-1 custom-scrollbar">
            {urgentTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 px-4 space-y-3 select-none">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full">
                  <ThumbsUp className="w-8 h-8 animate-bounce" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-black text-slate-800 dark:text-white">همه چیز عالی است!</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">هیچ کار فوری یا هشدار بحرانی در فروشگاه شما وجود ندارد.</p>
                </div>
              </div>
            ) : (
              urgentTasks.map((task) => (
                <div 
                  key={task.id}
                  className={`p-3.5 rounded-2xl border flex gap-3 items-start justify-between transition-all hover:scale-[1.01] ${
                    task.type === 'danger'
                      ? 'bg-rose-500/[0.02] border-rose-500/10 dark:border-rose-500/5'
                      : task.type === 'warning'
                        ? 'bg-amber-500/[0.02] border-amber-500/10 dark:border-amber-500/5'
                        : 'bg-blue-500/[0.02] border-blue-500/10 dark:border-blue-500/5'
                  }`}
                >
                  <div className="flex gap-3 min-w-0">
                    <div className={`p-1.5 rounded-xl shrink-0 ${
                      task.type === 'danger'
                        ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500'
                        : task.type === 'warning'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-500'
                          : 'bg-blue-50 dark:bg-blue-950/30 text-blue-500'
                    }`}>
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h4 className="text-xs font-black text-slate-800 dark:text-white truncate">{task.label}</h4>
                      <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{task.desc}</p>
                    </div>
                  </div>
                  <Link 
                    href={task.link}
                    className="p-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors shrink-0"
                    title="اقدام و بررسی"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Analyst Widget */}
      <div className={`bg-white dark:bg-slate-900 rounded-3xl p-5 space-y-4 shadow-xs hover:shadow-md transition-all duration-300 border ${
        analystPinned 
          ? 'border-purple-300 dark:border-purple-800/80 ring-2 ring-purple-500/5' 
          : 'border-slate-100 dark:border-slate-800/80'
      }`}>
        <div className="flex justify-between items-center cursor-pointer select-none" onClick={handleToggleOpen}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-inner shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse text-purple-500 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                دستیار رشد و مارکتینگ هوشمند (AI)
                <span className="text-[8px] font-black bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full">پیشنهادهای طلایی</span>
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 font-bold">
                ترفندهای فوق‌العاده کوتاه و کاربردی برای افزایش فروش با قابلیت اجرای خودکار
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={toggleAnalystPin}
              className={`p-1.5 rounded-xl transition-all duration-200 cursor-pointer ${
                analystPinned 
                  ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400'
              }`}
              title={analystPinned ? "برداشتن پین (بستن خودکار)" : "پین کردن (همیشه باز بماند)"}
            >
              <Pin className={`w-4 h-4 ${analystPinned ? 'fill-purple-600 dark:fill-purple-400 rotate-45' : ''}`} />
            </button>
            <button className="p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 transition-colors">
              {analystOpen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 15l7-7 7 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" /></svg>
              )}
            </button>
          </div>
        </div>

        {analystOpen && (
          <div className="pt-3.5 border-t border-slate-50 dark:border-slate-800/50 space-y-4 animate-in fade-in duration-300">
            {/* Tabs for Analysis Type */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleTabChange('daily')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                    analystType === 'daily'
                      ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/10'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  تحلیل روزانه
                </button>
                
                <div className="relative group">
                  <button
                    disabled={shopAgeInDays < 7}
                    onClick={() => handleTabChange('weekly')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                      shopAgeInDays < 7
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500'
                        : analystType === 'weekly'
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/10 cursor-pointer'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer'
                    }`}
                  >
                    تحلیل هفتگی
                  </button>
                  {shopAgeInDays < 7 && (
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-950 text-white text-[9px] font-bold p-2 rounded-xl shadow-xl z-50 text-center leading-relaxed">
                      این فروشگاه کمتر از یک هفته است که ساخته شده و داده‌های کافی برای تحلیل هفتگی وجود ندارد. (سن فروشگاه: {shopAgeInDays} روز)
                    </div>
                  )}
                </div>

                <div className="relative group">
                  <button
                    disabled={shopAgeInDays < 30}
                    onClick={() => handleTabChange('monthly')}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                      shopAgeInDays < 30
                        ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500'
                        : analystType === 'monthly'
                          ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/10 cursor-pointer'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 cursor-pointer'
                    }`}
                  >
                    تحلیل ماهانه
                  </button>
                  {shopAgeInDays < 30 && (
                    <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-slate-950 text-white text-[9px] font-bold p-2 rounded-xl shadow-xl z-50 text-center leading-relaxed">
                      این فروشگاه کمتر از یک ماه است که ساخته شده و داده‌های کافی برای تحلیل ماهانه وجود ندارد. (سن فروشگاه: {shopAgeInDays} روز)
                    </div>
                  )}
                </div>
              </div>

              {/* Limit counter */}
              <div className="text-[9px] font-black text-slate-400 dark:text-slate-500 flex items-center gap-1.5 select-none pl-1">
                <span className={`w-1.5 h-1.5 rounded-full ${analystManualCount >= 2 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`} />
                تحلیل دستی امروز: {analystManualCount} از ۲
              </div>
            </div>

            {analystLoading ? (
              <div className="flex flex-col items-center justify-center py-10 space-y-2.5 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-purple-500/10 border-t-purple-600 animate-spin"></div>
                <p className="text-[10px] font-black text-slate-500 dark:text-slate-400">در حال دریافت ترفندهای طلایی...</p>
              </div>
            ) : analystError ? (
              <div className="p-3 bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100/50 dark:border-rose-900/20 rounded-2xl flex justify-between items-center gap-4">
                <p className="text-[10px] font-bold text-rose-600 dark:text-rose-400">{analystError}</p>
                <button
                  onClick={() => loadAnalystData(analystType, false)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  تلاش مجدد
                </button>
              </div>
            ) : !analystData ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold max-w-sm leading-relaxed">
                  با کلیک روی دکمه زیر، هوش مصنوعی داده‌های فروشگاه را تحلیل کرده و ترفندهای سریع افزایش فروش را به همراه دکمه‌های اجرای خودکار ارائه می‌دهد.
                </p>
                <button
                  onClick={() => loadAnalystData(analystType, false)}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black shadow-sm transition-all duration-200 active:scale-97 flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                  دریافت ترفندهای طلایی فروش
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Alerts & Suggestions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Alerts */}
                  {analystData.alerts && analystData.alerts.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black text-red-500 uppercase tracking-wider block select-none">🚨 اقدامات فوری امروز</span>
                      <div className="space-y-2">
                        {analystData.alerts.map((alert: any, idx: number) => (
                          <div key={idx} className="p-3 bg-red-50/30 dark:bg-red-950/10 border border-red-100/30 dark:border-red-900/10 rounded-2xl flex justify-between items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] font-black text-red-800 dark:text-red-300 truncate">{alert.title}</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-relaxed truncate">{alert.description}</p>
                            </div>
                            {alert.action && (
                              <Link
                                href={alert.action.url}
                                className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[9px] font-black transition-all active:scale-95 shrink-0 shadow-xs cursor-pointer"
                              >
                                {alert.action.label}
                              </Link>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Suggestions */}
                  {analystData.suggestions && analystData.suggestions.length > 0 && (
                    <div className="space-y-2.5">
                      <span className="text-[9px] font-black text-amber-500 uppercase tracking-wider block select-none">💡 ترفندهای طلایی رشد</span>
                      <div className="space-y-2">
                        {analystData.suggestions.map((sug: any, idx: number) => (
                          <div key={idx} className="p-3 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/40 rounded-2xl flex justify-between items-center gap-3 group hover:border-purple-200/60 dark:hover:border-purple-900/30 transition-all duration-300">
                            <div className="min-w-0 flex-1">
                              <h4 className="text-[11px] font-black text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors truncate">{sug.title}</h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 leading-relaxed truncate" title={sug.trick}>{sug.trick}</p>
                            </div>
                            {sug.smartAction && sug.smartAction.type !== 'none' && (
                              <button
                                onClick={() => {
                                  const url = `${sug.smartAction.payload.url}?aiPrompt=${encodeURIComponent(sug.smartAction.payload.prompt)}`;
                                  window.location.href = url;
                                }}
                                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-[9px] font-black transition-all active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                                title="اجرای خودکار با دستیار هوشمند"
                              >
                                <Sparkles className="w-3 h-3 text-yellow-300" />
                                اجرای خودکار
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Strategic Proposal */}
                {analystData.strategicProposal && (
                  <div className="p-3 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] border border-emerald-500/10 dark:border-emerald-500/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-450 leading-relaxed">
                        <strong className="text-emerald-700 dark:text-emerald-400 font-extrabold ml-1">پیشنهاد استراتژیک:</strong>
                        {typeof analystData.strategicProposal === 'object' ? analystData.strategicProposal.text : analystData.strategicProposal}
                      </p>
                    </div>
                    {typeof analystData.strategicProposal === 'object' && analystData.strategicProposal.smartAction && analystData.strategicProposal.smartAction.type !== 'none' && (
                      <button
                        onClick={() => {
                          const action = analystData.strategicProposal.smartAction;
                          const url = `${action.payload.url}?aiPrompt=${encodeURIComponent(action.payload.prompt)}`;
                          window.location.href = url;
                        }}
                        className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[9px] font-black transition-all active:scale-95 shrink-0 flex items-center gap-1 cursor-pointer"
                        title="اجرای خودکار پیشنهاد استراتژیک"
                      >
                        <Sparkles className="w-3 h-3 text-yellow-300" />
                        اجرای خودکار
                      </button>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => loadAnalystData(analystType, true)}
                    disabled={analystLoading || analystManualCount >= 2}
                    className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    title={analystManualCount >= 2 ? "سقف ۲ تحلیل دستی امروز پر شده است" : "به‌روزرسانی و دریافت تحلیل جدید دستی"}
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${analystLoading ? 'animate-spin' : ''}`} />
                    به‌روزرسانی تحلیل جدید
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ۱. Financial KPI Metrics */}
      <div className="space-y-4">
        <div className="flex justify-between items-center select-none">
          <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
            خلاصه عملکرد مالی و شاخص‌های کلیدی (KPIs)
          </h2>
          {data && (
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveExportMenu(prev => prev === 'financial_kpis' ? null : 'financial_kpis');
                }}
                className={`p-1.5 rounded-lg transition-all duration-300 text-[10px] font-black flex items-center gap-1 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 ${
                  activeExportMenu === 'financial_kpis'
                    ? 'text-blue-600 border-blue-200'
                    : 'text-slate-500 hover:text-blue-600 hover:border-slate-200 dark:text-slate-400 dark:hover:text-blue-400'
                }`}
                title="خروجی مالی"
              >
                <Download className="w-3.5 h-3.5" />
                <span>خروجی مالی</span>
              </button>

              {activeExportMenu === 'financial_kpis' && (
                <div className="absolute left-0 mt-1.5 w-44 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-fade-in text-[10px] font-black text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('financial_kpis', 'excel');
                      setActiveExportMenu(null);
                    }}
                    className="w-full text-right px-4 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors border-none cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    خروجی Excel (.xls)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport('financial_kpis', 'csv');
                      setActiveExportMenu(null);
                    }}
                    className="w-full text-right px-4 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-2 transition-colors border-none cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                    خروجی CSV
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="فروش و درآمد امروز"
            value={formatPrice(financials?.today?.revenue || 0)}
            subValue={`دیروز: ${formatPrice(financials?.today?.prevRevenue || 0)}`}
            icon={DollarSign}
            colorTheme="emerald"
            trend={{
              percentage: financials?.today?.percentage || 0,
              isPositive: financials?.today?.percentage >= 0
            }}
          />
          <StatCard 
            title="سفارشات امروز"
            value={financials?.todayOrders ? `${formatNum(financials.todayOrders.count)} سفارش` : '۰ سفارش'}
            subValue={`دیروز: ${formatNum(financials?.todayOrders?.prevCount || 0)} سفارش`}
            icon={ShoppingCart}
            colorTheme="indigo"
            trend={{
              percentage: financials?.todayOrders?.percentage || 0,
              isPositive: financials?.todayOrders?.percentage >= 0
            }}
          />
          <StatCard 
            title="میانگین ارزش سبد امروز"
            value={formatPrice(Math.round(financials?.todayAov?.value || 0))}
            subValue={`دیروز: ${formatPrice(Math.round(financials?.todayAov?.prevValue || 0))}`}
            icon={RotateCcw}
            colorTheme="amber"
            trend={{
              percentage: financials?.todayAov?.percentage || 0,
              isPositive: financials?.todayAov?.percentage >= 0
            }}
          />
          <StatCard 
            title="نرخ تبدیل امروز"
            value={financials?.todayConversion ? `${formatNum(Number(financials.todayConversion.rate.toFixed(2)))}٪` : '۰٪'}
            subValue={`دیروز: ${formatNum(Number((financials?.todayConversion?.prevRate || 0).toFixed(2)))}٪`}
            icon={Activity}
            colorTheme="blue"
            trend={{
              percentage: financials?.todayConversion?.percentage || 0,
              isPositive: financials?.todayConversion?.percentage >= 0
            }}
          />
        </div>
      </div>

      {/* ۲. مرکز کنترل بحران و اقدامات فوری (Smart Action Center) */}
      {(alerts?.unansweredTicketsCount > 0 || alerts?.unansweredReviewsCount > 0 || alerts?.criticalInventoryCount > 0 || alerts?.failedPaymentsCount > 0) && (
        <div className="bg-gradient-to-br from-amber-500/[0.04] to-rose-500/[0.04] dark:from-amber-500/[0.08] dark:to-rose-500/[0.04] border border-amber-500/10 dark:border-amber-500/5 p-6 rounded-3xl space-y-4">
          <div className="flex items-center gap-2.5 text-slate-850 dark:text-slate-150 font-black select-none border-b border-amber-500/10 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            <div className="space-y-0.5">
              <h3 className="text-xs font-black">اقدامات مدیریتی و پاسخ‌دهی فوری</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">برای جلب رضایت حداکثری و افزایش فروش، پیگیری موارد زیر ضروری است</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
            {alerts.unansweredTicketsCount > 0 && (
              <Link 
                href={`/admin/tickets?aiPrompt=${encodeURIComponent("چگونه می‌توانم به تیکت‌های پشتیبانی بدون پاسخ اخیر مشتریان پاسخ دهم؟ لطفاً در مورد مدیریت و دسته‌بندی آن‌ها راهنمایی کن.")}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-50 dark:bg-blue-950/30 text-blue-500 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">تیکت پشتیبانی</p>
                    <p className="text-[10px] font-black text-rose-500 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      {formatNum(alerts.unansweredTicketsCount)} مورد بی‌پاسخ
                    </p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-blue-500 group-hover:translate-x-[-3px] transition-all" />
              </Link>
            )}

            {alerts.unansweredReviewsCount > 0 && (
              <Link 
                href={`/admin/reviews?aiPrompt=${encodeURIComponent("من می‌خواهم نظرات و دیدگاه‌های تایید نشده کاربران را بررسی و تایید کنم. لطفاً مرا راهنمایی کن که چگونه بهترین بازخورد را ثبت کنم.")}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">دیدگاه کاربران</p>
                    <p className="text-[10px] font-black text-amber-500 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      {formatNum(alerts.unansweredReviewsCount)} نظر در انتظار تایید
                    </p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-[-3px] transition-all" />
              </Link>
            )}

            {alerts.failedPaymentsCount > 0 && (
              <Link 
                href={`/admin/orders?status=pending&aiPrompt=${encodeURIComponent("چگونه می‌توانم تلاش‌های پرداخت ناموفق و سبدهای رها شده اخیر به ارزش تقریبی " + formatPrice(alerts.failedPaymentsRecoverableMin || 780000) + " را پیگیری و بازیابی کنم؟")}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-950/30 text-rose-500 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">سبد خرید رها شده</p>
                    <div className="text-[10px] font-black text-rose-500 mt-1 flex flex-col gap-0.5">
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                        {formatNum(alerts.failedPaymentsCount)} تلاش ناموفق اخیر
                      </span>
                      <span className="text-[9px] text-emerald-650 dark:text-emerald-400 font-extrabold bg-emerald-500/10 dark:bg-emerald-500/5 px-1.5 py-0.5 rounded-md mt-0.5 block truncate">
                        بازیابی: {formatNum(Math.round((alerts.failedPaymentsRecoverableMin || 780000) / 1000))}K تا {formatNum(Math.round((alerts.failedPaymentsRecoverableMax || 1500000) / 1000))}K تومان
                      </span>
                    </div>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-rose-500 group-hover:translate-x-[-3px] transition-all shrink-0" />
              </Link>
            )}

            {alerts.criticalInventoryCount > 0 && (
              <Link 
                href={`/admin/products?aiPrompt=${encodeURIComponent("من می‌خواهم انبارداری و تأمین موجودی را برای کالاهای رو به اتمام هماهنگ کنم. لطفاً یک راهبرد تأمین سریع به من پیشنهاد بده.")}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-amber-200 dark:hover:border-amber-900/40 transition-all duration-300 hover:scale-[1.01] hover:shadow-sm group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-xl group-hover:scale-105 transition-transform shrink-0">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-700 dark:text-slate-300">تامین موجودی</p>
                    <p className="text-[10px] font-black text-amber-500 mt-1 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                      {formatNum(alerts.criticalInventoryCount)} کالا رو به اتمام
                    </p>
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-slate-300 group-hover:text-amber-500 group-hover:translate-x-[-3px] transition-all" />
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ۳. Quick Access (Pinned widgets customizable area) */}
      {pinnedWidgets.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <Sparkles className="w-4.5 h-4.5 text-yellow-500 animate-pulse" />
            بخش دسترسی سریع و سفارشی‌سازی شده شما
          </h2>
          <div className="bg-slate-50/50 dark:bg-slate-900/10 border-2 border-slate-200/50 dark:border-slate-800/80 border-dashed rounded-3xl p-6 transition-all">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {pinnedWidgets.map(id => {
                const isLargeWidget = id === 'orders_breakdown' || id === 'traffic_chart';
                return (
                  <div key={`pinned-${id}`} className={isLargeWidget ? "col-span-full xl:col-span-2" : "col-span-1"}>
                    {renderWidget(id, true)}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* بخش تحلیل روند و مقایسه دوره قبل */}
      {financials?.compare && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center gap-2.5 text-slate-850 dark:text-slate-150 font-black select-none">
            <LineChart className="w-5 h-5 text-indigo-500 shrink-0" />
            <div className="space-y-0.5">
              <h3 className="text-xs font-black">تحلیل روند و مقایسه عملکرد با دوره قبل (ماهانه)</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">مقایسه آماری و درصدی شاخص‌های کلیدی عملکرد (KPIs) این ماه با ماه گذشته</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {/* Revenue Compare */}
            <div className="p-4 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">درآمد کل</span>
                <span className={`flex items-center text-[9px] font-black px-2 py-0.5 rounded-full ${
                  financials.compare.revenuePercentage >= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {financials.compare.revenuePercentage >= 0 ? '+' : ''}
                  {formatNum(Number(financials.compare.revenuePercentage.toFixed(1)))}٪
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{formatPrice(financials.compare.revenueCurrent)}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">این ماه</span>
                </div>
                <div className="flex justify-between items-baseline text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  <span>{formatPrice(financials.compare.revenuePrev)}</span>
                  <span>ماه قبل</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${financials.compare.revenuePercentage >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  style={{ 
                    width: `${Math.min(100, financials.compare.revenuePrev > 0 ? (financials.compare.revenueCurrent / financials.compare.revenuePrev) * 100 : 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Orders Compare */}
            <div className="p-4 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">تعداد سفارشات</span>
                <span className={`flex items-center text-[9px] font-black px-2 py-0.5 rounded-full ${
                  financials.compare.ordersPercentage >= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {financials.compare.ordersPercentage >= 0 ? '+' : ''}
                  {formatNum(Number(financials.compare.ordersPercentage.toFixed(1)))}٪
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{formatNum(financials.compare.ordersCurrent)} سفارش</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">این ماه</span>
                </div>
                <div className="flex justify-between items-baseline text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  <span>{formatNum(financials.compare.ordersPrev)} سفارش</span>
                  <span>ماه قبل</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${financials.compare.ordersPercentage >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}
                  style={{ 
                    width: `${Math.min(100, financials.compare.ordersPrev > 0 ? (financials.compare.ordersCurrent / financials.compare.ordersPrev) * 100 : 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* AOV Compare */}
            <div className="p-4 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">میانگین ارزش سبد (AOV)</span>
                <span className={`flex items-center text-[9px] font-black px-2 py-0.5 rounded-full ${
                  financials.compare.aovPercentage >= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {financials.compare.aovPercentage >= 0 ? '+' : ''}
                  {formatNum(Number(financials.compare.aovPercentage.toFixed(1)))}٪
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{formatPrice(Math.round(financials.compare.aovCurrent))}</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">این ماه</span>
                </div>
                <div className="flex justify-between items-baseline text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  <span>{formatPrice(Math.round(financials.compare.aovPrev))}</span>
                  <span>ماه قبل</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${financials.compare.aovPercentage >= 0 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ 
                    width: `${Math.min(100, financials.compare.aovPrev > 0 ? (financials.compare.aovCurrent / financials.compare.aovPrev) * 100 : 100)}%` 
                  }}
                />
              </div>
            </div>

            {/* Visitors Compare */}
            <div className="p-4 bg-slate-50/40 dark:bg-slate-950/20 border border-slate-100/80 dark:border-slate-800/60 rounded-2xl space-y-3.5">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500">بازدیدکنندگان منحصر‌به‌فرد</span>
                <span className={`flex items-center text-[9px] font-black px-2 py-0.5 rounded-full ${
                  financials.compare.visitorsPercentage >= 0 
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400'
                }`}>
                  {financials.compare.visitorsPercentage >= 0 ? '+' : ''}
                  {formatNum(Number(financials.compare.visitorsPercentage.toFixed(1)))}٪
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-black text-slate-800 dark:text-white">{formatNum(financials.compare.visitorsCurrent)} نفر</span>
                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">این ماه</span>
                </div>
                <div className="flex justify-between items-baseline text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                  <span>{formatNum(financials.compare.visitorsPrev)} نفر</span>
                  <span>ماه قبل</span>
                </div>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${financials.compare.visitorsPercentage >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`}
                  style={{ 
                    width: `${Math.min(100, financials.compare.visitorsPrev > 0 ? (financials.compare.visitorsCurrent / financials.compare.visitorsPrev) * 100 : 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ۴. Main Reporting Area */}
      <div className="space-y-8">
        <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-4 bg-slate-400 dark:bg-slate-500 rounded-full"></span>
          تحلیل عمیق و گزارشات آماری پیشرفته فروشگاه
        </h2>

        {/* Orders block */}
        {showOrdersBreakdown && (
          <div className="w-full">
            {renderWidget('orders_breakdown')}
          </div>
        )}

        {/* Traffic Statistics Row */}
        {showTrafficRow && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
            {showTrafficChart && (
              <div className={rightColWidgetsCount > 0 ? "lg:col-span-2 flex flex-col" : "col-span-full flex flex-col"}>
                {renderWidget('traffic_chart')}
              </div>
            )}
            
            {rightColWidgetsCount > 0 && (
              <div className={`space-y-6 flex flex-col ${!showTrafficChart ? "col-span-full lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0" : "col-span-1"}`}>
                {showTrafficSources && renderWidget('traffic_sources')}
                {showCustomersStats && renderWidget('customers_stats')}
              </div>
            )}
          </div>
        )}

        {/* Inventory row */}
        {showInventoryRow && (
          <div className={showLowStock && showTopVsUnsold ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "grid grid-cols-1 gap-6"}>
            {showLowStock && renderWidget('low_stock')}
            {showTopVsUnsold && renderWidget('top_vs_unsold')}
          </div>
        )}

        {/* Alerts and interaction lists */}
        {showAlertsRow && (
          <div className={alertGridClass}>
            {showLatestOrders && renderWidget('latest_orders')}
            {showLatestTickets && renderWidget('latest_tickets')}
            {showPendingReviews && renderWidget('pending_reviews')}
            {showFailedPayments && renderWidget('failed_payments')}
          </div>
        )}
      </div>
    </div>
  );
}
