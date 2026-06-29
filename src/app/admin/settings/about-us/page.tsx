'use client';

import { useState, useEffect } from 'react';
import {
  Save,
  BookOpen,
  Sparkles,
  Plus,
  Trash2,
  Users,
  MessageSquare,
  HelpCircle,
  Phone,
  ArrowRight,
  Loader2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Eye,
  Settings,
  Heart,
  Briefcase,
  Layers,
  MapPin,
  Mail,
  Star,
  Compass,
  AlertCircle,
  X,
  AlertTriangle,
  Wand2
} from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import AboutUsClient from '@/components/AboutUsClient';
import {
  AboutUsConfig,
  DEFAULT_ABOUT_US_CONFIG,
  parseAboutUsConfig,
  AboutUsCoreValue,
  AboutUsService,
  AboutUsTeamMember,
  AboutUsTestimonial
} from '@/types/about-us';

export default function AboutUsSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeTab, setActiveTab] = useState<'brand' | 'values' | 'services' | 'team' | 'testimonials' | 'contact' | 'faqs'>('brand');
  const [showMediaPicker, setShowMediaPicker] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Builder Config State
  const [config, setConfig] = useState<AboutUsConfig>(DEFAULT_ABOUT_US_CONFIG);
  const [shopName, setShopName] = useState('فروشگاه من');
  const [themeColor, setThemeColor] = useState('#6d28d9'); // default primary color

  // State for active item being edited
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // AI Assistant States (matching custom-home UI/UX)
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<AboutUsConfig | null>(null);
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
          
          if (data.settings.aboutUsPage) {
            const parsed = parseAboutUsConfig(data.settings.aboutUsPage);
            setConfig(parsed);
          } else {
            // No custom page yet, use defaults
            setConfig(DEFAULT_ABOUT_US_CONFIG);
          }
        }
      } catch (err) {
        console.error('Error loading about us settings:', err);
        setMessage({ type: 'error', text: 'خطا در بارگذاری تنظیمات فروشگاه.' });
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aboutUsPage: JSON.stringify({
            ...config,
            isStructured: true
          })
        }),
      });

      if (!res.ok) throw new Error('خطا در ذخیره‌سازی');
      
      setMessage({ type: 'success', text: 'تغییرات صفحه درباره ما با موفقیت ذخیره شد.' });
      
      // Auto-hide success message
      setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 4000);
    } catch (err) {
      console.error('Error saving about us settings:', err);
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
      const res = await fetch('/api/admin/settings/about-us/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          config
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند تنظیمات درباره ما رخ داد.');
      }

      if (data.success) {
        setAiExplanation(data.explanation);
        setPendingConfig(data.config);
        setAiWarnings(data.warnings || []);
        setShowAiConfirmModal(true);
      } else {
        setControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
      }
    } catch (err: any) {
      console.error(err);
      setControlError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setControlling(false);
    }
  };

  const updateBrandStory = (fields: Partial<typeof config.brandStory>) => {
    setConfig(prev => ({
      ...prev,
      brandStory: {
        ...prev.brandStory,
        ...fields
      }
    }));
  };

  const handleMediaSelect = (url: string) => {
    if (!showMediaPicker) return;

    if (showMediaPicker === 'brandStoryImage') {
      updateBrandStory({ imageUrl: url });
    } else if (showMediaPicker.startsWith('team-')) {
      const id = showMediaPicker.replace('team-', '');
      setConfig(prev => ({
        ...prev,
        team: {
          ...prev.team,
          platformTeam: prev.team.platformTeam.map(t => t.id === id ? { ...t, avatarUrl: url } : t)
        }
      }));
    } else if (showMediaPicker.startsWith('testimonial-')) {
      const id = showMediaPicker.replace('testimonial-', '');
      setConfig(prev => ({
        ...prev,
        testimonials: {
          ...prev.testimonials,
          list: prev.testimonials.list.map(t => t.id === id ? { ...t, avatarUrl: url } : t)
        }
      }));
    } else if (showMediaPicker.startsWith('serviceteam-')) {
      const [_, serviceId, memberId] = showMediaPicker.split('-');
      setConfig(prev => ({
        ...prev,
        services: {
          ...prev.services,
          list: prev.services.list.map(s => s.id === serviceId ? {
            ...s,
            team: s.team.map(t => t.id === memberId ? { ...t, avatarUrl: url } : t)
          } : s)
        }
      }));
    }

    setShowMediaPicker(null);
  };

  // List Management Helpers
  const addCoreValue = () => {
    const newVal: AboutUsCoreValue = {
      id: 'val-' + Date.now(),
      title: 'ارزش جدید',
      description: 'توضیح کوتاه درباره این ارزش اصلی کسب‌وکار.',
      serviceId: 'general'
    };
    setConfig(prev => ({
      ...prev,
      coreValues: {
        ...prev.coreValues,
        list: [...prev.coreValues.list, newVal]
      }
    }));
  };

  const updateCoreValue = (id: string, fields: Partial<AboutUsCoreValue>) => {
    setConfig(prev => ({
      ...prev,
      coreValues: {
        ...prev.coreValues,
        list: prev.coreValues.list.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deleteCoreValue = (id: string) => {
    setConfig(prev => ({
      ...prev,
      coreValues: {
        ...prev.coreValues,
        list: prev.coreValues.list.filter(item => item.id !== id)
      }
    }));
  };

  const addService = () => {
    const newService: AboutUsService = {
      id: 'srv-' + Date.now(),
      title: 'سرویس جدید',
      description: 'توضیح خلاصه خدمت جدید.',
      subServices: [],
      details: 'در این بخش به تشریح کامل‌تر اهداف، جزییات، ویژگی‌ها و فرآیندهای کاری این خدمت اختصاصی بپردازید.',
      team: [],
      contact: { phone: '', email: '', address: '' },
      faqs: []
    };
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: [...prev.services.list, newService]
      }
    }));
    setEditingServiceId(newService.id);
  };

  const updateService = (id: string, fields: Partial<AboutUsService>) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === id ? { ...srv, ...fields } : srv)
      }
    }));
  };

  const deleteService = (id: string) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.filter(srv => srv.id !== id)
      }
    }));
    if (editingServiceId === id) setEditingServiceId(null);
  };

  const addSubService = (serviceId: string) => {
    const id = 'sub-' + Date.now();
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          subServices: [...srv.subServices, { id, title: 'زیرخدمت جدید', description: 'توضیح کوتاه عملکرد زیرخدمت.' }]
        } : srv)
      }
    }));
  };

  const updateSubService = (serviceId: string, subId: string, fields: Partial<{ title: string, description: string }>) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          subServices: srv.subServices.map(sub => sub.id === subId ? { ...sub, ...fields } : sub)
        } : srv)
      }
    }));
  };

  const deleteSubService = (serviceId: string, subId: string) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          subServices: srv.subServices.filter(sub => sub.id !== subId)
        } : srv)
      }
    }));
  };

  const addServiceTeam = (serviceId: string) => {
    const id = 'tm-' + Date.now();
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          team: [...srv.team, { id, name: 'نام عضو تیم', role: 'نقش / سمت', avatarUrl: '' }]
        } : srv)
      }
    }));
  };

  const updateServiceTeam = (serviceId: string, memberId: string, fields: Partial<AboutUsTeamMember>) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          team: srv.team.map(t => t.id === memberId ? { ...t, ...fields } : t)
        } : srv)
      }
    }));
  };

  const deleteServiceTeam = (serviceId: string, memberId: string) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          team: srv.team.filter(t => t.id !== memberId)
        } : srv)
      }
    }));
  };

  const addServiceFaq = (serviceId: string) => {
    const id = 'sfq-' + Date.now();
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          faqs: [...srv.faqs, { id, question: 'سوال فنی یا اختصاصی؟', answer: 'پاسخ کامل سوال مربوط به این سرویس.' }]
        } : srv)
      }
    }));
  };

  const updateServiceFaq = (serviceId: string, faqId: string, fields: Partial<{ question: string, answer: string }>) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          faqs: srv.faqs.map(f => f.id === faqId ? { ...f, ...fields } : f)
        } : srv)
      }
    }));
  };

  const deleteServiceFaq = (serviceId: string, faqId: string) => {
    setConfig(prev => ({
      ...prev,
      services: {
        ...prev.services,
        list: prev.services.list.map(srv => srv.id === serviceId ? {
          ...srv,
          faqs: srv.faqs.filter(f => f.id !== faqId)
        } : srv)
      }
    }));
  };

  const addPlatformTeam = () => {
    const newMember: AboutUsTeamMember = {
      id: 'plat-' + Date.now(),
      name: 'عضو جدید تیم',
      role: 'سمت مدیریتی یا اجرایی',
      avatarUrl: '',
      bio: ''
    };
    setConfig(prev => ({
      ...prev,
      team: {
        ...prev.team,
        platformTeam: [...prev.team.platformTeam, newMember]
      }
    }));
  };

  const updatePlatformTeam = (id: string, fields: Partial<AboutUsTeamMember>) => {
    setConfig(prev => ({
      ...prev,
      team: {
        ...prev.team,
        platformTeam: prev.team.platformTeam.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deletePlatformTeam = (id: string) => {
    setConfig(prev => ({
      ...prev,
      team: {
        ...prev.team,
        platformTeam: prev.team.platformTeam.filter(item => item.id !== id)
      }
    }));
  };

  const addTestimonial = () => {
    const newTestimonial: AboutUsTestimonial = {
      id: 'test-' + Date.now(),
      author: 'خریدار یا همکار جدید',
      role: 'سمت / کسب‌وکار',
      avatarUrl: '',
      comment: 'تجربه رضایت‌بخش از همکاری یا خرید از مجموعه شما.',
      serviceId: 'general',
      rating: 5
    };
    setConfig(prev => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        list: [...prev.testimonials.list, newTestimonial]
      }
    }));
  };

  const updateTestimonial = (id: string, fields: Partial<AboutUsTestimonial>) => {
    setConfig(prev => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        list: prev.testimonials.list.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deleteTestimonial = (id: string) => {
    setConfig(prev => ({
      ...prev,
      testimonials: {
        ...prev.testimonials,
        list: prev.testimonials.list.filter(item => item.id !== id)
      }
    }));
  };

  const addGeneralFaq = () => {
    const id = 'gfq-' + Date.now();
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        generalFaqs: [...prev.faqs.generalFaqs, { id, question: 'سوال عمومی؟', answer: 'پاسخ کامل سوال عمومی درباره برند و شرکت.' }]
      }
    }));
  };

  const updateGeneralFaq = (id: string, fields: Partial<{ question: string, answer: string }>) => {
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        generalFaqs: prev.faqs.generalFaqs.map(item => item.id === id ? { ...item, ...fields } : item)
      }
    }));
  };

  const deleteGeneralFaq = (id: string) => {
    setConfig(prev => ({
      ...prev,
      faqs: {
        ...prev.faqs,
        generalFaqs: prev.faqs.generalFaqs.filter(item => item.id !== id)
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader2 className="w-10 h-10 text-primary-600 animate-spin" />
        <p className="text-sm font-bold text-slate-500">در حال بارگذاری اطلاعات سازنده درباره ما...</p>
      </div>
    );
  }

  const tabs = [
    { id: 'brand', title: 'داستان برند', description: 'تاریخچه، چشم‌انداز، مأموریت', icon: BookOpen },
    { id: 'values', title: 'ارزش‌های اصلی', description: 'حداکثر ۵ ارزش محوری', icon: Heart },
    { id: 'services', title: 'ساختار خدمات', description: 'تب‌ها و سلسله‌مراتب خدمات', icon: Layers },
    { id: 'team', title: 'تیم مدیریتی', description: 'معرفی اعضای هیئت مدیره', icon: Users },
    { id: 'testimonials', title: 'نظرات مشتریان', description: 'توصیه‌نامه‌های مشتریان واقعی', icon: MessageSquare },
    { id: 'contact', title: 'راه‌های تماس', description: 'شماره و نشانی دفتر مرکزی', icon: MapPin },
    { id: 'faqs', title: 'پرسش‌های متداول', description: 'پاسخ به سوالات سئوساز', icon: HelpCircle }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 p-4 md:p-8" dir="rtl">
      {/* Header Panel (matching custom-home layout) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 rounded-2xl">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">ویرایشگر هوشمند صفحه «درباره ما»</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">تولید ساختار پیشرفته، داستان برند، اعضا، تماس و پرسش‌های متداول</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreviewMode(!isPreviewMode)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              isPreviewMode
                ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/15'
                : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
            }`}
          >
            <Eye className="w-4 h-4" />
            {isPreviewMode ? 'بازگشت به ویرایشگر' : 'پیش‌نمایش زنده'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-black shadow-md shadow-primary-600/20 transition-all cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            ذخیره کل تنظیمات
          </button>
        </div>
      </div>

      {/* Messages banner */}
      {message.text && (
        <div className={`p-4 mb-6 rounded-xl border text-xs font-bold flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400'
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/80 text-rose-700 dark:text-rose-400'
        }`}>
          <AlertCircle className="w-4 h-4" />
          {message.text}
        </div>
      )}

      {controlSuccessMessage && (
        <div className="p-4 mb-6 rounded-xl border text-xs font-bold flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-400">
          <AlertCircle className="w-4 h-4" />
          {controlSuccessMessage}
        </div>
      )}

      {controlError && (
        <div className="p-4 mb-6 rounded-xl border text-xs font-bold flex items-center gap-2 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-800/80 text-rose-700 dark:text-rose-400">
          <AlertCircle className="w-4 h-4" />
          {controlError}
        </div>
      )}

      {isPreviewMode ? (
        /* Full screen dynamic preview mode */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 md:p-10">
          <AboutUsClient config={config} themeColor={themeColor} />
        </div>
      ) : (
        /* Form & Sidebar Grid Panel Layout (Matching custom-home & admin-header layout) */
        <div className="space-y-6">
          
          {/* AI Prompt Control - Smart Assistant (Moved to top of the box, full-width) */}
          <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-purple-600 text-white">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند درباره ما (کنترل با پرامپت)</h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                    با نوشتن دستورهای متنی به زبان ساده، تمام بخش‌های صفحه درباره ما (داستان برند، ارزش‌های اصلی، تیم اجرایی، توصیه‌نامه‌ها، تماس و سوالات متداول) را مدیریت کنید!
                  </p>
                </div>
              </div>
              <a
                href="/admin/agent"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-500 hover:to-pink-500 transition-all font-black text-xs shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-95 shrink-0 animate-pulse"
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
                  placeholder="مثال: داستان برند عطر ما را خیلی صمیمی‌تر بازنویسی کن و دپارتمان‌های ارسال و پشتیبانی بساز..."
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
                  'داستان برند ما را بسیار صمیمی و دوستانه بازنویسی کن',
                  'دپارتمان‌های دیجیتال و لجستیک را با زیرخدمت‌های شیک اضافه کن',
                  '۵ سوال متداول درباره گارانتی و رویه عودت کالا اضافه کن',
                  '۳ توصیه‌نامه خریداران را متناسب با دپارتمان ارسال بساز'
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
                        if (tab.id !== 'services') setEditingServiceId(null);
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
                    onClick={handleSave}
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
              
              {/* Tab 1: Brand Story Editor */}
              {activeTab === 'brand' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-black text-slate-800 dark:text-white">داستان برند</h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">ویرایش تیتر، داستان شکل‌گیری، چشم‌انداز، مأموریت و تصویر برند</p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان داستان</label>
                      <input
                        type="text"
                        value={config.brandStory.title || ''}
                        onChange={e => updateBrandStory({ title: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="داستان برند ما"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">سال تأسیس</label>
                      <input
                        type="text"
                        value={config.brandStory.foundingYear || ''}
                        onChange={e => updateBrandStory({ foundingYear: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="۱۳۹۸"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">داستان برند (احساسی و انسانی، غیر لیست‌وار)</label>
                    <textarea
                      rows={6}
                      value={config.brandStory.storyText || ''}
                      onChange={e => updateBrandStory({ storyText: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 leading-relaxed text-justify"
                      placeholder="داستان شکل‌گیری، فراز و نشیب‌ها و چگونگی به وجود آمدن این برند را در اینجا بنویسید..."
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">چشم‌انداز (Vision)</label>
                      <textarea
                        rows={3}
                        value={config.brandStory.visionText || ''}
                        onChange={e => updateBrandStory({ visionText: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="چشم‌انداز آینده برند..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">مأموریت (Mission)</label>
                      <textarea
                        rows={3}
                        value={config.brandStory.missionText || ''}
                        onChange={e => updateBrandStory({ missionText: e.target.value })}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        placeholder="مأموریت روزمره شرکت برای مشتریان..."
                      />
                    </div>
                  </div>

                  {/* Story Image Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">تصویر داستان برند</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-xl bg-slate-100 dark:bg-slate-800 border overflow-hidden shrink-0 flex items-center justify-center">
                        {config.brandStory.imageUrl ? (
                          <img src={config.brandStory.imageUrl} alt="Brand" className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="w-8 h-8 text-slate-300" />
                        )}
                      </div>
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setShowMediaPicker('brandStoryImage')}
                          className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-[10px] font-black cursor-pointer"
                        >
                          {config.brandStory.imageUrl ? 'تغییر تصویر' : 'انتخاب تصویر از رسانه'}
                        </button>
                        {config.brandStory.imageUrl && (
                          <button
                            type="button"
                            onClick={() => updateBrandStory({ imageUrl: '' })}
                            className="block text-[10px] text-rose-500 font-bold hover:underline"
                          >
                            حذف تصویر
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Core Values Editor */}
              {activeTab === 'values' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">ارزش‌های اصلی</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">حداکثر ۵ تا ۶ ارزش کلیدی بنویسید که هر کدام می‌تواند مرتبط با یک سرویس خاص باشد.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addCoreValue}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      افزودن ارزش جدید
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش ارزش‌ها</label>
                    <input
                      type="text"
                      value={config.coreValues.title || ''}
                      onChange={e => setConfig(prev => ({ ...prev, coreValues: { ...prev.coreValues, title: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="ارزش‌های اصلی ما"
                    />
                  </div>

                  <div className="space-y-4">
                    {config.coreValues.list.map((value, idx) => (
                      <div key={value.id} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 relative space-y-4 shadow-sm">
                        <button
                          type="button"
                          onClick={() => deleteCoreValue(value.id)}
                          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="حذف ارزش"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="grid sm:grid-cols-2 gap-4 pl-8">
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700">عنوان ارزش (مثال: شفافیت)</label>
                            <input
                              type="text"
                              value={value.title}
                              onChange={e => updateCoreValue(value.id, { title: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700">ارتباط با سرویس / بخش</label>
                            <select
                              value={value.serviceId || 'general'}
                              onChange={e => updateCoreValue(value.id, { serviceId: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                            >
                              <option value="general">عمومی (همه سرویس‌ها)</option>
                              {config.services.list.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700">توضیح کوتاه ارزش</label>
                          <input
                            type="text"
                            value={value.description}
                            onChange={e => updateCoreValue(value.id, { description: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                          />
                        </div>
                      </div>
                    ))}

                    {config.coreValues.list.length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <Heart className="w-10 h-10 stroke-1" />
                        <p className="text-[10px] font-bold mt-2">هیچ ارزش اصلی ثبت نشده است. روی دکمه افزودن ارزش کلیک کنید.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 3: Services and Structure Editor */}
              {activeTab === 'services' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">ساختار خدمات</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">سلسله‌مراتب و جزئیات خدمات خود را به صورت تب/آکاردئون ویرایش کنید.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addService}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      افزودن سرویس جدید
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش خدمات</label>
                    <input
                      type="text"
                      value={config.services.title || ''}
                      onChange={e => setConfig(prev => ({ ...prev, services: { ...prev.services, title: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="ساختار خدمات ما"
                    />
                  </div>

                  {/* Service Manager List Selector */}
                  <div className="flex flex-wrap gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                    {config.services.list.map(s => (
                      <div
                        key={s.id}
                        onClick={() => setEditingServiceId(s.id)}
                        className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
                          editingServiceId === s.id
                            ? 'bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-400 border border-primary-200'
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-300 border border-transparent'
                        }`}
                      >
                        <span>{s.title}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteService(s.id);
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {config.services.list.length === 0 && (
                      <p className="text-[10px] text-slate-400 font-bold py-2">هیچ سرویس فعالی ثبت نشده است.</p>
                    )}
                  </div>

                  {/* Selected Service Detailed Form Editor */}
                  {editingServiceId && (
                    <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800/30">
                      {(() => {
                        const srv = config.services.list.find(s => s.id === editingServiceId);
                        if (!srv) return null;

                        return (
                          <div className="space-y-6">
                            <h3 className="text-xs font-black text-primary-600 flex items-center gap-1.5">
                              <Edit2 className="w-4 h-4" />
                              ویرایش سرویس: {srv.title}
                            </h3>

                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700">عنوان سرویس</label>
                                <input
                                  type="text"
                                  value={srv.title}
                                  onChange={e => updateService(srv.id, { title: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-black text-slate-700">شناسه انگلیسی (برای ارجاع در نظرات/ارزش‌ها)</label>
                                <input
                                  type="text"
                                  value={srv.id}
                                  onChange={e => updateService(srv.id, { id: e.target.value })}
                                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                                />
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">توضیح خلاصه سرویس</label>
                              <input
                                type="text"
                                value={srv.description}
                                onChange={e => updateService(srv.id, { description: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">جزئیات کامل سرویس (محتوای داخل تب/آکاردئون)</label>
                              <textarea
                                rows={5}
                                value={srv.details}
                                onChange={e => updateService(srv.id, { details: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-justify"
                                placeholder="توضیحات و عملکرد اختصاصی و کامل سرویس را تشریح کنید..."
                              />
                            </div>

                            {/* Contact Info of specific service */}
                            <div className="bg-slate-50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-4 space-y-4 animate-none">
                              <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-1.5">
                                <Phone className="w-4 h-4 text-primary-600" />
                                اطلاعات تماس اختصاصی این سرویس
                              </h4>
                              <div className="grid sm:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black text-slate-600">تلفن مستقیم</label>
                                  <input
                                    type="text"
                                    value={srv.contact.phone || ''}
                                    onChange={e => updateService(srv.id, { contact: { ...srv.contact, phone: e.target.value } })}
                                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <label className="text-[11px] font-black text-slate-600">ایمیل مستقیم</label>
                                  <input
                                    type="text"
                                    value={srv.contact.email || ''}
                                    onChange={e => updateService(srv.id, { contact: { ...srv.contact, email: e.target.value } })}
                                    className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold animate-none"
                                  />
                                </div>
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-black text-slate-600">آدرس اختصاصی (انبار / دفتر پشتیبانی)</label>
                                <input
                                  type="text"
                                  value={srv.contact.address || ''}
                                  onChange={e => updateService(srv.id, { contact: { ...srv.contact, address: e.target.value } })}
                                  className="w-full px-3 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold"
                                />
                              </div>
                            </div>

                            {/* Sub Services Manager inside selected service */}
                            <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <Layers className="w-4 h-4 text-primary-600" />
                                  مدیریت زیرسرویس‌ها / دپارتمان‌ها
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => addSubService(srv.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-[9px] font-black cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  افزودن زیرسرویس
                                </button>
                              </div>

                              <div className="space-y-3">
                                {srv.subServices.map((sub, sIdx) => (
                                  <div key={sub.id} className="flex gap-4 items-start bg-slate-50 dark:bg-slate-800/10 p-3 rounded-xl border border-slate-100 dark:border-slate-800 relative">
                                    <button
                                      type="button"
                                      onClick={() => deleteSubService(srv.id, sub.id)}
                                      className="absolute left-2 top-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="flex-grow grid sm:grid-cols-3 gap-3 pr-4">
                                      <div className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black">عنوان زیرخدمت</label>
                                        <input
                                          type="text"
                                          value={sub.title}
                                          onChange={e => updateSubService(srv.id, sub.id, { title: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg text-[11px] font-bold"
                                        />
                                      </div>
                                      <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[10px] text-slate-400 font-black">توضیح کوتاه زیرخدمت</label>
                                        <input
                                          type="text"
                                          value={sub.description}
                                          onChange={e => updateSubService(srv.id, sub.id, { description: e.target.value })}
                                          className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg text-[11px] font-bold"
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {srv.subServices.length === 0 && (
                                  <p className="text-[9px] text-slate-400 font-black text-center py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">زیرسرویسی ثبت نشده است.</p>
                                )}
                              </div>
                            </div>

                            {/* Service-Specific Team Members */}
                            <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <Users className="w-4 h-4 text-rose-500" />
                                  تیم اختصاصی این سرویس
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => addServiceTeam(srv.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-[9px] font-black cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  افزودن عضو تیم
                                </button>
                              </div>

                              <div className="grid sm:grid-cols-2 gap-4">
                                {srv.team.map((member) => (
                                  <div key={member.id} className="flex gap-3 bg-slate-50 dark:bg-slate-800/10 p-3 rounded-xl border border-slate-100 relative">
                                    <button
                                      type="button"
                                      onClick={() => deleteServiceTeam(srv.id, member.id)}
                                      className="absolute left-2 top-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="w-12 h-12 rounded-lg bg-white border overflow-hidden shrink-0 flex flex-col items-center justify-center cursor-pointer shadow-xs"
                                         onClick={() => setShowMediaPicker(`serviceteam-${srv.id}-${member.id}`)}>
                                      {member.avatarUrl ? (
                                        <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                                      ) : (
                                        <Users className="w-5 h-5 text-slate-300" />
                                      )}
                                    </div>
                                    <div className="flex-grow space-y-2">
                                      <input
                                        type="text"
                                        value={member.name}
                                        onChange={e => updateServiceTeam(srv.id, member.id, { name: e.target.value })}
                                        className="w-full px-2 py-1 bg-white border rounded text-[11px] font-bold"
                                        placeholder="نام همکار"
                                      />
                                      <input
                                        type="text"
                                        value={member.role}
                                        onChange={e => updateServiceTeam(srv.id, member.id, { role: e.target.value })}
                                        className="w-full px-2 py-1 bg-white border rounded text-[10px] font-bold"
                                        placeholder="سمت همکار"
                                      />
                                    </div>
                                  </div>
                                ))}
                                {srv.team.length === 0 && (
                                  <p className="sm:col-span-2 text-[9px] text-slate-400 font-black text-center py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">عضوی ثبت نشده است.</p>
                                )}
                              </div>
                            </div>

                            {/* Service-Specific FAQs */}
                            <div className="space-y-4 border border-slate-100 dark:border-slate-800 rounded-2xl p-4">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                                  <HelpCircle className="w-4 h-4 text-primary-600" />
                                  سوالات متداول اختصاصی این سرویس
                                </h4>
                                <button
                                  type="button"
                                  onClick={() => addServiceFaq(srv.id)}
                                  className="flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-600 hover:bg-primary-100 rounded-lg text-[9px] font-black cursor-pointer"
                                >
                                  <Plus className="w-3 h-3" />
                                  افزودن سوال
                                </button>
                              </div>

                              <div className="space-y-3">
                                {srv.faqs.map((faq) => (
                                  <div key={faq.id} className="bg-slate-50 dark:bg-slate-800/10 p-3 rounded-xl border border-slate-100 relative space-y-2">
                                    <button
                                      type="button"
                                      onClick={() => deleteServiceFaq(srv.id, faq.id)}
                                      className="absolute left-2 top-2 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="space-y-1.5 pl-6">
                                      <input
                                        type="text"
                                        value={faq.question}
                                        onChange={e => updateServiceFaq(srv.id, faq.id, { question: e.target.value })}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg text-[11px] font-bold"
                                        placeholder="پرسش..."
                                      />
                                      <input
                                        type="text"
                                        value={faq.answer}
                                        onChange={e => updateServiceFaq(srv.id, faq.id, { answer: e.target.value })}
                                        className="w-full px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg text-[10px] font-bold text-justify"
                                        placeholder="پاسخ..."
                                      />
                                    </div>
                                  </div>
                                ))}
                                {srv.faqs.length === 0 && (
                                  <p className="text-[9px] text-slate-400 font-black text-center py-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">سوال و پاسخی ثبت نشده است.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Platform Management Team Editor */}
              {activeTab === 'team' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">تیم مدیریتی و اجرایی پلتفرم</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">معرفی اعضای کلیدی هیئت مدیره، مدیرعامل و راهبران ارشد پلتفرم</p>
                    </div>
                    <button
                      type="button"
                      onClick={addPlatformTeam}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      افزودن عضو جدید
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش تیم</label>
                    <input
                      type="text"
                      value={config.team.title || ''}
                      onChange={e => setConfig(prev => ({ ...prev, team: { ...prev.team, title: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="تیم مدیریتی و اجرایی"
                    />
                  </div>

                  <div className="space-y-4">
                    {config.team.platformTeam.map((member) => (
                      <div key={member.id} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 relative space-y-4 shadow-sm">
                        <button
                          type="button"
                          onClick={() => deletePlatformTeam(member.id)}
                          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="حذف عضو تیم"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex gap-4">
                          {/* Avatar */}
                          <div className="space-y-1 shrink-0">
                            <label className="text-[10px] text-slate-400 font-bold block">تصویر همکار</label>
                            <div
                              onClick={() => setShowMediaPicker(`team-${member.id}`)}
                              className="w-16 h-16 rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              {member.avatarUrl ? (
                                <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-6 h-6 text-slate-300" />
                              )}
                            </div>
                          </div>

                          {/* Fields */}
                          <div className="flex-grow grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">نام همکار</label>
                              <input
                                type="text"
                                value={member.name}
                                onChange={e => updatePlatformTeam(member.id, { name: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">نقش / سمت</label>
                              <input
                                type="text"
                                value={member.role}
                                onChange={e => updatePlatformTeam(member.id, { role: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-black text-slate-700">بیوگرافی / معرفی کوتاه همکار</label>
                          <input
                            type="text"
                            value={member.bio || ''}
                            onChange={e => updatePlatformTeam(member.id, { bio: e.target.value })}
                            className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-justify"
                            placeholder="توضیح کوتاه درباره تخصص و سابقه کار..."
                          />
                        </div>
                      </div>
                    ))}

                    {config.team.platformTeam.length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <Users className="w-10 h-10 stroke-1" />
                        <p className="text-[10px] font-bold mt-2">هیچ عضو تیمی ثبت نشده است. روی دکمه افزودن عضو کلیک کنید.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Testimonials & Reviews Editor */}
              {activeTab === 'testimonials' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">توصیه‌نامه‌ها و نظرات مشتریان</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">توصیه‌نامه‌های شرکا، همکاران یا مشتریان با امکان اختصاص به سرویس‌های خاص</p>
                    </div>
                    <button
                      type="button"
                      onClick={addTestimonial}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      افزودن توصیه‌نامه جدید
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش توصیه‌نامه‌ها</label>
                    <input
                      type="text"
                      value={config.testimonials.title || ''}
                      onChange={e => setConfig(prev => ({ ...prev, testimonials: { ...prev.testimonials, title: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="نظرات و توصیه‌نامه‌ها"
                    />
                  </div>

                  <div className="space-y-4">
                    {config.testimonials.list.map((test) => (
                      <div key={test.id} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 relative space-y-4 shadow-sm">
                        <button
                          type="button"
                          onClick={() => deleteTestimonial(test.id)}
                          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="حذف توصیه‌نامه"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="flex gap-4">
                          {/* Avatar */}
                          <div className="space-y-1 shrink-0">
                            <label className="text-[10px] text-slate-400 font-bold block">تصویر</label>
                            <div
                              onClick={() => setShowMediaPicker(`testimonial-${test.id}`)}
                              className="w-12 h-12 rounded-xl bg-white border border-slate-100 overflow-hidden flex items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                            >
                              {test.avatarUrl ? (
                                <img src={test.avatarUrl} alt={test.author} className="w-full h-full object-cover" />
                              ) : (
                                <Users className="w-5 h-5 text-slate-300" />
                              )}
                            </div>
                          </div>

                          {/* Fields */}
                          <div className="flex-grow grid sm:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">نام نویسنده</label>
                              <input
                                type="text"
                                value={test.author}
                                onChange={e => updateTestimonial(test.id, { author: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">سمت / کسب‌وکار</label>
                              <input
                                type="text"
                                value={test.role || ''}
                                onChange={e => updateTestimonial(test.id, { role: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-xs font-black text-slate-700">مرتبط با سرویس</label>
                              <select
                                value={test.serviceId || 'general'}
                                onChange={e => updateTestimonial(test.id, { serviceId: e.target.value })}
                                className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                              >
                                <option value="general">عمومی (پلتفرم)</option>
                                {config.services.list.map(s => (
                                  <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-5 gap-4">
                          <div className="space-y-1.5 sm:col-span-4">
                            <label className="text-xs font-black text-slate-700">متن نظر / توصیه‌نامه</label>
                            <input
                              type="text"
                              value={test.comment}
                              onChange={e => updateTestimonial(test.id, { comment: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold text-justify"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700">امتیاز (۱ تا ۵)</label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={test.rating || 5}
                              onChange={e => updateTestimonial(test.id, { rating: parseInt(e.target.value) || 5 })}
                              className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold"
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {config.testimonials.list.length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <MessageSquare className="w-10 h-10 stroke-1" />
                        <p className="text-[10px] font-bold mt-2">هیچ توصیه‌نامه‌ای ثبت نشده است. روی دکمه افزودن نظر کلیک کنید.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: General Contact Information */}
              {activeTab === 'contact' && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-black text-slate-800 dark:text-white">راه‌های ارتباط عمومی (پشتیبانی مرکزی)</h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">آدرس، تلفن و پست الکترونیکی مرکزی شرکت خود را برای نمایش عمومی ویرایش کنید.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش ارتباط با ما</label>
                    <input
                      type="text"
                      value={config.contact.title || ''}
                      onChange={e => setConfig(prev => ({ ...prev, contact: { ...prev.contact, title: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="راه‌های ارتباط با ما"
                    />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">تلفن تماس مرکزی</label>
                      <input
                        type="text"
                        value={config.contact.phone || ''}
                        onChange={e => setConfig(prev => ({ ...prev, contact: { ...prev.contact, phone: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 dark:text-slate-300">پست الکترونیک مرکزی</label>
                      <input
                        type="text"
                        value={config.contact.email || ''}
                        onChange={e => setConfig(prev => ({ ...prev, contact: { ...prev.contact, email: e.target.value } }))}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">آدرس پستی دفتر مرکزی</label>
                    <textarea
                      rows={3}
                      value={config.contact.address || ''}
                      onChange={e => setConfig(prev => ({ ...prev, contact: { ...prev.contact, address: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20 text-justify"
                    />
                  </div>
                </div>
              )}

              {/* Tab 7: General FAQs Editor */}
              {activeTab === 'faqs' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-800 dark:text-white">سؤالات متداول عمومی</h2>
                      <p className="text-[10px] text-slate-400 font-bold mt-1">سوالات عمومی کسب‌وکار با فایده دوگانه: کمک به کاربران و ارتقای سئو (SEO)</p>
                    </div>
                    <button
                      type="button"
                      onClick={addGeneralFaq}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 hover:bg-primary-100 text-primary-600 rounded-xl text-[10px] font-black transition-all cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      افزودن سوال جدید
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 dark:text-slate-300">عنوان بخش سوالات متداول</label>
                    <input
                      type="text"
                      value={config.faqs.title || ''}
                      onChange={e => setConfig(prev => ({ ...prev, faqs: { ...prev.faqs, title: e.target.value } }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                      placeholder="سؤالات متداول عمومی"
                    />
                  </div>

                  <div className="space-y-4">
                    {config.faqs.generalFaqs.map((faq) => (
                      <div key={faq.id} className="bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-700 rounded-2xl p-4 relative space-y-3 shadow-sm">
                        <button
                          type="button"
                          onClick={() => deleteGeneralFaq(faq.id)}
                          className="absolute top-4 left-4 p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          title="حذف سوال"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="space-y-2 pl-8">
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700">پرسش عمومی</label>
                            <input
                              type="text"
                              value={faq.question}
                              onChange={e => updateGeneralFaq(faq.id, { question: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2"
                              placeholder="مثال: روش پرداختی پلتفرم چیست؟"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-700">پاسخ کامل</label>
                            <textarea
                              rows={3}
                              value={faq.answer}
                              onChange={e => updateGeneralFaq(faq.id, { answer: e.target.value })}
                              className="w-full px-3 py-2 bg-white border border-slate-100 dark:border-slate-700 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 text-justify"
                              placeholder="پاسخ کامل سوال جهت نمایش و بهبود سئو..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {config.faqs.generalFaqs.length === 0 && (
                      <div className="py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400">
                        <HelpCircle className="w-10 h-10 stroke-1" />
                        <p className="text-[10px] font-bold mt-2">هیچ سوال متداولی ثبت نشده است. روی دکمه افزودن سوال کلیک کنید.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPicker
          onSelect={(url) => handleMediaSelect(url)}
          onClose={() => setShowMediaPicker(null)}
          title="انتخاب رسانه مناسب"
        />
      )}

      {/* Dynamic step-by-step AI Preview & Change Confirmation Modal (Matching /admin/agent style) */}
      {showAiConfirmModal && pendingConfig && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl max-w-5xl w-full h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/10">
                  <Sparkles className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black">طرح پیشنهادی هوش مصنوعی درباره ما</h3>
                  <p className="text-[9px] text-purple-100 mt-0.5 font-bold">پیش‌نمایش زنده و جزییات طرح پیش از اعمال نهایی در فرم</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowAiConfirmModal(false);
                  setPendingConfig(null);
                }}
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Modal Body */}
            <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              
              {/* Right panel: Explanation & Warnings */}
              <div className="lg:col-span-4 border-l border-slate-100 dark:border-slate-800/60 p-6 overflow-y-auto space-y-6 bg-slate-50/50 dark:bg-slate-950/20">
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-purple-600 uppercase tracking-wider block">✍️ تحلیل و اقدام هوش مصنوعی</span>
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed text-justify bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-xs">
                    {aiExplanation || 'تغییرات با موفقیت تحلیل و آماده اعمال گردید.'}
                  </p>
                </div>

                {aiWarnings && aiWarnings.length > 0 && (
                  <div className="space-y-2.5">
                    <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">⚠️ هشدارهای منطقی و توصیه‌ها</span>
                    {aiWarnings.map((warning, idx) => (
                      <div key={idx} className="bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-3 flex items-start gap-2 text-amber-800 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500 animate-bounce" />
                        <p className="text-[10px] font-bold leading-relaxed text-justify">{warning}</p>
                      </div>
                    ))}
                  </div>
                )}

                <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100/60 p-4 rounded-2xl space-y-1.5">
                  <span className="text-[9.5px] font-black text-purple-700 dark:text-purple-400 block">💡 راهنما:</span>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold text-justify">
                    با کلیک روی دکمه «تأیید و اعمال تغییرات»، اطلاعات تولیدشده در فرم چیدمان وارد می‌شوند. برای ذخیره دایمی در دیتابیس، حتماً پس از آن دکمه «ذخیره تنظیمات» را کلیک نمایید.
                  </p>
                </div>
              </div>

              {/* Left panel: Complete Visual Live Preview (matching /admin/agent preview panel) */}
              <div className="lg:col-span-8 p-6 overflow-y-auto bg-slate-100/30 dark:bg-slate-950/50 space-y-4">
                <div className="flex items-center justify-between border-b pb-3 border-slate-200/50 shrink-0">
                  <span className="text-[10px] font-black text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
                    <Eye className="w-4 h-4 text-primary-600" />
                    ۱. پیش‌نمایش بصری و چیدمان زنده لندینگ
                  </span>
                  <span className="text-[9px] font-bold text-slate-400">فروشگاه آنلاین {shopName}</span>
                </div>

                {/* Simulated AboutUs Page Preview inside Modal */}
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-3xl p-6 shadow-md shadow-slate-100/50">
                  <AboutUsClient config={pendingConfig} themeColor={themeColor} />
                </div>
              </div>
            </div>

            {/* Modal Footer actions (matching custom-home & agent buttons style) */}
            <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 shrink-0 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiConfirmModal(false);
                  setPendingConfig(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-black text-xs cursor-pointer"
              >
                انصراف و لغو
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingConfig) {
                    setConfig(pendingConfig);
                    setControlSuccessMessage('طرح با موفقیت در فرم اِعمال گردید. برای ثبت دایمی روی دکمه «ذخیره کل تنظیمات» کلیک کنید.');
                    setPromptInput('');
                    setTimeout(() => setControlSuccessMessage(''), 8000);
                  }
                  setShowAiConfirmModal(false);
                  setPendingConfig(null);
                }}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition-all font-black text-xs cursor-pointer shadow-md shadow-purple-600/15"
              >
                تایید و اعمال تغییرات هوش مصنوعی
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
