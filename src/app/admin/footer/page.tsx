// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Save, X, Settings2, Upload, Image as ImageIcon, 
  Layers, Link as LinkIcon, Eye, EyeOff, Layout, ChevronUp, ChevronDown, 
  Mail, Phone, MapPin, Globe, PlusCircle, Edit, Check, AlertTriangle, AlertCircle, Loader2,
  Sparkles, ShieldCheck, Search
} from 'lucide-react';
import { getFooterConfig, updateFooterConfig } from '@/app/actions/footer';
import { DEFAULT_FOOTER_CONFIG, type FooterConfig, type FooterColumn, type FooterLink, type FooterSocial, type FooterBadge } from '@/types/footer';

export default function FooterAdminPage() {
  const [config, setConfig] = useState<FooterConfig>(DEFAULT_FOOTER_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'content' | 'contact' | 'columns' | 'custom-code'>('general');
  const [isUploadingLogo, setIsUploadingUploadingLogo] = useState(false);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [proposedConfig, setProposedConfig] = useState<FooterConfig | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // States for managing columns and links
  const [selectedColumnId, setSelectedColumnId] = useState<string>('col-1');
  const [editingLinkId, setEditingId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState({ label: '', url: '', target: '_self' as '_self' | '_blank' });
  const [isAddingLink, setIsAddingLink] = useState(false);

  // States for managing trust badges
  const [editingBadgeId, setEditingBadgeId] = useState<string | null>(null);
  const [badgeForm, setBadgeForm] = useState({ title: '', imageUrl: '', linkUrl: '', enabled: true });
  const [isAddingBadge, setIsAddingBadge] = useState(false);
  const [isUploadingBadge, setIsUploadingBadge] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const footerData = await getFooterConfig();
      setConfig(footerData);
      if (footerData.columns && footerData.columns.length > 0) {
        setSelectedColumnId(footerData.columns[0].id);
      }
    } catch (error) {
      console.error('Failed to load footer config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setSaveStatus('saving');
    setSaveError('');
    try {
      await updateFooterConfig(config);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 5000);
      alert('تنظیمات فوتر با موفقیت ذخیره شد');
    } catch (error: any) {
      console.error('Failed to save footer config:', error);
      setSaveStatus('error');
      setSaveError(error.message || 'خطا در ذخیره تنظیمات');
    } finally {
      setIsSaving(false);
    }
  };

  // AI Control submit handler
  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiWarnings([]);
    setAiExplanation('');
    setProposedConfig(null);

    try {
      const res = await fetch('/api/admin/footer/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          currentConfig: config
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطایی در پردازش هوش مصنوعی رخ داد.');
        return;
      }
      if (data.success) {
        setProposedConfig(data.config || null);
        setAiExplanation(data.explanation || '');
        setAiWarnings(data.warnings || []);
      } else {
        alert(data.explanation || 'هوش مصنوعی نتوانست دستور را پردازش کند.');
      }
    } catch (error) {
      console.error('AI Processing error:', error);
      alert('خطا در برقراری ارتباط با دستیار هوشمند.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyProposedConfig = () => {
    if (!proposedConfig) return;
    setConfig(proposedConfig);
    setProposedConfig(null);
    setAiExplanation('');
    setAiWarnings([]);
    setAiPrompt('');
    alert('تغییرات هوشمند فوتر با موفقیت روی فرم اعمال شد. لطفاً برای نهایی شدن، دکمه «ذخیره تغییرات فوتر» بالا را کلیک کنید.');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploadingUploadingLogo(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setConfig(prev => ({
          ...prev,
          logoUrl: data.url,
        }));
      } else {
        alert('آپلود لوگو با خطا مواجه شد');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('خطا در ارتباط با سرور هنگام آپلود');
    } finally {
      setIsUploadingUploadingLogo(false);
    }
  };

  const handleBadgeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploadingBadge(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        const data = await res.json();
        setBadgeForm(prev => ({
          ...prev,
          imageUrl: data.url,
        }));
      } else {
        alert('آپلود تصویر نماد با خطا مواجه شد');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('خطا در ارتباط با سرور هنگام آپلود');
    } finally {
      setIsUploadingBadge(false);
    }
  };

  // Socials Change Handler
  const handleSocialChange = (platform: string, enabled: boolean, url: string) => {
    setConfig(prev => {
      const updatedSocials = prev.socials.map(s => {
        if (s.platform === platform) {
          return { ...s, enabled, url };
        }
        return s;
      });
      
      // If platform doesn't exist, add it
      if (!updatedSocials.some(s => s.platform === platform)) {
        updatedSocials.push({ platform: platform as any, url, enabled });
      }

      return { ...prev, socials: updatedSocials };
    });
  };

  // Column Title Change Handler
  const handleColumnTitleChange = (columnId: string, title: string) => {
    setConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col => col.id === columnId ? { ...col, title } : col)
    }));
  };

  // Link Management
  const handleAddLink = () => {
    if (!linkForm.label || !linkForm.url) return;

    const newLink: FooterLink = {
      id: `link-${Date.now()}`,
      label: linkForm.label,
      url: linkForm.url,
      target: linkForm.target,
    };

    setConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col => {
        if (col.id === selectedColumnId) {
          return { ...col, links: [...col.links, newLink] };
        }
        return col;
      })
    }));

    setLinkForm({ label: '', url: '', target: '_self' });
    setIsAddingLink(false);
  };

  const handleUpdateLink = () => {
    if (!editingLinkId || !linkForm.label || !linkForm.url) return;

    setConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col => {
        if (col.id === selectedColumnId) {
          return {
            ...col,
            links: col.links.map(link => link.id === editingLinkId ? { ...link, ...linkForm } : link)
          };
        }
        return col;
      })
    }));

    setEditingId(null);
    setLinkForm({ label: '', url: '', target: '_self' });
  };

  const handleDeleteLink = (linkId: string) => {
    if (!confirm('آیا از حذف این لینک اطمینان دارید؟')) return;

    setConfig(prev => ({
      ...prev,
      columns: prev.columns.map(col => {
        if (col.id === selectedColumnId) {
          return {
            ...col,
            links: col.links.filter(link => link.id !== linkId)
          };
        }
        return col;
      })
    }));
  };

  const handleMoveLink = (index: number, direction: 'up' | 'down') => {
    setConfig(prev => {
      const updatedColumns = prev.columns.map(col => {
        if (col.id === selectedColumnId) {
          const links = [...col.links];
          const targetIndex = direction === 'up' ? index - 1 : index + 1;
          if (targetIndex >= 0 && targetIndex < links.length) {
            const temp = links[index];
            links[index] = links[targetIndex];
            links[targetIndex] = temp;
          }
          return { ...col, links };
        }
        return col;
      });
      return { ...prev, columns: updatedColumns };
    });
  };

  // Badge Management
  const handleAddBadge = () => {
    if (!badgeForm.title || !badgeForm.imageUrl) {
      alert('لطفاً عنوان و تصویر نماد را وارد کنید');
      return;
    }

    const newBadge: FooterBadge = {
      id: `badge-${Date.now()}`,
      title: badgeForm.title,
      imageUrl: badgeForm.imageUrl,
      linkUrl: badgeForm.linkUrl,
      enabled: badgeForm.enabled,
    };

    setConfig(prev => ({
      ...prev,
      badges: [...(prev.badges || []), newBadge]
    }));

    setBadgeForm({ title: '', imageUrl: '', linkUrl: '', enabled: true });
    setIsAddingBadge(false);
  };

  const handleUpdateBadge = () => {
    if (!editingBadgeId || !badgeForm.title || !badgeForm.imageUrl) return;

    setConfig(prev => ({
      ...prev,
      badges: prev.badges.map(b => b.id === editingBadgeId ? { ...b, ...badgeForm } : b)
    }));

    setEditingBadgeId(null);
    setBadgeForm({ title: '', imageUrl: '', linkUrl: '', enabled: true });
  };

  const handleDeleteBadge = (badgeId: string) => {
    if (!confirm('آیا از حذف این نماد اطمینان دارید؟')) return;

    setConfig(prev => ({
      ...prev,
      badges: prev.badges.filter(b => b.id !== badgeId)
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center py-8 text-slate-500 flex flex-col items-center gap-3">
          <Loader2 className="animate-spin h-8 w-8 text-blue-600" />
          <span className="font-bold text-sm">در حال بارگذاری تنظیمات فوتر...</span>
        </div>
      </div>
    );
  }

  const currentColumn = config.columns.find(col => col.id === selectedColumnId);

  const tabs = [
    { id: 'general', title: 'تنظیمات عمومی و رنگ‌بندی', description: 'فعال‌سازی، تغییر تم رنگی فوتر و آپلود لوگو', icon: Settings2 },
    { id: 'content', title: 'توضیحات و شبکه‌ها', description: 'متن معرفی، کپی‌رایت و شبکه‌های اجتماعی', icon: ImageIcon },
    { id: 'contact', title: 'اطلاعات تماس و نمادها', description: 'شماره تلفن، ایمیل، آدرس و نمادهای الکترونیکی', icon: Phone },
    { id: 'columns', title: 'ستون‌های لینک فوتر', description: 'مدیریت ۳ ستون لینک داینامیک انتهای سایت', icon: Layers },
    { id: 'custom-code', title: 'کد اختصاصی (اسکریپت)', description: 'درج ابزارک‌های چت، آمارگیر و کدهای سفارشی', icon: LinkIcon },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-blue-600/10 text-blue-600 rounded-2xl dark:bg-blue-500/10 dark:text-blue-400">
                <Layout size={28} />
              </span>
              تنظیمات و شخصی‌سازی فوتر
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              تنظیمات عمومی، تم رنگی، متن‌ها، اطلاعات تماس و نمادهای الکترونیکی فوتر را مدیریت و شخصی‌سازی کنید.
            </p>
          </div>
          
          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            data-testid="save-status"
            data-status-state={saveStatus}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition-all duration-200 w-full sm:w-auto justify-center shadow-md hover:shadow-blue-500/20 cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span className="font-bold text-sm">ذخیره تغییرات فوتر</span>
          </button>
        </div>

        {/* خطا در ذخیره‌سازی تغییرات */}
        {saveStatus === 'error' && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-2xl font-black text-xs text-right flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{saveError || 'خطایی در ثبت نهایی تغییرات رخ داد.'}</span>
          </div>
        )}

        {/* AI Smart Assistant Panel (Stories match design) */}
        <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-white">دستیار هوشمند فوتر (کنترل کامل با پرامپت)</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed mt-0.5">
                با نوشتن دستورات ساده فارسی، رنگ‌بندی فوتر را تغییر دهید، لینک‌های جدید و خودکار به آخرین محصولات یا وبلاگ بسازید، و متون کپی‌رایت و شبکه‌ها را یکجا اصلاح کنید!
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="مثال: تم فوتر رو روی دارک ست کن و یک لینک به آخرین مقالات وبلاگ در ستون سوم اضافه کن..."
                className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-900 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiSubmit();
                  }
                }}
                disabled={isAiLoading}
              />
              <button
                type="button"
                disabled={isAiLoading || !aiPrompt.trim()}
                onClick={handleAiSubmit}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {isAiLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال پردازش...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>اعمال دستور</span>
                  </>
                )}
              </button>
            </div>

            {/* Suggestions / Prompt Templates */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center ml-1">پیشنهادها:</span>
              {[
                { text: 'تم فوتر را روی تیره (Dark) ست کن و اطلاعات تماس پشتیبانی را فعال کن', label: 'اعمال تم دارک و تماس' },
                { text: 'در ستون دسترسی سریع لینک‌هایی به آخرین مقالات وبلاگ و آخرین دسته‌بندی‌ها اضافه کن', label: 'لینک‌های خودکار وبلاگ و دسته' },
                { text: 'یک تم سفارشی یشمی شیک با پس زمینه #064e3b، متن سفید و دکمه‌های زرد ایجاد کن', label: 'تنظیم تم سفارشی یشمی' },
                { text: 'شبکه‌های اجتماعی اینستاگرام و تلگرام را غیرفعال کن و متن کپی‌رایت را اصلاح کن', label: 'تغییر شبکه‌ها و کپی‌رایت' }
              ].map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(sug.text)}
                  className="text-[9px] bg-white hover:bg-purple-100 dark:bg-slate-900 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer font-bold"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Proposed AI Changes Confirmation panel */}
        {proposedConfig && (
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Check size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">اقدامات پیشنهادی هوش مصنوعی</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">لطفاً پیش‌نمایش توضیحات هوش مصنوعی را مطالعه کرده و تغییرات را تایید کنید تا روی فرم قرار بگیرد.</p>
                </div>
              </div>
              <button 
                onClick={() => { setProposedConfig(null); setAiExplanation(''); setAiWarnings([]); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                title="انصراف"
              >
                <X size={20} />
              </button>
            </div>

            {/* AI Explanation comment */}
            {aiExplanation && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                💡 {aiExplanation}
              </div>
            )}

            {/* AI logical warnings */}
            {aiWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl text-sm text-amber-850 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>ملاحظات منطقی:</span>
                </div>
                {aiWarnings.map((w, idx) => (
                  <p key={idx} className="text-xs pr-6">• {w}</p>
                ))}
              </div>
            )}

            {/* Actions CTA panel */}
            <div className="flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-5">
              <button 
                onClick={() => { setProposedConfig(null); setAiExplanation(''); setAiWarnings([]); }}
                className="px-6 py-3 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl font-bold text-sm transition-all cursor-pointer"
              >
                رد کردن تغییرات
              </button>
              <button 
                onClick={handleApplyProposedConfig}
                className="px-8 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-bold text-sm shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check size={18} />
                تایید و اعمال روی پنل فوتر
              </button>
            </div>
          </div>
        )}

        {/* Mobile Horizontal Scrollable Tabs - Hidden on Desktop */}
        <div className="flex md:hidden items-center gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-xs">
          <div className="flex-1 flex overflow-x-auto pb-1 gap-2 scrollbar-none snap-x scroll-smooth">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl font-black text-xs shrink-0 snap-center transition-all border cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  {tab.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dashboard Grid Container */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Desktop/Tablet Sidebar Tabs */}
          <div className="hidden md:flex md:col-span-4 lg:col-span-3 flex-col gap-2 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-2 mb-2">بخش‌های تنظیمات</span>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`group relative flex items-center gap-3 p-2.5 rounded-2xl text-right transition-all border w-full cursor-pointer ${
                    isActive
                      ? 'bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 dark:border-blue-500/30'
                      : 'bg-transparent text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-50 dark:hover:bg-slate-850'
                  }`}
                >
                  <div className={`p-2 rounded-xl border shrink-0 ${
                    isActive
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-slate-50 dark:bg-slate-950 text-slate-500 border-slate-100 dark:border-slate-850'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-black truncate">{tab.title}</span>
                    <span className={`block text-[9px] font-bold mt-0.5 truncate ${isActive ? 'text-blue-500/80' : 'text-slate-400'}`}>
                      {tab.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Main Form Settings Content Panel */}
          <div className="col-span-1 md:col-span-8 lg:col-span-9 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm">
            {/* TAB 1: GENERAL & COLORS */}
            {activeTab === 'general' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
                  تنظیمات عمومی و رنگ‌بندی فوتر
                </h2>

                {/* Enable Switch Card */}
                <div className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <div>
                    <span className="block font-bold text-sm text-slate-900 dark:text-white">نمایش فوتر در سایت</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">فعال یا غیرفعال کردن کل بخش فوتر در تمامی صفحات فروشگاه</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.enabled}
                      onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Theme Selection Section */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">پوسته رنگ‌بندی فوتر</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { id: 'light', label: 'روشن', desc: 'پس‌زمینه روشن و متن تیره' },
                      { id: 'dark', label: 'تیره (پیش‌فرض)', desc: 'پس‌زمینه تیره و متن روشن' },
                      { id: 'custom', label: 'سفارشی و اختصاصی', desc: 'رنگ‌بندی دقیق توسط شما' },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setConfig({ ...config, theme: t.id as any })}
                        className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                          config.theme === t.id
                            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="block font-extrabold text-xs">{t.label}</span>
                        <span className="block text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Color Settings Grid */}
                {config.theme === 'custom' && (
                  <div className="p-5 border border-blue-100 dark:border-blue-900/30 bg-blue-50/10 dark:bg-blue-950/5 rounded-2xl space-y-5 animate-in fade-in duration-200">
                    <h3 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" />
                      تنظیم رنگ‌بندی اختصاصی فوتر
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {[
                        { key: 'bgColor', label: 'رنگ پس‌زمینه' },
                        { key: 'textColor', label: 'رنگ متن اصلی' },
                        { key: 'linkColor', label: 'رنگ لینک‌ها' },
                        { key: 'linkHoverColor', label: 'رنگ هاور لینک‌ها' },
                        { key: 'borderColor', label: 'رنگ خطوط جداکننده' },
                      ].map((colorItem) => (
                        <div key={colorItem.key} className="space-y-1.5">
                          <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400">{colorItem.label}</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={(config as any)[colorItem.key] || '#ffffff'}
                              onChange={(e) => setConfig({ ...config, [colorItem.key]: e.target.value })}
                              className="w-10 h-10 rounded-xl border border-slate-300 dark:border-slate-800 p-0 cursor-pointer shrink-0"
                            />
                            <input
                              type="text"
                              value={(config as any)[colorItem.key] || ''}
                              onChange={(e) => setConfig({ ...config, [colorItem.key]: e.target.value })}
                              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Logo Box */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">لوگوی اختصاصی فوتر</label>
                  <div className="flex flex-col sm:flex-row items-center gap-5 p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/10">
                    <div className="w-20 h-20 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                      {config.logoUrl ? (
                        <img src={config.logoUrl} alt="Footer Logo" className="max-h-full max-w-full object-contain p-1.5" />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="آدرس اینترنتی تصویر لوگو..."
                          value={config.logoUrl || ''}
                          onChange={(e) => setConfig({ ...config, logoUrl: e.target.value || null })}
                          className="flex-1 p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left"
                          dir="ltr"
                        />
                        <label className="flex items-center gap-1.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl transition-colors cursor-pointer text-xs font-extrabold shrink-0 select-none">
                          {isUploadingLogo ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          <span>آپلود لوگو</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            disabled={isUploadingLogo}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <span className="block text-[10px] text-slate-400 leading-relaxed font-bold">
                        در صورت خالی بودن، از لوگوی اصلی فروشگاه استفاده خواهد شد. سایز پیشنهادی ۱۸۰ در ۵۰ پیکسل است.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CONTENT & SOCIALS */}
            {activeTab === 'content' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
                  توضیحات و شبکه‌های اجتماعی
                </h2>

                {/* About Description text */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">متن معرفی یا درباره فروشگاه در فوتر</label>
                  <textarea
                    rows={4}
                    value={config.aboutText}
                    onChange={(e) => setConfig({ ...config, aboutText: e.target.value })}
                    placeholder="توضیح کوتاهی درباره فروشگاه، خدمات یا بیانیه ماموریت شما..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed"
                  />
                  <span className="block text-[10px] text-slate-400 font-bold">
                    این متن در ستون اول فوتر در کنار لوگوی فروشگاه نمایش داده می‌شود.
                  </span>
                </div>

                {/* Copyright Text */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">متن کپی‌رایت انتهای سایت</label>
                  <input
                    type="text"
                    value={config.copyrightText}
                    onChange={(e) => setConfig({ ...config, copyrightText: e.target.value })}
                    placeholder="تمامی حقوق مادی و معنوی این سایت متعلق به..."
                    className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                  />
                </div>

                {/* Social Networks List Toggle and Edit */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-extrabold text-slate-950 dark:text-white">نمایش شبکه‌های اجتماعی در فوتر</h3>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={config.showSocials}
                        onChange={(e) => setConfig({ ...config, showSocials: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {config.showSocials && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
                      {[
                        { id: 'instagram', label: 'اینستاگرام', placeholder: 'https://instagram.com/username' },
                        { id: 'telegram', label: 'تلگرام', placeholder: 'https://t.me/username' },
                        { id: 'whatsapp', label: 'واتس‌اپ', placeholder: 'https://wa.me/989123456789' },
                        { id: 'twitter', label: 'توییتر / ایکس', placeholder: 'https://twitter.com/username' },
                        { id: 'linkedin', label: 'لینکدین', placeholder: 'https://linkedin.com/in/username' },
                        { id: 'youtube', label: 'یوتیوب', placeholder: 'https://youtube.com/c/channel' },
                        { id: 'aparat', label: 'آپارات', placeholder: 'https://aparat.com/username' },
                      ].map((platform) => {
                        const social = config.socials.find(s => s.platform === platform.id) || { enabled: false, url: '' };
                        return (
                          <div key={platform.id} className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 bg-slate-50/30 dark:bg-slate-900/10">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{platform.label}</span>
                              <input
                                type="checkbox"
                                checked={social.enabled}
                                onChange={(e) => handleSocialChange(platform.id, e.target.checked, social.url)}
                                className="w-4 h-4 text-blue-600 border-slate-300 dark:border-slate-800 rounded focus:ring-blue-500 cursor-pointer"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder={platform.placeholder}
                              value={social.url}
                              disabled={!social.enabled}
                              onChange={(e) => handleSocialChange(platform.id, social.enabled, e.target.value)}
                              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white disabled:opacity-40 text-left"
                              dir="ltr"
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: CONTACT & BADGES */}
            {activeTab === 'contact' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
                  اطلاعات تماس و نمادهای اعتماد
                </h2>

                {/* Contact Info Toggle Card */}
                <div className="flex items-center justify-between p-5 bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-850 rounded-2xl">
                  <div>
                    <span className="block font-bold text-sm text-slate-900 dark:text-white">نمایش اطلاعات تماس در فوتر</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">نمایش آیکون دار ایمیل، تلفن و آدرس با گرافیک زیبا در فوتر</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={config.showContactInfo}
                      onChange={(e) => setConfig({ ...config, showContactInfo: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Contact Form Fields */}
                {config.showContactInfo && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">تلفن پشتیبانی (کال تو اکشن)</label>
                      <div className="relative">
                        <Phone className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={config.contactPhone}
                          onChange={(e) => setConfig({ ...config, contactPhone: e.target.value })}
                          placeholder="مثال: 021-12345678"
                          className="w-full pr-10 pl-4 p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">ایمیل کال تو اکشن</label>
                      <div className="relative">
                        <Mail className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="email"
                          value={config.contactEmail}
                          onChange={(e) => setConfig({ ...config, contactEmail: e.target.value })}
                          placeholder="مثال: info@yoursite.com"
                          className="w-full pr-10 pl-4 p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">آدرس فیزیکی فروشگاه</label>
                      <div className="relative">
                        <MapPin className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-400 shrink-0" />
                        <input
                          type="text"
                          value={config.contactAddress}
                          onChange={(e) => setConfig({ ...config, contactAddress: e.target.value })}
                          placeholder="آدرس دفتر مرکزی یا فروشگاه شما..."
                          className="w-full pr-10 pl-4 p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Trust Badges section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">نمادهای اعتماد و مجوزهای فروشگاه</h3>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingBadgeId(null);
                        setBadgeForm({ title: '', imageUrl: '', linkUrl: '', enabled: true });
                        setIsAddingBadge(true);
                      }}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      <PlusCircle className="w-4 h-4" />
                      افزودن نماد جدید
                    </button>
                  </div>

                  {/* Add/Edit Badge form box */}
                  {(isAddingBadge || editingBadgeId) && (
                    <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/10 space-y-4 animate-in fade-in duration-200">
                      <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        {editingBadgeId ? 'ویرایش نماد اعتماد' : 'افزودن نماد اعتماد جدید'}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">عنوان نماد (مثال: اینماد)</label>
                          <input
                            type="text"
                            value={badgeForm.title}
                            onChange={(e) => setBadgeForm({ ...badgeForm, title: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">آدرس لینک کلیک نماد</label>
                          <input
                            type="text"
                            placeholder="https://trust.enamad.ir/..."
                            value={badgeForm.linkUrl}
                            onChange={(e) => setBadgeForm({ ...badgeForm, linkUrl: e.target.value })}
                            className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white text-left"
                            dir="ltr"
                          />
                        </div>

                        <div className="sm:col-span-2 space-y-1">
                          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500">تصویر لوگوی نماد</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="آدرس اینترنتی تصویر نماد..."
                              value={badgeForm.imageUrl}
                              onChange={(e) => setBadgeForm({ ...badgeForm, imageUrl: e.target.value })}
                              className="flex-1 p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white text-left"
                              dir="ltr"
                            />
                            <label className="flex items-center gap-1.5 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors cursor-pointer text-[11px] font-bold shrink-0 select-none">
                              {isUploadingBadge ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Upload className="w-3.5 h-3.5" />
                              )}
                              <span>آپلود تصویر</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleBadgeImageUpload}
                                disabled={isUploadingBadge}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingBadge(false);
                            setEditingBadgeId(null);
                          }}
                          className="px-3 py-1.5 border border-slate-300 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                        >
                          انصراف
                        </button>
                        <button
                          type="button"
                          onClick={editingBadgeId ? handleUpdateBadge : handleAddBadge}
                          className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer"
                        >
                          {editingBadgeId ? 'بروزرسانی نماد' : 'افزودن نماد'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Trust Badges List Grid */}
                  {config.badges && config.badges.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {config.badges.map((badge) => (
                        <div 
                          key={badge.id}
                          className="flex items-center justify-between p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/20 dark:bg-slate-900/5 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-12 h-12 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shrink-0">
                              <img src={badge.imageUrl} alt={badge.title} className="max-h-full max-w-full object-contain p-1" />
                            </div>
                            <div className="overflow-hidden">
                              <span className="block text-xs font-extrabold text-slate-900 dark:text-white truncate">{badge.title}</span>
                              <span className="block text-[9px] text-slate-400 truncate max-w-[150px] mt-0.5" dir="ltr">{badge.linkUrl || 'بدون لینک'}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBadgeId(badge.id);
                                setBadgeForm({
                                  title: badge.title,
                                  imageUrl: badge.imageUrl,
                                  linkUrl: badge.linkUrl || '',
                                  enabled: badge.enabled,
                                });
                                setIsAddingBadge(false);
                              }}
                              className="p-1.5 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              title="ویرایش"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBadge(badge.id)}
                              className="p-1.5 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                      هیچ نماد اعتمادی ثبت نشده است. می‌توانید مجوزهایی مانند اینماد، ساماندهی یا جواز کسب را در اینجا تعریف کنید.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: LINK COLUMNS */}
            {activeTab === 'columns' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
                  مدیریت ستون‌های لینک فوتر
                </h2>

                {/* Column Selector Pills */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">ستون لینک مورد نظر جهت مدیریت</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {config.columns.map((col, idx) => (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => {
                          setSelectedColumnId(col.id);
                          setEditingId(null);
                          setIsAddingLink(false);
                        }}
                        className={`p-3.5 rounded-2xl border text-center font-extrabold text-xs transition-all cursor-pointer ${
                          selectedColumnId === col.id
                            ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        ستون {idx + 1}: {col.title || 'بدون عنوان'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Selected column settings box */}
                {currentColumn && (
                  <div className="p-5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 space-y-5 animate-in fade-in duration-200">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">عنوان ستون فوتر</label>
                      <input
                        type="text"
                        value={currentColumn.title}
                        onChange={(e) => handleColumnTitleChange(currentColumn.id, e.target.value)}
                        className="w-full p-3 border border-slate-300 dark:border-slate-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      />
                    </div>

                    {/* Column Links section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                        <h3 className="text-xs font-extrabold text-slate-900 dark:text-white">لینک‌های این ستون</h3>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setLinkForm({ label: '', url: '', target: '_self' });
                            setIsAddingLink(true);
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                        >
                          <PlusCircle className="w-4 h-4" />
                          افزودن لینک جدید
                        </button>
                      </div>

                      {/* Add/Edit Link form drawer */}
                      {(isAddingLink || editingLinkId) && (
                        <div className="p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 space-y-4 animate-in fade-in duration-200">
                          <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                            {editingLinkId ? 'ویرایش لینک انتخابی' : 'ساخت لینک جدید'}
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500">عنوان لینک</label>
                              <input
                                type="text"
                                placeholder="مثال: سوالات متداول"
                                value={linkForm.label}
                                onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500">آدرس لینک (URL)</label>
                              <input
                                type="text"
                                placeholder="مثال: /faq"
                                value={linkForm.url}
                                onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
                                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-transparent dark:text-white text-left"
                                dir="ltr"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500">روش باز شدن</label>
                              <select
                                value={linkForm.target}
                                onChange={(e) => setLinkForm({ ...linkForm, target: e.target.value as any })}
                                className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 dark:text-white outline-none"
                              >
                                <option value="_self">در همان پنجره</option>
                                <option value="_blank">در پنجره جدید</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setIsAddingLink(false);
                                setEditingId(null);
                              }}
                              className="px-3 py-1.5 border border-slate-300 dark:border-slate-850 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                            >
                              انصراف
                            </button>
                            <button
                              type="button"
                              onClick={editingLinkId ? handleUpdateLink : handleAddLink}
                              className="px-4 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-750 cursor-pointer"
                            >
                              {editingLinkId ? 'اعمال ویرایش' : 'افزودن لینک'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Column Links List */}
                      {currentColumn.links && currentColumn.links.length > 0 ? (
                        <div className="space-y-2">
                          {currentColumn.links.map((link, idx) => (
                            <div 
                              key={link.id}
                              className="flex items-center justify-between p-3.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-800 transition-all shadow-xs"
                            >
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{link.label}</span>
                                <span className="text-[10px] text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-0.5 rounded-lg truncate max-w-[150px]" dir="ltr">
                                  {link.url}
                                </span>
                                {link.target === '_blank' && (
                                  <span className="text-[9px] text-blue-600 bg-blue-50/50 dark:bg-blue-950/20 px-1.5 py-0.5 rounded-md shrink-0 font-bold">پنجره جدید</span>
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMoveLink(idx, 'up')}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 cursor-pointer"
                                  title="انتقال به بالا"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === currentColumn.links.length - 1}
                                  onClick={() => handleMoveLink(idx, 'down')}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 disabled:opacity-30 cursor-pointer"
                                  title="انتقال به پایین"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(link.id);
                                    setLinkForm({
                                      label: link.label,
                                      url: link.url,
                                      target: link.target || '_self',
                                    });
                                    setIsAddingLink(false);
                                  }}
                                  className="p-1 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer"
                                  title="ویرایش"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteLink(link.id)}
                                  className="p-1 text-red-500 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                  title="حذف"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-850 rounded-2xl text-slate-400 text-xs">
                          هیچ لینکی در این ستون تعریف نشده است.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 5: CUSTOM CODE (HTML Injection) */}
            {activeTab === 'custom-code' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-200">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-50 dark:border-slate-850">
                  اسکریپت و کدهای سفارشی HTML/JS
                </h2>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-850 dark:text-amber-300 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <span className="block font-black mb-1">هشدار امنیتی و فنی</span>
                    کدهای وارد شده در این بخش بدون هیچ واسطه‌ای در انتهای تمامی صفحات فروشگاه شما رندر خواهند شد. از وارد کردن کدهای مشکوک یا نامعتبر خودداری کنید. این بخش برای اضافه کردن ابزارک‌های چت آنلاین (مانند گفتینو، رایچت)، آمارگیرها (گوگل آنالیتیکس) یا اسکریپت‌های کاستوم فوق‌العاده کاربردی است.
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">کد اختصاصی HTML / JavaScript</label>
                  <textarea
                    rows={12}
                    value={config.customHtml || ''}
                    onChange={(e) => setConfig({ ...config, customHtml: e.target.value })}
                    placeholder="<!-- کدهای اختصاصی یا چت آنلاین خود را اینجا وارد کنید -->&#10;<script>&#10;  console.log('Custom script loaded!');&#10;</script>"
                    className="w-full p-4 border border-slate-300 dark:border-slate-800 rounded-2xl bg-gray-950 text-emerald-400 font-mono focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
