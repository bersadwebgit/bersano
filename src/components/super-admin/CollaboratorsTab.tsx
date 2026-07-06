'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  UserCheck, 
  UserX, 
  Shield, 
  Mail, 
  Key, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Clock
} from 'lucide-react';

interface Collaborator {
  id: string;
  name: string;
  email: string;
  role: 'superadmin' | 'sales' | 'content_manager' | 'seo_manager';
  isActive: boolean;
  notes?: string | null;
  createdAt: string;
}

export default function CollaboratorsTab() {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'content_manager' as Collaborator['role'],
    isActive: true,
    notes: '',
  });

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Fetch collaborators
  const fetchCollaborators = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/collaborators');
      if (res.ok) {
        const data = await res.json();
        setCollaborators(data);
      } else {
        const data = await res.json();
        setError(data.error || 'خطا در دریافت لیست همکاران');
      }
    } catch (err) {
      console.error('Error fetching collaborators:', err);
      setError('خطا در ارتباط با سرور. لطفاً مجدداً تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const openAddModal = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'content_manager',
      isActive: true,
      notes: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (collab: Collaborator) => {
    setModalMode('edit');
    setEditingId(collab.id);
    setFormData({
      name: collab.name,
      email: collab.email,
      password: '', // Leave blank to keep existing password
      role: collab.role,
      isActive: collab.isActive,
      notes: collab.notes || '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSubmitting(true);

    try {
      const url = modalMode === 'add' 
        ? '/api/super-admin/collaborators' 
        : `/api/super-admin/collaborators/${editingId}`;
      
      const method = modalMode === 'add' ? 'POST' : 'PUT';

      const bodyData: any = { ...formData };
      if (modalMode === 'edit' && !bodyData.password) {
        delete bodyData.password; // Do not send empty password on update
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage(
          modalMode === 'add' 
            ? 'همکار جدید با موفقیت ثبت شد.' 
            : 'اطلاعات همکار با موفقیت ویرایش شد.'
        );
        setTimeout(() => setSuccessMessage(''), 4000);
        setIsModalOpen(false);
        fetchCollaborators();
      } else {
        setFormError(data.error || 'خطایی در ثبت اطلاعات رخ داد.');
      }
    } catch (err) {
      console.error('Error saving collaborator:', err);
      setFormError('خطا در ارتباط با سرور.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`آیا از حذف همکار «${name}» اطمینان دارید؟ این عمل غیرقابل بازگشت است.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/super-admin/collaborators/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setSuccessMessage(`همکار «${name}» با موفقیت حذف شد.`);
        setTimeout(() => setSuccessMessage(''), 4000);
        fetchCollaborators();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف همکار');
      }
    } catch (err) {
      console.error('Error deleting collaborator:', err);
      alert('خطا در ارتباط با سرور.');
    }
  };

  // Helper for role label translation
  const getRoleLabel = (role: Collaborator['role']) => {
    switch (role) {
      case 'superadmin':
        return { label: 'سوپر ادمین', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'sales':
        return { label: 'فروش', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'content_manager':
        return { label: 'مدیر محتوا', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'seo_manager':
        return { label: 'مدیر SEO', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      default:
        return { label: role, color: 'bg-gray-50 text-gray-700 border-gray-200' };
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="h-6 w-6 text-slate-700" />
            همکاران پلتفرم
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            مدیریت دسترسی‌ها و حساب‌های همکاران سیستم با نقش‌های مختلف
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
        >
          <UserPlus className="h-4 w-4" />
          افزودن همکار
        </button>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium animate-fadeIn">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Collaborators Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex flex-col justify-center items-center py-16 gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-500 font-bold">در حال بارگذاری لیست همکاران...</span>
          </div>
        ) : collaborators.length === 0 ? (
          <div className="flex flex-col justify-center items-center py-16 px-4 text-center">
            <Users className="h-12 w-12 text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-700 text-sm">هیچ همکاری ثبت نشده است</h3>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              در حال حاضر هیچ کاربر همکاری در سیستم ثبت نشده است. برای ایجاد همکار بر روی دکمه «افزودن همکار» کلیک کنید.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">نام</th>
                  <th className="px-6 py-4">ایمیل</th>
                  <th className="px-6 py-4">نقش</th>
                  <th className="px-6 py-4">وضعیت</th>
                  <th className="px-6 py-4">یادداشت</th>
                  <th className="px-6 py-4">تاریخ ثبت‌نام</th>
                  <th className="px-6 py-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {collaborators.map((collab) => {
                  const roleStyle = getRoleLabel(collab.role);
                  return (
                    <tr key={collab.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{collab.name}</td>
                      <td className="px-6 py-4 font-mono select-all text-slate-500">{collab.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleStyle.color}`}>
                          {roleStyle.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {collab.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            <UserCheck className="h-3 w-3" /> فعال
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            <UserX className="h-3 w-3" /> غیرفعال
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={collab.notes || ''}>
                        {collab.notes || <span className="text-slate-300">-</span>}
                      </td>
                      <td className="px-6 py-4 text-slate-500 flex items-center gap-1 mt-1">
                        <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {new Date(collab.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(collab)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
                            title="ویرایش"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(collab.id, collab.name)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="حذف"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* Roles description box */}
      <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6">
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-3">
          <Shield className="h-4 w-4 text-slate-500" />
          راهنمای نقش‌های دسترسی همکاران سیستم
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md inline-block mb-2">مدیر محتوا (Content Manager)</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              دسترسی به نگارش، ویرایش و مدیریت مقالات وبلاگ اصلی پلتفرم، بریف‌های تولید محتوا، رسانه‌های آپلود شده و ابزارهای تولید خودکار با هوش مصنوعی. این نقش دسترسی به تنظیمات فنی سیستم یا پکیج‌های مالی ندارد.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block mb-2">مدیر سئو (SEO Manager)</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              دسترسی تخصصی به بهینه‌سازی فیلدهای سئو، بریف‌های GEO، ویرایش عنوان‌ها و دیسکریپشن‌های متا، اسکیما و داده‌های ساختاریافته (JSON-LD) مقالات. فاقد دسترسی به کارهای مالی پلتفرم یا تنظیمات اصلی سیستم.
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-slate-100">
            <span className="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-md inline-block mb-2">کارشناس فروش (Sales)</span>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              دسترسی به اطلاعات مشتریان، تیکت‌های پشتیبانی عمومی، و ابزارهای مرتبط با فروش در پیشخوان پلتفرم در صورت وجود. این نقش هیچ دسترسی‌ای به بخش وبلاگ، تنظیمات حساس هوش مصنوعی یا کلیدهای API سیستم ندارد.
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-black text-slate-800 text-sm">
                {modalMode === 'add' ? 'افزودن همکار پلتفرم جدید' : 'ویرایش اطلاعات همکار'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-100 text-red-800 px-3 py-2 rounded-xl flex items-center gap-1.5 text-[11px] font-medium">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Name field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">نام و نام‌خانوادگی</label>
                <div className="relative">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Users className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="مثال: علی محمدی"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs outline-hidden transition-all"
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">آدرس ایمیل (شناسه ورود)</label>
                <div className="relative">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="example@gmail.com"
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs outline-hidden transition-all text-right font-mono"
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">
                  {modalMode === 'add' ? 'رمز عبور' : 'رمز عبور جدید (در صورت تمایل به تغییر)'}
                </label>
                <div className="relative">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <Key className="h-4 w-4" />
                  </span>
                  <input
                    type="password"
                    required={modalMode === 'add'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={modalMode === 'add' ? '••••••••' : 'خالی بگذارید تا تغییر نکند'}
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl pr-10 pl-4 py-2.5 text-xs outline-hidden transition-all text-right font-mono"
                  />
                </div>
              </div>

              {/* Role select */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">نقش دسترسی</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as Collaborator['role'] })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2.5 text-xs outline-hidden transition-all"
                >
                  <option value="content_manager">مدیر محتوا (Content Manager)</option>
                  <option value="seo_manager">مدیر سئو (SEO Manager)</option>
                  <option value="sales">کارشناس فروش (Sales)</option>
                </select>
              </div>

              {/* Status checkbox */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-800 w-4 h-4"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-700 cursor-pointer">
                  حساب کاربری فعال باشد
                </label>
              </div>

              {/* Notes field */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">توضیحات یا یادداشت</label>
                <div className="relative">
                  <span className="absolute right-3.5 top-3 text-slate-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <textarea
                    rows={3}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="توضیحات اختیاری، شماره تماس یا سایر اطلاعات همکار..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl pr-10 pl-4 py-2 text-xs outline-hidden transition-all resize-none"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-4">
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50"
                >
                  {formSubmitting ? 'در حال ثبت...' : 'ذخیره اطلاعات'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs transition-all"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
