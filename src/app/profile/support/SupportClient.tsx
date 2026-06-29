'use client';

import React from 'react';
import Link from 'next/link';

interface Ticket {
  id: string;
  displayId: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  orderId: string | null;
}

export default function SupportClient({ initialTickets }: { initialTickets: Ticket[] }) {
  const tickets = initialTickets;

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white">پشتیبانی و تیکت‌ها</h1>
        <Link 
          href="/profile/support/new" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors w-full sm:w-auto text-center"
        >
          ثبت تیکت جدید
        </Link>
      </div>

      {tickets.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">تیکتی وجود ندارد</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            شما هنوز هیچ تیکت پشتیبانی ثبت نکرده‌اید.
          </p>
          <Link 
            href="/profile/support/new" 
            className="inline-block bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-6 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          >
            ثبت اولین تیکت
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tickets.map(ticket => {
            const statusInfo = getStatusDisplay(ticket.status);
            return (
              <div key={ticket.id} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.className}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">تیکت #{ticket.displayId}</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      {getSubjectDisplay(ticket.subject)}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                      {ticket.description}
                    </p>
                    {ticket.orderId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                        مربوط به سفارش: <span className="font-medium text-gray-700 dark:text-gray-300">#{ticket.orderId}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-col justify-between items-start md:items-end gap-4 min-w-[120px]">
                    <div className="text-left">
                      <p className="text-xs text-gray-500 dark:text-gray-400">آخرین بروزرسانی</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-1">{ticket.updatedAt}</p>
                    </div>
                    <Link 
                      href={`/profile/support/${ticket.id}`}
                      className="w-full text-center md:w-auto px-4 py-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-sm transition-colors"
                    >
                      مشاهده تیکت
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
