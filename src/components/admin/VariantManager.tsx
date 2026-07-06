'use client';

import { useState, useEffect } from 'react';
import { Trash2, Plus, Sparkles, Image as ImageIcon, Check, RefreshCw, Copy, Sliders, Search, Info, Folder, ChevronDown, ChevronRight, Settings, Edit3 } from 'lucide-react';

interface Variant {
  id?: string;
  name: string;
  colorCode: string | null;
  imageUrl: string | null;
  price: string;
  stock: string;
  isDefault: boolean;
  sku?: string | null;
  optionsJson?: string | null;
}

interface VariantManagerProps {
  variants: Variant[];
  setVariants: (variants: Variant[]) => void;
  mainPrice: string;
  mainStock: string;
  onPickImage: (index: number) => void;
  imageUrl?: string; // main product image to show as fallback
}

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
}: VariantManagerProps) {
  // Active levels of the variant hierarchy (e.g., ['رنگ', 'حافظه'])
  const [levels, setLevels] = useState<string[]>(['رنگ', 'حافظه']);
  const [newLevelName, setNewLevelName] = useState('');
  const [showLevelSettings, setShowLevelSettings] = useState(false);

  // Bulk edit states
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkStock, setBulkStock] = useState('');
  const [bulkPercent, setBulkPercent] = useState('');
  const [percentType, setBulkPercentType] = useState<'increase' | 'decrease'>('increase');

  // Search filter
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-detect levels from existing variants on mount
  useEffect(() => {
    if (variants.length > 0) {
      const detectedKeys = new Set<string>();
      variants.forEach((v) => {
        if (v.optionsJson) {
          try {
            const obj = JSON.parse(v.optionsJson);
            Object.keys(obj).forEach((k) => detectedKeys.add(k));
          } catch (e) {}
        }
      });
      if (detectedKeys.size > 0) {
        setLevels(Array.from(detectedKeys));
      } else {
        // Fallback to separator detection
        const hasSeparator = variants.some((v) => v.name.includes(' - '));
        if (hasSeparator) {
          setLevels(['رنگ', 'سایز']);
        } else {
          setLevels(['ویژگی']);
        }
      }
    }
  }, [variants]);

  // Add a new hierarchical level
  const handleAddLevel = () => {
    const name = newLevelName.trim();
    if (!name) return;
    if (levels.includes(name)) {
      alert('این سطح از قبل وجود دارد.');
      return;
    }
    const updatedLevels = [...levels, name];
    setLevels(updatedLevels);
    setNewLevelName('');

    // Update all existing variants to include this new level as "تعیین نشده"
    const updatedVariants = variants.map((v) => {
      let options: Record<string, string> = {};
      try {
        options = JSON.parse(v.optionsJson || '{}');
      } catch (e) {}
      options[name] = 'تعیین نشده';
      return {
        ...v,
        name: [...Object.values(options)].join(' - '),
        optionsJson: JSON.stringify(options),
      };
    });
    setVariants(updatedVariants);
  };

  // Remove a hierarchical level
  const handleRemoveLevel = (index: number) => {
    if (levels.length <= 1) {
      alert('حداقل باید یک سطح ویژگی وجود داشته باشد.');
      return;
    }
    const removedKey = levels[index];
    if (!confirm(`آیا از حذف سطح "${removedKey}" اطمینان دارید؟ این کار گزینه‌های این سطح را از تمامی تنوع‌ها حذف می‌کند.`)) {
      return;
    }

    const updatedLevels = levels.filter((_, i) => i !== index);
    setLevels(updatedLevels);

    const updatedVariants = variants.map((v) => {
      let options: Record<string, string> = {};
      try {
        options = JSON.parse(v.optionsJson || '{}');
      } catch (e) {}
      delete options[removedKey];
      return {
        ...v,
        name: updatedLevels.map((l) => options[l]).filter(Boolean).join(' - '),
        optionsJson: JSON.stringify(options),
      };
    });
    setVariants(updatedVariants);
  };

  // Add a new node/branch to the tree
  const handleAddNode = (levelIndex: number, parentFilters: Record<string, string>) => {
    const key = levels[levelIndex];
    const newVal = prompt(`لطفاً مقدار جدید برای "${key}" را وارد کنید:`);
    if (!newVal || !newVal.trim()) return;

    const cleanVal = newVal.trim();
    const options: Record<string, string> = { ...parentFilters, [key]: cleanVal };

    // Auto-fill deeper levels with "تعیین نشده"
    for (let i = levelIndex + 1; i < levels.length; i++) {
      options[levels[i]] = 'تعیین نشده';
    }

    const name = levels.map((l) => options[l]).filter(Boolean).join(' - ');

    // Check if this exact combination already exists
    const exists = variants.some((v) => {
      try {
        const obj = JSON.parse(v.optionsJson || '{}');
        return levels.every((l) => obj[l] === options[l]);
      } catch (e) {
        return false;
      }
    });

    if (exists) {
      alert('این ترکیب از قبل وجود دارد!');
      return;
    }

    const newVariant: Variant = {
      name,
      colorCode: key === 'رنگ' ? (SMART_COLORS[cleanVal] || null) : null,
      imageUrl: null,
      price: mainPrice || '0',
      stock: mainStock || '0',
      isDefault: variants.length === 0,
      sku: null,
      optionsJson: JSON.stringify(options),
    };

    setVariants([...variants, newVariant]);
  };

  // Rename an option value across all matching variants
  const handleRenameNode = (levelIndex: number, parentFilters: Record<string, string>, oldVal: string) => {
    const key = levels[levelIndex];
    const newVal = prompt(`تغییر نام "${oldVal}" به:`, oldVal);
    if (!newVal || !newVal.trim() || newVal.trim() === oldVal) return;

    const cleanVal = newVal.trim();

    const updated = variants.map((v) => {
      let options: Record<string, string> = {};
      try {
        options = JSON.parse(v.optionsJson || '{}');
      } catch (e) {}

      const matchesParent = Object.entries(parentFilters).every(([k, val]) => options[k] === val);
      if (matchesParent && options[key] === oldVal) {
        options[key] = cleanVal;
        const newName = levels.map((l) => options[l]).filter(Boolean).join(' - ');
        return {
          ...v,
          name: newName,
          colorCode: key === 'رنگ' && v.colorCode === SMART_COLORS[oldVal] ? (SMART_COLORS[cleanVal] || null) : v.colorCode,
          optionsJson: JSON.stringify(options),
        };
      }
      return v;
    });
    setVariants(updated);
  };

  // Delete an option value and all its nested variants
  const handleDeleteNode = (levelIndex: number, parentFilters: Record<string, string>, val: string) => {
    const key = levels[levelIndex];
    if (!confirm(`آیا از حذف "${val}" و تمامی تنوع‌های زیرمجموعه آن اطمینان دارید؟`)) {
      return;
    }

    const updated = variants.filter((v) => {
      let options: Record<string, string> = {};
      try {
        options = JSON.parse(v.optionsJson || '{}');
      } catch (e) {}

      const matchesParent = Object.entries(parentFilters).every(([k, filterVal]) => options[k] === filterVal);
      return !(matchesParent && options[key] === val);
    });

    // Ensure at least one default variant remains
    if (updated.length > 0 && !updated.some((v) => v.isDefault)) {
      updated[0].isDefault = true;
    }
    setVariants(updated);
  };

  // Update a single field of a leaf variant
  const handleUpdateLeaf = (variantIndex: number, field: keyof Variant, value: any) => {
    const updated = [...variants];
    updated[variantIndex] = {
      ...updated[variantIndex],
      [field]: value,
    };
    setVariants(updated);
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

  const markFirstAvailableAsDefault = () => {
    const inStockIndex = variants.findIndex((v) => parseInt(v.stock) > 0);
    const targetIndex = inStockIndex > -1 ? inStockIndex : 0;
    if (variants.length > 0) {
      const updated = variants.map((v, idx) => ({
        ...v,
        isDefault: idx === targetIndex,
      }));
      setVariants(updated);
    }
  };

  // Parse options for robust rendering
  const parsedVariants = variants.map((v, idx) => {
    let options: Record<string, string> = {};
    if (v.optionsJson) {
      try {
        options = JSON.parse(v.optionsJson);
      } catch (e) {}
    }
    // Fallback if optionsJson is missing
    if (Object.keys(options).length === 0) {
      const parts = v.name.split(' - ').map((p) => p.trim());
      levels.forEach((lvl, lIdx) => {
        options[lvl] = parts[lIdx] || 'تعیین نشده';
      });
    }
    return { ...v, options, originalIndex: idx };
  });

  // Filter variants based on search query
  const filteredParsedVariants = parsedVariants.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Recursive tree renderer
  const renderTree = (levelIndex: number, parentFilters: Record<string, string>) => {
    const currentKey = levels[levelIndex];
    if (!currentKey) return null;

    // Get unique values for the current level matching parent filters
    const uniqueValues = Array.from(
      new Set(
        filteredParsedVariants
          .filter((v) =>
            Object.entries(parentFilters).every(([pk, pval]) => v.options[pk] === pval)
          )
          .map((v) => v.options[currentKey] || 'تعیین نشده')
      )
    );

    const isLeafLevel = levelIndex === levels.length - 1;

    return (
      <div className="space-y-4 mr-4 border-r-2 border-gray-100 dark:border-gray-800 pr-4 mt-2">
        {uniqueValues.map((val) => {
          const currentFilters = { ...parentFilters, [currentKey]: val };

          if (isLeafLevel) {
            // Find the exact variant matching this complete path
            const leafVariant = filteredParsedVariants.find((v) =>
              levels.every((l) => v.options[l] === currentFilters[l])
            );

            if (!leafVariant) return null;

            return (
              <div
                key={leafVariant.originalIndex}
                className="flex flex-wrap lg:flex-nowrap gap-4 items-center p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-950 hover:shadow-sm transition-all"
              >
                {/* Image Picker */}
                <div className="w-12 h-12 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-900 relative group flex items-center justify-center">
                  {leafVariant.imageUrl ? (
                    <>
                      <img src={leafVariant.imageUrl} alt="Variant" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleUpdateLeaf(leafVariant.originalIndex, 'imageUrl', null)}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-bold"
                      >
                        حذف
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onPickImage(leafVariant.originalIndex)}
                      className="w-full h-full text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all flex flex-col items-center justify-center"
                      title="انتخاب عکس"
                    >
                      <ImageIcon className="w-4 h-4" />
                      <span className="text-[8px] mt-0.5">عکس</span>
                    </button>
                  )}
                </div>

                {/* Leaf Title Value */}
                <div className="flex-1 min-w-[120px]">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-gray-800 dark:text-white">
                      {val}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRenameNode(levelIndex, parentFilters, val)}
                      className="text-gray-400 hover:text-blue-500 transition-colors"
                      title="تغییر نام"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="text-[9px] text-gray-400 block mt-0.5">
                    {Object.entries(parentFilters)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(' | ')}
                  </span>
                </div>

                {/* SKU */}
                <div className="w-full sm:w-28 shrink-0">
                  <input
                    type="text"
                    placeholder="شناسه کالا (SKU)"
                    value={leafVariant.sku || ''}
                    onChange={(e) => handleUpdateLeaf(leafVariant.originalIndex, 'sku', e.target.value || null)}
                    className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Color Selector (only if key is color) */}
                {currentKey.includes('رنگ') && (
                  <div className="flex items-center gap-1.5 shrink-0 bg-gray-50 dark:bg-gray-900/50 p-1.5 rounded-lg border border-gray-100 dark:border-gray-800">
                    <input
                      type="color"
                      value={leafVariant.colorCode || '#000000'}
                      onChange={(e) => handleUpdateLeaf(leafVariant.originalIndex, 'colorCode', e.target.value)}
                      disabled={leafVariant.colorCode === null}
                      className={`h-6 w-6 rounded cursor-pointer border-0 p-0 ${
                        leafVariant.colorCode === null ? 'opacity-30 cursor-not-allowed' : ''
                      }`}
                    />
                    {leafVariant.colorCode === null ? (
                      <button
                        type="button"
                        onClick={() => handleUpdateLeaf(leafVariant.originalIndex, 'colorCode', SMART_COLORS[val] || '#000000')}
                        className="text-[9px] text-blue-600 hover:text-blue-700 dark:text-blue-400 font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 rounded transition-colors"
                      >
                        + رنگ
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleUpdateLeaf(leafVariant.originalIndex, 'colorCode', null)}
                        className="text-[9px] text-gray-400 hover:text-red-500 font-bold px-1.5 py-0.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                      >
                        حذف
                      </button>
                    )}
                  </div>
                )}

                {/* Price */}
                <div className="w-full sm:w-36 shrink-0">
                  <div className="relative">
                    <input
                      type="number"
                      value={leafVariant.price}
                      onChange={(e) => handleUpdateLeaf(leafVariant.originalIndex, 'price', e.target.value)}
                      className="w-full pl-8 pr-2.5 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                      min="0"
                    />
                    <span className="absolute left-2 top-1.5 text-[9px] text-gray-400 font-medium">تومان</span>
                  </div>
                </div>

                {/* Stock */}
                <div className="w-full sm:w-20 shrink-0">
                  <input
                    type="number"
                    value={leafVariant.stock}
                    onChange={(e) => handleUpdateLeaf(leafVariant.originalIndex, 'stock', e.target.value)}
                    className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-lg text-xs font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>

                {/* Default Radio */}
                <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded-lg border border-gray-100 dark:border-gray-800 shrink-0 select-none cursor-pointer">
                  <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400">پیش‌فرض</span>
                  <input
                    type="radio"
                    name="default_variant"
                    checked={!!leafVariant.isDefault}
                    onChange={() => {
                      const updated = variants.map((item, idx) => ({
                        ...item,
                        isDefault: idx === leafVariant.originalIndex,
                      }));
                      setVariants(updated);
                    }}
                    className="h-3.5 w-3.5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {/* Delete individual variant */}
                <button
                  type="button"
                  onClick={() => handleDeleteNode(levelIndex, parentFilters, val)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all shrink-0"
                  title="حذف تنوع"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          }

          // Branch Node
          return (
            <div
              key={val}
              className="p-4 border border-gray-100 dark:border-gray-800 rounded-2xl bg-gray-50/30 dark:bg-gray-900/10 space-y-2"
            >
              {/* Branch Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800/60 pb-2">
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
                    {currentKey}:
                  </span>
                  <span className="text-xs font-black text-gray-800 dark:text-white bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg">
                    {val}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRenameNode(levelIndex, parentFilters, val)}
                    className="text-gray-400 hover:text-blue-500 transition-colors"
                    title="تغییر نام"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAddNode(levelIndex + 1, currentFilters)}
                    className="text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    افزودن {levels[levelIndex + 1]} برای {val}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteNode(levelIndex, parentFilters, val)}
                    className="text-gray-400 hover:text-red-500 p-1 hover:bg-red-50 dark:hover:bg-red-950/10 rounded"
                    title="حذف شاخه"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Recursive Child Nodes */}
              {renderTree(levelIndex + 1, currentFilters)}
            </div>
          );
        })}

        {/* Add Node Button at current level */}
        <button
          type="button"
          onClick={() => handleAddNode(levelIndex, parentFilters)}
          className="py-2 px-3 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl text-[10px] font-bold text-gray-400 hover:text-blue-500 hover:border-blue-500 dark:hover:text-blue-400 transition-all flex items-center gap-1 self-start"
        >
          <Plus className="w-3.5 h-3.5" />
          افزودن {currentKey} جدید
        </button>
      </div>
    );
  };

  // Summary calculations
  const totalVariants = variants.length;
  const totalStock = variants.reduce((sum, v) => sum + (parseInt(v.stock) || 0), 0);
  const prices = variants.map((v) => parseFloat(v.price) || 0).filter((p) => p > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
  const defaultVariant = variants.find((v) => v.isDefault);

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-blue-500" />
            سیستم شرطی و پیشرفته مدیریت تنوع‌ها (رنگ، سایز، حافظه و ...)
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">
            تنوع‌های محصول خود را به صورت درختی و شرطی تعریف کنید. مثلاً رنگ سفید فقط حافظه ۲۵۶ و ۵۱۲ داشته باشد و رنگ قرمز فقط ۲۵۶ گیگابایت.
            قیمت و موجودی هر ترکیب را به صورت مجزا مشخص کنید.
          </p>
        </div>

        {/* Settings Toggle */}
        <button
          type="button"
          onClick={() => setShowLevelSettings(!showLevelSettings)}
          className="px-3.5 py-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold border border-gray-200/50 dark:border-gray-700 transition-all flex items-center gap-1.5"
        >
          <Settings className="w-4 h-4 text-gray-500" />
          تنظیم سطوح ویژگی‌ها ({levels.length} سطح)
        </button>
      </div>

      {/* LEVEL SETTINGS PANEL */}
      {showLevelSettings && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800 rounded-2xl space-y-4 animate-fadeIn">
          <div>
            <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-blue-500" />
              تنظیم سطوح درخت تنوع (مثال: سطح ۱: رنگ، سطح ۲: حافظه)
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">
              ترتیب سطوح درخت تنوع را مشخص کنید. حذف یک سطح گزینه‌های آن سطح را از تمامی تنوع‌ها پاک می‌کند.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {levels.map((lvl, idx) => (
              <div
                key={lvl}
                className="flex items-center gap-2 bg-white dark:bg-gray-950 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-800"
              >
                <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 px-1.5 py-0.5 rounded font-bold">
                  سطح {idx + 1}
                </span>
                <span className="text-xs font-bold text-gray-800 dark:text-white">{lvl}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveLevel(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                  title="حذف سطح"
                >
                  &times;
                </button>
              </div>
            ))}

            {/* Add Level Form */}
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="عنوان سطح جدید (مثال: گارانتی)"
                value={newLevelName}
                onChange={(e) => setNewLevelName(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleAddLevel}
                className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                + افزودن سطح
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY CARD */}
      {variants.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-blue-50/30 dark:bg-blue-950/10 border border-blue-100/50 dark:border-blue-900/20 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold mb-1">تعداد تنوع‌ها</span>
            <span className="text-sm font-black text-gray-800 dark:text-white">{totalVariants.toLocaleString('fa-IR')} مورد</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold mb-1">موجودی کل</span>
            <span className="text-sm font-black text-gray-800 dark:text-white">{totalStock.toLocaleString('fa-IR')} عدد</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold mb-1">کمترین قیمت</span>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{lowestPrice > 0 ? `${lowestPrice.toLocaleString('fa-IR')} تومان` : '—'}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-400 font-bold mb-1">بیشترین قیمت</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{highestPrice > 0 ? `${highestPrice.toLocaleString('fa-IR')} تومان` : '—'}</span>
          </div>
          <div className="flex flex-col col-span-2 md:col-span-1">
            <span className="text-[10px] text-gray-400 font-bold mb-1">تنوع پیش‌فرض</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate" title={defaultVariant?.name || 'انتخاب نشده'}>
              {defaultVariant?.name || 'انتخاب نشده'}
            </span>
          </div>
        </div>
      )}

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

            {/* Quick actions */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={copyFromMainProduct}
                className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-gray-200/50 dark:border-gray-700"
                title="کپی از قیمت و موجودی اصلی محصول"
              >
                <Copy className="w-3 h-3" />
                کپی از اصلی
              </button>
              <button
                type="button"
                onClick={markFirstAvailableAsDefault}
                className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-blue-100/50 dark:border-blue-900/30"
                title="تنظیم اولین تنوع موجود به عنوان پیش‌فرض"
              >
                <Check className="w-3 h-3" />
                تنظیم پیش‌فرض
              </button>
              <button
                type="button"
                onClick={clearAllVariants}
                className="col-span-2 py-1.5 px-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-red-100 dark:border-red-900/30"
              >
                <Trash2 className="w-3 h-3" />
                پاک‌سازی و حذف کل تنوع‌ها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH FILTER */}
      {variants.length > 0 && (
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
      )}

      {/* HIERARCHICAL TREE VIEW */}
      <div className="space-y-4">
        {variants.length > 0 ? (
          <div className="border border-gray-100 dark:border-gray-800 p-4 rounded-2xl bg-gray-50/10 dark:bg-gray-950/5 space-y-4">
            {renderTree(0, {})}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center py-12 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/20 dark:bg-gray-950/10 space-y-3">
            <Sliders className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-bold">هنوز هیچ تنوعی برای این محصول ثبت نشده است.</p>
            <p className="text-[10px] text-gray-400">
              برای شروع، از دکمه زیر برای افزودن اولین ویژگی (مانند رنگ یا سایز) استفاده کنید.
            </p>
            <button
              type="button"
              onClick={() => handleAddNode(0, {})}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              ساخت اولین تنوع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
