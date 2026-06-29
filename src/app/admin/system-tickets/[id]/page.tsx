'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowRight, Send, User, Shield, Calendar, Clock, AlertCircle, Paperclip, X } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  senderId: string;
  senderRole: string;
  message: string;
  attachmentUrl?: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export default function AdminSystemTicketDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [ticket?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        setReplyError('لطفا فقط فایل تصویر (عکس) انتخاب کنید.');
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setReplyError('حجم فایل نباید بیشتر از ۵ مگابایت باشد.');
        return;
      }
      setFile(selectedFile);
      setReplyError('');
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

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/admin/system-tickets/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setTicket(data.ticket);
      } else {
        router.push('/admin/system-tickets');
      }
    } catch (error) {
      console.error('Error fetching system ticket:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyMessage.trim() && !file) return;

    setSubmitting(true);
    setReplyError('');
    try {
      let attachmentUrl = '';

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

      const res = await fetch(`/api/admin/system-tickets/${id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: replyMessage,
          attachmentUrl 
        })
      });
      
      if (res.ok) {
        setReplyMessage('');
        setFile(null);
        setFilePreview(null);
        fetchTicket(); // Refresh to show new message
      } else {
        const data = await res.json().catch(() => ({}));
        setReplyError(data.error || 'خطا در ارسال پاسخ');
      }
    } catch (error: any) {
      console.error('Error sending reply:', error);
      setReplyError(error.message || 'خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/10">جدید / منتظر بررسی</span>;
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

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'low':
        return <span className="bg-slate-50 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded-full">پایین</span>;
      case 'normal':
        return <span className="bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 text-[10px] font-bold px-2.5 py-1 rounded-full">عادی</span>;
      case 'high':
        return <span className="bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 text-[10px] font-black px-2.5 py-1 rounded-full">مهم</span>;
      case 'urgent':
        return <span className="bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 text-[10px] font-black px-2.5 py-1 rounded-full shadow-sm animate-pulse border border-rose-200/10">بحرانی / فوری</span>;
      default:
        return <span className="bg-slate-50 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-full">{priority}</span>;
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
    <div className="max-w-4xl mx-auto space-y-6 select-none">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/admin/system-tickets')}
            className="p-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl transition-colors text-slate-600 dark:text-gray-450"
          >
            <ArrowRight size={18} />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-800 dark:text-white flex items-center gap-2">
              {ticket.subject}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400 font-bold">
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                {new Date(ticket.createdAt).toLocaleDateString('fa-IR')}
              </span>
              <span>•</span>
              <span>کد تیکت: #{ticket.id.slice(-8).toUpperCase()}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getPriorityBadge(ticket.priority)}
          {getStatusBadge(ticket.status)}
        </div>
      </div>

      {/* Chat Area */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden flex flex-col h-[500px]">
        
        {/* Messages List */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/30 dark:bg-slate-950/10 custom-scrollbar">
          {ticket.messages.map((msg) => {
            const isMe = msg.senderRole === 'admin';
            return (
              <div 
                key={msg.id} 
                className={`flex gap-3 max-w-[80%] ${isMe ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-black select-none ${
                  isMe 
                    ? 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30' 
                    : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30'
                }`}>
                  {isMe ? <User size={14} /> : <Shield size={14} />}
                </div>

                {/* Message Bubble */}
                <div className="space-y-1">
                  <div className={`px-4 py-3 rounded-2xl text-xs font-bold leading-relaxed whitespace-pre-wrap break-words ${
                    isMe 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.message}
                    {msg.attachmentUrl && (
                      <div className="mt-2 rounded-xl overflow-hidden border border-black/10 dark:border-white/10 max-w-[200px]">
                        <a href={msg.attachmentUrl} target="_blank" rel="noreferrer">
                          <img src={msg.attachmentUrl} alt="Attachment" className="w-full h-auto object-cover hover:scale-105 transition-all" />
                        </a>
                      </div>
                    )}
                  </div>
                  <div className={`text-[9px] text-slate-400 font-bold px-1 ${isMe ? 'text-left' : 'text-right'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Form */}
        {ticket.status !== 'closed' ? (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-900 space-y-3">
            {filePreview && (
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                <img src={filePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={removeFile} 
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1 rounded-full transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            )}
            <form onSubmit={handleReply} className="relative flex items-center gap-2">
              <label className="p-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl cursor-pointer transition-all text-slate-600 dark:text-gray-400 shrink-0">
                <Paperclip size={16} />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange} 
                  className="hidden" 
                />
              </label>
              <input 
                type="text"
                placeholder="پاسخ خود را بنویسید..."
                value={replyMessage}
                onChange={(e) => setReplyMessage(e.target.value)}
                disabled={submitting}
                className="flex-1 pl-14 pr-4 py-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-900 outline-none text-xs font-bold text-slate-800 dark:text-white transition-all focus:border-blue-500"
              />
              <button 
                type="submit"
                disabled={submitting || (!replyMessage.trim() && !file)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm"
              >
                {submitting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <Send size={14} className="rotate-180" />
                )}
              </button>
            </form>
            {replyError && (
              <div className="mt-2 text-[10px] text-rose-600 font-bold flex items-center gap-1">
                <AlertCircle size={12} />
                <span>{replyError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-slate-50 dark:bg-slate-950/40 text-center text-xs font-bold text-slate-500 border-t border-slate-100 dark:border-slate-800/60">
            این تیکت بسته شده است و امکان ارسال پاسخ وجود ندارد.
          </div>
        )}

      </div>
    </div>
  );
}
