// [HARDENED] — validation, error isolation, save safety
"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Image as ImageIcon, 
  Save, 
  X, 
  Sparkles, 
  Eye, 
  MousePointer, 
  ShoppingBag, 
  ArrowRight,
  Loader2,
  Check,
  AlertTriangle,
  AlertCircle
} from "lucide-react";
import MediaPicker from "@/components/MediaPicker";
import Image from "next/image";

interface Product {
  id: string;
  title: string;
  price: number;
  discount: number;
  imageUrl: string | null;
  stock: number;
}

interface ProductSetItem {
  id?: string;
  productId: string;
  x: number;
  y: number;
  product?: Product;
}

interface ProductSet {
  id: string;
  name: string;
  slug: string;
  imageUrl: string;
  isActive: boolean;
  order: number;
  views: number;
  tagClicks: number;
  addToCarts: number;
  discount: number;
  items: ProductSetItem[];
}

export default function ShoppableImagesAdminPage() {
  // Global settings toggle
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [isUpdatingGlobal, setIsUpdatingGlobal] = useState(false);

  // Shoppable management state
  const [sets, setSets] = useState<ProductSet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Form states
  const [currentSet, setCurrentSlide] = useState<Partial<ProductSet>>({
    name: "",
    slug: "",
    imageUrl: "",
    isActive: true,
    order: 0,
    discount: 0,
    items: [],
  });

  // Hotspot interaction states
  const [selectedProductForPoint, setSelectedProductForProduct] = useState<string>("");
  const [tempPoint, setTempPoint] = useState<{ x: number; y: number } | null>(null);
  const [searchProductQuery, setSearchProductQuery] = useState("");

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [proposedActions, setProposedActions] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string>("");
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [activeProposedIndex, setActiveProposedIndex] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  async function fetchInitialData() {
    setIsLoading(true);
    try {
      // 1. Fetch Global Settings
      const settingsRes = await fetch("/api/settings");
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setGlobalEnabled(settingsData.settings?.productSetsEnabled ?? true);
      }

      // 2. Fetch Shoppable Images
      const setsRes = await fetch("/api/admin/shoppable");
      if (setsRes.ok) {
        const setsData = await setsRes.json();
        setSets(setsData);
      }

      // 3. Fetch Products List
      const productsRes = await fetch("/api/admin/products");
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData.products || []);
      }
    } catch (error) {
      console.error("[ERROR] [ShoppableAdmin]: Error fetching admin data", error);
    } finally {
      setIsLoading(false);
    }
  }

  const handleToggleGlobal = async () => {
    setIsUpdatingGlobal(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productSetsEnabled: !globalEnabled }),
      });
      if (res.ok) {
        setGlobalEnabled(!globalEnabled);
      } else {
        alert("خطا در به روزرسانی تنظیمات عمومی.");
      }
    } catch (error) {
      console.error("[ERROR] [ShoppableAdmin]: Error saving global toggle", error);
    } finally {
      setIsUpdatingGlobal(false);
    }
  };

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setTempPoint({ x, y });
    setSelectedProductForProduct("");
    setSearchProductQuery("");
  };

  const handleAddHotspot = () => {
    if (!tempPoint || !selectedProductForPoint) return;
    
    const selectedProd = products.find(p => p.id === selectedProductForPoint);
    const newItem: ProductSetItem = {
      productId: selectedProductForPoint,
      x: parseFloat(tempPoint.x.toFixed(2)),
      y: parseFloat(tempPoint.y.toFixed(2)),
      product: selectedProd,
    };

    setCurrentSlide({
      ...currentSet,
      items: [...(currentSet.items || []), newItem],
    });

    setTempPoint(null);
    setSelectedProductForProduct("");
  };

  const handleRemoveHotspot = (index: number) => {
    const updatedItems = [...(currentSet.items || [])];
    updatedItems.splice(index, 1);
    setCurrentSlide({
      ...currentSet,
      items: updatedItems,
    });
  };

  const handleSaveSet = async () => {
    if (!currentSet.name?.trim()) {
      alert("عنوان پکیج فروش الزامی است.");
      return;
    }
    if (!currentSet.slug?.trim()) {
      alert("آدرس ساده (Slug) الزامی است.");
      return;
    }
    if (!currentSet.imageUrl) {
      alert("آپلود یا انتخاب عکس اصلی الزامی است.");
      return;
    }
    if (!currentSet.items || currentSet.items.length === 0) {
      alert("لطفاً حداقل یک محصول را روی عکس برچسب‌گذاری (Tag) کنید.");
      return;
    }

    try {
      const isUpdate = !!currentSet.id;
      const url = isUpdate ? `/api/admin/shoppable/${currentSet.id}` : "/api/admin/shoppable";
      const method = isUpdate ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentSet),
      });

      const data = await res.json();
      if (res.ok) {
        setIsEditing(false);
        fetchInitialData();
      } else {
        alert(data.error || "خطا در ذخیره اطلاعات پکیج فروش.");
      }
    } catch (error) {
      console.error("[ERROR] [ShoppableAdmin]: Error saving image", error);
      alert("خطای سیستمی رخ داد.");
    }
  };

  const handleDeleteSet = async (id: string) => {
    if (!confirm("آیا از حذف این پکیج فروش تعاملی اطمینان دارید؟")) return;

    try {
      const res = await fetch(`/api/admin/shoppable/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchInitialData();
      } else {
        alert("خطا در حذف پکیج فروش.");
      }
    } catch (error) {
      console.error("[ERROR] [ShoppableAdmin]: Error deleting image", error);
    }
  };

  const handleMediaSelect = (url: string) => {
    if (activeProposedIndex !== null) {
      setProposedActions(prev => {
        const updated = [...prev];
        updated[activeProposedIndex].data.imageUrl = url;
        return updated;
      });
      setActiveProposedIndex(null);
    } else {
      setCurrentSlide({ ...currentSet, imageUrl: url });
    }
    setShowMediaPicker(false);
  };

  // AI Assistant Handlers
  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiWarnings([]);
    setProposedActions([]);
    setAiExplanation("");

    try {
      const res = await fetch("/api/admin/shoppable/ai-control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt,
          sets
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
    if (isLoading) return;
    setIsLoading(true);
    setSaveStatus('saving');
    setSaveError('');
    try {
      for (const action of proposedActions) {
        if (action.type === "create") {
          const res = await fetch("/api/admin/shoppable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(action.data),
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "خطا در ایجاد پکیج فروش تعاملی");
          }
        } else if (action.type === "update") {
          const originalSet = sets.find((s) => s.id === action.id);
          if (!originalSet) continue;

          // Merge fields to make sure all required fields are present
          const mergedData = {
            name: action.data.name !== undefined ? action.data.name : originalSet.name,
            slug: action.data.slug !== undefined ? action.data.slug : originalSet.slug,
            imageUrl: action.data.imageUrl !== undefined ? action.data.imageUrl : originalSet.imageUrl,
            isActive: action.data.isActive !== undefined ? action.data.isActive : originalSet.isActive,
            order: action.data.order !== undefined ? Number(action.data.order) : originalSet.order,
            discount: action.data.discount !== undefined ? Number(action.data.discount) : originalSet.discount,
            items: action.data.items !== undefined ? action.data.items.map((item: any) => ({
              productId: item.productId,
              x: item.x,
              y: item.y
            })) : originalSet.items.map((item: any) => ({
              productId: item.productId,
              x: item.x,
              y: item.y
            })),
          };

          const res = await fetch(`/api/admin/shoppable/${action.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(mergedData),
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "خطا در ویرایش پکیج فروش تعاملی");
          }
        } else if (action.type === "delete") {
          const res = await fetch(`/api/admin/shoppable/${action.id}`, {
            method: "DELETE",
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "خطا در حذف پکیج فروش تعاملی");
          }
        }
      }
      setProposedActions([]);
      setAiExplanation("");
      setAiPrompt("");
      setSaveStatus('saved');
      fetchInitialData();
      setTimeout(() => setSaveStatus('idle'), 5000);
      alert("تغییرات با موفقیت اعمال و ذخیره شدند.");
    } catch (error: any) {
      console.error("Failed to apply actions:", error);
      setSaveStatus('error');
      setSaveError(error.message || "برخی از تغییرات ممکن است به درستی ذخیره نشده باشند.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleSetStatus = async (set: ProductSet) => {
    try {
      const res = await fetch(`/api/admin/shoppable/${set.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...set,
          isActive: !set.isActive,
          items: set.items.map(item => ({
            productId: item.productId,
            x: item.x,
            y: item.y
          }))
        }),
      });
      if (res.ok) {
        fetchInitialData();
      }
    } catch (error) {
      console.error("[ERROR] [ShoppableAdmin]: Error toggling image active status", error);
    }
  };

  const filteredProductsToSelect = products.filter(p => 
    p.title.toLowerCase().includes(searchProductQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <span className="text-sm font-bold text-gray-500">در حال بارگذاری اطلاعات پنل...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 font-vazir rtl" style={{ direction: "rtl" }}>
      
      {/* Global Module Toggle Banner */}
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <div className="group relative">
            <h2 className="text-base font-bold text-gray-900 dark:text-white cursor-help flex items-center gap-1.5">
              قابلیت پکیج‌های فروش تعاملی (Interactive Shoppable Image)
              <span className="text-[10px] font-normal text-blue-600 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 rounded">راهنما</span>
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              مدیران می‌توانند روی عکس‌ها برچسب اضافه کنند تا خریداران در صفحه اول یا صفحات مستقل، سریعاً محصولات تصویر مربوطه را مستقیم به سبد خرید اضافه کنند.
            </p>
            
            {/* Hover Tooltip/Guide */}
            <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 leading-relaxed border border-slate-800">
              <p className="font-bold mb-1 text-blue-400">راهنمای پکیج‌های فروش تعاملی:</p>
              <p className="mb-2">با فعال‌سازی این ماژول، می‌توانید تصاویر جذاب و ژورنالی از محصولات خود آپلود کرده و روی بخش‌های مختلف عکس برچسب خرید بگذارید.</p>
              <p>مشتری با کلیک روی هر برچسب، قیمت و مشخصات محصول را دیده و بدون خروج از صفحه می‌تواند آن را به سبد خرید خود اضافه کند.</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-xs font-bold text-gray-600 dark:text-gray-400">وضعیت کل ماژول:</span>
          <button
            onClick={handleToggleGlobal}
            disabled={isUpdatingGlobal}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              globalEnabled ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-800"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                globalEnabled ? "-translate-x-6" : "-translate-x-1"
              }`}
            />
          </button>
          <span className={`text-xs font-black ${globalEnabled ? "text-emerald-600" : "text-gray-400"}`}>
            {globalEnabled ? "فعال" : "غیرفعال"}
          </span>
        </div>
      </div>

      {!isEditing && (
        <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800 dark:text-white">دستیار هوشمند پکیج‌های فروش تعاملی (کنترل با پرامپت)</h2>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed mt-0.5">
                با نوشتن دستورهای متنی ساده، پکیج‌های تصویری جدید بسازید، محصولات را به آنها اضافه و تگ کنید یا پکیج‌های موجود را ویرایش و حذف کنید!
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="مثال: یک پکیج جدید به اسم 'مبلمان بهاره' بساز و مبل چرمی و میز جلو مبلی را روی آن تگ کن..."
                className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
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
            <div className="flex flex-wrap gap-1.5 pt-1.5">
              <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold self-center ml-1">پیشنهادها:</span>
              {[
                { text: 'یک پکیج فروش تعاملی جدید به اسم ست پذیرایی با تگ کردن میز چوبی بساز', label: 'ساخت پکیج با تگ مبل' },
                { text: 'میزان تخفیف پکیج ست مبلمان راحتی را به ۱۵ درصد تغییر بده', label: 'تغییر تخفیف پکیج موجود' },
                { text: 'پکیج دکوراسیون کلاسیک را غیرفعال کن', label: 'غیرفعال‌سازی یک پکیج' }
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
      {!isEditing && proposedActions.length > 0 && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-sm space-y-6 mb-8 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl dark:bg-emerald-500/20 dark:text-emerald-400">
                <Check size={20} />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">اقدامات پیشنهادی دستیار هوشمند</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">لطفاً پکیج‌های پیشنهادی زیر را بررسی، تگ‌ها را تنظیم یا جابجا کنید و سپس تایید نهایی نمایید.</p>
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
                <span>هشدارهای هوش مصنوعی:</span>
              </div>
              {aiWarnings.map((w, idx) => (
                <p key={idx} className="text-xs pr-6">• {w}</p>
              ))}
            </div>
          )}

          {/* لیست کارت‌های تغییرات پیشنهادی پکیج تصویری */}
          <div className="space-y-6">
            {proposedActions.map((action, index) => {
              if (action.type === 'delete') {
                const originalSet = sets.find(s => s.id === action.id);
                return (
                  <div key={index} className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl border border-red-200 dark:border-red-900/30 flex justify-between items-center relative group">
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                        حذف پکیج فروش
                      </span>
                      <span className="text-sm font-bold text-gray-800 dark:text-white">
                        حذف پکیج «{originalSet?.name || 'نامشخص'}»
                      </span>
                    </div>
                    <button 
                      onClick={() => setProposedActions(prev => prev.filter((_, i) => i !== index))}
                      className="text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="حذف این مورد"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              }

              return (
                <div key={index} className="bg-gray-50 dark:bg-slate-950 p-5 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col lg:flex-row gap-6 relative group text-right">
                  <button 
                    onClick={() => setProposedActions(prev => prev.filter((_, i) => i !== index))}
                    className="absolute top-4 left-4 text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors z-30"
                    title="حذف این مورد"
                  >
                    <Trash2 size={16} />
                  </button>

                  {/* پیش‌نمایش تعاملی عکس با نقاط برچسب روی عکس */}
                  <div className="w-full lg:w-72 shrink-0 flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-400 mb-2">پیش‌نمایش (جهت جابجایی یا ثبت تگ روی عکس کلیک کنید)</span>
                    {action.data?.imageUrl ? (
                      <div className="relative border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-950 w-60 aspect-[3/4] shadow-md select-none">
                        <div 
                          className="relative w-full h-full cursor-crosshair"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = parseFloat((((e.clientX - rect.left) / rect.width) * 100).toFixed(2));
                            const y = parseFloat((((e.clientY - rect.top) / rect.height) * 100).toFixed(2));
                            setTempPoint({ x, y });
                            setSelectedProductForProduct("");
                            setSearchProductQuery("");
                            setActiveProposedIndex(index);
                          }}
                        >
                          <Image 
                            src={action.data.imageUrl} 
                            alt="Proposed Image Set" 
                            fill 
                            className="object-cover pointer-events-none"
                            unoptimized
                          />

                          {/* نقاط تگ شده */}
                          {(action.data.items || []).map((item: any, itemIdx: number) => {
                            const prod = products.find(p => p.id === item.productId);
                            return (
                              <div
                                key={itemIdx}
                                className="absolute group/tag"
                                style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
                              >
                                <div className="relative">
                                  <span className="absolute inline-flex h-6 w-6 rounded-full bg-blue-400 animate-ping opacity-60"></span>
                                  <div className="relative z-10 w-6 h-6 rounded-full bg-blue-600 border border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                                    {itemIdx + 1}
                                  </div>
                                  <div className="absolute bottom-7 left-1/2 -translate-x-1/2 hidden group-hover/tag:block bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg whitespace-nowrap shadow-xl z-20 pointer-events-none">
                                    {prod?.title || "محصول متصل"}
                                  </div>
                                </div>
                              </div>
                            );
                          })}

                          {/* نقطه کلیک موقت روی این بوم */}
                          {tempPoint && activeProposedIndex === index && (
                            <div
                              className="absolute z-20"
                              style={{ left: `${tempPoint.x}%`, top: `${tempPoint.y}%`, transform: "translate(-50%, -50%)" }}
                            >
                              <span className="absolute inline-flex h-8 w-8 rounded-full bg-amber-400 animate-ping opacity-75"></span>
                              <div className="relative w-6 h-6 rounded-full bg-amber-500 border border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                                ؟
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="w-60 aspect-[3/4] rounded-2xl bg-slate-800 flex items-center justify-center text-gray-500 text-xs">بدون عکس پس‌زمینه</div>
                    )}
                  </div>

                  {/* فرم ویرایش پکیج فروش تعاملی پیشنهادی */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        action.type === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400'
                      }`}>
                        {action.type === 'create' ? 'ساخت پکیج جدید' : 'ویرایش پکیج'}
                      </span>
                      {action.type === 'update' && (
                        <span className="text-xs text-gray-500">
                          مورد ویرایشی: <strong className="text-gray-700 dark:text-gray-200">{sets.find(s => s.id === action.id)?.name}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">عنوان پکیج فروش</label>
                        <input 
                          type="text" 
                          value={action.data?.name || ''}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.name = e.target.value;
                              if (action.type === 'create') {
                                updated[index].data.slug = e.target.value.trim().replace(/\s+/g, "-");
                              }
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">آدرس ساده (Slug)</label>
                        <input 
                          type="text" 
                          value={action.data?.slug || ''}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.slug = e.target.value;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left ltr" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">درصد تخفیف کل پکیج</label>
                        <input 
                          type="number" 
                          value={action.data?.discount || 0}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.discount = parseFloat(e.target.value) || 0;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">ترتیب نمایش</label>
                        <input 
                          type="number" 
                          value={action.data?.order || 0}
                          onChange={e => {
                            setProposedActions(prev => {
                              const updated = [...prev];
                              updated[index].data.order = parseInt(e.target.value) || 0;
                              return updated;
                            });
                          }}
                          className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                          dir="ltr"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">آدرس عکس اصلی</label>
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
                            className="flex-1 p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left ltr" 
                          />
                          <button 
                            type="button"
                            onClick={() => {
                              setActiveProposedIndex(index);
                              setShowMediaPicker(true);
                            }}
                            className="px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center text-xs font-bold"
                          >
                            گالری
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* بخش افزودن تگ جدید روی عکس */}
                    {tempPoint && activeProposedIndex === index && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl space-y-2">
                        <div className="flex justify-between items-center text-xs font-bold text-amber-800">
                          <span>تگ کردن محصول روی عکس</span>
                          <button onClick={() => setTempPoint(null)} className="text-amber-800">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <input 
                            type="text"
                            placeholder="جستجوی محصول..."
                            value={searchProductQuery}
                            onChange={e => setSearchProductQuery(e.target.value)}
                            className="p-2 border border-gray-200 dark:border-gray-850 rounded-lg text-xs"
                          />
                          <select 
                            value={selectedProductForPoint}
                            onChange={e => setSelectedProductForProduct(e.target.value)}
                            className="p-2 border border-gray-200 dark:border-gray-850 rounded-lg text-xs"
                          >
                            <option value="">-- انتخاب محصول --</option>
                            {products.filter(p => p.title.toLowerCase().includes(searchProductQuery.toLowerCase())).map(p => (
                              <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => setTempPoint(null)}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                          >
                            انصراف
                          </button>
                          <button 
                            disabled={!selectedProductForPoint}
                            onClick={() => {
                              if (tempPoint) {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  const items = updated[index].data.items || [];
                                  items.push({
                                    productId: selectedProductForPoint,
                                    x: parseFloat(tempPoint.x.toFixed(2)),
                                    y: parseFloat(tempPoint.y.toFixed(2))
                                  });
                                  updated[index].data.items = items;
                                  return updated;
                                });
                                setTempPoint(null);
                                setSelectedProductForProduct("");
                              }
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold"
                          >
                            ثبت تگ محصول
                          </button>
                        </div>
                      </div>
                    )}

                    {/* لیست تگ‌ها در قالب پیشنهادی */}
                    <div className="border-t border-gray-200 dark:border-gray-800 pt-3 mt-3">
                      <span className="text-[10px] font-black text-gray-500 block mb-2">
                        آیتم‌های برچسب‌گذاری شده روی این عکس ({action.data.items?.length || 0} مورد):
                      </span>
                      
                      {(!action.data.items || action.data.items.length === 0) ? (
                        <p className="text-xs text-gray-400 py-1">هیچ محصولی تگ نشده است. روی نقاط مختلف عکس سمت چپ کلیک کنید تا متصل شوند.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {action.data.items.map((item: any, itemIdx: number) => {
                            const prod = products.find(p => p.id === item.productId);
                            return (
                              <div key={itemIdx} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
                                <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-bold">
                                  {itemIdx + 1}
                                </span>
                                <span className="font-bold truncate max-w-28 text-[11px] text-gray-900 dark:text-white">
                                  {prod?.title || "محصول نامشخص"}
                                </span>
                                <button
                                  onClick={() => {
                                    setProposedActions(prev => {
                                      const updated = [...prev];
                                      updated[index].data.items = updated[index].data.items.filter((_: any, i: number) => i !== itemIdx);
                                      return updated;
                                    });
                                  }}
                                  className="text-gray-400 hover:text-red-500"
                                  title="حذف تگ"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* خطا در ذخیره‌سازی تغییرات */}
          {saveStatus === 'error' && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-500 dark:text-rose-400 p-4 rounded-2xl mb-4 font-black text-xs text-right flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{saveError || 'خطایی در ثبت نهایی تغییرات رخ داد.'}</span>
            </div>
          )}

          {/* دکمه‌های ثبت نهایی تغییرات هوش مصنوعی */}
          <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-5 text-right">
            <button 
              onClick={() => { setProposedActions([]); setAiExplanation(''); setSaveStatus('idle'); setSaveError(''); }}
              disabled={isLoading}
              className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
            >
              انصراف و حذف پیشنهادات
            </button>
            <button 
              onClick={handleApplyProposedActions}
              disabled={isLoading}
              data-testid="save-status"
              data-status-state={saveStatus}
              className="px-8 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-bold text-sm shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Check size={18} />
              {isLoading ? 'در حال اعمال تغییرات...' : 'ثبت و اعمال نهایی تغییرات'}
            </button>
          </div>
        </div>
      )}

      {!isEditing && proposedActions.length === 0 && (
        <>
          {/* List Mode */}
          <div className="flex justify-between items-center mb-6">
            <div className="group relative">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white cursor-help flex items-center gap-1.5">
                پکیج‌های فروش تعاملی
                <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">راهنما</span>
              </h1>
              <p className="text-xs text-gray-500 mt-1">لیست کل پکیج‌های فروش تعاملی تعریف‌شده در فروشگاه</p>
              
              {/* Hover Tooltip/Guide */}
              <div className="absolute right-0 top-full mt-2 w-80 p-4 bg-slate-900 text-white text-xs rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 leading-relaxed border border-slate-800">
                <p className="font-bold mb-1 text-blue-400">پکیج‌های فروش (تصاویر خریدنی تعاملی) چیست؟</p>
                <p>در این بخش می‌توانید روی یک تصویر (مانند ست لباس، دکوراسیون یا پکیج محصولات) نقاط کلیک‌شدنی (Hotspot) تعریف کرده و هر نقطه را به یک محصول متصل کنید تا خریداران بتوانند با کلیک روی تصویر، محصولات را مستقیماً مشاهده و خریداری نمایند.</p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentSlide({
                  name: "",
                  slug: "",
                  imageUrl: "",
                  isActive: true,
                  order: 0,
                  discount: 0,
                  items: [],
                });
                setIsEditing(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
            >
              <Plus className="w-4 h-4" />
              ایجاد پکیج فروش جدید
            </button>
          </div>

          {sets.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-850 p-12 rounded-2xl text-center shadow-sm">
              <ImageIcon className="w-12 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
              <p className="text-sm font-bold text-gray-600 dark:text-gray-400">تاکنون هیچ پکیج فروش تعاملی ایجاد نکرده‌اید.</p>
              <p className="text-xs text-gray-400 mt-1">با کلیک روی «ایجاد پکیج فروش جدید»، اولین پکیج فروش هوشمند خود را طراحی کنید.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-right text-sm text-gray-600 dark:text-gray-400">
                  <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 font-bold">
                    <tr>
                      <th className="p-4">تصویر</th>
                      <th className="p-4">عنوان پکیج فروش</th>
                      <th className="p-4">آدرس ساده (Slug)</th>
                      <th className="p-4 text-center">تعداد تگ‌ها</th>
                      <th className="p-4 text-center">ترتیب</th>
                      <th className="p-4 text-center">آمار کلیک و سبد</th>
                      <th className="p-4 text-center">وضعیت نمایش</th>
                      <th className="p-4 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {sets.map((set) => (
                      <tr key={set.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="p-4">
                          <div className="relative w-12 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 dark:bg-gray-800">
                            <Image src={set.imageUrl} alt={set.name} fill className="object-cover" />
                          </div>
                        </td>
                        <td className="p-4 font-bold text-gray-900 dark:text-white">
                          {set.name}
                        </td>
                        <td className="p-4 font-mono text-xs text-blue-600 dark:text-blue-400">
                          /shoppable/{set.slug}
                        </td>
                        <td className="p-4 text-center font-bold">
                          {set.items.length} محصول
                        </td>
                        <td className="p-4 text-center font-bold">
                          {set.order}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-center gap-1.5 text-xs">
                            <span className="flex items-center gap-1 font-bold">
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                              {set.views} بازدید
                            </span>
                            <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                              <MousePointer className="w-3.5 h-3.5 text-blue-400" />
                              {set.tagClicks} کلیک تگ
                            </span>
                            <span className="flex items-center gap-1 font-bold text-emerald-600">
                              <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
                              {set.addToCarts} سبد خرید
                            </span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleSetStatus(set)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                              set.isActive ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-800"
                            }`}
                          >
                            <span
                              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                set.isActive ? "-translate-x-5" : "-translate-x-0.5"
                              }`}
                            />
                          </button>
                        </td>
                        <td className="p-4 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setCurrentSlide(set);
                                setIsEditing(true);
                              }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-blue-600 dark:text-gray-400 rounded-lg transition-colors"
                              title="ویرایش"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteSet(set.id)}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 hover:text-red-600 dark:text-gray-400 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {isEditing && (
        /* Edit / Create Mode */
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-6 shadow-sm pb-24 lg:pb-6">
          <div className="flex justify-between items-center pb-5 mb-6 border-b border-gray-100 dark:border-gray-800">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {currentSet.id ? "ویرایش پکیج فروش" : "ایجاد پکیج فروش تعاملی جدید"}
              </h2>
              <p className="text-xs text-gray-500 mt-1">عکس مورد نظر خود را انتخاب کرده و کالاهای مربوطه را روی آن تگ (برچسب‌گذاری) کنید.</p>
            </div>
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-white font-bold"
            >
              <ArrowRight className="w-4 h-4" />
              بازگشت به لیست
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Form Fields & Interactive Canvas */}
            <div className="lg:col-span-8 space-y-6 flex flex-col">
              
              {/* Settings Fields Container */}
              <div className="order-2 lg:order-1 space-y-6 bg-gray-50/50 dark:bg-gray-900/10 p-4 rounded-2xl border border-gray-100/50 dark:border-gray-800 lg:p-0 lg:bg-transparent lg:border-0">
                <h3 className="text-xs font-black text-gray-900 dark:text-white lg:hidden mb-2">تنظیمات و مشخصات پکیج</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">عنوان پکیج فروش</label>
                    <input
                      type="text"
                      value={currentSet.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        // Auto slug generation if creating
                        const slugVal = !currentSet.id ? val.trim().replace(/\s+/g, "-") : currentSet.slug;
                        setCurrentSlide({ ...currentSet, name: val, slug: slugVal });
                      }}
                      placeholder="مثال: دکوراسیون کلاسیک پذیرایی یا ست لباس تابستانه"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-sm focus:outline-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">آدرس ساده (Slug)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3.5 text-xs text-gray-400 font-mono">domain.com/shoppable/</span>
                      <input
                        type="text"
                        value={currentSet.slug}
                        onChange={(e) => setCurrentSlide({ ...currentSet, slug: e.target.value })}
                        placeholder="living-room"
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 pl-3 pr-28 rounded-xl text-sm font-mono focus:outline-blue-500 text-gray-900 dark:text-white ltr text-left"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">ترتیب نمایش (Order)</label>
                    <input
                      type="number"
                      value={currentSet.order}
                      onChange={(e) => setCurrentSlide({ ...currentSet, order: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-sm focus:outline-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">درصد تخفیف کل پکیج (درصد ۰ تا ۱۰۰)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={currentSet.discount || 0}
                      onChange={(e) => {
                        let val = parseFloat(e.target.value) || 0;
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;
                        setCurrentSlide({ ...currentSet, discount: val });
                      }}
                      placeholder="0"
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-sm focus:outline-blue-500 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-8">
                    <button
                      type="button"
                      onClick={() => setCurrentSlide({ ...currentSet, isActive: !currentSet.isActive })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        currentSet.isActive ? "bg-emerald-600" : "bg-gray-200 dark:bg-gray-800"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          currentSet.isActive ? "-translate-x-6" : "-translate-x-1"
                        }`}
                      />
                    </button>
                    <div>
                      <span className="block text-xs font-bold text-gray-900 dark:text-white">وضعیت انتشار</span>
                      <span className="text-[10px] text-gray-400">تصاویر غیرفعال در فروشگاه نشان داده نمی‌شوند.</span>
                    </div>
                  </div>
                </div>

                {/* Set Image Selector */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">تصویر اصلی خریدنی</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={currentSet.imageUrl}
                      onChange={(e) => setCurrentSlide({ ...currentSet, imageUrl: e.target.value })}
                      placeholder="آدرس اینترنتی تصویر را وارد کنید یا از گالری انتخاب کنید..."
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl text-sm focus:outline-blue-500 text-gray-900 dark:text-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-4 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors border border-blue-100"
                    >
                      <ImageIcon className="w-4 h-4" />
                      انتخاب از گالری
                    </button>
                  </div>
                </div>
              </div>

              {/* Interactive Tagging Canvas */}
              <div className="order-1 lg:order-2 space-y-4">
                {currentSet.imageUrl ? (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-black text-gray-900 dark:text-white">
                        برچسب‌گذاری هوشمند روی عکس
                      </label>
                      <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-1 rounded">
                        راهنما: هر کجای عکس که محصول قرار دارد کلیک کنید.
                      </span>
                    </div>
                    
                    <div className="relative border border-gray-200 dark:border-gray-800 rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-950 flex justify-center shadow-inner">
                      <div 
                        className="relative w-full max-w-[450px] aspect-[3/4] cursor-crosshair group select-none overflow-hidden"
                        onClick={handleImageClick}
                      >
                        <Image 
                          src={currentSet.imageUrl} 
                          alt="Set Tagger" 
                          fill 
                          className="object-cover pointer-events-none"
                          priority
                          unoptimized
                        />

                        {/* Display already mapped hotspots */}
                        {(currentSet.items || []).map((item, idx) => (
                          <div
                            key={idx}
                            className="absolute group/tag"
                            style={{ left: `${item.x}%`, top: `${item.y}%`, transform: "translate(-50%, -50%)" }}
                          >
                            <div className="relative">
                              <span className="absolute inline-flex h-7 w-7 rounded-full bg-blue-400 animate-ping opacity-60"></span>
                              <div className="relative z-10 w-7 h-7 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-md">
                                {idx + 1}
                              </div>
                              {/* Hover tooltip */}
                              <div className="absolute bottom-9 left-1/2 -translate-x-1/2 hidden group-hover/tag:block bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded-xl whitespace-nowrap shadow-xl z-20 pointer-events-none">
                                {item.product?.title || "محصول متصل شده"}
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* Display temporary clicked point indicator */}
                        {tempPoint && (
                          <div
                            className="absolute z-20"
                            style={{ left: `${tempPoint.x}%`, top: `${tempPoint.y}%`, transform: "translate(-50%, -50%)" }}
                          >
                            <span className="absolute inline-flex h-9 w-9 rounded-full bg-amber-400 animate-ping opacity-75"></span>
                            <div className="relative w-8 h-8 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-md">
                              ؟
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hotspot select overlay / section */}
                    {tempPoint && (
                      <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-amber-800 dark:text-amber-400">
                            اتصال محصول به نقطه انتخاب شده (موقعیت: {tempPoint.x.toFixed(0)}% , {tempPoint.y.toFixed(0)}%)
                          </span>
                          <button
                            onClick={() => setTempPoint(null)}
                            className="p-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-lg text-amber-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <input
                              type="text"
                              value={searchProductQuery}
                              onChange={(e) => setSearchProductQuery(e.target.value)}
                              placeholder="جستجوی محصول..."
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-xs focus:outline-blue-500"
                            />
                          </div>
                          <div>
                            <select
                              value={selectedProductForPoint}
                              onChange={(e) => setSelectedProductForProduct(e.target.value)}
                              className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-2.5 rounded-xl text-xs focus:outline-blue-500"
                            >
                              <option value="">-- انتخاب محصول --</option>
                              {filteredProductsToSelect.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.title} ({p.price.toLocaleString()} تومان)
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setTempPoint(null)}
                            className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-all"
                          >
                            انصراف
                          </button>
                          <button
                            type="button"
                            onClick={handleAddHotspot}
                            disabled={!selectedProductForPoint}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            ثبت تگ روی عکس
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-950/40 p-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
                    <ImageIcon className="w-10 h-12 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                      برای شروع برچسب‌گذاری هوشمند، ابتدا عکس اصلی را انتخاب کنید.
                    </p>
                  </div>
                )}

                {/* Mobile horizontal scrolling product cards (rendered directly below canvas on mobile) */}
                <div className="lg:hidden block mt-4">
                  <h3 className="text-xs font-black text-gray-900 dark:text-white mb-3 flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4 text-blue-500" />
                    محصولات برچسب‌گذاری شده ({currentSet.items?.length || 0})
                  </h3>
                  
                  {(!currentSet.items || currentSet.items.length === 0) ? (
                    <p className="text-xs text-gray-400 leading-relaxed text-center py-6 bg-gray-50 dark:bg-gray-900/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                      هنوز هیچ محصولی روی عکس تگ نشده است. روی نقاط مختلف عکس کلیک کنید تا متصل شوند.
                    </p>
                  ) : (
                    <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none snap-x snap-mandatory">
                      {(currentSet.items || []).map((item, index) => (
                        <div 
                          key={index} 
                          className="relative shrink-0 w-32 bg-white dark:bg-gray-850 border border-gray-150 dark:border-gray-800 rounded-2xl p-2 shadow-sm snap-start flex flex-col items-center text-center"
                        >
                          {/* Red 'x' close badge on top-left of the card */}
                          <button
                            type="button"
                            onClick={() => handleRemoveHotspot(index)}
                            className="absolute -top-1.5 -left-1.5 z-20 w-6 h-6 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-all active:scale-90"
                            title="حذف تگ"
                          >
                            <X className="w-3 h-3 stroke-[2.5]" />
                          </button>

                          {/* Index badge at top-right of the card */}
                          <span className="absolute top-1.5 right-1.5 z-10 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
                            {index + 1}
                          </span>

                          {/* Product Image */}
                          <div className="relative w-24 h-24 rounded-xl overflow-hidden bg-gray-50 dark:bg-gray-800 mb-2 border border-gray-100 dark:border-gray-700">
                            <Image 
                              src={item.product?.imageUrl || '/globe.svg'} 
                              alt={item.product?.title || ''} 
                              fill 
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          {/* Product Title & Price */}
                          <div className="w-full px-1">
                            <h4 className="text-[10px] font-black text-gray-900 dark:text-white truncate">
                              {item.product?.title}
                            </h4>
                            <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 block mt-0.5">
                              {item.product?.price.toLocaleString()} تومان
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Side list of added points (Desktop only) */}
            <div className="lg:col-span-4 space-y-6 hidden lg:block">
              <div className="bg-gray-50 dark:bg-gray-900/30 border border-gray-150 dark:border-gray-850 rounded-2xl p-4">
                <h3 className="text-xs font-black text-gray-900 dark:text-white mb-4 flex items-center gap-1">
                  <ShoppingBag className="w-4 h-4 text-blue-500" />
                  محصولات برچسب‌گذاری شده ({currentSet.items?.length || 0})
                </h3>

                {(!currentSet.items || currentSet.items.length === 0) ? (
                  <p className="text-xs text-gray-400 leading-relaxed text-center py-6">
                    هنوز هیچ محصولی روی عکس تگ نشده است. روی نقاط مختلف عکس کلیک کنید تا متصل شوند.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {(currentSet.items || []).map((item, index) => (
                      <div 
                        key={index} 
                        className="bg-white dark:bg-gray-850 border border-gray-100 dark:border-gray-800 rounded-xl p-3 flex justify-between items-center gap-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {item.product?.title}
                            </h4>
                            <span className="text-[10px] font-mono text-gray-400 block mt-0.5">
                              X: {item.x.toFixed(0)}% / Y: {item.y.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveHotspot(index)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all shrink-0"
                          title="حذف تگ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleSaveSet}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  ذخیره کل اطلاعات پکیج فروش
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  انصراف
                </button>
              </div>

            </div>

            {/* Mobile Sticky Action Bar */}
            <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md p-4 border-t border-gray-100 dark:border-gray-850 shadow-lg flex gap-3">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSaveSet}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer"
              >
                <Save className="w-4 h-4" />
                ذخیره کل اطلاعات پکیج فروش
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Media Picker Modal */}
      {showMediaPicker && (
        <MediaPicker
          onSelect={handleMediaSelect}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
