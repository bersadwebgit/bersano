'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Sparkles, Store, Check, ArrowLeft, ArrowRight, ShieldCheck, 
  Globe, Clock, MessageSquare, AlertCircle, RefreshCw, Key, 
  Smartphone, User, Mail, Lock, LayoutGrid, CheckCircle2, ChevronRight,
  QrCode
} from 'lucide-react';

function getBaseDomain(host: string): string {
  if (!host) return 'localhost:3000';
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?$/;
  if (ipRegex.test(host)) return host;

  const hostParts = host.split(':');
  const domainAndSubdomains = hostParts[0];
  const port = hostParts[1] ? `:${hostParts[1]}` : '';

  const parts = domainAndSubdomains.split('.');
  const tld = parts[parts.length - 1].toLowerCase();

  const localTLDs = ['localhost', 'local', 'test', 'dev', 'lan'];
  if (localTLDs.includes(tld) || domainAndSubdomains.toLowerCase() === 'localhost') {
    return `localhost${port}`;
  }
  
  if (parts.length <= 2) return host;
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  
  const isSLD = ['com', 'co', 'org', 'net', 'gov', 'edu'].includes(secondLast.toLowerCase());
  if (isSLD && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${secondLast}.${last}${port}`;
  }
  return `${secondLast}.${last}${port}`;
}

export default function MerchantRegisterClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Wizard Steps:
  // 1: Store & Subdomain Name
  // 2: Owner Personal Info
  // 3: OTP Verification
  // 4: AI Customization (Industry, Brand Vibe)
  // 5: Provisioning / Progress
  // 6: Success Checklist
  const [step, setStep] = useState(1);

  // States
  const [shopName, setShopName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [businessField, setBusinessField] = useState('apparel');
  const [brandVibe, setBrandVibe] = useState('modern');
  const [ownerJob, setOwnerJob] = useState('');

  // Statuses
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [error, setError] = useState('');
  const [creationProgress, setCreationProgress] = useState(0);
  const [timer, setTimer] = useState(0);
  const [successData, setSuccessData] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [origin, setOrigin] = useState('localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(getBaseDomain(window.location.host));
    }
    // Read query params if any
    const plan = searchParams.get('plan');
    const demo = searchParams.get('demo');
    const phoneParam = searchParams.get('phone');

    if (phoneParam) {
      setContactPhone(phoneParam.replace(/\D/g, ''));
    }

    if (demo) {
      if (demo === 'fashion') {
        setShopName('گالری پوشاک شیک');
        setSubdomain('chic-fashion');
        setBusinessField('apparel');
      } else if (demo === 'beauty') {
        setShopName('آرایشی و زیبایی لوکس');
        setSubdomain('beauty-luxe');
        setBusinessField('beauty');
      } else if (demo === 'tech') {
        setShopName('فروشگاه ابزار و کالای دیجیتال');
        setSubdomain('digital-tech');
        setBusinessField('digital');
      } else if (demo === 'b2b') {
        setShopName('سامانه توزیع عمده همکار');
        setSubdomain('coop-b2b');
        setBusinessField('wholesale');
      }
    }
  }, [searchParams]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubdomainChange = (val: string) => {
    const formatted = val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSubdomain(formatted);
  };

  const sendOtp = async () => {
    setError('');
    if (!contactPhone) {
      setError('وارد کردن شماره موبایل الزامی است.');
      return;
    }
    const iranPhoneRegex = /^09\d{9}$/;
    if (!iranPhoneRegex.test(contactPhone.trim())) {
      setError('شماره موبایل نامعتبر است. نمونه: 09123456789');
      return;
    }

    setOtpLoading(true);
    try {
      const res = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactPhone, email: ownerEmail, subdomain }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep(3); // Go to verification
        setTimer(120); // 2 min timeout
      } else {
        setError(data.error || 'خطایی در ارسال کد تایید رخ داد.');
      }
    } catch {
      setError('خطا در ارتباط با سرور.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleCreateShop = async () => {
    setError('');
    setLoading(true);
    setCreationProgress(0);

    // Choreographed mock progress
    const progressInterval = setInterval(() => {
      setCreationProgress((prev) => {
        if (prev < 90) return prev + 15;
        return prev;
      });
    }, 800);

    try {
      const res = await fetch('/api/create-shop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          subdomain,
          ownerName,
          ownerEmail,
          ownerPassword,
          contactPhone,
          otpCode,
          businessField,
          brandVibe,
          ownerJob
        }),
      });

      const data = await res.json();

      clearInterval(progressInterval);

      if (res.ok || (data && data.alreadyCreated)) {
        setCreationProgress(100);
        setSuccessData(data.shop);
        setTimeout(() => {
          setStep(6); // Success
          setLoading(false);
        }, 1000);
      } else {
        setError(data.error || 'خطایی در ساخت پایگاه داده فروشگاه رخ داد.');
        setStep(4); // Fallback to setup
        setLoading(false);
      }
    } catch {
      clearInterval(progressInterval);
      setError('خطا در ارتباط با سرور.');
      setStep(4);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-right">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        {/* Step Indicator Bullets */}
        {step < 5 && (
          <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-black text-slate-950 dark:text-white flex items-center gap-1.5">
              <Store className="w-4 h-4 text-blue-600" />
              <span>ساخت فروشگاه هوشمند برسانا</span>
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-5 h-1.5 rounded-full transition-all ${
                    step >= s ? 'bg-blue-600' : 'bg-slate-100 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-100/50 dark:border-red-900/30 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: STORE & SUBDOMAIN */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">نام و ساب‌دامین فروشگاه</h2>
              <p className="text-[10px] text-slate-400 font-bold">برای شروع، یک نام جذاب و آدرس اینترنتی دلخواه خودتان را بردارید.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">نام فروشگاه *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="مثال: گالری مد طلایی"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">آدرس اینترنتی دلخواه (ساب‌دامین) *</label>
                <div className="relative" dir="ltr">
                  <input
                    type="text"
                    required
                    value={subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    placeholder="my-shop"
                    className="w-full pl-36 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all text-left font-mono"
                  />
                  <div className="absolute top-3 left-4 text-xs font-bold text-slate-400 font-mono">
                    .{origin}
                  </div>
                </div>
                <p className="text-[9px] text-slate-400 font-bold text-right pt-1">
                  * فقط حروف کوچک انگلیسی، اعداد و خط تیره (-) مجاز است.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (!shopName || !subdomain) {
                  setError('پر کردن تمامی فیلدهای ستاره‌دار الزامی است.');
                  return;
                }
                setStep(2);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/10 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>ادامه مسیر</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* STEP 2: OWNER INFO */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">مشخصات مالک و مدیر ارشد</h2>
              <p className="text-[10px] text-slate-400 font-bold">اطلاعات تایید هویت و اطلاعات لازم جهت دسترسی به پنل مدیریت را بنویسید.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">نام و نام خانوادگی شما *</label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="مثال: علی محمدی"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">آدرس ایمیل *</label>
                <input
                  type="email"
                  required
                  value={ownerEmail}
                  onChange={(e) => setOwnerEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all text-left dir-ltr font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">رمز عبور پنل مدیریت *</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={ownerPassword}
                  onChange={(e) => setOwnerPassword(e.target.value)}
                  placeholder="********"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all text-left dir-ltr font-mono"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">شماره موبایل *</label>
                <input
                  type="tel"
                  required
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="09123456789"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all text-left dir-ltr font-mono"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                بازگشت
              </button>
              <button
                onClick={() => {
                  if (!ownerName || !ownerEmail || !ownerPassword || !contactPhone) {
                    setError('پر کردن تمامی فیلدهای ستاره‌دار الزامی است.');
                    return;
                  }
                  sendOtp();
                }}
                disabled={otpLoading}
                className="flex-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-75"
              >
                {otpLoading ? 'در حال ارسال کد...' : 'دریافت کد تایید پیامکی'}
                {!otpLoading && <ArrowLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: OTP VERIFICATION */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">تایید شماره تماس</h2>
              <p className="text-[10px] text-slate-400 font-bold">کد ۵ رقمی فرستاده شده به شماره موبایل {contactPhone} را وارد کنید.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">کد تایید ۵ رقمی *</label>
                <input
                  type="text"
                  maxLength={5}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="12345"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-sm font-black text-slate-900 dark:text-white transition-all text-center tracking-widest font-mono"
                  dir="ltr"
                />
              </div>

              {timer > 0 ? (
                <p className="text-[10px] text-slate-400 font-bold text-center">
                  ارسال مجدد پس از: {formatTime(timer)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={sendOtp}
                  className="text-[10px] font-black text-blue-600 hover:underline mx-auto block cursor-pointer"
                >
                  ارسال مجدد کد تایید
                </button>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl text-xs font-black transition-all cursor-pointer"
              >
                اصلاح اطلاعات
              </button>
              <button
                onClick={() => {
                  if (!otpCode || otpCode.length < 5) {
                    setError('لطفاً کد تایید ۵ رقمی را به طور کامل وارد کنید.');
                    return;
                  }
                  setStep(4); // Go to personalization
                }}
                className="flex-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>تایید شماره</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: AI PERSONALIZATION */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-950 dark:text-white">شخصی‌سازی فروشگاه با هوش مصنوعی</h2>
              <p className="text-[10px] text-slate-400 font-bold">نوع کسب‌وکار و حال‌وهوای تم را انتخاب کنید تا AI پایگاه دانش کالاها را برای شما بسازد.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">شغل، تخصص یا حوزه دقیق فعالیت شما *</label>
                <input
                  type="text"
                  required
                  value={ownerJob}
                  onChange={(e) => setOwnerJob(e.target.value)}
                  placeholder="مثال: طراح مد و لباس، باریستای قهوه، فروشنده لوازم جانبی موبایل"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">حوزه فروش و فعالیت کاتالوگ کالاها *</label>
                <select
                  value={businessField}
                  onChange={(e) => setBusinessField(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <option value="apparel">پوشاک، مد و اکسسوری</option>
                  <option value="beauty">لوازم آرایشی، بهداشتی و زیبایی</option>
                  <option value="digital">کالای دیجیتال و لوازم جانبی</option>
                  <option value="education">فایل دانلودی، دوره و محصولات دیجیتال</option>
                  <option value="wholesale">عمده‌فروشی و توزیع B2B</option>
                  <option value="general">فروشگاه عمومی و سایر موارد</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">حال‌وهوا و تم چیدمان بصری (Vibe) *</label>
                <select
                  value={brandVibe}
                  onChange={(e) => setBrandVibe(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all cursor-pointer"
                >
                  <option value="modern">مدرن و فلت (توصیه شده)</option>
                  <option value="luxury">کلاسیک و لوکس (طلایی / سرمه‌ای)</option>
                  <option value="minimal">مینیمال و ساده (سفید / مشکی خالص)</option>
                  <option value="tech">تکنولوژی و پیشرفته (سایبرپانک / سورئال)</option>
                  <option value="friendly">صمیمی و ارگانیک (سبز / گرم)</option>
                </select>
              </div>

              <div className="p-4 bg-orange-500/5 border border-orange-500/15 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-black text-orange-500">
                  <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                  <span>جادوی AI برسانا در پس‌زمینه:</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  هوش مصنوعی برسانا به محض کلیک بر روی دکمه زیر، کاتالوگ محصولات فرضی مرتبط، اسلایدرها، هدرها، کدهای تخفیف، و بخش FAQ مناسب حوزه انتخابی شما را تولید و پایگاه داده را مقداردهی اولیه (Seed) می‌کند.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                if (!ownerJob.trim()) {
                  setError('لطفاً شغل، تخصص یا حوزه دقیق فعالیت خود را وارد کنید.');
                  return;
                }
                setStep(5);
                handleCreateShop();
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>ساخت نهایی فروشگاه من با AI</span>
            </button>
          </div>
        )}

        {/* STEP 5: PROVISIONING / PROGRESS */}
        {step === 5 && (
          <div className="space-y-6 text-center py-8">
            <div className="w-16 h-16 bg-blue-600/10 text-blue-600 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
              <Sparkles className="w-8 h-8 text-orange-500 animate-spin" />
            </div>

            <div className="space-y-2">
              <h2 className="text-sm sm:text-md font-black text-slate-950 dark:text-white">در حال راه‌اندازی پایگاه داده و پیکربندی با AI...</h2>
              <p className="text-[10px] text-slate-400 font-bold">برسانا در حال ساخت جداول روولول ایزوله، مقداردهی کاتالوگ و اعمال تم است.</p>
            </div>

            {/* Progress bar */}
            <div className="space-y-1 max-w-xs mx-auto">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-600 h-full transition-all duration-500" 
                  style={{ width: `${creationProgress}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-slate-400 font-bold">
                <span>{creationProgress}% پیشرفت</span>
                <span>باقیمانده: کمتر از ۱۰ ثانیه</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: SUCCESS CHECKLIST */}
        {step === 6 && (
          <div className="space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/15">
                <Check className="w-8 h-8 stroke-[3.5px]" />
              </div>
              <h2 className="text-lg font-black text-slate-950 dark:text-white">تبریک! فروشگاه هوشمند شما آماده شد</h2>
              <p className="text-xs text-slate-400 font-bold">پایگاه داده به همراه دستیار تجاری RAG با موفقیت مقداردهی شد.</p>
            </div>

            {/* Dashboard details */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400">آدرس فروشگاه شما:</span>
                <a
                  href={`http://${subdomain}.${origin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-black text-blue-600 hover:underline font-mono"
                >
                  {subdomain}.{origin}
                </a>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400">پنل مدیریت اختصاصی:</span>
                <a
                  href={`http://${subdomain}.${origin}/admin`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-black text-blue-600 hover:underline font-mono"
                >
                  {subdomain}.{origin}/admin
                </a>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-900 rounded-2xl flex items-center gap-4">
              <div className="flex-1 space-y-1">
                <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4 text-blue-600" />
                  <span>ورود سریع با موبایل (QR Code)</span>
                </span>
                <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                  با اسکن این کد توسط دوربین گوشی، به سادگی فروشگاه خود را روی موبایل مشاهده کنید و ظاهر آن را بسنجید.
                </p>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs shrink-0 flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(`http://${subdomain}.${origin}`)}`}
                  alt="QR Code"
                  className="w-16 h-16 sm:w-20 sm:h-20"
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-3">
              <span className="text-[10px] font-black text-slate-400">اقدامات توصیه‌شده اولیه برای شروع کسب‌وکار:</span>
              <ul className="space-y-2.5 text-xs font-bold text-slate-600 dark:text-slate-300">
                <li className="flex gap-2 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>افزودن محصولات واقعی و ویرایش قیمت‌ها</span>
                </li>
                <li className="flex gap-2 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>فعال‌سازی درگاه پرداخت (زرین‌پال / زیبال)</span>
                </li>
                <li className="flex gap-2 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>تنظیمات نحوه ارسال بار (پست / تیپاکس)</span>
                </li>
                <li className="flex gap-2 items-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>چت و گفت‌وگو با دستیار سئو جهت بهبود ایندکس گوگل</span>
                </li>
              </ul>
            </div>

            <div className="flex gap-3 pt-2">
              <a
                href={`http://${subdomain}.${origin}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-center py-3.5 rounded-2xl text-xs font-black shadow-xs"
              >
                مشاهده فروشگاه
              </a>
              <a
                href={`http://${subdomain}.${origin}/admin`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/10"
              >
                ورود به پنل مدیریت
              </a>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
