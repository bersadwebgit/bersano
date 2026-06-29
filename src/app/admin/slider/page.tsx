"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, Image as ImageIcon, Link as LinkIcon, MoveUp, MoveDown, Save, Search, Sparkles, Loader2, AlertTriangle, Check, X, Send } from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import Image from "next/image";

interface Slide {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  title: string | null;
  subtitle: string | null;
  linkUrl: string | null;
  linkText: string | null;
  order: number;
  isActive: boolean;
  displayLocation: string;
}

export default function SliderAdminPage() {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>('all'); // 'all', 'both', 'custom', 'shop'
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentSlide, setCurrentSlide] = useState<Partial<Slide>>({
    imageUrl: "",
    mobileImageUrl: "",
    title: "",
    subtitle: "",
    linkUrl: "",
    linkText: "",
    isActive: true,
    order: 0,
    displayLocation: "both",
  });
  const [showMediaPicker, setShowMediaPicker] = useState<"desktop" | "mobile" | null>(null);

  // AI Assistant States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [proposedActions, setProposedActions] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState("");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [attachedImageUrl, setAttachedImageUrl] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [activeMediaPickerIndex, setActiveMediaPickerIndex] = useState<number | null>(null);
  const [activeMediaPickerField, setActiveMediaPickerField] = useState<"imageUrl" | "mobileImageUrl" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/media', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('خطا در آپلود فایل');
    const data = await res.json();
    return data.url;
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiWarnings([]);
    setProposedActions([]);
    setAiExplanation("");

    try {
      const res = await fetch("/api/admin/slider/ai-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          slides,
          attachedImageUrl
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "خطایی در پردازش هوش مصنوعی رخ داد.");
        return;
      }
      if (data.success) {
        setProposedActions(data.actions || []);
        setAiExplanation(data.explanation || "");
        setAiWarnings(data.warnings || []);
      } else {
        alert(data.explanation || "هوش مصنوعی نتوانست دستور را پردازش کند.");
      }
    } catch (error) {
      console.error(error);
      alert("خطا در ارتباط با سرور.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyProposedActions = async () => {
    setIsLoading(true);
    try {
      for (const action of proposedActions) {
        if (action.type === "create") {
          const res = await fetch("/api/admin/slider", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "خطا در ایجاد اسلاید");
          }
        } else if (action.type === "update") {
          const res = await fetch(`/api/admin/slider/${action.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "خطا در بروزرسانی اسلاید");
          }
        } else if (action.type === "delete") {
          const res = await fetch(`/api/admin/slider/${action.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "خطا در حذف اسلاید");
          }
        }
      }
      setProposedActions([]);
      setAiExplanation("");
      setAiPrompt("");
      setAttachedImageUrl("");
      fetchSlides();
    } catch (error: any) {
      console.error(error);
      alert(error.message || "خطا در اعمال تغییرات هوش مصنوعی.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSlides();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          let customHome = {
            showSlider: false,
            sliderDisplayLocation: 'both',
          };
          if (data.settings.customHomeConfig) {
            try {
              customHome = { ...customHome, ...JSON.parse(data.settings.customHomeConfig) };
            } catch (e) {}
          }
          setSettings(customHome);
        }
      }
    } catch (e) {
      console.error("Failed to fetch settings:", e);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchSlides = async () => {
      try {
        const res = await fetch("/api/admin/slider");
        if (res.status === 401) {
          window.location.href = "/admin/login";
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setSlides(data);
        }
      } catch (error) {
      console.error("Failed to fetch slides:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentSlide.imageUrl) {
      alert("انتخاب تصویر دسکتاپ الزامی است.");
      return;
    }

    try {
      const isUpdate = !!currentSlide.id;
      const url = isUpdate ? `/api/admin/slider/${currentSlide.id}` : "/api/admin/slider";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSlide),
      });

      if (res.ok) {
        setIsEditing(false);
        fetchSlides();
      } else {
        alert("خطا در ذخیره اطلاعات.");
      }
    } catch (error) {
      console.error("Error saving slide:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("آیا از حذف این اسلاید اطمینان دارید؟")) return;

    try {
      const res = await fetch(`/api/admin/slider/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchSlides();
      }
    } catch (error) {
      console.error("Error deleting slide:", error);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (activeMediaPickerIndex !== null && activeMediaPickerField !== null) {
      setProposedActions(prev => {
        const updated = [...prev];
        if (updated[activeMediaPickerIndex]?.data) {
          updated[activeMediaPickerIndex].data[activeMediaPickerField] = url;
        }
        return updated;
      });
      setActiveMediaPickerIndex(null);
      setActiveMediaPickerField(null);
    } else if (showMediaPicker === "desktop") {
      setCurrentSlide({ ...currentSlide, imageUrl: url });
    } else if (showMediaPicker === "mobile") {
      setCurrentSlide({ ...currentSlide, mobileImageUrl: url });
    }
    setShowMediaPicker(null);
  };

  const filteredSlides = slides.filter(slide => {
    const titleText = slide.title || '';
    const matchesSearch = titleText.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = filterLocation === 'all' || slide.displayLocation === filterLocation;
    return matchesSearch && matchesLocation;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      
      {/* نمایش تنظیمات سراسری اسلایدر در بالای صفحه */}
      {!isEditing && settings && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-2">
                <ImageIcon className="w-4.5 h-4.5 text-blue-500" />
                تنظیمات سراسری نمایش اسلایدر در سایت
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                وضعیت کلی نمایش اسلایدر تصاویر در صفحات مختلف فروشگاه شما
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${settings.showSlider ? 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'}`}>
                {settings.showSlider ? 'فعال در سایت' : 'غیرفعال در سایت'}
              </span>
              <a 
                href="/admin/settings/custom-home"
                className="text-xs text-blue-600 hover:underline font-black mr-2"
              >
                تغییر تنظیمات سراسری ←
              </a>
            </div>
          </div>
          
          {settings.showSlider && (
            <div className="text-xs text-gray-500 dark:text-gray-400 font-bold bg-gray-50 dark:bg-gray-950/40 p-3 rounded-xl border border-gray-100 dark:border-gray-850">
              محل نمایش تنظیم شده در پیکربندی: <span className="text-blue-600 font-black">{
                settings.sliderDisplayLocation === 'custom' ? 'فقط لندینگ پیج اختصاصی' :
                settings.sliderDisplayLocation === 'shop' ? 'فقط ویترین فروشگاه' : 'هر دو صفحه (لندینگ و فروشگاه)'
              }</span>
            </div>
          )}
        </div>
      )}

      {/* بخش دستیار هوشمند (AI Assistant) */}
      {!isEditing && (
        <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-xs border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-purple-600 text-white">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white font-black">دستیار هوشمند اسلایدر (کنترل با پرامپت)</h2>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed mt-0.5">
                  با نوشتن دستورهای متنی ساده، اسلایدهای جذاب بسازید، تصاویر را آپلود یا تغییر دهید و اسلایدهای موجود را ویرایش و حذف کنید!
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
            <div className="flex gap-2 flex-col sm:flex-row">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="مثال: یک اسلاید جدید برای آخرین محصول فروشگاه بساز و دکمه خرید بذار..."
                className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAiSubmit();
                  }
                }}
                disabled={isAiLoading}
              />
              
              <div className="flex gap-2 shrink-0">
                {/* دکمه آپلود عکس */}
                <label className="flex h-11 px-4 items-center justify-center gap-2 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-white dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 cursor-pointer shadow-xs transition-all text-xs font-bold">
                  {isUploadingImage ? (
                    <Loader2 size={16} className="animate-spin text-purple-600" />
                  ) : (
                    <ImageIcon size={16} className="text-purple-500" />
                  )}
                  <span>{isUploadingImage ? 'در حال آپلود...' : 'ضمیمه تصویر'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingImage || isAiLoading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingImage(true);
                      try {
                        const url = await uploadFile(file);
                        setAttachedImageUrl(url);
                      } catch (err) {
                        alert('آپلود تصویر ناموفق بود.');
                      } finally {
                        setIsUploadingImage(false);
                      }
                    }}
                  />
                </label>

                <button
                  type="button"
                  disabled={isAiLoading || !aiPrompt.trim()}
                  onClick={handleAiSubmit}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50"
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
            </div>

            {attachedImageUrl && (
              <div className="p-2 bg-white dark:bg-gray-900 border border-purple-100 dark:border-purple-900/30 rounded-xl flex items-center gap-3 w-max animate-in fade-in">
                <div className="relative w-12 h-8 rounded overflow-hidden border border-purple-200 dark:border-purple-800">
                  <Image src={attachedImageUrl} alt="attached" fill className="object-cover" />
                </div>
                <span className="text-[10px] text-gray-500 font-bold">تصویر ضمیمه شده برای اسلایدر</span>
                <button
                  type="button"
                  onClick={() => setAttachedImageUrl('')}
                  className="text-rose-500 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Suggestions / Prompt Templates */}
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold self-center ml-1">پیشنهادها:</span>
              {[
                { text: 'یک اسلاید جدید برای آخرین محصول فروشگاه بساز', label: 'اسلاید برای آخرین محصول' },
                { text: 'یک اسلاید تبریک جشنواره تابستانه با تصویر مرتبط بساز', label: 'اسلاید جشنواره تابستانه' },
                { text: 'تمام اسلایدهای غیرفعال را حذف کن', label: 'حذف اسلایدهای غیرفعال' }
              ].map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiPrompt(sug.text)}
                  className="text-[9px] bg-white hover:bg-purple-100 dark:bg-gray-900 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
                >
                  {sug.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* نمایش پیشنهادات هوش مصنوعی (AI Proposed Actions) */}
      {proposedActions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl dark:bg-emerald-500/20 dark:text-emerald-400">
                <Check size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">اقدامات پیشنهادی هوش مصنوعی</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">لطفاً تغییرات پیشنهادی زیر را بررسی، در صورت نیاز ویرایش و سپس ثبت نهایی کنید.</p>
              </div>
            </div>
            <button 
              onClick={() => { setProposedActions([]); setAiExplanation(''); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
              title="انصراف"
            >
              <X size={20} />
            </button>
          </div>

          {/* توضیحات هوش مصنوعی */}
          {aiExplanation && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
              💡 {aiExplanation}
            </div>
          )}

          {/* هشدارهای هوش مصنوعی */}
          {aiWarnings.length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl text-sm text-amber-800 dark:text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>هشدارهای منطقی:</span>
              </div>
              {aiWarnings.map((w, idx) => (
                <p key={idx} className="text-xs pr-6">• {w}</p>
              ))}
            </div>
          )}

          {/* لیست کارت‌های تغییرات پیشنهادی */}
          <div className="space-y-6">
            {proposedActions.map((action, index) => (
              <div key={index} className="bg-gray-50 dark:bg-slate-950 p-5 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col lg:flex-row gap-6 relative group">
                <button 
                  onClick={() => setProposedActions(prev => prev.filter((_, i) => i !== index))}
                  className="absolute top-4 left-4 text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  title="حذف این مورد"
                >
                  <Trash2 size={16} />
                </button>

                {/* پیش‌نمایش اسلاید دسکتاپ */}
                <div className="w-full lg:w-64 shrink-0 flex flex-col items-center">
                  <span className="text-xs font-bold text-gray-400 mb-2">پیش‌نمایش اسلاید</span>
                  <div className="w-56 h-32 rounded-2xl overflow-hidden relative bg-slate-900 shadow-md border border-gray-300 dark:border-gray-800 flex flex-col justify-end p-4">
                    {/* تصویر پس‌زمینه */}
                    {action.data?.imageUrl ? (
                      <div className="absolute inset-0">
                        <Image src={action.data.imageUrl} alt="Media" fill className="object-cover opacity-80" />
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-gray-500 text-xs">فاقد رسانه</div>
                    )}

                    {/* متن و دکمه روی اسلاید */}
                    <div className="relative z-10 space-y-1">
                      {action.data?.title && (
                        <h4 className="text-white text-xs font-black drop-shadow-md truncate">{action.data.title}</h4>
                      )}
                      {action.data?.subtitle && (
                        <p className="text-white/80 text-[9px] font-bold drop-shadow-md truncate">{action.data.subtitle}</p>
                      )}
                      {action.data?.linkUrl && (
                        <div className="bg-blue-600 text-white text-[8px] font-extrabold px-2 py-1 rounded-lg w-max shadow-md truncate">
                          {action.data.linkText || 'مشاهده'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* فرم ویرایش تغییر پیشنهادی */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      action.type === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                      action.type === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                      'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                    }`}>
                      {action.type === 'create' ? 'ایجاد جدید' : action.type === 'update' ? 'ویرایش موجود' : 'حذف اسلاید'}
                    </span>
                  </div>

                  {action.type !== 'delete' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">عنوان اسلاید</label>
                        <input 
                          type="text" 
                          value={action.data?.title || ''}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.title = e.target.value;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">زیرعنوان اسلاید</label>
                        <input 
                          type="text" 
                          value={action.data?.subtitle || ''}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.subtitle = e.target.value;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">لینک (URL)</label>
                        <input 
                          type="text" 
                          value={action.data?.linkUrl || ''}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.linkUrl = e.target.value;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">متن دکمه</label>
                        <input 
                          type="text" 
                          value={action.data?.linkText || ''}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.linkText = e.target.value;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">تصویر دسکتاپ (URL)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={action.data?.imageUrl || ''}
                            onChange={e => {
                              setProposedActions(prev => {
                                const updated = [...prev];
                                updated[index].data.imageUrl = e.target.value;
                                return updated;
                              });
                            }}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMediaPickerIndex(index);
                              setActiveMediaPickerField("imageUrl");
                              setShowMediaPicker("desktop");
                            }}
                            className="px-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-xl text-xs font-bold"
                          >
                            انتخاب
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">تصویر موبایل (URL - اختیاری)</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            value={action.data?.mobileImageUrl || ''}
                            onChange={e => {
                              setProposedActions(prev => {
                                const updated = [...prev];
                                updated[index].data.mobileImageUrl = e.target.value;
                                return updated;
                              });
                            }}
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                            dir="ltr"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMediaPickerIndex(index);
                              setActiveMediaPickerField("mobileImageUrl");
                              setShowMediaPicker("mobile");
                            }}
                            className="px-3 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 rounded-xl text-xs font-bold"
                          >
                            انتخاب
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">محل نمایش</label>
                        <select
                          value={action.data?.displayLocation || "both"}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.displayLocation = e.target.value;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs font-bold cursor-pointer"
                        >
                          <option value="both">هر دو صفحه (لندینگ و فروشگاه)</option>
                          <option value="custom">فقط در لندینگ پیج اختصاصی (Landing)</option>
                          <option value="shop">فقط در ویترین فروشگاه (Shop)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-4 pt-5">
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id={`isActive-${index}`}
                            checked={action.data?.isActive ?? true}
                            onChange={e => {
                              setProposedActions(prev => {
                                const updated = [...prev];
                                updated[index].data.isActive = e.target.checked;
                                return updated;
                              });
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <label htmlFor={`isActive-${index}`} className="text-xs font-bold text-gray-600 dark:text-gray-300 select-none">
                            فعال (نمایش در سایت)
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* دکمه‌های تایید نهایی */}
          <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-4">
            <button
              onClick={() => { setProposedActions([]); setAiExplanation(''); }}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-xs font-bold"
            >
              انصراف
            </button>
            <button
              onClick={handleApplyProposedActions}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl transition-colors text-xs font-bold"
            >
              <Check size={16} />
              <span>تایید و اعمال تغییرات هوش مصنوعی</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مدیریت اسلایدر اصلی</h1>
        {!isEditing && (
          <button
            onClick={() => {
              setCurrentSlide({
                imageUrl: "",
                mobileImageUrl: "",
                title: "",
                subtitle: "",
                linkUrl: "",
                linkText: "",
                isActive: true,
                order: slides.length,
                displayLocation: "both",
              });
              setIsEditing(true);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors"
          >
            <Plus size={20} />
            <span>اسلاید جدید</span>
          </button>
        )}
      </div>

      {/* بخش فیلتر و جستجو برای اسلایدر */}
      {!isEditing && (
        <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between text-xs font-bold">
          <div className="relative w-full md:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="جستجو در عنوان اسلاید..."
              className="w-full pr-9 pl-4 py-2 border border-gray-200 dark:border-gray-800 dark:bg-slate-950 rounded-xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-gray-400 shrink-0">فیلتر محل نمایش:</span>
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-full md:w-auto">
              {[
                { value: 'all', label: 'همه' },
                { value: 'both', label: 'هر دو صفحه' },
                { value: 'custom', label: 'فقط لندینگ' },
                { value: 'shop', label: 'فقط فروشگاه' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilterLocation(opt.value)}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    filterLocation === opt.value
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEditing ? (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
          <h2 className="text-lg font-bold mb-4">{currentSlide.id ? "ویرایش اسلاید" : "افزودن اسلاید جدید"}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Desktop Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تصویر دسکتاپ (الزامی)
              </label>
              <div 
                onClick={() => setShowMediaPicker("desktop")}
                className="aspect-[21/9] bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative overflow-hidden"
              >
                {currentSlide.imageUrl ? (
                  <Image src={currentSlide.imageUrl} alt="Desktop" fill className="object-cover" />
                ) : (
                  <>
                    <ImageIcon size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">انتخاب تصویر</span>
                  </>
                )}
              </div>
            </div>

            {/* Mobile Image */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                تصویر موبایل (اختیاری)
              </label>
              <div 
                onClick={() => setShowMediaPicker("mobile")}
                className="aspect-[4/3] max-w-[200px] mx-auto bg-gray-100 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors relative overflow-hidden"
              >
                {currentSlide.mobileImageUrl ? (
                  <Image src={currentSlide.mobileImageUrl} alt="Mobile" fill className="object-cover" />
                ) : (
                  <>
                    <ImageIcon size={32} className="text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">انتخاب تصویر</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">عنوان</label>
              <input
                type="text"
                value={currentSlide.title || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, title: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="مثال: تخفیف‌های تابستانه"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">زیرعنوان</label>
              <input
                type="text"
                value={currentSlide.subtitle || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, subtitle: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="توضیحات کوتاه..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">لینک (URL)</label>
              <input
                type="text"
                value={currentSlide.linkUrl || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, linkUrl: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left"
                dir="ltr"
                placeholder="/products/sale"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">متن دکمه</label>
              <input
                type="text"
                value={currentSlide.linkText || ""}
                onChange={(e) => setCurrentSlide({ ...currentSlide, linkText: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                placeholder="مشاهده محصولات"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">محل نمایش این اسلاید</label>
              <select
                value={currentSlide.displayLocation || "both"}
                onChange={(e) => setCurrentSlide({ ...currentSlide, displayLocation: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-sm cursor-pointer"
              >
                <option value="both">هر دو صفحه (لندینگ و فروشگاه)</option>
                <option value="custom">فقط در لندینگ پیج اختصاصی (Landing)</option>
                <option value="shop">فقط در ویترین فروشگاه (Shop)</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-4">
              <input
                type="checkbox"
                id="isActive"
                checked={currentSlide.isActive}
                onChange={(e) => setCurrentSlide({ ...currentSlide, isActive: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                فعال (نمایش در سایت)
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              انصراف
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl transition-colors"
            >
              <Save size={20} />
              <span>ذخیره اسلاید</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>
          ) : filteredSlides.length === 0 ? (
            <div className="p-12 text-center text-gray-500 flex flex-col items-center">
              <ImageIcon size={48} className="mb-4 opacity-20" />
              <p>هیچ اسلایدی با فیلترهای فعلی یافت نشد.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredSlides.map((slide, index) => (
                <div key={slide.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="relative w-32 aspect-[21/9] rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    <Image src={slide.imageUrl} alt={slide.title || "Slide"} fill className="object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">
                      {slide.title || "بدون عنوان"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mt-1">
                      {slide.linkUrl && (
                        <span className="flex items-center gap-1">
                          <LinkIcon size={14} />
                          <span className="truncate max-w-[150px]" dir="ltr">{slide.linkUrl}</span>
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-xs ${slide.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {slide.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        محل نمایش: {
                          slide.displayLocation === 'custom' ? 'فقط لندینگ پیج' :
                          slide.displayLocation === 'shop' ? 'فقط ویترین فروشگاه' : 'هر دو صفحه'
                        }
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentSlide(slide);
                        setIsEditing(true);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="ویرایش"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(slide.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="حذف"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showMediaPicker && (
        <MediaPicker
          accepts="image/*"
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(null)}
        />
      )}
    </div>
  );
}
