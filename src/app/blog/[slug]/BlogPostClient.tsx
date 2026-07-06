'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  User, 
  Clock, 
  Eye, 
  MessageSquare, 
  BookOpen, 
  Share2, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Mail, 
  Menu, 
  Check, 
  Copy,
  ArrowRight,
  CornerDownLeft,
  FileText,
  HelpCircle
} from 'lucide-react';
import TableOfContents from '@/components/blog/TableOfContents';
import BlogFallbackImage from '@/components/blog/BlogFallbackImage';

function FaqItem({ question, answer, index }: { question: string; answer: string; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      itemScope 
      itemProp="mainEntity" 
      itemType="https://schema.org/Question"
      className="border border-indigo-100/50 dark:border-indigo-950/20 rounded-2xl overflow-hidden transition-all duration-300 bg-gradient-to-br from-indigo-50/[0.1] to-transparent dark:from-indigo-950/[0.05] hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/30"
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-4 flex items-center justify-between text-right font-black text-slate-800 dark:text-slate-100 hover:bg-indigo-50/10 dark:hover:bg-indigo-950/5 transition-colors text-xs sm:text-sm select-none"
      >
        <span className="text-right flex-1 flex items-center gap-2.5">
          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center font-bold text-[10px] sm:text-xs">
            {index + 1}
          </span>
          <span itemProp="name" className="leading-snug">{question}</span>
        </span>
        <span className={`transition-transform duration-300 transform flex-shrink-0 mr-4 text-indigo-500 font-bold text-[10px] ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          ▼
        </span>
      </button>
      <div 
        itemScope 
        itemProp="acceptedAnswer" 
        itemType="https://schema.org/Answer"
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-[500px] opacity-100 border-t border-indigo-50/50 dark:border-indigo-950/10' : 'max-h-0 opacity-0'}`}
      >
        <div itemProp="text" className="px-5 py-4 text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-400 font-medium whitespace-pre-wrap select-text selection:bg-indigo-500 selection:text-white">
          {answer}
        </div>
      </div>
    </div>
  );
}

interface PostDetails {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string | null;
  featuredImage: string | null;
  publishedAt: string;
  viewCount: number;
  tags: string;
  faqs?: string;
  allowComments: boolean;
  category: { name: string; slug: string } | null;
  author: { name: string; avatarUrl: string | null } | null;
}

interface Comment {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  parentId: string | null;
  parent?: { name: string } | null;
}

interface ProductListItem {
  id: string;
  title: string;
  price: number;
  discount: number;
  imageUrl: string | null;
  stock: number;
  brand?: string | null;
}

interface BlogPostClientProps {
  slug: string;
  initialData?: {
    post: PostDetails;
    comments: Comment[];
    relatedPosts: any[];
    relatedProducts?: ProductListItem[];
    navigation: { prevPost: any; nextPost: any };
  } | null;
}

export default function BlogPostClient({ slug, initialData }: BlogPostClientProps) {
  const [data, setData] = useState<{
    post: PostDetails;
    comments: Comment[];
    relatedPosts: any[];
    relatedProducts?: ProductListItem[];
    navigation: { prevPost: any; nextPost: any };
  } | null>(initialData || null);

  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Comment Form States
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyToName, setReplyToName] = useState<string | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState('');

  const contentRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [progressBarTop, setProgressBarTop] = useState(64);

  // Newsletter Form State
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);
  const [submittingNewsletter, setSubmittingNewsletter] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Dynamically calculate the bottom of the header to attach the progress bar perfectly
      const header = document.querySelector('header');
      if (header) {
        const headerRect = header.getBoundingClientRect();
        setProgressBarTop(headerRect.bottom);
      }

      if (!contentRef.current) return;
      
      const element = contentRef.current;
      const rect = element.getBoundingClientRect();
      const elementHeight = rect.height;
      const elementTop = rect.top + window.scrollY;
      const viewportHeight = window.innerHeight;
      const scrollTop = window.scrollY;
      
      // Start filling when the top of the article is near the top of the viewport
      const start = elementTop - 100; 
      // Fully filled when the bottom of the article reaches the bottom of the viewport
      const end = elementTop + elementHeight - viewportHeight;
      const totalScrollable = end - start;

      if (totalScrollable <= 0) {
        const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
        if (totalHeight > 0) {
          setScrollProgress((window.scrollY / totalHeight) * 100);
        } else {
          setScrollProgress(0);
        }
        return;
      }
      
      if (scrollTop < start) {
        setScrollProgress(0);
      } else if (scrollTop > end) {
        setScrollProgress(100);
      } else {
        const progress = ((scrollTop - start) / totalScrollable) * 100;
        setScrollProgress(Math.min(100, Math.max(0, progress)));
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('resize', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [data]);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setLoading(false);
    } else {
      fetchPostData();
    }
    fetchUserProfile();
  }, [slug, initialData]);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch('/api/profile');
      if (res.ok) {
        const payload = await res.json();
        if (payload && payload.user) {
          setCurrentUser(payload.user);
          setCommentName(payload.user.name || '');
          setCommentEmail(payload.user.email || '');
        }
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchPostData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/blog/${slug}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      } else {
        setError('مقاله مورد نظر پیدا نشد.');
      }
    } catch (err) {
      console.error('Error fetching blog post:', err);
      setError('خطا در بارگذاری اطلاعات مقاله.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard.writeText(shareUrl || window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentName.trim() || !commentContent.trim()) {
      alert('لطفا نام و متن نظر خود را وارد کنید.');
      return;
    }

    setSubmittingComment(true);
    setCommentSuccess('');
    try {
      const res = await fetch(`/api/blog/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: commentName.trim(),
          email: commentEmail.trim() || undefined,
          content: commentContent.trim(),
          parentId: replyToId
        })
      });

      if (res.ok) {
        const payload = await res.json();
        setCommentSuccess(payload.message || 'دیدگاه شما با موفقیت ثبت شد و پس از تایید نمایش داده می‌شود.');
        setCommentName('');
        setCommentEmail('');
        setCommentContent('');
        setReplyToId(null);
        setReplyToName(null);
      } else {
        const err = await res.json();
        alert(err.error || 'خطا در ثبت نظر.');
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;

    setSubmittingNewsletter(true);
    setTimeout(() => {
      setNewsletterSubscribed(true);
      setNewsletterEmail('');
      setSubmittingNewsletter(false);
    }, 1000);
  };

  // Estimate Reading Time (180 words per minute average)
  const calculateReadingTime = (htmlContent: string) => {
    const text = htmlContent.replace(/<[^>]*>/g, '');
    const wordCount = text.trim().split(/\s+/).length;
    const time = Math.max(1, Math.ceil(wordCount / 180));
    return `${time} دقیقه`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatNum = (num?: number | null) => {
    if (num === undefined || num === null || isNaN(Number(num))) return '۰';
    return Number(num).toLocaleString('fa-IR');
  };

  if (loading) {
    return <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-12 text-center text-xs font-bold text-gray-400">در حال بارگذاری مقاله...</div>;
  }

  if (error || !data) {
    return (
      <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-12 text-center text-xs font-bold text-rose-500">
        <p className="mb-4">{error || 'خطایی پیش آمده است.'}</p>
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-blue-500 font-black hover:underline">
          <ArrowRight className="w-4 h-4" />
          بازگشت به وبلاگ
        </Link>
      </div>
    );
  }

  const { post, comments, relatedPosts, relatedProducts = [], navigation } = data;
  const hasHeadings = /<h[23][^>]*>/i.test(post.content);
  const pageUrl = typeof window !== 'undefined' ? window.location.href : '';
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/b/${post.id}` : '';
  const pageTitle = encodeURIComponent(post.title);

  // Formatted tags list
  let tagsList: string[] = [];
  try {
    tagsList = JSON.parse(post.tags || '[]').filter((t: string) => !t.startsWith('_prod_'));
  } catch (e) {}

  // Formatted faqs list
  let faqsList: { question: string; answer: string }[] = [];
  try {
    faqsList = JSON.parse(post.faqs || '[]');
  } catch (e) {}

  return (
    <div className="space-y-8 text-right" dir="rtl">
      {/* Scroll Progress Bar */}
      <div 
        className="fixed left-0 right-0 h-[3px] bg-gray-100/30 dark:bg-gray-800/30 z-[101]"
        style={{ top: `${progressBarTop}px` }}
      >
        <div 
          className="h-full bg-gradient-to-l from-indigo-500 to-violet-500 transition-all duration-75 ease-out"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>
      
      {/* Back to Blog */}
      <div>
        <Link href="/blog" className="inline-flex items-center gap-1.5 text-xs font-black text-gray-500 hover:text-blue-500 transition-colors">
          <ArrowRight className="w-4 h-4" />
          بازگشت به وبلاگ و مطالب آموزشی
        </Link>
      </div>

      {/* Layout Container */}
      <div className={hasHeadings ? "grid grid-cols-1 lg:grid-cols-12 gap-8 items-start" : "max-w-4xl mx-auto"}>
        {/* Main Content */}
        <div className={hasHeadings ? "lg:col-span-8 space-y-8" : "space-y-8"}>
          {/* 1. Header Card */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5">
            {/* Category & Stats Meta */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              {post.category && (
                <Link 
                  href={`/blog?category=${post.category.slug}`}
                  className="bg-indigo-50/80 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100/80 border border-indigo-100/30 dark:border-indigo-900/20 px-3.5 py-1.5 rounded-xl text-[11px] font-black transition-colors"
                >
                  {post.category.name}
                </Link>
              )}

              <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  {formatDate(post.publishedAt)}
                </span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  {calculateReadingTime(post.content)} مطالعه
                </span>
                <span className="text-gray-300 dark:text-gray-700">•</span>
                <span className="flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-gray-400" />
                  {formatNum(post.viewCount)} بازدید
                </span>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-800 dark:text-white leading-snug">{post.title}</h1>

            {/* Author info & Quick Share */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
              {/* Author Card */}
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-black overflow-hidden text-gray-600 dark:text-gray-300 text-sm border border-gray-200/50 dark:border-gray-800/50">
                  {post.author?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.author.avatarUrl} alt={post.author.name} className="w-full h-full object-cover" />
                  ) : (
                    post.author?.name ? post.author.name.slice(0, 1) : 'م'
                  )}
                </div>
                <div>
                  <p className="text-xs font-black text-gray-800 dark:text-white">{post.author?.name || 'مدیر سایت'}</p>
                  <p className="text-[10px] text-gray-400 font-medium">نویسنده و تحلیل‌گر محتوای فروشگاه</p>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div className="w-full md:w-auto overflow-hidden">
                <div className="flex overflow-x-auto md:flex-wrap items-center gap-2 text-xs pb-1 md:pb-0 hide-scrollbar scroll-smooth">
                  <span className="text-[10px] text-gray-400 font-bold ml-1 flex items-center gap-1.5 flex-shrink-0">
                    <Share2 className="w-3.5 h-3.5 text-gray-400" />
                    اشتراک‌گذاری:
                  </span>
                  {/* Telegram */}
                  <a 
                    href={`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${pageTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-sky-50 dark:bg-gray-900/30 dark:hover:bg-sky-950/20 text-sky-500 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-sky-300 dark:hover:border-sky-900/40"
                    title="اشتراک در تلگرام"
                  >
                    تلگرام
                  </a>
                  {/* Eitaa */}
                  <a 
                    href={`https://eitaa.com/share/url?url=${encodeURIComponent(shareUrl)}&text=${pageTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-orange-50 dark:bg-gray-900/30 dark:hover:bg-orange-950/20 text-orange-600 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-orange-300 dark:hover:border-orange-900/40"
                    title="اشتراک در ایتا"
                  >
                    ایتا
                  </a>
                  {/* Bale */}
                  <a 
                    href={`https://bale.ai/share?url=${encodeURIComponent(shareUrl)}&text=${pageTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-green-50 dark:bg-gray-900/30 dark:hover:bg-green-950/20 text-emerald-600 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-green-300 dark:hover:border-green-900/40"
                    title="اشتراک در بله"
                  >
                    بله
                  </a>
                  {/* Rubika */}
                  <a 
                    href={`https://rubika.ir/share?text=${pageTitle}%0A${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-purple-50 dark:bg-gray-900/30 dark:hover:bg-purple-950/20 text-purple-600 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-purple-300 dark:hover:border-purple-900/40"
                    title="اشتراک در روبیکا"
                  >
                    روبیکا
                  </a>
                  {/* Soroush */}
                  <a 
                    href={`https://splus.ir/share?url=${encodeURIComponent(shareUrl)}&text=${pageTitle}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-blue-50 dark:bg-gray-900/30 dark:hover:bg-blue-950/20 text-blue-650 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-blue-300 dark:hover:border-blue-900/40"
                    title="اشتراک در سروش"
                  >
                    سروش Plus
                  </a>
                  {/* Whatsapp */}
                  <a 
                    href={`https://api.whatsapp.com/send?text=${pageTitle}%20${encodeURIComponent(shareUrl)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-emerald-50 dark:bg-gray-900/30 dark:hover:bg-emerald-950/20 text-emerald-500 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-emerald-300 dark:hover:border-emerald-900/40"
                    title="اشتراک در واتساپ"
                  >
                    واتساپ
                  </a>
                  {/* Copy Link */}
                  <button 
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-gray-50/50 hover:bg-blue-50 dark:bg-gray-900/30 dark:hover:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl transition-all font-black text-[10px] flex-shrink-0 border border-gray-200/50 dark:border-gray-800/50 hover:border-blue-300 dark:hover:border-blue-900/40 flex items-center gap-1"
                    title="کپی کردن شورت لینک"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'کپی شد' : 'کپی شورت لینک'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Featured Image Card */}
          <div className="relative aspect-[2/1] w-full rounded-2xl overflow-hidden border border-gray-100/80 dark:border-gray-800/80 bg-gray-50 dark:bg-gray-800 shadow-sm">
            {post.featuredImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={post.featuredImage} 
                alt={post.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <BlogFallbackImage title={post.title} categoryName={post.category?.name} variant="cover" />
            )}
          </div>

          {/* 3. Main Reading Card */}
          <article className="bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            
            {/* Table of Contents (ToC) - Mobile View (Collapsible Accordion) */}
            <TableOfContents contentRef={contentRef} contentHtml={post.content} mobileOnly />

            {/* Main Body HTML Content */}
            <div 
              ref={contentRef}
              className="prose dark:prose-invert max-w-[72ch] mx-auto text-[15px] sm:text-base lg:text-[17px] font-normal leading-[2.05] text-gray-800 dark:text-gray-200 space-y-5 [&_p]:tracking-[0.003em] [&_img]:max-w-full md:[&_img]:max-w-[85%] lg:[&_img]:max-w-[75%] [&_img]:h-auto [&_img]:mx-auto [&_img]:rounded-2xl [&_img]:shadow-lg [&_img]:my-8 [&_img]:border [&_img]:border-slate-100/50 dark:[&_img]:border-slate-800/80 [&_img]:object-contain [&_img]:block transition-transform duration-300 hover:[&_img]:scale-[1.01] [&_ul]:space-y-2 [&_ol]:space-y-2 [&_li]:leading-[1.9] [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:border-collapse [&_table]:my-6 [&_table]:text-[13px] [&_table]:rounded-2xl [&_th]:border [&_th]:border-gray-100 dark:[&_th]:border-gray-800 [&_th]:bg-gray-50 dark:[&_th]:bg-gray-800/50 [&_th]:p-2.5 [&_th]:text-right [&_th]:font-bold [&_th]:whitespace-nowrap [&_td]:border [&_td]:border-gray-100 dark:[&_td]:border-gray-800 [&_td]:p-2.5 [&_td]:align-top prose-blockquote:border-r-4 prose-blockquote:border-l-0 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50/30 dark:prose-blockquote:bg-indigo-950/10 prose-blockquote:px-5 prose-blockquote:py-3 prose-blockquote:rounded-l-2xl prose-blockquote:text-indigo-800 dark:prose-blockquote:text-indigo-200 prose-blockquote:not-italic prose-a:text-indigo-600 dark:prose-a:text-indigo-400 hover:prose-a:text-indigo-700 dark:hover:prose-a:text-indigo-300 prose-strong:text-slate-900 dark:prose-strong:text-white prose-strong:font-black [&_h2]:text-lg [&_h2]:sm:text-xl [&_h2]:font-black [&_h2]:text-slate-800 [&_h2]:dark:text-white [&_h2]:border-r-4 [&_h2]:border-indigo-500 [&_h2]:pr-3 [&_h2]:mt-10 [&_h2]:mb-4 [&_h2]:leading-snug [&_h2]:scroll-mt-24 [&_h3]:text-base [&_h3]:sm:text-lg [&_h3]:font-black [&_h3]:text-slate-800 [&_h3]:dark:text-white [&_h3]:border-r-4 [&_h3]:border-violet-500 [&_h3]:pr-3 [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:leading-snug [&_h3]:scroll-mt-24 [&_h4]:text-sm [&_h4]:sm:text-base [&_h4]:font-black [&_h4]:text-slate-800 [&_h4]:dark:text-white [&_h4]:border-r-2 [&_h4]:border-pink-500 [&_h4]:pr-2.5 [&_h4]:mt-6 [&_h4]:mb-3 [&_h4]:leading-snug [&_h4]:scroll-mt-24"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />

            {/* FAQs Box - Minimal Style at the end of content with customized branding */}
            {faqsList.length > 0 && (
              <div 
                itemScope 
                itemType="https://schema.org/FAQPage"
                className="pt-8 mt-8 border-t border-indigo-100/40 dark:border-indigo-950/20 space-y-6 max-w-[72ch] mx-auto"
              >
                <div className="space-y-1">
                  <h3 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                    پرسش و پاسخ‌های متداول (FAQ)
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">در این بخش، به مهم‌ترین و پرکاربردترین سؤالات شما درباره این مطلب با رنگ‌بندی مینیمال پاسخ داده‌ایم.</p>
                </div>
                
                <div className="space-y-3">
                  {faqsList.map((faq, idx) => (
                    <FaqItem key={idx} question={faq.question} answer={faq.answer} index={idx} />
                  ))}
                </div>
              </div>
            )}

            {/* Tags cloud */}
            {tagsList.length > 0 && (
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex flex-wrap gap-2 max-w-[72ch] mx-auto">
                {tagsList.map(tag => (
                  <Link 
                    key={tag}
                    href={`/blog?tag=${tag}`}
                    className="bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-800 text-[10px] text-gray-500 dark:text-gray-400 font-bold px-2.5 py-1 rounded-lg border border-gray-100/40 dark:border-gray-800/40"
                  >
                    #{tag}
                  </Link>
                ))}
              </div>
            )}
          </article>

          {/* 4. Author Bio Card (Minimal with standard brand colored right-accent line) */}
          <div className="bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row gap-5 items-start sm:items-center relative overflow-hidden">
            {/* Minimal left/right standard branding bar - RTL is right side */}
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-r-2xl" />
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center font-black text-gray-500 text-lg flex-shrink-0 overflow-hidden border border-gray-200/50 dark:border-gray-800/50">
              {post.author?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={post.author.avatarUrl} alt={post.author.name} className="w-full h-full object-cover" />
              ) : (
                post.author?.name ? post.author.name.slice(0, 1) : 'م'
              )}
            </div>
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1.5">
                درباره نویسنده: 
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">{post.author?.name || 'مدیر سایت'}</span>
              </h4>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                تیم نگارش و تولید محتوای تخصصی وب‌سایت. تلاش ما ارائه جدیدترین مقالات، آموزش‌ها، راهنماهای خرید اصولی و نقد و بررسی‌های بی‌طرفانه محصولات است تا خرید هوشمندانه‌ای را تجربه کنید.
              </p>
            </div>
          </div>

      {/* Post Navigation: Previous / Next Post Links */}
      {(navigation.prevPost || navigation.nextPost) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {navigation.prevPost ? (
            <Link 
              href={`/blog/${navigation.prevPost.slug}`}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100/80 dark:border-gray-800/80 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-700 flex flex-col gap-1.5 text-right"
            >
              <span className="text-[9px] text-gray-400 font-black flex items-center gap-1">
                <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                پست قبلی
              </span>
              <span className="text-xs font-black text-gray-700 dark:text-gray-300 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{navigation.prevPost.title}</span>
            </Link>
          ) : <div />}

          {navigation.nextPost ? (
            <Link 
              href={`/blog/${navigation.nextPost.slug}`}
              className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100/80 dark:border-gray-800/80 p-5 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-700 flex flex-col gap-1.5 text-left"
            >
              <span className="text-[9px] text-gray-400 font-black flex items-center justify-end gap-1">
                پست بعدی
                <ChevronLeft className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
              </span>
              <span className="text-xs font-black text-gray-700 dark:text-gray-300 line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors text-left">{navigation.nextPost.title}</span>
            </Link>
          ) : <div />}
        </div>
      )}

      {/* Related Products Section for Internal Linking / GEO / Tree structured SILO */}
      {relatedProducts.length > 0 && (
        <div className="space-y-4 bg-gradient-to-br from-indigo-50/20 to-transparent dark:from-indigo-950/10 p-6 rounded-3xl border border-indigo-100/50 dark:border-indigo-900/10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white">محصولات مرتبط پیشنهادی</h3>
              <p className="text-[10px] text-gray-400 font-bold mt-1">محصولات برگزیده مرتبط با موضوع این مقاله با بهترین قیمت</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            {relatedProducts.map((prod) => {
              const finalPrice = prod.discount ? prod.price - prod.discount : prod.price;
              return (
                <div 
                  key={prod.id}
                  className="group bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md flex flex-col"
                >
                  <Link href={`/product/${prod.id}`} className="relative aspect-square w-full overflow-hidden bg-gray-50 dark:bg-slate-800/20">
                    {prod.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.imageUrl} alt={prod.title} className="w-full h-full object-cover group-hover:scale-105 duration-300" />
                    ) : (
                      <div className="w-full h-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-300">
                        تصویر ندارد
                      </div>
                    )}
                    {prod.discount > 0 && (
                      <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                        تخفیف ویژه
                      </span>
                    )}
                  </Link>
                  <div className="p-3 flex-1 flex flex-col justify-between gap-3">
                    <h4 className="font-extrabold text-[11px] text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-2 leading-snug">
                      <Link href={`/product/${prod.id}`}>{prod.title}</Link>
                    </h4>
                    <div className="flex flex-col items-end gap-1">
                      {prod.discount > 0 && (
                        <span className="text-[9px] text-slate-400 line-through font-semibold">
                          {Number(prod.price).toLocaleString('fa-IR')}
                        </span>
                      )}
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                        {Number(finalPrice).toLocaleString('fa-IR')} <span className="text-[10px] font-bold">تومان</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Related Posts Section */}
      {relatedPosts.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-black text-gray-800 dark:text-white">پست‌های مرتبط پیشنهادی</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {relatedPosts.map((rel) => (
              <div 
                key={rel.id}
                className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100/80 dark:border-gray-800/80 overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-700 flex flex-col"
              >
                <Link href={`/blog/${rel.slug}`} className="relative aspect-video w-full overflow-hidden bg-gray-50 dark:bg-gray-800">
                  {rel.featuredImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={rel.featuredImage} alt={rel.title} className="w-full h-full object-cover group-hover:scale-105 duration-300" />
                  ) : (
                    <BlogFallbackImage title={rel.title} categoryName={rel.category?.name} variant="card" />
                  )}
                </Link>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <h4 className="font-bold text-gray-700 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors text-xs line-clamp-2 leading-tight">
                    <Link href={`/blog/${rel.slug}`}>{rel.title}</Link>
                  </h4>
                  <span className="text-[9px] text-gray-400 font-medium">{formatDate(rel.publishedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments section */}
      {post.allowComments && (
        <div className="bg-white dark:bg-gray-900 border border-gray-100/80 dark:border-gray-800/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
          <h3 className="text-sm font-black text-gray-800 dark:text-white flex items-center gap-1.5 pb-3 border-b border-gray-100 dark:border-gray-800">
            <MessageSquare className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            دیدگاه‌های کاربران ({formatNum(comments.length)})
          </h3>

          {/* Comments List */}
          {comments.length === 0 ? (
            <div className="bg-gray-50/40 dark:bg-gray-900/30 border border-dashed border-gray-200/80 dark:border-gray-800 p-10 rounded-2xl text-center">
              <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-3" />
              <p className="text-xs font-bold text-gray-400">هنوز هیچ دیدگاهی برای این مطلب ثبت نشده است. اولین دیدگاه را بنویسید!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {comments.map((comm) => (
                <div 
                  key={comm.id} 
                  className={`p-5 rounded-2xl border transition-all duration-200 relative group/comment ${
                    comm.parentId 
                      ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-100/40 dark:border-rose-900/20 border-r-4 border-r-rose-500 dark:border-r-rose-400 mr-6 sm:mr-12 space-y-3 shadow-[0_2px_8px_-1px_rgba(244,63,94,0.02)]' 
                      : 'bg-gray-50/70 dark:bg-gray-800/20 border-gray-200/50 dark:border-gray-800/80 border-r-4 border-r-gray-400 dark:border-r-gray-600 space-y-3 shadow-[0_2px_8px_-1px_rgba(0,0,0,0.02)]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2.5 border-b border-gray-100/50 dark:border-gray-800/50">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs border shadow-sm ${
                        comm.parentId 
                          ? 'bg-gradient-to-br from-rose-600/10 to-rose-500/10 border-rose-200/20 dark:border-rose-800/20 text-rose-600 dark:text-rose-400' 
                          : 'bg-gradient-to-br from-gray-100 to-gray-200/80 dark:from-gray-800 dark:to-gray-700/80 text-gray-600 dark:text-gray-300 border-gray-200/50 dark:border-gray-800/50'
                      }`}>
                        {comm.name.slice(0, 1)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-extrabold text-xs sm:text-sm text-gray-800 dark:text-white">{comm.name}</span>
                          {comm.parentId && (
                            <span className="text-[9px] bg-rose-600/10 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg font-black flex items-center gap-0.5">
                              در پاسخ به: {comm.parent?.name}
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] text-gray-400 font-semibold">کاربر مهمان وب‌سایت</p>
                      </div>
                    </div>
                    <span className="self-start sm:self-center text-[10px] text-gray-400 dark:text-gray-500 font-bold bg-white dark:bg-gray-900/60 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-gray-800/80 shadow-xs">
                      {formatDate(comm.createdAt)}
                    </span>
                  </div>
                  
                  <p className="font-semibold text-xs sm:text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 pl-4 pr-1 html-content whitespace-pre-line" dangerouslySetInnerHTML={{ __html: comm.content }} />

                  <div className="flex justify-end pt-1">
                    <button 
                      onClick={() => {
                        setReplyToId(comm.id);
                        setReplyToName(comm.name);
                        const commentForm = document.getElementById('comment-form');
                        commentForm?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-600 dark:text-rose-400 rounded-xl transition-all font-black text-[10px]"
                    >
                      <CornerDownLeft className="w-3.5 h-3.5" />
                      پاسخ به این دیدگاه
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Comment Form */}
          <div id="comment-form" className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
            <h4 className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1.5">
              <Send className="w-4 h-4 text-rose-600" />
              ارسال نظر جدید
            </h4>

            {replyToId && (
              <div className="bg-rose-600/10 text-rose-600 text-[10px] px-4 py-3 rounded-2xl flex justify-between items-center border border-rose-500/25 animate-in fade-in duration-250">
                <span>شما در حال پاسخ به دیدگاه <strong>{replyToName}</strong> هستید.</span>
                <button 
                  onClick={() => {
                    setReplyToId(null);
                    setReplyToName(null);
                  }}
                  className="font-black hover:underline hover:text-rose-700 transition-colors"
                >
                  انصراف از پاسخ
                </button>
              </div>
            )}

            {commentSuccess ? (
              <div className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-xs p-4 rounded-2xl font-bold animate-in fade-in duration-300">
                {commentSuccess}
              </div>
            ) : (
              <form onSubmit={handleCommentSubmit} className="space-y-4 text-xs font-bold">
                {!currentUser ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Name */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400">نام شما <span className="text-rose-500">*</span></label>
                      <input 
                        type="text"
                        required
                        value={commentName}
                        onChange={(e) => setCommentName(e.target.value)}
                        placeholder="مثلاً: علی رضایی"
                        className="w-full px-4 py-3 bg-gray-50/50 hover:bg-gray-100/30 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500/50 transition-all text-gray-700 dark:text-gray-300"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400">آدرس ایمیل <span className="text-gray-400">(اختیاری)</span></label>
                      <input 
                        type="email"
                        value={commentEmail}
                        onChange={(e) => setCommentEmail(e.target.value)}
                        placeholder="info@example.com"
                        className="w-full text-left px-4 py-3 bg-gray-50/50 hover:bg-gray-100/30 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500/50 transition-all text-gray-700 dark:text-gray-300"
                        dir="ltr"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/50 flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span>شما با حساب کاربری <strong>{currentUser.name} ({currentUser.email})</strong> وارد شده‌اید و دیدگاه شما با این نام ثبت خواهد شد.</span>
                  </div>
                )}

                {/* Content */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-black text-gray-500 dark:text-gray-400">متن دیدگاه شما <span className="text-rose-500">*</span></label>
                  <textarea 
                    required
                    rows={4}
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder="دیدگاه یا سوال خود درباره این مقاله را بنویسید..."
                    className="w-full px-4 py-3.5 bg-gray-50/50 hover:bg-gray-100/30 dark:bg-gray-800/40 dark:hover:bg-gray-800/60 border border-gray-200/60 dark:border-gray-800/80 rounded-2xl outline-none font-bold text-xs focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500/50 transition-all resize-none text-gray-700 dark:text-gray-300"
                  />
                </div>

                {/* Actions */}
                <button
                  type="submit"
                  disabled={submittingComment}
                  className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-[11px] font-black hover:scale-102 active:scale-98 duration-200 shadow-md shadow-rose-500/10"
                >
                  {submittingComment ? 'در حال ارسال دیدگاه...' : 'ثبت و ارسال دیدگاه'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Newsletter Subscription Card at the bottom */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-violet-700 dark:from-gray-900 dark:to-black text-white rounded-2xl p-6 sm:p-8 border border-indigo-500/10 shadow-lg space-y-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="space-y-2 max-w-lg z-10">
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            <Mail className="w-5 h-5 text-indigo-200 dark:text-indigo-400" />
            عضویت در باشگاه محتوای فروشگاه
          </h3>
          <p className="text-[10px] sm:text-xs text-indigo-100/70 font-semibold leading-relaxed">
            هیچ مطلبی را از دست ندهید! با عضویت رایگان، از تازه‌ترین مقالات علمی، آموزش‌های کلیدی و ترفندهای حرفه‌ای ما در صندوق ورودی ایمیل خود باخبر شوید.
          </p>
        </div>

        <div className="w-full sm:w-80 z-10 text-xs">
          {newsletterSubscribed ? (
            <div className="bg-white/10 p-3 rounded-2xl text-center font-black text-indigo-200 animate-in fade-in duration-300">
              با تشکر، عضویت شما فعال شد!
            </div>
          ) : (
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input 
                type="email" 
                required
                placeholder="ایمیل شما..."
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-white/10 border border-white/10 hover:border-white/20 outline-none rounded-xl text-xs text-white placeholder:text-white/40 focus:ring-2 focus:ring-indigo-400/30 transition-all font-mono"
              />
              <button
                type="submit"
                disabled={submittingNewsletter}
                className="px-5 py-2.5 bg-white hover:bg-gray-100 text-indigo-600 rounded-xl font-black whitespace-nowrap hover:scale-105 active:scale-95 duration-200 shadow shadow-black/10"
              >
                {submittingNewsletter ? 'عضویت...' : 'عضویت'}
              </button>
            </form>
          )}
        </div>
      </div>

        </div> {/* Closes Main Content */}

        {/* Sidebar (4 Columns) */}
        {hasHeadings && (
          <div className="lg:col-span-4 lg:sticky lg:top-24">
            <TableOfContents contentRef={contentRef} contentHtml={post.content} desktopOnly />
          </div>
        )}
      </div> {/* Closes Layout Container */}

    </div>
  );
}
