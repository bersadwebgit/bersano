'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Package, Edit, Trash2, Search, FileDown, Zap, X, Save, Eye, Sparkles, Loader2, AlertCircle, UploadCloud, Download, FileSpreadsheet, ArrowUpDown, Check, Info, Copy } from 'lucide-react';

type Product = {
  id: string;
  title: string;
  type: string;
  price: number;
  stock: number;
  isActive: boolean;
  imageUrl: string | null;
  isSpecial?: boolean;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [quickEditProduct, setQuickEditProduct] = useState<Product | null>(null);
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [productLimit, setProductLimit] = useState<number>(0);

  // AI Assistant States
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState<{ success: boolean; explanation: string } | null>(null);
  const [aiError, setAiError] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // AI Confirmation Preview States
  const [aiPreviewData, setAiPreviewData] = useState<{
    explanation: string;
    isBulk: boolean;
    targets: Array<{
      id: string;
      title: string;
      imageUrl: string | null;
      currentPrice: number;
      proposedPrice: number;
      currentStock: number;
      proposedStock: number;
      currentIsActive: boolean;
      proposedIsActive: boolean;
      proposedIsDeleted?: boolean;
      imageUpdates: any;
    }>;
    rawResult: any;
  } | null>(null);

  // AI Import/Export States
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  
  // Import States
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importResult, setImportResult] = useState<{
    explanation: string;
    products: any[];
  } | null>(null);
  const [confirmImportLoading, setConfirmImportLoading] = useState(false);
  const [selectedImportProducts, setSelectedImportProducts] = useState<number[]>([]); // indexes of products to import

  // Export States
  const [exportPrompt, setExportPrompt] = useState('');
  const [exportLoading, setExportLoading] = useState(false);
  const [exportError, setExportError] = useState('');
  const [exportResult, setExportResult] = useState<{
    explanation: string;
    content: string;
    fileName: string;
    mimeType: string;
  } | null>(null);

  const handleImportSubmit = async () => {
    if (!importFile && !importText.trim()) {
      setImportError('لطفاً یک فایل انتخاب کنید یا متنی را وارد نمایید.');
      return;
    }
    setImportLoading(true);
    setImportError('');
    setImportResult(null);
    setSelectedImportProducts([]);

    try {
      const formData = new FormData();
      if (importFile) {
        formData.append('file', importFile);
      } else {
        formData.append('text', importText);
      }

      const res = await fetch('/api/admin/products/ai-import', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در پردازش اطلاعات رخ داد.');
      }

      if (data.success && data.products) {
        setImportResult({
          explanation: data.explanation,
          products: data.products
        });
        // Select all products by default
        setSelectedImportProducts(data.products.map((_: any, idx: number) => idx));
      } else {
        throw new Error(data.error || 'هوش مصنوعی نتوانست محصولی از این داده‌ها استخراج کند.');
      }
    } catch (err: any) {
      setImportError(err.message || 'خطای ارتباط با سرور.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importResult || selectedImportProducts.length === 0) return;
    setConfirmImportLoading(true);
    setImportError('');

    try {
      const productsToImport = importResult.products.filter((_, idx) => selectedImportProducts.includes(idx));
      const res = await fetch('/api/admin/products/ai-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: productsToImport }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در ثبت محصولات رخ داد.');
      }

      alert(data.message || 'درون‌ریزی با موفقیت انجام شد.');
      setIsImportExportOpen(false);
      setImportResult(null);
      setImportFile(null);
      setImportText('');
      fetchProducts(); // Refresh product list!
    } catch (err: any) {
      setImportError(err.message || 'خطای ارتباط با سرور در ثبت نهایی.');
    } finally {
      setConfirmImportLoading(false);
    }
  };

  const handleExportSubmit = async () => {
    if (!exportPrompt.trim()) {
      setExportError('لطفاً دستور خروجی‌گیری را وارد کنید.');
      return;
    }
    setExportLoading(true);
    setExportError('');
    setExportResult(null);

    try {
      const res = await fetch('/api/admin/products/ai-export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: exportPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در تولید خروجی رخ داد.');
      }

      if (data.success) {
        setExportResult({
          explanation: data.explanation,
          content: data.content,
          fileName: data.fileName,
          mimeType: data.mimeType
        });
      } else {
        throw new Error(data.error || 'هوش مصنوعی نتوانست خروجی مناسبی تولید کند.');
      }
    } catch (err: any) {
      setExportError(err.message || 'خطای ارتباط با سرور.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleDownloadExport = () => {
    if (!exportResult) return;
    const blob = new Blob([exportResult.content], { type: exportResult.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportResult.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyExport = () => {
    if (!exportResult) return;
    navigator.clipboard.writeText(exportResult.content);
    alert('محتوا با موفقیت در حافظه موقت کپی شد.');
  };

  const handleAiSubmit = async () => {
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiResponse(null);
    setAiPreviewData(null);

    try {
      // First request is a dry-run PREVIEW to get user confirmation!
      const res = await fetch('/api/admin/products/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: aiPrompt,
          selectedProductIds,
          preview: true
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در ارتباط با دستیار هوشمند رخ داد.');
      }

      if (data.success && data.preview) {
        setAiPreviewData({
          explanation: data.explanation,
          isBulk: data.isBulk,
          targets: data.targets,
          rawResult: data.rawResult
        });
      } else if (!data.success) {
        setAiError(data.explanation || 'عملیات ناموفق بود. لطفاً پرامپت خود را واضح‌تر وارد کنید.');
      }
    } catch (err: any) {
      setAiError(err.message || 'خطای ارتباط با سرور.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiExecute = async () => {
    if (!aiPreviewData) return;
    setAiLoading(true);
    setAiError('');

    try {
      // Second request actually EXECUTES the pre-calculated changes!
      const res = await fetch('/api/admin/products/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          selectedProductIds,
          execute: true,
          rawResult: aiPreviewData.rawResult
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در ثبت نهایی تغییرات رخ داد.');
      }

      if (data.success) {
        setAiResponse({ success: true, explanation: data.explanation });
        setAiPreviewData(null);
        setSelectedProductIds([]); // Clear checkboxes
        setAiPrompt(''); // Clear input
        fetchProducts(); // Refresh table!
      } else {
        setAiError(data.explanation || 'ثبت نهایی تغییرات با خطا مواجه شد.');
      }
    } catch (err: any) {
      setAiError(err.message || 'خطای ارتباط با سرور در ثبت نهایی.');
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchLimit();
    const dismissed = localStorage.getItem('hide_guide_products') === 'true';
    if (dismissed) setShowGuide(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get('aiPrompt');
      if (promptParam) {
        setAiPrompt(promptParam);
        setTimeout(() => {
          document.getElementById('ai-assistant-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    }
  }, []);

  const fetchLimit = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        const activePackage = data.settings?.package;
        const isPackageActive = data.settings?.packageExpiresAt ? new Date(data.settings.packageExpiresAt) > new Date() : false;
        if (activePackage && isPackageActive) {
          try {
            const features = JSON.parse(activePackage.features);
            if (features.maxProducts && features.maxProducts > 0) {
              setProductLimit(parseInt(features.maxProducts));
            }
          } catch (e) {}
        }
      }
    } catch (e) {}
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('[ERROR] [Products]: Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این محصول اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setProducts(products.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error('[ERROR] [Products]: Error deleting product:', error);
    }
  };

  const handleQuickEditSave = async () => {
    if (!quickEditProduct) return;
    setSavingQuickEdit(true);
    try {
      const res = await fetch(`/api/admin/products/${quickEditProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quickEditProduct.title,
          price: quickEditProduct.price,
          stock: quickEditProduct.stock,
          isActive: quickEditProduct.isActive,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProducts(products.map(p => p.id === data.product.id ? data.product : p));
        setQuickEditProduct(null);
      } else {
        alert('خطا در ذخیره تغییرات');
      }
    } catch (error) {
      console.error('[ERROR] [Products]: Error updating product:', error);
      alert('خطای ارتباط با سرور');
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && p.isActive) || 
      (statusFilter === 'inactive' && !p.isActive);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const formatPrice = (price: number) => {
    return `${price.toLocaleString('fa-IR')} تومان`;
  };

  const formatNum = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none">
      
      {showGuide && (
        <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 flex items-start justify-between gap-4 select-none text-right">
          <div className="flex gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-blue-900 dark:text-blue-200">راهنمای مدیریت محصولات 💡</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                اینجا می‌توانید محصولات فروشگاه خود را تعریف، ویرایش و مدیریت کنید. با کلیک روی دکمه «افزودن محصول جدید» می‌توانید کالای فیزیکی یا دیجیتال ثبت کنید. همچنین با استفاده از ابزار «درون‌ریزی و برون‌بری هوشمند»، می‌توانید اطلاعات محصولات را از فایل اکسل وارد پنل کنید.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setShowGuide(false);
              localStorage.setItem('hide_guide_products', 'true');
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Banner - Floating Box Layout */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-blue-500" />
            انبارداری و مدیریت محصولات
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">لیست محصولات، قیمت‌گذاری، تعیین موجودی انبار و تغییر سریع وضعیت کالاها</p>
          {productLimit > 0 && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-xl ${products.length >= productLimit ? 'bg-red-500/15 text-red-600 border border-red-500/10' : 'bg-blue-500/15 text-blue-600 border border-blue-500/10'}`}>
                ظرفیت محصولات پکیج: {formatNum(products.length)} از {formatNum(productLimit)} کالا
              </span>
              {products.length >= productLimit && (
                <span className="text-[10px] text-red-500 font-black animate-pulse">⚠️ ظرفیت پکیج شما تکمیل شده است و امکان تعریف محصول جدید غیرفعال می‌باشد.</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button 
            onClick={() => setIsImportExportOpen(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 animate-pulse" />
            درون‌ریزی و برون‌بری هوشمند (AI)
          </button>

          {productLimit > 0 && products.length >= productLimit ? (
            <button 
              type="button"
              onClick={() => alert(`شما به سقف محدودیت پکیج خود (${productLimit} کالا) رسیده‌اید. برای ثبت کارهای جدید، لطفا پکیج خود را ارتقا دهید.`)}
              className="flex items-center gap-2 bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-500 px-5 py-2.5 rounded-xl font-black text-xs cursor-not-allowed shrink-0 border border-slate-300/30"
            >
              <Plus className="w-4 h-4" />
              افزودن محصول جدید (سقف پر است)
            </button>
          ) : (
            <Link 
              href="/admin/products/new" 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0"
            >
              <Plus className="w-4 h-4" />
              افزودن محصول جدید به فروشگاه
            </Link>
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
              <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند محصول (کنترل با پرامپت)</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                با نوشتن دستورهای متنی به زبان ساده، تمام بخش‌های محصولات فروشگاه (قیمت، تخفیف، موجودی، فعال/غیرفعال بودن، و حتی ویرایش و حذف پس‌زمینه تصاویر محصولات) را به صورت هوشمند مدیریت کنید!
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

        {selectedProductIds.length > 0 && (
          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex justify-between items-center animate-in slide-in-from-top duration-200">
            <span className="text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
              تعداد {formatNum(selectedProductIds.length)} محصول انتخاب شده است. دستور شما روی تمام این محصولات اعمال خواهد شد.
            </span>
            <button
              onClick={() => setSelectedProductIds([])}
              className="text-[10px] font-black text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer border-0"
            >
              لغو انتخاب همگی
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="مثال: عکس محصول کد کالا: cmq2o0286000wu2pxzqxgrt5b زمینه حذف بشه و جایگزین بشه + واترمارک زمینه سبز..."
              className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAiSubmit();
                }
              }}
              disabled={aiLoading}
            />
            <button
              type="button"
              disabled={aiLoading || !aiPrompt.trim()}
              onClick={handleAiSubmit}
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {aiLoading ? (
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
              'عکس محصول کد کالا: cmq2o0286000wu2pxzqxgrt5b زمینه حذف بشه و جایگزین بشه + واترمارک زمینه سبز',
              'قیمت محصول را ۲۰ درصد افزایش بده',
              'موجودی کالا با شناسه cmq2o0286000wu2pxzqxgrt5b را به ۵۰ عدد تغییر بده'
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setAiPrompt(sug)}
                className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-xl transition-colors font-bold cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {aiError && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{aiError}</span>
            </div>
          )}

          {/* AI Confirmation Preview Box */}
          {aiPreviewData && (
            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-black text-xs">
                <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Eye className="w-3.5 h-3.5" />
                </div>
                پیش‌نمایش و تایید نهایی تغییرات هوشمند
              </div>

              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 whitespace-pre-line">
                {aiPreviewData.explanation}
              </p>

              {/* Targets List */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                <span className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase">لیست کالاهای هدف و مقادیر جدید:</span>
                {aiPreviewData.targets.map((target) => (
                  <div key={target.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/60 text-xs font-bold">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 dark:border-slate-800 overflow-hidden shrink-0">
                        {target.imageUrl ? (
                          <img src={target.imageUrl} alt={target.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100 dark:bg-slate-800">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-slate-800 dark:text-slate-200 line-clamp-1">{target.title}</span>
                        <span className="block text-[9px] text-slate-400">شناسه: {target.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-left">
                      {target.proposedIsDeleted ? (
                        <div className="text-left">
                          <span className="block text-[9px] text-slate-400 font-bold">عملیات</span>
                          <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-black bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/10">
                            حذف کامل
                          </span>
                        </div>
                      ) : (
                        <>
                          {/* Price Change */}
                          {target.currentPrice !== target.proposedPrice && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">قیمت</span>
                              <span className="block text-slate-700 dark:text-slate-300">
                                <span className="line-through text-slate-400 text-[10px] ml-1">{formatPrice(target.currentPrice)}</span>
                                <span className="text-purple-600 dark:text-purple-400 font-black">{formatPrice(target.proposedPrice)}</span>
                              </span>
                            </div>
                          )}

                          {/* Stock Change */}
                          {target.currentStock !== target.proposedStock && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">موجودی</span>
                              <span className="block text-slate-700 dark:text-slate-300">
                                <span className="line-through text-slate-400 text-[10px] ml-1">{formatNum(target.currentStock)}</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-black">{formatNum(target.proposedStock)} عدد</span>
                              </span>
                            </div>
                          )}

                          {/* Active Status Change */}
                          {target.currentIsActive !== target.proposedIsActive && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">وضعیت</span>
                              <span className={`inline-flex px-2 py-0.5 rounded-md text-[9px] font-black ${target.proposedIsActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                {target.proposedIsActive ? 'فعال' : 'غیرفعال'}
                              </span>
                            </div>
                          )}

                          {/* Image Process Indicator */}
                          {target.imageUpdates && (
                            <div className="text-left">
                              <span className="block text-[9px] text-slate-400 font-bold">تصویر</span>
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[9px] font-black bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-200/10">
                                <Sparkles className="w-2.5 h-2.5" />
                                پردازش هوشمند
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Confirmation Actions */}
              <div className="flex justify-end gap-3 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  onClick={() => setAiPreviewData(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border-0 cursor-pointer"
                >
                  لغو و انصراف
                </button>
                <button
                  onClick={handleAiExecute}
                  disabled={aiLoading}
                  className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md shadow-amber-500/10 hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {aiLoading ? 'در حال ثبت نهایی...' : 'تایید و اعمال نهایی تغییرات'}
                </button>
              </div>
            </div>
          )}

          {aiResponse && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 flex flex-col gap-1.5 animate-in fade-in duration-200">
              <span className="font-black">عملیات با موفقیت انجام شد:</span>
              <p className="leading-relaxed whitespace-pre-line">{aiResponse.explanation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters - Independent Rounded Box */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
            <input 
              type="text" 
              placeholder="جستجو در نام محصولات، مدل‌ها یا شناسه‌ی کالا..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-11 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all shadow-sm focus:border-blue-500"
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[150px] cursor-pointer transition-all shadow-sm focus:border-blue-500"
            >
              <option value="all">همه انواع کالاها</option>
              <option value="physical">فقط محصولات فیزیکی</option>
              <option value="digital">فقط محصولات دانلودی</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 dark:text-slate-300 min-w-[150px] cursor-pointer transition-all shadow-sm focus:border-blue-500"
            >
              <option value="all">همه وضعیت‌های نمایش</option>
              <option value="active">محصولات فعال و موجود</option>
              <option value="inactive">محصولات غیرفعال (پنهان)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table - Premium Floating Box Design */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-right text-xs font-bold">
            <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none">
              <tr>
                <th className="p-4.5 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredProducts.length > 0 && selectedProductIds.length === filteredProducts.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProductIds(filteredProducts.map(p => p.id));
                      } else {
                        setSelectedProductIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                </th>
                <th className="p-4.5 font-black">تصویر و عنوان محصول</th>
                <th className="p-4.5 font-black text-center">نوع کالا</th>
                <th className="p-4.5 font-black text-center">قیمت فروش</th>
                <th className="p-4.5 font-black text-center">موجودی انبار</th>
                <th className="p-4.5 font-black text-center">وضعیت نمایش</th>
                <th className="p-4.5 font-black text-left">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                      <span className="font-bold text-xs">در حال بارگذاری لیست محصولات...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Package className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                      <span className="font-black text-sm">هیچ محصول منطبقی در فروشگاه یافت نشد!</span>
                      <span className="text-[10px] text-slate-400 font-medium">می‌توانید کلمه جستجو را ویرایش کرده یا کالا ثبت کنید.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className={`hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors group ${selectedProductIds.includes(product.id) ? 'bg-purple-500/[0.03] dark:bg-purple-500/[0.02]' : ''}`}>
                    <td className="p-4.5 text-center">
                      <input
                        type="checkbox"
                        checked={selectedProductIds.includes(product.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedProductIds([...selectedProductIds, product.id]);
                          } else {
                            setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                          }
                        }}
                        className="w-4 h-4 rounded-md border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-4.5">
                      <Link 
                        href={`/product/${product.id}`}
                        target="_blank"
                        className="flex items-center gap-3.5 group/prod-link cursor-pointer"
                      >
                        <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm shrink-0">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 group-hover/prod-link:scale-105" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-700 bg-slate-100 dark:bg-slate-800">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                        <div className="overflow-hidden space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-black text-slate-800 dark:text-slate-100 line-clamp-1 group-hover/prod-link:text-blue-500 transition-colors text-sm" title={product.title}>
                              {product.title}
                            </span>
                            {product.isSpecial && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400 border border-red-200/25">
                                <Zap className="w-2.5 h-2.5 fill-red-500/20 text-red-500" />
                                شگفت‌انگیز
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block select-all">کد کالا: {product.id}</span>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4.5 text-center">
                      {product.type === 'digital' ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-400 border border-purple-200/20">
                          <FileDown className="w-3.5 h-3.5" />
                          دانلودی (فایل)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/20">
                          <Package className="w-3.5 h-3.5" />
                          فیزیکی (انبار)
                        </span>
                      )}
                    </td>
                    <td className="p-4.5 text-center text-slate-800 dark:text-slate-100 font-black text-[13px]">
                      {formatPrice(product.price)}
                    </td>
                    <td className="p-4.5 text-center">
                      {product.type === 'digital' ? (
                        <span className="text-slate-400 font-bold text-[11px]">نامحدود</span>
                      ) : (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                          product.stock === 0 
                            ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400' 
                            : product.stock <= 5 
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {product.stock === 0 ? 'ناموجود' : `${formatNum(product.stock)} عدد`}
                        </span>
                      )}
                    </td>
                    <td className="p-4.5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                        product.isActive 
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/10' 
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/10'
                      }`}>
                        {product.isActive ? 'فعال و نمایان' : 'غیرفعال (مخفی)'}
                      </span>
                    </td>
                    <td className="p-4.5 text-left">
                      <div className="flex justify-end gap-2">
                        <Link 
                          href={`/product/${product.id}`}
                          target="_blank"
                          title="مشاهده محصول در فروشگاه"
                          className="p-2 text-slate-500 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-950 dark:hover:bg-emerald-950/30 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm"
                        >
                          <Eye className="w-4.5 h-4.5" />
                        </Link>
                        <button 
                          onClick={() => setQuickEditProduct(product)}
                          title="ویرایش سریع قیمت و موجودی"
                          className="p-2 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 dark:bg-slate-950 dark:hover:bg-amber-950/30 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm"
                        >
                          <Zap className="w-4 h-4" />
                        </button>
                        <Link 
                          href={`/admin/products/${product.id}/edit`}
                          title="ویرایش کامل مشخصات"
                          className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-blue-950/30 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          title="حذف کامل محصول"
                          className="p-2 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 dark:bg-slate-950 dark:hover:bg-red-950/30 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Premium Quick Edit Glassmorphic Dialog */}
      {quickEditProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-850">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-amber-500 animate-pulse" />
                ویرایش سریع و درجا محصول
              </h3>
              <button 
                onClick={() => setQuickEditProduct(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>
            
            {/* Form Fields */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">نام و عنوان عمومی محصول</label>
                <input
                  type="text"
                  value={quickEditProduct.title}
                  onChange={(e) => setQuickEditProduct({ ...quickEditProduct, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">قیمت (تومان)</label>
                  <input
                    type="number"
                    value={quickEditProduct.price}
                    onChange={(e) => setQuickEditProduct({ ...quickEditProduct, price: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-blue-500"
                  />
                </div>
                {quickEditProduct.type === 'physical' && (
                  <div>
                    <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">موجودی در انبار</label>
                    <input
                      type="number"
                      value={quickEditProduct.stock}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, stock: Number(e.target.value) })}
                      className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
              
              <div className="pt-2">
                <label className="flex items-center gap-3.5 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={quickEditProduct.isActive}
                      onChange={(e) => setQuickEditProduct({ ...quickEditProduct, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-800 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-700 peer-checked:bg-blue-600"></div>
                  </div>
                  <span className="font-bold text-xs text-slate-600 dark:text-slate-300">وضعیت کالا فعال و در کاتالوگ فروشگاه نمایان باشد</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3.5">
              <button 
                onClick={() => setQuickEditProduct(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                انصراف
              </button>
              <button 
                onClick={handleQuickEditSave}
                disabled={savingQuickEdit}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-xs font-black shadow-sm shadow-blue-500/10 hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {savingQuickEdit ? 'در حال ذخیره‌سازی...' : 'ذخیره تغییرات محصول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Import/Export Dialog */}
      {isImportExportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-100 dark:border-slate-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 dark:border-slate-850 shrink-0">
              <h3 className="font-black text-sm text-slate-800 dark:text-white flex items-center gap-2.5">
                <Sparkles className="w-5 h-5 text-purple-600 animate-pulse" />
                درون‌ریزی و برون‌بری هوشمند محصولات (AI)
              </h3>
              <button 
                onClick={() => {
                  setIsImportExportOpen(false);
                  setImportResult(null);
                  setExportResult(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-2 shrink-0">
              <button
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'import' ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                درون‌ریزی با هوش مصنوعی (Import)
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'export' ? 'bg-purple-600 text-white shadow-sm shadow-purple-500/10' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                برون‌بری با هوش مصنوعی (Export)
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'import' ? (
                <div className="space-y-6">
                  {!importResult ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex gap-3">
                        <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          شما می‌توانید هر نوع فایلی (Excel, CSV, JSON, XML, TXT) یا حتی یک متن خام کپی شده از چت، جدول یا کاتالوگ محصولات را آپلود یا پیست کنید. هوش مصنوعی به صورت خودکار اطلاعات را تحلیل کرده، فیلدها را نگاشت می‌کند و ویژگی‌ها را به بخش تنوع (Variations) می‌برد.
                        </p>
                      </div>

                      {/* File Upload */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">آپلود فایل (Excel, CSV, JSON, XML, TXT)</label>
                        <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-purple-500 dark:hover:border-purple-500 transition-colors relative cursor-pointer group">
                          <input
                            type="file"
                            accept=".xlsx,.xls,.csv,.json,.xml,.txt"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setImportFile(file);
                              if (file) setImportText('');
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <UploadCloud className="w-10 h-10 text-slate-400 group-hover:text-purple-500 transition-colors mx-auto mb-2" />
                          <span className="block text-xs font-black text-slate-600 dark:text-slate-300">
                            {importFile ? importFile.name : 'فایل خود را اینجا رها کنید یا کلیک کنید'}
                          </span>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-bold">حداکثر حجم فایل ۱۰ مگابایت</span>
                        </div>
                      </div>

                      <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
                        <span className="flex-shrink mx-4 text-[10px] text-slate-400 dark:text-slate-500 font-black">یا پیست کردن متن خام</span>
                        <div className="flex-grow border-t border-slate-150 dark:border-slate-800"></div>
                      </div>

                      {/* Raw Text Input */}
                      <div>
                        <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">متن خام محصولات</label>
                        <textarea
                          value={importText}
                          onChange={(e) => {
                            setImportText(e.target.value);
                            if (e.target.value) setImportFile(null);
                          }}
                          placeholder="مثال: گوشی آیفون ۱۳ پرو مکس رنگ آبی حافظه ۲۵۶ گیگ قیمت ۵۵ میلیون موجودی ۵ عدد، رنگ مشکی حافظه ۱۲۸ گیگ قیمت ۴۸ میلیون موجودی ۳ عدد..."
                          rows={6}
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500/20 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                        />
                      </div>

                      {importError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {importError}
                        </div>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleImportSubmit}
                          disabled={importLoading || (!importFile && !importText.trim())}
                          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-xs font-black shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {importLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              در حال تحلیل با هوش مصنوعی...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              تحلیل و استخراج با هوش مصنوعی
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-1">
                          <Check className="w-4.5 h-4.5" />
                          تحلیل هوش مصنوعی با موفقیت انجام شد!
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          {importResult.explanation}
                        </p>
                      </div>

                      {/* Preview Table */}
                      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-right border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850">
                                <th className="p-4 w-10">
                                  <input
                                    type="checkbox"
                                    checked={selectedImportProducts.length === importResult.products.length}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedImportProducts(importResult.products.map((_, idx) => idx));
                                      } else {
                                        setSelectedImportProducts([]);
                                      }
                                    }}
                                    className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                  />
                                </th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">نام محصول</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">دسته‌بندی</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">قیمت پایه</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">موجودی</th>
                                <th className="p-4 text-[10px] font-black text-slate-400 uppercase">تنوع و ویژگی‌ها</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                              {importResult.products.map((p, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10 transition-colors">
                                  <td className="p-4">
                                    <input
                                      type="checkbox"
                                      checked={selectedImportProducts.includes(idx)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedImportProducts([...selectedImportProducts, idx]);
                                        } else {
                                          setSelectedImportProducts(selectedImportProducts.filter(i => i !== idx));
                                        }
                                      }}
                                      className="rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                                    />
                                  </td>
                                  <td className="p-4">
                                    <span className="block text-xs font-black text-slate-800 dark:text-white">{p.title}</span>
                                    {p.brand && <span className="text-[10px] text-slate-400 font-bold">برند: {p.brand}</span>}
                                  </td>
                                  <td className="p-4">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">{p.categoryName || 'بدون دسته‌بندی'}</span>
                                  </td>
                                  <td className="p-4">
                                    <span className="text-xs font-black text-slate-800 dark:text-white">{formatPrice(p.price)}</span>
                                    {p.discount > 0 && <span className="block text-[10px] text-red-500 font-bold">تخفیف: {formatPrice(p.discount)}</span>}
                                  </td>
                                  <td className="p-4">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{formatNum(p.stock)}</span>
                                  </td>
                                  <td className="p-4 space-y-1">
                                    {p.variants && p.variants.length > 0 ? (
                                      <div className="flex flex-wrap gap-1">
                                        {p.variants.map((v: any, vIdx: number) => (
                                          <span key={vIdx} className="text-[9px] font-bold bg-purple-500/10 text-purple-700 dark:text-purple-300 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                            {v.colorCode && (
                                              <span className="w-2 h-2 rounded-full border border-slate-300/30" style={{ backgroundColor: v.colorCode }}></span>
                                            )}
                                            {v.name} ({formatPrice(v.price)} - {formatNum(v.stock)} عدد)
                                          </span>
                                        ))}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 font-bold">بدون تنوع</span>
                                    )}
                                    {p.features && p.features.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {p.features.map((f: string, fIdx: number) => (
                                          <span key={fIdx} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md">{f}</span>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {importError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-bold">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {importError}
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={() => setImportResult(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          تحلیل مجدد / بازگشت
                        </button>
                        <button
                          onClick={handleConfirmImport}
                          disabled={confirmImportLoading || selectedImportProducts.length === 0}
                          className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-xs font-black shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                          {confirmImportLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              در حال درون‌ریزی...
                            </>
                          ) : (
                            <>
                              <Check className="w-4 h-4" />
                              تایید و درون‌ریزی {formatNum(selectedImportProducts.length)} محصول
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-2xl flex gap-3">
                    <Info className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                      شما می‌توانید مشخص کنید محصولات فروشگاه با چه فرمت یا ساختاری خروجی گرفته شوند. برای مثال می‌توانید بنویسید "خروجی استاندارد CSV با ستون‌های انگلیسی"، "فرمت سازگار با ترب (Torob XML)"، "فرمت دیجی‌کالا" یا حتی "یک متن خلاصه و جذاب برای کانال تلگرام همراه با قیمت‌ها". هوش مصنوعی خروجی را دقیقاً مطابق دستور شما تولید می‌کند.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Prompt Input */}
                    <div>
                      <label className="block text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase mb-2">دستور خروجی‌گیری (فرمت دلخواه شما)</label>
                      <textarea
                        value={exportPrompt}
                        onChange={(e) => setExportPrompt(e.target.value)}
                        placeholder="مثال: یک خروجی استاندارد CSV به زبان انگلیسی شامل ستون‌های ID, Title, Price, Stock, Category تولید کن..."
                        rows={3}
                        className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500/20 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600"
                      />
                    </div>

                    {/* Suggestions */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center ml-1">پیشنهادها:</span>
                      {[
                        'خروجی استاندارد CSV با ستون‌های انگلیسی',
                        'فرمت سازگار با ترب (Torob XML)',
                        'خروجی JSON کامل از تمام فیلدها',
                        'متن معرفی خلاصه و جذاب محصولات برای کانال تلگرام'
                      ].map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setExportPrompt(s)}
                          className="text-[9px] font-bold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 bg-purple-500/5 hover:bg-purple-500/10 px-2.5 py-1.5 rounded-xl border border-purple-500/10 transition-all cursor-pointer"
                        >
                          {s}
                        </button>
                      ))}
                    </div>

                    {exportError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-2.5 text-red-600 dark:text-red-400 text-xs font-bold">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {exportError}
                      </div>
                    )}

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleExportSubmit}
                        disabled={exportLoading || !exportPrompt.trim()}
                        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl text-xs font-black shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {exportLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            در حال تولید خروجی با هوش مصنوعی...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            تولید خروجی هوشمند
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {exportResult && (
                    <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-850 animate-in fade-in duration-300">
                      <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                        <h4 className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-1">
                          <Check className="w-4.5 h-4.5" />
                          خروجی هوشمند با موفقیت تولید شد!
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                          {exportResult.explanation}
                        </p>
                      </div>

                      {/* Code/Text Preview */}
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase">پیش‌نمایش خروجی ({exportResult.fileName})</span>
                          <div className="flex gap-2">
                            <button
                              onClick={handleCopyExport}
                              className="flex items-center gap-1 text-[10px] font-black text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 bg-purple-500/5 hover:bg-purple-500/10 px-2.5 py-1.5 rounded-xl border border-purple-500/10 transition-all cursor-pointer"
                            >
                              <Copy className="w-3 h-3" />
                              کپی در حافظه
                            </button>
                            <button
                              onClick={handleDownloadExport}
                              className="flex items-center gap-1 text-[10px] font-black text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/10 transition-all cursor-pointer"
                            >
                              <Download className="w-3 h-3" />
                              دانلود فایل
                            </button>
                          </div>
                        </div>
                        <textarea
                          readOnly
                          value={exportResult.content}
                          rows={10}
                          className="w-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-2xl text-xs font-mono text-slate-700 dark:text-slate-300 outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
