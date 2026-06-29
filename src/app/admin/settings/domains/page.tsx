'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  HelpCircle,
  Copy,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
  ArrowLeftRight,
  Settings,
  Activity,
  ArrowRight,
  Info,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';

interface Domain {
  id: string;
  domain: string;
  isPrimary: boolean;
  isVerified: boolean;
  verificationType: 'TXT' | 'CNAME';
  verificationToken: string;
  sslStatus: 'pending' | 'active' | 'failed';
  sslExpiresAt: string | null;
  redirectWww: boolean;
  createdAt: string;
}

export default function DomainsSettingsPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [settingPrimaryId, setSettingPrimaryId] = useState<string | null>(null);
  const [deletingId, setVerletingId] = useState<string | null>(null);

  // Package Authorization State
  const [customDomainEnabled, setCustomDomainEnabled] = useState(true);
  const [maxDomains, setMaxDomains] = useState(0);

  // New Domain Form State
  const [newDomain, setNewDomain] = useState('');
  const [verificationType, setVerificationType] = useState<'TXT' | 'CNAME'>('TXT');
  
  // Notification & Feedback States
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationDetails, setVerificationDetails] = useState<{
    success: boolean;
    verified: boolean;
    pointsToPlatform: boolean;
    checkError?: string;
    propagationError?: string;
  } | null>(null);

  // platform targets (loaded from API)
  const [targetIp, setTargetIp] = useState('185.204.197.80');
  const [targetCname, setTargetCname] = useState('za4.localhost');

  const fetchDomains = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings/domains');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDomains(data.domains || []);
      if (data.targetIp) setTargetIp(data.targetIp);
      if (data.targetCname) setTargetCname(data.targetCname);
      setCustomDomainEnabled(data.customDomainEnabled !== undefined ? data.customDomainEnabled : true);
      setMaxDomains(data.maxDomains || 0);
    } catch {
      setErrorMessage('خطا در دریافت لیست دامنه‌ها. مجدداً تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain) return;

    setAdding(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVerificationDetails(null);

    try {
      const res = await fetch('/api/admin/settings/domains', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: newDomain, verificationType }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت دامنه جدید');
      }

      setSuccessMessage('دامنه با موفقیت ثبت شد. اکنون مراحل زیر را برای فعال‌سازی دنبال کنید.');
      setNewDomain('');
      fetchDomains();
    } catch (err: any) {
      setErrorMessage(err.message || 'خطایی رخ داد.');
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteDomain = async (id: string, domainName: string) => {
    if (!confirm(`آیا از حذف دامنه "${domainName}" اطمینان دارید؟`)) return;

    setVerletingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/admin/settings/domains?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'خطا در حذف دامنه');

      setSuccessMessage('دامنه مورد نظر با موفقیت حذف شد.');
      fetchDomains();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setVerletingId(null);
    }
  };

  const handleVerifyDomain = async (id: string) => {
    setVerifyingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);
    setVerificationDetails(null);

    try {
      const res = await fetch('/api/admin/settings/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'verify' }),
      });
      const data = await res.json();

      setVerificationDetails({
        success: data.success,
        verified: data.verified,
        pointsToPlatform: data.pointsToPlatform,
        checkError: data.checkError,
        propagationError: data.propagationError,
      });

      if (data.success) {
        setSuccessMessage('مالکیت و اتصال دامنه با موفقیت تایید و گواهی SSL صادر شد!');
      } else {
        setErrorMessage('برخی از رکوردهای DNS تایید نشدند. لطفاً خطاهای زیر را بررسی کرده و مجدداً تلاش کنید.');
      }
      fetchDomains();
    } catch {
      setErrorMessage('خطا در اتصال به سرور جهت بررسی DNS.');
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSetPrimary = async (id: string) => {
    setSettingPrimaryId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch('/api/admin/settings/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'set_primary' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccessMessage('دامنه اصلی فروشگاه با موفقیت تغییر کرد.');
      fetchDomains();
    } catch (err: any) {
      setErrorMessage(err.message || 'خطا در تغییر دامنه اصلی');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleToggleRedirect = async (id: string, redirectWww: boolean) => {
    try {
      const res = await fetch('/api/admin/settings/domains', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action: 'toggle_redirect', redirectWww }),
      });
      if (res.ok) {
        fetchDomains();
      }
    } catch {
      setErrorMessage('خطا در ذخیره‌سازی ترجیحات ریدایرکت.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 relative" dir="rtl">
      {/* Locked Overlay if Package is not active / allowed */}
      {!loading && !customDomainEnabled && (
        <div className="absolute inset-0 bg-slate-100/60 dark:bg-slate-950/80 backdrop-blur-[2px] z-50 rounded-3xl flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300">
          <div className="max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 space-y-6">
            <div className="w-20 h-20 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center text-4xl mx-auto border border-amber-500/20">
              🔒
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-extrabold text-slate-800 dark:text-white">ارتقای اشتراک جهت اتصال دامنه اختصاصی</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                قابلیت فوق‌العاده «اتصال دامنه اختصاصی» در پکیج اشتراک فعلی شما فعال نیست. برای ارائه‌ حرفه‌ای برند خود بر روی دامنه اختصاصی (مثلاً mybrand.com) و بهبود همه‌جانبه سئو و پرستیژ برند، لطفاً پکیج خود را به پکیج‌های بالاتر ارتقا دهید.
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Link
                href="/admin/settings"
                className="flex-1 inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95"
              >
                ارتقای پکیج کاربری
              </Link>
              <Link
                href="/admin/dashboard"
                className="flex-1 inline-flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-5 py-3 rounded-2xl font-black text-xs transition-all active:scale-95"
              >
                بازگشت به پیشخوان
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            <h1 className="text-xl font-extrabold text-slate-800 dark:text-white">اتصال دامنه اختصاصی</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            دامنه شخصی خود (مانند yourdomain.com) را به فروشگاهتان متصل کنید و برند اختصاصی خود را بسازید.
          </p>
        </div>
        <Link
          href="/admin/settings"
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition"
        >
          <ArrowRight className="h-4 w-4" />
          <span>بازگشت به تنظیمات عمومی</span>
        </Link>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold leading-relaxed">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800 rounded-2xl flex gap-3 text-rose-800 dark:text-rose-300 text-xs font-semibold leading-relaxed">
          <AlertCircle className="h-5 w-5 text-rose-600 flex-shrink-0" />
          <div>
            <span>{errorMessage}</span>
            {verificationDetails && (
              <div className="mt-3 space-y-2 border-t border-rose-200 dark:border-rose-800/40 pt-2 font-mono text-left dir-ltr">
                {verificationDetails.checkError && (
                  <p className="text-rose-600 dark:text-rose-400">✗ Ownership Check: {verificationDetails.checkError}</p>
                )}
                {verificationDetails.propagationError && (
                  <p className="text-amber-600 dark:text-amber-400">✗ DNS Connection: {verificationDetails.propagationError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Add Domain Form & Active Domains */}
        <div className="lg:col-span-2 space-y-8">
          {/* Active Domains List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-indigo-500" />
              <span>دامنه‌های متصل شده</span>
            </h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                <span className="text-xs">در حال بارگذاری دامنه‌ها...</span>
              </div>
            ) : domains.length === 0 ? (
              <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <Globe className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mb-1">هنوز هیچ دامنه‌ای ثبت نکرده‌اید</p>
                <p className="text-[10px] text-slate-400">از فرم پایین برای ثبت دامنه شخصی خود استفاده کنید.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {domains.map((dom) => (
                  <div
                    key={dom.id}
                    className={`border rounded-2xl p-4 transition-all duration-300 ${
                      dom.isPrimary
                        ? 'border-indigo-500/40 bg-indigo-50/10 dark:bg-indigo-950/5'
                        : 'border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/10'
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Domain Info */}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-white dir-ltr text-left">
                            {dom.domain}
                          </span>

                          {dom.isPrimary && (
                            <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 rounded-full text-[9px] font-black">
                              دامنه اصلی (Primary)
                            </span>
                          )}

                          {dom.isVerified ? (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 rounded-full text-[9px] font-black flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              تایید شده
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 rounded-full text-[9px] font-black flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              در انتظار تایید DNS
                            </span>
                          )}
                        </div>

                        {/* SSL Status */}
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <ShieldCheck className={`h-3.5 w-3.5 ${dom.sslStatus === 'active' ? 'text-emerald-500' : 'text-amber-500'}`} />
                            <span>امنیت SSL/TLS:</span>
                            <span className="font-bold">
                              {dom.sslStatus === 'active' ? 'فعال (صادر شده)' : dom.sslStatus === 'failed' ? 'ناموفق' : 'در انتظار اتصال'}
                            </span>
                          </span>

                          {dom.sslExpiresAt && (
                            <span>
                              انقضا گواهی: {new Date(dom.sslExpiresAt).toLocaleDateString('fa-IR')} (تمدید خودکار)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        {!dom.isVerified && (
                          <button
                            onClick={() => handleVerifyDomain(dom.id)}
                            disabled={verifyingId === dom.id}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white disabled:opacity-55 rounded-xl text-xs font-black transition flex items-center gap-1.5"
                          >
                            {verifyingId === dom.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            بررسی وضعیت اتصال
                          </button>
                        )}

                        {dom.isVerified && !dom.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(dom.id)}
                            disabled={settingPrimaryId === dom.id}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-55 rounded-xl text-xs font-black transition flex items-center gap-1.5"
                          >
                            {settingPrimaryId === dom.id && <Loader2 className="h-3 w-3 animate-spin" />}
                            انتخاب به عنوان دامنه اصلی
                          </button>
                        )}

                        <button
                          onClick={() => handleDeleteDomain(dom.id, dom.domain)}
                          disabled={deletingId === dom.id}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition"
                          title="حذف دامنه"
                        >
                          {deletingId === dom.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Redirection Settings */}
                    {dom.isVerified && (
                      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <ArrowLeftRight className="h-3.5 w-3.5 text-slate-400" />
                          <span>تغییر مسیر خودکار (Redirect):</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">ریدایرکت خودکار www به بدون www</span>
                          <button
                            onClick={() => handleToggleRedirect(dom.id, !dom.redirectWww)}
                            className={`w-9 h-5 rounded-full transition-all duration-300 ${
                              dom.redirectWww ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800'
                            } relative`}
                          >
                            <span
                              className={`w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all duration-300 ${
                                dom.redirectWww ? 'right-4.5' : 'right-0.5'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Pending Instructions Accordion */}
                    {!dom.isVerified && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800/40 space-y-4">
                        <p className="text-[10px] text-amber-800 dark:text-amber-400 bg-amber-500/5 p-2.5 rounded-xl font-bold">
                          ⚠️ دامنه ثبت شده است اما هنوز فعال نیست. لطفاً رکوردهای DNS زیر را در پنل کارگزاری دامنه خود (مانند ایرنیک، کلودفلر، نت‌افراز و ...) ست کنید.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Step 1: Prove Ownership */}
                          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-md text-[9px] font-black text-slate-700 dark:text-slate-300">
                              گام ۱: اثبات مالکیت دامنه
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 mb-2 leading-relaxed">
                              یک رکورد با مشخصات زیر بسازید:
                            </p>
                            <div className="space-y-1.5 font-mono text-[10px] dir-ltr text-left">
                              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900">
                                <span className="text-slate-400">Type:</span>
                                <span className="font-bold text-slate-800 dark:text-white">TXT</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900">
                                <span className="text-slate-400">Name:</span>
                                <span className="font-bold text-slate-800 dark:text-white">@</span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900 gap-4">
                                <span className="text-slate-400 flex-shrink-0">Value:</span>
                                <span className="font-bold text-slate-800 dark:text-white truncate">
                                  {dom.verificationToken}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(dom.verificationToken)}
                                  className="text-slate-400 hover:text-indigo-600 transition flex-shrink-0"
                                >
                                  {copiedToken === dom.verificationToken ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Step 2: Points to platform */}
                          <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                            <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-800 rounded-md text-[9px] font-black text-slate-700 dark:text-slate-300">
                              گام ۲: ارجاع دامنه به فروشگاه‌ساز
                            </span>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 mb-2 leading-relaxed">
                              {dom.domain.split('.').length > 2
                                ? 'دامنه شما یک ساب‌دامین است. لطفا یک رکورد CNAME بسازید:'
                                : 'دامنه شما یک دامنه اصلی است. لطفا یک رکورد A بسازید:'}
                            </p>
                            <div className="space-y-1.5 font-mono text-[10px] dir-ltr text-left">
                              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900">
                                <span className="text-slate-400">Type:</span>
                                <span className="font-bold text-slate-800 dark:text-white">
                                  {dom.domain.split('.').length > 2 ? 'CNAME' : 'A'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900">
                                <span className="text-slate-400">Name:</span>
                                <span className="font-bold text-slate-800 dark:text-white">
                                  {dom.domain.split('.').length > 2 ? dom.domain.split('[0]') : '@'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between p-1.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-900 gap-4">
                                <span className="text-slate-400 flex-shrink-0">Target/IP:</span>
                                <span className="font-bold text-slate-800 dark:text-white truncate">
                                  {dom.domain.split('.').length > 2 ? targetCname : targetIp}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(dom.domain.split('.').length > 2 ? targetCname : targetIp)}
                                  className="text-slate-400 hover:text-indigo-600 transition flex-shrink-0"
                                >
                                  {copiedToken === (dom.domain.split('.').length > 2 ? targetCname : targetIp) ? (
                                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Form to Register New Custom Domain */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-600" />
              <span>اتصال دامنه جدید</span>
            </h2>
            <p className="text-[11px] text-slate-500 mb-5 leading-relaxed">
              لطفاً آدرس دامنه خود را بدون پروتکل وارد کنید. مثلاً: <span className="dir-ltr inline-block font-mono text-indigo-600">mydomain.com</span> یا <span className="dir-ltr inline-block font-mono text-indigo-600">shop.mybrand.ir</span>
            </p>

            <form onSubmit={handleAddDomain} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                  آدرس دامنه اختصاصی شما
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
                    <Globe className="h-4 w-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    placeholder="example.com"
                    className="w-full pr-10 pl-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white dark:bg-slate-950 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-800 dark:text-white transition outline-none dir-ltr text-left"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">
                    نوع رکورد تایید مالکیت
                  </label>
                  <select
                    value={verificationType}
                    onChange={(e) => setVerificationType(e.target.value as 'TXT' | 'CNAME')}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 transition outline-none"
                  >
                    <option value="TXT">رکورد TXT (پیشنهادی - آسان‌ترین روش)</option>
                    <option value="CNAME">رکورد CNAME</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={adding}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-indigo-400 rounded-xl text-xs font-black transition flex items-center justify-center gap-2"
                  >
                    {adding && <Loader2 className="h-4 w-4 animate-spin" />}
                    ثبت دامنه و دریافت مشخصات DNS
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

        {/* Right: Technical Guide, SEO, SSL, FAQ */}
        <div className="space-y-8">
          {/* Status Box */}
          <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute right-0 bottom-0 opacity-10">
              <Globe className="h-48 w-48 translate-x-12 translate-y-12" />
            </div>

            <div className="relative z-10 space-y-4">
              <div className="p-2 bg-indigo-500/20 w-fit rounded-2xl border border-indigo-400/20">
                <ShieldCheck className="h-6 w-6 text-indigo-300" />
              </div>

              <div>
                <h3 className="text-sm font-extrabold mb-1">امنیت کامل با SSL رایگان</h3>
                <p className="text-[10px] text-indigo-200 leading-relaxed font-bold">
                  پس از ارجاع موفقیت‌آمیز دامنه به سیستم ما، یک گواهی‌نامه SSL معتبر و رایگان از صادرکننده Let's Encrypt به صورت کاملاً اتوماتیک برای وب‌سایت شما فعال خواهد شد.
                </p>
              </div>

              <div className="border-t border-indigo-500/20 pt-3 space-y-2 text-[10px] text-indigo-100 font-bold">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>پروتکل امن HTTPS به صورت پیش‌فرض</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                  <span>تمدید اتوماتیک ۹۰ روزه بدون دخالت شما</span>
                </div>
              </div>
            </div>
          </div>

          {/* DNS Propagation Warning */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <h3 className="text-xs font-extrabold">زمان انتشار DNS (Propagation Delay)</h3>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-relaxed font-bold">
              تغییرات رکورد‌های DNS بلافاصله در کل اینترنت منتشر نمی‌شوند. بسته به شرکت کارگزار ثبت دامنه شما، اعمال کامل تغییرات ممکن است بین <span className="text-indigo-600 font-black">۲ تا ۴۸ ساعت</span> زمان ببرد. بنابراین اگر بلافاصله تایید مالکیت انجام نشد، صبور باشید و چند ساعت دیگر مجدداً تلاش کنید.
            </p>
          </div>

          {/* Guidelines / Help */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-slate-800 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <HelpCircle className="h-4 w-4 text-indigo-500" />
              <span>نکات طلایی سئو و سادگی کار</span>
            </h3>

            <div className="space-y-3.5 text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
              <div className="flex gap-2">
                <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-[10px]">۱</div>
                <div>
                  <h4 className="text-slate-800 dark:text-white font-extrabold mb-0.5">بهینه‌سازی سئو دامنه‌های متصل</h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                    با فعال‌سازی ریدایرکت خودکار WWW به بدون WWW، از خطای صفحات تکراری (Duplicate Content) در خزنده گوگل جلوگیری کرده و اعتبار سئو را در یکجا جمع می‌کنید.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-[10px]">۲</div>
                <div>
                  <h4 className="text-slate-800 dark:text-white font-extrabold mb-0.5">ریدایرکت ساب‌دامین قدیمی</h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                    سیستم به صورت خودکار کاربران ورودی از ساب‌دامین قدیمی پلتفرم را به دامنه اختصاصی جدید شما هدایت (Permanent 301 Redirect) می‌کند تا مشتریان و رتبه‌بندی‌های قبلی گوگل خود را حفظ کنید.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <div className="w-5 h-5 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-[10px]">۳</div>
                <div>
                  <h4 className="text-slate-800 dark:text-white font-extrabold mb-0.5">ثبت دامنه تکراری</h4>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">
                    سیستم مجهز به مکانیزم جلوگیری از ثبت دامنه‌های درحال استفاده توسط سایر فروشگاه‌ها است تا امنیت نام‌های تجاری شما حفظ شود.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
