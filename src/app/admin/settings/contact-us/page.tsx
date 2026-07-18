'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  Sparkles,
  Plus,
  Trash2,
  Users,
  MessageSquare,
  HelpCircle,
  Phone,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  MapPin,
  Mail,
  Clock,
  AlertCircle,
  X,
  AlertTriangle,
  Wand2,
  CheckCircle2,
  Smartphone,
  BookOpen
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import ContactUsClient from '@/components/ContactUsClient';
import {
  ContactUsConfig,
  DEFAULT_CONTACT_US_CONFIG,
  parseContactUsConfig,
  ContactUsDepartment,
  ContactUsOpeningHour,
  ContactUsSocialLink
} from '@/types/contact-us';

export default function ContactUsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'hero' | 'departments' | 'openingHours' | 'socialLinks' | 'contactForm' | 'map' | 'faqs'>('hero');
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Builder Config State
  const [config, setConfig] = useState<ContactUsConfig>(DEFAULT_CONTACT_US_CONFIG);
  const [shopName, setShopName] = useState('فروشگاه من');
  const [themeColor, setThemeColor] = useState('#6d28d9'); // default primary color

  // AI Assistant States (matching custom-home UI/UX)
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<ContactUsConfig | null>(null);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error('خطا در بارگذاری تنظیمات');
        const data = await res.json();
        
        if (data?.settings) {
          setShopName(data.settings.shopName || 'فروشگاه من');
          setThemeColor(data.settings.themeColor || '#6d28d9');
          
          if (data.settings.contactUsPage) {
            const parsed = parseContactUsConfig(data.settings.contactUsPage);
            setConfig(parsed);
          } else {
            // No custom page yet, use defaults
            setConfig(DEFAULT_CONTACT_US_CONFIG);
          }
        }
      } catch (err) {
        console.error('Error loading contact us settings:', err);
        setMessage({ type: 'error', text: 'خطا در بارگذاری تنظیمات فروشگاه.' });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async (configToSave = config) => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contactUsPage: JSON.stringify({
            ...configToSave,
            isStructured: true
          })
        }),
      });

      if (!res.ok) throw new Error('خطا در ذخیره‌سازی');
      
      setMessage({ type: 'success', text: 'تغییرات صفحه تماس با ما با موفقیت ذخیره شد.' });
      
      // Auto-hide success message
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 4000);
    } catch (err) {
      console.error('Error saving contact us settings:', err);
      setMessage({ type: 'error', text: 'خطا در ذخیره تغییرات. لطفاً مجدداً تلاش کنید.' });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyAiControl = async () => {
    if (!promptInput.trim()) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');

    try {
      const res = await fetch('/api/admin/settings/contact-us/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          config
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        if (errorData?.error === 'rate_limit') {
          throw new Error('تعداد درخواست‌های هوش مصنوعی شما بیش از حد مجاز است. لطفاً چند دقیقه دیگر تلاش کنید.');
        }
        throw new Error(errorData?.error || 'خطایی در ارتباط با سرور رخ داده است.');
      }

      const data = await res.json();
      
      if (data.success && data.config) {
        setPendingConfig(data.config);
        setAiExplanation(data.explanation || '');
        setAiWarnings(data.warnings || []);
        setShowAiConfirmModal(true);
        setPromptInput('');
      } else {
        throw new Error('قالب پاسخ دریافتی از هوش مصنوعی معتبر نبود.');
      }
    } catch (err: any) {
      console.error('Error with AI control:', err);
      setControlError(err.message || 'پردازش دستور توسط دستیار هوشمند با خطا مواجه شد. لطفاً دوباره تلاش کنید.');
    } finally {
      setControlling(false);
    }
  };

  const handleConfirmAiChanges = () => {
    if (pendingConfig) {
      setConfig(pendingConfig);
      setShowAiConfirmModal(false);
      setPendingConfig(null);
      setControlSuccessMessage('تغییرات هوش مصنوعی اعمال شدند! برای نهایی شدن، دکمه ذخیره را بزنید.');
      
      // Auto-save changes immediately for premium feels
      handleSave(pendingConfig);

      setTimeout(() => {
        setControlSuccessMessage('');
      }, 5000);
    }
  };

  const handleSelectMedia = (url: string) => {
    if (showMediaPicker === 'hero') {
      setConfig(prev => ({
        ...prev,
        hero: { ...prev.hero, imageUrl: url }
      }));
    }
    setShowMediaPicker(null);
  };

  // Departments List Helpers
  const addDepartment = () => {
    const newDep: ContactUsDepartment = {
      id: 'dep-' + Date.now(),
      name: 'بخش جدید پشتیبانی',
      phone: '',
      email: '',
      responsiblePerson: ''
    };
    setConfig(prev => ({
      ...prev,
      departments: {
        ...prev.departments,
        list: [...prev.departments.list, newDep]
      }
    }));
  };

  const updateDepartment = (id: string, fields: Partial<ContactUsDepartment>) => {
    setConfig(prev => ({
      ...prev,
      departments: {
        ...prev.departments,
        list: prev.departments.list.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deleteDepartment = (id: string) => {
    setConfig(prev => ({
      ...prev,
      departments: {
        ...prev.departments,
        list: prev.departments.list.filter(item => item.id !== id)
      }
    }));
  };

  // Opening Hours Helpers
  const addOpeningHour = () => {
    const newHour: ContactUsOpeningHour = {
      id: 'oh-' + Date.now(),
      dayRange: 'شنبه تا چهارشنبه',
      hours: '۰۹:۰۰ الی ۱۷:۰۰'
    };
    setConfig(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        list: [...prev.openingHours.list, newHour]
      }
    }));
  };

  const updateOpeningHour = (id: string, fields: Partial<ContactUsOpeningHour>) => {
    setConfig(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        list: prev.openingHours.list.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deleteOpeningHour = (id: string) => {
    setConfig(prev => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        list: prev.openingHours.list.filter(item => item.id !== id)
      }
    }));
  };

  // Social Links Helpers
  const addSocialLink = () => {
    const newSoc: ContactUsSocialLink = {
      id: 'soc-' + Date.now(),
      platform: 'instagram',
      username: 'myshop',
      url: 'https://instagram.com/myshop'
    };
    setConfig(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        list: [...prev.socialLinks.list, newSoc]
      }
    }));
  };

  const updateSocialLink = (id: string, fields: Partial<ContactUsSocialLink>) => {
    setConfig(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        list: prev.socialLinks.list.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deleteSocialLink = (id: string) => {
    setConfig(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        list: prev.socialLinks.list.filter(item => item.id !== id)
      }
    }));
  };

  // FAQs Helpers
  const addFaq = () => {
    const newFaq = {
      id: 'faq-' + Date.now(),
      question: 'پرسش جدید؟',
      answer: 'پاسخ کامل به پرسش جدید.'
    };
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        list: [...prev.faqs.list, newFaq]
      }
    }));
  };

  const updateFaq = (id: string, question: string, answer: string) => {
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        list: prev.faqs.list.map(item => item.id === id ? { ...item, question, answer } : item)
      }
    }));
  };

  const deleteFaq = (id: string) => {
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        list: prev.faqs.list.filter(item => item.id !== id)
      }
    }));
  };

  const tabs = [
    { id: 'hero', title: 'بنر هیرو و معرفی', description: 'عنوان، زیرعنوان و آواتار تماس', icon: Smartphone },
    { id: 'departments', title: 'دپارتمان‌های پاسخگویی', description: 'بخش‌های تخصصی و شماره تماس‌ها', icon: Users },
    { id: 'openingHours', title: 'ساعات کاری و پاسخگویی', description: 'روزها و بازه زمانی حضور', icon: Clock },
    { id: 'socialLinks', title: 'شبکه‌های اجتماعی', description: 'اینستاگرام، تلگرام، پیام‌رسان‌ها', icon: MessageSquare },
    { id: 'contactForm', title: 'تنظیمات فرم پیام', description: 'فعال‌سازی، موضوعات و پیام موفقیت', icon: Mail },
    { id: 'map', title: 'نقشه و نشانی', description: 'لوکیشن جغرافیایی، آدرس پستی', icon: MapPin },
    { id: 'faqs', title: 'سوالات متداول', description: 'پرسش‌های سئوساز تماس', icon: HelpCircle }
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 font-sans">
        <Loader2 className="w-8 h-8 animate-spin text-gray-500" style={{ color: themeColor }} />
        <span className="text-xs font-bold text-gray-500">در حال بارگذاری تنظیمات تماس با ما...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 p-4 md:p-8 font-sans" dir="rtl">
      
      {/* Header Panel (exactly matching about-us/page.tsx layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-2xl">
            <Phone className="w-6 h-6" style={{ color: themeColor }} />
          </div>
          <div>
            <h1 className="text-sm md:text-base font-black text-slate-800 dark:text-white">پیکربندی صفحه تماس با ما</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-1">طراحی صفحه ارتباطات، دپارتمان‌های پاسخگویی، اطلاعات مکانی و رسانه‌ها</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className="px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-[11px] font-black text-slate-700 dark:text-slate-200 shadow-3xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Eye className="w-4 h-4 shrink-0" />
            {isPreviewMode ? 'حالت ویرایش ساختار' : 'پیش‌نمایش زنده صفحه اصلی'}
          </button>

          <button
            onClick={() => handleSave()}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl font-black text-[11px] text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer disabled:opacity-55"
            style={{ backgroundColor: themeColor }}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
            ) : (
              <Save className="w-4 h-4 shrink-0" />
            )}
            ذخیره کل صفحات
          </button>
        </div>
      </div>

      {/* Main Alert Message Banner */}
      {message.text && (
        <div className="mb-6 animate-in fade-in duration-300">
          <div 
            className={`p-4 rounded-xl border flex items-start gap-3 text-xs font-black leading-relaxed shadow-3xs ${
              message.type === 'success' 
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400' 
                : 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400'
            }`}
          >
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
            <span>{message.text}</span>
          </div>
        </div>
      )}

      {isPreviewMode ? (
        /* Full screen dynamic preview mode */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 md:p-10">
          <ContactUsClient config={config} themeColor={themeColor} />
        </div>
      ) : (
        /* Form & Sidebar Grid Panel Layout (Matching about-us & custom-home) */
        <div className="space-y-6">
          
          {/* AI Prompt Control - Smart Assistant */}
          <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند تماس با ما (کنترل با پرامپت)</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                    با نوشتن دستورهای متنی به زبان ساده، تمام بخش‌های صفحه تماس با ما را مدیریت کنید! دستیار به طور خودکار اطلاعات ثبت‌شده واقعی دکان را در صفحه ادغام می‌کند.
                  </p>
                </div>
              </div>
              <a
                href="/admin/agent"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-500 hover:to-pink-500 transition-all font-black text-xs shadow-md"
              >
                <Sparkles size={13} className="animate-bounce text-pink-200" />
                <span>انتقال به حالت ایجنت یکپارچه ✨</span>
              </a>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={promptInput}
                  onChange={(e) => setPromptInput(e.target.value)}
                  placeholder="مثال: دپارتمان فروش عمده B2B را به لیست دپارتمان‌ها اضافه کن با تلفن داخلی ۴..."
                  className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-400"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyAiControl();
                    }
                  }}
                  disabled={controlling}
                />
                <button
                  type="button"
                  disabled={controlling || !promptInput.trim()}
                  onClick={handleApplyAiControl}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {controlling ? (
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
                  'دپارتمان شکایات و انتقادات اضافه کن با آدرس ایمیل رسمی دکان',
                  'ساعات کاری پنج‌شنبه‌ها را تا ساعت ۱۵:۰۰ تغییر بده',
                  'آدرس نقشه و راهنمای آدرس پستی ما را بر اساس تنظیمات اصلی فروشگاه ویرایش کن',
                  'فرم تماس را فعال کن و ۲ سوال متداول سئوساز اضافه کن'
                ].map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setPromptInput(sug)}
                    className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-xl transition-colors font-bold cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Form & Sidebar Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* Right Sidebar navigation */}
            <div className="md:col-span-4 lg:col-span-3 space-y-3 md:sticky md:top-6">
              <div className="flex flex-col gap-2 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-1">بخش‌های تنظیمات</span>
                
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                      }}
                      className={`group relative flex items-center gap-3 p-2.5 rounded-2xl text-right transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-primary-500/5 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border-primary-500/20'
                          : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <div className={`p-2 rounded-xl border shrink-0 ${
                        isActive
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-100 dark:border-slate-850'
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-xs font-black truncate">{tab.title}</span>
                        <span className={`block text-[9px] font-bold mt-0.5 truncate ${isActive ? 'text-primary-500' : 'text-slate-400'}`}>
                          {tab.description}
                        </span>
                      </div>
                    </button>
                  );
                })}

                {/* Sidebar save action */}
                <div className="border-t border-slate-100 dark:border-slate-800/60 pt-3 mt-2">
                  <button
                    onClick={() => handleSave()}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white py-3 px-4 rounded-2xl font-black text-xs shadow-md shadow-primary-500/10 hover:shadow-lg transition-all duration-200 active:scale-98 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'در حال ذخیره...' : 'ذخیره کل تنظیمات'}
                  </button>
                </div>
              </div>
            </div>

            {/* Left Content Area (Active tab forms) */}
            <div className="md:col-span-8 lg:col-span-9 space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm min-h-[500px]">
                
                {/* TAB 1: Hero */}
                {activeTab === 'hero' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">بنر معرفی تماس با ما</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">تیتر اصلی، زیرعنوان و جزئیات متنی خوش‌آمدگویی را تنظیم کنید</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان صفحه تماس</label>
                        <input
                          type="text"
                          value={config.hero.title}
                          onChange={(e) => setConfig(prev => ({ ...prev, hero: { ...prev.hero, title: e.target.value } }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">زیرعنوان (پیام صمیمی)</label>
                        <input
                          type="text"
                          value={config.hero.subtitle || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, hero: { ...prev.hero, subtitle: e.target.value } }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">توضیحات و خوش‌آمدگویی تماس</label>
                      <textarea
                        value={config.hero.description || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, hero: { ...prev.hero, description: e.target.value } }))}
                        rows={6}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 leading-relaxed text-justify"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 2: Departments */}
                {activeTab === 'departments' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white">دپارتمان‌های پاسخگویی</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">بخش‌های تخصصی تماس، شماره‌های مستقیم و مسئولین مربوطه را مدیریت کنید</p>
                      </div>
                      <button
                        onClick={addDepartment}
                        className="p-1 px-3 text-[10px] font-black rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> افزودن بخش جدید
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش دپارتمان‌ها</label>
                      <input
                        type="text"
                        value={config.departments.title || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, departments: { ...prev.departments, title: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>

                    {config.departments.list.length === 0 ? (
                      <div className="text-center py-12 text-[11px] text-slate-400 dark:text-slate-500 font-bold border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                        دپارتمان تماسی ایجاد نشده است. برای شروع، دکمه افزودن بخش جدید را بزنید.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {config.departments.list.map((dep, idx) => (
                          <div key={dep.id} className="p-5 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/80 relative space-y-4 shadow-3xs animate-in fade-in duration-300">
                            <button
                              onClick={() => deleteDepartment(dep.id)}
                              className="absolute top-4 left-4 p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-100 dark:hover:border-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="text-[10px] font-black text-slate-400">دپارتمان #{idx + 1}</div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">نام دپارتمان</label>
                                <input
                                  type="text"
                                  value={dep.name}
                                  onChange={(e) => updateDepartment(dep.id, { name: e.target.value })}
                                  placeholder="مثال: مدیریت و روابط عمومی"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">مسئول یا مدیر دپارتمان</label>
                                <input
                                  type="text"
                                  value={dep.responsiblePerson || ''}
                                  onChange={(e) => updateDepartment(dep.id, { responsiblePerson: e.target.value })}
                                  placeholder="مثال: آرش علوی"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>
                            </div>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">تلفن مستقیم / داخلی</label>
                                <input
                                  type="text"
                                  value={dep.phone || ''}
                                  onChange={(e) => updateDepartment(dep.id, { phone: e.target.value })}
                                  placeholder="مثال: ۰۲۱-۴۴۵۵۶۶۷۷ داخلی ۱"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">ایمیل دپارتمان</label>
                                <input
                                  type="email"
                                  value={dep.email || ''}
                                  onChange={(e) => updateDepartment(dep.id, { email: e.target.value })}
                                  placeholder="مثال: support@example.com"
                                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Opening Hours */}
                {activeTab === 'openingHours' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white">ساعات کاری و پاسخگویی</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">ساعات فعالیت اداری، پشتیبانی و زمان‌های پاسخگویی تلفنی دکان</p>
                      </div>
                      <button
                        onClick={addOpeningHour}
                        className="p-1 px-3 text-[10px] font-black rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> افزودن ساعت کار جدید
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش ساعات کاری</label>
                      <input
                        type="text"
                        value={config.openingHours.title || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, openingHours: { ...prev.openingHours, title: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>

                    <div className="space-y-3">
                      {config.openingHours.list.map((hour) => (
                        <div key={hour.id} className="p-4 bg-slate-50/40 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/80 flex gap-4 items-center relative animate-in fade-in duration-300">
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400">بازه روزها</label>
                            <input
                              type="text"
                              value={hour.dayRange}
                              onChange={(e) => updateOpeningHour(hour.id, { dayRange: e.target.value })}
                              placeholder="مثال: شنبه تا چهارشنبه"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                            />
                          </div>
                          
                          <div className="w-56 space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400">ساعت کار</label>
                            <input
                              type="text"
                              value={hour.hours}
                              onChange={(e) => updateOpeningHour(hour.id, { hours: e.target.value })}
                              placeholder="مثال: ۰۹:۰۰ الی ۱۸:۰۰"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                            />
                          </div>

                          <div className="pt-5 shrink-0">
                            <button
                              onClick={() => deleteOpeningHour(hour.id)}
                              className="p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-100 dark:hover:border-transparent"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: Social Links */}
                {activeTab === 'socialLinks' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white">شبکه‌های اجتماعی و ارتباطات</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">آدرس آیدی‌ها و لینک مستقیم پیام‌رسان‌های پشتیبانی دکان را مدیریت کنید</p>
                      </div>
                      <button
                        onClick={addSocialLink}
                        className="p-1 px-3 text-[10px] font-black rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> افزودن رسانه جدید
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش شبکه‌های اجتماعی</label>
                      <input
                        type="text"
                        value={config.socialLinks.title || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, socialLinks: { ...prev.socialLinks, title: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {config.socialLinks.list.map((soc) => (
                        <div key={soc.id} className="p-5 bg-slate-50/30 dark:bg-slate-900/10 rounded-2xl border border-slate-100 dark:border-slate-800/80 relative space-y-4 shadow-3xs animate-in fade-in duration-300">
                          <button
                            onClick={() => deleteSocialLink(soc.id)}
                            className="absolute top-4 left-4 p-2 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer border border-transparent hover:border-rose-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <div className="grid sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">نوع پلتفرم</label>
                              <select
                                value={soc.platform}
                                onChange={(e) => updateSocialLink(soc.id, { platform: e.target.value })}
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                              >
                                <option value="instagram">اینستاگرام Instagram</option>
                                <option value="telegram">تلگرام Telegram</option>
                                <option value="bale">پیام‌رسان بله Bale</option>
                                <option value="eitaa">ایتا Eitaa</option>
                                <option value="whatsapp">واتس‌اپ WhatsApp</option>
                              </select>
                            </div>
                            
                            <div className="sm:col-span-2 space-y-1.5">
                              <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">نام کاربری / آیدی / شماره</label>
                              <input
                                type="text"
                                value={soc.username}
                                onChange={(e) => updateSocialLink(soc.id, { username: e.target.value })}
                                placeholder="مثال: myshop"
                                className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">آدرس اینترنتی کامل مقصد (URL)</label>
                            <input
                              type="text"
                              value={soc.url}
                              onChange={(e) => updateSocialLink(soc.id, { url: e.target.value })}
                              placeholder="مثال: https://instagram.com/myshop"
                              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 5: Contact Form */}
                {activeTab === 'contactForm' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">فرم ارسال پیام مستقیم</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">تنظیمات فعال‌سازی فرم تماس، تیترها و پیام تایید موفقیت</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-white">فعال‌سازی فرم پیام مستقیم</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">فرم ثبت تیکت / پیام در صفحه تماس رندر شود</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.contactForm.enabled}
                          onChange={(e) => setConfig(prev => ({ ...prev, contactForm: { ...prev.contactForm, enabled: e.target.checked } }))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:-left-1 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600" />
                      </label>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان فرم تماس</label>
                        <input
                          type="text"
                          value={config.contactForm.title || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, contactForm: { ...prev.contactForm, title: e.target.value } }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">توضیح کوتاه زیر عنوان</label>
                        <input
                          type="text"
                          value={config.contactForm.description || ''}
                          onChange={(e) => setConfig(prev => ({ ...prev, contactForm: { ...prev.contactForm, description: e.target.value } }))}
                          className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">پیام تایید پس از ارسال موفق</label>
                      <textarea
                        value={config.contactForm.successMessage || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, contactForm: { ...prev.contactForm, successMessage: e.target.value } }))}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 leading-relaxed"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 6: Map */}
                {activeTab === 'map' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">موقعیت نقشه و راهنمای آدرس پستی</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">تنظیمات نقشه جغرافیایی آنلاین و نشانی دفتر مرکزی</p>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/10">
                      <div className="space-y-0.5">
                        <span className="text-xs font-black text-slate-800 dark:text-white">نمایش نقشه جغرافیایی</span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">فعال‌سازی نمایش آنلاین لوکیشن پستی دکان</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={config.map.enabled}
                          onChange={(e) => setConfig(prev => ({ ...prev, map: { ...prev.map, enabled: e.target.checked } }))}
                          className="sr-only peer"
                        />
                        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:-left-1 after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-primary-600" />
                      </label>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-700 dark:text-slate-300">نوع نقشه</label>
                        <select
                          value={config.map.provider}
                          onChange={(e) => setConfig(prev => ({ ...prev, map: { ...prev.map, provider: e.target.value as 'embed' | 'coordinates' } }))}
                          className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                          <option value="embed">آدرس نقشه فریم iframe (گوگل/نشان/بلد)</option>
                          <option value="coordinates">مختصات جغرافیایی (طول و عرض)</option>
                        </select>
                      </div>

                      {config.map.provider === 'embed' ? (
                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700 dark:text-slate-300">لینک فریم نقشه (Embed URL)</label>
                          <input
                            type="text"
                            value={config.map.embedUrl || ''}
                            onChange={(e) => setConfig(prev => ({ ...prev, map: { ...prev.map, embedUrl: e.target.value } }))}
                            placeholder="src آدرس آی‌فریم نقشه را بگذارید..."
                            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-left"
                            dir="ltr"
                          />
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">عرض Latitude</label>
                            <input
                              type="text"
                              value={config.map.latitude || ''}
                              onChange={(e) => setConfig(prev => ({ ...prev, map: { ...prev.map, latitude: e.target.value } }))}
                              placeholder="35.6997"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-left"
                              dir="ltr"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-black text-slate-700 dark:text-slate-300">طول Longitude</label>
                            <input
                              type="text"
                              value={config.map.longitude || ''}
                              onChange={(e) => setConfig(prev => ({ ...prev, map: { ...prev.map, longitude: e.target.value } }))}
                              placeholder="51.3380"
                              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-left"
                              dir="ltr"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">راهنمای آدرس پستی و توضیحات تکمیلی</label>
                      <textarea
                        value={config.map.addressDescription || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, map: { ...prev.map, addressDescription: e.target.value } }))}
                        rows={4}
                        placeholder="مثال: تهران، خیابان ولیعصر..."
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 leading-relaxed text-justify"
                      />
                    </div>
                  </div>
                )}

                {/* TAB 7: FAQs */}
                {activeTab === 'faqs' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white">سوالات متداول پشتیبانی و تماس</h2>
                        <p className="text-[10px] text-slate-400 font-bold mt-1">سوالات پرتکرار خریداران در حوزه راه‌های ارتباطی و سئو</p>
                      </div>
                      <button
                        onClick={addFaq}
                        className="p-1 px-3 text-[10px] font-black rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> افزودن سوال جدید
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش سوالات متداول</label>
                      <input
                        type="text"
                        value={config.faqs.title || ''}
                        onChange={(e) => setConfig(prev => ({ ...prev, faqs: { ...prev.faqs, title: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>

                    {config.faqs.list.length === 0 ? (
                      <div className="text-center py-12 text-[11px] text-slate-400 dark:text-slate-500 font-bold border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl animate-in fade-in">
                        سوال متداولی ایجاد نشده است. برای شروع، دکمه افزودن سوال جدید را بزنید.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                        {config.faqs.list.map((faq, idx) => (
                          <div key={faq.id} className="p-4 bg-slate-50/30 dark:bg-slate-900/10 rounded-xl border border-slate-100 dark:border-slate-800/80 relative space-y-3 shadow-3xs animate-in fade-in duration-300">
                            <button
                              onClick={() => deleteFaq(faq.id)}
                              className="absolute top-3 left-3 p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 hover:text-rose-600 transition-all cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>

                            <div className="text-[10px] font-black text-slate-400">سوال متداول #{idx + 1}</div>

                            <div className="space-y-2">
                              <input
                                type="text"
                                value={faq.question}
                                onChange={(e) => updateFaq(faq.id, e.target.value, faq.answer)}
                                placeholder="سوال مطرح شده؟"
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none"
                              />

                              <textarea
                                value={faq.answer}
                                onChange={(e) => updateFaq(faq.id, faq.question, e.target.value)}
                                placeholder="پاسخ کامل..."
                                rows={3}
                                className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 rounded-lg focus:outline-none leading-relaxed"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* AI Apply Modal */}
      {showAiConfirmModal && pendingConfig && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 max-w-lg w-full rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800/80 overflow-hidden font-bold text-slate-800 dark:text-slate-100">
            
            <div className="p-5 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-500 animate-spin" />
                <h3 className="text-sm font-black">تحلیل و اعمال تغییرات هوشمند</h3>
              </div>
              <button
                onClick={() => setShowAiConfirmModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {aiExplanation && (
                <div className="space-y-1.5">
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold block">تحلیل و اقدامات دستیار:</span>
                  <p className="text-xs bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-800/40 p-4 rounded-2xl font-medium leading-relaxed text-justify text-slate-600 dark:text-slate-300">
                    {aiExplanation}
                  </p>
                </div>
              )}

              {aiWarnings.length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    هشدارهای مهم:
                  </span>
                  <ul className="space-y-1.5">
                    {aiWarnings.map((warn, i) => (
                      <li key={i} className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50/30 dark:bg-amber-950/10 p-2.5 rounded-xl border border-amber-100/40 dark:border-amber-950/20 list-disc list-inside">
                        {warn}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[11px] text-slate-400 dark:text-slate-500 text-center leading-relaxed">
                آیا مایل هستید تغییرات بالا به صورت مستقیم روی ساختار صفحه اعمال و همزمان ذخیره شوند؟
              </p>
            </div>

            <div className="p-4 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-50 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowAiConfirmModal(false)}
                className="px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-black text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
              >
                انصراف و لغو
              </button>
              <button
                onClick={handleConfirmAiChanges}
                className="px-4 py-2 rounded-xl text-white font-black text-xs hover:shadow-md transition-all duration-300 cursor-pointer"
                style={{ backgroundColor: themeColor }}
              >
                تایید و ذخیره‌سازی نهایی
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Media Picker Portal */}
      {showMediaPicker && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border border-slate-100 dark:border-slate-800/80">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/40 dark:bg-slate-900/20">
              <span className="text-xs font-black text-slate-800 dark:text-slate-100">انتخاب تصویر قهرمان تماس</span>
              <button onClick={() => setShowMediaPicker(null)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 md:p-6">
              <MediaPicker onSelect={handleSelectMedia} onClose={() => setShowMediaPicker(null)} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
