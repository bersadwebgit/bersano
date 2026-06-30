'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Store, 
  Sparkles, 
  Rocket, 
  ShieldCheck, 
  Smartphone, 
  Zap, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  HelpCircle, 
  ChevronDown, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Globe, 
  Clock, 
  BarChart3, 
  HeartHandshake,
  Check,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

function getBaseDomain(host: string): string {
  if (!host) return 'localhost:3000';
  
  // Check if it's an IP address (with or without port)
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?$/;
  if (ipRegex.test(host)) {
    return host;
  }

  // Extract port if any
  const hostParts = host.split(':');
  const domainAndSubdomains = hostParts[0];
  const port = hostParts[1] ? `:${hostParts[1]}` : '';

  const parts = domainAndSubdomains.split('.');
  const tld = parts[parts.length - 1].toLowerCase();

  // Handle local domains robustly
  const localTLDs = ['localhost', 'local', 'test', 'dev', 'lan'];
  if (localTLDs.includes(tld) || domainAndSubdomains.toLowerCase() === 'localhost') {
    const mainLocalDomain = localTLDs.includes(tld) ? tld : 'localhost';
    return `${mainLocalDomain}${port}`;
  }
  
  if (parts.length <= 2) {
    return host;
  }
  
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  
  const isSLD = ['com', 'co', 'org', 'net', 'gov', 'edu'].includes(secondLast.toLowerCase());
  if (isSLD && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${secondLast}.${last}${port}`;
  }
  
  return `${secondLast}.${last}${port}`;
}

export default function SaaSLandingPage() {
  // Form States
  const [activeTab, setActiveTab] = useState<'register' | 'login'>('register');
  const [step, setStep] = useState(1);
  const [shopName, setShopName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [businessField, setBusinessField] = useState('general');
  const [customBusinessField, setCustomBusinessField] = useState('');
  
  // Wizard States
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [otpVerifyLoading, setOtpVerifyLoading] = useState(false);
  const [creationProgress, setCreationProgress] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [apiDone, setApiDone] = useState(false);
  const [pendingSuccessData, setPendingSuccessData] = useState<any>(null);
  
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  // Merchant Login States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Status States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successData, setSuccessData] = useState<any>(null);

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Subdomain preview helper
  const [mounted, setMounted] = useState(false);
  const [origin, setOrigin] = useState('localhost:3000');

  useEffect(() => {
    setMounted(true);
    if (typeof window !== 'undefined') {
      setOrigin(getBaseDomain(window.location.host));
    }
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Format countdown timer (e.g. 120 -> 02:00)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle subdomain auto-format (lowercase, replace spaces with hyphen, remove special chars)
  const handleSubdomainChange = (val: string) => {
    const formatted = val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSubdomain(formatted);
  };

  const nextStep = () => {
    setError('');
    if (step === 1) {
      if (!shopName) {
        setError('لطفاً نام فروشگاه خود را وارد کنید.');
        return;
      }
      if (!subdomain) {
        setError('لطفاً ساب‌دامین دلخواه خود را وارد کنید.');
        return;
      }
      if (subdomain.length < 3) {
        setError('ساب‌دامین باید حداقل ۳ کاراکتر باشد.');
        return;
      }
      setStep(2);
    }
  };

  const prevStep = () => {
    setError('');
    setStep(1);
  };

  const handleSendOtp = async () => {
    setError('');
    
    if (!contactPhone) {
      setError('لطفاً شماره موبایل خود را وارد کنید.');
      return;
    }

    const iranPhoneRegex = /^09\d{9}$/;
    if (!iranPhoneRegex.test(contactPhone.trim())) {
      setError('شماره موبایل وارد شده معتبر نیست. نمونه معتبر: 09123456789');
      return;
    }

    setOtpLoading(true);

    try {
      const res = await fetch('/api/auth/register/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: contactPhone,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setShowOtpInput(true);
        setError('');
        setWizardActive(true);
        setWizardStep(1);
        setTimer(120); // 2 minutes countdown
        setOtpValues(['', '', '', '', '']);
        
        // Focus first box with delay
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 300);

        if (data.devCode) {
          console.log(`[DEV ONLY] OTP verification code: ${data.devCode}`);
        }
      } else {
        setError(data.error || 'خطا در ارسال پیامک تایید.');
      }
    } catch (err) {
      setError('خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش کنید.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    const fullCode = otpValues.join('');
    if (fullCode.length < 5) {
      setError('لطفا کد تایید ۵ رقمی را به طور کامل وارد کنید');
      return;
    }

    setOtpVerifyLoading(true);

    try {
      const res = await fetch('/api/auth/register/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: contactPhone, code: fullCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setOtpCode(fullCode);
        setWizardStep(2); // Go to Owner Details step!
        setError('');
      } else {
        setError(data.error || 'کد وارد شده صحیح نیست یا منقضی شده است.');
      }
    } catch (err) {
      setError('خطا در تایید کد');
    } finally {
      setOtpVerifyLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    // Auto-focus next input if value is entered
    if (value && index < 4) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/merchant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        window.location.href = `http://${data.subdomain}.${origin}/admin/dashboard`;
      } else {
        setError(data.error || 'خطا در ورود به حساب کاربری.');
      }
    } catch (err) {
      setError('خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!shopName) {
      setError('لطفاً نام فروشگاه خود را وارد کنید.');
      return;
    }
    if (!subdomain) {
      setError('لطفاً ساب‌دامین دلخواه خود را وارد کنید.');
      return;
    }
    if (subdomain.length < 3) {
      setError('ساب‌دامین باید حداقل ۳ کاراکتر باشد.');
      return;
    }

    setLoading(true);
    setCreationProgress(0);
    setApiDone(false);
    setPendingSuccessData(null);

    // Choreographed progress intervals
    const intervalTime = 1600;
    let currentTick = 0;
    let localApiDone = false;
    let localSuccessData: any = null;

    const progressInterval = setInterval(() => {
      if (currentTick < 5) {
        currentTick += 1;
        setCreationProgress(currentTick);
      } else {
        // Reached the last tick (index 5)
        if (localApiDone) {
          clearInterval(progressInterval);
          setSuccessData(localSuccessData);
          setWizardStep(4);
          setLoading(false);
        }
      }
    }, intervalTime);

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
          customBusinessField: businessField === 'general' ? customBusinessField : '',
        }),
      });

      const data = await res.json();

      if (res.ok || (data && data.alreadyCreated)) {
        localApiDone = true;
        localSuccessData = data.shop;
        setApiDone(true);
        setPendingSuccessData(data.shop);

        // If progress is already at the end, complete now
        if (currentTick >= 5) {
          clearInterval(progressInterval);
          setTimeout(() => {
            setSuccessData(data.shop);
            setWizardStep(4);
            setLoading(false);
          }, 1000);
        }
      } else {
        clearInterval(progressInterval);
        setError(data.error || 'خطایی در ثبت اطلاعات رخ داد.');
        setLoading(false);
      }
    } catch (err) {
      clearInterval(progressInterval);
      setError('خطا در برقراری ارتباط با سرور. لطفاً مجدداً تلاش کنید.');
      setLoading(false);
    }
  };

  const faqs = [
    {
      q: "آیا ساخت فروشگاه واقعاً رایگان و آنی است؟",
      a: "بله! پس از پر کردن فرم بالا، فروشگاه شما به همراه پنل مدیریت اختصاصی در کمتر از ۱۰ ثانیه ساخته شده و آماده استفاده خواهد بود."
    },
    {
      q: "چگونه می‌توانم به پنل مدیریت فروشگاه خود دسترسی داشته باشم؟",
      a: "پس از ساخت فروشگاه، آدرس پنل مدیریت شما به صورت subdomain.yourdomain.com/admin خواهد بود که با ایمیل و رمز عبوری که در فرم ثبت نام وارد کرده‌اید می‌توانید وارد آن شوید."
    },
    {
      q: "آیا می‌توانم دامنه اختصاصی خودم (مثل mydomain.ir) را متصل کنم؟",
      a: "بله، کاملاً! در پنل مدیریت فروشگاه بخش تنظیمات، گزینه‌ای برای اتصال دامنه اختصاصی وجود دارد و شما می‌توانید به راحتی دامنه شخصی خود را به فروشگاه متصل کنید."
    },
    {
      q: "آیا امکانات فروشگاه برای موبایل بهینه شده است؟",
      a: "بله، پلتفرم ما بر اساس اصول Mobile-First طراحی شده است. ۱۰۰٪ بخش‌های فروشگاه و پنل مدیریت با بالاترین سرعت و بهترین تجربه کاربری روی گوشی‌های موبایل نمایش داده می‌شوند."
    },
    {
      q: "آیا محدونیتی در تعداد محصولات یا دسته‌بندی‌ها وجود دارد؟",
      a: "خیر، هیچ محدودیتی در نسخه اولیه وجود ندارد. شما می‌توانید بی‌نهایت محصول فیزیکی یا دیجیتالی، دسته‌بندی، پست وبلاگ و گالری تصاویر ایجاد کنید."
    }
  ];

  if (wizardActive) {
    const wizardProgressSteps = [
      { label: 'ایجاد پایگاه داده و زیرساخت ابری', desc: 'پیکربندی دیتابیس امن و جدول‌های اختصاصی فروشگاه' },
      { label: 'طراحی قالب و تم رنگی هوشمند', desc: `تنظیم تم رنگی و استایل‌های متناسب با صنف ${customBusinessField || 'عمومی'}` },
      { label: 'تولید هوشمند محصولات دمو توسط AI', desc: 'ایجاد محصولات دمو، گالری تصاویر و متادیتاها' },
      { label: 'ایجاد محتوای وبلاگ، اسلایدرها و استوری‌ها', desc: 'نگارش مقالات، ساخت اسلایدرها و استوری‌های تخصصی صنف' },
      { label: 'بهینه‌سازی سرعت و اعمال کشینگ', desc: 'فعال‌سازی فشرده‌سازی خودکار تصاویر و کشینگ تهاجمی Redis' },
      { label: 'ثبت نهایی ساب‌دامین و فعال‌سازی', desc: `اتصال آدرس ${subdomain}.${origin} به هسته مرکزی` }
    ];

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white flex flex-col justify-between" dir="rtl">
        
        {/* Wizard Header */}
        <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-900 px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-md font-black tracking-tight text-slate-900 dark:text-white">جادوگر راه‌اندازی فروشگاه</span>
              <span className="text-[10px] block font-bold text-blue-600 dark:text-blue-400">ثبت نام سریع در ۳ گام</span>
            </div>
          </div>
          {wizardStep < 4 && (
            <button
              onClick={() => {
                if (confirm('آیا از انصراف و خروج از مراحل ساخت فروشگاه اطمینان دارید؟ اطلاعات شما حفظ نخواهد شد.')) {
                  setWizardActive(false);
                  setError('');
                }
              }}
              className="text-xs text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-black flex items-center gap-1 bg-slate-100 hover:bg-rose-50 dark:bg-slate-900 dark:hover:bg-rose-950/20 px-3.5 py-2 rounded-xl transition-all"
            >
              انصراف و خروج
            </button>
          )}
        </header>

        {/* Wizard Body */}
        <main className="flex-1 py-8 px-4 flex flex-col items-center justify-center max-w-4xl mx-auto w-full">
          
          {/* Stepper (Only visible on step 1, 2, 3) */}
          {wizardStep < 4 && (
            <div className="w-full max-w-2xl mb-8">
              <div className="flex items-center justify-between relative px-2">
                {/* Progress track */}
                <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 -z-10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-500 rounded-full" 
                    style={{ width: `${((wizardStep - 1) / 2) * 100}%` }}
                  />
                </div>

                {/* Step 1 */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${wizardStep >= 1 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/15' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {wizardStep > 1 ? <Check className="w-5 h-5" /> : '۱'}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-black mt-2 ${wizardStep >= 1 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>تایید موبایل</span>
                </div>

                {/* Step 2 */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${wizardStep >= 2 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/15' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {wizardStep > 2 ? <Check className="w-5 h-5" /> : '۲'}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-black mt-2 ${wizardStep >= 2 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>حساب مدیر</span>
                </div>

                {/* Step 3 */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all ${wizardStep >= 3 ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/15' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    {wizardStep > 3 ? <Check className="w-5 h-5" /> : '۳'}
                  </div>
                  <span className={`text-[10px] sm:text-xs font-black mt-2 ${wizardStep >= 3 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>مشخصات فروشگاه</span>
                </div>
              </div>
            </div>
          )}

          {/* Card container for Wizard */}
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 p-6 sm:p-10 rounded-3xl shadow-xl shadow-slate-100/50 dark:shadow-none border border-slate-100 dark:border-slate-800/80">
            
            {/* Error Message inside the wizard card */}
            {error && wizardStep < 4 && (
              <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs border border-rose-100 dark:border-rose-900/30 font-bold animate-shake">
                ⚠️ {error}
              </div>
            )}

            {/* loading state covering the wizard steps */}
            {loading ? (
              <div className="py-6 flex flex-col space-y-8 animate-fade-in text-right">
                <div className="text-center space-y-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="inline-flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl mb-2 animate-bounce">
                    <Rocket className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white animate-pulse">در حال ساخت و تجهیز فروشگاه هوشمند شما...</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                    هوش مصنوعی شاپ‌بیلد در حال آماده‌سازی و بهینه‌سازی فروشگاه اختصاصی شما بر اساس زمینه فعالیت <span className="text-blue-600 dark:text-blue-400">«{customBusinessField || 'عمومی'}»</span> می‌باشد.
                  </p>
                </div>

                {/* Progress Checklist */}
                <div className="space-y-5 max-w-md mx-auto w-full">
                  {wizardProgressSteps.map((stepItem, idx) => {
                    const isCompleted = creationProgress > idx;
                    const isInProgress = creationProgress === idx;
                    const isPending = creationProgress < idx;

                    return (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-4 transition-all duration-300 ${
                          isCompleted ? 'opacity-100' : isInProgress ? 'opacity-100 scale-[1.01]' : 'opacity-40'
                        }`}
                      >
                        {/* Status Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          {isCompleted ? (
                            <div className="w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-500 dark:text-emerald-400 ring-4 ring-emerald-500/10 animate-fade-in">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                          ) : isInProgress ? (
                            <div className="w-6 h-6 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 ring-4 ring-blue-500/15 animate-pulse">
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-300 dark:text-slate-700">
                              <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                            </div>
                          )}
                        </div>

                        {/* Step Details */}
                        <div className="space-y-1">
                          <h4 className={`text-xs font-black transition-colors ${
                            isCompleted ? 'text-emerald-600 dark:text-emerald-400 line-through' : isInProgress ? 'text-blue-600 dark:text-blue-400 font-extrabold' : 'text-slate-700 dark:text-slate-300'
                          }`}>
                            {stepItem.label}
                          </h4>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                            {stepItem.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Loading bar at the bottom */}
                <div className="space-y-2 pt-4">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-black px-2">
                    <span>پیشرفت مراحل</span>
                    <span>{Math.round(((creationProgress + 1) / 6) * 100)}٪</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-sm shadow-blue-500/30" 
                      style={{ width: `${((creationProgress + 1) / 6) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* WIZARD STEP 1: OTP Verification */}
                {wizardStep === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">تایید شماره موبایل</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                        کد ۵ رقمی ارسال شده به شماره <span className="font-bold text-slate-800 dark:text-slate-200 font-mono tracking-wider" dir="ltr">{contactPhone}</span> را وارد کنید.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setWizardActive(false);
                          setError('');
                        }}
                        className="text-xs text-blue-600 font-black mt-2.5 hover:underline flex items-center gap-1 mx-auto"
                      >
                        <ArrowRight className="w-3.5 h-3.5" /> ویرایش شماره موبایل
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-center gap-3.5 py-4" dir="ltr">
                        {[0, 1, 2, 3, 4].map((index) => (
                          <input
                            key={index}
                            ref={(el) => { otpRefs.current[index] = el; }}
                            type="text"
                            maxLength={1}
                            pattern="\d*"
                            inputMode="numeric"
                            value={otpValues[index]}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-12 h-14 sm:w-16 sm:h-18 text-center text-3xl font-black rounded-2xl border-2 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                          />
                        ))}
                      </div>

                      {/* Resend and timer */}
                      <div className="text-center">
                        {timer > 0 ? (
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                            امکان ارسال مجدد کد پس از <span className="font-mono font-bold text-blue-600">{formatTime(timer)}</span>
                          </p>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSendOtp}
                            disabled={otpLoading}
                            className="text-xs text-blue-600 font-extrabold hover:text-blue-700 flex items-center gap-1.5 mx-auto hover:underline"
                          >
                            <RefreshCw className={`w-4 h-4 ${otpLoading ? 'animate-spin' : ''}`} /> ارسال مجدد کد تایید
                          </button>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyOtp}
                      disabled={otpVerifyLoading || otpValues.join('').length < 5}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2 text-sm mt-4 font-sans font-black"
                    >
                      {otpVerifyLoading ? (
                        <RefreshCw className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <span>تایید و ادامه</span>
                          <ArrowLeft className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* WIZARD STEP 2: Owner Account Info */}
                {wizardStep === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">مشخصات حساب کاربری شما</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">از این اطلاعات برای ورود و مدیریت پنل فروشگاه استفاده خواهید کرد.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          نام و نام خانوادگی مدیر فروشگاه <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            value={ownerName}
                            onChange={(e) => setOwnerName(e.target.value)}
                            className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold"
                            placeholder="مثال: سهراب حسینی"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          ایمیل معتبر مدیر <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative" dir="ltr">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="email"
                            value={ownerEmail}
                            onChange={(e) => setOwnerEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold text-left"
                            placeholder="your-email@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          رمز عبور پنل مدیریت <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative" dir="ltr">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={ownerPassword}
                            onChange={(e) => setOwnerPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold tracking-widest text-left"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                        <div className="flex items-center justify-end mt-2">
                          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-slate-500 dark:text-slate-400">
                            <input 
                              type="checkbox" 
                              checked={showPassword} 
                              onChange={() => setShowPassword(!showPassword)}
                              className="rounded border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            نمایش رمز عبور
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-black"
                      >
                        <ArrowRight className="w-4 h-4" />
                        مرحله قبل
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (!ownerName || !ownerEmail || !ownerPassword) {
                            setError('لطفاً تمامی فیلدهای ستاره‌دار را پر کنید.');
                            return;
                          }
                          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                          if (!emailRegex.test(ownerEmail)) {
                            setError('لطفاً یک ایمیل معتبر وارد کنید.');
                            return;
                          }
                          if (ownerPassword.length < 6) {
                            setError('رمز عبور باید حداقل ۶ کاراکتر باشد.');
                            return;
                          }
                          setError('');
                          setWizardStep(3); // Go to step 3: Shop info!
                        }}
                        className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-black"
                      >
                        <span>مرحله بعد: مشخصات فروشگاه</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* WIZARD STEP 3: Shop Setup */}
                {wizardStep === 3 && (
                  <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in">
                    <div className="text-center">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">مشخصات فروشگاه شما</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">تم، لایه‌ها و هویت فروشگاه شما بر اساس این اطلاعات پیکربندی می‌شود.</p>
                    </div>

                    <div className="space-y-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          نام فروشگاه شما <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Store className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            value={shopName}
                            onChange={(e) => setShopName(e.target.value)}
                            className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold"
                            placeholder="مثال: عسل طبیعی زاگرس"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          آدرس اینترنتی فروشگاه شما (ساب‌دامین) <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative" dir="ltr">
                          <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            value={subdomain}
                            onChange={(e) => handleSubdomainChange(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-mono font-bold"
                            placeholder="zagros-honey"
                            required
                          />
                        </div>
                        {mounted && subdomain && (
                          <div className="mt-2.5 flex items-center justify-start">
                            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg font-mono font-bold" dir="ltr">
                              http://{subdomain}.{origin}
                            </span>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          زمینه فعالیت یا صنف فروشگاه شما <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="text"
                            value={customBusinessField}
                            onChange={(e) => setCustomBusinessField(e.target.value)}
                            placeholder="مثال: لوازم خانگی، پت شاپ، فروش ادویه‌جات، پوشاک کودک و..."
                            className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold"
                            required
                          />
                        </div>
                        <p className="text-[10px] text-blue-600 dark:text-blue-400 font-bold leading-relaxed mt-2.5">
                          ✨ تمامی محصولات نمونه، مقالات وبلاگ، دسته‌بندی‌ها، تصاویر اسلایدر، استوری‌ها و تم رنگی فروشگاه شما به صورت ۱۰۰٪ هوشمند بر اساس این صنف توسط هوش مصنوعی تولید و بهینه‌سازی خواهد شد!
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-black"
                      >
                        <ArrowRight className="w-4 h-4" />
                        مرحله قبل
                      </button>

                      <button
                        type="submit"
                        className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-black"
                      >
                        <Rocket className="w-4 h-4" />
                        ساخت نهایی فروشگاه 🚀
                      </button>
                    </div>
                  </form>
                )}

                {/* WIZARD STEP 4: Success state */}
                {wizardStep === 4 && successData && (
                  <div className="space-y-6 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center text-4xl mx-auto animate-bounce shadow-md">
                      🎉
                    </div>
                    
                    <div className="space-y-2">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">تبریک فراوان! فروشگاه شما با موفقیت ساخته شد</h2>
                      <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-lg mx-auto">
                        فروشگاه اختصاصی شما با نام <strong className="text-blue-600 dark:text-blue-400">{successData.shopName}</strong> ساخته شد و در انتظار تایید مدیریت است. شما می‌توانید وارد پنل مدیریت خود شده و محصولات و تنظیمات فروشگاه خود را پیکربندی کنید.
                      </p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 text-right space-y-4">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">آدرس فروشگاه شما:</span>
                        <a 
                          href={`http://${successData.subdomain}.${origin}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs sm:text-sm font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-2 justify-end bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800"
                          dir="ltr"
                        >
                          http://{successData.subdomain}.{origin}
                          <ExternalLink className="w-4 h-4 text-blue-600" />
                        </a>
                      </div>

                      <div className="pt-2">
                        <span className="text-[10px] text-slate-400 font-bold block mb-1">آدرس پنل مدیریت:</span>
                        <a 
                          href={`http://${successData.subdomain}.${origin}/admin/login`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-xs sm:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-2 justify-end bg-white dark:bg-slate-900 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800"
                          dir="ltr"
                        >
                          http://{successData.subdomain}.{origin}/admin/login
                          <ExternalLink className="w-4 h-4 text-indigo-600" />
                        </a>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-4">
                      <a
                        href={`http://${successData.subdomain}.${origin}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold py-4 px-4 rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-black"
                      >
                        مشاهده فروشگاه ساخته شده
                      </a>

                      <a
                        href={`http://${successData.subdomain}.${origin}/admin/login`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs font-black"
                      >
                        ورود به پنل مدیریت فروشگاه
                        <ArrowLeft className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}
              </>
            )}

          </div>
        </main>

        {/* Wizard Footer */}
        <footer className="bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-900 py-4 text-center">
          <p className="text-[10px] text-slate-400 font-bold">
            پشتیبانی ۲۴ ساعته شاپ بیلدر | در تمام مراحل در کنار شما هستیم.
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500 selection:text-white" dir="rtl">
      
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-black/80 border-b border-slate-100 dark:border-slate-900 px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">شاپ بیلدر</span>
              <span className="text-[10px] block font-bold text-blue-600 dark:text-blue-400">پلتفرم فروشگاه‌ساز ابری</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <a 
              href="#create-shop-section" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm transition-all active:scale-95"
            >
              ساخت فروشگاه رایگان
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-12 items-center">
            
            {/* Hero Text */}
            <div className="lg:col-span-7 space-y-8 text-center lg:text-right">
              <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>نسل جدید فروشگاه‌سازهای ابری و هوشمند</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight sm:leading-none">
                فروشگاه اینترنتی خود را در <span className="text-blue-600 dark:text-blue-400 underline decoration-wavy decoration-2 underline-offset-8">۶۰ ثانیه</span> بسازید!
              </h1>
              
              <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto lg:mx-0">
                بدون نیاز به دانش فنی یا برنامه‌نویسی، با کامل‌ترین امکانات، فروشگاه اختصاصی خود را راه‌اندازی کنید. پنل مدیریت پیشرفته، سرعت لود فوق‌العاده، بهینه‌سازی شده برای موبایل و تیکت پشتیبانی مشتریان.
              </p>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 max-w-md mx-auto lg:mx-0">
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                  <span className="block text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">۱۰ ثانیه</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold">تحویل آنی پنل</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                  <span className="block text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">+۱۰,۰۰۰</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold">فروشگاه فعال</span>
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 text-center">
                  <span className="block text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">۱۰۰٪</span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold">ریسپانسیو موبایل</span>
                </div>
              </div>
            </div>

            {/* Form Section */}
            <div id="create-shop-section" className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-3xl shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800/80 relative">
                
                {/* Decorative background light */}
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
                
                {/* Tab Selector */}
                {step < 3 && (
                  <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl mb-6 select-none">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('register'); setError(''); }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'register' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                    >
                      ساخت فروشگاه جدید
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('login'); setError(''); }}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'login' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'}`}
                    >
                      ورود به پنل مدیریت
                    </button>
                  </div>
                )}

                {/* Error Alert on Landing Page Card */}
                {error && activeTab === 'login' && (
                  <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs border border-rose-100 dark:border-rose-900/30 font-bold">
                    ⚠️ {error}
                  </div>
                )}

                {/* Error Alert for Register on Landing Page Card */}
                {error && activeTab === 'register' && (
                  <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs border border-rose-100 dark:border-rose-900/30 font-bold">
                    ⚠️ {error}
                  </div>
                )}

                {/* Merchant Login Form */}
                {activeTab === 'login' && (
                  <form onSubmit={handleLogin} className="space-y-5">
                    <div className="text-center sm:text-right">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">ورود به پنل مدیریت فروشگاه</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">ایمیل و رمز عبور مدیریت فروشگاه خود را وارد کنید</p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          ایمیل مدیر <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative" dir="ltr">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold text-left"
                            placeholder="admin@example.com"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                          رمز عبور <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative" dir="ltr">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold tracking-widest text-left"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3.5 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs mt-6 disabled:opacity-70"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          ورود به پنل مدیریت
                          <ArrowLeft className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Merchant Phone Number Registration Form */}
                {activeTab === 'register' && (
                  <div className="space-y-6">
                    <div className="text-center sm:text-right">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">ساخت فوری فروشگاه اینترنتی</h3>
                      <p className="text-xs text-slate-400 font-bold mt-2 leading-relaxed">
                        جهت شروع فرآیند هوشمند راه‌اندازی و تحویل آنی فروشگاه، شماره همراه خود را وارد کنید.
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                          شماره موبایل مدیر <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <Phone className="absolute right-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={(e) => setContactPhone(e.target.value)}
                            className="w-full pr-11 pl-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none transition-all text-sm font-semibold tracking-wider text-left font-mono"
                            placeholder="09123456789"
                            required
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={otpLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-xs mt-4 disabled:opacity-70 font-sans"
                    >
                      {otpLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>ساخت فوری فروشگاه</span>
                          <ArrowLeft className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
        
        {/* Decorative background blur blobs */}
        <div className="absolute top-1/4 left-0 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-3xl -z-10" />
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white dark:bg-slate-950 border-y border-slate-100 dark:border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">کامل‌ترین امکانات برای رشد کسب‌وکار شما</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              هر آنچه برای مدیریت محصولات، سفارشات، مشتریان و بازاریابی نیاز دارید، در یک پلتفرم یکپارچه و فوق‌العاده سریع در اختیار شماست.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Feature 1 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">سرعت لود زیر ۵۰۰ میلی‌ثانیه</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                با استفاده از تکنولوژی پیشرفته Next.js و کشینگ تهاجمی، صفحات فروشگاه شما در کسری از ثانیه لود می‌شوند تا مشتریان را از دست ندهید.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-6">
                <Smartphone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">طراحی اول-موبایل (Mobile-First)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                بیش از ۸۰٪ خریدهای اینترنتی با موبایل انجام می‌شود. قالب‌های ما ۱۰۰٪ برای موبایل بهینه‌سازی شده‌اند و تجربه‌ای شبیه به اپلیکیشن ارائه می‌دهند.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">امنیت و پایداری تضمین‌شده</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                فروشگاه شما روی سرورهای ابری امن میزبانی می‌شود و اطلاعات شما و مشتریانتان با بالاترین استانداردهای امنیتی محافظت می‌گردد.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mb-6">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">اتصال دامنه اختصاصی</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                می‌توانید دامنه شخصی خود (مانند yourdomain.com) را به راحتی متصل کنید تا برند شما کاملاً مستقل و حرفه‌ای دیده شود.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">راه‌اندازی فوق‌العاده سریع</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                هیچ نیازی به نصب، پیکربندی یا خرید هاست ندارید. همه‌چیز به صورت ابری و خودکار در چند ثانیه تحویل شما می‌شود.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800/50 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mb-6">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">پشتیبانی و تیکت مشتریان</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                سیستم تیکتینگ داخلی به مشتریان شما اجازه می‌دهد تا به راحتی با شما در ارتباط باشند و مشکلات خود را پیگیری کنند.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* Step-by-Step Guide */}
      <section className="py-24 bg-slate-50 dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-20">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">راه‌اندازی فروشگاه در ۳ گام ساده</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              مسیر شما برای داشتن یک کسب‌وکار آنلاین موفق و حرفه‌ای بسیار ساده‌تر از آن چیزی است که فکر می‌کنید.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            
            {/* Step 1 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/80 relative space-y-4 text-center md:text-right">
              <span className="text-5xl font-black text-blue-600/10 dark:text-blue-400/10 absolute left-6 top-6">۰۱</span>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-sm font-black">
                ۱
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">ثبت اطلاعات فروشگاه</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                نام فروشگاه و آدرس اینترنتی (ساب‌دامین) دلخواه خود را در فرم بالای صفحه وارد کنید.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/80 relative space-y-4 text-center md:text-right">
              <span className="text-5xl font-black text-blue-600/10 dark:text-blue-400/10 absolute left-6 top-6">۰۲</span>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-sm font-black">
                ۲
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">تحویل آنی پنل مدیریت</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                سیستم بلافاصله فروشگاه شما را پیکربندی کرده و پنل مدیریت و قالب فروشگاهی را تحویل می‌دهد.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800/80 relative space-y-4 text-center md:text-right">
              <span className="text-5xl font-black text-blue-600/10 dark:text-blue-400/10 absolute left-6 top-6">۰۳</span>
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center text-sm font-black">
                ۳
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">افزودن محصول و شروع فروش</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                محصولات خود را اضافه کنید، رنگ و تم فروشگاه را شخصی‌سازی کنید و لینک فروشگاه را با مشتریان به اشتراک بگذارید.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-24 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">سوالات متداول</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
              پاسخ رایج‌ترین سوالات کاربران درباره پلتفرم شاپ بیلدر
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div 
                key={idx} 
                className="bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800/60 overflow-hidden transition-all"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full px-6 py-5 text-right flex items-center justify-between gap-4 text-slate-900 dark:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/50 transition-all"
                >
                  <span className="text-sm font-black">{faq.q}</span>
                  <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${openFaq === idx ? 'rotate-180' : ''}`} />
                </button>
                
                {openFaq === idx && (
                  <div className="px-6 pb-5 pt-1 text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed border-t border-slate-100 dark:border-slate-800/40">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-right">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
            
            <div className="space-y-4">
              <div className="flex items-center justify-center sm:justify-start gap-2.5">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-black text-white">شاپ بیلدر</span>
              </div>
              <p className="text-xs leading-relaxed font-bold">
                پلتفرم ابری ساخت فروشگاه‌های اینترنتی چند مستاجره با بالاترین سرعت و مدرن‌ترین امکانات.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black text-white">امکانات پلتفرم</h4>
              <ul className="text-xs space-y-2 font-bold">
                <li>پنل مدیریت اختصاصی</li>
                <li>سرعت لود فوق‌العاده</li>
                <li>بهینه‌سازی شده برای موبایل</li>
                <li>سیستم وبلاگ و تیکتینگ</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black text-white">دسترسی سریع</h4>
              <ul className="text-xs space-y-2 font-bold">
                <li><a href="#create-shop-section" className="hover:text-white transition-all">ساخت فروشگاه</a></li>
                <li><a href="#features-section" className="hover:text-white transition-all">امکانات و ویژگی‌ها</a></li>
                <li><a href="#faq-section" className="hover:text-white transition-all">سوالات متداول</a></li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-black text-white">پشتیبانی</h4>
              <ul className="text-xs space-y-2 font-bold">
                <li>تلفن: ۰۲۱-۱۲۳۴۵۶۷۸</li>
                <li>ایمیل: support@shopbuilder.com</li>
                <li>ساعات کاری: شنبه تا چهارشنبه ۹ الی ۱۷</li>
              </ul>
            </div>

          </div>

          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-bold">
            <p>© ۲۰۲۶ شاپ بیلدر. تمامی حقوق محفوظ است.</p>
            <p>قدرت گرفته از پلتفرم ابری چند مستاجره</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
