'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Folder, Check, ChevronDown, X, Loader2 } from 'lucide-react';

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

interface MultiCategoryPickerProps {
  value: string[];
  onChange: (categoryIds: string[]) => void;
  excludeId?: string; // e.g., the primary category ID to avoid duplicate selection
}

export default function MultiCategoryPicker({ value = [], onChange, excludeId }: MultiCategoryPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

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
        setCategories(data.categories.filter((c: any) => c.isActive));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Filter out the excluded category (primary category)
  const availableCategories = categories.filter(c => c.id !== excludeId);

  const filteredCategories = availableCategories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleToggleSelect = (categoryId: string) => {
    if (value.includes(categoryId)) {
      onChange(value.filter(id => id !== categoryId));
    } else {
      onChange([...value, categoryId]);
    }
    setSearch('');
  };

  const handleRemove = (categoryId: string) => {
    onChange(value.filter(id => id !== categoryId));
  };

  // Helper function to build category display name (with parent name if exists)
  const getCategoryDisplayName = (cat: Category) => {
    if (cat.parent) {
      return `${cat.parent.name} ← ${cat.name}`;
    }
    return cat.name;
  };

  return (
    <div className="relative" ref={dropdownRef} dir="rtl">
      <label className="block text-sm font-medium text-gray-750 dark:text-gray-300 mb-2">
        دسته‌بندی‌های اضافی / ثانویه (اختیاری - جهت نمایش محصول در چند دسته)
      </label>
      
      {/* Trigger Button & Selected Tags */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-right text-gray-900 dark:text-white flex items-center justify-between transition-colors min-h-[42px]"
        >
          <span className="text-gray-400 text-xs font-bold">
            {value.length > 0 ? `انتخاب شده: ${value.length} دسته‌بندی` : 'انتخاب دسته‌بندی‌های ثانویه...'}
          </span>
          <ChevronDown size={18} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Selected Tags Display */}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl">
            {value.map(id => {
              const cat = categories.find(c => c.id === id);
              if (!cat) return null;
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs font-bold transition-colors"
                >
                  <Folder className="w-3.5 h-3.5" />
                  {getCategoryDisplayName(cat)}
                  <button
                    type="button"
                    onClick={() => handleRemove(id)}
                    className="p-0.5 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-md transition-colors"
                    title="حذف"
                  >
                    <X size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
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
                <p className="text-xs text-gray-400 font-bold">دسته‌بندی یافت نشد</p>
              </div>
            ) : (
              filteredCategories.map((category) => {
                const isSelected = value.includes(category.id);
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleToggleSelect(category.id)}
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
    </div>
  );
}
