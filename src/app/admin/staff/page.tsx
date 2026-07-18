'use client';

import { useState, useEffect } from 'react';
import {
  UserCog,
  Search,
  Mail,
  Phone,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  User,
  X,
  Check,
  AlertCircle,
  Shield,
  Key,
} from 'lucide-react';

type StaffMember = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  isBlocked: boolean;
  createdAt: string;
};

type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  role: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدیر کل',
  product_manager: 'مدیر محصول',
  sales_manager: 'مدیر فروش',
  sales_product_manager: 'مدیر فروش و محصول',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: 'دسترسی کامل به تمام بخش‌های مدیریت فروشگاه، تنظیمات، همکاران و گزارش‌ها.',
  product_manager: 'دسترسی به مدیریت محصولات، دسته‌بندی‌ها، پکیج‌های تعاملی، رسانه، اسلایدر، استوری‌ها و وبلاگ.',
  sales_manager: 'دسترسی به سفارش‌ها، گزارش‌های پیشخوان، نظرات مشتریان، تیکت‌ها و باشگاه مشتریان.',
  sales_product_manager: 'دسترسی به مدیریت محصولات، دسته‌بندی‌ها، رسانه، سفارش‌ها، گزارش‌های پیشخوان و باشگاه مشتریان.',
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal states
  const [isAddModalOpen, setIsAddingModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditingModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'product_manager',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'product_manager',
    isBlocked: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [staffRes, profileRes] = await Promise.all([
        fetch('/api/admin/staff'),
        fetch('/api/admin/profile'),
      ]);

      if (staffRes.ok && profileRes.ok) {
        const staffData = await staffRes.json();
        const profileData = await profileRes.json();
        setStaff(staffData.staff || []);
        setCurrentUser(profileData.user || null);
        setActivePackage(profileData.activePackage || null);
      } else {
        setError('خطا در دریافت اطلاعات از سرور');
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('خطای ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('همکار جدید با موفقیت اضافه شد.');
        setFormData({
          name: '',
          email: '',
          phone: '',
          password: '',
          role: 'product_manager',
        });
        setIsAddingModalOpen(false);
        fetchData();
      } else {
        setError(data.error || 'خطا در افزودن همکار');
      }
    } catch (err) {
      console.error('Error adding staff:', err);
      setError('خطای ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaff) return;
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('اطلاعات همکار با موفقیت بروزرسانی شد.');
        setIsEditingModalOpen(false);
        setSelectedStaff(null);
        fetchData();
      } else {
        setError(data.error || 'خطا در ویرایش اطلاعات همکار');
      }
    } catch (err) {
      console.error('Error editing staff:', err);
      setError('خطای ارتباط با سرور');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!confirm('آیا از حذف این همکار اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) return;
    setError('');
    setSuccess('');

    try {
      const res = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('همکار با موفقیت حذف شد.');
        fetchData();
      } else {
        setError(data.error || 'خطا در حذف همکار');
      }
    } catch (err) {
      console.error('Error deleting staff:', err);
      setError('خطای ارتباط با سرور');
    }
  };

  const handleToggleBlock = async (member: StaffMember) => {
    if (member.id === currentUser?.id) {
      alert('شما نمی‌توانید حساب خود را مسدود کنید.');
      return;
    }

    const actionText = member.isBlocked ? 'فعال‌سازی' : 'مسدودسازی';
    if (!confirm(`آیا از ${actionText} این همکار اطمینان دارید؟`)) return;

    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isBlocked: !member.isBlocked }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`همکار با موفقیت ${member.isBlocked ? 'فعال' : 'مسدود'} شد.`);
        fetchData();
      } else {
        setError(data.error || 'خطا در تغییر وضعیت همکار');
      }
    } catch (err) {
      console.error('Error toggling block status:', err);
      setError('خطای ارتباط با سرور');
    }
  };

  const openEditModal = (member: StaffMember) => {
    setSelectedStaff(member);
    setEditFormData({
      name: member.name || '',
      email: member.email,
      phone: member.phone || '',
      password: '', // Keep empty unless changing
      role: member.role,
      isBlocked: member.isBlocked,
    });
    setIsEditingModalOpen(true);
  };

  const filteredStaff = staff.filter((member) => {
    const searchLower = search.toLowerCase();
    return (
      member.name?.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.phone?.includes(searchLower)
    );
  });

  let staffEnabled = false;
  let maxStaff = 0;

  if (activePackage) {
    try {
      const features = JSON.parse(activePackage.features);
      staffEnabled = !!features.staffEnabled;
      if (features.maxStaff && features.maxStaff > 0) {
        maxStaff = parseInt(features.maxStaff);
      }
    } catch (e) {
      console.error(e);
    }
  }

  if (!loading && !staffEnabled) {
    return (
      <div className="p-4 md:p-6 max-w-3xl mx-auto text-center space-y-6 py-16" dir="rtl">
        <div className="bg-white dark:bg-zinc-900 p-8 md:p-12 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl md:text-2xl font-black text-zinc-900 dark:text-zinc-50">امکان مدیریت همکاران قفل است</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              قابلیت تعریف و مدیریت دسترسی‌های همکاران در پکیج فعلی شما فعال نیست. برای استفاده از این قابلیت، لطفا پکیج خود را ارتقا دهید.
            </p>
          </div>
          <div className="pt-4">
            <a
              href="/admin/settings"
              className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md text-sm"
            >
              <span>مشاهده و ارتقای پکیج</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isLimitReached = maxStaff > 0 && staff.length >= maxStaff;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <UserCog className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900 dark:text-zinc-50">مدیریت همکاران</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              تعریف و مدیریت دسترسی‌های همکاران فروشگاه بر اساس نقش‌های مختلف
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            if (isLimitReached) {
              setError(`شما به حد نصاب تعریف همکار در پکیج خود (${maxStaff} همکار) رسیده‌اید. برای افزودن همکار جدید، لطفا پکیج خود را ارتقا دهید.`);
              return;
            }
            setIsAddingModalOpen(true);
          }}
          disabled={isLimitReached}
          className={`flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${isLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Plus className="w-5 h-5" />
          <span>افزودن همکار جدید</span>
        </button>
      </div>

      {/* Limit Warning */}
      {isLimitReached && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 p-4 rounded-xl border border-amber-100 dark:border-amber-900/30 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>شما به حد نصاب تعریف همکار در پکیج خود ({maxStaff} همکار) رسیده‌اید. برای افزودن همکار جدید، لطفا پکیج خود را ارتقا دهید.</span>
        </div>
      )}

      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 p-4 rounded-xl border border-rose-100 dark:border-rose-900/30 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 text-sm">
          <Check className="w-5 h-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="جستجو در نام، ایمیل یا شماره موبایل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-10 pl-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50"
          />
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">در حال بارگذاری اطلاعات...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <User className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto" />
            <p className="text-zinc-500 dark:text-zinc-400 font-medium">هیچ همکاری یافت نشد</p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {search ? 'جستجوی شما نتیجه‌ای نداشت.' : 'برای شروع، اولین همکار خود را اضافه کنید.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
                  <th className="p-4">نام همکار</th>
                  <th className="p-4">اطلاعات تماس</th>
                  <th className="p-4">نقش دسترسی</th>
                  <th className="p-4">وضعیت حساب</th>
                  <th className="p-4">تاریخ ثبت‌نام</th>
                  <th className="p-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-sm text-zinc-700 dark:text-zinc-300">
                {filteredStaff.map((member) => {
                  const isMe = member.id === currentUser?.id;
                  return (
                    <tr key={member.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/30 transition-all">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 font-bold">
                            {member.name ? member.name.charAt(0) : <User className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-semibold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                              <span>{member.name || 'بدون نام'}</span>
                              {isMe && (
                                <span className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                                  شما
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                            <Mail className="w-3.5 h-3.5" />
                            <span>{member.email}</span>
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                              <Phone className="w-3.5 h-3.5" />
                              <span dir="ltr">{member.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center justify-center gap-1 w-max px-2.5 py-1 rounded-full text-xs font-semibold ${
                              member.role === 'admin'
                                ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                                : member.role === 'product_manager'
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                                : member.role === 'sales_product_manager'
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400'
                                : 'bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            <span>{ROLE_LABELS[member.role] || member.role}</span>
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => handleToggleBlock(member)}
                          disabled={isMe}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all ${
                            member.isBlocked
                              ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40'
                              : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                          } ${isMe ? 'opacity-60 cursor-not-allowed' : ''}`}
                        >
                          {member.isBlocked ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>مسدود شده</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>فعال</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td className="p-4 text-xs text-zinc-500 dark:text-zinc-400">
                        {new Date(member.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="p-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(member)}
                            className="p-2 text-zinc-500 hover:text-indigo-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                            title="ویرایش همکار"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            disabled={isMe}
                            className={`p-2 text-zinc-500 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all ${
                              isMe ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            title="حذف همکار"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <UserCog className="w-5 h-5 text-indigo-600" />
                <span>افزودن همکار جدید</span>
              </h2>
              <button
                onClick={() => setIsAddingModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="مثال: علی محمدی"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">آدرس ایمیل (نام کاربری ورود)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@gmail.com"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50 text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">شماره موبایل (اختیاری)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="09123456789"
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">رمز عبور ورود</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="حداقل ۶ کاراکتر"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50 text-left"
                  dir="ltr"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">نقش دسترسی</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {Object.keys(ROLE_LABELS).map((role) => (
                    <label
                      key={role}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        formData.role === role
                          ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                          : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950'
                      }`}
                    >
                      <input
                        type="radio"
                        name="add-role"
                        value={role}
                        checked={formData.role === role}
                        onChange={() => setFormData({ ...formData, role })}
                        className="mt-1 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                          {ROLE_LABELS[role]}
                        </span>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {ROLE_DESCRIPTIONS[role]}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddingModalOpen(false)}
                  className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold rounded-xl text-sm hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>افزودن همکار</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {isEditModalOpen && selectedStaff && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-600" />
                <span>ویرایش اطلاعات همکار</span>
              </h2>
              <button
                onClick={() => setIsEditingModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditStaff} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">نام و نام خانوادگی</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">آدرس ایمیل</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50 text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">شماره موبایل (اختیاری)</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50 text-left"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">تغییر رمز عبور (اختیاری)</label>
                  <span className="text-[10px] text-zinc-400">در صورت عدم نیاز، خالی بگذارید</span>
                </div>
                <input
                  type="password"
                  minLength={6}
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                  placeholder="رمز عبور جدید (حداقل ۶ کاراکتر)"
                  className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-zinc-900 dark:text-zinc-50 text-left"
                  dir="ltr"
                />
              </div>

              {selectedStaff.id !== currentUser?.id && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 dark:text-zinc-400">نقش دسترسی</label>
                  <div className="grid grid-cols-1 gap-2.5">
                    {Object.keys(ROLE_LABELS).map((role) => (
                      <label
                        key={role}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          editFormData.role === role
                            ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20'
                            : 'border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-950'
                        }`}
                      >
                        <input
                          type="radio"
                          name="edit-role"
                          value={role}
                          checked={editFormData.role === role}
                          onChange={() => setEditFormData({ ...editFormData, role })}
                          className="mt-1 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                            {ROLE_LABELS[role]}
                          </span>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditingModalOpen(false)}
                  className="px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold rounded-xl text-sm hover:bg-zinc-50 dark:hover:bg-zinc-950 transition-all"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-600/50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all shadow-sm"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <span>ذخیره تغییرات</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
