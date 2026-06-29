'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Filter, 
  ChevronDown, 
  X, 
  Check, 
  RotateCcw, 
  SlidersHorizontal, 
  Folder, 
  Coins, 
  Award, 
  Search,
  PackageCheck
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
  children?: Category[];
}

interface SidebarProps {
  priceRange: [number, number];
  setPriceRange: (value: [number, number]) => void;
  maxPrice?: number;
  inStockOnly?: boolean;
  setInStockOnly?: (value: boolean) => void;
  selectedCategory?: string;
  setSelectedCategory?: (value: string) => void;
  categories?: Category[];
  brands?: string[];
  selectedBrand?: string;
  setSelectedBrand?: (value: string) => void;
  brandsListWithLogos?: any[];
  // Mobile drawer controls
  isOpen?: boolean;
  onClose?: () => void;
  totalProductsCount?: number;
}

export default function Sidebar({
  priceRange,
  setPriceRange,
  maxPrice = 50000000,
  inStockOnly = false,
  setInStockOnly,
  selectedCategory = 'all',
  setSelectedCategory,
  categories = [],
  brands = [],
  selectedBrand = 'all',
  setSelectedBrand,
  brandsListWithLogos = [],
  isOpen = false,
  onClose,
  totalProductsCount = 0
}: SidebarProps) {
  // Collapsible section states
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [isPriceExpanded, setIsPriceExpanded] = useState(true);
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [expandedParents, setExpandedParents] = useState<Record<string, boolean>>({});

  // Check if any filters are active
  const hasActiveFilters = 
    (selectedCategory !== 'all' && selectedCategory !== '') ||
    (selectedBrand !== 'all' && selectedBrand !== '') ||
    inStockOnly ||
    priceRange[0] > 0 ||
    priceRange[1] < maxPrice;

  // Active filter indicators per section
  const isCategoryActive = selectedCategory !== 'all' && selectedCategory !== '';
  const isPriceActive = priceRange[0] > 0 || priceRange[1] < maxPrice;
  const isBrandActive = selectedBrand !== 'all' && selectedBrand !== '';

  // Auto-expand sections with active filters
  useEffect(() => {
    if (isCategoryActive) {
      setIsCategoriesExpanded(true);
    }
    if (isPriceActive) {
      setIsPriceExpanded(true);
    }
    if (isBrandActive) {
      setIsBrandsExpanded(true);
    }
  }, [selectedCategory, selectedBrand, isCategoryActive, isPriceActive, isBrandActive]);

  // Auto-expand parent category if a child category is selected
  useEffect(() => {
    if (selectedCategory && selectedCategory !== 'all') {
      const parent = categories.find(c => c.children?.some(child => child.id === selectedCategory));
      if (parent) {
        setExpandedParents(prev => ({ ...prev, [parent.id]: true }));
      }
    }
  }, [selectedCategory, categories]);

  const toggleParent = (parentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedParents(prev => ({ ...prev, [parentId]: !prev[parentId] }));
  };

  // Clear all filters handler
  const handleClearAll = () => {
    setSelectedCategory?.('all');
    setSelectedBrand?.('all');
    setInStockOnly?.(false);
    setPriceRange([0, maxPrice]);
    setBrandSearch('');
  };

  // Prevent scroll when mobile drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Dynamic quick price limits based on maxPrice
  const quickPrices = useMemo(() => {
    if (maxPrice <= 100000) return [];
    const steps = [0.1, 0.25, 0.5, 0.75];
    return steps.map(step => {
      const raw = maxPrice * step;
      let rounded = raw;
      if (raw > 10000000) {
        rounded = Math.round(raw / 5000000) * 5000000;
      } else if (raw > 1000000) {
        rounded = Math.round(raw / 500000) * 500000;
      } else if (raw > 100000) {
        rounded = Math.round(raw / 50000) * 50000;
      } else {
        rounded = Math.round(raw / 10000) * 10000;
      }
      return rounded;
    }).filter((v, i, self) => v > 0 && v < maxPrice && self.indexOf(v) === i);
  }, [maxPrice]);

  // Filter brands list based on search query
  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands;
    return brands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase().trim()));
  }, [brands, brandSearch]);

  // Clean, reusable Filter Content component to avoid code duplication
  const renderFilterContent = () => (
    <div className="flex flex-col gap-5">
      {/* 1. Quick Stock Status Card (Prominent & Compact at the top) */}
      <div className="bg-gray-50/60 dark:bg-gray-950/40 rounded-2xl p-3.5 border border-gray-100/80 dark:border-gray-800/50 flex items-center justify-between transition-all hover:border-gray-200 dark:hover:border-gray-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-green-50 dark:bg-green-950/20 flex items-center justify-center text-green-600 dark:text-green-400">
            <PackageCheck size={18} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold text-gray-800 dark:text-gray-200">فقط کالاهای موجود</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">حذف کالاهای ناموجود از لیست</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setInStockOnly?.(!inStockOnly)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            inStockOnly ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-800'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              inStockOnly ? '-translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-800/60">
        {/* 2. Categories Section */}
        <div className="py-4 first:pt-0">
          <button
            onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
            className="w-full flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 text-sm cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-2">
              <Folder size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span>دسته‌بندی‌ها</span>
              {isCategoryActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 ${isCategoriesExpanded ? 'rotate-180' : ''}`} 
            />
          </button>
          
          <div className={`transition-all duration-300 overflow-hidden ${isCategoriesExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-300 max-h-[260px] overflow-y-auto pr-1 custom-scrollbar">
              <li>
                <button
                  onClick={() => setSelectedCategory?.('all')}
                  className={`w-full text-right flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                    selectedCategory === 'all' || selectedCategory === ''
                      ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20'
                      : 'hover:text-gray-900 dark:hover:text-white text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  }`}
                >
                  <span>همه محصولات</span>
                  {(selectedCategory === 'all' || selectedCategory === '') && <Check size={14} />}
                </button>
              </li>
              {categories.filter(c => !c.parentId).map(category => {
                const isSelected = selectedCategory === category.id;
                const hasChildren = category.children && category.children.length > 0;
                const isExpanded = !!expandedParents[category.id];

                return (
                  <li key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <button
                        onClick={() => setSelectedCategory?.(category.id)}
                        className={`flex-1 text-right flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                          isSelected
                            ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20'
                            : 'hover:text-gray-900 dark:hover:text-white text-gray-650 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        <span>{category.name}</span>
                        {isSelected && <Check size={14} className="shrink-0" />}
                      </button>

                      {hasChildren && (
                        <button
                          onClick={(e) => toggleParent(category.id, e)}
                          className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all cursor-pointer shrink-0"
                          title={isExpanded ? 'بستن زیرمجموعه‌ها' : 'مشاهده زیرمجموعه‌ها'}
                        >
                          <ChevronDown 
                            size={14} 
                            className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-blue-500' : ''}`} 
                          />
                        </button>
                      )}
                    </div>
                    
                    {hasChildren && (
                      <div className={`transition-all duration-300 overflow-hidden ${isExpanded ? 'max-h-[300px] opacity-100' : 'max-h-0 opacity-0'}`}>
                        <ul className="mt-1 mr-3 pr-3 space-y-1 border-r border-gray-200 dark:border-gray-800">
                          {category.children.map(child => {
                            const isChildSelected = selectedCategory === child.id;
                            return (
                              <li key={child.id}>
                                <button
                                  onClick={() => setSelectedCategory?.(child.id)}
                                  className={`w-full text-right flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                                    isChildSelected
                                      ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/30 dark:bg-blue-950/10'
                                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50/80 dark:hover:bg-gray-850/10'
                                  }`}
                                >
                                  <span>{child.name}</span>
                                  {isChildSelected && <Check size={12} />}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* 3. Price Range Section (Highly Optimized UX) */}
        <div className="py-4">
          <button
            onClick={() => setIsPriceExpanded(!isPriceExpanded)}
            className="w-full flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 text-sm cursor-pointer py-1 group"
          >
            <div className="flex items-center gap-2">
              <Coins size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
              <span>محدوده قیمت</span>
              {isPriceActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              )}
            </div>
            <ChevronDown 
              size={16} 
              className={`text-gray-400 transition-transform duration-200 ${isPriceExpanded ? 'rotate-180' : ''}`} 
            />
          </button>
          
          <div className={`transition-all duration-300 overflow-hidden ${isPriceExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
            <div className="space-y-4 px-1">
              {/* Price Labels */}
              <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 dark:text-gray-500">
                <div className="flex flex-col items-start">
                  <span>از</span>
                  <span className="text-gray-800 dark:text-gray-200 font-black mt-0.5">
                    {priceRange[0].toLocaleString('fa-IR')} تومان
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span>تا</span>
                  <span className="text-gray-800 dark:text-gray-200 font-black mt-0.5">
                    {priceRange[1] >= maxPrice ? 'بی‌نهایت' : `${priceRange[1].toLocaleString('fa-IR')} تومان`}
                  </span>
                </div>
              </div>

              {/* Premium Dual-Range Slider (Single Line Layout) */}
              <div className="relative w-full h-6 flex items-center" dir="ltr">
                {/* Track Background */}
                <div className="absolute left-0 right-0 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full" />
                
                {/* Highlighted Track Range */}
                <div 
                  className="absolute h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full" 
                  style={{ 
                    left: `${(priceRange[0] / maxPrice) * 100}%`, 
                    right: `${100 - (priceRange[1] / maxPrice) * 100}%` 
                  }} 
                />
                
                {/* Min Range Input */}
                <input 
                  type="range" 
                  min="0" 
                  max={maxPrice} 
                  step={maxPrice > 1000000 ? 100000 : 10000}
                  value={priceRange[0]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPriceRange([Math.min(val, priceRange[1]), priceRange[1]]);
                  }}
                  className="absolute w-full h-1.5 pointer-events-none appearance-none bg-transparent accent-blue-600 dark:accent-blue-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                />
                
                {/* Max Range Input */}
                <input 
                  type="range" 
                  min="0" 
                  max={maxPrice} 
                  step={maxPrice > 1000000 ? 100000 : 10000}
                  value={priceRange[1]}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setPriceRange([priceRange[0], Math.max(val, priceRange[0])]);
                  }}
                  className="absolute w-full h-1.5 pointer-events-none appearance-none bg-transparent accent-blue-600 dark:accent-blue-400 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto"
                />
              </div>

              {/* Numeric Inputs Side-by-Side */}
              <div className="flex gap-2.5 pt-1">
                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">از (تومان)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceRange[0] === 0 ? '' : priceRange[0].toLocaleString('fa-IR')}
                    onChange={(e) => {
                      const rawVal = e.target.value.replace(/[^\d\u06F0-\u06F9]/g, '');
                      const englishVal = rawVal.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 1776));
                      const numVal = Number(englishVal) || 0;
                      setPriceRange([Math.min(numVal, priceRange[1]), priceRange[1]]);
                    }}
                    placeholder="۰"
                    className="w-full text-center text-xs font-black text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 py-2 px-1.5 rounded-xl border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>

                <div className="flex-1 flex flex-col gap-1">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">تا (تومان)</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={priceRange[1] >= maxPrice ? '' : priceRange[1].toLocaleString('fa-IR')}
                    onChange={(e) => {
                      const rawVal = e.target.value.replace(/[^\d\u06F0-\u06F9]/g, '');
                      const englishVal = rawVal.replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 1776));
                      const numVal = englishVal === '' ? maxPrice : Number(englishVal) || 0;
                      setPriceRange([priceRange[0], Math.max(numVal, priceRange[0])]);
                    }}
                    placeholder="بی‌نهایت"
                    className="w-full text-center text-xs font-black text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-950 py-2 px-1.5 rounded-xl border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Dynamic Quick Price Pills (Tap to Filter) */}
              {quickPrices.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">انتخاب سریع قیمت</span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickPrices.map(price => {
                      const isSelected = priceRange[0] === 0 && priceRange[1] === price;
                      return (
                        <button
                          key={price}
                          onClick={() => setPriceRange([0, price])}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                              : 'bg-gray-50 dark:bg-gray-950 text-gray-600 dark:text-gray-400 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                        >
                          تا {price >= 1000000 ? `${(price / 1000000).toLocaleString('fa-IR')} میلیون` : `${(price / 1000).toLocaleString('fa-IR')} هزار`} تومان
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Brands Filter Section */}
        {brands && brands.length > 0 && (
          <div className="py-4">
            <button
              onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}
              className="w-full flex items-center justify-between font-bold text-gray-800 dark:text-gray-200 text-sm cursor-pointer py-1 group"
            >
              <div className="flex items-center gap-2">
                <Award size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
                <span>برندها</span>
                {isBrandActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>
              <ChevronDown 
                size={16} 
                className={`text-gray-400 transition-transform duration-200 ${isBrandsExpanded ? 'rotate-180' : ''}`} 
              />
            </button>
            
            <div className={`transition-all duration-300 overflow-hidden ${isBrandsExpanded ? 'max-h-[500px] opacity-100 mt-3' : 'max-h-0 opacity-0'}`}>
              <div className="space-y-2.5">
                {/* Brand Search Box */}
                {brands.length > 5 && (
                  <div className="relative flex items-center px-1">
                    <Search size={14} className="absolute right-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="جستجوی برند..."
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      className="w-full text-xs bg-gray-50 dark:bg-gray-950 py-2 pr-8 pl-3 rounded-xl border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                    />
                    {brandSearch && (
                      <button 
                        onClick={() => setBrandSearch('')} 
                        className="absolute left-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                <ul className="space-y-1 text-sm text-gray-650 dark:text-gray-300 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                  <li>
                    <button
                      onClick={() => setSelectedBrand?.('all')}
                      className={`w-full text-right flex items-center justify-between px-3 py-2 rounded-xl transition-all ${
                        selectedBrand === 'all' || !selectedBrand
                          ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/50 dark:bg-blue-950/20'
                          : 'hover:text-gray-900 dark:hover:text-white text-gray-600 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/30'
                      }`}
                    >
                      <span>همه برندها</span>
                      {(selectedBrand === 'all' || !selectedBrand) && <Check size={14} />}
                    </button>
                  </li>
                  {filteredBrands.map(brandName => {
                    const isSelected = selectedBrand === brandName;
                    const brandObj = brandsListWithLogos?.find(
                      b => b.name?.toLowerCase().trim() === brandName.toLowerCase().trim()
                    );
                    const logoUrl = brandObj?.logoUrl;

                    return (
                      <li key={brandName}>
                        <button
                          onClick={() => setSelectedBrand?.(brandName)}
                          className={`w-full text-right flex items-center justify-between px-3 py-2 rounded-xl transition-all border ${
                            isSelected
                              ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/60 dark:bg-blue-950/20 border-blue-100/50 dark:border-blue-900/30'
                              : 'hover:text-gray-900 dark:hover:text-white text-gray-650 dark:text-gray-400 hover:bg-gray-50/80 dark:hover:bg-gray-800/30 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            {logoUrl ? (
                              <div className="relative w-8 h-6 bg-white dark:bg-gray-900 rounded-lg p-0.5 border border-gray-100 dark:border-gray-800/80 flex items-center justify-center shrink-0 shadow-3xs">
                                <img 
                                  src={logoUrl} 
                                  alt={brandName} 
                                  className="object-contain max-h-full max-w-full" 
                                />
                              </div>
                            ) : (
                              <div className="w-8 h-6 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                {brandName.substring(0, 2)}
                              </div>
                            )}
                            <span className="text-xs font-semibold">{brandName}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                        </button>
                      </li>
                    );
                  })}
                  {filteredBrands.length === 0 && (
                    <p className="text-center text-xs text-gray-400 py-4">برندی یافت نشد</p>
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. DESKTOP SIDEBAR LAYOUT (Hidden on Mobile/Tablet)                       */}
      {/* ========================================================================= */}
      <aside className="hidden lg:block w-80 shrink-0 sticky top-24 h-[calc(100vh-7rem)] overflow-y-auto scrollbar-hide">
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100/80 dark:border-gray-800/80 p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800/80 pb-3.5">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-blue-600 dark:text-blue-400" />
              <h2 className="font-extrabold text-base">فیلترها</h2>
            </div>
            
            {hasActiveFilters && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors font-semibold cursor-pointer"
                title="پاک کردن همه"
              >
                <RotateCcw size={12} />
                <span>حذف همه</span>
              </button>
            )}
          </div>

          {/* Desktop Filter Content */}
          {renderFilterContent()}
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE BOTTOM DRAWER LAYOUT (Shown on Mobile/Tablet when isOpen=true) */}
      {/* ========================================================================= */}
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden transition-all duration-300 animate-fadeIn" 
            onClick={onClose} 
          />
          
          {/* Bottom Sheet Drawer */}
          <div 
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 rounded-t-[2.5rem] z-50 lg:hidden flex flex-col max-h-[85vh] shadow-2xl border-t border-gray-100 dark:border-gray-800 animate-slideUp"
          >
            {/* Handle Bar */}
            <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto my-3 shrink-0" />

            {/* Drawer Header */}
            <div className="flex items-center justify-between px-6 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={18} className="text-blue-600 dark:text-blue-400" />
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">فیلترهای پیشرفته</h3>
              </div>
              
              <div className="flex items-center gap-3">
                {hasActiveFilters && (
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 transition-colors font-bold cursor-pointer"
                  >
                    <RotateCcw size={12} />
                    <span>پاک کردن</span>
                  </button>
                )}
                
                <button 
                  onClick={onClose}
                  className="p-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-500 dark:text-gray-400 transition-colors cursor-pointer"
                  aria-label="بستن"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Drawer Body (Scrollable filter choices) */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 no-scrollbar">
              {renderFilterContent()}
            </div>

            {/* Drawer Footer Sticky Action Bar */}
            <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-900 flex gap-3 sticky bottom-0 rounded-t-xl shrink-0">
              <button
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold rounded-2xl text-center shadow-md shadow-blue-500/10 hover:shadow-blue-500/25 transition-all text-sm cursor-pointer"
              >
                {totalProductsCount > 0 ? `مشاهده ${totalProductsCount.toLocaleString('fa-IR')} محصول` : 'اعمال فیلترها'}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
