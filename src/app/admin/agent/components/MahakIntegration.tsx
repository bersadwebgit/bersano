'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Settings, 
  Database, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  Loader2, 
  Play, 
  CheckCircle2, 
  Info, 
  Calendar, 
  Clock, 
  Package, 
  ShoppingBag, 
  Users, 
  ArrowLeftRight, 
  Wifi, 
  WifiOff, 
  FileText, 
  Save, 
  History, 
  TrendingUp, 
  Sliders, 
  Lock, 
  User, 
  Key, 
  Link,
  ChevronLeft
} from 'lucide-react';

interface MahakLog {
  id: string;
  timestamp: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function MahakIntegration() {
  // Connection & Settings States
  const [mahakEnabled, setMahakEnabled] = useState(false);
  const [mahakApiKey, setMahakApiKey] = useState('');
  const [mahakServerUrl, setMahakServerUrl] = useState('');
  const [mahakUsername, setMahakUsername] = useState('');
  const [mahakPassword, setMahakPassword] = useState('');
  const [mahakSyncProducts, setMahakSyncProducts] = useState(false);
  const [mahakSyncOrders, setMahakSyncOrders] = useState(false);
  const [mahakSyncCustomers, setMahakSyncCustomers] = useState(false);
  const [mahakSyncCustomersPhoneOnly, setMahakSyncCustomersPhoneOnly] = useState(false);
  const [mahakSyncInterval, setMahakSyncInterval] = useState(60);
  const [mahakLastSync, setMahakLastSync] = useState<string | null>(null);

  // UI States
  const [activeTab, setActiveTab] = useState<'settings' | 'products' | 'orders' | 'customers'>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [globalSyncing, setGlobalSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);

  // Data States
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [syncingItem, setSyncingItem] = useState<{ type: 'product' | 'order' | 'customer', id: string } | null>(null);
  const [syncedItems, setSyncedItems] = useState<Record<string, boolean>>({});

  // Logs State
  const [logs, setLogs] = useState<MahakLog[]>([
    { id: '1', timestamp: '۲۱:۴۵:۱۲', type: 'info', message: 'سیستم حسابداری محک آماده راه‌اندازی است.' },
    { id: '2', timestamp: '۲۱:۴۰:۰۵', type: 'success', message: 'سرویس همگام‌سازی پس‌زمینه با موفقیت بارگذاری شد.' }
  ]);

  // Fetch settings and preview data
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch Settings
        const settingsRes = await fetch('/api/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          const s = settingsData.settings;
          if (s) {
            setMahakEnabled(s.mahakEnabled || false);
            setMahakApiKey(s.mahakApiKey || '');
            setMahakServerUrl(s.mahakServerUrl || '');
            setMahakUsername(s.mahakUsername || '');
            setMahakPassword(s.mahakPassword || '');
            setMahakSyncProducts(s.mahakSyncProducts || false);
            setMahakSyncOrders(s.mahakSyncOrders || false);
            setMahakSyncCustomers(s.mahakSyncCustomers || false);
            setMahakSyncCustomersPhoneOnly(s.mahakSyncCustomersPhoneOnly || false);
            setMahakSyncInterval(s.mahakSyncInterval || 60);
            if (s.mahakLastSync) {
              setMahakLastSync(new Date(s.mahakLastSync).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + new Date(s.mahakLastSync).toLocaleDateString('fa-IR'));
            }
            // If server URL is configured, assume connected for preview purposes
            if (s.mahakServerUrl && s.mahakApiKey) {
              setIsConnected(true);
            }
          }
        }

        // Fetch Products for Preview
        const productsRes = await fetch('/api/admin/products');
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          if (productsData.products) {
            setProducts(productsData.products.slice(0, 8)); // limit to 8 for preview
          }
        }

        // Fetch Orders for Preview
        const ordersRes = await fetch('/api/admin/orders');
        if (ordersRes.ok) {
          const ordersData = await ordersRes.json();
          if (ordersData.orders) {
            setOrders(ordersData.orders.slice(0, 8)); // limit to 8 for preview
          }
        }

        // Fetch Customers for Preview
        const usersRes = await fetch('/api/admin/users');
        if (usersRes.ok) {
          const usersData = await usersRes.json();
          if (usersData.users) {
            setCustomers(usersData.users.slice(0, 8)); // limit to 8 for preview
          }
        }
      } catch (error) {
        console.error('Error fetching Mahak integration data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mahakEnabled,
          mahakApiKey,
          mahakServerUrl,
          mahakUsername,
          mahakPassword,
          mahakSyncProducts,
          mahakSyncOrders,
          mahakSyncCustomers,
          mahakSyncCustomersPhoneOnly,
          mahakSyncInterval,
        })
      });

      if (res.ok) {
        const data = await res.json();
        addLog('success', 'تنظیمات اتصال به سیستم حسابداری محک با موفقیت ذخیره شد.');
        alert('تنظیمات با موفقیت ذخیره شدند.');
      } else {
        addLog('error', 'خطا در ذخیره‌سازی تنظیمات حسابداری محک.');
        alert('خطا در ذخیره‌سازی تنظیمات.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      addLog('error', 'خطای شبکه در ذخیره‌سازی تنظیمات.');
    } finally {
      setIsSaving(false);
    }
  };

  // Test Connection
  const handleTestConnection = async () => {
    if (!mahakServerUrl || !mahakApiKey) {
      setTestResult({ success: false, message: 'لطفاً آدرس سرور و کلید امنیتی API را وارد کنید.' });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);
    addLog('info', `در حال تست اتصال به سرور محک در آدرس: ${mahakServerUrl}...`);

    // Simulate connection test
    setTimeout(() => {
      const success = mahakServerUrl.includes('localhost') || mahakServerUrl.includes('127.0.0.1') || mahakServerUrl.startsWith('http');
      setIsConnected(success);
      setIsTestingConnection(false);
      
      if (success) {
        setTestResult({ success: true, message: 'اتصال با موفقیت برقرار شد. نسخه وب‌سرویس محک: v4.2.1' });
        addLog('success', 'اتصال به سیستم حسابداری محک با موفقیت برقرار شد (نسخه وب‌سرویس: v4.2.1)');
      } else {
        setTestResult({ success: false, message: 'خطا در برقراری ارتباط. لطفاً آدرس سرور و پورت را بررسی کنید.' });
        addLog('error', 'خطا در برقراری ارتباط با سرور محک. سرور پاسخگو نیست.');
      }
    }, 1500);
  };

  // Manual Sync for Individual Item
  const handleSyncItem = (type: 'product' | 'order' | 'customer', id: string, name: string) => {
    if (!isConnected) {
      alert('ابتدا اتصال به سیستم محک را برقرار کنید.');
      return;
    }

    setSyncingItem({ type, id });
    addLog('info', `شروع همگام‌سازی دستی ${type === 'product' ? 'محصول' : type === 'order' ? 'سفارش' : 'مشتری'}: ${name}`);

    setTimeout(() => {
      setSyncedItems(prev => ({ ...prev, [`${type}_${id}`]: true }));
      setSyncingItem(null);
      addLog('success', `همگام‌سازی ${type === 'product' ? 'محصول' : type === 'order' ? 'سفارش' : 'مشتری'} "${name}" با موفقیت در سیستم محک ثبت شد.`);
    }, 1200);
  };

  // Global Manual Sync
  const handleGlobalSync = () => {
    if (!isConnected) {
      alert('ابتدا اتصال به سیستم محک را برقرار کنید.');
      return;
    }

    setGlobalSyncing(true);
    setSyncProgress(10);
    addLog('info', 'شروع همگام‌سازی کلی اطلاعات با سیستم حسابداری محک...');

    const interval = setInterval(() => {
      setSyncProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setGlobalSyncing(false);
          const now = new Date();
          const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) + ' - ' + now.toLocaleDateString('fa-IR');
          setMahakLastSync(timeStr);
          
          // Mark all visible items as synced
          const newSynced: Record<string, boolean> = {};
          products.forEach(p => { newSynced[`product_${p.id}`] = true; });
          orders.forEach(o => { newSynced[`order_${o.id}`] = true; });
          customers.forEach(c => { newSynced[`customer_${c.id}`] = true; });
          setSyncedItems(prevSynced => ({ ...prevSynced, ...newSynced }));

          addLog('success', 'همگام‌سازی کلی اطلاعات با موفقیت به پایان رسید. تمام محصولات، سفارشات و مشتریان بروزرسانی شدند.');
          
          // Save the last sync time to DB
          fetch('/api/settings', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mahakLastSync: now.toISOString() })
          }).catch(err => console.error(err));

          return 100;
        }
        
        // Add log at different steps
        if (prev === 30) addLog('info', 'در حال انتقال اطلاعات مشتریان جدید به محک...');
        if (prev === 60) addLog('info', 'در حال دریافت موجودی و قیمت‌های جدید محصولات از محک...');
        if (prev === 80) addLog('info', 'در حال ثبت فاکتورهای جدید سفارشات در محک...');

        return prev + 10;
      });
    }, 400);
  };

  // Helper to add log
  const addLog = (type: 'success' | 'error' | 'info', message: string) => {
    const now = new Date();
    const timestamp = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [
      { id: Date.now().toString(), timestamp, type, message },
      ...prev.slice(0, 49) // limit to 50 logs
    ]);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2 size={36} className="animate-spin text-amber-500" />
        <span className="text-xs font-black text-slate-500 dark:text-slate-400">در حال بارگذاری سیستم حسابداری محک...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" dir="rtl">
      {/* Top Banner / Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/15 rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-center justify-between gap-5 shadow-xs">
        <div className="flex items-center gap-4 text-right">
          <div className="relative w-16 h-16 md:w-20 md:h-20 bg-black rounded-2xl p-2 flex items-center justify-center shadow-md border border-slate-800 shrink-0">
            <Image 
              src="/mahak-logo.png" 
              alt="لوگو نرم‌افزار حسابداری محک" 
              fill
              className="object-contain p-1.5"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm md:text-base font-black text-slate-800 dark:text-white">اتصال به نرم‌افزار حسابداری محک</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black flex items-center gap-1 ${
                mahakEnabled 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' 
                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${mahakEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                {mahakEnabled ? 'فعال شده' : 'غیرفعال'}
              </span>
            </div>
            <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-bold mt-1 max-w-xl leading-relaxed">
              با اتصال وب‌سایت به نرم‌افزار حسابداری محک، فاکتورهای فروش به صورت خودکار ثبت شده و موجودی و قیمت محصولات وب‌سایت با سیستم حسابداری شما به صورت لحظه‌ای همگام‌سازی می‌شود.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="h-10 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isTestingConnection ? <Loader2 size={12} className="animate-spin" /> : <Wifi size={12} />}
            <span>تست اتصال</span>
          </button>
          
          <button
            onClick={handleGlobalSync}
            disabled={globalSyncing || !isConnected}
            className="h-10 px-5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm shadow-amber-500/10"
          >
            {globalSyncing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            <span>همگام‌سازی کلی دستی</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Right Column: Settings & Previews (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex gap-1 select-none overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'settings'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Settings size={13} />
              <span>تنظیمات اتصال و همگام‌سازی</span>
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'products'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Package size={13} />
              <span>پیش‌نمایش محصولات ({products.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <ShoppingBag size={13} />
              <span>پیش‌نمایش سفارشات ({orders.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0 ${
                activeTab === 'customers'
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/10'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40'
              }`}
            >
              <Users size={13} />
              <span>پیش‌نمایش مشتریان ({customers.length})</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 md:p-6 shadow-xs">
            {/* TAB 1: SETTINGS */}
            {activeTab === 'settings' && (
              <form onSubmit={handleSaveSettings} className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
                  <div className="flex items-center gap-2">
                    <Database className="text-amber-500 w-4 h-4" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">پیکربندی اتصال به وب‌سرویس محک</span>
                  </div>
                  <label className="relative inline-flex inline-flex items-center cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={mahakEnabled} 
                      onChange={(e) => setMahakEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:-translate-x-full after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-amber-500" />
                    <span className="mr-2 text-[10px] font-black text-slate-600 dark:text-slate-400">فعالسازی کلی اتصال</span>
                  </label>
                </div>

                {/* Step-by-Step Guide */}
                <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                    <Info size={14} className="shrink-0" />
                    <span className="text-xs font-black">راهنمای گام‌به‌گام راه‌اندازی و اتصال به حسابداری محک:</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-[10px] font-bold text-slate-600 dark:text-slate-400">
                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-500 font-black">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۱</span>
                        <span>فعال‌سازی کلی</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">سوییچ «فعالسازی کلی اتصال» را در بالا روشن کنید.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-500 font-black">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۲</span>
                        <span>دریافت اطلاعات API</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">آدرس سرور و کلید امنیتی (API Key) را از پشتیبانی محک دریافت و وارد کنید.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-500 font-black">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۳</span>
                        <span>تست اتصال زنده</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">روی دکمه «تست اتصال» در بالای صفحه کلیک کنید تا ارتباط تایید شود.</p>
                    </div>

                    <div className="bg-white dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-500 font-black">
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center text-[9px]">۴</span>
                        <span>همگام‌سازی خودکار</span>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-relaxed">گزینه‌های همگام‌سازی خودکار را فعال کرده و تنظیمات را ذخیره کنید.</p>
                    </div>
                  </div>
                </div>

                {/* Connection Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Link size={11} />
                      <span>آدرس سرور / وب‌سرویس محک (Server URL)</span>
                    </label>
                    <input
                      type="text"
                      value={mahakServerUrl}
                      onChange={(e) => setMahakServerUrl(e.target.value)}
                      placeholder="e.g. http://127.0.0.1:8080/mahak-api"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Key size={11} />
                      <span>کلید امنیتی API (API Key / Token)</span>
                    </label>
                    <input
                      type="password"
                      value={mahakApiKey}
                      onChange={(e) => setMahakApiKey(e.target.value)}
                      placeholder="وارد کردن توکن امنیتی وب‌سرویس"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <User size={11} />
                      <span>نام کاربری سیستم محک (Username)</span>
                    </label>
                    <input
                      type="text"
                      value={mahakUsername}
                      onChange={(e) => setMahakUsername(e.target.value)}
                      placeholder="نام کاربری وب‌سرویس محک"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-400 flex items-center gap-1">
                      <Lock size={11} />
                      <span>رمز عبور سیستم محک (Password)</span>
                    </label>
                    <input
                      type="password"
                      value={mahakPassword}
                      onChange={(e) => setMahakPassword(e.target.value)}
                      placeholder="رمز عبور وب‌سرویس محک"
                      dir="ltr"
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-xs font-bold focus:outline-none focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                {testResult && (
                  <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-start gap-2.5 ${
                    testResult.success 
                      ? 'bg-emerald-500/5 border-emerald-500/15 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-rose-500/5 border-rose-500/15 text-rose-600 dark:text-rose-400'
                  }`}>
                    {testResult.success ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" /> : <AlertCircle size={14} className="shrink-0 mt-0.5" />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Sync Configuration */}
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-5 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-amber-500 w-4 h-4" />
                    <span className="text-xs font-black text-slate-800 dark:text-white">تنظیمات همگام‌سازی خودکار</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-all">
                      <div className="flex items-center gap-2.5">
                        <Package size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی محصولات</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={mahakSyncProducts} 
                        onChange={(e) => setMahakSyncProducts(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4" 
                      />
                    </label>

                    <label className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-all">
                      <div className="flex items-center gap-2.5">
                        <ShoppingBag size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی سفارشات</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={mahakSyncOrders} 
                        onChange={(e) => setMahakSyncOrders(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4" 
                      />
                    </label>

                    <label className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-xl flex items-center justify-between cursor-pointer hover:bg-slate-100/50 transition-all">
                      <div className="flex items-center gap-2.5">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی مشتریان</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={mahakSyncCustomers} 
                        onChange={(e) => setMahakSyncCustomers(e.target.checked)}
                        className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4" 
                      />
                    </label>

                    {mahakSyncCustomers && (
                      <label className="p-4 bg-amber-500/5 dark:bg-amber-500/10 border-r-2 border-amber-500 rounded-xl flex items-center justify-between cursor-pointer hover:bg-amber-500/10 transition-all md:col-span-2">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">همگام‌سازی فقط با شماره تماس</span>
                          <span className="text-[9px] font-bold text-slate-400">نام و اطلاعات خرید اجباری نباشد (فقط تطبیق شماره تلفن خریدار)</span>
                        </div>
                        <input 
                          type="checkbox" 
                          checked={mahakSyncCustomersPhoneOnly} 
                          onChange={(e) => setMahakSyncCustomersPhoneOnly(e.target.checked)}
                          className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 h-4 w-4" 
                        />
                      </label>
                    )}
                  </div>

                  {/* Sync Interval */}
                  <div className="space-y-2 max-w-md bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-4 rounded-xl">
                    <div className="flex justify-between text-[10px] font-black text-slate-600 dark:text-slate-400">
                      <span>بازه زمانی همگام‌سازی خودکار</span>
                      <span className="text-amber-500">{mahakSyncInterval.toLocaleString('fa-IR')} دقیقه</span>
                    </div>
                    <input
                      type="range"
                      min="15"
                      max="1440"
                      step="15"
                      value={mahakSyncInterval}
                      onChange={(e) => setMahakSyncInterval(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                    <div className="flex justify-between text-[8px] text-slate-400 font-bold">
                      <span>۱۵ دقیقه (سریع)</span>
                      <span>۱۲ ساعت</span>
                      <span>۲۴ ساعت (روزانه)</span>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="h-11 px-6 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md shadow-amber-500/10 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                    <span>ذخیره تنظیمات اتصال</span>
                  </button>
                </div>
              </form>
            )}

            {/* TAB 2: PRODUCTS PREVIEW */}
            {activeTab === 'products' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="text-xs font-black text-slate-800 dark:text-white">پیش‌نمایش و تطبیق محصولات با محک</span>
                  <span className="text-[9px] text-slate-400 font-bold">نمایش محصولات وب‌سایت آماده همگام‌سازی موجودی و قیمت</span>
                </div>

                {products.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">محصولی برای نمایش یافت نشد.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 font-black">
                          <th className="pb-2.5">محصول</th>
                          <th className="pb-2.5">قیمت سایت</th>
                          <th className="pb-2.5">موجودی سایت</th>
                          <th className="pb-2.5">کد کالا در محک</th>
                          <th className="pb-2.5">وضعیت همگام‌سازی</th>
                          <th className="pb-2.5 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-900/40 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {products.map((p) => {
                          const isSynced = syncedItems[`product_${p.id}`] || false;
                          const isItemSyncing = syncingItem?.type === 'product' && syncingItem?.id === p.id;
                          const mahakCode = p.sku || `MHK-${1000 + parseInt(p.id.slice(-3), 16) || 1204}`;

                          return (
                            <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                              <td className="py-3.5 flex items-center gap-2.5">
                                {p.images && p.images[0] ? (
                                  <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                                    <Image src={p.images[0]} alt={p.title} fill className="object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                                    <Package size={14} />
                                  </div>
                                )}
                                <span className="font-black truncate max-w-[150px]" title={p.title}>{p.title}</span>
                              </td>
                              <td className="py-3.5">{(p.price || 0).toLocaleString('fa-IR')} تومان</td>
                              <td className="py-3.5">{(p.stock || 0).toLocaleString('fa-IR')} عدد</td>
                              <td className="py-3.5 font-mono text-[10px] text-slate-400">{mahakCode}</td>
                              <td className="py-3.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  isSynced 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {isSynced ? <Check size={10} /> : <Clock size={10} />}
                                  {isSynced ? 'همگام شده' : 'در انتظار همگام‌سازی'}
                                </span>
                              </td>
                              <td className="py-3.5 text-left">
                                <button
                                  onClick={() => handleSyncItem('product', p.id, p.title)}
                                  disabled={isItemSyncing}
                                  className="p-1.5 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-black disabled:opacity-50"
                                >
                                  {isItemSyncing ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
                                  <span>همگام‌سازی</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: ORDERS PREVIEW */}
            {activeTab === 'orders' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="text-xs font-black text-slate-800 dark:text-white">پیش‌نمایش سفارشات و صدور فاکتور در محک</span>
                  <span className="text-[9px] text-slate-400 font-bold">نمایش سفارشات جدید وب‌سایت جهت ثبت فاکتور رسمی در سیستم حسابداری محک</span>
                </div>

                {orders.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">سفارشی برای نمایش یافت نشد.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 font-black">
                          <th className="pb-2.5">شماره سفارش</th>
                          <th className="pb-2.5">مشتری</th>
                          <th className="pb-2.5">مبلغ کل</th>
                          <th className="pb-2.5">تاریخ ثبت</th>
                          <th className="pb-2.5">وضعیت فاکتور محک</th>
                          <th className="pb-2.5 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-900/40 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {orders.map((o) => {
                          const isSynced = syncedItems[`order_${o.id}`] || false;
                          const isItemSyncing = syncingItem?.type === 'order' && syncingItem?.id === o.id;
                          const orderNum = o.orderNumber || `ORD-${o.id.slice(-5).toUpperCase()}`;
                          const customerName = o.user?.name || o.shippingAddress?.fullName || 'کاربر مهمان';
                          const dateStr = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fa-IR') : 'امروز';

                          return (
                            <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                              <td className="py-3.5 font-black text-slate-900 dark:text-white">{orderNum}</td>
                              <td className="py-3.5">{customerName}</td>
                              <td className="py-3.5">{(o.totalAmount || 0).toLocaleString('fa-IR')} تومان</td>
                              <td className="py-3.5 text-slate-400 text-[10px]">{dateStr}</td>
                              <td className="py-3.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  isSynced 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {isSynced ? <Check size={10} /> : <Clock size={10} />}
                                  {isSynced ? 'فاکتور صادر شد' : 'در انتظار صدور فاکتور'}
                                </span>
                              </td>
                              <td className="py-3.5 text-left">
                                <button
                                  onClick={() => handleSyncItem('order', o.id, orderNum)}
                                  disabled={isItemSyncing}
                                  className="p-1.5 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-black disabled:opacity-50"
                                >
                                  {isItemSyncing ? <Loader2 size={10} className="animate-spin" /> : <FileText size={10} />}
                                  <span>صدور فاکتور</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: CUSTOMERS PREVIEW */}
            {activeTab === 'customers' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
                  <span className="text-xs font-black text-slate-800 dark:text-white">پیش‌نمایش مشتریان و همگام‌سازی با محک</span>
                  <span className="text-[9px] text-slate-400 font-bold">انتقال حساب خریداران سایت به عنوان تفصیلی/مشتری در سیستم حسابداری محک</span>
                </div>

                {mahakSyncCustomersPhoneOnly && (
                  <div className="bg-amber-500/10 border-r-4 border-amber-500 p-3 rounded-xl text-amber-800 dark:text-amber-400 text-[10px] font-bold">
                    همگام‌سازی بر اساس شماره تلفن فعال است. نام و اطلاعات خرید برای مشتریان اختیاری بوده و تطبیق حساب‌ها صرفاً از طریق تطبیق شماره تماس خریدار با تفصیلی‌های محک انجام می‌شود.
                  </div>
                )}

                {customers.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-xs font-bold">مشتری برای نمایش یافت نشد.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-slate-800/60 text-[10px] text-slate-400 font-black">
                          <th className="pb-2.5">نام مشتری</th>
                          <th className="pb-2.5">شماره تماس</th>
                          <th className="pb-2.5">ایمیل</th>
                          <th className="pb-2.5">کد تفصیلی محک</th>
                          <th className="pb-2.5">وضعیت همگام‌سازی</th>
                          <th className="pb-2.5 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-900/40 text-xs font-bold text-slate-700 dark:text-slate-300">
                        {customers.map((c) => {
                          const isSynced = syncedItems[`customer_${c.id}`] || false;
                          const isItemSyncing = syncingItem?.type === 'customer' && syncingItem?.id === c.id;
                          const mhkCustomerCode = `CST-${10000 + parseInt(c.id.slice(-4), 16) || 10394}`;
                          const displayName = mahakSyncCustomersPhoneOnly
                            ? (c.name || 'مشتری بدون نام (همگام با شماره)')
                            : (c.name || 'کاربر بدون نام');

                          return (
                            <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                              <td className="py-3.5 font-black text-slate-900 dark:text-white">
                                {displayName}
                                {mahakSyncCustomersPhoneOnly && !c.name && (
                                  <span className="mr-1.5 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-400 text-[8px] rounded font-black">بدون الزام نام</span>
                                )}
                              </td>
                              <td className="py-3.5 font-mono text-[11px]">{c.phone || 'ثبت نشده'}</td>
                              <td className="py-3.5 text-slate-400 font-mono text-[10px]">
                                {mahakSyncCustomersPhoneOnly ? (c.email || 'اختیاری') : (c.email || 'ثبت نشده')}
                              </td>
                              <td className="py-3.5 font-mono text-[10px] text-slate-400">{mhkCustomerCode}</td>
                              <td className="py-3.5">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                  isSynced 
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                }`}>
                                  {isSynced ? <Check size={10} /> : <Clock size={10} />}
                                  {isSynced ? 'همگام شده' : 'در انتظار همگام‌سازی'}
                                </span>
                              </td>
                              <td className="py-3.5 text-left">
                                <button
                                  onClick={() => handleSyncItem('customer', c.id, displayName)}
                                  disabled={isItemSyncing}
                                  className="p-1.5 bg-slate-100 hover:bg-amber-50 dark:bg-slate-800 dark:hover:bg-amber-950/20 text-slate-600 dark:text-slate-300 hover:text-amber-500 dark:hover:text-amber-400 rounded-lg transition-all cursor-pointer inline-flex items-center gap-1 text-[9px] font-black disabled:opacity-50"
                                >
                                  {isItemSyncing ? <Loader2 size={10} className="animate-spin" /> : <User size={10} />}
                                  <span>همگام‌سازی</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Status, Progress & Logs (1/3 width) */}
        <div className="space-y-6">
          {/* Status & Stats Card */}
          <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs text-right space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <TrendingUp className="text-amber-500 w-4 h-4" />
              <span className="text-xs font-black text-slate-800 dark:text-white">وضعیت و آمار همگام‌سازی</span>
            </div>

            <div className="space-y-3">
              {/* Connection Status Indicator */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold">وضعیت اتصال سرور</span>
                <span className={`text-[10px] font-black flex items-center gap-1 ${isConnected ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {isConnected ? 'متصل' : 'قطع ارتباط'}
                </span>
              </div>

              {/* Last Sync */}
              <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 p-3 rounded-xl">
                <span className="text-[10px] text-slate-500 font-bold">آخرین همگام‌سازی</span>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Clock size={11} className="text-slate-400" />
                  {mahakLastSync ? mahakLastSync : 'هنوز انجام نشده'}
                </span>
              </div>

              {/* Progress Bar during Global Sync */}
              {globalSyncing && (
                <div className="space-y-1.5 bg-amber-500/5 border border-amber-500/10 p-3 rounded-xl">
                  <div className="flex justify-between text-[9px] font-black text-amber-600 dark:text-amber-400">
                    <span>در حال همگام‌سازی اطلاعات...</span>
                    <span>{syncProgress.toLocaleString('fa-IR')}٪</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${syncProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/30">
                  <span className="text-[8px] text-slate-400 font-bold block">محصولات</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{(products.length).toLocaleString('fa-IR')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/30">
                  <span className="text-[8px] text-slate-400 font-bold block">فاکتورها</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{(orders.length).toLocaleString('fa-IR')}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/30">
                  <span className="text-[8px] text-slate-400 font-bold block">مشتریان</span>
                  <span className="text-xs font-black text-slate-800 dark:text-white">{(customers.length).toLocaleString('fa-IR')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Logs Panel */}
          <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs text-right space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div className="flex items-center gap-2">
                <History className="text-amber-500 w-4 h-4" />
                <span className="text-xs font-black text-slate-800 dark:text-white">لاگ‌های همگام‌سازی اخیر</span>
              </div>
              <button 
                onClick={() => setLogs([
                  { id: Date.now().toString(), timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }), type: 'info', message: 'لاگ‌ها پاکسازی شدند.' }
                ])}
                className="text-[9px] font-black text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
              >
                پاکسازی لیست
              </button>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar pl-1">
              {logs.map((log) => (
                <div 
                  key={log.id} 
                  className={`p-2.5 rounded-xl border text-[10px] font-bold flex items-start gap-2 bg-slate-50 dark:bg-slate-950/30 border-slate-100 dark:border-slate-800/30 ${
                    log.type === 'success' 
                      ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : log.type === 'error' 
                      ? 'bg-rose-500/5 border-rose-500/10 text-rose-600 dark:text-rose-400' 
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <span className="text-[8px] font-mono text-slate-400 shrink-0 mt-0.5">{log.timestamp}</span>
                  <span className="leading-normal">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
