// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Edit, Trash2, Search, Tags, ChevronRight, ChevronDown, ChevronLeft, Award, Image as ImageIcon, X, Save, Sparkles, Loader2, AlertCircle, Check, Folder, FolderOpen, Layers } from 'lucide-react';
import MediaPicker from '@/components/MediaPicker';
import CategoryIcon from '@/components/CategoryIcon';

interface Category {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  parentId?: string;
  icon?: string;
  imageUrl?: string;
  parent?: {
    id: string;
    name: string;
  };
  _count?: {
    products: number;
  };
}

interface Brand {
  id: string;
  name: string;
  logoUrl?: string | null;
  createdAt: string;
}

export default function CategoriesAndBrandsPage() {
  const [activeTab, setActiveTab] = useState<'categories' | 'brands'>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loadingCategories, setLoadingLoadingCategories] = useState(true);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [search, setSearch] = useState('');
  
  // Brand Form Modal state
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [brandForm, setBrandForm] = useState<{ id?: string; name: string; logoUrl: string }>({
    name: '',
    logoUrl: '',
  });
  const [savingBrand, setSavingBrand] = useState(false);
  const [brandError, setBrandFormError] = useState('');
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const [aiBrandExplanation, setAiBrandExplanation] = useState('');
  const [cleaningBrand, setCleaningBrand] = useState(false);

  const handleCleanBrandWithAi = async () => {
    if (!aiBrandExplanation.trim()) return;

    setCleaningBrand(true);
    setBrandFormError('');

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
        setBrandForm(prev => ({
          ...prev,
          name: data.name || prev.name,
          logoUrl: data.logoUrl || prev.logoUrl,
        }));
        setAiBrandExplanation('');
      } else {
        setBrandFormError('هوش مصنوعی نتوانست اطلاعات برند را استخراج کند.');
      }
    } catch (err: any) {
      console.error(err);
      setBrandFormError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setCleaningBrand(false);
    }
  };

  // AI Assistant for Categories Page
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const handleApplyAiControl = async () => {
    if (!promptInput.trim() || controlling) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');

    try {
      const res = await fetch('/api/admin/categories/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          categories: categories.map(c => ({
            id: c.id,
            name: c.name,
            slug: c.slug,
            isActive: c.isActive,
            parentId: c.parentId,
            parentName: c.parent?.name
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند دسته‌بندی رخ داد.');
      }

      if (data.success) {
        if (data.requireConfirmation) {
          const userConfirmed = confirm(`دستیار هوشمند پیشنهاد می‌کند تغییرات زیر اعمال شود:\n\n${data.explanation}\n\nآیا با اعمال این تغییرات موافقت می‌کنید؟`);
          if (userConfirmed) {
            setControlling(true);
            const confirmRes = await fetch('/api/admin/categories/ai-control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                confirmed: true,
                operations: data.operations,
                explanation: data.explanation,
              }),
            });
            const confirmData = await confirmRes.json();
            if (!confirmRes.ok) {
              throw new Error(confirmData.error || 'خطایی در ثبت نهایی تغییرات رخ داد.');
            }
            if (confirmData.success) {
              setControlSuccessMessage(confirmData.explanation || 'تغییرات با موفقیت اعمال شد.');
              setPromptInput('');
              await fetchCategories();
            } else {
              setControlError(confirmData.explanation || 'ثبت نهایی تغییرات ناموفق بود.');
            }
          }
        } else {
          setControlSuccessMessage(data.explanation || 'تغییرات با موفقیت توسط هوش مصنوعی اعمال شد.');
          setPromptInput('');
          await fetchCategories();
        }
      } else {
        setControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
      }
    } catch (err: any) {
      console.error(err);
      setControlError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setControlling(false);
    }
  };

  // AI Assistant for Brands Page
  const [brandPromptInput, setBrandPromptInput] = useState('');
  const [controllingBrand, setControllingBrand] = useState(false);
  const [brandControlError, setBrandControlError] = useState('');
  const [brandControlSuccessMessage, setBrandControlSuccessMessage] = useState('');

  const handleApplyBrandAiControl = async () => {
    if (!brandPromptInput.trim()) return;

    setControllingBrand(true);
    setBrandControlError('');
    setBrandControlSuccessMessage('');

    try {
      const res = await fetch('/api/admin/brands/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: brandPromptInput,
          brands: brands.map(b => ({
            id: b.id,
            name: b.name,
            logoUrl: b.logoUrl,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند برندها رخ داد.');
      }

      if (data.success) {
        if (data.requireConfirmation) {
          const userConfirmed = confirm(`دستیار هوشمند پیشنهاد می‌کند تغییرات زیر اعمال شود:\n\n${data.explanation}\n\nآیا با اعمال این تغییرات موافقت می‌کنید؟`);
          if (userConfirmed) {
            setControllingBrand(true);
            const confirmRes = await fetch('/api/admin/brands/ai-control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                confirmed: true,
                operations: data.operations,
                explanation: data.explanation,
              }),
            });
            const confirmData = await confirmRes.json();
            if (!confirmRes.ok) {
              throw new Error(confirmData.error || 'خطایی در ثبت نهایی تغییرات رخ داد.');
            }
            if (confirmData.success) {
              setBrandControlSuccessMessage(confirmData.explanation || 'تغییرات با موفقیت اعمال شد.');
              setBrandPromptInput('');
              await fetchBrands();
            } else {
              setBrandControlError(confirmData.explanation || 'ثبت نهایی تغییرات ناموفق بود.');
            }
          }
        } else {
          setBrandControlSuccessMessage(data.explanation || 'تغییرات با موفقیت توسط هوش مصنوعی اعمال شد.');
          setBrandPromptInput('');
          await fetchBrands();
        }
      } else {
        setBrandControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
      }
    } catch (err: any) {
      console.error(err);
      setBrandControlError(err.message || 'ارتباط با سرور برقرار نشد.');
    } finally {
      setControllingBrand(false);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchBrands();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('[ERROR] [Categories]: Error fetching categories:', error);
    } finally {
      setLoadingLoadingCategories(false);
    }
  };

  const fetchBrands = async () => {
    try {
      const res = await fetch('/api/admin/brands');
      const data = await res.json();
      if (data.brands) {
        setBrands(data.brands);
      }
    } catch (error) {
      console.error('[ERROR] [Brands]: Error fetching brands:', error);
    } finally {
      setLoadingBrands(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('آیا از حذف این دسته‌بندی اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
      } else {
        alert('خطا در حذف دسته‌بندی');
      }
    } catch (error) {
      console.error('[ERROR] [Categories]: Error deleting category:', error);
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm('آیا از حذف این برند اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/brands/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setBrands(brands.filter(b => b.id !== id));
      } else {
        alert('خطا در حذف برند');
      }
    } catch (error) {
      console.error('[ERROR] [Brands]: Error deleting brand:', error);
    }
  };

  const handleOpenAddBrand = () => {
    setBrandForm({ name: '', logoUrl: '' });
    setBrandFormError('');
    setAiBrandExplanation('');
    setShowBrandModal(true);
  };

  const handleOpenEditBrand = (brand: Brand) => {
    setBrandForm({
      id: brand.id,
      name: brand.name,
      logoUrl: brand.logoUrl || '',
    });
    setBrandFormError('');
    setAiBrandExplanation('');
    setShowBrandModal(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandForm.name.trim()) {
      setBrandFormError('نام برند الزامی است');
      return;
    }

    setSavingBrand(true);
    setBrandFormError('');

    try {
      const isEdit = !!brandForm.id;
      const url = isEdit ? `/api/admin/brands/${brandForm.id}` : '/api/admin/brands';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandForm),
      });

      const data = await res.json();

      if (res.ok) {
        if (isEdit) {
          setBrands(brands.map(b => b.id === brandForm.id ? data.brand : b));
        } else {
          setBrands([data.brand, ...brands]);
        }
        setShowBrandModal(false);
      } else {
        setBrandFormError(data.error || 'خطایی در ذخیره برند رخ داد');
      }
    } catch (error) {
      setBrandFormError('خطای ارتباط با سرور');
    } finally {
      setSavingBrand(false);
    }
  };

  // --- Start of Nested Categories Tree Logic ---
  // Set to store expanded category IDs
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(categories.map(c => c.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  interface CategoryTreeNode extends Category {
    childrenNodes: CategoryTreeNode[];
    depth: number;
  }

  // We build tree of ALL categories
  const fullTree = (() => {
    const categoryMap: { [id: string]: CategoryTreeNode } = {};
    
    categories.forEach(c => {
      categoryMap[c.id] = { ...c, childrenNodes: [], depth: 0 };
    });
    
    const rootNodes: CategoryTreeNode[] = [];
    
    categories.forEach(c => {
      const node = categoryMap[c.id];
      if (c.parentId && categoryMap[c.parentId]) {
        categoryMap[c.parentId].childrenNodes.push(node);
      } else {
        rootNodes.push(node);
      }
    });

    function setDepth(node: CategoryTreeNode, depth: number) {
      node.depth = depth;
      node.childrenNodes.forEach(child => setDepth(child, depth + 1));
    }
    
    rootNodes.forEach(root => setDepth(root, 0));
    
    return rootNodes;
  })();

  // Search and filter tree
  const searchAutoExpandIds = new Set<string>();
  
  function searchAndFilterTree(
    nodes: CategoryTreeNode[], 
    searchTerm: string, 
    autoExpandIds: Set<string>
  ): { filteredNodes: CategoryTreeNode[], hasMatch: boolean } {
    if (!searchTerm) {
      return { filteredNodes: nodes, hasMatch: true };
    }
    
    const term = searchTerm.toLowerCase();
    const result: CategoryTreeNode[] = [];
    
    nodes.forEach(node => {
      const isSelfMatch = node.name.toLowerCase().includes(term) || node.slug.toLowerCase().includes(term);
      
      const { filteredNodes: filteredChildren, hasMatch: hasChildMatch } = searchAndFilterTree(
        node.childrenNodes, 
        searchTerm, 
        autoExpandIds
      );
      
      if (isSelfMatch || hasChildMatch) {
        if (hasChildMatch) {
          autoExpandIds.add(node.id);
        }
        result.push({
          ...node,
          childrenNodes: filteredChildren
        });
      }
    });
    
    return { filteredNodes: result, hasMatch: result.length > 0 };
  }

  const { filteredNodes: searchedTree } = searchAndFilterTree(fullTree, search, searchAutoExpandIds);

  // Combine user expanded IDs and search-auto-expanded IDs
  const activeExpandedIds = new Set([
    ...Array.from(expandedIds),
    ...(search ? Array.from(searchAutoExpandIds) : [])
  ]);

  interface FlatRow {
    node: CategoryTreeNode;
    depth: number;
    hasChildren: boolean;
    isExpanded: boolean;
  }

  function flattenTree(
    nodes: CategoryTreeNode[], 
    expIds: Set<string>, 
    depth = 0
  ): FlatRow[] {
    const result: FlatRow[] = [];
    nodes.forEach(node => {
      const hasChildren = node.childrenNodes.length > 0;
      const isExpanded = expIds.has(node.id);
      
      result.push({
        node,
        depth,
        hasChildren,
        isExpanded
      });
      
      if (hasChildren && isExpanded) {
        result.push(...flattenTree(node.childrenNodes, expIds, depth + 1));
      }
    });
    return result;
  }

  const visibleRows = flattenTree(searchedTree, activeExpandedIds);
  // --- End of Nested Categories Tree Logic ---

  const filteredBrands = brands.filter(b => 
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatNum = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none" dir="rtl">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <Tags className="w-6 h-6 text-blue-500" />
            کاتالوگ فروشگاه (دسته‌بندی‌ها و برندها)
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">
            سازمان‌دهی ساختار درختی دسته‌بندی‌ها، پیوندهای منو، و برندهای تجاری همکار
          </p>
        </div>
        
        {activeTab === 'categories' ? (
          <Link 
            href="/admin/categories/new" 
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            ایجاد شاخه (دسته‌بندی) جدید
          </Link>
        ) : (
          <button 
            onClick={handleOpenAddBrand}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md shrink-0"
          >
            <Plus className="w-4 h-4" />
            ایجاد برند تجاری جدید
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          onClick={() => { setActiveTab('categories'); setSearch(''); }}
          className={`pb-3 text-sm font-black transition-colors flex items-center gap-2 border-b-2 px-2 ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
          }`}
        >
          <Tags className="w-4 h-4" />
          دسته‌بندی‌ها ({formatNum(categories.length)})
        </button>
        <button
          onClick={() => { setActiveTab('brands'); setSearch(''); }}
          className={`pb-3 text-sm font-black transition-colors flex items-center gap-2 border-b-2 px-2 ${
            activeTab === 'brands'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-850 dark:hover:text-slate-300'
          }`}
        >
          <Award className="w-4 h-4" />
          برندهای کالا ({formatNum(brands.length)})
        </button>
      </div>

      {/* Category AI Prompt Control */}
      {activeTab === 'categories' && (
        <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-purple-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند دسته‌بندی (کنترل با پرامپت)</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                با نوشتن دستورهای متنی به زبان ساده، دسته‌بندی‌های جدید بسازید، آن‌ها را ویرایش، غیرفعال یا حذف کنید! تمام تغییرات مستقیماً در پایگاه‌داده اعمال خواهند شد.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={promptInput}
                onChange={(e) => setPromptInput(e.target.value)}
                placeholder="مثال: دسته‌بندی جدید به نام لپ‌تاپ با آیکون لپ‌تاپ و توضیحات سئو شده ایجاد کن..."
                className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyAiControl();
                  }
                }}
                disabled={controlling}
              />
              <button
                type="button"
                disabled={controlling || !promptInput.trim()}
                onClick={handleApplyAiControl}
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {controlling ? (
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
                'یک دسته‌بندی جدید به نام «لوازم خانگی» با آیکون مناسب ایجاد کن',
                'دسته‌بندی موبایل را غیرفعال کن',
                'نام دسته‌بندی پوشاک زنانه را به لباس زنانه تغییر بده',
                'توضیحات سئو برای دسته‌بندی کفش ورزشی تولید کن',
                'دسته‌بندی دیجیتال را حذف کن'
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPromptInput(sug)}
                  className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                >
                  {sug}
                </button>
              ))}
            </div>

            {controlError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{controlError}</span>
              </div>
            )}

            {controlSuccessMessage && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5 animate-in fade-in duration-200">
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">دستور با موفقیت اعمال شد:</p>
                  <p className="text-[11px] opacity-90">{controlSuccessMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Brand AI Prompt Control */}
      {activeTab === 'brands' && (
        <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند برندها (کنترل با پرامپت)</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
                با نوشتن دستورهای متنی به زبان ساده، برندهای جدید بسازید، آن‌ها را ویرایش یا حذف کنید! تمام تغییرات مستقیماً در پایگاه‌داده اعمال خواهند شد.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={brandPromptInput}
                onChange={(e) => setBrandPromptInput(e.target.value)}
                placeholder="مثال: برند جدید به نام Nike با لوگوی مناسب ایجاد کن و برند سامسونگ را به Samsung تغییر نام بده..."
                className="flex-1 px-4 py-3 border border-indigo-200 dark:border-indigo-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleApplyBrandAiControl();
                  }
                }}
                disabled={controllingBrand}
              />
              <button
                type="button"
                disabled={controllingBrand || !brandPromptInput.trim()}
                onClick={handleApplyBrandAiControl}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                {controllingBrand ? (
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
                'یک برند جدید به نام «Nike» ایجاد کن',
                'برند سامسونگ را به Samsung تغییر نام بده',
                'برندهای Nike و Adidas و Apple را با لوگو ایجاد کن',
                'برند ال‌جی را حذف کن'
              ].map((sug, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBrandPromptInput(sug)}
                  className="text-[10px] bg-white hover:bg-indigo-50 dark:bg-slate-900 dark:hover:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
                >
                  {sug}
                </button>
              ))}
            </div>

            {brandControlError && (
              <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{brandControlError}</span>
              </div>
            )}

            {brandControlSuccessMessage && (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl text-xs font-semibold leading-relaxed border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5 animate-in fade-in duration-200">
                <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">دستور با موفقیت اعمال شد:</p>
                  <p className="text-[11px] opacity-90">{brandControlSuccessMessage}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input 
            type="text" 
            placeholder={activeTab === 'categories' ? "جستجو در عنوان یا پیوند دسته‌بندی‌ها (Slug)..." : "جستجو در نام برندها..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-4 pr-11 py-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all shadow-sm focus:border-blue-500"
          />
        </div>

        {activeTab === 'categories' && categories.length > 0 && (
          <div className="flex items-center gap-2 select-none">
            <button
              onClick={expandAll}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs transition-colors flex items-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4 text-blue-500" />
              باز کردن همه شاخه‌ها
            </button>
            <button
              onClick={collapseAll}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850/80 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-xs transition-colors flex items-center gap-1.5"
            >
              <Folder className="w-4 h-4 text-slate-400" />
              بستن همه شاخه‌ها
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      {activeTab === 'categories' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs font-bold">
              <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none whitespace-nowrap">
                <tr>
                  <th className="px-6 py-4.5 font-black min-w-[320px]">عنوان ساختاری دسته‌بندی</th>
                  <th className="px-6 py-4.5 font-black">نامک پیوند (Slug)</th>
                  <th className="px-6 py-4.5 font-black text-center">محصولات تخصیص‌یافته</th>
                  <th className="px-6 py-4.5 font-black text-center">وضعیت انتشار</th>
                  <th className="px-6 py-4.5 font-black text-center">عملیات مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                {loadingCategories ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-500 animate-spin" />
                        <span className="font-bold text-xs">در حال بارگذاری لیست ساختار درخت...</span>
                      </div>
                    </td>
                  </tr>
                ) : visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Tags className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                        <span className="font-black text-sm">هیچ دسته‌بندی مشخصی یافت نشد!</span>
                        <span className="text-[10px] text-slate-400 font-medium">برای شروع می‌توانید یک دسته‌بندی جدید تعریف کنید.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(({ node: category, depth, hasChildren, isExpanded }) => (
                    <tr key={category.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors group">
                      <td className="p-0 min-w-[320px] whitespace-nowrap">
                        <div className="flex items-stretch font-black text-slate-800 dark:text-slate-100 text-sm select-none ps-6">
                          {/* Indentation guide lines */}
                          {Array.from({ length: depth }).map((_, index) => (
                            <div 
                              key={index} 
                              className="w-6 border-s border-slate-200 dark:border-slate-800/60 shrink-0 self-stretch"
                            />
                          ))}
                          
                          <div className="flex items-center gap-2 pe-6 py-4.5">
                            {/* Expand/Collapse Chevron */}
                            {hasChildren ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpand(category.id);
                                }}
                                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-500 hover:text-blue-600 focus:outline-none shrink-0"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-blue-500" />
                                ) : (
                                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            ) : (
                              <div className="w-6 h-6 flex items-center justify-center shrink-0">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
                              </div>
                            )}

                            {/* Icon or Image */}
                            <span className="shrink-0 flex items-center justify-center">
                              {category.imageUrl ? (
                                <img 
                                  src={category.imageUrl} 
                                  alt={category.name} 
                                  className="w-5 h-5 object-cover rounded-md border border-slate-100 dark:border-slate-800" 
                                />
                              ) : (
                                <CategoryIcon 
                                  name={category.icon} 
                                  className="w-4 h-4 text-slate-500 dark:text-slate-400 group-hover:text-blue-500 transition-colors" 
                                  fallback={hasChildren ? (isExpanded ? <FolderOpen className="w-4 h-4 text-blue-500" /> : <Folder className="w-4 h-4 text-slate-400" />) : <Tags className="w-4 h-4 text-slate-400" />}
                                  size={16}
                                />
                              )}
                            </span>

                            {/* Name */}
                            <span className="text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
                              {category.name}
                            </span>

                            {/* Subcategory Count Badge */}
                            {hasChildren && (
                              <span className="mr-2 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                {category.childrenNodes.length} زیرشاخه
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4.5 text-slate-500 dark:text-slate-400 font-mono text-[11px] select-all whitespace-nowrap">
                        {category.slug}
                      </td>
                      <td className="px-6 py-4.5 text-center text-slate-800 dark:text-slate-200 font-black text-[13px] whitespace-nowrap">
                        {formatNum(category._count?.products || 0)} <span className="text-[10px] text-slate-400 font-medium">کالا</span>
                      </td>
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black shadow-sm ${
                          category.isActive 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200/10' 
                            : 'bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}>
                          {category.isActive ? 'فعال و نمایان' : 'غیرفعال'}
                        </span>
                      </td>
                      <td className="px-6 py-4.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-2">
                          <Link 
                            href={`/admin/categories/${category.id}/edit`}
                            title="ویرایش دسته‌بندی"
                            className="p-2 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 dark:bg-slate-950 dark:hover:bg-blue-950/30 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button 
                            onClick={() => handleDeleteCategory(category.id)}
                            title="حذف دسته‌بندی"
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
      ) : (
        /* Brands Tab */
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800/80 overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-right text-xs font-bold">
              <thead className="bg-slate-50/80 dark:bg-slate-950/40 text-slate-450 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/60 select-none">
                <tr>
                  <th className="px-6 py-4.5 font-black">لوگو / نشان برند</th>
                  <th className="px-6 py-4.5 font-black">نام برند تجاری</th>
                  <th className="px-6 py-4.5 font-black text-center">تاریخ ایجاد</th>
                  <th className="px-6 py-4.5 font-black text-center">عملیات مدیریت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
                {loadingBrands ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-indigo-500 animate-spin" />
                        <span className="font-bold text-xs">در حال بارگذاری لیست برندها...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredBrands.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-3">
                        <Award className="w-12 h-12 text-slate-300 dark:text-slate-700" />
                        <span className="font-black text-sm">هیچ برندی یافت نشد!</span>
                        <span className="text-[10px] text-slate-400 font-medium">برای شروع می‌توانید یک برند تجاری جدید تعریف کنید.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredBrands.map((brand) => (
                    <tr key={brand.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-850/15 transition-colors group">
                      <td className="px-6 py-4">
                        {brand.logoUrl ? (
                          <div className="relative w-12 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl p-1 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                            <img 
                              src={brand.logoUrl} 
                              alt={brand.name} 
                              className="object-contain max-h-full max-w-full" 
                            />
                          </div>
                        ) : (
                          <div className="w-12 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-750">
                            <Award className="w-5 h-5" />
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-slate-800 dark:text-white font-black text-sm group-hover:text-indigo-500 transition-colors">
                          {brand.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center text-slate-500 dark:text-slate-400 font-medium">
                        {new Date(brand.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => handleOpenEditBrand(brand)}
                            title="ویرایش برند"
                            className="p-2 text-slate-500 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-950 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-800 rounded-xl transition-all hover:shadow-sm"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteBrand(brand.id)}
                            title="حذف برند"
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
      )}

      {/* Brand Modal */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
              <h2 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-500" />
                {brandForm.id ? 'ویرایش اطلاعات برند تجاری' : 'افزودن برند تجاری جدید'}
              </h2>
              <button 
                onClick={() => setShowBrandModal(false)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBrand} className="p-6 space-y-5">
              {brandError && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200/40 rounded-2xl p-4 text-xs font-bold">
                  {brandError}
                </div>
              )}

              {/* AI Brand Assistant */}
              <div className="bg-indigo-50/50 dark:bg-indigo-950/10 border border-indigo-100/50 dark:border-indigo-900/20 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-xs font-black">دستیار هوشمند برند</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                  هر نوع توضیحی از برند (مثلاً: "ما شرکت نایک هستیم که کفش ورزشی تولید می‌کنیم") را بنویسید تا هوش مصنوعی نام برند و لوگوی آن را استخراج و تنظیم کند.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiBrandExplanation}
                    onChange={(e) => setAiBrandExplanation(e.target.value)}
                    placeholder="توضیحات برند را اینجا بنویسید..."
                    className="flex-1 px-3.5 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-xl outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
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
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                  >
                    {cleaningBrand ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        پردازش...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        استخراج
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">نام برند تجاری</label>
                <input 
                  type="text" 
                  value={brandForm.name}
                  onChange={(e) => setBrandForm({ ...brandForm, name: e.target.value })}
                  placeholder="مثال: Nike, Apple, Zara, ..." 
                  required
                  className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-indigo-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">لوگو / نشان برند</label>
                <div className="flex items-center gap-3">
                  {brandForm.logoUrl ? (
                    <div className="relative w-16 h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl p-1 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                      <img 
                        src={brandForm.logoUrl} 
                        alt="Preview" 
                        className="object-contain max-h-full max-w-full" 
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-300 dark:text-slate-750 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}

                  <div className="flex-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-200 py-3 rounded-2xl font-black text-xs transition-colors"
                    >
                      {brandForm.logoUrl ? 'تغییر لوگو' : 'انتخاب لوگو از رسانه'}
                    </button>
                    {brandForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setBrandForm({ ...brandForm, logoUrl: '' })}
                        className="p-3 bg-red-50 hover:bg-red-100 text-red-500 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-2xl transition-colors"
                        title="حذف لوگو"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBrandModal(false)}
                  className="px-5 py-3 border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/50 rounded-2xl font-black text-xs transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={savingBrand}
                  className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  {savingBrand ? 'در حال ذخیره...' : 'ذخیره برند'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Media Picker Portal */}
      {showMediaPicker && (
        <MediaPicker
          accepts="image/*"
          title="انتخاب لوگوی برند تجاری"
          onSelect={(url) => {
            setBrandForm({ ...brandForm, logoUrl: url });
            setShowMediaPicker(false);
          }}
          onClose={() => setShowMediaPicker(false)}
        />
      )}
    </div>
  );
}
