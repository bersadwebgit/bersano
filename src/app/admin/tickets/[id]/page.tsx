'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Send, User, Shield, Phone, MessageCircle, Smartphone, Mail, AlertCircle } from 'lucide-react';
import Link from 'next/link';

const getWhatsAppLink = (phone: string, name: string) => {
  if (!phone) return '';
  let cleanPhone = phone.replace(/\s+/g, '').replace(/[-+]/g, '');
  if (cleanPhone.startsWith('0')) {
    cleanPhone = '98' + cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('+98')) {
    cleanPhone = cleanPhone.substring(1);
  } else if (!cleanPhone.startsWith('98')) {
    cleanPhone = '98' + cleanPhone;
  }
  const text = encodeURIComponent(`سلام ${name || 'گرامی'} عزیز،\nپیرو پیام شما در فرم تماس با ما فروشگاه با شما ارتباط می‌گیریم:`);
  return `https://wa.me/${cleanPhone}?text=${text}`;
};

const getSmsLink = (phone: string, name: string) => {
  if (!phone) return '';
  const text = encodeURIComponent(`سلام ${name || 'گرامی'} عزیز، پیرو پیام شما در فرم تماس با ما...`);
  return `sms:${phone}?body=${text}`;
};

const getEmailLink = (email: string, name: string) => {
  if (!email) return '';
  const emailSubject = encodeURIComponent(`پاسخ به پیام تماس با ما`);
  const body = encodeURIComponent(`سلام ${name || 'گرامی'} عزیز،\n\nپیرو پیام شما در فرم تماس با ما فروشگاه:\n\n---\n\n`);
  return `mailto:${email}?subject=${emailSubject}&body=${body}`;
};

export default function AdminTicketDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');

  useEffect(() => {
    fetchTicket();
  }, [id]);

  async function fetchTicket() {
    setLoading(true);
    setTicket(null);
    setReplyMessage('');
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
      }
    } catch (error) {
      console.error('Error fetching ticket:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;

    setSubmitting(true);
    setReplyError('');
    try {
      const res = await fetch(`/api/admin/tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyMessage })
      });
      
      if (res.ok) {
        setReplyMessage('');
        fetchTicket(); // Refresh to show new message
      } else {
        const data = await res.json().catch(() => ({}));
        setReplyError(data.error || 'خطا در ارسال پاسخ');
      }
    } catch (error) {
      console.error('Error sending reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (status: string) => {
    try {
      const res = await fetch(`/api/admin/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchTicket();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!ticket) {
    return <div className="text-center py-12">تیکت یافت نشد.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          <ArrowRight size={20} className="text-gray-600 dark:text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مشاهده تیکت</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">شماره تیکت: {ticket.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="md:col-span-2 space-y-6">
          {/* Original Ticket */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {ticket.subject === 'return' ? 'درخواست مرجوعی کالا' : 
                 ticket.subject === 'shipping' ? 'مشکل در ارسال بار' : 
                 ticket.subject === 'payment' ? 'اختلال درگاه پرداخت' : 
                 ticket.subject === 'other' ? 'سایر موارد' : 
                 ticket.subject === 'contact' ? 'پیام فرم تماس با ما' : ticket.subject}
              </h2>
              {ticket.orderId && (
                <button 
                  onClick={() => {
                    router.push(`/admin/orders?orderId=${ticket.orderId}`);
                  }}
                  className="text-xs bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1.5 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  سفارش مرتبط: {ticket.orderId.slice(-8).toUpperCase()}
                </button>
              )}
            </div>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed mb-4">
              {ticket.description}
            </p>
            {ticket.attachmentUrl && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">پیوست:</p>
                <a 
                  href={ticket.attachmentUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-block"
                >
                  <img 
                    src={ticket.attachmentUrl} 
                    alt="پیوست تیکت" 
                    className="max-h-48 rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                  />
                </a>
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="space-y-4">
            {ticket.messages && ticket.messages.map((msg: any) => (
              <div 
                key={msg.id} 
                className={`flex gap-4 ${msg.isStaff ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${msg.isStaff ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                  {msg.isStaff ? <Shield size={20} /> : <User size={20} />}
                </div>
                <div className={`flex-1 rounded-2xl p-4 ${msg.isStaff ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30' : 'bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {msg.isStaff ? 'پشتیبانی' : ticket.user.name || 'کاربر'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(msg.createdAt).toLocaleDateString('fa-IR')}
                    </span>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                    {msg.message}
                  </p>
                  {msg.attachmentUrl && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50">
                      <a 
                        href={msg.attachmentUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        className="inline-block"
                      >
                        <img 
                          src={msg.attachmentUrl} 
                          alt="پیوست پیام" 
                          className="max-h-32 rounded-lg border border-gray-200 dark:border-gray-700 hover:opacity-90 transition-opacity"
                        />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Reply Box */}
          {ticket.status !== 'closed' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4">
              {ticket.subject === 'contact' && (
                <div className="mb-4 p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/20 rounded-xl flex items-start gap-3">
                  <AlertCircle size={18} className="text-amber-650 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-950 dark:text-amber-300 font-bold leading-relaxed">
                    <span className="font-extrabold block mb-1 text-amber-800 dark:text-amber-400">💡 راهنمای پیگیری پیام تماس با ما:</span>
                    این پیام از فرم عمومی تماس با ما ارسال شده است و فرستنده دسترسی به پنل تیکت کاربری ندارد.
                    پاسخی که در بخش زیر می‌نویسید صرفاً به عنوان <span className="font-black">«گزارش/پیگیری داخلی»</span> ثبت می‌شود. 
                    برای تماس و پیگیری مستقیم، از بخش <span className="font-black">«ابزارهای پیگیری و تماس سریع»</span> در ستون سمت چپ استفاده فرمایید.
                  </div>
                </div>
              )}
              {replyError && (
                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {replyError}
                </div>
              )}
              <form onSubmit={handleReply}>
                <textarea
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="پاسخ خود را بنویسید..."
                  className="w-full min-h-[120px] p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900 dark:text-white mb-4"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !replyMessage.trim()}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {submitting ? 'در حال ارسال...' : (
                      <>
                        <Send size={18} />
                        ارسال پاسخ
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">اطلاعات تیکت</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">وضعیت</div>
                <select 
                  value={ticket.status}
                  onChange={(e) => updateStatus(e.target.value)}
                  className="w-full p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="new">جدید</option>
                  <option value="in_progress">در حال بررسی</option>
                  <option value="answered">پاسخ داده شده</option>
                  <option value="closed">بسته شده</option>
                </select>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">اولویت</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {ticket.priority === 'low' ? 'کم' : 
                   ticket.priority === 'normal' ? 'عادی' : 
                   ticket.priority === 'high' ? 'زیاد' : 'فوری'}
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">تاریخ ثبت</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4">اطلاعات کاربر</h3>
            
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">نام</div>
                <div className="font-medium text-gray-900 dark:text-white">{ticket.user.name || '---'}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">ایمیل</div>
                <div className="font-medium text-gray-900 dark:text-white break-all">{ticket.user.email}</div>
              </div>

              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">شماره تماس</div>
                <div className="font-medium text-gray-900 dark:text-white">{ticket.user.phone || '---'}</div>
              </div>
            </div>
          </div>

          {/* Quick Contact & Follow-up Tools */}
          {(ticket.user.phone || ticket.user.email) && (
            <div className="bg-gradient-to-br from-indigo-50/60 via-white to-blue-50/40 dark:from-slate-900/60 dark:via-slate-900 dark:to-slate-900/40 rounded-2xl shadow-sm border border-blue-100/50 dark:border-blue-950/20 p-6 space-y-4">
              <h3 className="font-extrabold text-sm text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                ابزارهای پیگیری و تماس سریع
              </h3>
              
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                برای ارتباط سریع، پاسخ‌گویی مستقیم و پیگیری این کاربر از میانبرهای تماس زیر استفاده کنید:
              </p>
              
              <div className="flex flex-col gap-2.5 pt-1">
                {ticket.user.phone && (
                  <>
                    {/* Call Button */}
                    <a
                      href={`tel:${ticket.user.phone}`}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/10 hover:bg-emerald-600 dark:hover:bg-emerald-600 hover:text-white dark:hover:text-white transition-all font-black text-xs group shadow-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Phone size={15} />
                        تماس تلفنی مستقیم
                      </span>
                      <span className="text-[10px] font-mono opacity-80 group-hover:opacity-100 transition-opacity">
                        {ticket.user.phone}
                      </span>
                    </a>

                    {/* WhatsApp Button */}
                    <a
                      href={getWhatsAppLink(ticket.user.phone, ticket.user.name)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border border-teal-200/40 dark:border-teal-900/10 hover:bg-teal-600 dark:hover:bg-teal-600 hover:text-white dark:hover:text-white transition-all font-black text-xs shadow-sm"
                    >
                      <MessageCircle size={15} />
                      گفتگو در واتساپ
                    </a>

                    {/* SMS Button */}
                    <a
                      href={getSmsLink(ticket.user.phone, ticket.user.name)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-450 border border-blue-200/40 dark:border-blue-900/10 hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white transition-all font-black text-xs shadow-sm"
                    >
                      <Smartphone size={15} />
                      ارسال پیامک مستقیم (SMS)
                    </a>
                  </>
                )}

                {ticket.user.email && (
                  <a
                    href={getEmailLink(ticket.user.email, ticket.user.name)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-900/10 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white dark:hover:text-white transition-all font-black text-xs group shadow-sm"
                  >
                    <span className="flex items-center gap-2">
                      <Mail size={15} />
                      ارسال ایمیل مستقیم
                    </span>
                    <span className="text-[10px] font-mono opacity-80 group-hover:opacity-100 transition-opacity truncate max-w-[120px]">
                      {ticket.user.email}
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
