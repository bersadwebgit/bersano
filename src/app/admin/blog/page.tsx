// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  BookOpen, 
  Edit, 
  Trash2, 
  Copy, 
  Search, 
  Eye, 
  Filter, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  ExternalLink,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  Tags,
  Save,
  X,
  Reply,
  AlertOctagon,
  Check,
  CalendarDays
} from 'lucide-react';
import ContentCalendarTab from './components/ContentCalendarTab';

type Post = {
  id: string;
  title: string;
  slug: string;
  status: string; // draft, scheduled, published, archived
  publishedAt: string;
  viewCount: number;
  tags: string;
  categoryId: string | null;
  category: { id: string; name: string } | null;
  author: { id: string; name: string; email: string } | null;
  _count: { comments: number };
};

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { posts: number };
};

type Comment = {
  id: string;
  name: string;
  email: string;
  content: string;
  status: string; // pending, approved, rejected, spam
  createdAt: string;
  postId: string;
  post: { id: string; title: string; slug: string };
  parentId: string | null;
  parent: { id: string; name: string; content: string } | null;
};

export default function BlogAdminPage({ defaultTab = 'posts' }: { defaultTab?: 'posts' | 'categories' | 'comments' | 'calendar' }) {
  // Navigation / Tabs State
  const [activeTab, setActiveTab] = useState<'posts' | 'categories' | 'comments' | 'calendar'>(defaultTab);

  // Loading States
  const [postsLoading, setPostsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [commentsLoading, setCommentsLoading] = useState(true);

  // Data States
  const [posts, setPosts] = useState<Post[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState({ pending: 0, total: 0 });

  // Blog Posts Filter States
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Blog Categories Form & Action States
  const [catName, setCatName] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catDescription, setCatDescription] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [catSaving, setCatSaving] = useState(false);

  // Blog Comments Filter & Reply States
  const [commentSearch, setCommentSearch] = useState('');
  const [commentStatusFilter, setCommentStatusFilter] = useState('all');
  const [replyingComment, setReplyingComment] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [submittingReply, setSubmittingReply] = useState(false);
  const [generatingAiId, setGeneratingAiId] = useState<string | null>(null);

  // AI Assistant State
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [controlStage, setControlStage] = useState(0);

  const AI_STAGES = [
    'تحلیل درخواست و موضوع',
    'طراحی ساختار و سئوی مقاله',
    'نگارش مقدمه (ضدّکلیشه)',
    'نگارش بدنه و تکمیل کامل مقاله',
    'نهایی‌سازی و ذخیره',
  ];

  useEffect(() => {
    fetchAllData();
  }, []);

  // Drives the staged progress indicator while the AI assistant is working.
  useEffect(() => {
    if (!controlling) {
      setControlStage(0);
      return;
    }
    setControlStage(0);
    const id = setInterval(() => {
      setControlStage((s) => Math.min(s + 1, AI_STAGES.length - 1));
    }, 7000);
    return () => clearInterval(id);
  }, [controlling]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get('aiPrompt');
      if (promptParam) {
        setPromptInput(promptParam);
        setTimeout(() => {
          document.getElementById('ai-assistant-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 500);
      }
    }
  }, []);

  const fetchAllData = async () => {
    await Promise.all([
      fetchPosts(),
      fetchCategories(),
      fetchComments()
    ]);
  };

  const fetchPosts = async () => {
    setPostsLoading(true);
    try {
      const res = await fetch('/api/admin/blog/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts || []);
      }
    } catch (error) {
      console.error('[ERROR] [BlogAdminFetchPosts]:', error);
    } finally {
      setPostsLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const res = await fetch('/api/admin/blog/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('[ERROR] [BlogAdminFetchCategories]:', error);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchComments = async () => {
    setCommentsLoading(true);
    try {
      const res = await fetch('/api/admin/blog/comments');
      if (res.ok) {
        const data = await res.json();
        const allComments = data.comments || [];
        setComments(allComments);
        
        const pending = allComments.filter((c: any) => c.status === 'pending').length;
        setCommentsCount({
          pending,
          total: allComments.length
        });
      }
    } catch (error) {
      console.error('[ERROR] [BlogAdminFetchComments]:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  // AI Assistant Controller
  const handleApplyAiControl = async () => {
    if (!promptInput.trim() || controlling) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/admin/blog/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند مقالات رخ داد.');
      }

      if (data.success) {
        // Apply Frontend Filter or View Tab changes if returned by AI
        if (data.tab) {
          setActiveTab(data.tab);
        }

        if (data.filter) {
          if (data.tab === 'comments') {
            setCommentSearch(data.filter.search || '');
            setCommentStatusFilter(data.filter.status || 'all');
          } else {
            setSearch(data.filter.search || '');
            setStatusFilter(data.filter.status || 'all');
            setCategoryFilter(data.filter.categoryId || 'all');
          }
        }

        // DB Operations confirmation flow
        if (data.requireConfirmation) {
          const userConfirmed = confirm(`دستیار هوشمند پیشنهاد می‌کند تغییرات زیر اعمال شود:\n\n${data.explanation}\n\nآیا با اعمال این تغییرات موافقت می‌کنید؟`);
          if (userConfirmed) {
            setControlling(true);
            setSaveStatus('saving');
            const confirmRes = await fetch('/api/admin/blog/ai-control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                confirmed: true,
                operations: data.operations,
                explanation: data.explanation,
              }),
            });

            const confirmData = await confirmRes.json();
            if (!confirmRes.ok) {
              throw new Error(confirmData.error || 'خطایی در ثبت نهایی تغییرات رخ داد.');
            }
            if (confirmData.success) {
              setControlSuccessMessage(confirmData.explanation || 'تغییرات با موفقیت اعمال شد.');
              setSaveStatus('saved');
              setTimeout(() => setSaveStatus('idle'), 5000);
              setPromptInput('');
              await fetchAllData();
            } else {
              setControlError(confirmData.explanation || 'ثبت نهایی تغییرات ناموفق بود.');
              setSaveStatus('error');
            }
          } else {
            setSaveStatus('idle');
          }
        } else {
          setControlSuccessMessage(data.explanation || 'تغییرات با موفقیت توسط هوش مصنوعی اعمال شد.');
          setSaveStatus('saved');
          setTimeout(() => setSaveStatus('idle'), 5000);
          setPromptInput('');
          await fetchAllData();
        }
      } else {
        setControlError(data.explanation || 'هوش مصنوعی نتوانست دستور را به درستی پردازش کند.');
        setSaveStatus('error');
      }
    } catch (err: any) {
      console.error(err);
      setControlError(err.message || 'ارتباط با سرور برقرار نشد.');
      setSaveStatus('error');
    } finally {
      setControlling(false);
    }
  };

  // Blog Posts Handlers
  const handleDeletePost = async (id: string) => {
    if (!confirm('آیا از حذف این پست اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/blog/posts/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setPosts(posts.filter(p => p.id !== id));
        alert('پست با موفقیت حذف شد.');
      } else {
        alert('حذف پست با خطا مواجه شد.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogAdminDeletePost]:', error);
      alert('خطا در برقراری ارتباط با سرور.');
    }
  };

  const handleDuplicatePost = async (post: Post) => {
    if (!confirm(`آیا می‌خواهید از پست "${post.title}" یک کپی تهیه کنید؟`)) return;

    try {
      const getRes = await fetch(`/api/admin/blog/posts/${post.id}`);
      if (!getRes.ok) throw new Error('Failed to fetch post details');
      
      const { post: fullPost } = await getRes.json();

      const res = await fetch('/api/admin/blog/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${fullPost.title} (کپی)`,
          slug: `${fullPost.slug}-copy-${Math.floor(Math.random() * 1000)}`,
          content: fullPost.content,
          summary: fullPost.summary,
          featuredImage: fullPost.featuredImage,
          status: 'draft',
          categoryId: fullPost.categoryId,
          tags: JSON.parse(fullPost.tags || '[]'),
          seoTitle: fullPost.seoTitle,
          seoDescription: fullPost.seoDescription,
          seoSlug: fullPost.seoSlug,
          ogImage: fullPost.ogImage,
          allowComments: fullPost.allowComments,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setPosts([data.post, ...posts]);
        alert('پست با موفقیت کپی شد (در وضعیت پیش‌نویس).');
      } else {
        const errData = await res.json();
        alert(errData.error || 'کپی پست با خطا مواجه شد.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogAdminDuplicatePost]:', error);
      alert('خطا در برقراری ارتباط با سرور.');
    }
  };

  // Categories Handlers
  const handleCatSlugBlur = () => {
    if (!catSlug && catName) {
      setCatSlug(
        catName
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '-')
          .replace(/[^\w\u0600-\u06FF-]/g, '')
      );
    }
  };

  const handleSaveCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim() || !catSlug.trim()) {
      alert('وارد کردن نام و اسلاگ الزامی است.');
      return;
    }

    setCatSaving(true);
    try {
      const method = editingCategoryId ? 'PUT' : 'POST';
      const url = editingCategoryId 
        ? `/api/admin/blog/categories/${editingCategoryId}`
        : '/api/admin/blog/categories';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: catName.trim(),
          slug: catSlug.trim().toLowerCase(),
          description: catDescription.trim() || null
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (editingCategoryId) {
          setCategories(categories.map(c => c.id === editingCategoryId ? data.category : c));
          alert('دسته‌بندی با موفقیت ویرایش شد.');
        } else {
          setCategories([data.category, ...categories]);
          alert('دسته‌بندی جدید با موفقیت ایجاد شد.');
        }
        resetCategoryForm();
      } else {
        const errData = await res.json();
        alert(errData.error || 'عملیات با خطا مواجه شد.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogCategorySubmit]:', error);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setCatSaving(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCatName(category.name);
    setCatSlug(category.slug);
    setCatDescription(category.description || '');
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('آیا مطمئن هستید که می‌خواهید این دسته‌بندی را حذف کنید؟ پست‌های مرتبط بدون دسته‌بندی خواهند شد.')) return;

    try {
      const res = await fetch(`/api/admin/blog/categories/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCategories(categories.filter(c => c.id !== id));
        // Refresh posts as their categoryId might have been updated to null
        await fetchPosts();
        alert('دسته‌بندی با موفقیت حذف شد.');
      } else {
        alert('حذف دسته‌بندی با خطا مواجه شد.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogCategoryDelete]:', error);
      alert('خطا در ارتباط با سرور.');
    }
  };

  const resetCategoryForm = () => {
    setEditingCategoryId(null);
    setCatName('');
    setCatSlug('');
    setCatDescription('');
  };

  // Comments Handlers
  const handleCommentStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/admin/blog/comments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        const data = await res.json();
        setComments(comments.map(c => c.id === id ? { ...c, status: data.comment.status } : c));
        // Recalculate stats
        const pending = comments.filter((c: any) => c.id === id ? data.comment.status === 'pending' : c.status === 'pending').length;
        setCommentsCount(prev => ({ ...prev, pending }));
        alert('وضعیت نظر با موفقیت بروزرسانی شد.');
      } else {
        alert('خطا در تغییر وضعیت نظر.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogCommentUpdateStatus]:', error);
      alert('خطا در ارتباط با سرور.');
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm('آیا از حذف این نظر اطمینان دارید؟')) return;

    try {
      const res = await fetch(`/api/admin/blog/comments/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        const remainingComments = comments.filter(c => c.id !== id);
        setComments(remainingComments);
        const pending = remainingComments.filter((c: any) => c.status === 'pending').length;
        setCommentsCount({
          pending,
          total: remainingComments.length
        });
        alert('نظر با موفقیت حذف شد.');
      } else {
        alert('حذف نظر با خطا مواجه شد.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogCommentDelete]:', error);
      alert('خطا در ارتباط با سرور.');
    }
  };

  const handleGenerateAiReply = async (comment: Comment) => {
    setGeneratingAiId(comment.id);
    try {
      const res = await fetch('/api/admin/blog/comments/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId: comment.id })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.response) {
          setReplyingComment(comment);
          setReplyContent(data.response);
        } else {
          alert('خطا در تولید پاسخ هوشمند: ' + (data.error || 'پاسخ نامعتبر'));
        }
      } else {
        const data = await res.json();
        alert('خطا در ارتباط با سرور یا هوش مصنوعی: ' + (data.error || 'خطای ناشناخته'));
      }
    } catch (error) {
      console.error('[ERROR] [BlogCommentAiGenerate]:', error);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setGeneratingAiId(null);
    }
  };

  const handleReplyCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyingComment || !replyContent.trim()) return;

    setSubmittingReply(true);
    try {
      const res = await fetch('/api/admin/blog/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: replyingComment.postId,
          parentId: replyingComment.id,
          content: replyContent.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        
        let updatedComments = comments;
        if (replyingComment.status !== 'approved') {
          await fetch(`/api/admin/blog/comments/${replyingComment.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'approved' })
          });
          updatedComments = comments.map(c => c.id === replyingComment.id ? { ...c, status: 'approved' } : c);
        }

        setComments([
          {
            ...data.comment,
            post: replyingComment.post,
            parent: { id: replyingComment.id, name: replyingComment.name, content: replyingComment.content }
          },
          ...updatedComments
        ]);

        const pending = updatedComments.filter((c: any) => c.status === 'pending').length;
        setCommentsCount({
          pending,
          total: updatedComments.length + 1
        });

        alert('پاسخ شما با موفقیت ثبت و منتشر شد.');
        setReplyingComment(null);
        setReplyContent('');
      } else {
        alert('ثبت پاسخ با خطا مواجه شد.');
      }
    } catch (error) {
      console.error('[ERROR] [BlogCommentReply]:', error);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setSubmittingReply(false);
    }
  };

  // Filtering Logic
  const filteredPosts = posts.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase()) || 
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || p.categoryId === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const filteredComments = comments.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(commentSearch.toLowerCase()) || 
      c.email.toLowerCase().includes(commentSearch.toLowerCase()) || 
      c.content.toLowerCase().includes(commentSearch.toLowerCase());
    const matchesStatus = commentStatusFilter === 'all' || c.status === commentStatusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Presentation Helpers
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'published':
        return (
          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-500">
            انتشار یافته
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500">
            پیش‌نویس
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-500">
            زمان‌بندی شده
          </span>
        );
      case 'archived':
        return (
          <span className="inline-flex items-center px-2.5 py-1.5 rounded-full text-xs font-bold bg-slate-500/10 text-slate-500">
            بایگانی شده
          </span>
        );
      default:
        return null;
    }
  };

  const getCommentStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
            تایید شده
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 animate-pulse">
            در انتظار تایید
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">
            رد شده
          </span>
        );
      case 'spam':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-500/10 text-slate-500">
            اسپم
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    });
  };

  const formatNum = (num: number) => {
    return num.toLocaleString('fa-IR');
  };

  const totalViews = posts.reduce((sum, p) => sum + p.viewCount, 0);
  const totalPostsCount = posts.length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 select-none pb-12" dir="rtl">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/[0.07] via-indigo-600/[0.03] to-transparent dark:from-blue-500/10 dark:via-indigo-500/5 dark:to-transparent rounded-3xl p-6 border border-blue-500/10 dark:border-blue-500/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-blue-500" />
            مرکز مدیریت وبلاگ
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-bold">بستر هوشمند مدیریت مقالات، موضوعات، نظرات و سئوی محتوای وبلاگ فروشگاه</p>
        </div>
        <Link 
          href="/admin/blog/new"
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 duration-300"
        >
          <Plus className="w-4 h-4" />
          ایجاد پست جدید
        </Link>
      </div>

      {/* Advanced AI Assistant */}
      <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-indigo-600 text-white">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-white">دستیار هوشمند وبلاگ (کنترل با پرامپت)</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
              با نوشتن یک دستور صوتی یا متنی، به مقالات، دسته‌بندی‌ها و نظرات دسترسی داشته باشید؛ مقالات و دسته‌بندی جدید ایجاد کنید، فیلتر کنید یا نظرات را تایید/حذف کنید!
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="مثال: نظر علی را تایید کن، دسته‌بندی با نام سلامت بساز، یا مقاله‌های پیش‌نویس را فیلتر کن..."
              className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-slate-950 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-bold text-slate-800 dark:text-white placeholder:text-gray-450 dark:placeholder:text-gray-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleApplyAiControl();
                }
              }}
              disabled={controlling}
            />
            <button
              type="button"
              disabled={controlling || !promptInput.trim()}
              onClick={handleApplyAiControl}
              data-testid="save-status"
              data-status-state={saveStatus}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {controlling ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال پردازش...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  اعمال دستور
                </>
              )}
            </button>
          </div>

          {controlling && (
            <div className="bg-white/70 dark:bg-slate-900/40 border border-purple-100 dark:border-purple-900/30 rounded-2xl p-3.5 space-y-2 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-[10px] font-bold text-purple-700 dark:text-purple-300">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  {AI_STAGES[controlStage]}
                </span>
                <span>{Math.round(((controlStage + 1) / AI_STAGES.length) * 100)}٪</span>
              </div>
              <div className="h-1.5 w-full bg-purple-100 dark:bg-purple-900/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${((controlStage + 1) / AI_STAGES.length) * 100}%` }}
                />
              </div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
                مقاله به‌صورت مرحله‌ای و کامل تولید می‌شود تا از تولید ناقص یا کلیشه‌ای جلوگیری شود؛ این فرایند ممکن است تا حدود یک دقیقه طول بکشد.
              </p>
            </div>
          )}

          {/* Suggestions list */}
          <div className="flex flex-wrap gap-1.5 pt-1.5">
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold self-center ml-1">پیشنهادها:</span>
            {[
              'یک مقاله جدید به نام «تغذیه سالم در تابستان» در دسته‌بندی سلامت ایجاد کن',
              'دسته‌بندی جدیدی به نام «مد و پوشاک» با اسلاگ fashion اضافه کن',
              'فقط نظرات در انتظار تایید را فیلتر کن',
              'دسته‌بندی‌های بدون استفاده را حذف کن',
              'تمام نظرات هرزنامه یا اسپم را حذف کن'
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromptInput(sug)}
                className="text-[10px] bg-white hover:bg-purple-50 dark:bg-slate-900 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold"
              >
                {sug}
              </button>
            ))}
          </div>

          {controlError && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{controlError}</span>
            </div>
          )}

          {controlSuccessMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-2xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{controlSuccessMessage}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-2xl">
            <FileText className="w-6 h-6 text-blue-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">تعداد کل پست‌ها</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {formatNum(totalPostsCount)} <span className="text-xs font-medium text-slate-400">پست</span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl">
            <TrendingUp className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">بازدید کل پست‌ها</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {formatNum(totalViews)} <span className="text-xs font-medium text-slate-400">بازدید</span>
            </h3>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/10 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">نظرات در انتظار تایید</p>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
              {formatNum(commentsCount.pending)} <span className="text-xs font-medium text-slate-400">نظر</span>
            </h3>
          </div>
        </div>
      </div>

      {/* Unified Tab Switcher */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        {[
          { id: 'posts', label: 'مقالات و نوشته‌ها', count: posts.length, icon: FileText },
          { id: 'calendar', label: 'تقویم محتوایی', count: 0, icon: CalendarDays },
          { id: 'categories', label: 'دسته‌بندی‌ها', count: categories.length, icon: Tags },
          { id: 'comments', label: 'نظرات کاربران', count: comments.length, badge: commentsCount.pending, icon: MessageSquare }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 font-black text-xs transition-all outline-none ${
                isActive 
                  ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500 text-white animate-pulse">
                  {formatNum(tab.badge)}
                </span>
              ) : tab.count > 0 ? (
                <span className="px-1.5 py-0.5 rounded-md text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-400 font-normal">
                  {formatNum(tab.count)}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tabs Contents */}

      {/* Content Calendar Tab */}
      {activeTab === 'calendar' && (
        <ContentCalendarTab />
      )}

      {/* 1. Blog Posts Tab */}
      {activeTab === 'posts' && (
        <div className="space-y-6">
          {/* Filters & Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-150/80 dark:border-slate-800/80 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
              {/* Search Box */}
              <div className="relative w-full md:w-80">
                <input 
                  type="text" 
                  placeholder="جستجو در عنوان یا اسلاگ..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>

              {/* Filter Dropdowns */}
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                {/* Status Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl text-xs font-bold">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 font-bold text-xs"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="published">انتشار یافته</option>
                    <option value="draft">پیش‌نویس</option>
                    <option value="scheduled">زمان‌بندی شده</option>
                    <option value="archived">بایگانی شده</option>
                  </select>
                </div>

                {/* Category Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl text-xs font-bold">
                  <Filter className="w-3.5 h-3.5 text-slate-400" />
                  <select 
                    value={categoryFilter} 
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 font-bold text-xs"
                  >
                    <option value="all">همه دسته‌بندی‌ها</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Posts Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {postsLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                درحال بارگذاری پست‌ها...
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">هیچ پستی یافت نشد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/[0.5] dark:bg-slate-800/[0.2]">
                      <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400">عنوان و نویسنده</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400">دسته‌بندی</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400">تاریخ انتشار</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400">وضعیت</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 text-center">بازدید / نظرات</th>
                      <th className="px-6 py-4 text-xs font-black text-slate-500 dark:text-slate-400 text-left">عملیات سریع</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {filteredPosts.map((post) => (
                      <tr key={post.id} className="hover:bg-slate-50/[0.4] dark:hover:bg-slate-800/[0.1] transition-all">
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 dark:text-white font-black text-sm">{post.title}</span>
                            <span className="text-[10px] text-slate-400 font-medium">نویسنده: {post.author?.name || (post as any).authorName || 'سیستم'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg text-[11px]">
                            {post.category?.name || 'بدون دسته‌بندی'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400">
                          {formatDate(post.publishedAt)}
                        </td>
                        <td className="px-6 py-4">
                          {getStatusBadge(post.status)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-4 text-slate-400 font-bold">
                            <span className="flex items-center gap-1.5" title="تعداد بازدید">
                              <Eye className="w-3.5 h-3.5" />
                              {formatNum(post.viewCount)}
                            </span>
                            <span className="flex items-center gap-1.5" title="تعداد نظرات">
                              <MessageSquare className="w-3.5 h-3.5" />
                              {formatNum(post._count?.comments || 0)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-left">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Preview */}
                            <a 
                              href={`/blog/${post.slug}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-500 hover:text-blue-600 rounded-xl transition-all"
                              title="پیش‌نمایش در سایت"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>

                            {/* Duplicate */}
                            <button 
                              onClick={() => handleDuplicatePost(post)}
                              className="p-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-500 hover:text-purple-600 rounded-xl transition-all"
                              title="کپی کردن پست"
                            >
                              <Copy className="w-4 h-4" />
                            </button>

                            {/* Edit */}
                            <Link 
                              href={`/admin/blog/${post.id}/edit`}
                              className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-500 hover:text-amber-600 rounded-xl transition-all"
                              title="ویرایش"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            {/* Delete */}
                            <button 
                              onClick={() => handleDeletePost(post.id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 rounded-xl transition-all"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* 2. Blog Categories Tab */}
      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Categories Form Column */}
          <div className="lg:col-span-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm h-fit">
            <h2 className="text-sm font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              {editingCategoryId ? <Edit className="w-4 h-4 text-amber-500" /> : <Plus className="w-4 h-4 text-blue-500" />}
              {editingCategoryId ? 'ویرایش دسته‌بندی' : 'ایجاد دسته‌بندی جدید'}
            </h2>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-4 text-xs font-bold">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">نام دسته‌بندی <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  onBlur={handleCatSlugBlur}
                  placeholder="مثلاً: تکنولوژی، آموزش طراحی"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">اسلاگ (Slug - انگلیسی یا فارسی) <span className="text-rose-500">*</span></label>
                <input 
                  type="text"
                  required
                  value={catSlug}
                  onChange={(e) => setCatSlug(e.target.value)}
                  placeholder="مثلاً: technology"
                  className="w-full text-left px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
                  dir="ltr"
                />
                <span className="text-[10px] text-slate-400 block font-medium">اسلاگ برای آدرس اینترنتی (URL) دسته‌بندی استفاده می‌شود.</span>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-slate-500 dark:text-slate-400">توضیحات (اختیاری)</label>
                <textarea 
                  value={catDescription}
                  onChange={(e) => setCatDescription(e.target.value)}
                  placeholder="توضیح کوتاهی درباره موضوعات این دسته‌بندی..."
                  rows={4}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={catSaving}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-2xl text-xs font-bold transition-all shadow-md duration-300 ${
                    editingCategoryId 
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                  }`}
                >
                  <Save className="w-4 h-4" />
                  {catSaving ? 'در حال ذخیره...' : editingCategoryId ? 'بروزرسانی تغییرات' : 'ایجاد دسته‌بندی'}
                </button>
                
                {editingCategoryId && (
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 rounded-2xl text-xs font-bold transition-all duration-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Categories List Column */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h2 className="text-sm font-black text-slate-800 dark:text-white mb-4">لیست دسته‌بندی‌ها</h2>

            {categoriesLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                در حال بارگذاری دسته‌بندی‌ها...
              </div>
            ) : categories.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">هیچ دسته‌بندی یافت نشد. اولین دسته‌بندی را ایجاد کنید.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/[0.5] dark:bg-slate-800/[0.2]">
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400">نام دسته‌بندی</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400">اسلاگ</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400 text-center">تعداد پست‌ها</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400 text-left">عملیات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {categories.map((cat) => (
                      <tr key={cat.id} className="hover:bg-slate-50/[0.4] dark:hover:bg-slate-800/[0.1] transition-all">
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 dark:text-white font-black text-sm">{cat.name}</span>
                            {cat.description && (
                              <span className="text-[10px] text-slate-400 font-medium line-clamp-1 max-w-xs">{cat.description}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-mono text-slate-500 dark:text-slate-400 text-left" dir="ltr">
                          {cat.slug}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                            <FileText className="w-3.5 h-3.5" />
                            {formatNum(cat._count?.posts || 0)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-left">
                          <div className="flex justify-end items-center gap-1.5">
                            {/* Edit */}
                            <button 
                              onClick={() => handleEditCategory(cat)}
                              className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-500 hover:text-amber-600 rounded-xl transition-all"
                              title="ویرایش"
                            >
                              <Edit className="w-4 h-4" />
                            </button>

                            {/* Delete */}
                            <button 
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 rounded-xl transition-all"
                              title="حذف"
                            >
                              <Trash2 className="w-4 h-4" />
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
      )}

      {/* 3. Blog Comments Tab */}
      {activeTab === 'comments' && (
        <div className="space-y-6">
          {/* Comments Filters and Search */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
            {/* Search */}
            <div className="relative w-full md:w-80">
              <input 
                type="text" 
                placeholder="جستجو در دیدگاه‌ها..."
                value={commentSearch}
                onChange={(e) => setCommentSearch(e.target.value)}
                className="w-full pl-4 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Filters */}
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl text-xs font-bold w-full md:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select 
                  value={commentStatusFilter} 
                  onChange={(e) => setCommentStatusFilter(e.target.value)}
                  className="bg-transparent border-none outline-none text-slate-600 dark:text-slate-300 font-bold text-xs w-full"
                >
                  <option value="all">همه دیدگاه‌ها</option>
                  <option value="pending">در انتظار تایید</option>
                  <option value="approved">تایید شده</option>
                  <option value="rejected">رد شده</option>
                  <option value="spam">اسپم</option>
                </select>
              </div>
            </div>
          </div>

          {/* Comments List Table */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
            {commentsLoading ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                در حال بارگذاری نظرات...
              </div>
            ) : filteredComments.length === 0 ? (
              <div className="p-12 text-center text-xs font-bold text-slate-400">هیچ دیدگاهی یافت نشد.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/[0.5] dark:bg-slate-800/[0.2]">
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400">کاربر</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400">دیدگاه</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400">مربوط به مقاله</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400 text-center">وضعیت</th>
                      <th className="px-5 py-4 text-xs font-black text-slate-500 dark:text-slate-400 text-left">عملیات مدیریت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {filteredComments.map((comment) => (
                      <tr key={comment.id} className="hover:bg-slate-50/[0.4] dark:hover:bg-slate-800/[0.1] transition-all">
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-slate-800 dark:text-white font-black text-sm">{comment.name}</span>
                            <span className="text-[10px] text-slate-400 font-medium">{comment.email}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 max-w-sm">
                          <div className="space-y-1">
                            <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold break-all text-justify" dangerouslySetInnerHTML={{ __html: comment.content }} />
                            {comment.parent && (
                              <div className="text-[10px] bg-slate-50 dark:bg-slate-800/40 p-2 rounded-xl text-slate-500 border-r-2 border-slate-300">
                                در پاسخ به <strong className="text-slate-600 dark:text-slate-400">{comment.parent.name}</strong>: {comment.parent.content}
                              </div>
                            )}
                            <span className="text-[9px] text-slate-400 font-medium block">{formatDateTime(comment.createdAt)}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <a 
                            href={`/blog/${comment.post?.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                          >
                            {comment.post?.title || 'مقاله پیدا نشد'}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {getCommentStatusBadge(comment.status)}
                        </td>
                        <td className="px-5 py-4 text-left">
                          <div className="flex justify-end items-center gap-1">
                            {/* Approve */}
                            {comment.status !== 'approved' && (
                              <button 
                                onClick={() => handleCommentStatusUpdate(comment.id, 'approved')}
                                className="p-2 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-emerald-500 hover:text-emerald-600 rounded-xl transition-all"
                                title="تایید دیدگاه"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}

                            {/* Reply */}
                            <button 
                              onClick={() => {
                                setReplyingComment(comment);
                                setReplyContent('');
                              }}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 text-blue-500 hover:text-blue-600 rounded-xl transition-all"
                              title="پاسخ"
                            >
                              <Reply className="w-4 h-4" />
                            </button>

                            {/* AI Reply */}
                            <button 
                              disabled={generatingAiId === comment.id}
                              onClick={() => handleGenerateAiReply(comment)}
                              className="p-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 text-purple-500 hover:text-purple-600 rounded-xl transition-all disabled:opacity-50"
                              title="پاسخ هوشمند با AI"
                            >
                              {generatingAiId === comment.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                              ) : (
                                <Sparkles className="w-4 h-4 text-purple-500" />
                              )}
                            </button>

                            {/* Reject / Spammer */}
                            {comment.status !== 'rejected' && comment.status !== 'spam' && (
                              <>
                                <button 
                                  onClick={() => handleCommentStatusUpdate(comment.id, 'rejected')}
                                  className="p-2 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-500 hover:text-amber-600 rounded-xl transition-all"
                                  title="رد دیدگاه"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => handleCommentStatusUpdate(comment.id, 'spam')}
                                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 rounded-xl transition-all"
                                  title="علامت‌گذاری به عنوان هرزنامه"
                                >
                                  <AlertOctagon className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Delete */}
                            <button 
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 hover:text-rose-600 rounded-xl transition-all"
                              title="حذف دیدگاه"
                            >
                              <Trash2 className="w-4 h-4" />
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

          {/* Reply Modal */}
          {replyingComment && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200" dir="rtl">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                  <h3 className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2">
                    <Reply className="w-4 h-4 text-blue-500" />
                    پاسخ به دیدگاه {replyingComment.name}
                  </h3>
                  <button onClick={() => setReplyingComment(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <form onSubmit={handleReplyCommentSubmit} className="p-6 space-y-4 text-xs font-bold">
                  {/* Original Comment Preview */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border-r-4 border-blue-500 space-y-1">
                    <p className="text-[10px] text-slate-400 font-medium">دیدگاه اصلی:</p>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-semibold" dangerouslySetInnerHTML={{ __html: replyingComment.content }} />
                  </div>

                  {/* Reply Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <label className="text-slate-500 dark:text-slate-400">متن پاسخ شما <span className="text-rose-500">*</span></label>
                      <button
                        type="button"
                        disabled={generatingAiId === replyingComment.id}
                        onClick={() => handleGenerateAiReply(replyingComment)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg transition-all text-[10px] font-bold"
                      >
                        {generatingAiId === replyingComment.id ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            در حال تولید پاسخ...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            پاسخ هوشمند با AI
                          </>
                        )}
                      </button>
                    </div>
                    <textarea 
                      required
                      rows={5}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="پاسخ خود را اینجا بنویسید (به عنوان مدیر سایت منتشر خواهد شد)..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/25 transition-all resize-none"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setReplyingComment(null)}
                      className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-500 rounded-2xl text-xs font-bold transition-all"
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReply}
                      className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-blue-500/20"
                    >
                      {submittingReply ? 'در حال ارسال...' : 'ارسال پاسخ'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
