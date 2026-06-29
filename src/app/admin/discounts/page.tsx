// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Percent, 
  Calendar, 
  Users, 
  Folder, 
  X, 
  Check, 
  Info, 
  Coins, 
  TrendingDown, 
  Search,
  CheckSquare,
  Square,
  Clock,
  Settings,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import JalaliDatePicker from '@/components/JalaliDatePicker';

interface DiscountCode {
  id: string;
  code: string;
  discount: number;
  type: 'percentage' | 'flat';
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  expiresAt: string | null;
  startDate: string | null;
  minOrderAmount: number | null;
  minQuantity: number | null;
  maxDiscountAmount: number | null;
  maxUsesPerUser: number | null;
  firstOrderOnly: boolean;
  targetCategoryIds: string | null;
  targetProductIds: string | null;
  allowedGender: string | null;
  targetUserId: string | null;
  createdAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function DiscountsPage() {
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  
  // AI Assistant for Discounts Page
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');

  // AI Confirmation states
  const [aiProposedOps, setAiProposedOps] = useState<any[] | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  const handleUpdateProposedOp = (index: number, field: string, value: any) => {
    if (!aiProposedOps) return;
    const updated = [...aiProposedOps];
    updated[index] = {
      ...updated[index],
      data: {
        ...updated[index].data,
        [field]: value
      }
    };
    setAiProposedOps(updated);
  };

  const handleToggleCategoryForProposedOp = (opIndex: number, categoryId: string) => {
    if (!aiProposedOps) return;
    const op = aiProposedOps[opIndex];
    const opData = op.data || {};
    let currentCategories: string[] = [];
    try {
      currentCategories = JSON.parse(opData.targetCategoryIds || '[]');
      if (!Array.isArray(currentCategories)) currentCategories = [];
    } catch (e) {
      currentCategories = [];
    }

    const updatedCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];

    handleUpdateProposedOp(opIndex, 'targetCategoryIds', JSON.stringify(updatedCategories));
  };

  const getSensitiveWarnings = (op: any) => {
    const warnings = [];
    const data = op.data || {};
    const type = data.type || 'percentage';
    const discount = parseFloat(data.discount) || 0;
    const maxUses = data.maxUses;
    const expiresAt = data.expiresAt;
    const minOrderAmount = data.minOrderAmount;
    const maxDiscountAmount = data.maxDiscountAmount;
    const maxUsesPerUser = data.maxUsesPerUser;

    if (op.type === 'create' || op.type === 'update') {
      // 1. Unlimited usage
      if (maxUses === null || maxUses === undefined || maxUses === '') {
        warnings.push({
          id: 'maxUses',
          type: 'danger',
          message: 'این کد تخفیف سقف تعداد استفاده ندارد (نامحدود است). هر کسی می‌تواند به تعداد بی‌نهایت بار از آن استفاده کند.'
        });
      }

      // 2. No expiration date
      if (!expiresAt) {
        warnings.push({
          id: 'expiresAt',
          type: 'warning',
          message: 'تاریخ انقضا برای این کد تعیین نشده است؛ این کد تا زمانی که دستی غیرفعال نشود معتبر خواهد بود.'
        });
      }

      // 3. High discount value
      if (type === 'percentage' && discount >= 50) {
        warnings.push({
          id: 'discount_high',
          type: 'danger',
          message: `درصد تخفیف بسیار بالا است (${discount}٪). آیا نسبت به این موضوع مطمئن هستید؟`
        });
      } else if (type === 'flat' && discount >= 500000) {
        warnings.push({
          id: 'discount_high',
          type: 'danger',
          message: `مبلغ تخفیف بسیار بالا است (${discount.toLocaleString()} تومان). آیا نسبت به این موضوع مطمئن هستید؟`
        });
      }

      // 4. No minimum order amount
      if (minOrderAmount === null || minOrderAmount === undefined || minOrderAmount === '' || parseFloat(minOrderAmount) === 0) {
        warnings.push({
          id: 'minOrderAmount',
          type: 'warning',
          message: 'حداقل مبلغ خرید تعیین نشده است؛ این کد روی سبدهای خرید با هر مبلغی (حتی سبدهای بسیار ارزان) اعمال خواهد شد.'
        });
      }

      // 5. No max discount amount for percentage
      if (type === 'percentage' && (maxDiscountAmount === null || maxDiscountAmount === undefined || maxDiscountAmount === '')) {
        warnings.push({
          id: 'maxDiscountAmount',
          type: 'danger',
          message: 'سقف تخفیف برای این کد درصدی تعیین نشده است. در سفارش‌های با مبالغ بالا، مبلغ تخفیف می‌تواند بسیار نجومی شود!'
        });
      }

      // 6. Multiple uses per user
      if (maxUsesPerUser === null || maxUsesPerUser === undefined || parseInt(maxUsesPerUser) > 1) {
        warnings.push({
          id: 'maxUsesPerUser',
          type: 'warning',
          message: `هر کاربر می‌تواند ${maxUsesPerUser ? maxUsesPerUser + ' بار' : 'به تعداد نامحدود'} از این کد استفاده کند.`
        });
      }
    }
    return warnings;
  };

  const handleApplyAiControl = async (confirmed = false, customOperations: any[] | null = null, customExplanation = '') => {
    if ((!promptInput.trim() && !confirmed) || controlling) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');
    setSaveStatus('saving');
    setSaveError('');

    try {
      const res = await fetch('/api/admin/discounts/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
          discounts: discounts.map(d => ({
            id: d.id,
            code: d.code,
            discount: d.discount,
            type: d.type,
            maxUses: d.maxUses,
            usedCount: d.usedCount,
            isActive: d.isActive,
            expiresAt: d.expiresAt,
            startDate: d.startDate,
            minOrderAmount: d.minOrderAmount,
            minQuantity: d.minQuantity,
            maxDiscountAmount: d.maxDiscountAmount,
            maxUsesPerUser: d.maxUsesPerUser,
            firstOrderOnly: d.firstOrderOnly,
            allowedGender: d.allowedGender,
            targetUserId: d.targetUserId,
            targetCategoryIds: d.targetCategoryIds,
            targetProductIds: d.targetProductIds
          })),
          confirmed,
          operations: customOperations,
          explanation: customExplanation
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند کدهای تخفیف رخ داد.');
      }

      if (data.success) {
        if (data.requireConfirmation) {
          setAiProposedOps(data.operations);
          setAiExplanation(data.explanation);
          setSaveStatus('idle');
        } else {
          setControlSuccessMessage(data.explanation || 'تغییرات با موفقیت توسط هوش مصنوعی اعمال شد.');
          setPromptInput('');
          setSaveStatus('saved');
          setAiProposedOps(null);
          await fetchDiscounts();
        }
      } else {
        setControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
        setSaveStatus('error');
        setSaveError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
      }
    } catch (err: any) {
      setControlError(err.message || 'خطایی در ارتباط با سرور رخ داد.');
      setSaveStatus('error');
      setSaveError(err.message || 'خطایی در ارتباط با سرور رخ داد.');
    } finally {
      setControlling(false);
    }
  };
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'basic' | 'limits' | 'scheduling'>('basic');

  // Form states
  const [form, setForm] = useState({
    code: '',
    discount: '',
    type: 'percentage',
    maxUses: '',
    isActive: true,
    expiresAt: '',
    startDate: '',
    minOrderAmount: '',
    minQuantity: '',
    maxDiscountAmount: '',
    maxUsesPerUser: '1',
    firstOrderOnly: false,
    allowedGender: 'all',
    targetUserId: '',
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    fetchDiscounts();
    fetchCategories();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get('aiPrompt');
      if (promptParam) {
        setPromptInput(promptParam);
        setTimeout(() => {
          document.getElementById('ai-assistant-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    }
  }, []);

  const fetchDiscounts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/discounts');
      if (res.ok) {
        const data = await res.json();
        setDiscounts(data.discounts || []);
      }
    } catch (err) {
      console.error('Error fetching discounts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  const handleGenerateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomCode = '';
    for (let i = 0; i < 8; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setForm(prev => ({ ...prev, code: randomCode }));
  };

  const handleOpenAdd = () => {
    setIsEditing(false);
    setSelectedId(null);
    setError('');
    setActiveModalTab('basic');
    setForm({
      code: '',
      discount: '',
      type: 'percentage',
      maxUses: '',
      isActive: true,
      expiresAt: '',
      startDate: '',
      minOrderAmount: '',
      minQuantity: '',
      maxDiscountAmount: '',
      maxUsesPerUser: '1',
      firstOrderOnly: false,
      allowedGender: 'all',
      targetUserId: '',
    });
    setSelectedCategories([]);
    setShowModal(true);
  };

  const handleOpenEdit = (discount: DiscountCode) => {
    setIsEditing(true);
    setSelectedId(discount.id);
    setError('');
    setActiveModalTab('basic');
    
    // Parse dates to YYYY-MM-DDTHH:MM for JalaliDatePicker compatibility
    const formatDateTimeLocal = (dateStr: string | null) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hour = String(d.getHours()).padStart(2, '0');
      const minute = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hour}:${minute}`;
    };

    setForm({
      code: discount.code,
      discount: discount.discount.toString(),
      type: discount.type,
      maxUses: discount.maxUses ? discount.maxUses.toString() : '',
      isActive: discount.isActive,
      expiresAt: formatDateTimeLocal(discount.expiresAt),
      startDate: formatDateTimeLocal(discount.startDate),
      minOrderAmount: discount.minOrderAmount ? discount.minOrderAmount.toString() : '',
      minQuantity: discount.minQuantity ? discount.minQuantity.toString() : '',
      maxDiscountAmount: discount.maxDiscountAmount ? discount.maxDiscountAmount.toString() : '',
      maxUsesPerUser: discount.maxUsesPerUser ? discount.maxUsesPerUser.toString() : '',
      firstOrderOnly: discount.firstOrderOnly,
      allowedGender: discount.allowedGender || 'all',
      targetUserId: discount.targetUserId || '',
    });

    // Parse category IDs
    try {
      const catIds = JSON.parse(discount.targetCategoryIds || '[]');
      setSelectedCategories(Array.isArray(catIds) ? catIds : []);
    } catch (e) {
      setSelectedCategories([]);
    }

    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این کد تخفیف مطمئن هستید؟')) return;

    try {
      const res = await fetch(`/api/admin/discounts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDiscounts(discounts.filter(d => d.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف کد تخفیف');
      }
    } catch (err) {
      console.error('Error deleting discount:', err);
      alert('خطای سرور');
    }
  };

  const handleToggleStatus = async (discount: DiscountCode) => {
    if (togglingId) return;
    setTogglingId(discount.id);
    try {
      const updatedStatus = !discount.isActive;
      const res = await fetch(`/api/admin/discounts/${discount.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...discount,
          isActive: updatedStatus,
          discount: discount.discount,
          maxUses: discount.maxUses,
          minOrderAmount: discount.minOrderAmount,
          minQuantity: discount.minQuantity,
          maxDiscountAmount: discount.maxDiscountAmount,
          maxUsesPerUser: discount.maxUsesPerUser,
        }),
      });
      if (res.ok) {
        setDiscounts(discounts.map(d => d.id === discount.id ? { ...d, isActive: updatedStatus } : d));
      } else {
        alert('خطا در تغییر وضعیت کد تخفیف');
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.code.trim()) {
      setError('کد تخفیف الزامی است');
      setActiveModalTab('basic');
      return;
    }
    if (!form.discount || Number(form.discount) <= 0) {
      setError('مقدار تخفیف الزامی و باید بزرگتر از صفر باشد');
      setActiveModalTab('basic');
      return;
    }
    if (form.type === 'percentage' && Number(form.discount) > 100) {
      setError('درصد تخفیف نمی‌تواند بیشتر از ۱۰۰ باشد');
      setActiveModalTab('basic');
      return;
    }

    setSaving(true);

    const payload = {
      ...form,
      targetCategoryIds: JSON.stringify(selectedCategories),
      targetProductIds: "[]",
    };

    try {
      const url = isEditing ? `/api/admin/discounts/${selectedId}` : '/api/admin/discounts';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setShowModal(false);
        fetchDiscounts();
      } else {
        setError(data.error || 'خطا در ذخیره‌سازی اطلاعات');
      }
    } catch (err) {
      setError('خطای شبکه. دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  };

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId) 
        : [...prev, categoryId]
    );
  };

  const filteredDiscounts = discounts.filter(d => 
    d.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDateShamsi = (dateStr: string | null) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Percent className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-900 dark:text-white">کدهای تخفیف</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mt-1">مدیریت تخفیف‌های هوشمند، زمان‌بندی شمسی، دسته‌بندی و سفارش اول خریداران</p>
          </div>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-98 transition-all shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>ایجاد کد تخفیف جدید</span>
        </button>
      </div>

      {/* AI Prompt Control */}
      <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند کدهای تخفیف (کنترل با پرامپت)</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
              با نوشتن دستورهای متنی به زبان ساده، کدهای تخفیف جدید بسازید، آن‌ها را ویرایش، فعال/غیرفعال یا حذف کنید! تمام تغییرات مستقیماً در پایگاه‌داده اعمال خواهند شد.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="مثال: کد تخفیف جدید به نام YALDA40 با تخفیف ۴۰ درصدی برای اولین خرید ایجاد کن..."
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
              onClick={() => handleApplyAiControl()}
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
              'کد تخفیف جدید به نام OFF50 با تخفیف ۵۰ درصدی برای خریدهای بالای ۵۰۰ هزار تومان ایجاد کن',
              'کد تخفیف SUMMER1405 را غیرفعال کن',
              'کد تخفیف مخصوص اولین خرید به نام FIRSTBUY با تخفیف ۲۰ هزار تومانی بساز',
              'کد تخفیف YALDA40 را حذف کن',
              'کد تخفیف جدید مخصوص بانوان به نام LADY30 با تخفیف ۳۰ درصد ایجاد کن'
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromptInput(sug)}
                className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold cursor-pointer"
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

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="جستجوی کد تخفیف..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 transition-all border-transparent focus:border-blue-500"
          />
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-bold text-gray-500 dark:text-gray-400">در حال بارگذاری لیست کدهای تخفیف...</div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="p-12 text-center text-xs font-bold text-gray-500 dark:text-gray-400">کد تخفیفی یافت نشد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-gray-50/50 dark:bg-slate-800/50 text-xs font-black text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-slate-800 select-none">
                  <th className="p-4 py-3.5">کد</th>
                  <th className="p-4 py-3.5">نوع تخفیف</th>
                  <th className="p-4 py-3.5">میزان تخفیف</th>
                  <th className="p-4 py-3.5">حداقل خرید</th>
                  <th className="p-4 py-3.5">محدودیت‌ها</th>
                  <th className="p-4 py-3.5">استفاده شده</th>
                  <th className="p-4 py-3.5">بازه اعتبار (شمسی)</th>
                  <th className="p-4 py-3.5">وضعیت</th>
                  <th className="p-4 py-3.5 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800 text-xs font-bold text-gray-700 dark:text-gray-300">
                {filteredDiscounts.map((discount) => {
                  const hasExpired = discount.expiresAt && new Date(discount.expiresAt) < new Date();
                  const hasReachedMax = discount.maxUses && discount.usedCount >= discount.maxUses;
                  const isInvalid = hasExpired || hasReachedMax;

                  return (
                    <tr key={discount.id} className="hover:bg-gray-50/40 dark:hover:bg-slate-800/20 transition-all">
                      <td className="p-4 font-black text-sm tracking-wider text-blue-600 dark:text-blue-400">{discount.code}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                          discount.type === 'percentage' 
                            ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400' 
                            : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {discount.type === 'percentage' ? 'درصدی' : 'مبلغ ثابت'}
                        </span>
                      </td>
                      <td className="p-4 font-black">
                        {discount.type === 'percentage' 
                          ? `${discount.discount.toLocaleString('fa-IR')}%` 
                          : `${discount.discount.toLocaleString('fa-IR')} تومان`}
                      </td>
                      <td className="p-4 font-bold text-gray-500 dark:text-gray-400">
                        {discount.minOrderAmount 
                          ? `${discount.minOrderAmount.toLocaleString('fa-IR')} تومان` 
                          : 'بدون محدودیت'}
                      </td>
                      <td className="p-4 space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {discount.minQuantity && discount.minQuantity > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded text-[9px]">
                              حداقل تعداد: {discount.minQuantity.toLocaleString('fa-IR')} عدد
                            </span>
                          )}
                          {discount.firstOrderOnly && (
                            <span className="px-1.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded text-[9px]">اولین خرید</span>
                          )}
                          {discount.allowedGender && discount.allowedGender !== 'all' && (
                            <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded text-[9px]">
                              جنسیت: {discount.allowedGender === 'male' ? 'آقایان' : 'بانوان'}
                            </span>
                          )}
                          {discount.targetCategoryIds && JSON.parse(discount.targetCategoryIds).length > 0 && (
                            <span className="px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded text-[9px]">
                              دسته‌بندی خاص ({JSON.parse(discount.targetCategoryIds).length})
                            </span>
                          )}
                          {discount.targetUserId && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded text-[9px]">
                              مشتری: {users.find(u => u.id === discount.targetUserId)?.name || 'مشتری خاص'}
                            </span>
                          )}
                          {!discount.firstOrderOnly && (!discount.allowedGender || discount.allowedGender === 'all') && (!discount.targetCategoryIds || JSON.parse(discount.targetCategoryIds).length === 0) && !discount.targetUserId && (
                            <span className="text-gray-400 font-normal">ندارد</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-gray-550 dark:text-gray-400">
                        <span className="font-black text-gray-800 dark:text-gray-200">{(discount.usedCount).toLocaleString('fa-IR')}</span>
                        {discount.maxUses ? ` از ${discount.maxUses.toLocaleString('fa-IR')}` : ' بار'}
                      </td>
                      <td className="p-4 space-y-1 text-[10px] text-gray-500 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} className="text-gray-400 shrink-0" />
                          <span>شروع: {formatDateShamsi(discount.startDate)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} className="text-gray-400 shrink-0" />
                          <span>انقضا: {formatDateShamsi(discount.expiresAt)}</span>
                        </div>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          {/* Toggle Switch */}
                          <button 
                            type="button"
                            disabled={togglingId === discount.id}
                            onClick={() => handleToggleStatus(discount)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              discount.isActive ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-gray-200 dark:bg-slate-800'
                            } ${togglingId === discount.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <span
                              className={`pointer-events-none flex items-center justify-center h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                discount.isActive ? '-translate-x-5' : 'translate-x-0'
                              }`}
                            >
                              {togglingId === discount.id && (
                                <Loader2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 animate-spin" />
                              )}
                            </span>
                          </button>

                          {/* Status Badge */}
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black shadow-xs border ${
                            hasExpired 
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200/10' 
                              : hasReachedMax 
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-200/10' 
                                : discount.isActive 
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-200/10' 
                                  : 'bg-gray-50 text-gray-500 dark:bg-gray-800/50 dark:text-gray-400 border-gray-200/10'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              hasExpired 
                                ? 'bg-amber-500' 
                                : hasReachedMax 
                                  ? 'bg-rose-500' 
                                  : discount.isActive 
                                    ? 'bg-emerald-500 animate-pulse' 
                                    : 'bg-gray-400'
                            }`} />
                            {hasExpired 
                              ? 'منقضی شده' 
                              : hasReachedMax 
                                ? 'پایان ظرفیت' 
                                : discount.isActive 
                                  ? 'فعال' 
                                  : 'غیرفعال'}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-left space-x-2 space-x-reverse">
                        <button 
                          onClick={() => handleOpenEdit(discount)}
                          className="p-1.5 bg-gray-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/30 text-gray-500 hover:text-blue-600 rounded-xl transition-all"
                          title="ویرایش"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(discount.id)}
                          className="p-1.5 bg-gray-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/30 text-gray-500 hover:text-rose-600 rounded-xl transition-all"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-gray-150 dark:border-slate-800 animate-slideUp">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Percent className="w-5 h-5" />
                  </div>
                  <h3 className="font-black text-gray-900 dark:text-white text-base">
                    {isEditing ? 'ویرایش کد تخفیف' : 'ایجاد کد تخفیف جدید'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowModal(false)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tabs Selector */}
              <div className="flex border-b border-gray-100 dark:border-gray-800 select-none shrink-0 px-6 bg-gray-50/50 dark:bg-gray-950/20">
                <button
                  type="button"
                  onClick={() => setActiveModalTab('basic')}
                  className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 transition-all outline-none ${
                    activeModalTab === 'basic'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  اطلاعات اصلی
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('limits')}
                  className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 transition-all outline-none ${
                    activeModalTab === 'limits'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  محدودیت‌ها و شروط
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModalTab('scheduling')}
                  className={`flex-1 py-3.5 text-xs font-black text-center border-b-2 transition-all outline-none ${
                    activeModalTab === 'scheduling'
                      ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-black'
                      : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  زمان‌بندی و دسته‌بندی
                </button>
              </div>

              {/* Modal Content / Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[65vh] overflow-y-auto no-scrollbar">
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* TAB 1: Basic Settings */}
                {activeModalTab === 'basic' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      <Settings className="w-4 h-4 text-blue-500" />
                      <h4 className="font-black text-gray-900 dark:text-white text-xs">تنظیمات پایه و اصلی کد</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Code Input & Generator */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">کد تخفیف *</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={form.code}
                            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().trim() })}
                            placeholder="SUMMER1405"
                            className="flex-1 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-black tracking-wider uppercase focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-left dir-ltr"
                          />
                          <button
                            type="button"
                            onClick={handleGenerateCode}
                            className="px-3 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 font-bold text-xs border border-gray-200 dark:border-gray-700 transition-all active:scale-95"
                          >
                            تولید تصادفی
                          </button>
                        </div>
                      </div>

                      {/* Discount Type */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">نوع تخفیف *</label>
                        <select
                          value={form.type}
                          onChange={(e) => setForm({ ...form, type: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                        >
                          <option value="percentage">درصدی (%)</option>
                          <option value="flat">مبلغ ثابت (تومان)</option>
                        </select>
                      </div>

                      {/* Discount Value */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
                          {form.type === 'percentage' ? 'درصد تخفیف *' : 'مبلغ تخفیف (تومان) *'}
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            required
                            min="1"
                            max={form.type === 'percentage' ? '100' : undefined}
                            value={form.discount}
                            onChange={(e) => setForm({ ...form, discount: e.target.value })}
                            placeholder={form.type === 'percentage' ? 'مثال: 20' : 'مثال: 50000'}
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pr-4 pl-10 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-left dir-ltr"
                          />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-4 text-gray-400 pointer-events-none text-xs font-bold font-sans">
                            {form.type === 'percentage' ? '٪' : 'تومان'}
                          </div>
                        </div>
                      </div>

                      {/* Max Discount Amount */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">سقف تخفیف (تومان)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={form.maxDiscountAmount}
                            onChange={(e) => setForm({ ...form, maxDiscountAmount: e.target.value })}
                            placeholder="خالی رها کنید در صورت عدم نیاز"
                            disabled={form.type === 'flat'}
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pr-4 pl-14 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all disabled:opacity-50 text-left dir-ltr"
                          />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-4 text-gray-400 pointer-events-none text-xs font-bold font-sans">
                            تومان
                          </div>
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">حداکثر مبلغی که این کد می‌تواند تخفیف دهد (مخصوص تخفیف درصدی).</p>
                      </div>
                    </div>

                    {/* Active Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                          <Info size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-800 dark:text-white">وضعیت فعال بودن کد تخفیف</span>
                          <span className="text-[9px] text-gray-450 dark:text-gray-400 font-bold mt-0.5">در صورت غیرفعال بودن، هیچ کاربری امکان استفاده از این کد را نخواهد داشت.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          form.isActive ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            form.isActive ? '-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: Limits & Restrictions */}
                {activeModalTab === 'limits' && (
                  <div className="space-y-6 animate-fadeIn">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                      <ShieldAlert className="w-4 h-4 text-blue-500" />
                      <h4 className="font-black text-gray-900 dark:text-white text-xs">محدودیت‌ها و شروط استفاده</h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Min Order Amount */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">حداقل مبلغ خرید (تومان)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={form.minOrderAmount}
                            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                            placeholder="مثال: 500000"
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pr-4 pl-14 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-left dir-ltr"
                          />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-4 text-gray-400 pointer-events-none text-xs font-bold font-sans">
                            تومان
                          </div>
                        </div>
                      </div>

                      {/* Min Quantity */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">حداقل تعداد خرید محصول (عدد)</label>
                        <div className="relative">
                          <input
                            type="number"
                            value={form.minQuantity}
                            onChange={(e) => setForm({ ...form, minQuantity: e.target.value })}
                            placeholder="مثال: 10"
                            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl py-2.5 pr-4 pl-14 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-left dir-ltr"
                          />
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-4 text-gray-400 pointer-events-none text-xs font-bold font-sans">
                            عدد
                          </div>
                        </div>
                      </div>

                      {/* Allowed Gender */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">محدودیت جنسیت</label>
                        <select
                          value={form.allowedGender}
                          onChange={(e) => setForm({ ...form, allowedGender: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                        >
                          <option value="all">همه کاربران (زن و مرد)</option>
                          <option value="male">فقط آقایان</option>
                          <option value="female">فقط بانوان</option>
                        </select>
                      </div>

                      {/* Target Customer */}
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">محدود به مشتری خاص (اختیاری)</label>
                        <select
                          value={form.targetUserId}
                          onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                        >
                          <option value="">همه مشتریان (بدون محدودیت کاربر)</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name || 'بدون نام'} ({u.email} {u.phone ? `- ${u.phone}` : ''})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Max Uses (Total Capacity) */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">کل دفعات استفاده (ظرفیت کد)</label>
                        <input
                          type="number"
                          value={form.maxUses}
                          onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
                          placeholder="بدون محدودیت"
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-left dir-ltr"
                        />
                      </div>

                      {/* Max Uses Per User */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-gray-600 dark:text-gray-400">دفعات استفاده مجاز برای هر کاربر</label>
                        <input
                          type="number"
                          value={form.maxUsesPerUser}
                          onChange={(e) => setForm({ ...form, maxUsesPerUser: e.target.value })}
                          placeholder="مثال: 1"
                          className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-left dir-ltr"
                        />
                      </div>
                    </div>

                    {/* First Order Only Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50/50 dark:bg-slate-800/20 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-xl">
                          <Users size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-black text-gray-800 dark:text-white">کد فقط برای اولین خرید معتبر باشد</span>
                          <span className="text-[9px] text-gray-450 dark:text-gray-400 font-bold mt-0.5">فقط کاربرانی که تا به حال خرید موفق نداشته‌اند می‌توانند از این کد استفاده کنند.</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setForm(prev => ({ ...prev, firstOrderOnly: !prev.firstOrderOnly }))}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          form.firstOrderOnly ? 'bg-emerald-500 dark:bg-emerald-600' : 'bg-gray-200 dark:bg-gray-800'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            form.firstOrderOnly ? '-translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 3: Scheduling & Categories */}
                {activeModalTab === 'scheduling' && (
                  <div className="space-y-6 animate-fadeIn">
                    {/* Date Pickers */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 pb-2">
                        <Calendar className="w-4 h-4 text-blue-500" />
                        <h4 className="font-black text-gray-900 dark:text-white text-xs">زمان‌بندی اعتبار (تقویم شمسی)</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">تاریخ شروع اعتبار</label>
                          <JalaliDatePicker
                            value={form.startDate}
                            onChange={(val) => setForm({ ...form, startDate: val })}
                          />
                          <p className="text-[9px] text-gray-400 font-bold">کد تخفیف از این تاریخ به بعد فعال و قابل استفاده خواهد بود.</p>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-600 dark:text-gray-400">تاریخ انقضاء</label>
                          <JalaliDatePicker
                            value={form.expiresAt}
                            onChange={(val) => setForm({ ...form, expiresAt: val })}
                          />
                          <p className="text-[9px] text-gray-400 font-bold">کد تخفیف پس از این تاریخ به صورت خودکار غیرفعال خواهد شد.</p>
                        </div>
                      </div>
                    </div>

                    {/* Category Restrictions */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                        <h4 className="font-black text-gray-900 dark:text-white text-xs flex items-center gap-2">
                          <Folder className="w-4 h-4 text-blue-500" />
                          <span>محدودیت دسته‌بندی کالاها</span>
                        </h4>
                        <span className="text-[10px] text-gray-400 font-bold">
                          {selectedCategories.length === 0 
                            ? 'اعمال روی تمام دسته‌بندی‌ها' 
                            : `${selectedCategories.length} دسته‌بندی انتخاب شده`}
                        </span>
                      </div>

                      <p className="text-[10px] text-gray-500 dark:text-gray-450 leading-relaxed font-bold">
                        در صورتی که هیچ دسته‌بندی‌ای را انتخاب نکنید، این تخفیف روی تمام کالاها اعمال خواهد شد. در صورت انتخاب، تخفیف فقط به کالاهای متعلق به دسته‌های انتخاب شده تعلق می‌گیرد.
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-1.5 bg-gray-55/40 dark:bg-slate-800/10 rounded-2xl border border-gray-100 dark:border-gray-800 select-none custom-scrollbar">
                        {categories.map((category) => {
                          const isChecked = selectedCategories.includes(category.id);
                          return (
                            <button
                              key={category.id}
                              type="button"
                              onClick={() => handleCategoryToggle(category.id)}
                              className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-right transition-all outline-none ${
                                isChecked
                                  ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40 text-blue-600 dark:text-blue-400 font-black shadow-sm'
                                  : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800/80 text-gray-600 dark:text-gray-450 hover:bg-gray-50 dark:hover:bg-slate-800/50'
                              }`}
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                              ) : (
                                <Square className="w-4 h-4 text-gray-400 shrink-0" />
                              )}
                              <span className="text-[11px] truncate">{category.name}</span>
                            </button>
                          );
                        })}
                        {categories.length === 0 && (
                          <div className="col-span-full py-6 text-center text-[11px] text-gray-400 font-bold">هیچ دسته‌بندی‌ای یافت نشد.</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Modal Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
                  {/* Step Indicators for UX */}
                  <div className="flex gap-1.5">
                    <span className={`w-2 h-2 rounded-full transition-all ${activeModalTab === 'basic' ? 'bg-blue-600 w-5' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    <span className={`w-2 h-2 rounded-full transition-all ${activeModalTab === 'limits' ? 'bg-blue-600 w-5' : 'bg-gray-300 dark:bg-gray-700'}`} />
                    <span className={`w-2 h-2 rounded-full transition-all ${activeModalTab === 'scheduling' ? 'bg-blue-600 w-5' : 'bg-gray-300 dark:bg-gray-700'}`} />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer"
                    >
                      انصراف
                    </button>
                    
                    {activeModalTab !== 'scheduling' ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (activeModalTab === 'basic') setActiveModalTab('limits');
                          else if (activeModalTab === 'limits') setActiveModalTab('scheduling');
                        }}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer"
                      >
                        مرحله بعدی
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-2xl text-xs shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        {saving ? 'در حال ذخیره...' : 'ذخیره کد تخفیف'}
                      </button>
                    )}
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AI Proposed Operations Confirmation and Editing Modal */}
      {aiProposedOps && (
        <div className="fixed inset-0 z-50 overflow-y-auto" dir="rtl">
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAiProposedOps(null)} />
          
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white dark:bg-slate-900 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-gray-150 dark:border-slate-800 animate-slideUp flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 rounded-xl">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-gray-900 dark:text-white text-base">
                      تایید و ویرایش نهایی عملیات دستیار هوشمند
                    </h3>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">
                      تغییرات پیشنهادی هوش مصنوعی را بازبینی و در صورت نیاز ویرایش کنید.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setAiProposedOps(null)}
                  className="p-1.5 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 no-scrollbar text-xs">
                {/* Explanation */}
                {aiExplanation && (
                  <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-100 dark:border-purple-900/30 p-4 rounded-2xl">
                    <h4 className="font-black text-purple-800 dark:text-purple-300 mb-1 flex items-center gap-1.5">
                      <Info className="w-4.5 h-4.5 text-purple-600" />
                      توضیح دستیار هوشمند:
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                      {aiExplanation}
                    </p>
                  </div>
                )}

                {/* Highly Sensitive Warnings Banner */}
                {(() => {
                  const allWarnings = aiProposedOps.flatMap(op => getSensitiveWarnings(op));
                  const hasDanger = allWarnings.some(w => w.type === 'danger');
                  const hasWarning = allWarnings.some(w => w.type === 'warning');

                  if (allWarnings.length === 0) return null;

                  return (
                    <div className={`p-4 rounded-2xl flex gap-3 items-start border animate-pulse ${
                      hasDanger 
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/30' 
                        : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30'
                    }`}>
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        hasDanger ? 'bg-rose-600 text-white' : 'bg-amber-500 text-white'
                      }`}>
                        <ShieldAlert className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className={`font-black text-sm ${
                          hasDanger ? 'text-rose-800 dark:text-rose-400' : 'text-amber-800 dark:text-amber-400'
                        }`}>
                          هشدار امنیتی و مالی: کدهای تخفیف با حساسیت بالا!
                        </h4>
                        <p className={`text-[10.5px] font-bold leading-relaxed ${
                          hasDanger ? 'text-rose-700 dark:text-rose-550' : 'text-amber-700 dark:text-amber-550'
                        }`}>
                          برخی کدهای پیشنهادی فاقد سقف استفاده، بدون تاریخ انقضاء یا دارای سقف تخفیف بالا/نامحدود هستند. لطفاً پیش از تایید نهایی، فیلدهای مشخص شده را ویرایش کرده و محدودیت‌های مناسب اعمال کنید تا از بروز زیان‌های مالی پیشگیری شود.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* Operations List */}
                <div className="space-y-6">
                  {aiProposedOps.map((op, opIndex) => {
                    const isCreate = op.type === 'create';
                    const isUpdate = op.type === 'update';
                    const isDelete = op.type === 'delete';

                    if (isDelete) {
                      return (
                        <div key={opIndex} className="bg-red-50/50 dark:bg-red-950/10 border border-red-150 dark:border-red-900/20 p-4 rounded-2xl flex items-center justify-between">
                          <div className="flex items-center gap-2 text-red-750 dark:text-red-400 font-bold">
                            <Trash2 className="w-4 h-4 shrink-0" />
                            <span>حذف کد تخفیف با شناسه: <strong className="font-sans text-xs">{op.id}</strong></span>
                          </div>
                          <span className="text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400 px-2.5 py-1 rounded-lg">درخواست حذف</span>
                        </div>
                      );
                    }

                    // For Create or Update
                    const opData = op.data || {};
                    const isPercentage = opData.type === 'percentage';
                    const disc = parseFloat(opData.discount) || 0;
                    const warnings = getSensitiveWarnings(op);

                    return (
                      <div key={opIndex} className="bg-gray-50 dark:bg-slate-900/60 border border-gray-150 dark:border-gray-800/80 p-5 rounded-3xl space-y-4 relative">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-lg ${isCreate ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600' : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600'}`}>
                              {isCreate ? <Plus className="w-4 h-4" /> : <Edit className="w-4 h-4" />}
                            </div>
                            <span className="font-black text-gray-800 dark:text-white">
                              {isCreate ? 'ایجاد کد تخفیف جدید' : `ویرایش کد تخفیف (شناسه: ${op.id})`}
                            </span>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${isCreate ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400'}`}>
                            {isCreate ? 'عملیات ساخت' : 'عملیات ویرایش'}
                          </span>
                        </div>

                        {/* Warnings for this operation */}
                        {warnings.length > 0 && (
                          <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 p-3.5 rounded-xl space-y-1.5">
                            <div className="text-[10px] font-black text-rose-700 dark:text-rose-400 flex items-center gap-1">
                              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                              موارد حساس شناسایی شده روی این کد:
                            </div>
                            <ul className="list-disc list-inside text-[9.5px] text-rose-650 dark:text-rose-400/80 pr-1 space-y-1 font-bold leading-relaxed">
                              {warnings.map((warn, wIdx) => (
                                <li key={wIdx}>{warn.message}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Editor Form fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {/* Code */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">کد تخفیف *</label>
                            <input
                              type="text"
                              value={opData.code || ''}
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'code', e.target.value.toUpperCase().trim())}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-black tracking-wider uppercase text-left dir-ltr outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            />
                          </div>

                          {/* Type */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">نوع تخفیف *</label>
                            <select
                              value={opData.type || 'percentage'}
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'type', e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            >
                              <option value="percentage">درصدی (%)</option>
                              <option value="flat">مبلغ ثابت (تومان)</option>
                            </select>
                          </div>

                          {/* Discount value */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">
                              {isPercentage ? 'درصد تخفیف *' : 'مبلغ تخفیف (تومان) *'}
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                value={opData.discount || ''}
                                onChange={(e) => handleUpdateProposedOp(opIndex, 'discount', e.target.value)}
                                className={`w-full bg-white dark:bg-slate-950 border ${
                                  (isPercentage && disc > 50) || (!isPercentage && disc > 500000)
                                    ? 'border-rose-300 dark:border-rose-900/50 focus:ring-rose-500' 
                                    : 'border-gray-200 dark:border-gray-800 focus:ring-purple-500'
                                } rounded-xl py-2 pr-3 pl-8 text-xs font-bold text-left dir-ltr outline-none focus:ring-2 transition-all dark:text-white`}
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 font-sans">
                                {isPercentage ? '٪' : 'تومان'}
                              </span>
                            </div>
                          </div>

                          {/* Max Uses */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">تعداد کل دفعات استفاده</label>
                              {!opData.maxUses && (
                                <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">نامحدود (حساس)</span>
                              )}
                            </div>
                            <input
                              type="number"
                              value={opData.maxUses || ''}
                              placeholder="خالی یعنی بدون محدودیت"
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'maxUses', e.target.value ? parseInt(e.target.value) : null)}
                              className={`w-full bg-white dark:bg-slate-950 border ${
                                !opData.maxUses ? 'border-rose-250 dark:border-rose-900/40' : 'border-gray-200 dark:border-gray-800'
                              } rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white`}
                            />
                          </div>

                          {/* Max Uses Per User */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">دفعات استفاده هر مشتری</label>
                            <input
                              type="number"
                              value={opData.maxUsesPerUser || ''}
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'maxUsesPerUser', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            />
                          </div>

                          {/* Min Order Amount */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">حداقل مبلغ خرید (تومان)</label>
                              {!opData.minOrderAmount && (
                                <span className="text-[8px] font-black text-amber-500 bg-amber-50 dark:bg-amber-950/20 px-1.5 py-0.5 rounded">هر مبلغی (حساس)</span>
                              )}
                            </div>
                            <input
                              type="number"
                              value={opData.minOrderAmount || ''}
                              placeholder="خالی یعنی خرید بدون حداقل"
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'minOrderAmount', e.target.value ? parseFloat(e.target.value) : null)}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            />
                          </div>

                          {/* Min Quantity */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">حداقل تعداد خرید محصول (عدد)</label>
                            </div>
                            <input
                              type="number"
                              value={opData.minQuantity || ''}
                              placeholder="خالی یعنی بدون محدودیت تعداد"
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'minQuantity', e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            />
                          </div>

                          {/* Max Discount Amount */}
                          {isPercentage && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">سقف تخفیف (تومان)</label>
                                {!opData.maxDiscountAmount && (
                                  <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">بدون سقف (حساس)</span>
                                )}
                              </div>
                              <input
                                type="number"
                                value={opData.maxDiscountAmount || ''}
                                placeholder="خالی یعنی تخفیف بدون سقف"
                                onChange={(e) => handleUpdateProposedOp(opIndex, 'maxDiscountAmount', e.target.value ? parseFloat(e.target.value) : null)}
                                className={`w-full bg-white dark:bg-slate-950 border ${
                                  !opData.maxDiscountAmount ? 'border-rose-250 dark:border-rose-900/40' : 'border-gray-200 dark:border-gray-800'
                                } rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white`}
                              />
                            </div>
                          )}

                          {/* Start Date */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">تاریخ شروع اعتبار</label>
                            <JalaliDatePicker
                              value={opData.startDate || ''}
                              onChange={(val) => handleUpdateProposedOp(opIndex, 'startDate', val)}
                            />
                          </div>

                          {/* Expiration Date */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">تاریخ انقضاء</label>
                              {!opData.expiresAt && (
                                <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">همیشگی (حساس)</span>
                              )}
                            </div>
                            <JalaliDatePicker
                              value={opData.expiresAt || ''}
                              onChange={(val) => handleUpdateProposedOp(opIndex, 'expiresAt', val)}
                            />
                          </div>

                          {/* Allowed Gender */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">محدودیت جنسیت</label>
                            <select
                              value={opData.allowedGender || 'all'}
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'allowedGender', e.target.value)}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            >
                              <option value="all">همه کاربران (زن و مرد)</option>
                              <option value="male">فقط آقایان</option>
                              <option value="female">فقط بانوان</option>
                            </select>
                          </div>

                          {/* Target Customer */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-500 dark:text-gray-400">محدود به مشتری خاص (اختیاری)</label>
                            <select
                              value={opData.targetUserId || ''}
                              onChange={(e) => handleUpdateProposedOp(opIndex, 'targetUserId', e.target.value || null)}
                              className="w-full bg-white dark:bg-slate-950 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-purple-500 transition-all dark:text-white"
                            >
                              <option value="">همه مشتریان (بدون محدودیت کاربر)</option>
                              {users.map(u => (
                                <option key={u.id} value={u.id}>
                                  {u.name || 'بدون نام'} ({u.email} {u.phone ? `- ${u.phone}` : ''})
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Category Restrictions for Proposed Op */}
                        <div className="space-y-2 pt-3 border-t border-gray-100 dark:border-slate-800">
                          <div className="flex items-center justify-between">
                            <h5 className="font-black text-gray-800 dark:text-white text-[11px] flex items-center gap-1.5">
                              <Folder className="w-4 h-4 text-purple-500" />
                              <span>محدودیت دسته‌بندی کالاها</span>
                            </h5>
                            <span className="text-[9px] text-gray-400 font-bold">
                              {(() => {
                                try {
                                  const cats = JSON.parse(opData.targetCategoryIds || '[]');
                                  return !Array.isArray(cats) || cats.length === 0
                                    ? 'اعمال روی تمام دسته‌بندی‌ها'
                                    : `${cats.length} دسته‌بندی انتخاب شده`;
                                } catch (e) {
                                  return 'اعمال روی تمام دسته‌بندی‌ها';
                                }
                              })()}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-[120px] overflow-y-auto p-2 bg-white dark:bg-slate-950 rounded-2xl border border-gray-150 dark:border-gray-800 select-none custom-scrollbar">
                            {categories.map((category) => {
                              let isChecked = false;
                              try {
                                const cats = JSON.parse(opData.targetCategoryIds || '[]');
                                isChecked = Array.isArray(cats) && cats.includes(category.id);
                              } catch (e) {}

                              return (
                                <button
                                  key={category.id}
                                  type="button"
                                  onClick={() => handleToggleCategoryForProposedOp(opIndex, category.id)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-right transition-all outline-none ${
                                    isChecked
                                      ? 'bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900/40 text-purple-600 dark:text-purple-400 font-black shadow-sm'
                                      : 'bg-gray-55 dark:bg-slate-900 border-gray-100 dark:border-gray-800/80 text-gray-600 dark:text-gray-450 hover:bg-gray-100 dark:hover:bg-gray-800'
                                  }`}
                                >
                                  {isChecked ? (
                                    <CheckSquare className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                                  ) : (
                                    <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  )}
                                  <span className="text-[10px] truncate">{category.name}</span>
                                </button>
                              );
                            })}
                            {categories.length === 0 && (
                              <div className="col-span-full py-4 text-center text-[10px] text-gray-400 font-bold">هیچ دسته‌بندی‌ای یافت نشد.</div>
                            )}
                          </div>
                        </div>

                        {/* First Order Only & Is Active */}
                        <div className="flex flex-wrap items-center gap-6 pt-3 border-t border-gray-100 dark:border-slate-800">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <button
                              type="button"
                              onClick={() => handleUpdateProposedOp(opIndex, 'firstOrderOnly', !opData.firstOrderOnly)}
                              className="text-purple-600 hover:text-purple-700 outline-none transition-all"
                            >
                              {opData.firstOrderOnly ? (
                                <CheckSquare className="w-5 h-5" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-300 dark:text-gray-750" />
                              )}
                            </button>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">مخصوص اولین سفارش خریدار</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <button
                              type="button"
                              onClick={() => handleUpdateProposedOp(opIndex, 'isActive', opData.isActive !== false)}
                              className="text-purple-600 hover:text-purple-700 outline-none transition-all"
                            >
                              {opData.isActive !== false ? (
                                <CheckSquare className="w-5 h-5" />
                              ) : (
                                <Square className="w-5 h-5 text-gray-300 dark:text-gray-750" />
                              )}
                            </button>
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">وضعیت فعال بودن کد</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {saveError && (
                <div className="px-6 pt-4">
                  <div style={{ border: '1px solid var(--color-border-danger)', background: 'var(--color-background-danger)', padding: '12px 16px', borderRadius: '8px', color: 'var(--color-text-danger)' }} className="font-bold text-xs text-right">
                    ذخیره‌سازی ناموفق بود. تغییرات شما در این صفحه هنوز هستند. دوباره تلاش کنید یا صفحه را نبندید.
                    <div className="mt-1 font-normal text-[10px]">{saveError}</div>
                  </div>
                </div>
              )}

              {/* Modal Footer */}
              <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-950/20">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold hidden sm:block">
                  تغییرات بالا پس از کلیک بر روی دکمه تایید مستقیماً در دیتابیس ذخیره خواهند شد.
                </p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setAiProposedOps(null); setSaveError(''); setSaveStatus('idle'); }}
                    className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-200 dark:hover:bg-gray-800 transition-all cursor-pointer"
                  >
                    انصراف
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      const ops = aiProposedOps;
                      const exp = aiExplanation;
                      await handleApplyAiControl(true, ops, exp);
                    }}
                    data-testid="save-status"
                    data-status-state={saveStatus}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-purple-500/10 hover:shadow-purple-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    {saveStatus === 'saving' ? 'در حال ثبت نهایی...' : 'تایید و اعمال نهایی تغییرات'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
