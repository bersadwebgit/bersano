'use client';

import { useState } from 'react';
import { 
  FileDown, 
  FileUp, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  UploadCloud, 
  Download, 
  Settings, 
  Package, 
  Grid, 
  Info,
  ArrowLeftRight,
  Sparkles,
  Image as ImageIcon,
  FileText,
  Trash2,
  Check,
  Eye,
  ArrowRight,
  ArrowLeft,
  DollarSign,
  Layers
} from 'lucide-react';

interface ParsedProduct {
  id?: string;
  title: string;
  type: string;
  categoryId?: string | null;
  categoryName?: string | null;
  price: number;
  discount?: number;
  imageUrl?: string | null;
  galleryUrls?: string[] | string;
  stock: number;
  description?: string | null;
  fullDescription?: string | null;
  brand?: string | null;
  isActive?: boolean;
  isSpecial?: boolean;
  specialEndsAt?: string | null;
  faqs?: any;
  features?: any;
  specs?: any;
  variants?: any[];
}

interface ParsedCategory {
  id?: string;
  name: string;
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  parentName?: string | null;
  isActive?: boolean;
}

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  
  // Export states
  const [exportType, setExportType] = useState<'products' | 'categories' | 'settings' | 'full'>('products');
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');
  const [exporting, setExporting] = useState(false);

  // Import states
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [importMethod, setImportMethod] = useState<'standard' | 'ai'>('standard');
  const [importType, setImportType] = useState<'products' | 'categories' | 'settings' | 'full'>('products');
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json');
  const [conflictResolution, setConflictResolution] = useState<'skip' | 'overwrite'>('skip');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [rawText, setRawText] = useState('');
  const [downloadImages, setDownloadImages] = useState(true);
  
  // Preview and Edit states
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<ParsedProduct[]>([]);
  const [previewCategories, setPreviewCategories] = useState<ParsedCategory[]>([]);
  const [isSettingsOnly, setIsSettingsOnly] = useState(false);
  const [previewSettings, setPreviewSettings] = useState<any>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error' | ''; text: string }>({ type: '', text: '' });
  const [importResult, setImportResult] = useState('');
  const [importProgress, setImportProgress] = useState(0);
  const [importProgressMessage, setImportProgressMessage] = useState('');

  // Handle export action
  const handleExport = async () => {
    setExporting(true);
    setMessage({ type: '', text: '' });
    try {
      const response = await fetch(`/api/admin/import-export/export?type=${exportType}&format=${exportFormat}`);
      if (!response.ok) {
        throw new Error('خطا در خروجی گرفتن از داده‌ها');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const ext = exportFormat === 'csv' && (exportType === 'products' || exportType === 'categories') ? 'csv' : 'json';
      a.download = `${exportType}_export_${Date.now()}.${ext}`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: 'فایل خروجی با موفقیت تولید و دانلود شد.' });
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'خطا در برون‌بری داده‌ها رخ داد.' });
    } finally {
      setExporting(false);
    }
  };

  // Handle file drop/change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImportFile(file);
      setMessage({ type: '', text: '' });

      // Auto-detect format based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext === 'csv') {
        setImportFormat('csv');
      } else if (ext === 'json') {
        setImportFormat('json');
      }
    }
  };

  // Step 1: Analyze and Preview
  const handleAnalyzeAndPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile && !rawText.trim()) {
      setMessage({ type: 'error', text: 'لطفاً ابتدا یک فایل انتخاب کنید یا متنی وارد نمایید.' });
      return;
    }

    setAnalyzing(true);
    setMessage({ type: '', text: '' });

    try {
      const formData = new FormData();
      if (importFile) {
        formData.append('file', importFile);
      }
      if (rawText.trim()) {
        formData.append('rawText', rawText);
      }
      formData.append('method', importMethod);
      formData.append('type', importType);
      formData.append('format', importFormat);

      const response = await fetch('/api/admin/import-export/preview', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در آنالیز داده‌ها');
      }

      if (data.isSettingsOnly) {
        setIsSettingsOnly(true);
        setPreviewSettings(data.settings);
        setPreviewProducts([]);
        setPreviewCategories([]);
      } else {
        setIsSettingsOnly(false);
        setPreviewProducts(data.products || []);
        setPreviewCategories(data.categories || []);
      }

      setImportStep('preview');
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'خطا در آنالیز و پیش‌نمایش داده‌ها رخ داد.' });
    } finally {
      setAnalyzing(false);
    }
  };

  // Step 2: Save finalized data
  const handleConfirmAndSave = async () => {
    setSaving(true);
    setMessage({ type: '', text: '' });
    setImportProgress(0);
    setImportProgressMessage('در صف انتظار...');

    try {
      const response = await fetch('/api/admin/import-export/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: previewProducts,
          categories: previewCategories,
          settings: previewSettings,
          isSettingsOnly,
          conflictResolution,
          downloadImages
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'خطا در ذخیره‌سازی نهایی داده‌ها');
      }

      if (data.jobId) {
        const jobId = data.jobId;
        let jobCompleted = false;
        
        while (!jobCompleted) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          const jobRes = await fetch(`/api/admin/jobs/${jobId}`);
          if (!jobRes.ok) {
            throw new Error('خطا در دریافت وضعیت عملیات از سرور');
          }
          
          const jobData = await jobRes.json();
          const job = jobData.job;
          
          if (!job) {
            throw new Error('فرآیند یافت نشد.');
          }
          
          setImportProgress(job.progress);
          setImportProgressMessage(
            job.status === 'processing' 
              ? `در حال پردازش داده‌ها و دانلود تصاویر (${job.progress}%)...` 
              : job.status === 'pending'
                ? 'در صف انتظار جهت پردازش...'
                : 'درحال تکمیل عملیات...'
          );
          
          if (job.status === 'completed') {
            jobCompleted = true;
            setImportResult(job.result?.message || 'عملیات درون‌ریزی با موفقیت به پایان رسید.');
            setImportStep('result');
          } else if (job.status === 'failed') {
            jobCompleted = true;
            throw new Error(job.error || 'عملیات درون‌ریزی با خطا مواجه شد.');
          }
        }
      } else {
        setImportResult(data.message || 'عملیات درون‌ریزی با موفقیت به پایان رسید.');
        setImportStep('result');
      }
      
      // Clear inputs
      setImportFile(null);
      setRawText('');
      const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (error: any) {
      console.error(error);
      setMessage({ type: 'error', text: error.message || 'خطا در ذخیره‌سازی داده‌ها رخ داد.' });
    } finally {
      setSaving(false);
    }
  };

  // Edit fields in preview
  const handleProductEdit = (index: number, field: keyof ParsedProduct, value: any) => {
    setPreviewProducts(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleCategoryEdit = (index: number, field: keyof ParsedCategory, value: any) => {
    setPreviewCategories(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  // Delete item from preview
  const handleDeleteProduct = (index: number) => {
    setPreviewProducts(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteCategory = (index: number) => {
    setPreviewCategories(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Page Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <span>درون‌ریزی و برون‌بری داده‌ها (Import / Export)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
            پشتیبان‌گیری، انتقال و بروزرسانی دسته‌جمعی محصولات، دسته‌بندی‌ها و تنظیمات فروشگاه
          </p>
        </div>
      </div>

      {/* Message Banner */}
      {message.text && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 select-none animate-slide-in ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-400' 
            : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-400'
        }`}>
          <div className="p-1 rounded-lg shrink-0">
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-black">
              {message.type === 'success' ? 'عملیات موفقیت‌آمیز' : 'بروز خطا'}
            </h4>
            <p className="text-[11px] font-bold leading-relaxed whitespace-pre-line">
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-sm">
        
        {/* Tab Navigation */}
        {importStep === 'upload' && (
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
            <button
              onClick={() => {
                setActiveTab('export');
                setMessage({ type: '', text: '' });
              }}
              className={`flex-1 py-4 px-6 text-center text-xs font-black transition-all border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'export'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>برون‌بری داده‌ها (Export)</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('import');
                setMessage({ type: '', text: '' });
              }}
              className={`flex-1 py-4 px-6 text-center text-xs font-black transition-all border-b-2 flex items-center justify-center gap-2 ${
                activeTab === 'import'
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 bg-white dark:bg-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileUp className="w-4 h-4" />
              <span>درون‌ریزی داده‌ها (Import)</span>
            </button>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 md:p-8">
          
          {/* EXPORT TAB */}
          {activeTab === 'export' && importStep === 'upload' && (
            <div className="space-y-6">
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/80 dark:border-blue-900/20 rounded-2xl p-4 flex gap-3">
                <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs font-bold text-blue-800 dark:text-blue-300 leading-relaxed">
                  <p>با استفاده از برون‌بری می‌توانید از اطلاعات فروشگاه خود نسخه پشتیبان تهیه کنید یا آن‌ها را به فروشگاه دیگری انتقال دهید.</p>
                  <p className="text-[10px] opacity-80 mt-1">نکته: فرمت JSON برای بک‌آپ کامل و انتقال بدون نقص (شامل تنوع‌ها، گالری تصاویر و...) توصیه می‌شود.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Export Type Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">نوع داده برای خروجی:</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setExportType('products');
                      }}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-2 ${
                        exportType === 'products'
                          ? 'border-blue-600 bg-blue-50/20 dark:border-blue-400 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Package className="w-5 h-5" />
                      <span className="text-xs font-black">محصولات</span>
                      <span className="text-[10px] opacity-70 font-bold">کالاها، قیمت‌ها و تنوع‌ها</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExportType('categories');
                      }}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-2 ${
                        exportType === 'categories'
                          ? 'border-blue-600 bg-blue-50/20 dark:border-blue-400 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                      <span className="text-xs font-black">دسته‌بندی‌ها</span>
                      <span className="text-[10px] opacity-70 font-bold">ساختار منو و دسته‌ها</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExportType('settings');
                        setExportFormat('json');
                      }}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-2 ${
                        exportType === 'settings'
                          ? 'border-blue-600 bg-blue-50/20 dark:border-blue-400 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Settings className="w-5 h-5" />
                      <span className="text-xs font-black">تنظیمات فروشگاه</span>
                      <span className="text-[10px] opacity-70 font-bold">درگاه‌ها، ظاهر و اطلاعات عمومی</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setExportType('full');
                        setExportFormat('json');
                      }}
                      className={`p-4 rounded-2xl border text-right transition-all flex flex-col gap-2 ${
                        exportType === 'full'
                          ? 'border-blue-600 bg-blue-50/20 dark:border-blue-400 dark:bg-blue-950/10 text-blue-700 dark:text-blue-400'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <Database className="w-5 h-5" />
                      <span className="text-xs font-black">پشتیبان کامل (Full Backup)</span>
                      <span className="text-[10px] opacity-70 font-bold">محصولات + دسته‌بندی‌ها + تنظیمات</span>
                    </button>
                  </div>
                </div>

                {/* Export Format Selection */}
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">فرمت فایل خروجی:</label>
                  <div className="space-y-3">
                    <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      exportFormat === 'json'
                        ? 'border-blue-600 bg-blue-50/10 dark:border-blue-400 dark:bg-blue-950/5'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="exportFormat"
                          value="json"
                          checked={exportFormat === 'json'}
                          onChange={() => setExportFormat('json')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-right">
                          <span className="block text-xs font-black text-slate-850 dark:text-white">فرمت استاندارد JSON</span>
                          <span className="block text-[10px] text-slate-400 font-bold mt-0.5">مناسب برای پشتیبان‌گیری کامل و انتقال بین سایت‌ها</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1 rounded-lg">JSON</span>
                    </label>

                    <label className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all ${
                      exportType === 'settings' || exportType === 'full'
                        ? 'opacity-50 pointer-events-none bg-slate-100 dark:bg-slate-950'
                        : exportFormat === 'csv'
                          ? 'border-blue-600 bg-blue-50/10 dark:border-blue-400 dark:bg-blue-950/5'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="exportFormat"
                          value="csv"
                          checked={exportFormat === 'csv'}
                          disabled={exportType === 'settings' || exportType === 'full'}
                          onChange={() => setExportFormat('csv')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div className="text-right">
                          <span className="block text-xs font-black text-slate-850 dark:text-white">فرمت اکسل CSV</span>
                          <span className="block text-[10px] text-slate-400 font-bold mt-0.5">مناسب برای ویرایش گروهی محصولات در اکسل یا گوگل‌شیت</span>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg">CSV</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>در حال تولید فایل...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>شروع برون‌بری و دانلود فایل</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* IMPORT TAB: STEP 1 - UPLOAD */}
          {activeTab === 'import' && importStep === 'upload' && (
            <form onSubmit={handleAnalyzeAndPreview} className="space-y-6">
              
              {/* Import Method Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-black text-slate-700 dark:text-slate-300">روش درون‌ریزی داده‌ها:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setImportMethod('standard');
                      setMessage({ type: '', text: '' });
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                      importMethod === 'standard'
                        ? 'border-blue-600 bg-blue-50/10 dark:border-blue-400 dark:bg-blue-950/5 text-blue-700 dark:text-blue-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <FileText className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-xs font-black">روش استاندارد (JSON / CSV)</span>
                      <span className="block text-[10px] opacity-70 font-bold mt-0.5">وارد کردن فایل‌های بک‌آپ با ساختار دقیق سیستم</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setImportMethod('ai');
                      setMessage({ type: '', text: '' });
                    }}
                    className={`p-4 rounded-2xl border text-right transition-all flex items-start gap-3 ${
                      importMethod === 'ai'
                        ? 'border-indigo-600 bg-indigo-50/10 dark:border-indigo-400 dark:bg-indigo-950/5 text-indigo-700 dark:text-indigo-400'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850/50 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <span className="block text-xs font-black flex items-center gap-1.5">
                        <span>درون‌ریزی هوشمند با هوش مصنوعی</span>
                        <span className="text-[8px] bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">جدید</span>
                      </span>
                      <span className="block text-[10px] opacity-70 font-bold mt-0.5">آنالیز، مرتب‌سازی و دسته‌بندی خودکار فایل‌ها یا متون نامرتب</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Info Banner */}
              {importMethod === 'ai' ? (
                <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/80 dark:border-indigo-900/20 rounded-2xl p-4 flex gap-3">
                  <Sparkles className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs font-bold text-indigo-800 dark:text-indigo-300 leading-relaxed">
                    <p>هوش مصنوعی به طور خودکار داده‌های ورودی شما را آنالیز کرده، مشخصات فنی و ویژگی‌ها را استخراج می‌کند و محصولات را در دسته‌بندی‌های مناسب قرار می‌دهد.</p>
                    <p className="text-[10px] opacity-80 mt-1">شما می‌توانید فایل‌های متنی، لیست‌های کپی شده از تلگرام/واتساپ، یا فایل‌های اکسل نامرتب را وارد کنید. سیستم به طور خودکار داده‌ها را برای جلوگیری از محدودیت توکن بخش‌بندی می‌کند.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100/80 dark:border-amber-900/20 rounded-2xl p-4 flex gap-3">
                  <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs font-bold text-amber-800 dark:text-amber-300 leading-relaxed">
                    <p>لطفاً در انتخاب نوع داده و فرمت فایل دقت کنید. سیستم ما مجهز به هدر یاب هوشمند و منعطف (Flexible Header Mapping) است و فایل‌های اکسل/CSV شما را با هر تایتلی به درستی شناسایی می‌کند.</p>
                    <p className="text-[10px] opacity-80 mt-1">هشدار: درون‌ریزی اشتباه ممکن است باعث به هم ریختگی اطلاعات شود. پیشنهاد می‌شود ابتدا یک بک‌آپ کامل تهیه کنید.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Import Config */}
                <div className="space-y-4">
                  {/* Standard-only Config */}
                  {importMethod === 'standard' && (
                    <>
                      {/* Import Type */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300">نوع داده ورودی:</label>
                        <select
                          value={importType}
                          onChange={(e) => {
                            const val = e.target.value as any;
                            setImportType(val);
                            if (val === 'settings' || val === 'full') {
                              setImportFormat('json');
                            }
                          }}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        >
                          <option value="products">محصولات (کالاها و تنوع‌ها)</option>
                          <option value="categories">دسته‌بندی‌های کاتالوگ</option>
                          <option value="settings">تنظیمات عمومی فروشگاه</option>
                          <option value="full">پشتیبان کامل (Full Backup)</option>
                        </select>
                      </div>

                      {/* Import Format */}
                      <div className="space-y-2">
                        <label className="block text-xs font-black text-slate-700 dark:text-slate-300">فرمت فایل ورودی:</label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                            <input
                              type="radio"
                              name="importFormat"
                              value="json"
                              checked={importFormat === 'json'}
                              onChange={() => setImportFormat('json')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>JSON (توصیه شده)</span>
                          </label>
                          <label className={`flex items-center gap-2 cursor-pointer text-xs font-bold ${
                            importType === 'settings' || importType === 'full' ? 'opacity-40 pointer-events-none' : ''
                          }`}>
                            <input
                              type="radio"
                              name="importFormat"
                              value="csv"
                              checked={importFormat === 'csv'}
                              disabled={importType === 'settings' || importType === 'full'}
                              onChange={() => setImportFormat('csv')}
                              className="text-blue-600 focus:ring-blue-500"
                            />
                            <span>CSV (اکسل)</span>
                          </label>
                        </div>
                      </div>
                    </>
                  )}

                  {/* AI-only Config */}
                  {importMethod === 'ai' && (
                    <div className="space-y-4">
                      {/* Download Images Toggle */}
                      <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950 bg-indigo-500/[0.02] flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="block text-xs font-black text-slate-850 dark:text-white flex items-center gap-1.5">
                            <ImageIcon className="w-4 h-4 text-indigo-500" />
                            <span>دانلود خودکار تصاویر محصول</span>
                          </span>
                          <span className="block text-[10px] text-slate-400 font-bold">دانلود تصاویر از آدرس‌های اینترنتی و ذخیره در گالری محلی</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={downloadImages}
                            onChange={(e) => setDownloadImages(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Conflict Resolution */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-700 dark:text-slate-300">نحوه برخورد با داده‌های تکراری:</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                        <input
                          type="radio"
                          name="conflictResolution"
                          value="skip"
                          checked={conflictResolution === 'skip'}
                          onChange={() => setConflictResolution('skip')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span>نادیده گرفتن (Skip)</span>
                          <span className="block text-[10px] text-slate-400 font-normal mt-0.5">اگر محصول یا دسته‌بندی با این نام یا شناسه وجود دارد، تغییر نکند.</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold mt-2">
                        <input
                          type="radio"
                          name="conflictResolution"
                          value="overwrite"
                          checked={conflictResolution === 'overwrite'}
                          onChange={() => setConflictResolution('overwrite')}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <span>بروزرسانی و جایگزینی (Overwrite)</span>
                          <span className="block text-[10px] text-slate-400 font-normal mt-0.5">اطلاعات جدید روی اطلاعات قبلی بازنویسی و بروزرسانی شوند.</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* File Upload Zone / Raw Text Input */}
                <div className="space-y-3">
                  <label className="block text-xs font-black text-slate-700 dark:text-slate-300">انتخاب فایل یا ورود متن:</label>
                  
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-6 text-center transition-all bg-slate-50/50 dark:bg-slate-950/10 flex flex-col items-center justify-center gap-2 min-h-[140px] relative">
                    <input
                      id="import-file-input"
                      type="file"
                      accept={importMethod === 'ai' ? '.json,.csv,.txt' : importFormat === 'json' ? '.json' : '.csv'}
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    />
                    <UploadCloud className="w-8 h-8 text-slate-400 dark:text-slate-600" />
                    {importFile ? (
                      <div className="space-y-1 z-20">
                        <p className="text-xs font-black text-blue-600 dark:text-blue-400">{importFile.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">حجم فایل: {(importFile.size / 1024).toFixed(1)} کیلوبایت</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300">فایل خود را به اینجا بکشید یا کلیک کنید</p>
                        <p className="text-[10px] text-slate-400 font-bold">
                          {importMethod === 'ai' ? 'فایل‌های متنی، اکسل یا جیسان (.json, .csv, .txt)' : `فقط فایل‌های با پسوند ${importFormat === 'json' ? '.json' : '.csv'}`}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Raw Text Area (AI Only) */}
                  {importMethod === 'ai' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-black text-slate-500 dark:text-slate-400">یا متن نامرتب خود را اینجا کپی کنید:</label>
                        {rawText.trim() && (
                          <button 
                            type="button" 
                            onClick={() => setRawText('')}
                            className="text-[10px] text-red-500 hover:text-red-600 font-bold"
                          >
                            پاک کردن متن
                          </button>
                        )}
                      </div>
                      <textarea
                        value={rawText}
                        onChange={(e) => {
                          setRawText(e.target.value);
                          if (e.target.value.trim()) {
                            setImportFile(null);
                            const fileInput = document.getElementById('import-file-input') as HTMLInputElement;
                            if (fileInput) fileInput.value = '';
                          }
                        }}
                        placeholder="مثال:&#10;کفش ورزشی نایک Pegasus 41&#10;قیمت: ۳,۸۰۰,۰۰۰ تومان&#10;رنگ‌های موجود: قرمز، آبی&#10;عکس محصول: https://images.nike.com/pegasus.jpg"
                        rows={4}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 placeholder:text-slate-400/70"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Import Button */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  type="submit"
                  disabled={analyzing || (!importFile && !rawText.trim())}
                  className={`w-full sm:w-auto px-8 py-3.5 text-white rounded-2xl font-black text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none ${
                    importMethod === 'ai' 
                      ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10'
                  }`}
                >
                  {analyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>{importMethod === 'ai' ? 'هوش مصنوعی در حال آنالیز داده‌ها...' : 'در حال آنالیز فایل...'}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>آنالیز و مشاهده پیش‌نمایش</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* IMPORT TAB: STEP 2 - PREVIEW & EDIT */}
          {activeTab === 'import' && importStep === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Eye className="w-5 h-5 text-indigo-500" />
                    <span>پیش‌نمایش و ویرایش نهایی داده‌های استخراج شده</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-1">
                    شما می‌توانید قبل از ذخیره‌سازی نهایی در دیتابیس، اطلاعات را بررسی، ویرایش یا برخی موارد را حذف کنید.
                  </p>
                </div>
                <button
                  onClick={() => setImportStep('upload')}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>بازگشت به آپلود</span>
                </button>
              </div>

              {saving && (
                <div className="mb-6 p-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-sm animate-pulse">
                  <div className="flex items-center justify-between text-xs font-black">
                    <span className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                      {importProgressMessage || 'در حال آماده‌سازی عملیات درون‌ریزی...'}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{importProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    لطفاً تب مرورگر خود را نبندید. تصاویر سنگین محصولات در پس‌زمینه توسط سرور دانلود، فشرده‌سازی و بهینه‌سازی می‌شوند.
                  </p>
                </div>
              )}

              {/* Settings Only Preview */}
              {isSettingsOnly && previewSettings && (
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Settings className="w-4 h-4 text-blue-500" />
                    <span>تنظیمات عمومی فروشگاه شناسایی شده</span>
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs font-bold">
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                      <span className="text-slate-400 block mb-1">نام فروشگاه:</span>
                      <span>{previewSettings.shopName || '---'}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                      <span className="text-slate-400 block mb-1">واحد پول:</span>
                      <span>{previewSettings.currency || '---'}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-150 dark:border-slate-850">
                      <span className="text-slate-400 block mb-1">زبان:</span>
                      <span>{previewSettings.language || '---'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Categories Preview */}
              {previewCategories.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Grid className="w-4 h-4 text-blue-500" />
                    <span>دسته‌بندی‌ها ({previewCategories.length} مورد)</span>
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs font-bold">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="p-3">نام دسته‌بندی</th>
                          <th className="p-3">اسلاگ (انگلیسی)</th>
                          <th className="p-3">توضیحات</th>
                          <th className="p-3 w-16 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {previewCategories.map((cat, index) => (
                          <tr key={`cat-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="p-2">
                              <input
                                type="text"
                                value={cat.name}
                                onChange={(e) => handleCategoryEdit(index, 'name', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 font-black"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={cat.slug || ''}
                                onChange={(e) => handleCategoryEdit(index, 'slug', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 text-left dir-ltr"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={cat.description || ''}
                                onChange={(e) => handleCategoryEdit(index, 'description', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5"
                                placeholder="توضیحاتی وارد نشده"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteCategory(index)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Products Preview */}
              {previewProducts.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Package className="w-4 h-4 text-blue-500" />
                    <span>محصولات ({previewProducts.length} مورد)</span>
                  </h4>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <table className="w-full text-right border-collapse text-xs font-bold">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-500">
                          <th className="p-3 w-16">تصویر</th>
                          <th className="p-3">عنوان محصول</th>
                          <th className="p-3">دسته‌بندی</th>
                          <th className="p-3 w-32">قیمت (تومان)</th>
                          <th className="p-3 w-20">موجودی</th>
                          <th className="p-3">توضیحات کوتاه</th>
                          <th className="p-3 w-16 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                        {previewProducts.map((prod, index) => (
                          <tr key={`prod-${index}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20">
                            <td className="p-2">
                              {prod.imageUrl ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 relative group">
                                  <img 
                                    src={prod.imageUrl} 
                                    alt={prod.title} 
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image';
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-slate-400">
                                  <ImageIcon className="w-5 h-5" />
                                </div>
                              )}
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={prod.title}
                                onChange={(e) => handleProductEdit(index, 'title', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 font-black"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={prod.categoryName || ''}
                                onChange={(e) => handleProductEdit(index, 'categoryName', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5"
                                placeholder="دسته‌بندی نشده"
                              />
                            </td>
                            <td className="p-2">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={prod.price}
                                  onChange={(e) => handleProductEdit(index, 'price', parseFloat(e.target.value) || 0)}
                                  className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 pl-6 text-left dir-ltr font-black"
                                />
                                <span className="absolute left-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">تومان</span>
                              </div>
                            </td>
                            <td className="p-2">
                              <input
                                type="number"
                                value={prod.stock}
                                onChange={(e) => handleProductEdit(index, 'stock', parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 text-center font-black"
                              />
                            </td>
                            <td className="p-2">
                              <input
                                type="text"
                                value={prod.description || ''}
                                onChange={(e) => handleProductEdit(index, 'description', e.target.value)}
                                className="w-full bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5"
                                placeholder="توضیحاتی وارد نشده"
                              />
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(index)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Preview Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {downloadImages && importMethod === 'ai' && (
                    <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                      <ImageIcon className="w-4 h-4" />
                      <span>تصاویر اینترنتی پس از تایید نهایی به صورت خودکار دانلود و بهینه‌سازی خواهند شد.</span>
                    </span>
                  )}
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setImportStep('upload')}
                    className="px-6 py-3 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-2xl text-xs font-black transition-all"
                  >
                    انصراف و بازگشت
                  </button>
                  <button
                    onClick={handleConfirmAndSave}
                    disabled={saving || (previewProducts.length === 0 && previewCategories.length === 0 && !previewSettings)}
                    className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {saving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>در حال ذخیره‌سازی داده‌ها...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>تایید و ذخیره‌سازی نهایی</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* IMPORT TAB: STEP 3 - RESULT */}
          {activeTab === 'import' && importStep === 'result' && (
            <div className="text-center py-12 space-y-6 max-w-md mx-auto">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">درون‌ریزی با موفقیت به پایان رسید!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed whitespace-pre-line">
                  {importResult}
                </p>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => {
                    setImportStep('upload');
                    setPreviewProducts([]);
                    setPreviewCategories([]);
                    setPreviewSettings(null);
                  }}
                  className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs shadow-md hover:shadow-lg hover:-translate-y-0.5 active:scale-98 transition-all"
                >
                  درون‌ریزی فایل جدید
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
