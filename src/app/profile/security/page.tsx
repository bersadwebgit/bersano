'use client';

import { useState, useEffect } from 'react';
import { Shield, Key, User, Mail, Save, CheckCircle, AlertTriangle, Phone, Calendar, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    birthDate: '',
    gender: '',
    avatarUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetch('/api/profile', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setFormData(prev => ({
            ...prev,
            name: data.user.name || '',
            phone: data.user.phone || '',
            email: data.user.email || '',
            birthDate: data.user.birthDate || '',
            gender: data.user.gender || '',
            avatarUrl: data.user.avatarUrl || ''
          }));
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const tempUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, avatarUrl: tempUrl }));

      try {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setFormData(prev => ({ ...prev, avatarUrl: data.url }));
        } else {
          setMessage({ type: 'error', text: 'خطا در آپلود عکس' });
        }
      } catch (error) {
        setMessage({ type: 'error', text: 'خطا در آپلود عکس' });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'رمز عبور جدید و تکرار آن مطابقت ندارند' });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          birthDate: formData.birthDate,
          gender: formData.gender,
          avatarUrl: formData.avatarUrl,
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در بروزرسانی اطلاعات');
      }

      setMessage({ type: 'success', text: 'اطلاعات با موفقیت بروزرسانی شد' });
      
      // Clear password fields
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      
      // Update page to reflect avatar change globally if needed
      window.dispatchEvent(new Event('profile-updated'));
      
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
            اطلاعات شخصی و امنیت
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            ویرایش اطلاعات فردی و تغییر رمز عبور
          </p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-xl flex items-start gap-3 ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
            : 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400'
        }`}>
          {message.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-medium">{message.text}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-[#24303f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        
        {/* Personal Info Section */}
        <div className="p-5 md:p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2 mb-5">
            <User size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">اطلاعات فردی</h2>
          </div>
          
          <div className="flex flex-col md:flex-row gap-8 mb-6 items-center md:items-start">
            {/* Profile Photo */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-[#1a222c]">
                {formData.avatarUrl ? (
                  <Image src={formData.avatarUrl} alt="Avatar" fill className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <User size={40} />
                  </div>
                )}
              </div>
              <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-[#1a222c] dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <ImageIcon size={16} />
                تغییر عکس
                <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </label>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">نام و نام خانوادگی</label>
                <input 
                  type="text" 
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="نام خود را وارد کنید"
                  className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">شماره موبایل</label>
                <div className="relative">
                  <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="09..."
                    disabled
                    title="برای تغییر شماره موبایل با پشتیبانی تماس بگیرید"
                    className="w-full bg-gray-100 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm dir-ltr focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-gray-400 text-gray-500 transition-all cursor-not-allowed"
                  />
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">ایمیل</label>
                <div className="relative">
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="example@gmail.com"
                    className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm dir-ltr focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                  />
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">تاریخ تولد <span className="text-gray-400 text-xs font-normal">(برای تخفیف‌های ویژه)</span></label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="birthDate"
                    value={formData.birthDate}
                    onChange={handleChange}
                    placeholder="1370/01/01"
                    className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 pl-10 text-sm dir-ltr focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all text-right"
                  />
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">جنسیت <span className="text-gray-400 text-xs font-normal">(اختیاری)</span></label>
                <select 
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="male">مرد</option>
                  <option value="female">زن</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className="p-5 md:p-6">
          <div className="flex items-center gap-2 mb-5">
            <Key size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">تغییر رمز عبور</h2>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-1.5 md:w-1/2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">رمز عبور فعلی</label>
              <input 
                type="password" 
                name="currentPassword"
                value={formData.currentPassword}
                onChange={handleChange}
                placeholder="رمز عبور فعلی خود را وارد کنید"
                className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">رمز عبور جدید</label>
                <input 
                  type="password" 
                  name="newPassword"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="حداقل 6 کاراکتر"
                  className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">تکرار رمز عبور جدید</label>
                <input 
                  type="password" 
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="رمز عبور جدید را تکرار کنید"
                  className="w-full bg-gray-50 dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm dir-ltr focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none dark:text-white transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-6 bg-gray-50 dark:bg-[#1a222c] border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Save size={18} />
            )}
            ذخیره تغییرات
          </button>
        </div>
      </form>
    </div>
  );
}
