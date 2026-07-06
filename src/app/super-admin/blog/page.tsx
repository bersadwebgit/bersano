'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  ArrowRight,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: string;
  author: string | null;
  createdAt: string;
  publishedAt: string | null;
  category: { id: string; name: string } | null;
}

export default function PlatformBlogListPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchPosts = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/blog/posts');
      if (res.ok) {
        setPosts(await res.json());
      } else {
        const data = await res.json();
        setError(data.error || 'خطا در بارگذاری مقالات');
      }
    } catch {
      setError('خطای اتصال به سرور');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`آیا از حذف مقاله «${title}» اطمینان کامل دارید؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/super-admin/blog/posts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setSuccess('مقاله با موفقیت حذف شد.');
        setTimeout(() => setSuccess(''), 3000);
        fetchPosts();
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در حذف مقاله');
      }
    } catch {
      alert('خطا در شبکه');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold mb-2">
              <Link href="/super-admin" className="flex items-center gap-0.5">
                <ArrowRight className="h-3.5 w-3.5" />
                داشبورد سوپر ادمین
              </Link>
            </div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <FileText className="h-6 w-6 text-slate-700" />
              وبلاگ اصلی پلتفرم برسانا
            </h2>
            <p className="text-xs text-slate-500 mt-1">مدیریت، تولید و سئوسازی بریف‌ها و مقالات مرکزی پلتفرم برسانا</p>
          </div>
          <button
            onClick={() => router.push('/super-admin/blog/new')}
            className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="h-4 w-4" />
            افزودن مقاله جدید
          </button>
        </div>

        {/* Notifications */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Posts Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-500 font-bold">در حال دریافت مقالات پلتفرم...</span>
            </div>
          ) : posts.length === 0 ? (
            <div className="flex flex-col justify-center items-center py-20 text-center">
              <FileText className="h-12 w-12 text-slate-300 mb-3" />
              <h3 className="font-bold text-slate-700 text-sm">هنوز هیچ مقاله‌ای ثبت نشده است</h3>
              <p className="text-xs text-slate-500 mt-1">با کلیک بر روی دکمه «افزودن مقاله جدید»، اولین مقاله وبلاگ مرکزی برسانا را ثبت کنید.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">عنوان مقاله</th>
                    <th className="px-6 py-4">دسته‌بندی</th>
                    <th className="px-6 py-4">نویسنده</th>
                    <th className="px-6 py-4">وضعیت انتشار</th>
                    <th className="px-6 py-4">تاریخ ثبت</th>
                    <th className="px-6 py-4 text-left">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {posts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{post.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">/blog/{post.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        {post.category ? (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            {post.category.name}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">{post.author || 'مدیر سیستم'}</td>
                      <td className="px-6 py-4">
                        {post.status === 'published' ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            منتشر شده
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-[10px]">
                            پیش‌نویس
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(post.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-left">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
                            title="مشاهده در سایت"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => router.push(`/super-admin/blog/${post.id}/edit`)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all"
                            title="ویرایش مقاله"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(post.id, post.title)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                            title="حذف مقاله"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
