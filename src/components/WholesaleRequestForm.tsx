'use client';

import { useState, useEffect } from 'react';
import { Store, Loader2, CheckCircle2, AlertCircle, Send, ShieldAlert } from 'lucide-react';

export default function WholesaleRequestForm({ themeColor }: { themeColor: string }) {
  const [companyName, setCompanyName] = useState('');
  const [businessType, setBusinessType] = useState('retailer');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchRequestStatus();
  }, []);

  const fetchRequestStatus = async () => {
    try {
      const res = await fetch('/api/wholesale/request');
      if (res.ok) {
        const data = await res.json();
        setExistingRequest(data.request);
      }
    } catch (err) {
      console.error('Error fetching request status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !businessType || !phone) {
      setError('پر کردن فیلدهای ستاره‌دار الزامی است');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/wholesale/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, businessType, phone, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setExistingRequest(data.request);
      } else {
        setError(data.error || 'خطا در ثبت درخواست');
      }
    } catch (err) {
      console.error('Error submitting request:', err);
      setError('خطای ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: themeColor }} />
        <span className="text-xs font-bold text-slate-500">در حال بررسی وضعیت حساب کاربری...</span>
      </div>
    );
  }

  if (existingRequest && existingRequest.status === 'approved') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-800 dark:text-slate-200">شما عضو همکاران عمده هستید</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            درخواست همکاری شما قبلاً تایید شده است. اکنون می‌توانید قیمت‌های عمده را در سایت مشاهده کرده و خرید خود را ثبت کنید.
          </p>
        </div>
      </div>
    );
  }

  if (existingRequest && existingRequest.status === 'pending') {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 text-amber-500 rounded-full flex items-center justify-center text-2xl mx-auto">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-800 dark:text-slate-200">درخواست شما در حال بررسی است</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
            درخواست همکاری عمده شما ثبت شده و توسط مدیریت فروشگاه در حال بررسی است. به محض تایید، دسترسی شما فعال خواهد شد.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-3xl shadow-sm p-6 md:p-8 space-y-6">
      {success ? (
        <div className="text-center space-y-4 py-4">
          <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 rounded-full flex items-center justify-center text-2xl mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-black text-slate-800 dark:text-slate-200">درخواست شما با موفقیت ثبت شد</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              اطلاعات شما با موفقیت ثبت گردید. پس از بررسی توسط کارشناسان ما، نتیجه از طریق تماس یا پنل کاربری به شما اعلام خواهد شد.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 text-right">
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200/20 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {existingRequest && existingRequest.status === 'rejected' && (
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/20 text-amber-600 dark:text-amber-400 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>درخواست قبلی شما رد شده است. در صورت تمایل می‌توانید اطلاعات خود را اصلاح کرده و مجدداً درخواست دهید.</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                نام شرکت / فروشگاه <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="مثال: بازرگانی احمدی یا فروشگاه آنلاین شیک"
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">
                نوع کسب و کار <span className="text-rose-500">*</span>
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
              >
                <option value="retailer">خرده فروش</option>
                <option value="distributor">توزیع کننده / بنکدار</option>
                <option value="manufacturer">تولید کننده</option>
                <option value="other">سایر موارد</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">
              تلفن تماس همکار <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="مثال: 09123456789"
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white text-left"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1.5">
              توضیحات بیشتر (اختیاری)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="زمینه فعالیت، آدرس وب‌سایت یا پیج اینستاگرام و هرگونه توضیح تکمیلی..."
              className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white outline-none text-xs font-bold text-slate-850 dark:text-white"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-3 text-white rounded-2xl font-black text-xs shadow-sm transition-all duration-200 active:scale-98 hover:shadow-md cursor-pointer"
              style={{ backgroundColor: themeColor }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال ثبت درخواست...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>ارسال درخواست همکاری عمده</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
