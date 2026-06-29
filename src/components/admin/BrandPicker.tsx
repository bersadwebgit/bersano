'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Award, Check, ChevronDown, Image as ImageIcon, X, Loader2, Trash2, Sparkles } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface BrandPickerProps {
  value: string;
  onChange: (brandName: string) => void;
}

export default function BrandPicker({ value, onChange }: BrandPickerProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add brand states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newBrandName, setNewBrandName] = useState('');
  const [newBrandLogo, setNewBrandLogo] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [aiBrandExplanation, setAiBrandExplanation] = useState('');
  const [cleaningBrand, setCleaningBrand] = useState(false);

  const handleCleanBrandWithAi = async () => {
    if (!aiBrandExplanation.trim()) return;

    setCleaningBrand(true);
    setError('');

    try {
      const res = await fetch('/api/admin/brands/ai-clean', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiBrandExplanation }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در استخراج اطلاعات برند رخ داد.');
      }

      if (data.success) {
        setNewBrandName(data.name || newBrandName);
        setNewBrandLogo(data.logoUrl || newBrandLogo);
        setAiBrandExplanation('');
      } else {
        setError('هوش مصنوعی نتوانست اطلاعات برند را استخراج کند.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setCleaningBrand(false);
    }
  };

  useEffect(() => {
    fetchBrands();

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/admin/brands');
      const data = await res.json();
      if (data.brands) {
        setBrands(data.brands);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredBrands = brands.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (brandName: string) => {
    onChange(brandName);
    setIsOpen(false);
    setSearch('');
  };

  const handleQuickAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newBrandName.trim()) {
      setError('نام برند نمی‌تواند خالی باشد');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const res = await fetch('/api/admin/brands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newBrandName, logoUrl: newBrandLogo }),
      });

      const data = await res.json();

      if (res.ok) {
        // Add to local list and select
        setBrands([data.brand, ...brands]);
        onChange(data.brand.name);
        setShowQuickAdd(false);
        setNewBrandName('');
        setNewBrandLogo('');
        setIsOpen(false);
      } else {
        setError(data.error || 'خطا در ثبت برند جدید');
      }
    } catch (err) {
      setError('خطای ارتباط با سرور');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenQuickAdd = () => {
    setNewBrandName(search || '');
    setError('');
    setNewBrandLogo('');
    setAiBrandExplanation('');
    setShowQuickAdd(true);
  };

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      <label className="block text-sm font-medium text-gray-750 dark:text-gray-300 mb-2">برند محصول (انتخاب از لیست)</label>
      
      {/* Trigger Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right text-gray-900 dark:text-white flex items-center justify-between transition-colors min-h-[42px]"
        >
          {value ? (
            <span className="font-bold text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-500" />
              {value}
            </span>
          ) : (
            <span className="text-gray-400 text-xs font-bold">بدون برند (اختیاری)</span>
          )}
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="px-3 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-500 rounded-xl transition-colors"
            title="پاک کردن انتخاب"
          >
            <X size={16} />
          </button>
        )}

        <button
          type="button"
          onClick={handleOpenQuickAdd}
          className="px-3 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-200/50 dark:border-blue-800/50 transition-colors flex items-center gap-1 font-bold text-xs"
          title="ثبت سریع برند جدید"
        >
          <Plus size={16} />
          برند جدید
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-40 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-100">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجو در برندها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/30">
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                در حال بارگذاری برندها...
              </div>
            ) : filteredBrands.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 font-bold mb-3">برندی با این نام یافت نشد</p>
                <button
                  type="button"
                  onClick={handleOpenQuickAdd}
                  className="mx-auto flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold transition-all"
                >
                  <Plus size={14} />
                  ایجاد برند جدید به نام «{search}»
                </button>
              </div>
            ) : (
              filteredBrands.map((brand) => {
                const isSelected = value?.toLowerCase().trim() === brand.name?.toLowerCase().trim();
                return (
                  <button
                    key={brand.id}
                    type="button"
                    onClick={() => handleSelect(brand.name)}
                    className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {brand.logoUrl ? (
                        <img src={brand.logoUrl} alt={brand.name} className="w-7 h-6 object-contain rounded border border-gray-100 dark:border-gray-800 bg-gray-50 p-0.5" />
                      ) : (
                        <div className="w-7 h-6 rounded border border-gray-100 dark:border-gray-800 bg-gray-50 flex items-center justify-center text-gray-400">
                          <Award size={12} />
                        </div>
                      )}
                      {brand.name}
                    </span>
                    {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Add Brand Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40">
              <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-1.5">
                <Award className="w-4 h-4 text-indigo-500" />
                ثبت سریع برند تجاری جدید
              </h3>
              <button
                type="button"
                onClick={() => setShowQuickAdd(false)}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-900/30 rounded-xl p-3 text-xs font-bold">
                  {error}
                </div>
              )}

              {/* AI Brand Assistant */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-black">دستیار هوشمند برند</span>
                </div>
                <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  هر نوع توضیحی از برند را بنویسید تا هوش مصنوعی نام برند و لوگوی آن را استخراج و تنظیم کند.
                </p>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={aiBrandExplanation}
                    onChange={(e) => setAiBrandExplanation(e.target.value)}
                    placeholder="توضیحات برند را اینجا بنویسید..."
                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-xl outline-none text-[10px] font-bold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCleanBrandWithAi();
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={cleaningBrand || !aiBrandExplanation.trim()}
                    onClick={handleCleanBrandWithAi}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all shrink-0 flex items-center gap-1"
                  >
                    {cleaningBrand ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        ...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        استخراج
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">نام برند</label>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddSubmit();
                    }
                  }}
                  placeholder="مثال: Nike, Apple, ..."
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-750 dark:bg-gray-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">لوگو / نشان برند (اختیاری)</label>
                <div className="flex items-center gap-3">
                  {newBrandLogo ? (
                    <div className="relative w-14 h-10 bg-gray-50 dark:bg-gray-950 rounded-xl p-0.5 border border-gray-100 dark:border-gray-800 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={newBrandLogo} alt="Logo" className="object-contain max-h-full max-w-full" />
                    </div>
                  ) : (
                    <div className="w-14 h-10 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-center text-gray-300 shrink-0">
                      <ImageIcon size={16} />
                    </div>
                  )}

                  <div className="flex-1 flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-2.5 rounded-xl font-bold text-[10px] transition-colors"
                    >
                      {newBrandLogo ? 'تغییر لوگو' : 'انتخاب لوگو'}
                    </button>
                    {newBrandLogo && (
                      <button
                        type="button"
                        onClick={() => setNewBrandLogo('')}
                        className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-850/50 rounded-xl font-bold text-xs"
                >
                  انصراف
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickAddSubmit()}
                  disabled={adding}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {adding ? 'در حال ثبت...' : 'ثبت برند'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Picker for Quick Add Logo */}
      {showMediaPicker && (
        <MediaPicker
          accepts="image/*"
          title="انتخاب لوگوی برند تجاری"
          onSelect={(url) => {
            setNewBrandLogo(url);
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
