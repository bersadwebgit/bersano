'use client';

import { useState } from 'react';
import { Search, ShieldAlert, ArrowRight, MessageCircle, Clock, Calendar, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TrackedTicket {
  id: string;
  displayId: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  };
  messages: Array<{
    id: string;
    isStaff: boolean;
    message: string;
    createdAt: string;
  }>;
}

interface ContactUsTrackProps {
  themeColor: string;
}

export default function ContactUsTrackClient({ themeColor }: ContactUsTrackProps) {
  const router = useRouter();
  const [ticketId, setTicketId] = useState('');
  const [contact, setContact] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState<TrackedTicket | null>(null);

  // Helper to get soft-colored theme background for light/dark modes
  const getThemeBgStyle = (opacityHex: string) => `${themeColor}${opacityHex}`;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim() || !contact.trim()) return;

    setLoading(true);
    setError(null);
    setTicket(null);

    try {
      const res = await fetch('/api/contact-us/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: ticketId.trim(), contact: contact.trim() }),
      });

      const data = await res.json();

      if (res.ok) {
        setTicket(data.ticket);
      } else {
        setError(data.error || 'کد پیگیری یا اطلاعات تماس اشتباه است.');
      }
    } catch (err) {
      console.error('Error tracking contact ticket:', err);
      setError('خطا در ارتباط با سرور. لطفاً بعداً تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/10">جدید / پاسخ‌نداده</span>;
      case 'in_progress':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-200/10">در حال بررسی</span>;
      case 'answered':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200/10">پاسخ داده شده</span>;
      case 'closed':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400">بسته شده (مختومه)</span>;
      default:
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-slate-50 text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-8" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors font-bold mb-2.5"
          >
            <ArrowRight size={14} />
            بازگشت به تماس با ما
          </button>
          <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
            <Search className="w-5 h-5" style={{ color: themeColor }} />
            پیگیری پیام‌های تماس با ما
          </h2>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 font-bold">
            مشاهده وضعیت پاسخ‌ها و تاریخچه پیگیری پیام‌های ارسال‌شده به دپارتمان‌های فروشگاه
          </p>
        </div>
      </div>

      {!ticket ? (
        /* Tracking Form Card */
        <div className="max-w-xl mx-auto bg-white dark:bg-gray-950 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800/40 shadow-sm space-y-6">
          <div className="space-y-1 text-center">
            <h3 className="text-sm font-black text-gray-800 dark:text-gray-100">دریافت وضعیت پیام</h3>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold">کد پیام (تیکت) و شماره تماس یا ایمیلی که در فرم پر کرده‌اید را وارد کنید</p>
          </div>

          <form onSubmit={handleTrack} className="space-y-4">
            {error && (
              <div className="p-4 rounded-xl border flex items-start gap-2.5 text-xs font-bold bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-850/40 text-red-600 dark:text-red-400">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">کد پیگیری پیام (یا شناسه تیکت) <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="مثال: cldx1234..."
                className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 dark:text-gray-400 font-bold block">شماره موبایل یا ایمیل فرستنده <span className="text-red-500">*</span></label>
              <input
                type="text"
                required
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder="مثال: ۰۹۱۲۳۴۵۶۷۸۹ یا name@gmail.com"
                className="w-full px-3.5 py-2.5 bg-gray-50/60 dark:bg-gray-900/20 border border-gray-100 dark:border-gray-800/80 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-gray-700 focus:bg-white dark:focus:bg-gray-950 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !ticketId.trim() || !contact.trim()}
              className="w-full px-5 py-3 rounded-xl font-black text-xs text-white shadow-md hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: themeColor }}
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  بررسی وضعیت پیام تماس با ما
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        /* Tracked Ticket View */
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-white dark:bg-gray-950 p-6 rounded-2xl border border-gray-100 dark:border-gray-800/40 shadow-3xs flex flex-col md:flex-row justify-between gap-6">
            <div className="space-y-3.5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-sm font-black text-gray-900 dark:text-white">شناسه پیام: #{ticket.displayId}</span>
                {getStatusBadge(ticket.status)}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1.5 font-bold">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-gray-400" />
                  <span>تاریخ ارسال: {ticket.createdAt}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={14} className="text-gray-400" />
                  <span>آخرین بروزرسانی: {ticket.updatedAt}</span>
                </div>
              </div>
            </div>

            <div className="md:text-left self-start md:self-center border-t md:border-t-0 md:border-r border-gray-100 dark:border-gray-800/60 pt-4 md:pt-0 md:pr-6">
              <span className="text-[10px] text-gray-400 block font-bold mb-1">اطلاعات فرستنده</span>
              <span className="text-xs font-black text-gray-850 dark:text-gray-100 block">{ticket.user.name || 'کاربر میهمان'}</span>
              <span className="text-[10px] font-mono text-gray-400 block mt-0.5">{ticket.user.email}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Conversation Flow */}
            <div className="lg:col-span-2 space-y-4">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">مکالمه و پاسخ‌های پشتیبانی</h3>
              
              {/* Original Message */}
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 font-bold border border-indigo-100/45 dark:border-indigo-900/10">
                  شما
                </div>
                <div className="flex-1 rounded-2xl p-5 bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800/40 shadow-3xs space-y-2">
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <span className="font-bold">پیام اولیه ارسالی شما</span>
                    <span>{ticket.createdAt}</span>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-medium">
                    {ticket.description}
                  </p>
                </div>
              </div>

              {/* Message History */}
              {ticket.messages.length === 0 ? (
                <div className="p-8 rounded-2xl border border-dashed border-gray-200 dark:border-gray-850 flex flex-col items-center justify-center text-center gap-2.5 text-gray-400">
                  <Clock className="w-8 h-8 opacity-40 animate-pulse" />
                  <span className="text-xs font-black text-gray-700 dark:text-gray-200">در انتظار پاسخ پشتیبان...</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">پیام شما دریافت شده است و کارشناسان ما به زودی پاسخ را در همین صفحه قرار می‌دهند.</p>
                </div>
              ) : (
                ticket.messages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex gap-4 ${msg.isStaff ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold ${
                      msg.isStaff 
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100/45 dark:border-emerald-900/10' 
                        : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-100/45 dark:border-indigo-900/10'
                    }`}>
                      {msg.isStaff ? 'پشتیبان' : 'شما'}
                    </div>
                    <div className={`flex-1 rounded-2xl p-5 shadow-3xs space-y-2 border ${
                      msg.isStaff 
                        ? 'bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-100/40 dark:border-emerald-950/20' 
                        : 'bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-800/40'
                    }`}>
                      <div className="flex justify-between items-center text-[10px] text-gray-400">
                        <span className="font-bold">{msg.isStaff ? 'پاسخ کارشناس پشتیبانی' : 'توضیحات تکمیلی شما'}</span>
                        <span>{msg.createdAt}</span>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.message}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Tracking Tips Sidebar */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-900 dark:text-white">نکات پیگیری</h3>
              <div className="bg-gradient-to-br from-indigo-50/50 via-white to-indigo-50/30 dark:from-slate-950/30 dark:via-slate-950 dark:to-slate-950/20 p-5 rounded-2xl border border-indigo-100/40 dark:border-indigo-950/20 space-y-3.5">
                <h4 className="text-xs font-black text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  پیام شما دریافت شده است
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                  کارشناسان دپارتمان مربوطه پیام شما را به دقت مطالعه کرده‌اند. در صورت پاسخ، متن پاسخ در همین صفحه برای شما به نمایش در می‌آید.
                </p>
                <div className="border-t border-indigo-100/40 dark:border-indigo-950/25 my-3" />
                <div className="space-y-2">
                  <span className="text-[10px] font-black text-gray-700 dark:text-gray-300 block">راه‌های سریع دیگر:</span>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed">
                    اگر به پاسخی سریع‌تر نیاز دارید، می‌توانید از اطلاعات تماس و راه‌های ارتباط مستقیم ذکر شده در صفحه اصلی تماس با ما استفاده کنید.
                  </p>
                </div>
                <button
                  onClick={() => setTicket(null)}
                  className="w-full mt-2.5 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white rounded-xl text-[10px] font-black shadow-3xs transition-all border border-indigo-200/20"
                >
                  استعلام پیام دیگر
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
