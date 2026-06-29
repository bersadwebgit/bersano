'use client';

import { useState, useEffect, use } from 'react';
import BlogForm from '../../components/BlogForm';

export default function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;

  const [post, setPost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchPostDetails();
    }
  }, [id]);

  const fetchPostDetails = async () => {
    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`);
      if (res.ok) {
        const data = await res.json();
        const p = data.post;
        
        // Convert tags from JSON string to string array
        let parsedTags: string[] = [];
        try {
          parsedTags = JSON.parse(p.tags || '[]');
        } catch (e) {
          parsedTags = [];
        }

        // Convert faqs from JSON string to array
        let parsedFaqs: { question: string; answer: string }[] = [];
        try {
          parsedFaqs = JSON.parse(p.faqs || '[]');
        } catch (e) {
          parsedFaqs = [];
        }

        // Format date for datetime-local input (YYYY-MM-DDTHH:MM)
        let formattedDate = new Date().toISOString().slice(0, 16);
        if (p.publishedAt) {
          formattedDate = new Date(p.publishedAt).toISOString().slice(0, 16);
        }

        setPost({
          id: p.id,
          title: p.title,
          slug: p.slug,
          content: p.content,
          summary: p.summary || '',
          featuredImage: p.featuredImage || '',
          status: p.status,
          publishedAt: formattedDate,
          authorId: p.authorId || '',
          authorName: p.authorName || '',
          categoryId: p.categoryId || '',
          tags: parsedTags,
          faqs: parsedFaqs,
          seoTitle: p.seoTitle || '',
          seoDescription: p.seoDescription || '',
          seoSlug: p.seoSlug || '',
          ogImage: p.ogImage || '',
          allowComments: p.allowComments !== undefined ? p.allowComments : true,
        });
      } else {
        setError('پست مورد نظر یافت نشد.');
      }
    } catch (err) {
      console.error('Error fetching post details:', err);
      setError('خطا در دریافت اطلاعات پست از سرور.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs font-bold text-slate-400">در حال بارگذاری اطلاعات پست...</div>;
  }

  if (error || !post) {
    return <div className="p-12 text-center text-xs font-bold text-rose-500">{error || 'خطایی رخ داده است.'}</div>;
  }

  return (
    <div className="py-2 select-none">
      <BlogForm initialData={post} isEdit={true} />
    </div>
  );
}
