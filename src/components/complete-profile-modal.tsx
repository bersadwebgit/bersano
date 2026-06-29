'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, Mail, Calendar, Sparkles, AlertCircle } from 'lucide-react';

interface CompleteProfileModalProps {
  isOpen: boolean;
  userPhone: string;
  shopName: string;
  logoUrl: string;
}

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند'
];

const getDaysInMonth = (year: number, month: number) => {
  if (month >= 1 && month <= 6) return 31;
  if (month >= 7 && month <= 11) return 30;
  if (month === 12) {
    // Check if leap year in Jalali calendar
    const isLeap = (((year - 474) % 2820 + 474 + 38) * 31) % 128 < 31;
    return isLeap ? 30 : 29;
  }
  return 30;
};

export default function CompleteProfileModal({ isOpen, userPhone, shopName, logoUrl }: CompleteProfileModalProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  
  // Date Picker States
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempYear, setTempYear] = useState(1370);
  const [tempMonth, setTempMonth] = useState(1);
  const [tempDay, setTempDay] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!name.trim()) {
      setError('وارد کردن نام و نام خانوادگی الزامی است.');
      return;
    }

    // Basic email validation if entered
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('آدرس ایمیل وارد شده معتبر نیست.');
      return;
    }

    // Basic birthDate validation if entered (e.g., 1370/01/01)
    if (birthDate.trim() && !/^\d{4}\/\d{2}\/\d{2}$/.test(birthDate.trim())) {
      setError('تاریخ تولد باید به فرمت YYYY/MM/DD باشد (مثال: 1370/01/01).');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() ? email.trim() : `${userPhone}@phone.local`,
          birthDate: birthDate.trim() || undefined,
          gender: gender || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ذخیره اطلاعات');
      }

      setSuccess(true);
      
      // Notify other components and refresh the page to reload server-side user data
      setTimeout(() => {
        window.dispatchEvent(new Event('profile-updated'));
        router.refresh();
        window.location.reload();
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
      <div className="relative w-full max-w-md bg-white dark:bg-[#24303f] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header Decorator */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="text-center mb-6 relative z-10">
          {logoUrl ? (
            <div className="relative w-20 h-20 mx-auto mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800 bg-white p-1 flex items-center justify-center shadow-sm">
              <img src={logoUrl} alt={shopName} className="object-contain max-w-full max-h-full" />
            </div>
          ) : (
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-indigo-500 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20 mb-4 animate-bounce">
              <Sparkles className="w-7 h-7" />
            </div>
          )}
          
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
            {shopName || 'تکمیل اطلاعات کاربری'}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            لطفاً اطلاعات اولیه خود را جهت تکمیل ثبت نام وارد کنید.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-2xl text-sm border border-rose-100 dark:border-rose-900/30 flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">با موفقیت ثبت شد</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">در حال انتقال به پنل کاربری...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            
            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                نام و نام خانوادگی <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-medium text-sm"
                  placeholder="مثال: علی رضایی"
                />
              </div>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                آدرس ایمیل <span className="text-gray-400 text-xs font-normal">(اختیاری)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pr-11 pl-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all font-medium text-sm text-left"
                  placeholder="example@gmail.com"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Birth Date with Shamsi Date Picker */}
              <div className="relative">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  تاریخ تولد <span className="text-gray-400 text-[10px] font-normal">(اختیاری)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <Calendar className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    readOnly
                    onClick={() => setShowDatePicker(true)}
                    value={birthDate}
                    className="w-full pr-9 pl-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all text-xs text-left cursor-pointer"
                    placeholder="انتخاب تاریخ"
                    dir="ltr"
                  />
                </div>

                {/* Shamsi Date Picker Popover */}
                {showDatePicker && (
                  <>
                    {/* Click-away backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                    
                    {/* Popover container */}
                    <div className="absolute bottom-full mb-2 right-0 left-0 sm:left-auto sm:w-72 z-50 bg-white dark:bg-[#1a222c] border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        {/* Year Select */}
                        <select
                          value={tempYear}
                          onChange={(e) => {
                            const y = parseInt(e.target.value);
                            setTempYear(y);
                            const maxDays = getDaysInMonth(y, tempMonth);
                            if (tempDay > maxDays) setTempDay(maxDays);
                          }}
                          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs text-gray-900 dark:text-white outline-none font-bold"
                        >
                          {Array.from({ length: 86 }, (_, i) => 1405 - i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                          ))}
                        </select>

                        {/* Month Select */}
                        <select
                          value={tempMonth}
                          onChange={(e) => {
                            const m = parseInt(e.target.value);
                            setTempMonth(m);
                            const maxDays = getDaysInMonth(tempYear, m);
                            if (tempDay > maxDays) setTempDay(maxDays);
                          }}
                          className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1.5 text-xs text-gray-900 dark:text-white outline-none font-bold"
                        >
                          {PERSIAN_MONTHS.map((name, index) => (
                            <option key={index + 1} value={index + 1}>{name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Days Grid */}
                      <div className="grid grid-cols-7 gap-1 text-center mb-3">
                        {Array.from({ length: getDaysInMonth(tempYear, tempMonth) }, (_, i) => i + 1).map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setTempDay(d);
                              const formattedDate = `${tempYear}/${String(tempMonth).padStart(2, '0')}/${String(d).padStart(2, '0')}`;
                              setBirthDate(formattedDate);
                              setShowDatePicker(false);
                            }}
                            className={`h-7 w-7 text-xs font-bold rounded-lg flex items-center justify-center mx-auto transition-all ${
                              tempDay === d
                                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                      
                      <div className="flex justify-between items-center border-t border-gray-100 dark:border-gray-800 pt-2 text-[10px]">
                        <span className="text-gray-400 font-medium">انتخاب شده: {tempYear}/{tempMonth}/{tempDay}</span>
                        <button
                          type="button"
                          onClick={() => setShowDatePicker(false)}
                          className="font-bold text-indigo-600 hover:underline"
                        >
                          بستن
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                  جنسیت <span className="text-gray-400 text-[10px] font-normal">(اختیاری)</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all text-xs"
                >
                  <option value="">انتخاب کنید</option>
                  <option value="male">مرد</option>
                  <option value="female">زن</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 flex items-center justify-center gap-2 mt-6 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'ثبت و ذخیره اطلاعات'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
