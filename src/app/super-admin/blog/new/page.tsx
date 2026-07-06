'use client';

import React from 'react';
import PlatformBlogEditor from '@/components/super-admin/PlatformBlogEditor';

export default function NewPlatformBlogPostPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">ایجاد مقاله جدید برای وبلاگ پلتفرم برسانا</h2>
          <p className="text-xs text-slate-500 mt-1">با استفاده از ابزارهای هوش مصنوعی سه‌بعدی و ممیزی سئو سنتی و GEO</p>
        </div>

        <PlatformBlogEditor mode="create" />
      </div>
    </div>
  );
}
