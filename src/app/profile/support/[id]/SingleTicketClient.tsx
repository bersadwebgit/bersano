'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

interface TicketMessage {
  id: string;
  isStaff: boolean;
  message: string;
  attachmentUrl: string | null;
  createdAt: string;
}

interface Ticket {
  id: string;
  displayId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  attachmentUrl: string | null;
  order: {
    id: string;
    displayId: string;
    date: string;
    amount: number;
  } | null;
  messages: TicketMessage[];
}

export default function SingleTicketClient({ ticket }: { ticket: Ticket }) {
  const [messages, setMessages] = useState<TicketMessage[]>(ticket.messages);
  const [newMessage, setNewMessage] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'new': return { label: 'جدید', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' };
      case 'in_progress': return { label: 'در بررسی', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
      case 'answered': return { label: 'پاسخ داده شد', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' };
      case 'closed': return { label: 'بسته شد', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
      default: return { label: status, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' };
    }
  };

  const getSubjectDisplay = (subject: string) => {
    switch (subject) {
      case 'return': return 'مرجوعی کالا';
      case 'shipping': return 'پیگیری ارسال';
      case 'payment': return 'مشکل پرداخت';
      case 'other': return 'سایر موارد';
      default: return subject;
    }
  };

  const statusInfo = getStatusDisplay(ticket.status);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && !attachment) return;

    setLoading(true);

    try {
      let attachmentUrl = '';
      
      if (attachment) {
        const formData = new FormData();
        formData.append('file', attachment);
        const uploadRes = await fetch('/api/media', {
          method: 'POST',
          body: formData,
        });
        
        if (!uploadRes.ok) {
          throw new Error('خطا در آپلود تصویر');
        }
        const uploadData = await uploadRes.json();
        attachmentUrl = uploadData.url;
      }

      const res = await fetch(`/api/profile/tickets/${ticket.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: newMessage,
          attachmentUrl
        }),
      });

      if (!res.ok) throw new Error('Failed to send message');

      const data = await res.json();
      
      setMessages([...messages, {
        id: data.id,
        isStaff: data.isStaff,
        message: data.message,
        attachmentUrl: data.attachmentUrl,
        createdAt: new Date(data.createdAt).toLocaleDateString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      }]);
      
      setNewMessage('');
      setAttachment(null);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('خطا در ارسال پیام');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">تیکت #{ticket.displayId}</h1>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
            {statusInfo.label}
          </span>
        </div>
        <Link 
          href="/profile/support" 
          className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          بازگشت به لیست
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-4">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">موضوع</p>
            <p className="font-medium text-gray-900 dark:text-white">{getSubjectDisplay(ticket.subject)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">تاریخ ثبت</p>
            <p className="font-medium text-gray-900 dark:text-white">{ticket.createdAt}</p>
          </div>
        </div>

        {ticket.order && (
          <div className="flex-1 md:border-r md:border-gray-200 md:dark:border-gray-700 md:pr-6 space-y-4">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">سفارش مربوطه</p>
              <Link href={`/profile/orders/${ticket.order.id}`} className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline block">
                سفارش #{ticket.order.displayId}
              </Link>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">مبلغ سفارش</p>
              <p className="font-medium text-gray-900 dark:text-white">{ticket.order.amount.toLocaleString('fa-IR')} تومان</p>
            </div>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        {/* Original Ticket Description as first message */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex flex-col items-start max-w-[80%] ml-auto">
            <div className="bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 shadow-sm w-full">
              <p className="whitespace-pre-wrap">{ticket.description}</p>
              {ticket.attachmentUrl && (
                <div className="mt-3 pt-3 border-t border-indigo-500/50">
                  <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-100 hover:text-white transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    مشاهده پیوست
                  </a>
                </div>
              )}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 mr-2">{ticket.createdAt} • شما</span>
          </div>

          {/* Conversation Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.isStaff ? 'items-end mr-auto' : 'items-start ml-auto'} max-w-[80%]`}>
              <div className={`rounded-2xl px-5 py-3 shadow-sm w-full ${
                msg.isStaff 
                  ? 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-tl-sm border border-gray-100 dark:border-gray-700' 
                  : 'bg-indigo-600 text-white rounded-tr-sm'
              }`}>
                <p className="whitespace-pre-wrap">{msg.message}</p>
                {msg.attachmentUrl && (
                  <div className={`mt-3 pt-3 border-t ${msg.isStaff ? 'border-gray-100 dark:border-gray-700' : 'border-indigo-500/50'}`}>
                    <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 text-sm transition-colors ${
                      msg.isStaff ? 'text-indigo-600 dark:text-indigo-400 hover:underline' : 'text-indigo-100 hover:text-white'
                    }`}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      مشاهده پیوست
                    </a>
                  </div>
                )}
              </div>
              <span className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${msg.isStaff ? 'ml-2' : 'mr-2'}`}>
                {msg.createdAt} • {msg.isStaff ? 'پشتیبانی' : 'شما'}
              </span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {ticket.status === 'closed' ? (
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">این تیکت بسته شده است و امکان ارسال پیام جدید وجود ندارد.</p>
          </div>
        ) : (
          <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="پیام خود را بنویسید..."
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-white resize-none"
                rows={3}
              />
              <div className="flex items-center justify-between">
                <div className="relative">
                  <input
                    type="file"
                    id="attachment"
                    className="hidden"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                  <label 
                    htmlFor="attachment"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    {attachment ? attachment.name : 'پیوست فایل'}
                  </label>
                </div>
                
                <button
                  type="submit"
                  disabled={loading || (!newMessage.trim() && !attachment)}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loading ? (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                  ارسال پیام
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
