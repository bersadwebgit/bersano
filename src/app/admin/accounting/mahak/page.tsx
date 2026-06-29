'use client';

import React from 'react';
import MahakIntegration from '@/app/admin/agent/components/MahakIntegration';

export default function MahakAccountingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white">حسابداری و مالی</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-1">
            یکپارچه‌سازی و همگام‌سازی اطلاعات فروشگاه با سیستم‌های حسابداری خارج از سایت
          </p>
        </div>
      </div>
      
      <div className="bg-white dark:bg-[#0d1527] rounded-3xl p-6 border border-slate-100 dark:border-slate-850/60 shadow-xs">
        <MahakIntegration />
      </div>
    </div>
  );
}
