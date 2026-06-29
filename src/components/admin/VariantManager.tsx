'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Sparkles, Image as ImageIcon, Check, RefreshCw, Copy, Sliders, Search, Percent, Info, HelpCircle } from 'lucide-react';

interface Variant {
  id?: string;
  name: string;
  colorCode: string | null;
  imageUrl: string | null;
  price: string;
  stock: string;
  isDefault: boolean;
}

interface Attribute {
  name: string;
  values: string[];
}

interface VariantManagerProps {
  variants: Variant[];
  setVariants: (variants: Variant[]) => void;
  mainPrice: string;
  mainStock: string;
  onPickImage: (index: number) => void;
  imageUrl?: string; // main product image to show as fallback
}

const PRESETS = [
  {
    label: '🎨 رنگ‌های پرطرفدار',
    name: 'رنگ',
    values: ['مشکی', 'سفید', 'قرمز', 'آبی', 'طوسی', 'سبز'],
  },
  {
    label: '👔 سایز لباس',
    name: 'سایز',
    values: ['S', 'M', 'L', 'XL', 'XXL', '3XL'],
  },
  {
    label: '📱 حافظه موبایل',
    name: 'حافظه',
    values: ['128 گیگابایت', '256 گیگابایت', '512 گیگابایت', '1 ترابایت'],
  },
  {
    label: '💾 رم (RAM)',
    name: 'رم',
    values: ['4 گیگابایت', '8 گیگابایت', '12 گیگابایت', '16 گیگابایت'],
  },
  {
    label: '🛡️ گارانتی',
    name: 'گارانتی',
    values: ['بدون گارانتی', '۱۸ ماهه شرکتی', '۲۴ ماهه طلایی'],
  },
];

// Smart color-code mapping for Persian color names
const SMART_COLORS: Record<string, string> = {
  'مشکی': '#000000',
  'سیاه': '#000000',
  'سفید': '#FFFFFF',
  'قرمز': '#EF4444',
  'آبی': '#3B82F6',
  'سبز': '#22C55E',
  'زرد': '#EAB308',
  'طوسی': '#6B7280',
  'خاکستری': '#9CA3AF',
  'نارنجی': '#F97316',
  'بنفش': '#A855F7',
  'صورتی': '#EC4899',
  'قهوه‌ای': '#78350F',
  'طلایی': '#D97706',
  'نقره‌ای': '#9CA3AF',
  'سرمه‌ای': '#1E3A8A',
};

export default function VariantManager({
  variants,
  setVariants,
  mainPrice,
  mainStock,
  onPickImage,
  imageUrl,
}: VariantManagerProps) {
  // Tabs: 'list' (Variant list & Bulk edit) or 'generate' (Attribute generator)
  const [activeTab, setActiveTab] = useState<'list' | 'generate'>('list');

  // Generator states
  const [attributes, setAttributes] = useState<Attribute[]>([
    { name: 'رنگ', values: [] },
  ]);
  const [tagInputs, setTagInputs] = useState<string[]>(['']);

  // Bulk edit states
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkPercent, setBulkPercent] = useState('');
  const [percentType, setBulkPercentType] = useState<'increase' | 'decrease'>('increase');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-fill a preset attribute
  const applyPreset = (preset: typeof PRESETS[0]) => {
    // Check if attribute with this name already exists, otherwise find first empty or add new
    const existingIndex = attributes.findIndex((a) => a.name.trim() === preset.name);
    if (existingIndex > -1) {
      const updated = [...attributes];
      // Merge unique values
      updated[existingIndex].values = Array.from(new Set([...updated[existingIndex].values, ...preset.values]));
      setAttributes(updated);
    } else {
      // Find empty attribute or add
      const emptyIndex = attributes.findIndex((a) => !a.name.trim() && a.values.length === 0);
      if (emptyIndex > -1) {
        const updated = [...attributes];
        updated[emptyIndex] = { name: preset.name, values: preset.values };
        setAttributes(updated);
      } else {
        setAttributes([...attributes, { name: preset.name, values: preset.values }]);
        setTagInputs([...tagInputs, '']);
      }
    }
  };

  // Add a value tag
  const addTag = (attrIndex: number, value: string) => {
    const cleanValue = value.trim();
    if (!cleanValue) return;

    const updated = [...attributes];
    if (!updated[attrIndex].values.includes(cleanValue)) {
      updated[attrIndex].values.push(cleanValue);
      setAttributes(updated);
    }

    const updatedInputs = [...tagInputs];
    updatedInputs[attrIndex] = '';
    setTagInputs(updatedInputs);
  };

  // Remove a value tag
  const removeTag = (attrIndex: number, tagIndex: number) => {
    const updated = [...attributes];
    updated[attrIndex].values.splice(tagIndex, 1);
    setAttributes(updated);
  };

  // Generate Cartesian Product of Attributes
  const handleGenerate = (mode: 'replace' | 'append') => {
    const validAttributes = attributes.filter((a) => a.name.trim() && a.values.length > 0);
    if (validAttributes.length === 0) {
      alert('لطفاً حداقل یک ویژگی با مقادیر معتبر تعریف کنید.');
      return;
    }

    // Helper for cartesian product
    const cartesian = (sets: string[][]): string[][] => {
      return sets.reduce<string[][]>(
        (acc, set) => {
          const res: string[][] = [];
          acc.forEach((x) => {
            set.forEach((y) => {
              res.push([...x, y]);
            });
          });
          return res;
        },
        [[]]
      );
    };

    const valueSets = validAttributes.map((a) => a.values);
    const combinations = cartesian(valueSets);

    const generatedVariants: Variant[] = combinations.map((combo, idx) => {
      // Combos are joined by ' - '
      const name = combo.join(' - ');
      
      // Auto-detect color code from name
      let detectedColor: string | null = null;
      for (const [colorName, hex] of Object.entries(SMART_COLORS)) {
        if (name.includes(colorName)) {
          detectedColor = hex;
          break;
        }
      }

      return {
        name,
        colorCode: detectedColor,
        imageUrl: null,
        price: mainPrice || '0',
        stock: mainStock || '0',
        isDefault: false,
      };
    });

    if (generatedVariants.length === 0) return;

    if (mode === 'replace') {
      // Set the first one as default
      generatedVariants[0].isDefault = true;
      setVariants(generatedVariants);
    } else {
      // Append mode: filter duplicates by name
      const existingNames = variants.map((v) => v.name);
      const uniqueNew = generatedVariants.filter((v) => !existingNames.includes(v.name));
      if (uniqueNew.length === 0) {
        alert('تمامی ترکیب‌های تولید شده از قبل وجود دارند.');
        return;
      }
      
      const merged = [...variants, ...uniqueNew];
      // Ensure at least one default variant exists
      if (!merged.some((v) => v.isDefault)) {
        merged[0].isDefault = true;
      }
      setVariants(merged);
    }

    // Switch to list view
    setActiveTab('list');
  };

  // Bulk Edit Actions
  const applyBulkPrice = () => {
    if (!bulkPrice || isNaN(Number(bulkPrice))) return;
    const updated = variants.map((v) => ({ ...v, price: bulkPrice }));
    setVariants(updated);
    setBulkPrice('');
  };

  const applyBulkStock = () => {
    if (!bulkStock || isNaN(Number(bulkStock))) return;
    const updated = variants.map((v) => ({ ...v, stock: bulkStock }));
    setVariants(updated);
    setBulkStock('');
  };

  const applyBulkPercent = () => {
    const percent = parseFloat(bulkPercent);
    if (isNaN(percent) || percent <= 0) return;

    const updated = variants.map((v) => {
      const currentPrice = parseFloat(v.price) || 0;
      let newPrice = currentPrice;
      if (percentType === 'increase') {
        newPrice = Math.round(currentPrice * (1 + percent / 100));
      } else {
        newPrice = Math.round(currentPrice * (1 - percent / 100));
      }
      return { ...v, price: Math.max(0, newPrice).toString() };
    });

    setVariants(updated);
    setBulkPercent('');
  };

  const copyFromMainProduct = () => {
    const updated = variants.map((v) => ({
      ...v,
      price: mainPrice || v.price,
      stock: mainStock || v.stock,
    }));
    setVariants(updated);
  };

  const clearAllVariants = () => {
    if (confirm('آیا از حذف تمامی تنوع‌ها اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      setVariants([]);
    }
  };

  // Filtered variants
  const filteredVariants = variants.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-6 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            سیستم پیشرفته مدیریت تنوع‌ها (رنگ، سایز، حافظه و ...)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            تنوع‌های محصول خود را به صورت تکی تعریف کنید یا با ابزار هوشمند در چند ثانیه صدها مدل ترکیب بسازید.
            در صورت ثبت تنوع، قیمت و موجودی کل محصول از تنوع پیش‌فرض یا تنوع انتخابی کاربر خوانده می‌شود.
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl self-start lg:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'list'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            📋 لیست تنوع‌ها ({variants.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('generate')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'generate'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
            تولید هوشمند چندسطحی
          </button>
        </div>
      </div>

      {/* GENERATOR TAB */}
      {activeTab === 'generate' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Preset templates */}
          <div>
            <span className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">
              ⚡ قالب‌های آماده تنوع (کلیک برای ایجاد سریع):
            </span>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-xs font-medium text-gray-700 dark:text-gray-300 rounded-xl transition-all"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Attributes List */}
          <div className="space-y-4">
            {attributes.map((attr, attrIdx) => (
              <div
                key={attrIdx}
                className="p-4 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 space-y-3 relative group"
              >
                {/* Delete Attribute Button */}
                <button
                  type="button"
                  onClick={() => {
                    const updated = attributes.filter((_, idx) => idx !== attrIdx);
                    const updatedInputs = tagInputs.filter((_, idx) => idx !== attrIdx);
                    setAttributes(updated.length > 0 ? updated : [{ name: '', values: [] }]);
                    setTagInputs(updatedInputs.length > 0 ? updatedInputs : ['']);
                  }}
                  className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="حذف این ویژگی"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Name */}
                  <div className="md:col-span-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      عنوان ویژگی (مثلاً سایز یا رنگ)
                    </label>
                    <input
                      type="text"
                      placeholder="مانند: رنگ، سایز، جنس"
                      value={attr.name}
                      onChange={(e) => {
                        const updated = [...attributes];
                        updated[attrIdx].name = e.target.value;
                        setAttributes(updated);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tag Input */}
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      مقادیر این ویژگی
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="مقدار را بنویسید و Enter بزنید"
                        value={tagInputs[attrIdx] || ''}
                        onChange={(e) => {
                          const updated = [...tagInputs];
                          updated[attrIdx] = e.target.value;
                          setTagInputs(updated);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTag(attrIdx, tagInputs[attrIdx]);
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => addTag(attrIdx, tagInputs[attrIdx])}
                        className="px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-semibold border border-blue-200/50 dark:border-blue-900/30 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Values Tags */}
                {attr.values.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {attr.values.map((val, valIdx) => (
                      <span
                        key={valIdx}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-800 dark:text-gray-200 rounded-full shadow-sm"
                      >
                        {val}
                        <button
                          type="button"
                          onClick={() => removeTag(attrIdx, valIdx)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add Attribute Button */}
          <button
            type="button"
            onClick={() => {
              setAttributes([...attributes, { name: '', values: [] }]);
              setTagInputs([...tagInputs, '']);
            }}
            className="w-full py-2.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-500 hover:text-blue-500 hover:border-blue-500 dark:hover:text-blue-400 dark:hover:border-blue-800 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all flex items-center justify-center gap-1"
          >
            <Plus className="w-4 h-4" />
            افزودن ویژگی جدید (مثلاً سایز، جنس، گارانتی)
          </button>

          {/* Actions panel */}
          <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/30 dark:border-amber-900/20 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300">
                  توضیح ترکیب تنوع‌ها:
                </h4>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                  سیستم به صورت هوشمند ضرب دکارتی ویژگی‌های بالا را محاسبه کرده و ترکیب‌ها را می‌سازد.
                  به عنوان مثال، ۲ رنگ و ۳ سایز منجر به ساخت ۶ ترکیب تنوع متمایز و مجزا خواهد شد.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => handleGenerate('append')}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl text-xs font-bold transition-all"
              >
                ➕ اضافه کردن به تنوع‌های قبلی
              </button>
              <button
                type="button"
                onClick={() => handleGenerate('replace')}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all flex items-center gap-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                ⚡ جایگزینی و بازسازی کامل تنوع‌ها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIST & BULK EDIT TAB */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* BULK EDIT PANEL */}
          {variants.length > 0 && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800 rounded-2xl">
              <div className="flex items-center gap-2 mb-3">
                <Sliders className="w-4 h-4 text-blue-500" />
                <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  ⚡ پنل عملیات گروهی (ویرایش همزمان تمامی تنوع‌ها)
                </h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                {/* Price apply */}
                <div className="bg-white dark:bg-gray-950 p-3 rounded-xl border border-gray-200/60 dark:border-gray-800">
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    تنظیم قیمت یکسان (تومان)
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="قیمت"
                      value={bulkPrice}
                      onChange={(e) => setBulkPrice(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={applyBulkPrice}
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                    >
                      اعمال
                    </button>
                  </div>
                </div>

                {/* Stock apply */}
                <div className="bg-white dark:bg-gray-950 p-3 rounded-xl border border-gray-200/60 dark:border-gray-800">
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    تنظیم موجودی یکسان
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="موجودی"
                      value={bulkStock}
                      onChange={(e) => setBulkStock(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={applyBulkStock}
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                    >
                      اعمال
                    </button>
                  </div>
                </div>

                {/* Percentage Price Adjust */}
                <div className="bg-white dark:bg-gray-950 p-3 rounded-xl border border-gray-200/60 dark:border-gray-800">
                  <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                    تغییر قیمت گروهی (درصدی)
                  </label>
                  <div className="flex gap-1.5">
                    <select
                      value={percentType}
                      onChange={(e: any) => setBulkPercentType(e.target.value)}
                      className="px-1 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-[10px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-gray-300 shrink-0"
                    >
                      <option value="increase">📈 افزایش</option>
                      <option value="decrease">📉 کاهش</option>
                    </select>
                    <input
                      type="number"
                      placeholder="درصد"
                      value={bulkPercent}
                      onChange={(e) => setBulkPercent(e.target.value)}
                      className="w-full px-2 py-1.5 border border-gray-200 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                    />
                    <button
                      type="button"
                      onClick={applyBulkPercent}
                      className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shrink-0"
                    >
                      % اعمال
                    </button>
                  </div>
                </div>

                {/* Quick copy / Clear buttons */}
                <div className="flex flex-col gap-1.5 justify-end">
                  <button
                    type="button"
                    onClick={copyFromMainProduct}
                    className="w-full py-1.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 border border-gray-200/50 dark:border-gray-700"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    کپی از قیمت و موجودی اصلی محصول
                  </button>
                  <button
                    type="button"
                    onClick={clearAllVariants}
                    className="w-full py-1.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 border border-red-100 dark:border-red-900/30"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    پاک‌سازی و حذف کل تنوع‌ها
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SEARCH & MANUALLY ADD ONE */}
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            {variants.length > 0 ? (
              <div className="relative w-full md:w-80">
                <Search className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                <input
                  type="text"
                  placeholder="جستجو در میان تنوع‌ها..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-3 pr-9 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={() => {
                setVariants([
                  ...variants,
                  {
                    name: '',
                    colorCode: null,
                    imageUrl: null,
                    price: mainPrice || '0',
                    stock: mainStock || '0',
                    isDefault: variants.length === 0,
                  },
                ]);
              }}
              className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/30 px-3.5 py-2 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-950/60 transition-colors shrink-0 flex items-center gap-1.5 font-bold self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              + افزودن تنوع به صورت تکی
            </button>
          </div>

          {/* VARIANT GRID/LIST */}
          <div className="space-y-3.5">
            {filteredVariants.map((v, i) => {
              // Map overall index because we are sorting/filtering
              const originalIndex = variants.findIndex((x) => x === v);
              if (originalIndex === -1) return null;

              return (
                <div
                  key={originalIndex}
                  className="flex flex-wrap lg:flex-nowrap gap-4 items-center p-4 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30 hover:bg-white dark:hover:bg-gray-800/60 transition-all shadow-sm"
                >
                  {/* Image Picker */}
                  <div className="w-16 h-16 rounded-xl border border-gray-200/80 dark:border-gray-700 overflow-hidden shrink-0 bg-white dark:bg-gray-950 relative group flex items-center justify-center">
                    {v.imageUrl ? (
                      <>
                        <img src={v.imageUrl} alt="Variant" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...variants];
                            updated[originalIndex].imageUrl = null;
                            setVariants(updated);
                          }}
                          className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-semibold"
                        >
                          حذف عکس
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onPickImage(originalIndex)}
                        className="w-full h-full text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex flex-col items-center justify-center gap-1"
                        title="انتخاب عکس برای تنوع"
                      >
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[9px]">انتخاب عکس</span>
                      </button>
                    )}
                  </div>

                  {/* Name field */}
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      عنوان تنوع (مانند: قرمز یا مشکی - XL)
                    </label>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[originalIndex].name = e.target.value;
                        setVariants(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  {/* Color Selector */}
                  <div className="w-full sm:w-auto shrink-0 bg-white dark:bg-gray-950 p-2 rounded-xl border border-gray-100 dark:border-gray-800/80">
                    <label className="block text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      کد رنگ (اختیاری)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={v.colorCode || '#000000'}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[originalIndex].colorCode = e.target.value;
                          setVariants(updated);
                        }}
                        disabled={v.colorCode === null}
                        className={`h-8 w-8 rounded-lg cursor-pointer border-0 p-0 ${
                          v.colorCode === null ? 'opacity-30 cursor-not-allowed' : ''
                        }`}
                      />
                      {v.colorCode === null ? (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...variants];
                            // Try auto-detect color first, or default to black
                            let hex = '#000000';
                            for (const [colorName, colorHex] of Object.entries(SMART_COLORS)) {
                              if (v.name.includes(colorName)) {
                                hex = colorHex;
                                break;
                              }
                            }
                            updated[originalIndex].colorCode = hex;
                            setVariants(updated);
                          }}
                          className="text-[10px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-md transition-colors"
                        >
                          + افزودن رنگ
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...variants];
                            updated[originalIndex].colorCode = null;
                            setVariants(updated);
                          }}
                          className="text-[10px] text-gray-500 hover:text-red-500 font-bold px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                        >
                          حذف رنگ
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="w-full sm:w-44 shrink-0">
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      قیمت (تومان)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={v.price}
                        onChange={(e) => {
                          const updated = [...variants];
                          updated[originalIndex].price = e.target.value;
                          setVariants(updated);
                        }}
                        className="w-full pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                      />
                      <span className="absolute left-2.5 top-2 text-[9px] text-gray-400 font-medium">تومان</span>
                    </div>
                  </div>

                  {/* Stock */}
                  <div className="w-full sm:w-28 shrink-0">
                    <label className="block text-[10px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      موجودی انبار
                    </label>
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => {
                        const updated = [...variants];
                        updated[originalIndex].stock = e.target.value;
                        setVariants(updated);
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                    />
                  </div>

                  {/* Default Radio */}
                  <div className="flex flex-col items-center justify-center bg-white dark:bg-gray-950 p-2 rounded-xl border border-gray-100 dark:border-gray-800/80 shrink-0 select-none cursor-pointer">
                    <label className="block text-[9px] font-semibold text-gray-500 dark:text-gray-400 mb-1">
                      پیش‌فرض
                    </label>
                    <input
                      type="radio"
                      name="default_variant"
                      checked={!!v.isDefault}
                      onChange={() => {
                        const updated = variants.map((item, idx) => ({
                          ...item,
                          isDefault: idx === originalIndex,
                        }));
                        setVariants(updated);
                      }}
                      className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </div>

                  {/* Delete individual variant */}
                  <button
                    type="button"
                    onClick={() => {
                      const updated = variants.filter((_, idx) => idx !== originalIndex);
                      // If deleted one was default, make the first one of remaining default
                      if (v.isDefault && updated.length > 0) {
                        updated[0].isDefault = true;
                      }
                      setVariants(updated);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all self-end lg:self-center shrink-0 w-full sm:w-auto flex justify-center"
                    title="حذف این تنوع"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {filteredVariants.length === 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/20 dark:bg-gray-950/10">
                {searchQuery ? 'هیچ تنوعی با عبارت جستجو شده یافت نشد.' : 'تنوعی برای این محصول ثبت نشده است.'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
