'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headphones, ArrowRight, Send, AlertCircle, Paperclip, X } from 'lucide-react';
import Link from 'next/link';

export default function NewSystemTicket() {
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setError('لطفا فقط فایل تصویر (عکس) انتخاب کنید.');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('حجم فایل نباید بیشتر از ۵ مگابایت باشد.');
        return;
      }
      setFile(selectedFile);
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      setError('لطفا تمامی فیلدها را پر کنید.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let attachmentUrl = '';

      // Upload file first if exists
      if (file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadRes = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('خطا در آپلود فایل ضمیمه');
        }

        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
      }

      const res = await fetch('/api/admin/system-tickets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject,
          priority,
          description,
          attachmentUrl,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ثبت تیکت');
      }

      router.push('/admin/system-tickets');
    } catch (err: any) {
      setError(err.message || 'خطایی در ثبت تیکت رخ داد. لطفا مجددا تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Link 
            href="/admin/system-tickets"
            className="p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors text-slate-550 dark:text-slate-400"
          >
            <ArrowRight size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
              <Headphones className="w-5 h-5 text-indigo-500" />
              ارسال تیکت جدید به پشتیبانی کل
            </h1>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">مشکل یا درخواست خود را مطرح کنید؛ کارشناسان ما در اسرع وقت پاسخ خواهند داد.</p>
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800/80">
        <form onSubmit={handleSubmit} className="space-y-5 text-right" dir="rtl">
          
          {error && (
            <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 rounded-2xl p-4 flex items-start gap-2.5 text-rose-700 dark:text-rose-400 text-xs font-bold">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">موضوع تیکت</label>
              <input 
                type="text"
                required
                placeholder="مثال: اختلال در درگاه پرداخت زرین‌پال، سوال در مورد تمدید اشتراک"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">اولویت تیکت</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 outline-none text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-all focus:border-blue-500"
              >
                <option value="low">کم اهمیت</option>
                <option value="normal">عادی</option>
                <option value="high">مهم</option>
                <option value="urgent">فوری / بحرانی</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">شرح کامل درخواست</label>
            <textarea
              required
              rows={6}
              placeholder="لطفا جزئیات کامل مشکل یا درخواست خود را بنویسید. در صورت نیاز به بررسی فنی، اطلاعات لازم را ضمیمه کنید..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-blue-500 resize-none leading-relaxed"
            />
          </div>

          {/* File Attachment */}
          <div>
            <label className="block text-xs font-black text-slate-700 dark:text-slate-300 mb-2">تصویر ضمیمه (اختیاری)</label>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 rounded-2xl cursor-pointer transition-all text-xs font-bold text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950">
                <Paperclip size={16} />
                <span>انتخاب تصویر</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
              {file && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button 
                    type="button" 
                    onClick={removeFile} 
                    className="text-rose-500 hover:text-rose-600 p-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
            {filePreview && (
              <div className="mt-3 relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Link
              href="/admin/system-tickets"
              className="px-5 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black transition-all"
            >
              انصراف
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-3 rounded-2xl text-xs font-black transition-all shadow-sm shadow-blue-600/10"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  در حال ثبت...
                </>
              ) : (
                <>
                  <Send size={14} />
                  ثبت و ارسال تیکت
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
