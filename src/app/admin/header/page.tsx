'use client';

import { useState, useEffect } from 'react';
import { Plus, GripVertical, Pencil, Trash2, Save, X, Settings2, Megaphone, Upload, Image as ImageIcon, Layers, Link as LinkIcon, Eye, EyeOff, Layout, ListCollapse, ChevronUp, ChevronDown, Sparkles, Loader2, AlertCircle, Check, Wand2 } from 'lucide-react';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem, updateMenuItemsOrder, getHeaderConfig, updateHeaderConfig } from '@/app/actions/header';
import { BANNER_TEXT_MAX_LENGTH, DEFAULT_HEADER_CONFIG, type HeaderConfig } from '@/types/header';

// Helper to adjust color brightness (darken/lighten) dynamically for custom colors
function adjustColor(hex: string, percent: number): string {
  // Remove leading #
  const cleanedHex = hex.replace(/^\s*#|\s*$/g, '');
  // Standardize 3-character hex to 6-character hex
  const formattedHex = cleanedHex.length === 3 
    ? cleanedHex.replace(/(.)/g, '$1$1') 
    : cleanedHex;

  const r = parseInt(formattedHex.substring(0, 2), 16);
  const g = parseInt(formattedHex.substring(2, 4), 16);
  const b = parseInt(formattedHex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return hex; // Fallback to original if invalid hex
  }

  const factor = percent < 0 ? (1 + percent) : 1;
  const offset = percent < 0 ? 0 : 255 * percent;

  const newR = Math.min(255, Math.max(0, Math.round(r * factor + offset)));
  const newG = Math.min(255, Math.max(0, Math.round(g * factor + offset)));
  const newB = Math.min(255, Math.max(0, Math.round(b * factor + offset)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function renderFormattedText(text: string, underlineImportant: boolean) {
  if (!text) return '';
  if (!underlineImportant) return text;

  const regex = /\[([^\]]+)\]|\*([^*]+)\*|_([^_]+)_/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const matchIndex = match.index;
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    const matchedText = match[1] || match[2] || match[3];
    parts.push(
      <span 
        key={matchIndex} 
        className="underline underline-offset-4 decoration-2 font-bold"
        style={{ textDecorationColor: 'currentColor' }}
      >
        {matchedText}
      </span>
    );

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

interface MenuItem {
  id: string;
  title: string;
  url: string;
  order: number;
  isActive: boolean;
}

const DEFAULT_ELEMENTS = [
  { id: 'logo', label: 'لوگو' },
  { id: 'categories', label: 'دسته‌بندی‌ها' },
  { id: 'menu', label: 'آیتم‌های منوی دستی' },
  { id: 'shop', label: 'فروشگاه' },
  { id: 'blog', label: 'وبلاگ' },
  { id: 'about_us', label: 'درباره ما' },
  { id: 'contact_us', label: 'تماس با ما' },
  { id: 'search', label: 'جستجو' },
  { id: 'cart', label: 'سبد خرید' },
  { id: 'user', label: 'پنل کاربری' }
];

export default function HeaderAdminPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [config, setConfig] = useState<HeaderConfig>(DEFAULT_HEADER_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ title: '', url: '', color: '', icon: '', isActive: true });
  const [isAdding, setIsAdding] = useState(false);
  const [isUploadingGif, setIsUploadingGif] = useState(false);
  const [activeTab, setActiveTab] = useState<'banner' | 'layout' | 'menu'>('banner');

  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [aiExplanation, setAiExplanation] = useState('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [pendingConfig, setPendingConfig] = useState<HeaderConfig | null>(null);
  const [showAiConfirmModal, setShowAiConfirmModal] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get('aiPrompt');
      if (promptParam) {
        setPromptInput(promptParam);
        setTimeout(() => {
          document.getElementById('ai-assistant-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    }
  }, []);

  const handleApplyAiControl = async () => {
    if (!promptInput.trim()) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');

    try {
      const res = await fetch('/api/admin/header/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          currentConfig: config
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند هدر رخ داد.');
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [menuData, configData] = await Promise.all([
        getMenuItems(),
        getHeaderConfig()
      ]);
      setItems(menuData);
      
      // Ensure all elements exist in order array
      const standardElements = ['logo', 'categories', 'menu', 'shop', 'blog', 'about_us', 'contact_us', 'search', 'cart', 'user'];
      const loadedOrder = configData.elementsOrder || standardElements;
      const missingElements = standardElements.filter(e => !loadedOrder.includes(e));
      
      setConfig({
        showCategories: configData.showCategories ?? false,
        showSearch: configData.showSearch ?? true,
        showCart: configData.showCart ?? true,
        showUser: configData.showUser ?? true,
        showBlog: configData.showBlog ?? true,
        showShop: configData.showShop ?? false,
        showAboutUs: configData.showAboutUs ?? false,
        showContactUs: configData.showContactUs ?? false,
        sticky: configData.sticky ?? true,
        elementsOrder: [...loadedOrder, ...missingElements],
        banner: {
          enabled: configData.banner?.enabled ?? false,
          text: configData.banner?.text ?? '',
          link: configData.banner?.link ?? '',
          bgColor: configData.banner?.bgColor ?? '#4f46e5',
          textColor: configData.banner?.textColor ?? '#ffffff',
          gifUrl: configData.banner?.gifUrl ?? '',
          bgType: configData.banner?.bgType ?? 'gradient',
          tagText: configData.banner?.tagText ?? '',
          tagBgColor: configData.banner?.tagBgColor ?? '#ef4444',
          tagTextColor: configData.banner?.tagTextColor ?? '#ffffff',
          underlineImportant: configData.banner?.underlineImportant ?? true,
          tagAnimated: configData.banner?.tagAnimated ?? true,
          tagWithCheck: configData.banner?.tagWithCheck ?? true,
        },
      });
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGifUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploadingGif(true);
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
          banner: {
            ...prev.banner!,
            gifUrl: data.url,
          }
        }));
      } else {
        alert('آپلود گیف با خطا مواجه شد');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('خطا در ارتباط با سرور هنگام آپلود');
    } finally {
      setIsUploadingGif(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      await updateHeaderConfig(config);
      alert('تنظیمات با موفقیت ذخیره شد');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('خطا در ذخیره تنظیمات');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const moveElementUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...config.elementsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index - 1];
    newOrder[index - 1] = temp;
    setConfig({ ...config, elementsOrder: newOrder });
  };

  const moveElementDown = (index: number) => {
    if (index === config.elementsOrder.length - 1) return;
    const newOrder = [...config.elementsOrder];
    const temp = newOrder[index];
    newOrder[index] = newOrder[index + 1];
    newOrder[index + 1] = temp;
    setConfig({ ...config, elementsOrder: newOrder });
  };

  const handleAdd = async () => {
    if (!editForm.title || !editForm.url) return;
    
    setIsSaving(true);
    try {
      await createMenuItem({
        title: editForm.title,
        url: editForm.url,
        color: editForm.color || null,
        icon: editForm.icon || null,
        isActive: editForm.isActive,
        order: items.length,
      });
      const data = await getMenuItems();
      setItems(data);
      setIsAdding(false);
      setEditForm({ title: '', url: '', color: '', icon: '', isActive: true });
    } catch (error) {
      console.error('Failed to create menu item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingId || !editForm.title || !editForm.url) return;
    
    setIsSaving(true);
    try {
      await updateMenuItem(editingId, {
        title: editForm.title,
        url: editForm.url,
        color: editForm.color || null,
        icon: editForm.icon || null,
        isActive: editForm.isActive,
      });
      const data = await getMenuItems();
      setItems(data);
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update menu item:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این آیتم اطمینان دارید؟')) return;
    
    try {
      await deleteMenuItem(id);
      const data = await getMenuItems();
      setItems(data);
    } catch (error) {
      console.error('Failed to delete menu item:', error);
    }
  };

  const moveUp = async (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index - 1];
    newItems[index - 1] = temp;
    
    const updates = newItems.map((item, i) => ({ id: item.id, order: i }));
    setItems(newItems);
    await updateMenuItemsOrder(updates);
  };

  const moveDown = async (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    const temp = newItems[index];
    newItems[index] = newItems[index + 1];
    newItems[index + 1] = temp;
    
    const updates = newItems.map((item, i) => ({ id: item.id, order: i }));
    setItems(newItems);
    await updateMenuItemsOrder(updates);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">در حال بارگذاری...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مدیریت هدر سایت</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ظاهر، منوها و بنر اعلان بالای سایت خود را به صورت زنده و مینیمال مدیریت کنید.
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {(activeTab === 'banner' || activeTab === 'layout') && (
            <button
              onClick={handleSaveConfig}
              disabled={isSavingConfig}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition-all duration-200 disabled:opacity-50 text-sm font-semibold shadow-sm hover:shadow-indigo-500/10"
            >
              <Save className="w-4.5 h-4.5" />
              <span>{isSavingConfig ? 'در حال ذخیره...' : 'ذخیره کل تنظیمات هدر'}</span>
            </button>
          )}
        </div>
      </div>

      {/* AI Prompt Control - Smart Assistant */}
      <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند هدر (کنترل با پرامپت)</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                با نوشتن دستورهای متنی به زبان ساده، تمام بخش‌های هدر و بنر اعلان بالای سایت (متن، رنگ، لینک، وضعیت نمایش، چیدمان و ترتیب المان‌ها) را به صورت هوشمند مدیریت کنید!
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
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="مثال: بنر بالای سایت رو فعال کن و متنش رو بذار ارسال رایگان برای اولین خرید!"
              className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
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
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
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
              'بنر بالای سایت رو فعال کن و متنش رو بذار ارسال رایگان برای اولین خرید!',
              'رنگ بنر بالای سایت رو بنفش تیره کن و تگ جدید رو براش فعال کن',
              'دسته‌بندی‌ها و وبلاگ رو در هدر نمایش بده ولی جستجو رو غیرفعال کن',
              'بنر بالای سایت رو غیرفعال کن'
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

          {controlError && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{controlError}</span>
            </div>
          )}

          {controlSuccessMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">دستور با موفقیت اعمال شد:</p>
                <p className="text-[11px] opacity-90">{controlSuccessMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900 p-1 md:p-1.5 rounded-2xl gap-1 shadow-xs">
        <button
          onClick={() => {
            setActiveTab('banner');
            setIsAdding(false);
            setEditingId(null);
          }}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-200 ${
            activeTab === 'banner'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40'
          }`}
        >
          <Megaphone className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="hidden sm:inline">بنر بالای سایت</span>
          <span className="inline sm:hidden">بنر</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('layout');
            setIsAdding(false);
            setEditingId(null);
          }}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-200 ${
            activeTab === 'layout'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40'
          }`}
        >
          <Layout className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="hidden sm:inline">چیدمان و المان‌ها</span>
          <span className="inline sm:hidden">چیدمان</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('menu');
          }}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 px-2 sm:py-3 sm:px-4 rounded-xl text-[11px] sm:text-sm font-bold transition-all duration-200 ${
            activeTab === 'menu'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-800/40'
          }`}
        >
          <LinkIcon className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
          <span className="hidden sm:inline">منوی ناوبری دستی</span>
          <span className="inline sm:hidden">منو</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="transition-all duration-300">
        
        {/* TAB 1: BANNER SETTINGS */}
        {activeTab === 'banner' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 space-y-6">
              <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white">نوار اعلان و بنر فوقانی</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">یک پیام، پیشنهاد یا کد تخفیف را در بالاترین نقطه فروشگاه نشان دهید.</p>
                </div>
              </div>

              {/* Toggle Banner */}
              <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/25 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="space-y-0.5">
                  <p className="text-sm font-bold text-gray-800 dark:text-gray-200">وضعیت نمایش بنر</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">نمایش یا پنهان کردن بنر در تمامی صفحات فروشگاه</p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      banner: { ...config.banner!, enabled: !(config.banner?.enabled ?? false) },
                    })
                  }
                  className={`relative inline-flex h-6.5 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.banner?.enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5.5 w-5.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.banner?.enabled ? 'translate-x-5.5 rtl:-translate-x-5.5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {config.banner?.enabled && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">متن بنر</label>
                      <input
                        type="text"
                        value={config.banner?.text ?? ''}
                        maxLength={BANNER_TEXT_MAX_LENGTH}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            banner: { ...config.banner!, text: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="مثال: 🎉 ارسال رایگان برای سفارش‌های بالای ۵۰۰ هزار تومان!"
                        dir="rtl"
                      />
                      <div className="flex justify-between items-center mt-1.5 px-1">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">حداکثر طول {BANNER_TEXT_MAX_LENGTH} کاراکتر</span>
                        <span className="text-[10px] font-mono text-gray-400">
                          {(config.banner?.text ?? '').length}/{BANNER_TEXT_MAX_LENGTH}
                        </span>
                      </div>
                      
                      <div className="mt-3 flex items-center gap-2 p-2.5 bg-gray-50/50 dark:bg-gray-850/25 rounded-xl border border-gray-100 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, underlineImportant: !(config.banner?.underlineImportant ?? true) },
                            })
                          }
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (config.banner?.underlineImportant ?? true) ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              (config.banner?.underlineImportant ?? true) ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">خط‌دار کردن بخش‌های مهم</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">کلمات داخل ستاره یا قلاب خط‌دار می‌شوند. مثال: `ارسال رایگان برای *بالای ۵۰۰ هزار تومان*`</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">لینک کلیک روی بنر (URL)</label>
                      <input
                        type="text"
                        value={config.banner?.link ?? ''}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            banner: { ...config.banner!, link: e.target.value },
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                        placeholder="/category/sale-items"
                        dir="ltr"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">نوع پس‌زمینه بنر</label>
                      <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 dark:bg-gray-950 rounded-xl border border-gray-200/50 dark:border-gray-850 h-11 items-center">
                        <button
                          type="button"
                          onClick={() => setConfig({
                            ...config,
                            banner: { ...config.banner!, bgType: 'solid' }
                          })}
                          className={`h-full rounded-lg text-xs font-bold transition-all duration-200 ${
                            config.banner?.bgType === 'solid'
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          تک رنگ ساده
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfig({
                            ...config,
                            banner: { ...config.banner!, bgType: 'gradient' }
                          })}
                          className={`h-full rounded-lg text-xs font-bold transition-all duration-200 ${
                            (config.banner?.bgType ?? 'gradient') === 'gradient'
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-xs'
                              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                          }`}
                        >
                          گریدینت متحرک
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">رنگ پس‌زمینه بنر</label>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={config.banner?.bgColor ?? '#4f46e5'}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner: { ...config.banner!, bgColor: e.target.value },
                              })
                            }
                            className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer p-0 overflow-hidden"
                          />
                        </div>
                        <input
                          type="text"
                          value={config.banner?.bgColor ?? '#4f46e5'}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, bgColor: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">رنگ متن بنر</label>
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <input
                            type="color"
                            value={config.banner?.textColor ?? '#ffffff'}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner: { ...config.banner!, textColor: e.target.value },
                              })
                            }
                            className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer p-0 overflow-hidden"
                          />
                        </div>
                        <input
                          type="text"
                          value={config.banner?.textColor ?? '#ffffff'}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, textColor: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Preset Colors */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 mb-2.5">پالت رنگ‌های پیشنهادی و آماده</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { name: 'سورمه‌ای / ایندیگو', bg: '#4f46e5', text: '#ffffff' },
                        { name: 'سبز / بهاری', bg: '#10b981', text: '#ffffff' },
                        { name: 'قرمز / جشنواره', bg: '#ef4444', text: '#ffffff' },
                        { name: 'طلایی / لوکس', bg: '#f59e0b', text: '#ffffff' },
                        { name: 'بادمجانی / تیره', bg: '#701a75', text: '#ffffff' },
                        { name: 'مشکی / مینیمال', bg: '#111827', text: '#ffffff' },
                        { name: 'روشن / ملایم', bg: '#f3f4f6', text: '#1f2937' },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, bgColor: preset.bg, textColor: preset.text },
                            })
                          }
                          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-100 dark:border-gray-800 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-850/50 hover:border-gray-300 dark:hover:border-gray-750 transition-all bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300"
                        >
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-gray-200/60 dark:border-gray-800"
                            style={{ backgroundColor: preset.bg }}
                          />
                          <span>{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Minimal Tag Settings */}
                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg">
                        <span className="text-[10px] font-black">TAG</span>
                      </span>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">تنظیمات تگ مینیمال (برچسب کوچک کنار متن)</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">متن تگ (مثال: جدید، ویژه، مهم)</label>
                        <input
                          type="text"
                          value={config.banner?.tagText ?? ''}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, tagText: e.target.value },
                            })
                          }
                          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-xs font-bold"
                          placeholder="خالی بگذارید تا نشان داده نشود"
                          dir="rtl"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">رنگ پس‌زمینه تگ</label>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={config.banner?.tagBgColor ?? '#ef4444'}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  banner: { ...config.banner!, tagBgColor: e.target.value },
                                })
                              }
                              className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer p-0 overflow-hidden"
                            />
                          </div>
                          <input
                            type="text"
                            value={config.banner?.tagBgColor ?? '#ef4444'}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner: { ...config.banner!, tagBgColor: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            dir="ltr"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">رنگ متن تگ</label>
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <input
                              type="color"
                              value={config.banner?.tagTextColor ?? '#ffffff'}
                              onChange={(e) =>
                                setConfig({
                                  ...config,
                                  banner: { ...config.banner!, tagTextColor: e.target.value },
                                })
                              }
                              className="w-11 h-11 rounded-xl border border-gray-200 dark:border-gray-800 cursor-pointer p-0 overflow-hidden"
                            />
                          </div>
                          <input
                            type="text"
                            value={config.banner?.tagTextColor ?? '#ffffff'}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner: { ...config.banner!, tagTextColor: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            dir="ltr"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="flex items-center gap-2.5 p-3 bg-gray-50/50 dark:bg-gray-850/25 rounded-xl border border-gray-100 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, tagAnimated: !(config.banner?.tagAnimated ?? true) },
                            })
                          }
                          className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (config.banner?.tagAnimated ?? true) ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              (config.banner?.tagAnimated ?? true) ? 'translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">افکت تپش متحرک (Pulse)</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">برچسب به صورت ملایم بزرگ و کوچک می‌شود تا توجه جلب کند.</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 p-3 bg-gray-50/50 dark:bg-gray-850/25 rounded-xl border border-gray-100 dark:border-gray-800">
                        <button
                          type="button"
                          onClick={() =>
                            setConfig({
                              ...config,
                              banner: { ...config.banner!, tagWithCheck: !(config.banner?.tagWithCheck ?? true) },
                            })
                          }
                          className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            (config.banner?.tagWithCheck ?? true) ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                              (config.banner?.tagWithCheck ?? true) ? 'translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <div className="text-right">
                          <p className="text-xs font-bold text-gray-700 dark:text-gray-300">نمایش آیکون تیک مینیمال</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">یک آیکون تیک کوچک و سبک در کنار متن برچسب نمایش داده می‌شود.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GIF Settings */}
                  <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-indigo-500" />
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">تصویر گیف بنر (افکت تصویری متحرک)</h3>
                    </div>

                    <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 text-amber-800 dark:text-amber-400">
                      <p className="text-xs font-bold mb-1 flex items-center gap-1">📐 پیشنهاد اندازه تصویر بنر گیف:</p>
                      <p className="text-xs leading-relaxed opacity-90">
                        بهتر است عرض تصویر <strong>حداقل ۱۲۰۰ پیکسل و ارتفاع آن بین ۴۰ تا ۶۰ پیکسل</strong> باشد (نسبت ابعاد بسیار کشیده). 
                        برای بارگذاری سریع فروشگاه، حجم فایل تا حد امکان فشرده باشد.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">آدرس مستقیم تصویر گیف (GIF URL)</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={config.banner?.gifUrl ?? ''}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                banner: { ...config.banner!, gifUrl: e.target.value },
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-850 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-left font-mono text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            placeholder="https://site.com/uploads/holiday-banner.gif"
                            dir="ltr"
                          />
                          {(config.banner?.gifUrl ?? '') && (
                            <button
                              type="button"
                              onClick={() =>
                                setConfig({
                                  ...config,
                                  banner: { ...config.banner!, gifUrl: '' },
                                })
                              }
                              className="px-3 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-900/30 rounded-xl transition-all"
                              title="حذف گیف"
                            >
                              <X className="w-4.5 h-4.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">آپلود مستقیم فایل گیف جدید</label>
                        <label className={`flex items-center justify-center gap-2.5 px-4 py-2.5 border border-dashed rounded-xl bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/40 transition-colors border-gray-300 dark:border-gray-800 ${isUploadingGif ? 'opacity-50 pointer-events-none' : ''}`}>
                          <Upload className="w-4.5 h-4.5 text-indigo-500" />
                          <span className="text-xs font-bold">{isUploadingGif ? 'در حال آپلود...' : 'انتخاب و آپلود فایل GIF'}</span>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/gif"
                            onChange={handleGifUpload}
                            disabled={isUploadingGif}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Visual Preview */}
                  {((config.banner.text?.trim() || config.banner.gifUrl?.trim())) && (() => {
                    const baseColor = config.banner.bgColor || '#4f46e5';
                    const bgType = config.banner.bgType ?? 'gradient';
                    const isGradient = bgType === 'gradient';
                    const hasGif = !!config.banner.gifUrl?.trim();
                    const isDefaultColor = baseColor.toLowerCase() === '#4f46e5' || baseColor.toLowerCase() === 'indigo';
                    
                    let backgroundImage = '';
                    if (!hasGif && isGradient) {
                      if (isDefaultColor) {
                        backgroundImage = 'linear-gradient(270deg, #4f46e5 0%, #6366f1 20%, #8b5cf6 40%, #ec4899 60%, #3b82f6 80%, #4f46e5 100%)';
                      } else {
                        const colorDark = adjustColor(baseColor, -0.25);
                        const colorLight = adjustColor(baseColor, 0.25);
                        const colorMid = baseColor;
                        backgroundImage = `linear-gradient(270deg, ${colorDark} 0%, ${colorMid} 25%, ${colorLight} 50%, ${colorMid} 75%, ${colorDark} 100%)`;
                      }
                    }

                    const tagText = config.banner.tagText?.trim();
                    const tagBgColor = config.banner.tagBgColor || '#ef4444';
                    const tagTextColor = config.banner.tagTextColor || '#ffffff';
                    const isTagAnimated = config.banner.tagAnimated !== false;
                    const hasTagCheck = config.banner.tagWithCheck !== false;

                    const checkIcon = hasTagCheck ? (
                      <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5"></path>
                      </svg>
                    ) : null;

                    const tagElement = tagText ? (
                      <span 
                        style={{ 
                          backgroundColor: tagBgColor, 
                          color: tagTextColor,
                          ...(isTagAnimated ? { animation: 'tagPulse 2s infinite ease-in-out' } : {})
                        }}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] sm:text-[10px] font-extrabold leading-none select-none shrink-0 shadow-xs border border-white/10"
                      >
                        {checkIcon}
                        <span>{tagText}</span>
                      </span>
                    ) : null;

                    return (
                      <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-bold text-gray-400 dark:text-gray-500 mb-3">پیش‌نمایش زنده بنر بالای سایت</p>
                        <div 
                          className={`rounded-2xl shadow-inner border border-white/5 overflow-hidden ${hasGif ? '' : 'py-3.5 px-5'}`}
                          style={{ 
                            backgroundColor: baseColor, 
                            color: config.banner.textColor || '#ffffff',
                            ...((hasGif || !isGradient) ? {} : {
                              backgroundImage,
                              backgroundSize: '200% auto',
                              animation: 'topBannerGradientShift 10s ease infinite',
                            })
                          }}
                        >
                          {hasGif ? (
                            <div className="relative w-full flex justify-center items-center h-11 sm:h-13 overflow-hidden">
                              <img
                                src={config.banner.gifUrl!.trim()}
                                alt="پیش‌نمایش بنر"
                                className="h-full max-w-full object-contain mx-auto"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 flex-wrap min-h-[20px]">
                              {tagElement}
                              <p className="text-xs sm:text-sm text-center font-bold px-1 tracking-wide drop-shadow-xs">
                                {renderFormattedText(config.banner.text.trim(), config.banner.underlineImportant !== false)}
                              </p>
                            </div>
                          )}
                        </div>
                        {!hasGif && isGradient && (
                          <style>{`
                            @keyframes topBannerGradientShift {
                              0% { background-position: 0% 50%; }
                              50% { background-position: 100% 50%; }
                              100% { background-position: 0% 50%; }
                            }
                          `}</style>
                        )}
                        {tagText && isTagAnimated && (
                          <style>{`
                            @keyframes tagPulse {
                              0%, 100% { transform: scale(1); }
                              50% { transform: scale(1.06); }
                            }
                          `}</style>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HEADER LAYOUT & ORDER */}
        {activeTab === 'layout' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Control Sidebar */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 space-y-6">
                <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Settings2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">المان‌ها و گزینه‌های فعال هدر</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">کدام بخش‌ها در هدر اصلی سایت فعال باشند.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'sticky', label: 'منوی چسبان (چسبیدن به بالا)', state: config.sticky ?? true, setter: (val: boolean) => setConfig({ ...config, sticky: val }), desc: 'ثابت ماندن منو در بالای صفحه هنگام اسکرول به پایین' },
                    { id: 'categories', label: 'نمایش منوی دسته‌بندی‌ها', state: config.showCategories, setter: (val: boolean) => setConfig({ ...config, showCategories: val }), desc: 'نمایش لیست کشویی دسته‌بندی محصولات در بالای سایت' },
                    { id: 'shop', label: 'نمایش فروشگاه', state: config.showShop ?? false, setter: (val: boolean) => setConfig({ ...config, showShop: val }), desc: 'نمایش لینک صفحه فروشگاه در هدر سایت' },
                    { id: 'blog', label: 'نمایش وبلاگ', state: config.showBlog ?? true, setter: (val: boolean) => setConfig({ ...config, showBlog: val }), desc: 'نمایش لینک وبلاگ در هدر سایت' },
                    { id: 'about_us', label: 'نمایش درباره ما', state: config.showAboutUs ?? false, setter: (val: boolean) => setConfig({ ...config, showAboutUs: val }), desc: 'نمایش لینک صفحه درباره ما در هدر سایت' },
                    { id: 'contact_us', label: 'نمایش تماس با ما', state: config.showContactUs ?? false, setter: (val: boolean) => setConfig({ ...config, showContactUs: val }), desc: 'نمایش لینک صفحه تماس با ما در هدر سایت' },
                    { id: 'search', label: 'کادر جستجوی کالا', state: config.showSearch, setter: (val: boolean) => setConfig({ ...config, showSearch: val }), desc: 'امکان جستجوی سریع محصولات برای کاربران' },
                    { id: 'cart', label: 'سبد خرید', state: config.showCart, setter: (val: boolean) => setConfig({ ...config, showCart: val }), desc: 'نمایش آیکون سبد خرید و پیش‌فاکتور کوچک' },
                    { id: 'user', label: 'پنل کاربری', state: config.showUser, setter: (val: boolean) => setConfig({ ...config, showUser: val }), desc: 'نمایش وضعیت ورود و پروفایل کاربر در هدر' },
                  ].map((el) => (
                    <div key={el.id} className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-850/10 rounded-xl border border-gray-100 dark:border-gray-800">
                      <div className="space-y-0.5">
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200">{el.label}</span>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{el.desc}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => el.setter(!el.state)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          el.state ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            el.state ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ordering Sidebar */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 space-y-6">
                <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-gray-800 pb-4">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">ترتیب و چیدمان (راست به چپ)</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">آیتم‌ها را با استفاده از دکمه‌ها مرتب کنید.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {config.elementsOrder.map((elementId, index) => {
                    const element = DEFAULT_ELEMENTS.find(e => e.id === elementId);
                    if (!element) return null;
                    
                    let isVisible = true;
                    if (elementId === 'categories') isVisible = config.showCategories;
                    if (elementId === 'search') isVisible = config.showSearch;
                    if (elementId === 'cart') isVisible = config.showCart;
                    if (elementId === 'user') isVisible = config.showUser;
                    if (elementId === 'shop') isVisible = config.showShop ?? false;
                    if (elementId === 'blog') isVisible = config.showBlog ?? true;
                    if (elementId === 'about_us') isVisible = config.showAboutUs ?? false;
                    if (elementId === 'contact_us') isVisible = config.showContactUs ?? false;

                    return (
                      <div 
                        key={elementId} 
                        className={`flex items-center justify-between p-3 border rounded-xl transition-all duration-200 ${
                          isVisible 
                            ? 'bg-gray-50/70 dark:bg-gray-850/20 border-gray-200/80 dark:border-gray-800 text-gray-800 dark:text-gray-200' 
                            : 'bg-gray-50/20 dark:bg-gray-900/10 border-gray-100 dark:border-gray-900/60 text-gray-400 dark:text-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-0.5">
                            <button 
                              onClick={() => moveElementUp(index)} 
                              disabled={index === 0}
                              className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 p-0.5"
                              title="انتقال به راست"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button 
                              onClick={() => moveElementDown(index)} 
                              disabled={index === config.elementsOrder.length - 1}
                              className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 p-0.5"
                              title="انتقال به چپ"
                            >
                              <ChevronDown size={14} />
                            </button>
                          </div>
                          <div>
                            <span className="text-xs font-bold flex items-center gap-1.5">
                              {element.label}
                              {!isVisible && (
                                <span className="text-[9px] bg-gray-100 text-gray-500 dark:bg-gray-850 dark:text-gray-400 px-1.5 py-0.5 rounded-md font-medium">غیرفعال</span>
                              )}
                            </span>
                          </div>
                        </div>
                        <GripVertical className="w-4 h-4 text-gray-400/80" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Visual Workspace Mockup */}
            <div className="lg:col-span-12">
              <div className="bg-slate-900/5 dark:bg-slate-950/20 border border-slate-200/50 dark:border-slate-850 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500">پیش‌نمایش زنده چیدمان هدر دسکتاپ (از راست به چپ)</span>
                </div>
                
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800/80 p-4 shadow-inner flex flex-row-reverse items-center justify-between gap-3 overflow-x-auto min-h-[64px]">
                  {config.elementsOrder.map((elementId) => {
                    const element = DEFAULT_ELEMENTS.find(e => e.id === elementId);
                    if (!element) return null;
                    
                    let isVisible = true;
                    if (elementId === 'categories') isVisible = config.showCategories;
                    if (elementId === 'search') isVisible = config.showSearch;
                    if (elementId === 'cart') isVisible = config.showCart;
                    if (elementId === 'user') isVisible = config.showUser;
                    if (elementId === 'shop') isVisible = config.showShop ?? false;
                    if (elementId === 'blog') isVisible = config.showBlog ?? true;
                    if (elementId === 'about_us') isVisible = config.showAboutUs ?? false;
                    if (elementId === 'contact_us') isVisible = config.showContactUs ?? false;
                    
                    if (!isVisible) return null;

                    return (
                      <div 
                        key={elementId} 
                        className="flex-1 min-w-[110px] max-w-[200px] p-3 rounded-xl bg-indigo-50/30 dark:bg-indigo-950/15 border border-indigo-100/60 dark:border-indigo-900/30 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs"
                      >
                        <span className="text-[11px] font-extrabold text-indigo-700 dark:text-indigo-400">{element.label}</span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          {elementId === 'logo' && '🖼️ تصویر لوگو'}
                          {elementId === 'categories' && '📁 لیست دسته‌بندی'}
                          {elementId === 'menu' && '🔗 لینک منو'}
                          {elementId === 'shop' && '🛍️ لینک فروشگاه'}
                          {elementId === 'blog' && '📝 لینک وبلاگ'}
                          {elementId === 'about_us' && 'ℹ️ لینک درباره ما'}
                          {elementId === 'contact_us' && '📞 لینک تماس با ما'}
                          {elementId === 'search' && '🔍 کادر جستجو'}
                          {elementId === 'cart' && '🛒 آیکون سبد'}
                          {elementId === 'user' && '👤 آیکون کاربر'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: MANUAL MENU ITEMS */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-800 p-6 space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <ListCollapse className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 dark:text-white">منوی ناوبری دستی (لینک‌های سفارشی)</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">لینک‌های دلخواه خود مانند درباره ما، تماس، بلاگ و... را در هدر درج کنید.</p>
                  </div>
                </div>

                {!isAdding && !editingId && (
                  <button
                    onClick={() => {
                      setIsAdding(true);
                      setEditForm({ title: '', url: '/', color: '', icon: '', isActive: true });
                    }}
                    className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 px-3.5 py-2 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن پیوند جدید</span>
                  </button>
                )}
              </div>

              {/* Add/Edit Inline Form */}
              {(isAdding || editingId) && (
                <div className="bg-gray-50/50 dark:bg-gray-850/20 p-5 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 space-y-4 animate-fadeIn">
                  <h3 className="text-xs font-bold text-gray-800 dark:text-gray-250 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-indigo-600 rounded-full" />
                    {isAdding ? 'افزودن منوی جدید' : 'ویرایش پیوند منو'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">عنوان پیوند</label>
                      <input
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500"
                        placeholder="مثال: بلاگ، تماس با ما، تخفیف‌ها"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">آدرس اینترنتی (URL)</label>
                      <input
                        type="text"
                        value={editForm.url}
                        onChange={(e) => setEditForm({ ...editForm, url: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-left font-mono"
                        placeholder="/blog"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">رنگ سفارشی متن (اختیاری)</label>
                      <input
                        type="text"
                        value={editForm.color || ''}
                        onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-left font-mono"
                        placeholder="#ff0000 یا red"
                        dir="ltr"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">آیکون پیوند (اختیاری - آیکون اموجی، لینک یا کد SVG)</label>
                      <textarea
                        value={editForm.icon || ''}
                        onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-left font-mono"
                        placeholder='<svg>...</svg> یا اموجی مثل 🎁'
                        dir="ltr"
                        rows={2}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditForm({ ...editForm, isActive: !editForm.isActive })}
                        className={`relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          editForm.isActive ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            editForm.isActive ? 'translate-x-4.5 rtl:-translate-x-4.5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">وضعیت پیوند منو (فعال باشد)</span>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => {
                          setIsAdding(false);
                          setEditingId(null);
                        }}
                        className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                      >
                        انصراف
                      </button>
                      <button
                        onClick={isAdding ? handleAdd : handleUpdate}
                        disabled={isSaving || !editForm.title || !editForm.url}
                        className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all disabled:opacity-50 text-xs font-bold"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره پیوند'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Items List Table/Grid */}
              {items.length === 0 && !isAdding ? (
                <div className="text-center py-10 border border-dashed border-gray-100 dark:border-gray-800 rounded-2xl text-gray-400 dark:text-gray-500 text-xs font-semibold">
                  هنوز هیچ پیوند دستی به منو اضافه نکرده‌اید.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200/60 dark:border-gray-800 rounded-2xl hover:shadow-2xs hover:border-indigo-200 dark:hover:border-indigo-900/60 transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        {/* Ordering controls */}
                        <div className="flex flex-col gap-0.5">
                          <button 
                            onClick={() => moveUp(index)} 
                            disabled={index === 0}
                            className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 p-0.5"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button 
                            onClick={() => moveDown(index)} 
                            disabled={index === items.length - 1}
                            className="text-gray-400 hover:text-indigo-600 disabled:opacity-20 p-0.5"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </div>

                        <div>
                          <div className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-2">
                            {item.title}
                            {!item.isActive && (
                              <span className="text-[9px] bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-1.5 py-0.5 rounded-md font-medium">غیرفعال</span>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 text-left mt-1 font-mono" dir="ltr">{item.url}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditForm({ 
                              title: item.title, 
                              url: item.url, 
                              color: (item as any).color || '', 
                              icon: (item as any).icon || '', 
                              isActive: item.isActive 
                            });
                            setIsAdding(false);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 rounded-xl transition-all"
                          title="ویرایش"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 rounded-xl transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* AI Confirmation Modal */}
      {showAiConfirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-white">پیش‌نمایش تغییرات هوشمند هدر</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">توضیحات و جزئیات تغییرات پیشنهادی هوش مصنوعی</p>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="bg-purple-500/5 border border-purple-500/10 p-4 rounded-2xl space-y-2">
                <span className="text-[10px] font-black text-purple-700 dark:text-purple-300 block">توضیحات هوش مصنوعی:</span>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                  {aiExplanation}
                </p>
              </div>

              {aiWarnings.length > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl space-y-2">
                  <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 block">هشدارها و نکات:</span>
                  <ul className="list-disc list-inside text-[11px] font-bold text-slate-500 dark:text-slate-400 space-y-1">
                    {aiWarnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5" />
                تغییرات پس از تایید شما در فرم اعمال می‌شوند. برای ذخیره نهایی در دیتابیس باید روی دکمه «ذخیره کل تنظیمات هدر» کلیک کنید.
              </p>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowAiConfirmModal(false);
                  setPendingConfig(null);
                }}
                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-all font-black text-xs cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={() => {
                  if (pendingConfig) {
                    setConfig(pendingConfig);
                    setControlSuccessMessage('تغییرات با موفقیت در فرم اعمال شد. برای ثبت نهایی روی دکمه «ذخیره کل تنظیمات هدر» کلیک کنید.');
                    setPromptInput('');
                    setTimeout(() => setControlSuccessMessage(''), 8000);
                  }
                  setShowAiConfirmModal(false);
                  setPendingConfig(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs transition-all cursor-pointer shadow-sm"
              >
                تایید و اعمال
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}