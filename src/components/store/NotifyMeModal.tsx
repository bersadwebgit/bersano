'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Bell, CheckCircle2, Loader2, X } from 'lucide-react';

interface NotifyMeModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  variantId?: string;
  productTitle: string;
}

export default function NotifyMeModal({ isOpen, onClose, productId, variantId, productTitle }: NotifyMeModalProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/products/${productId}/notify-me`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone,
          variantId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در ثبت درخواست رخ داد');
      }

      setSuccess(true);
      setMessage(data.message || 'درخواست شما با موفقیت ثبت شد.');
    } catch (err: any) {
      setError(err.message || 'خطایی در ارتباط با سرور رخ داد');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-50 dark:bg-blue-950/30 p-2 rounded-xl text-blue-600 dark:text-blue-400">
              <Bell className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">خبرم کن</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 text-green-500 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">ثبت موفقیت‌آمیز</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                {message}
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-2xl transition-colors text-sm"
              >
                بستن پنجره
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                به محض موجود شدن محصول <strong className="text-gray-900 dark:text-white">«{productTitle}»</strong> از طریق پیامک به شما اطلاع‌رسانی خواهیم کرد.
              </p>

              <div>
                <label htmlFor="phone" className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
                  شماره موبایل
                </label>
                <input
                  type="tel"
                  id="phone"
                  required
                  placeholder="مثال: 09123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-750 rounded-2xl px-4 py-3.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 text-center font-mono placeholder:font-sans"
                  dir="ltr"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs p-3.5 rounded-2xl border border-red-100 dark:border-red-900/30 font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-[0.98] text-sm flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    در حال ثبت درخواست...
                  </>
                ) : (
                  'ثبت درخواست اطلاع‌رسانی'
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
