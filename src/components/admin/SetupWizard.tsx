'use strict';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronRight, 
  Building2, 
  Palette, 
  Phone, 
  MapPin, 
  Mail, 
  Check, 
  Loader2, 
  Laptop, 
  Shirt, 
  Flame, 
  Grid, 
  BookOpen, 
  HeartHandshake, 
  Crown, 
  ShieldCheck,
  Leaf,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Eye,
  ShoppingBag,
  CheckCircle2
} from 'lucide-react';

interface SetupWizardProps {
  shopName: string;
  contactPhone: string;
  contactEmail: string;
  onComplete: () => void;
}

export default function SetupWizard({ 
  shopName: initialShopName, 
  contactPhone: initialPhone, 
  contactEmail: initialEmail, 
  onComplete 
}: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [aiStatusStep, setAiStatusStep] = useState(0);

  // Form states
  const [shopName, setShopName] = useState(initialShopName || '');
  const [businessField, setBusinessField] = useState('general');
  const [themeColor, setThemeColor] = useState('#2563eb');
  const [vibe, setVibe] = useState('trust'); // trust, luxury, modern, energetic, eco, technology
  const [contactPhone, setContactPhone] = useState(initialPhone || '');
  const [contactEmail, setContactEmail] = useState(initialEmail || '');
  const [address, setAddress] = useState('');
  const [productType, setProductType] = useState('physical');
  const [shortDescription, setShortDescription] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [activityLocation, setActivityLocation] = useState('');

  // Onboarding questions state (for low confidence)
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string>>({});

  // Preview data state
  const [previewData, setPreviewData] = useState<any>(null);

  // AI color suggestion state
  const [suggestedColor, setSuggestedColor] = useState<{ color: string; label: string; vibe: string } | null>(null);

  // Auto detect industry and suggest color based on shopName or field
  useEffect(() => {
    const text = (shopName + " " + businessField).toLowerCase();
    let detected: { color: string; label: string; vibe: string } | null = null;

    if (/قهوه|کافه|شکلات|کیک|نان|شیرینی|کافی|سید کافه|شکلاتی/i.test(text)) {
      detected = { color: '#78350f', label: 'قهوه‌ای گرم (کافه و شکلات)', vibe: 'energetic' };
    } else if (/پزشک|سلامت|درمان|کلینیک|دارو|مطب|دندانپزشک|تجهیزات پزشکی|بیمارستان|پرستار/i.test(text)) {
      detected = { color: '#0ea5e9', label: 'آبی سلامت (تجهیزات پزشکی)', vibe: 'trust' };
    } else if (/مبل|چوب|دکور|میز|صندلی|نجاری|ام‌دی‌اف|کابینت/i.test(text)) {
      detected = { color: '#b45309', label: 'قهوه‌ای چوب / دکوراسیون', vibe: 'luxury' };
    } else if (/گل|گیاه|گلدان|کشاورزی|باغ|طبیعی/i.test(text)) {
      detected = { color: '#059669', label: 'سبز گیاهی (طبیعت و ارگانیک)', vibe: 'eco' };
    } else if (/پت|حیوان|سگ|گربه|پرنده|ماهی|دامپزشک/i.test(text)) {
      detected = { color: '#d97706', label: 'خردلی پت شاپ (حیوانات خانگی)', vibe: 'energetic' };
    } else if (/طلا|جواهر|لوکس|گالری طلا|لاکچری|نقره|الماس/i.test(text)) {
      detected = { color: '#b45309', label: 'طلایی لوکس (طلا و جواهر)', vibe: 'luxury' };
    } else if (/ورزش|اسپرت|باشگاه|فوتبال|کتونی|تندرستی/i.test(text)) {
      detected = { color: '#dc2626', label: 'قرمز پرهیجان (ورزش و اسپرت)', vibe: 'energetic' };
    } else if (/غذا|رستوران|پیتزا|فست فود|ساندویچ|آشپز/i.test(text)) {
      detected = { color: '#ea580c', label: 'نارنجی اشتهاآور (صنایع غذایی)', vibe: 'energetic' };
    } else if (/کتاب|دفتر|تحریر|مدرسه|آموزش|دانشگاه|کنکور/i.test(text)) {
      detected = { color: '#0284c7', label: 'آبی تیره مینی‌مال (آموزش و فرهنگی)', vibe: 'eco' };
    } else if (/تکنولوژی|دیجیتال|موبایل|کامپیوتر|لپ تاپ|برنامه|آیتی|گجت|سخت افزار/i.test(text)) {
      detected = { color: '#7c3aed', label: 'بنفش فوتوریستیک (تکنولوژی و لوازم جانبی)', vibe: 'technology' };
    } else if (/آرایش|پوست|زیبایی|بهداشتی|عطر|ادکلن|مزون/i.test(text)) {
      detected = { color: '#db2777', label: 'صورتی آرایشی و زیبایی شاپ', vibe: 'energetic' };
    } else if (/پوشاک|لباس|مد|مزون|بوتیک|کیف|کفش/i.test(text)) {
      detected = { color: '#ec4899', label: 'صورتی مد و فشن', vibe: 'energetic' };
    }

    if (detected) {
      setSuggestedColor(detected);
      setThemeColor(detected.color);
      setVibe(detected.vibe);
    } else {
      setSuggestedColor(null);
    }
  }, [shopName, businessField]);

  // AI progress logging list
  const aiSteps = [
    'در حال تحلیل اطلاعات برند و مخاطبان هدف...',
    'در حال استخراج روانشناسی رنگ متناسب با حوزه فعالیت شما...',
    'در حال تدوین بیانیه برند و توضیحات سئو با هوش مصنوعی...',
    'در حال پیکربندی مینی‌مال دسته‌بندی‌ها و محصولات نمونه...',
    'در حال بهینه‌سازی کدهای رنگی و تم سراسری فروشگاه...',
    'پیش‌نمایش هوشمند با موفقیت آماده شد! 🎉'
  ];

  // Map vibe to colors
  const vibes = [
    { id: 'trust', name: 'آرامش و اعتماد', desc: 'آبی اقیانوسی عمیق', color: '#2563eb', bg: 'bg-blue-50 dark:bg-blue-950/20', border: 'border-blue-200 dark:border-blue-900', text: 'text-blue-600', icon: ShieldCheck },
    { id: 'luxury', name: 'لوکس و پرمیوم', desc: 'سرمه‌ای عمیق و طلایی', color: '#0f172a', bg: 'bg-slate-900', border: 'border-amber-500', text: 'text-amber-400', icon: Crown },
    { id: 'modern', name: 'مدرن و مینی‌مال', desc: 'خاکستری تیره مینی‌مال', color: '#374151', bg: 'bg-zinc-100 dark:bg-zinc-800', border: 'border-zinc-400', text: 'text-zinc-700 dark:text-zinc-300', icon: Laptop },
    { id: 'energetic', name: 'پویا و خلاق', desc: 'نارنجی و قرمز پرحرارت', color: '#ea580c', bg: 'bg-orange-50 dark:bg-orange-950/20', border: 'border-orange-200 dark:border-orange-900', text: 'text-orange-600', icon: Flame },
    { id: 'eco', name: 'طبیعت و سلامت', desc: 'سبز زمردی ملایم', color: '#059669', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-200 dark:border-emerald-900', text: 'text-emerald-600', icon: Leaf },
    { id: 'technology', name: 'تکنولوژی و فوتوریستیک', desc: 'بنفش نئونی الکتریکال', color: '#7c3aed', bg: 'bg-violet-50 dark:bg-violet-950/20', border: 'border-violet-200 dark:border-violet-900', text: 'text-violet-600', icon: Sparkles }
  ];

  const industries = [
    { id: 'clothing', name: 'پوشاک و مد', desc: 'لباس، کیف و کفش، اکسسوری', icon: Shirt, defaultColor: '#db2777', defaultVibe: 'energetic' },
    { id: 'electronics', name: 'لوازم دیجیتال و جانبی', desc: 'موبایل، کامپیوتر، گجت‌های هوشمند', icon: Laptop, defaultColor: '#7c3aed', defaultVibe: 'technology' },
    { id: 'cosmetics', name: 'آرایشی و بهداشتی', desc: 'مراقبت پوست و مو، زیبایی، عطر', icon: HeartHandshake, defaultColor: '#ec4899', defaultVibe: 'trust' },
    { id: 'food', name: 'سوپرمارکت و مواد غذایی', desc: 'خوراکی، آشپزی، سوپرمارکت آنلاین', icon: Flame, defaultColor: '#f97316', defaultVibe: 'energetic' },
    { id: 'education', name: 'کتاب، تحریر و آموزش', desc: 'کتاب، نوشت‌افزار، دوره‌های آموزشی', icon: BookOpen, defaultColor: '#059669', defaultVibe: 'eco' },
    { id: 'general', name: 'سایر / عمومی', desc: 'فروشگاه چندمنظوره با دسته‌بندی عمومی', icon: Grid, defaultColor: '#2563eb', defaultVibe: 'trust' }
  ];

  // Auto update color when industry or vibe changes
  const selectIndustry = (id: string) => {
    setBusinessField(id);
    const ind = industries.find(item => item.id === id);
    if (ind) {
      setThemeColor(ind.defaultColor);
      setVibe(ind.defaultVibe);
    }
  };

  const selectVibe = (v: typeof vibes[0]) => {
    setVibe(v.id);
    setThemeColor(v.color);
  };

  // Run AI processing animation
  useEffect(() => {
    if (loading && step === 4) {
      const interval = setInterval(() => {
        setAiStatusStep(prev => {
          if (prev < aiSteps.length - 1) {
            return prev + 1;
          } else {
            clearInterval(interval);
            fetchPreviewData();
            return prev;
          }
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [loading, step]);

  const fetchPreviewData = async (customAnswers?: Record<string, string>) => {
    try {
      // Append onboarding answers if provided
      const finalDesc = customAnswers 
        ? `${shortDescription}. پاسخ به سوالات: ${Object.entries(customAnswers).map(([q, a]) => `${q}: ${a}`).join(' | ')}`
        : shortDescription;

      const response = await fetch('/api/admin/onboarding/seed/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopName,
          businessField,
          themeColor,
          contactPhone,
          contactEmail,
          address,
          productType,
          shortDescription: finalDesc,
          targetAudience,
          brandTone: vibe,
          activityLocation
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data);
        setStep(5);
        setLoading(false);
      } else {
        const err = await response.json();
        alert(err.error || 'خطایی در دریافت پیش‌نمایش رخ داد.');
        setLoading(false);
        setAiStatusStep(0);
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه در ارتباط با سرور.');
      setLoading(false);
      setAiStatusStep(0);
    }
  };

  const handleSaveSeed = async () => {
    if (!previewData || !previewData.jobId) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/onboarding/seed/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: previewData.jobId,
          shopName,
          themeColor,
          contactPhone,
          contactEmail,
          address
        })
      });

      if (response.ok) {
        onComplete();
      } else {
        const err = await response.json();
        alert(err.error || 'خطایی در ذخیره‌سازی رخ داد.');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه.');
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setAiStatusStep(0);
    setStep(4);
    await fetchPreviewData(onboardingAnswers);
  };

  const handleDeleteSample = async () => {
    if (!confirm('آیا از حذف تمام داده‌های نمونه هوش مصنوعی اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/admin/onboarding/seed/sample-data', {
        method: 'DELETE'
      });
      if (response.ok) {
        alert('تمام داده‌های نمونه با موفقیت حذف شدند.');
        onComplete();
      } else {
        const err = await response.json();
        alert(err.error || 'خطایی رخ داد.');
        setLoading(false);
      }
    } catch (error) {
      console.error(error);
      alert('خطای شبکه.');
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !shopName.trim()) {
      alert('لطفاً نام فروشگاه خود را وارد کنید.');
      return;
    }
    if (step < 4) {
      setStep(prev => prev + 1);
    } else {
      setLoading(true);
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none" dir="rtl">
      {/* Glow Ambient Effect */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] bg-violet-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-700"></div>

      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden transition-all duration-300">
        
        {/* Header Ribbon / AI Badge */}
        <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"></div>

        {!loading ? (
          step < 5 ? (
            <div className="p-6 md:p-8 space-y-6">
              
              {/* Steps & Progress Indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 rounded-xl">
                    <Sparkles className="w-5 h-5 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">پیکربندی هوشمند فروشگاه</h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">جادوگر هوش مصنوعی پلتفرم</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((s) => (
                    <div 
                      key={s} 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        s === step 
                          ? 'w-8 bg-violet-600 dark:bg-violet-500' 
                          : s < step 
                            ? 'w-5 bg-emerald-500 dark:bg-emerald-600' 
                            : 'w-2 bg-slate-200 dark:bg-slate-800'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Step 1: Industry & Shop Name */}
              {step === 1 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="text-center space-y-1.5">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">بخش اول: معرفی برند شما 🚀</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      اطلاعات پایه برند خود را وارد کنید تا هوش مصنوعی قالب تستی و منوها را شخصی‌سازی کند.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-violet-500" />
                        نام برند / فروشگاه شما:
                      </label>
                      <input 
                        type="text" 
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="مانند: گالری پوشاک ونوس، دیجیتال لند و..."
                        className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white transition-all outline-none"
                      />
                    </div>

                    {/* Product Type Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        نوع محصولات فروشگاه شما (پیش‌فرض: فروش فیزیکی):
                      </label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { id: 'physical', name: 'فروش فیزیکی', desc: 'کالا، لباس، قطعات و...', icon: Shirt },
                          { id: 'digital', name: 'فروش دانلودی', desc: 'فایل، کتاب، دوره و...', icon: BookOpen },
                          { id: 'both', name: 'هر دو نوع محصول', desc: 'فیزیکی و دانلودی', icon: Grid }
                        ].map((type) => {
                          const IconComponent = type.icon;
                          const isSelected = productType === type.id;
                          return (
                            <button
                              key={type.id}
                              type="button"
                              onClick={() => setProductType(type.id)}
                              className={`p-3 text-right rounded-2xl border transition-all flex flex-col items-center justify-center gap-2 select-none ${
                                isSelected 
                                  ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-500 dark:border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5' 
                                  : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className={`p-2 rounded-xl transition-all ${
                                isSelected 
                                  ? 'bg-violet-500 text-white shadow-sm' 
                                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                              }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="text-center space-y-0.5">
                                <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200">{type.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{type.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">
                        زمینه فعالیت و صنعت کسب‌وکار:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {industries.map((ind) => {
                          const IconComponent = ind.icon;
                          const isSelected = businessField === ind.id;
                          return (
                            <button
                              key={ind.id}
                              type="button"
                              onClick={() => selectIndustry(ind.id)}
                              className={`p-3.5 text-right rounded-2xl border transition-all flex items-start gap-3 select-none ${
                                isSelected 
                                  ? 'bg-violet-50/50 dark:bg-violet-950/20 border-violet-500 dark:border-violet-500 ring-2 ring-violet-500/20 shadow-md shadow-violet-500/5' 
                                  : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className={`p-2 rounded-xl transition-all ${
                                isSelected 
                                  ? 'bg-violet-500 text-white shadow-sm' 
                                  : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400'
                              }`}>
                                <IconComponent className="w-4 h-4" />
                              </div>
                              <div className="space-y-0.5">
                                <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200">{ind.name}</h4>
                                <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{ind.desc}</p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Brand Identity & Audience */}
              {step === 2 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="text-center space-y-1.5">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">بخش دوم: هویت و مخاطبان برند شما 🎯</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      با ارائه جزئیات بیشتر، به هوش مصنوعی کمک کنید تا محتوایی کاملاً اختصاصی و متقاعدکننده برای برند شما تولید کند.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        توضیح کوتاه کسب‌وکار (ماموریت یا ارزش پیشنهادی):
                      </label>
                      <textarea 
                        value={shortDescription}
                        onChange={(e) => setShortDescription(e.target.value)}
                        placeholder="مثال: تولید و عرضه مستقیم پوشاک جین باکیفیت و طراحی مدرن با قیمت منصفانه..."
                        rows={3}
                        className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <HeartHandshake className="w-4 h-4 text-violet-500" />
                          مخاطب هدف شما کیست؟
                        </label>
                        <input 
                          type="text" 
                          value={targetAudience}
                          onChange={(e) => setTargetAudience(e.target.value)}
                          placeholder="مثال: جوانان شیک‌پوش، برنامه‌نویسان، مادران و..."
                          className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-violet-500" />
                          شهر یا کشور محل فعالیت (اختیاری):
                        </label>
                        <input 
                          type="text" 
                          value={activityLocation}
                          onChange={(e) => setActivityLocation(e.target.value)}
                          placeholder="مثال: تهران، مشهد، سراسر کشور"
                          className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Vibe & Theme Color Selector */}
              {step === 3 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="text-center space-y-1.5">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">بخش سوم: سبک بصری و رنگ‌بندی تم 🎨</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      روحیه کلی (لحن برند) و رنگ‌بندی حاکم بر دکوراسیون فروشگاه خود را انتخاب کنید.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      {vibes.map((v) => {
                        const IconComponent = v.icon;
                        const isSelected = vibe === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => selectVibe(v)}
                            className={`p-3 text-right rounded-2xl border transition-all flex items-start gap-2.5 relative overflow-hidden select-none ${
                              isSelected 
                                ? 'bg-slate-50/50 dark:bg-slate-950/20 border-violet-500 dark:border-violet-500 ring-2 ring-violet-500/20 shadow-md' 
                                : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                            }`}
                          >
                            <div className={`p-1.5 rounded-lg text-white`} style={{ backgroundColor: v.color }}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="text-[11px] font-black text-slate-800 dark:text-slate-200">{v.name}</h4>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold">{v.desc}</p>
                            </div>
                            
                            {/* Selected Dot */}
                            {isSelected && (
                              <div className="absolute top-2 left-2 w-4 h-4 rounded-full bg-violet-600 dark:bg-violet-500 flex items-center justify-center text-white">
                                <Check className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Suggested AI Color Alert */}
                    {suggestedColor && (
                      <div className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-violet-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 rounded-xl text-white shadow-md shadow-violet-500/10 flex items-center justify-center shrink-0" style={{ backgroundColor: suggestedColor.color }}>
                            <Sparkles className="w-4 h-4 animate-pulse text-amber-200" />
                          </div>
                          <div className="space-y-0.5 text-right">
                            <h4 className="text-xs font-black text-violet-900 dark:text-violet-200 flex items-center gap-1.5">
                              تشخیص هوشمند رنگ برند ✨
                            </h4>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                              بر اساس تحلیل نام، رنگ <strong className="text-violet-600 dark:text-violet-400 font-black">{suggestedColor.label}</strong> به عنوان رنگ پایه‌ اعمال شد.
                            </p>
                          </div>
                        </div>
                        <div className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15 text-[9px] font-black shrink-0">
                          فعال شد ✔
                        </div>
                      </div>
                    )}

                    {/* Hex Color Manual Control */}
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Palette className="w-4 h-4 text-violet-500" />
                          رنگ پایه سفارشی فروشگاه شما:
                        </h4>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">می‌توانید کادر زیر را برای انتخاب دقیق‌ترین رنگ تنظیم کنید.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text"
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="w-20 text-center uppercase py-1 text-[10px] font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg outline-none text-slate-800 dark:text-slate-200"
                        />
                        <input 
                          type="color" 
                          value={themeColor}
                          onChange={(e) => setThemeColor(e.target.value)}
                          className="w-10 h-10 rounded-xl cursor-pointer border-0 p-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Support Info & Address */}
              {step === 4 && (
                <div className="space-y-5 animate-fadeIn">
                  <div className="text-center space-y-1.5">
                    <h2 className="text-lg font-black text-slate-800 dark:text-white">بخش چهارم: اطلاعات پشتیبانی و ارتباطی 📞</h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                      شماره و آدرس شما جهت نمایش به مشتریان و در فاکتور چیده خواهد شد (اختیاری).
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Phone className="w-4 h-4 text-violet-500" />
                          تلفن پشتیبانی:
                        </label>
                        <input 
                          type="text" 
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          placeholder="مانند: 021XXXXXXXX"
                          className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white outline-none transition-all text-left"
                          dir="ltr"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <Mail className="w-4 h-4 text-violet-500" />
                          ایمیل پشتیبانی:
                        </label>
                        <input 
                          type="email" 
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          placeholder="support@example.com"
                          className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white outline-none transition-all text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-violet-500" />
                        آدرس فروشگاه فیزیکی (در صورت وجود):
                      </label>
                      <textarea 
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="تهران، خیابان ولیعصر، مجتمع تجاری..."
                        rows={2}
                        className="w-full px-4 py-3 text-xs font-black bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 text-slate-800 dark:text-white outline-none transition-all resize-none leading-relaxed"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={handlePrev}
                  disabled={step === 1}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-950 text-xs font-black flex items-center gap-1.5 transition-all disabled:opacity-0"
                >
                  <ChevronRight className="w-4 h-4" />
                  مرحله قبلی
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="px-5 py-3 rounded-xl bg-violet-600 dark:bg-violet-500 text-white text-xs font-black flex items-center gap-1.5 transition-all hover:bg-violet-700 hover:shadow-md hover:shadow-violet-600/15 hover:scale-[1.02] active:scale-[0.98]"
                >
                  {step === 4 ? (
                    <>
                      <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
                      خلق هوشمند فروشگاه
                    </>
                  ) : (
                    <>
                      مرحله بعدی
                      <ChevronLeft className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

            </div>
          ) : (
            /* Step 5: Interactive Preview & Confirm Screen */
            <div className="p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 text-[10px] font-black">
                  <Sparkles className="w-3.5 h-3.5" />
                  پیش‌نمایش هوشمند آماده تایید است
                </div>
                <h2 className="text-lg font-black text-slate-800 dark:text-white">بررسی و تایید دکوراسیون فروشگاه 🎨</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  هوش مصنوعی ساختار، محصولات و مقالات نمونه زیر را متناسب با صنف شما تولید کرده است.
                </p>
              </div>

              {previewData?.requiresMoreInfo ? (
                /* Low Confidence / Onboarding Questions Form */
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-4 text-right">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-black text-amber-800 dark:text-amber-400">به اطلاعات بیشتری نیاز داریم!</h4>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                        اطلاعات وارد شده کمی مبهم بود. برای اینکه بتوانیم بهترین دکوراسیون و محصولات را تولید کنیم، لطفاً به سوالات زیر پاسخ دهید:
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    {previewData.questions.map((q: string, idx: number) => (
                      <div key={idx} className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">{q}</label>
                        <input 
                          type="text"
                          value={onboardingAnswers[q] || ''}
                          onChange={(e) => setOnboardingAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                          placeholder="پاسخ خود را اینجا بنویسید..."
                          className="w-full px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-violet-500 outline-none text-slate-800 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleRegenerate}
                    className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin" style={{ animationDuration: '3s' }} />
                    تولید مجدد بر اساس پاسخ‌های شما
                  </button>
                </div>
              ) : (
                /* High Confidence Preview Layout */
                <div className="space-y-6 text-right" dir="rtl">
                  
                  {/* Blueprint Summary Card */}
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold">صنف و نیچ تخصصی</span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{previewData?.blueprint?.niche || 'عمومی'}</h4>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold">میزان اطمینان هوش مصنوعی</span>
                      <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                        {Math.round((previewData?.blueprint?.confidence || 0) * 100)}٪
                      </h4>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] text-slate-400 font-bold">لحن و روحیه برند</span>
                      <h4 className="text-xs font-black text-slate-800 dark:text-slate-200">{previewData?.blueprint?.brandTone}</h4>
                    </div>
                  </div>

                  {/* Suggested Categories */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Grid className="w-4 h-4 text-violet-500" />
                      دسته‌بندی‌های پیشنهادی:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {previewData?.categories?.map((cat: any, idx: number) => (
                        <span key={idx} className="px-3 py-1.5 rounded-xl bg-violet-500/5 text-violet-600 dark:text-violet-400 border border-violet-500/10 text-[10px] font-black">
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Products Preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <ShoppingBag className="w-4 h-4 text-violet-500" />
                      محصولات نمونه تولید شده:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {previewData?.products?.map((prod: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-sm">
                          {prod.imageUrl && (
                            <img 
                              src={prod.imageUrl} 
                              alt={prod.imageAltFa || prod.title} 
                              className="w-full h-32 object-cover"
                            />
                          )}
                          <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                            <div>
                              <span className="text-[8px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold">{prod.category}</span>
                              <h5 className="text-[11px] font-black text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">{prod.title}</h5>
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold line-clamp-2 mt-1 leading-relaxed">{prod.shortDescription}</p>
                            </div>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-50 dark:border-slate-900">
                              <span className="text-[8px] text-slate-400 font-bold">موجودی: {prod.stock}</span>
                              <span className="text-[10px] font-black text-violet-600 dark:text-violet-400">{prod.price.toLocaleString('fa')} تومان</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Suggested Articles Preview */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-violet-500" />
                      مقالات وبلاگ تولید شده:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {previewData?.articles?.map((art: any, idx: number) => (
                        <div key={idx} className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex gap-3 items-start">
                          {art.featuredImage && (
                            <img 
                              src={art.featuredImage} 
                              alt={art.title} 
                              className="w-16 h-16 rounded-xl object-cover shrink-0"
                            />
                          )}
                          <div className="space-y-1">
                            <h5 className="text-[11px] font-black text-slate-800 dark:text-slate-200 line-clamp-1">{art.title}</h5>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold line-clamp-2 leading-relaxed">{art.excerpt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Homepage Layout Preview */}
                  <div className="space-y-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                    <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-violet-500" />
                      پیش‌نمایش صفحه اصلی:
                    </h4>
                    <div className="space-y-2 text-right">
                      <div className="border-r-2 border-violet-500 pr-3 py-1">
                        <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">{previewData?.homepage?.hero?.title}</h5>
                        <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1">{previewData?.homepage?.hero?.subtitle}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {previewData?.homepage?.trustBadges?.map((badge: string, idx: number) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 text-[9px] font-black flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            {badge}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Warnings Alert if any */}
                  {previewData?.warnings && previewData.warnings.length > 0 && (
                    <div className="bg-amber-500/5 border border-amber-500/15 rounded-2xl p-4 space-y-1.5">
                      <h5 className="text-xs font-black text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        هشدارهای بهینه‌سازی:
                      </h5>
                      <ul className="list-disc list-inside text-[9px] text-slate-500 dark:text-slate-400 font-bold space-y-1 leading-relaxed">
                        {previewData.warnings.slice(0, 3).map((w: string, idx: number) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}

              {/* Step 5 Bottom Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 text-xs font-black"
                  >
                    ویرایش اطلاعات
                  </button>
                  <button
                    onClick={onComplete}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-slate-500 hover:bg-slate-50 text-xs font-black"
                  >
                    شروع بدون دیتای نمونه
                  </button>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleRegenerate}
                    disabled={previewData?.requiresMoreInfo}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 text-xs font-black flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    بازتولید هوشمند
                  </button>
                  <button
                    onClick={handleSaveSeed}
                    disabled={previewData?.requiresMoreInfo}
                    className="flex-1 sm:flex-none px-5 py-3 rounded-xl bg-violet-600 dark:bg-violet-500 text-white text-xs font-black flex items-center justify-center gap-1.5 transition-all hover:bg-violet-700 hover:shadow-md hover:shadow-violet-600/15 disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
                    تایید و ساخت دکوراسیون
                  </button>
                </div>
              </div>

            </div>
          )
        ) : (
          /* Full Glowing AI Processing Simulation Screen */
          <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[420px] text-center select-none animate-fadeIn">
            
            {/* Spinning AI Orb & Glowing Core */}
            <div className="relative flex items-center justify-center w-28 h-28">
              <div 
                className="absolute inset-0 rounded-full blur-xl animate-pulse opacity-20"
                style={{ backgroundColor: themeColor }}
              ></div>
              {/* Outer Orbit */}
              <div 
                className="absolute inset-0 border-2 border-dashed rounded-full animate-spin opacity-40" 
                style={{ animationDuration: '8s', borderColor: themeColor }}
              ></div>
              {/* Mid Orbit */}
              <div className="absolute inset-2 border border-slate-200 dark:border-slate-800 rounded-full animate-spin" style={{ animationDuration: '4s', animationDirection: 'reverse' }}></div>
              {/* Inner Glowing Core */}
              <div 
                className="relative w-16 h-16 rounded-2xl flex items-center justify-center text-white border border-white/20 animate-pulse"
                style={{ 
                  background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`,
                  boxShadow: `0 10px 25px -5px ${themeColor}50`
                }}
              >
                <Sparkles className="w-8 h-8 text-white animate-spin" style={{ animationDuration: '5s' }} />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-base font-black text-slate-800 dark:text-white tracking-wide">هوش مصنوعی در حال چیدمان فروشگاه شماست... ✨</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">بسته به انتخاب‌های شما، استایل‌ها، دسته‌بندی‌ها و متون نمونه در حال همگام‌سازی و اعمال هستند.</p>
            </div>

            {/* Minimal Personalized Progress Bar with Chosen Branding */}
            <div className="w-full max-w-md space-y-2 text-right">
              <div className="flex items-center justify-between text-[10px] font-black">
                <span className="text-slate-400 dark:text-slate-500">
                  {Math.round(((aiStatusStep + 1) / aiSteps.length) * 100)}٪
                </span>
                <span style={{ color: themeColor }} className="animate-pulse">
                  در حال ساخت پیش‌نمایش با هوش مصنوعی بر اساس فروشگاه شما...
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-950 rounded-full overflow-hidden p-[1px] border border-slate-200/30 dark:border-slate-800/30">
                <div 
                  className="h-full rounded-full transition-all duration-500 ease-out relative"
                  style={{ 
                    width: `${((aiStatusStep + 1) / aiSteps.length) * 100}%`,
                    backgroundColor: themeColor,
                    boxShadow: `0 0 8px ${themeColor}80`
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse" />
                </div>
              </div>
            </div>

            {/* Simulated Live Logging */}
            <div className="w-full max-w-md bg-slate-950 border border-slate-900 rounded-2xl p-4 text-right space-y-2.5 font-mono shadow-inner shadow-black/20">
              {aiSteps.map((s, idx) => {
                const isActive = idx === aiStatusStep;
                const isPassed = idx < aiStatusStep;
                return (
                  <div 
                    key={idx} 
                    className={`text-[10px] font-bold flex items-center gap-2.5 transition-all duration-300 ${
                      isActive 
                        ? 'scale-[1.01] translate-x-1' 
                        : isPassed 
                          ? 'text-emerald-500 opacity-70' 
                          : 'text-slate-700 opacity-30'
                    }`}
                    style={isActive ? { color: themeColor } : {}}
                  >
                    {isPassed ? (
                      <Check className="w-3.5 h-3.5 shrink-0" />
                    ) : isActive ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                    ) : (
                      <div className="w-1.5 h-1.5 bg-slate-800 rounded-full shrink-0" />
                    )}
                    <span>{s}</span>
                  </div>
                );
              })}
            </div>
            
          </div>
        )}

      </div>
    </div>
  );
}
