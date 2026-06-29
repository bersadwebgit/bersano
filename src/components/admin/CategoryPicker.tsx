'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Plus, Folder, Check, ChevronDown, X, Loader2, Info } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  isActive?: boolean;
}

interface CategoryPickerProps {
  value: string;
  onChange: (categoryId: string) => void;
}

export default function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Quick Add category states
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newCatName, setNewCategoryName] = useState('');
  const [newCatSlug, setNewCategorySlug] = useState('');
  const [newCatParentId, setNewCategoryParentId] = useState('');
  const [newCatDescription, setNewCategoryDescription] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();

    // Close dropdown on outside click
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (data.categories) {
        // filter out inactive ones for selection or keep them? The original product/new page did c.isActive check
        setCategories(data.categories.filter((c: any) => c.isActive));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (categoryId: string) => {
    onChange(categoryId);
    setIsOpen(false);
    setSearch('');
  };

  const handleQuickAddSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newCatName.trim()) {
      setError('نام دسته‌بندی نمی‌تواند خالی باشد');
      return;
    }
    if (!newCatSlug.trim()) {
      setError('نامک نمی‌تواند خالی باشد');
      return;
    }

    setAdding(true);
    setError('');

    try {
      const res = await fetch('/api/admin/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName,
          slug: newCatSlug,
          parentId: newCatParentId || null,
          description: newCatDescription,
          isActive: true
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Fetch categories again to get complete list (including parent relation mapping if applicable)
        await fetchCategories();
        onChange(data.category.id);
        setShowQuickAdd(false);
        setNewCategoryName('');
        setNewCategorySlug('');
        setNewCategoryParentId('');
        setNewCategoryDescription('');
        setIsOpen(false);
      } else {
        setError(data.error || 'خطا در ثبت دسته‌بندی جدید');
      }
    } catch (err) {
      setError('خطای ارتباط با سرور');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenQuickAdd = () => {
    const defaultName = search || '';
    setNewCategoryName(defaultName);
    setNewCategorySlug(defaultName.replace(/\s+/g, '-').toLowerCase());
    setError('');
    setNewCategoryParentId('');
    setNewCategoryDescription('');
    setShowQuickAdd(true);
  };

  const selectedCategory = categories.find(c => c.id === value);

  // Helper function to build category display name (with parent name if exists)
  const getCategoryDisplayName = (cat: Category) => {
    if (cat.parent) {
      return `${cat.parent.name} ← ${cat.name}`;
    }
    return cat.name;
  };

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      <label className="block text-sm font-medium text-gray-750 dark:text-gray-300 mb-2">دسته‌بندی محصول (انتخاب از لیست)</label>
      
      {/* Trigger Button */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right text-gray-900 dark:text-white flex items-center justify-between transition-colors min-h-[42px]"
        >
          {selectedCategory ? (
            <span className="font-bold text-sm flex items-center gap-2">
              <Folder className="w-4 h-4 text-blue-500" />
              {getCategoryDisplayName(selectedCategory)}
            </span>
          ) : (
            <span className="text-gray-400 text-xs font-bold">بدون دسته‌بندی</span>
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
          title="ثبت سریع دسته‌بندی جدید"
        >
          <Plus size={16} />
          دسته‌بندی جدید
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-40 w-full mt-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-100">
          <div className="p-3 border-b border-gray-100 dark:border-gray-800 flex items-center gap-2">
            <Search size={16} className="text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="جستجو در دسته‌بندی‌ها..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs font-bold bg-transparent border-none outline-none text-gray-900 dark:text-white"
            />
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800/30">
            {loading ? (
              <div className="p-4 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin" />
                در حال بارگذاری دسته‌بندی‌ها...
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400 font-bold mb-3">دسته‌بندی با این نام یافت نشد</p>
                <button
                  type="button"
                  onClick={handleOpenQuickAdd}
                  className="mx-auto flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:text-blue-400 px-3 py-1.5 rounded-lg font-bold transition-all"
                >
                  <Plus size={14} />
                  ایجاد دسته‌بندی جدید به نام «{search}»
                </button>
              </div>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = value === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleSelect(category.id)}
                    className="w-full text-right px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-850 flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Folder size={14} className="text-gray-400 shrink-0" />
                      {getCategoryDisplayName(category)}
                    </span>
                    {isSelected && <Check size={14} className="text-blue-600 dark:text-blue-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Quick Add Category Modal */}
      {showQuickAdd && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/40">
              <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-1.5">
                <Folder className="w-4 h-4 text-blue-500" />
                ثبت سریع دسته‌بندی جدید
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

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">نام دسته‌بندی</label>
                <input
                  type="text"
                  value={newCatName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewCategoryName(val);
                    setNewCategorySlug(val.replace(/\s+/g, '-').toLowerCase());
                  }}
                  placeholder="مثال: لوازم الکترونیکی"
                  required
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-750 dark:bg-gray-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">نامک (Slug)</label>
                <input
                  type="text"
                  value={newCatSlug}
                  onChange={(e) => setNewCategorySlug(e.target.value)}
                  placeholder="مثال: electronics"
                  required
                  dir="ltr"
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-750 dark:bg-gray-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500 text-left"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">فقط حروف انگلیسی، اعداد و خط تیره (-)</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">دسته‌بندی والد (اختیاری)</label>
                <select
                  value={newCatParentId}
                  onChange={(e) => setNewCategoryParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-750 dark:bg-gray-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500"
                >
                  <option value="">بدون والد (دسته‌بندی اصلی)</option>
                  {categories.filter(c => !c.parentId).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-1.5">توضیحات (اختیاری)</label>
                <textarea
                  value={newCatDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="توضیحات کوتاه درباره دسته‌بندی..."
                  rows={2}
                  className="w-full px-3.5 py-2.5 border border-gray-300 dark:border-gray-750 dark:bg-gray-950 rounded-xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-gray-900 dark:text-white focus:border-blue-500 resize-none"
                />
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-1 disabled:opacity-50"
                >
                  {adding ? 'در حال ثبت...' : 'ثبت دسته‌بندی'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}