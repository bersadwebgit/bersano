'use client';

import React, { use } from 'react';
import PlatformBlogEditor from '@/components/super-admin/PlatformBlogEditor';

interface EditBlogPostPageProps {
  params: Promise<{ id: string }>;
}

export default function EditPlatformBlogPostPage({ params }: EditBlogPostPageProps) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-black text-slate-800">ویرایش مقاله وبلاگ پلتفرم برسانا</h2>
          <p className="text-xs text-slate-500 mt-1">ویرایش اطلاعات، بهینه‌سازی سئو، داده‌های ساختاریافته و همگام‌سازی GEO</p>
        </div>

        <PlatformBlogEditor mode="edit" initialPostId={id} />
      </div>
    </div>
  );
}
