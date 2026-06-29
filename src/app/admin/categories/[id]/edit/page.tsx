'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Save, ArrowRight, Image as ImageIcon, Trash2, Sparkles, Loader2 } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';

export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    icon: '',
    imageUrl: '',
    parentId: '',
    isActive: true,
  });

  const [categories, setCategories] = useState<{id: string, name: string, parentId?: string}[]>([]);
  const [generatingSeo, setGeneratingSeo] = useState(false);

  const handleGenerateSeoWithAi = async () => {
    if (!formData.name) return;
    setGeneratingSeo(true);
    setError('');

    try {
      const res = await fetch('/api/admin/categories/ai-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: id,
          name: formData.name,
          description: formData.description,
          parentId: formData.parentId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در تولید سئو رخ داد.');
      }

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          seoTitle: data.seoTitle || prev.seoTitle,
          seoDescription: data.seoDescription || prev.seoDescription,
        }));
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setGeneratingSeo(false);
    }
  };

  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => {
        if (data.categories) {
          setCategories(data.categories);
          const category = data.categories.find((c: any) => c.id === id);
          if (category) {
            setFormData({
              name: category.name,
              slug: category.slug,
              description: category.description || '',
              seoTitle: category.seoTitle || '',
              seoDescription: category.seoDescription || '',
              icon: category.icon || '',
              imageUrl: category.imageUrl || '',
              parentId: category.parentId || '',
              isActive: category.isActive,
            });
          } else {
            setError('دسته‌بندی یافت نشد');
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Compute hierarchical list of categories for the dropdown select, preventing circular reference
  const hierarchicalOptions = (() => {
    // 1. Collect descendants of the current editing category
    const descendantIds = new Set<string>();
    function collectDescendants(catId: string) {
      const children = categories.filter(c => c.parentId === catId);
      children.forEach(child => {
        descendantIds.add(child.id);
        collectDescendants(child.id);
      });
    }
    collectDescendants(id);

    // 2. Filter out self and descendants
    const allowedCategories = categories.filter(c => c.id !== id && !descendantIds.has(c.id));

    // 3. Build tree and ordered options from allowed categories
    const categoryMap: { [id: string]: { id: string, name: string, parentId?: string, children: string[] } } = {};
    
    allowedCategories.forEach(c => {
      categoryMap[c.id] = { ...c, children: [] };
    });
    
    const roots: string[] = [];
    allowedCategories.forEach(c => {
      if (c.parentId && categoryMap[c.parentId]) {
        categoryMap[c.parentId].children.push(c.id);
      } else {
        roots.push(c.id);
      }
    });
    
    const options: { id: string, name: string, indentName: string }[] = [];
    
    function traverse(optId: string, depth = 0) {
      const item = categoryMap[optId];
      if (!item) return;
      
      let prefix = "";
      if (depth > 0) {
        prefix = "\u00A0\u00A0".repeat(depth - 1) + "└── ";
      }
      
      options.push({
        id: item.id,
        name: item.name,
        indentName: prefix + item.name
      });
      
      item.children.forEach(childId => traverse(childId, depth + 1));
    }
    
    roots.forEach(rootId => traverse(rootId, 0));
    return options;
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        router.push('/admin/categories');
      } else {
        const data = await res.json();
        setError(data.error || 'خطا در بروزرسانی دسته‌بندی');
      }
    } catch (err) {
      setError('خطای ارتباط با سرور');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">در حال بارگذاری...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/categories" className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <ArrowRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">ویرایش دسته‌بندی</h1>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium disabled:opacity-50"
        >
          <Save className="w-5 h-5" />
          {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-xl mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نام دسته‌بندی</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">نامک (Slug)</label>
              <input
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-left"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">نامک در آدرس URL استفاده می‌شود (فقط حروف انگلیسی، اعداد و خط تیره).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">آیکون (اختیاری)</label>
              <input
                type="text"
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white text-left"
                dir="ltr"
                placeholder="نام آیکون Lucide (مانند Shirt, Laptop, Smartphone, Coffee, Gift, Sparkles)"
              />
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                می‌توانید از نام آیکون‌های مینیمال کتابخانه Lucide استفاده کنید. نمونه‌ها: <br />
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Shirt</span> (پوشاک)،{' '}
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Smartphone</span> (موبایل)،{' '}
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Laptop</span> (کالای دیجیتال)،{' '}
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Coffee</span> (کافه و خوراکی)،{' '}
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Wrench</span> (ابزارآلات)،{' '}
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Gift</span> (کادو و هدیه)،{' '}
                <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-blue-600 dark:text-blue-400">Sparkles</span> (آرایشی و زیبایی)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">تصویر یا لوگوی PNG دسته‌بندی (اختیاری)</label>
              <div className="flex items-center gap-4">
                {formData.imageUrl ? (
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                    <img src={formData.imageUrl} alt="Category Image" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-700 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}

                <div className="flex-1 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowMediaPicker(true)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 px-4 rounded-xl font-medium text-xs transition-colors"
                  >
                    {formData.imageUrl ? 'تغییر تصویر' : 'انتخاب تصویر از رسانه'}
                  </button>
                  {formData.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                      className="p-2.5 bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-xl transition-colors"
                      title="حذف تصویر"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">تصویر با پس‌زمینه شفاف (PNG) بهترین نمایش را خواهد داشت.</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">دسته‌بندی والد (اختیاری)</label>
              <select
                name="parentId"
                value={formData.parentId}
                onChange={(e) => setFormData(prev => ({ ...prev, parentId: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              >
                <option value="">ندارد (دسته‌بندی اصلی)</option>
                {hierarchicalOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.indentName}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توضیحات</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">تنظیمات سئو (SEO)</h2>
            <button
              type="button"
              onClick={handleGenerateSeoWithAi}
              disabled={generatingSeo || !formData.name}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/60 px-3.5 py-2 rounded-xl transition-all disabled:opacity-50"
            >
              {generatingSeo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  در حال تولید...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  تولید هوشمند با هوش مصنوعی
                </>
              )}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">عنوان سئو (SEO Title - اختیاری)</label>
              <input
                type="text"
                name="seoTitle"
                value={formData.seoTitle}
                onChange={handleChange}
                placeholder="مثال: خرید بهترین کفش‌های ورزشی"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 mt-1">عنوانی که در بالای مرورگر و نتایج گوگل نمایش داده می‌شود.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">توضیحات کامل سئو (SEO Description - انتهای صفحه)</label>
              <textarea
                name="seoDescription"
                value={formData.seoDescription}
                onChange={handleChange}
                rows={6}
                placeholder="توضیحات سئو شده و مقاله کوتاهی که در انتهای صفحه دسته‌بندی نمایش داده می‌شود..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">توضیحات طولانی و سئو شده برای این دسته‌بندی که در پایین صفحه با امکان «مشاهده بیشتر» نمایش می‌یابد.</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </div>
            <span className="font-medium text-gray-700 dark:text-gray-300">دسته‌بندی فعال باشد</span>
          </label>
        </div>
      </form>

      {showMediaPicker && (
        <MediaPicker
          accepts="image/*"
          title="انتخاب تصویر دسته‌بندی"
          onSelect={(url) => {
            setFormData(prev => ({ ...prev, imageUrl: url }));
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
