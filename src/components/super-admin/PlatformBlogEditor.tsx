'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Sparkles, 
  Save, 
  ArrowRight, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Settings,
  ShieldAlert,
  Globe,
  Plus,
  Share2,
  Trash2,
  Copy,
  PlusCircle,
  TrendingUp,
  Brain,
  FileJson,
  CornerDownLeft,
  ChevronDown,
  ChevronUp,
  Upload,
  Image as ImageIcon,
  Loader2,
  X
} from 'lucide-react';

interface PlatformBlogEditorProps {
  mode: 'create' | 'edit';
  initialPostId?: string;
}

export default function PlatformBlogEditor({ mode, initialPostId }: PlatformBlogEditorProps) {
  const router = useRouter();

  // Categories & Tags list state
  const [categories, setCategories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  
  // Modals for Categories & Tags creation
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Loading & Message states
  const [loading, setLoading] = useState(mode === 'edit');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Main Form fields
  const [postData, setPostData] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    coverImage: '',
    status: 'draft',
    categoryId: '',
    author: '',
    metaTitle: '',
    metaDescription: '',
    focusKeyword: '',
    secondaryKeywords: '',
    geoSummary: '',
    keyTakeaways: '',
    entityList: '',
    topicClusters: '',
    faqSection: '[]',
    schemaType: 'Article',
    structuredData: '',
    internalLinks: '',
    externalReferences: '',
    noindex: false,
    nofollow: false,
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    tags: [] as string[] // Selected tag IDs
  });

  // Role restriction (some fields read-only for SEO manager)
  const [isSeoOnlyRole, setIsSeoOnlyRole] = useState(false);

  // Active section in the editor form (accordion or tabs)
  const [activeTab, setActiveTab] = useState<'content' | 'seo' | 'geo' | 'social'>('content');

  // Simple vs Advanced writing mode
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);

  // Collapsible AI Sidebar
  const [showAiSidebar, setShowAiSidebar] = useState(false);

  // Cover image upload state
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Inline AI generation loading states
  const [generatingFields, setGeneratingFields] = useState<Record<string, boolean>>({});

  // AI Sidebar state
  const [aiAction, setAiAction] = useState('generate_ideas');
  const [aiTopic, setAiTopic] = useState('');
  const [aiKeyword, setAiKeyword] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [aiSelectedText, setAiSelectedText] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiModelUsed, setAiModelUsed] = useState('');

  // Real-time SEO metrics
  const [seoScore, setSeoScore] = useState(0);
  const [seoChecks, setSeoMetrics] = useState<Array<{ label: string; passed: boolean; desc: string }>>([]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      // Decode user role from cookie
      const tokenCookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith('super_admin_token='))
        ?.split('=')[1];
      if (tokenCookie) {
        try {
          const payload = JSON.parse(window.atob(tokenCookie.split('.')[1]));
          if (payload.role === 'seo_manager') {
            setIsSeoOnlyRole(true);
            setActiveTab('seo'); // Default to SEO tab for SEO manager
          }
        } catch {}
      }

      // Fetch categories & tags
      const [catRes, tagRes] = await Promise.all([
        fetch('/api/super-admin/blog/categories'),
        fetch('/api/super-admin/blog/tags')
      ]);

      if (catRes.ok) setCategories(await catRes.json());
      if (tagRes.ok) setTags(await tagRes.json());

      // If edit mode, fetch article details
      if (mode === 'edit' && initialPostId) {
        const postRes = await fetch(`/api/super-admin/blog/posts/${initialPostId}`);
        if (postRes.ok) {
          const post = await postRes.json();
          setPostData({
            title: post.title || '',
            slug: post.slug || '',
            excerpt: post.excerpt || '',
            content: post.content || '',
            coverImage: post.coverImage || '',
            status: post.status || 'draft',
            categoryId: post.categoryId || '',
            author: post.author || '',
            metaTitle: post.metaTitle || '',
            metaDescription: post.metaDescription || '',
            focusKeyword: post.focusKeyword || '',
            secondaryKeywords: post.secondaryKeywords || '',
            geoSummary: post.geoSummary || '',
            keyTakeaways: post.keyTakeaways || '',
            entityList: post.entityList || '',
            topicClusters: post.topicClusters || '',
            faqSection: post.faqSection || '[]',
            schemaType: post.schemaType || 'Article',
            structuredData: post.structuredData || '',
            internalLinks: post.internalLinks || '',
            externalReferences: post.externalReferences || '',
            noindex: post.noindex || false,
            nofollow: post.nofollow || false,
            ogTitle: post.ogTitle || '',
            ogDescription: post.ogDescription || '',
            ogImage: post.ogImage || '',
            twitterTitle: post.twitterTitle || '',
            twitterDescription: post.twitterDescription || '',
            twitterImage: post.twitterImage || '',
            tags: (post.tags || []).map((t: any) => t.tagId)
          });
          setAiTopic(post.title || '');
          setAiKeyword(post.focusKeyword || '');
        } else {
          setError('خطا در دریافت اطلاعات مقاله');
        }
      }
    } catch (err) {
      console.error('Error fetching blog editor data:', err);
      setError('خطا در بارگذاری منابع وبلاگ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [initialPostId, mode]);

  // Real-time SEO and GEO Scoring Auditor
  useEffect(() => {
    const checks = [
      {
        label: 'طول عنوان مقاله',
        passed: postData.title.length >= 15,
        desc: 'عنوان باید حداقل شامل ۱۵ کاراکتر باشد تا نظر مخاطب و گوگل را جلب کند.'
      },
      {
        label: 'طول عنوان سئو (Meta Title)',
        passed: postData.metaTitle.length >= 30 && postData.metaTitle.length <= 65,
        desc: 'طول استاندارد عنوان سئو بین ۳۰ تا ۶۵ کاراکتر است.'
      },
      {
        label: 'توضیحات متا (Meta Description)',
        passed: postData.metaDescription.length >= 110 && postData.metaDescription.length <= 160,
        desc: 'طول استاندارد دیسکریپشن بین ۱۱۰ تا ۱۶۰ کاراکتر است.'
      },
      {
        label: 'وجود کلمه کلیدی اصلی',
        passed: postData.focusKeyword.trim().length > 0,
        desc: 'تعیین کلمه کلیدی تمرکزی برای بررسی غنای سمانتیک الزامی است.'
      },
      {
        label: 'کلمه کلیدی در عنوان سئو',
        passed: postData.focusKeyword.trim().length > 0 && postData.metaTitle.toLowerCase().includes(postData.focusKeyword.toLowerCase()),
        desc: 'وجود کلمه کلیدی در Meta Title اهمیت سئو بالایی دارد.'
      },
      {
        label: 'حجم محتوای کل',
        passed: postData.content.replace(/<[^>]*>/g, '').split(/\s+/).length >= 500,
        desc: 'محتوا باید حداقل شامل ۵۰۰ کلمه غنی باشد.'
      },
      {
        label: 'خلاصه پاسخ مستقیم (GEO Answer)',
        passed: postData.geoSummary ? postData.geoSummary.trim().length > 30 : false,
        desc: 'وجود پاسخ صریح و مستقیم ۲ الی ۳ جمله‌ای به موتورهای هوش مصنوعی (GEO).'
      },
      {
        label: 'نکات کلیدی مقاله (Takeaways)',
        passed: postData.keyTakeaways ? postData.keyTakeaways.trim().length > 20 : false,
        desc: 'تعریف بالت‌پوینت‌های خلاصه مقاله جهت بهبود رتبه‌بندی در موتورهای پاسخگو.'
      },
      {
        label: 'پرسش و پاسخ‌های متداول (FAQs)',
        passed: (() => {
          try {
            const arr = JSON.parse(postData.faqSection || '[]');
            return arr.length >= 1;
          } catch { return false; }
        })(),
        desc: 'تعریف حداقل ۱ یا چند سوال متداول به همراه پاسخ جامع.'
      },
      {
        label: 'داده‌های ساختاریافته (JSON-LD Schema)',
        passed: postData.structuredData ? postData.structuredData.trim().includes('"@context"') : false,
        desc: 'کد استاندارد اسکیما برای نمایش ریچ‌اسنیپت در نتایج سرچ.'
      }
    ];

    const passedCount = checks.filter(c => c.passed).length;
    const score = Math.round((passedCount / checks.length) * 100);

    setSeoMetrics(checks);
    setSeoScore(score);
  }, [postData]);

  // Generate Automatic Slug from Title
  const generateAutoSlug = () => {
    if (!postData.title) return;
    const cleanSlug = postData.title
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, '') // Keep letters, persian letters, spaces, hyphens
      .replace(/\s+/g, '-');
    setPostData({ ...postData, slug: cleanSlug });
  };

  // Add Category Handler
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName || !newCatSlug) return;
    try {
      const res = await fetch('/api/super-admin/blog/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCatName, slug: newCatSlug }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories([...categories, cat]);
        setPostData({ ...postData, categoryId: cat.id });
        setIsCategoryModalOpen(false);
        setNewCatName('');
        setNewCatSlug('');
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت دسته‌بندی');
      }
    } catch {
      alert('خطا در شبکه');
    }
  };

  // Add Tag Handler
  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName) return;
    try {
      const res = await fetch('/api/super-admin/blog/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTagName }),
      });
      if (res.ok) {
        const tag = await res.json();
        setTags([...tags, tag]);
        setPostData({ ...postData, tags: [...postData.tags, tag.id] });
        setIsTagModalOpen(false);
        setNewTagName('');
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت برچسب');
      }
    } catch {
      alert('خطا در شبکه');
    }
  };

  // Toggle selected tags
  const handleTagToggle = (tagId: string) => {
    if (postData.tags.includes(tagId)) {
      setPostData({ ...postData, tags: postData.tags.filter(id => id !== tagId) });
    } else {
      setPostData({ ...postData, tags: [...postData.tags, tagId] });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await uploadFile(file);
  };

  const uploadFile = async (file: File) => {
    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/super-admin/blog/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'خطا در آپلود تصویر');
      }

      setPostData((prev) => ({ ...prev, coverImage: data.url }));
      setSuccess('تصویر با موفقیت آپلود شد.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.message || 'خطا در ارتباط با سرور.');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      await uploadFile(file);
    }
  };

  // Handle Main Save Submit
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const url = mode === 'create' 
        ? '/api/super-admin/blog/posts' 
        : `/api/super-admin/blog/posts/${initialPostId}`;
      
      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(postData),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess('مقاله با موفقیت ذخیره گردید.');
        if (mode === 'create') {
          router.push('/super-admin/blog');
        } else {
          setTimeout(() => setSuccess(''), 3000);
        }
      } else {
        setError(data.error || 'خطا در ذخیره‌سازی مقاله.');
      }
    } catch (err) {
      console.error('Error saving article:', err);
      setError('خطای غیرمنتظره شبکه در ذخیره‌سازی.');
    } finally {
      setSaving(false);
    }
  };

  // Context-aware Inline AI generation for specific fields
  const handleInlineGenerate = async (fieldKey: string, actionName: string) => {
    if (!postData.title && !postData.content) {
      alert('لطفاً ابتدا عنوان یا محتوای اصلی مقاله را وارد کنید تا هوش مصنوعی بر اساس آن بنویسد.');
      return;
    }

    setGeneratingFields((prev) => ({ ...prev, [fieldKey]: true }));
    try {
      const res = await fetch('/api/super-admin/blog/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: actionName,
          topic: postData.title,
          keyword: postData.focusKeyword,
          content: postData.content,
          context: postData.excerpt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'خطا در تولید محتوا');
      }

      const resultText = data.result;

      if (actionName === 'generate_seo_metadata') {
        try {
          const parsed = JSON.parse(resultText);
          setPostData((prev) => ({
            ...prev,
            metaTitle: parsed.metaTitle || prev.metaTitle,
            metaDescription: parsed.metaDescription || prev.metaDescription,
          }));
          setSuccess('عنوان سئو و توضیحات متا با موفقیت تولید شدند.');
          setTimeout(() => setSuccess(''), 3000);
        } catch {
          setPostData((prev) => ({ ...prev, [fieldKey]: resultText }));
        }
      } else {
        setPostData((prev) => ({ ...prev, [fieldKey]: resultText }));
        setSuccess('محتوای فیلد با موفقیت تولید و درج گردید.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'خطا در ارتباط با سرور هوش مصنوعی.');
    } finally {
      setGeneratingFields((prev) => ({ ...prev, [fieldKey]: false }));
    }
  };

  const InlineGenerateButton = ({ fieldKey, actionName, tooltip = 'تولید هوشمند با هوش مصنوعی' }: { fieldKey: string, actionName: string, tooltip?: string }) => {
    const isGenerating = generatingFields[fieldKey];
    return (
      <button
        type="button"
        disabled={isGenerating}
        onClick={() => handleInlineGenerate(fieldKey, actionName)}
        title={tooltip}
        className="inline-flex items-center justify-center p-1 rounded-md text-violet-600 hover:text-violet-800 hover:bg-violet-50 focus:outline-hidden disabled:opacity-50 transition-all select-none mr-1.5"
      >
        {isGenerating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
      </button>
    );
  };

  // AI Generation Tool Trigger Action
  const handleAiGenerate = async () => {
    setAiLoading(true);
    setAiError('');
    setAiResult('');
    setAiModelUsed('');

    try {
      const res = await fetch('/api/super-admin/blog/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: aiAction,
          topic: aiTopic || postData.title,
          keyword: aiKeyword || postData.focusKeyword,
          outline: postData.keyTakeaways,
          content: postData.content,
          selectedText: aiSelectedText,
          context: postData.excerpt,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAiResult(data.result);
        setAiModelUsed(data.model);
      } else {
        setAiError(data.error || 'خطایی در دریافت پاسخ هوش مصنوعی رخ داد.');
      }
    } catch (err) {
      console.error('AI Error:', err);
      setAiError('خطای ارتباط با سرور هوش مصنوعی.');
    } finally {
      setAiLoading(false);
    }
  };

  // Function to insert AI generated text into specific fields or append to editor
  const handleInsertAiResult = (targetField: string) => {
    if (!aiResult) return;
    
    if (targetField === 'content') {
      setPostData({ ...postData, content: postData.content + '\n\n' + aiResult });
    } else if (targetField === 'faqSection') {
      setPostData({ ...postData, faqSection: aiResult });
    } else if (targetField === 'structuredData') {
      setPostData({ ...postData, structuredData: aiResult });
    } else if (targetField === 'seoMetadata') {
      try {
        const parsed = JSON.parse(aiResult);
        setPostData({
          ...postData,
          metaTitle: parsed.metaTitle || postData.metaTitle,
          metaDescription: parsed.metaDescription || postData.metaDescription
        });
      } catch {
        alert('پاسخ هوش مصنوعی با قالب سئو همخوانی ندارد. دستی ویرایش کنید.');
      }
    } else {
      setPostData({ ...postData, [targetField]: aiResult });
    }
    setSuccess('محتوای تولیدی با موفقیت درج گردید.');
    setTimeout(() => setSuccess(''), 3000);
  };

  // List of AI Sidebar Action Options
  const aiToolsList = [
    { group: 'ایده‌پردازی و ساختار', tools: [
      { action: 'generate_ideas', label: 'تولید ایده مقاله', desc: 'پیشنهاد ۳ تا ۵ موضوع جذاب' },
      { action: 'generate_outline', label: 'طراحی ساختار (Outline)', desc: 'تولید سرفصل‌های درختی سمانتیک' },
    ]},
    { group: 'نگارش محتوای عمیق', tools: [
      { action: 'generate_section', label: 'نگارش کامل سرفصل', desc: 'نگارش عمیق بخش انتخاب‌شده' },
      { action: 'translate_or_adapt', label: 'ترجمه و بومی‌سازی بریف', desc: 'بومی‌سازی مطالب رفرنس خارجی' },
    ]},
    { group: 'سئو و بهینه‌سازی GEO', tools: [
      { action: 'generate_direct_answer', label: 'خلاصه موتور پاسخگو (GEO)', desc: 'تولید پاسخ صریح ۲-۳ جمله‌ای' },
      { action: 'generate_key_takeaways', label: 'نکات کلیدی (Takeaways)', desc: 'تولید بالت‌پوینت‌های کلیدی' },
      { action: 'extract_entities', label: 'استخراج موجودیت‌ها', desc: 'شناسایی موجودیت‌های گراف سمانتیک' },
      { action: 'cluster_topics', label: 'خوشه‌بندی موضوعی', desc: 'تعیین خوشه‌ها و پیوندها' },
    ]},
    { group: 'سئو متداول و فنی', tools: [
      { action: 'generate_seo_metadata', label: 'عنوان و دیسکریپشن متا', desc: 'عنوان سئو و توضیحات متا' },
      { action: 'generate_schema', label: 'اسکیما داده (JSON-LD)', desc: 'تولید کد اسکیما Article' },
      { action: 'generate_internal_links', label: 'پیشنهاد لینک‌های داخلی', desc: 'لینک به پکیج‌ها و مقالات برسانا' },
      { action: 'generate_external_references', label: 'ارجاعات علمی خارجی', desc: 'تولید مراجع معتبر بین‌المللی' },
      { action: 'generate_faq', label: 'سوالات متداول (FAQ)', desc: 'تولید سوالات همراه با جواب' },
    ]},
    { group: 'بهبود نگارش و صیقل متن', tools: [
      { action: 'improve_readability', label: 'افزایش خوانایی متن', desc: 'ساده و روان‌سازی جملات سخت' },
      { action: 'paraphrase', label: 'پارافریز (بازنویسی)', desc: 'بازنویسی جذاب‌تر برای جلوگیری از تکرار' },
      { action: 'make_professional', label: 'لحن رسمی و شرکتی', desc: 'افزایش اعتبار علمی متن' },
      { action: 'make_conversational', label: 'لحن صمیمی و همدلانه', desc: 'تولید متن صمیمی برای ارتباط عاطفی' },
      { action: 'add_persian_idioms', label: 'افزودن اصطلاحات فارسی', desc: 'کنایه‌ها و اصطلاحات اصیل فارسی' },
      { action: 'shorten_text', label: 'فشرده و کوتاه‌سازی', desc: 'خلاصه‌سازی و حذف جملات اضافه' },
      { action: 'expand_text', label: 'بسط و تشریح بیشتر', desc: 'توسعه جملات کوتاه با مثال' },
    ]}
  ];

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 gap-3" dir="rtl">
        <div className="w-8 h-8 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-500 font-bold">در حال بارگذاری ادیتور مقاله...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" dir="rtl">
      
      {/* LEFT COLUMN: Main Editor */}
      <div className={`${showAiSidebar ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-6 transition-all duration-300`}>
        
        {/* Editor Breadcrumb and Info */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-3xs gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.push('/super-admin/blog')}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors font-bold"
            >
              <ArrowRight className="h-4 w-4" />
              وبلاگ
            </button>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-xs font-bold text-slate-800">
              {mode === 'create' ? 'نگارش مقاله جدید' : 'ویرایش مقاله'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Simple / Advanced Toggle */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setIsAdvancedMode(false);
                  setActiveTab('content');
                  setShowAiSidebar(false);
                }}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                  !isAdvancedMode ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                نگارش ساده
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAdvancedMode(true);
                  setShowAiSidebar(true);
                }}
                className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${
                  isAdvancedMode ? 'bg-slate-900 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                امکانات پیشرفته
              </button>
            </div>

            {/* AI Assistant toggle button */}
            <button
              type="button"
              onClick={() => setShowAiSidebar(!showAiSidebar)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                showAiSidebar 
                  ? 'bg-violet-100 text-violet-700 shadow-3xs' 
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-800 border border-slate-200'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-violet-500" />
              دستیار هوش مصنوعی
            </button>

            {/* SEO score badge - only in advanced mode */}
            {isAdvancedMode && (
              <div className={`flex items-center gap-1 font-bold text-[10px] px-2.5 py-1.5 rounded-lg ${
                seoScore >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' : seoScore >= 50 ? 'bg-amber-50 text-amber-700 border border-amber-150' : 'bg-red-50 text-red-700 border border-red-150'
              }`}>
                سئو: {seoScore}٪
              </div>
            )}
          </div>
        </div>

        {/* Action Forbidden Warning (SEO manager limit) */}
        {isSeoOnlyRole && (
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed font-medium">
            <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <p className="font-bold">محدودیت دسترسی (نقش: مدیر سئو)</p>
              <p className="mt-0.5">شما فقط مجاز به ویرایش، بهبود و بهینه‌سازی فیلدهای سئو، متادیتا و بریف GEO مقاله هستید. ویرایش متن اصلی مقاله یا تغییرات دسته‌بندی برای نقش شما محدود می‌باشد.</p>
            </div>
          </div>
        )}

        {/* Editor Form */}
        <form onSubmit={handleSavePost} className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          
          {/* Section Tabs inside Form */}
          {isAdvancedMode && (
            <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-2 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSeoOnlyRole}
                onClick={() => setActiveTab('content')}
                className={`px-4 py-2.5 text-xs font-bold transition-all rounded-lg ${
                  activeTab === 'content' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50 disabled:opacity-50'
                }`}
              >
                محتوای اصلی مقاله
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('seo')}
                className={`px-4 py-2.5 text-xs font-bold transition-all rounded-lg ${
                  activeTab === 'seo' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                بهینه‌سازی سئو (SEO)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('geo')}
                className={`px-4 py-2.5 text-xs font-bold transition-all rounded-lg ${
                  activeTab === 'geo' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                بهینه‌سازی GEO (پاسخ هوش مصنوعی)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('social')}
                className={`px-4 py-2.5 text-xs font-bold transition-all rounded-lg ${
                  activeTab === 'social' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/50'
                }`}
              >
                شبکه‌های اجتماعی (OG)
              </button>
            </div>
          )}

          <div className="p-6 space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
                <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* TAB 1: CONTENT */}
            {activeTab === 'content' && (
              <div className="space-y-4">
                
                {/* Title */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">عنوان مقاله</label>
                  <input
                    type="text"
                    required
                    value={postData.title}
                    onChange={(e) => setPostData({ ...postData, title: e.target.value })}
                    placeholder="مثال: روش‌های جذب اولین مشتری برای فروشگاه اینترنتی جدید"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-3 text-xs outline-hidden transition-all"
                  />
                </div>

                {/* Slug Generator */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-9 space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">اسلاگ یکتا (URL Slug)</label>
                    <input
                      type="text"
                      required
                      value={postData.slug}
                      onChange={(e) => setPostData({ ...postData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      placeholder="how-to-get-first-customer"
                      dir="ltr"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all font-mono text-left"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <button
                      type="button"
                      onClick={generateAutoSlug}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                    >
                      ساخت خودکار اسلاگ
                    </button>
                  </div>
                </div>

                {/* Category & Tags layout */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Category select */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-slate-700 block">دسته‌بندی موضوعی</label>
                      <button
                        type="button"
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                      >
                        <Plus className="h-3 w-3" /> دسته‌بندی جدید
                      </button>
                    </div>
                    <select
                      value={postData.categoryId}
                      onChange={(e) => setPostData({ ...postData, categoryId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2.5 text-xs outline-hidden transition-all"
                    >
                      <option value="">-- بدون دسته‌بندی --</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Author */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">نویسنده مقاله (نام نمایشی)</label>
                    <input
                      type="text"
                      value={postData.author}
                      onChange={(e) => setPostData({ ...postData, author: e.target.value })}
                      placeholder="مثال: تیم تحریریه برسانا"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Excerpt */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span>چکیده یا خلاصه کوتاه (Excerpt)</span>
                    <InlineGenerateButton fieldKey="excerpt" actionName="generate_excerpt" tooltip="تولید خلاصه با هوش مصنوعی" />
                  </label>
                  <textarea
                    rows={2}
                    value={postData.excerpt}
                    onChange={(e) => setPostData({ ...postData, excerpt: e.target.value })}
                    placeholder="خلاصه کوتاهی از مقاله جهت نمایش در کارت‌های وبلاگ..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none"
                  />
                </div>

                {/* Cover Image Upload & URL */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block">تصویر شاخص مقاله</label>
                  
                  {postData.coverImage ? (
                    <div className="relative group rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 max-h-64 flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={postData.coverImage} 
                        alt="پیش‌نمایش تصویر شاخص" 
                        className="w-full h-full max-h-64 object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPostData({ ...postData, coverImage: '' })}
                          className="bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-lg transition-all"
                          title="حذف تصویر"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => document.getElementById('cover-image-file-input')?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 group"
                    >
                      <input
                        type="file"
                        id="cover-image-file-input"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploading}
                      />
                      
                      {uploading ? (
                        <div className="flex flex-col items-center gap-2">
                          <Loader2 className="h-8 w-8 text-slate-900 animate-spin" />
                          <span className="text-xs font-bold text-slate-500">در حال آپلود و بهینه‌سازی تصویر...</span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-slate-600 transition-all shadow-3xs">
                            <Upload className="h-6 w-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-700">برای بارگذاری تصویر کلیک کنید یا آن را به اینجا بکشید</p>
                            <p className="text-[10px] text-slate-400">فرمت‌های مجاز: WebP، JPG، PNG، GIF (حداکثر حجم ۱۰ مگابایت)</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {uploadError && (
                    <p className="text-[11px] text-red-600 font-bold">{uploadError}</p>
                  )}

                  {/* Fallback URL input option (always toggleable or shown in Advanced mode) */}
                  {(isAdvancedMode || postData.coverImage) && (
                    <div className="pt-2">
                      <label className="text-[10px] font-bold text-slate-500 block mb-1">آدرس مستقیم تصویر (URL)</label>
                      <input
                        type="text"
                        value={postData.coverImage || ''}
                        onChange={(e) => setPostData({ ...postData, coverImage: e.target.value })}
                        placeholder="https://images.pexels.com/..."
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-[11px] outline-hidden transition-all font-mono text-left"
                      />
                    </div>
                  )}
                </div>

                {/* Content Rich Text editor */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700 block">متن اصلی مقاله (پشتیبانی از HTML و Markdown)</label>
                    <span className="text-[10px] text-slate-400">تعداد کلمات: {postData.content.replace(/<[^>]*>/g, '').split(/\s+/).filter(Boolean).length} کلمه</span>
                  </div>
                  <textarea
                    rows={12}
                    value={postData.content}
                    onChange={(e) => setPostData({ ...postData, content: e.target.value })}
                    placeholder="متن کامل مقاله خود را وارد کنید..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-3 text-xs outline-hidden transition-all font-mono"
                  />
                </div>

                {/* Tags selection box */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <h5 className="text-xs font-bold text-slate-700">برچسب‌ها (کلیدواژه‌های ارتباطی)</h5>
                    <button
                      type="button"
                      onClick={() => setIsTagModalOpen(true)}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5"
                    >
                      <Plus className="h-3 w-3" /> برچسب جدید
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-32 overflow-y-auto">
                    {tags.map(tag => {
                      const isSelected = postData.tags.includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleTagToggle(tag.id)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                            isSelected 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: SEO METRICS */}
            {activeTab === 'seo' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-2">
                    <Globe className="h-4 w-4 text-slate-600" />
                    تنظیمات متا سئو و کلیدواژه‌ها
                  </h4>
                  <p className="text-[10px] text-slate-500">برای بهبود ایندکس در موتورهای سرچ سنتی (Google, Bing) فیلدهای زیر را به صورت بهینه پر کنید.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                      <span>عنوان بهینه‌شده سئو (Meta Title)</span>
                      <InlineGenerateButton fieldKey="metaTitle" actionName="generate_seo_metadata" tooltip="تولید عنوان و توضیحات متا با هوش مصنوعی" />
                    </label>
                    <input
                      type="text"
                      value={postData.metaTitle}
                      onChange={(e) => setPostData({ ...postData, metaTitle: e.target.value })}
                      placeholder="عنوان جذاب سئو شده"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block">کلمه کلیدی تمرکزی (Focus Keyword)</label>
                    <input
                      type="text"
                      value={postData.focusKeyword}
                      onChange={(e) => setPostData({ ...postData, focusKeyword: e.target.value })}
                      placeholder="کلمه کلیدی اصلی"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">کلمات کلیدی ثانویه (با کاما جدا کنید)</label>
                  <input
                    type="text"
                    value={postData.secondaryKeywords}
                    onChange={(e) => setPostData({ ...postData, secondaryKeywords: e.target.value })}
                    placeholder="جذب مشتری، بازاریابی اینترنتی، تبلیغات رایگان"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span>توضیحات متا سئو (Meta Description)</span>
                    <InlineGenerateButton fieldKey="metaDescription" actionName="generate_seo_metadata" tooltip="تولید عنوان و توضیحات متا با هوش مصنوعی" />
                  </label>
                  <textarea
                    rows={3}
                    value={postData.metaDescription}
                    onChange={(e) => setPostData({ ...postData, metaDescription: e.target.value })}
                    placeholder="شامل کال‌تو‌اکشن قوی و ترغیب‌کننده برای جذب کلیک کاربران..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none"
                  />
                </div>

                {/* Index / Follow rules */}
                <div className="flex flex-wrap gap-6 pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="noindex"
                      checked={postData.noindex}
                      onChange={(e) => setPostData({ ...postData, noindex: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-800 w-4 h-4"
                    />
                    <label htmlFor="noindex" className="text-xs font-bold text-slate-700 cursor-pointer">
                      عدم ایندکس در موتورهای سرچ (noindex)
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="nofollow"
                      checked={postData.nofollow}
                      onChange={(e) => setPostData({ ...postData, nofollow: e.target.checked })}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-800 w-4 h-4"
                    />
                    <label htmlFor="nofollow" className="text-xs font-bold text-slate-700 cursor-pointer">
                      دنبال نکردن لینک‌های صفحه (nofollow)
                    </label>
                  </div>
                </div>

                {/* Internal / External referencing notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                      <span>لینک‌های داخلی و انکرها (Internal Links)</span>
                      <InlineGenerateButton fieldKey="internalLinks" actionName="generate_internal_links" tooltip="پیشنهاد لینک‌های داخلی با هوش مصنوعی" />
                    </label>
                    <textarea
                      rows={3}
                      value={postData.internalLinks}
                      onChange={(e) => setPostData({ ...postData, internalLinks: e.target.value })}
                      placeholder="لینک‌های پیشنهادی درون‌مقاله‌ای..."
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                      <span>ارجاعات علمی و تکنیکال (External References)</span>
                      <InlineGenerateButton fieldKey="externalReferences" actionName="generate_external_references" tooltip="پیشنهاد ارجاعات خارجی با هوش مصنوعی" />
                    </label>
                    <textarea
                      rows={3}
                      value={postData.externalReferences}
                      onChange={(e) => setPostData({ ...postData, externalReferences: e.target.value })}
                      placeholder="وب‌سایت‌های مرجع برای صحت‌سنجی محتوا..."
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none"
                    />
                  </div>
                </div>

              </div>
            )}

            {/* TAB 3: GEO AI ENGINES */}
            {activeTab === 'geo' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-2">
                    <Brain className="h-4 w-4 text-violet-600" />
                    تنظیمات بهینه‌سازی موتورهای پاسخگو (GEO)
                  </h4>
                  <p className="text-[10px] text-slate-500">موتورهای جستجوی پاسخگو مبتنی بر هوش مصنوعی (مانند Perplexity، ChatGPT، Google Gemini) محتوا را در قالب خلاصه‌ها، نکات برجسته و داده‌های گراف سمانتیک می‌خوانند. فیلدهای زیر تضمین‌کننده حضور شما در پاسخ‌های هوش مصنوعی هستند.</p>
                </div>

                {/* Direct summary answer */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      خلاصه پاسخ مستقیم (Direct Answer - GEO Summary)
                      <span className="text-[9px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-bold">بسیار مهم</span>
                    </span>
                    <InlineGenerateButton fieldKey="geoSummary" actionName="generate_direct_answer" tooltip="تولید پاسخ صریح هوش مصنوعی" />
                  </label>
                  <textarea
                    rows={3}
                    value={postData.geoSummary}
                    onChange={(e) => setPostData({ ...postData, geoSummary: e.target.value })}
                    placeholder="یک پاسخ مستقیم، صریح، علمی و ۳ جمله‌ای بنویسید که مستقیماً سوال اصلی کاربر را پاسخ دهد تا پرپلکسی بتواند مستقیماً آن را کپی کند..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none"
                  />
                </div>

                {/* Key takeaways */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span>نکات کلیدی و نتایج مهم مقاله (Key Takeaways)</span>
                    <InlineGenerateButton fieldKey="keyTakeaways" actionName="generate_key_takeaways" tooltip="تولید نکات کلیدی با هوش مصنوعی" />
                  </label>
                  <textarea
                    rows={3}
                    value={postData.keyTakeaways}
                    onChange={(e) => setPostData({ ...postData, keyTakeaways: e.target.value })}
                    placeholder="در قالب یک لیست مارک‌داون بالت‌پوینت..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none font-mono"
                  />
                </div>

                {/* Entity references & clusters */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                      <span>نهادها و موجودیت‌های سمانتیک (Entities)</span>
                      <InlineGenerateButton fieldKey="entityList" actionName="extract_entities" tooltip="استخراج موجودیت‌ها با هوش مصنوعی" />
                    </label>
                    <input
                      type="text"
                      value={postData.entityList}
                      onChange={(e) => setPostData({ ...postData, entityList: e.target.value })}
                      placeholder="برسانا، هوش مصنوعی، SaaS، دیتابیس PostgreSQL"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                      <span>خوشه‌های موضوعی (Topic Clusters)</span>
                      <InlineGenerateButton fieldKey="topicClusters" actionName="cluster_topics" tooltip="خوشه‌بندی موضوعی با هوش مصنوعی" />
                    </label>
                    <input
                      type="text"
                      value={postData.topicClusters}
                      onChange={(e) => setPostData({ ...postData, topicClusters: e.target.value })}
                      placeholder="آموزش سئو، دیجیتال مارکتینگ، کسب‌وکار اینترنتی"
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2.5 text-xs outline-hidden transition-all"
                    />
                  </div>
                </div>

                {/* Schema Types & JSON-LD */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">نوع ساختار اسکیما (Schema Type)</label>
                  <select
                    value={postData.schemaType}
                    onChange={(e) => setPostData({ ...postData, schemaType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2.5 text-xs outline-hidden transition-all"
                  >
                    <option value="Article">Article (مقاله‌های عمومی)</option>
                    <option value="NewsArticle">NewsArticle (اخبار پلتفرم)</option>
                    <option value="TechArticle">TechArticle (راهنماهای فنی)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      کد سفارشی داده‌های ساختاریافته (JSON-LD Schema)
                      <FileJson className="h-4 w-4 text-slate-400" />
                    </span>
                    <InlineGenerateButton fieldKey="structuredData" actionName="generate_schema" tooltip="تولید اسکیما داده با هوش مصنوعی" />
                  </label>
                  <textarea
                    rows={4}
                    value={postData.structuredData}
                    onChange={(e) => setPostData({ ...postData, structuredData: e.target.value })}
                    placeholder='{"@context": "https://schema.org", "@type": "Article", ...}'
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none font-mono text-left"
                  />
                </div>

                {/* FAQ section */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block flex items-center justify-between">
                    <span>بخش پرسش و پاسخ‌های متداول (FAQ JSON Array)</span>
                    <InlineGenerateButton fieldKey="faqSection" actionName="generate_faq" tooltip="تولید سوالات متداول با هوش مصنوعی" />
                  </label>
                  <textarea
                    rows={4}
                    value={postData.faqSection}
                    onChange={(e) => setPostData({ ...postData, faqSection: e.target.value })}
                    placeholder='[{"question": "سوال اول؟", "answer": "پاسخ سوال اول."}]'
                    dir="ltr"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all resize-none font-mono text-left"
                  />
                </div>

              </div>
            )}

            {/* TAB 4: SOCIAL MEDIA */}
            {activeTab === 'social' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5 mb-2">
                    <Share2 className="h-4 w-4 text-emerald-600" />
                    تنظیمات بهینه‌سازی شبکه‌های اجتماعی (OpenGraph)
                  </h4>
                  <p className="text-[10px] text-slate-500">برای بهبود نمایش کارت مقاله در صورت به اشتراک‌گذاری در تلگرام، لینکدین، توییتر یا بله.</p>
                </div>

                {/* OpenGraph */}
                <div className="p-4 bg-slate-50/40 rounded-xl border border-slate-100 space-y-4">
                  <h5 className="text-xs font-bold text-slate-800">پیش‌نمایش OpenGraph (لینکدین و تلگرام)</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">عنوان اشتراک‌گذاری (OG Title)</label>
                      <input
                        type="text"
                        value={postData.ogTitle}
                        onChange={(e) => setPostData({ ...postData, ogTitle: e.target.value })}
                        placeholder="عنوان جذاب نمایشی"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">آدرس تصویر اشتراک‌گذاری (OG Image)</label>
                      <input
                        type="text"
                        value={postData.ogImage}
                        onChange={(e) => setPostData({ ...postData, ogImage: e.target.value })}
                        placeholder="آدرس عکس سایز ۱۲۰۰ در ۶۳۰"
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all font-mono text-left"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">توضیحات کوتاه اشتراک‌گذاری (OG Description)</label>
                    <textarea
                      rows={2}
                      value={postData.ogDescription}
                      onChange={(e) => setPostData({ ...postData, ogDescription: e.target.value })}
                      placeholder="خلاصه‌ای از مهم‌ترین نکات برای به اشترک‌گذاری..."
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-1.5 text-xs outline-hidden transition-all resize-none"
                    />
                  </div>
                </div>

                {/* Twitter / X card */}
                <div className="p-4 bg-slate-50/40 rounded-xl border border-slate-100 space-y-4">
                  <h5 className="text-xs font-bold text-slate-800">پیش‌نمایش توییتر (Twitter / X Card)</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">عنوان توییتر</label>
                      <input
                        type="text"
                        value={postData.twitterTitle}
                        onChange={(e) => setPostData({ ...postData, twitterTitle: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 block">تصویر توییتر</label>
                      <input
                        type="text"
                        value={postData.twitterImage}
                        onChange={(e) => setPostData({ ...postData, twitterImage: e.target.value })}
                        dir="ltr"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-2 text-xs outline-hidden transition-all font-mono text-left"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 block">توضیحات توییتر</label>
                    <textarea
                      rows={2}
                      value={postData.twitterDescription}
                      onChange={(e) => setPostData({ ...postData, twitterDescription: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-4 py-1.5 text-xs outline-hidden transition-all resize-none"
                    />
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Form Actions Footer */}
          <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-between items-center">
            {/* Status Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-bold">وضعیت انتشار:</span>
              <select
                disabled={isSeoOnlyRole}
                value={postData.status}
                onChange={(e) => setPostData({ ...postData, status: e.target.value })}
                className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold outline-hidden focus:border-slate-800"
              >
                <option value="draft">پیش‌نویس (Draft)</option>
                <option value="published">منتشر شده (Published)</option>
              </select>
            </div>

            {/* Save Buttons */}
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-all disabled:opacity-50 shadow-sm"
              >
                <Save className="h-4 w-4" />
                {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره نهایی مقاله'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/super-admin/blog')}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-5 rounded-xl text-xs transition-all"
              >
                انصراف
              </button>
            </div>
          </div>

        </form>

        {/* Real-time SEO Checks Auditor Card */}
        {isAdvancedMode && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
            <h4 className="text-xs font-black text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              سیستم ممیزی و بازرسی سئو سنتی و سئو هوش مصنوعی (Auditor)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {seoChecks.map((check, i) => (
                <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-50 bg-slate-50/20">
                  {check.passed ? (
                    <span className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">✓</span>
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-red-50 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">×</span>
                  )}
                  <div className="text-xs">
                    <p className={`font-bold ${check.passed ? 'text-slate-800' : 'text-slate-500'}`}>{check.label}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{check.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* RIGHT COLUMN: AI Sidebar Panel (4 cols) */}
      {showAiSidebar && (
        <div className="xl:col-span-4 space-y-6">
          
          {/* Sticky AI Sidebar Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 sticky top-20">
            <div>
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-5 w-5 text-violet-600" />
                دستیار نویسنده تخصصی هوش مصنوعی
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">تولید، بازنویسی و غنی‌سازی سرفصل‌ها و خلاصه‌ها بدون تخریب متن اصلی به صورت دستی</p>
            </div>

          {/* Prompt options layout */}
          <div className="space-y-4">
            {/* Action Select tool */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 block">انتخاب ابزار هوش مصنوعی</label>
              <select
                value={aiAction}
                onChange={(e) => setAiAction(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-2 py-2 text-xs font-bold outline-hidden transition-all"
              >
                {aiToolsList.map((group, gIdx) => (
                  <optgroup key={gIdx} label={group.group}>
                    {group.tools.map(tool => (
                      <option key={tool.action} value={tool.action}>{tool.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Description of active tool */}
            <div className="bg-violet-50 text-[10px] text-violet-800 p-2.5 rounded-xl font-bold">
              {(() => {
                let desc = '';
                aiToolsList.forEach(g => {
                  const t = g.tools.find(tool => tool.action === aiAction);
                  if (t) desc = t.desc;
                });
                return desc;
              })()}
            </div>

            {/* AI Topic text input */}
            {['generate_ideas', 'generate_outline', 'generate_seo_metadata', 'generate_schema', 'generate_external_references'].includes(aiAction) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 block">موضوع مقاله (Topic Context)</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  placeholder="موضوع دلخواه..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs outline-hidden transition-all"
                />
              </div>
            )}

            {/* AI Keyword input */}
            {['generate_outline', 'generate_section', 'generate_direct_answer', 'generate_seo_metadata', 'generate_schema'].includes(aiAction) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 block">کلیدواژه هدف (Focus Keyword)</label>
                <input
                  type="text"
                  value={aiKeyword}
                  onChange={(e) => setAiKeyword(e.target.value)}
                  placeholder="کلیدواژه متناظر..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs outline-hidden transition-all"
                />
              </div>
            )}

            {/* Section Title input for Section generator */}
            {aiAction === 'generate_section' && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 block">عنوان بخش / سرصفحه (H2/H3 Title)</label>
                <input
                  type="text"
                  value={sectionTitle}
                  onChange={(e) => setSectionTitle(e.target.value)}
                  placeholder="سرصفحه‌ای که قصد نگارش آن را دارید..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs outline-hidden transition-all"
                />
              </div>
            )}

            {/* Selected Text box for Paraphrasing/Rewriting tools */}
            {['improve_readability', 'paraphrase', 'make_professional', 'make_conversational', 'add_persian_idioms', 'shorten_text', 'expand_text', 'translate_or_adapt'].includes(aiAction) && (
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-500 block">متن منتخب جهت بازنویسی/بهبود (Selected Text)</label>
                <textarea
                  rows={4}
                  value={aiSelectedText}
                  onChange={(e) => setAiSelectedText(e.target.value)}
                  placeholder="یک بخش از متن را کپی و اینجا قرار دهید تا مدل آن را صیقل دهد..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-1.5 text-xs outline-hidden transition-all resize-none font-mono"
                />
              </div>
            )}

            {/* Trigger buttons */}
            <button
              type="button"
              disabled={aiLoading}
              onClick={handleAiGenerate}
              className="w-full flex items-center justify-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              {aiLoading ? 'در حال پردازش هوش مصنوعی...' : 'شروع تولید محتوای سه‌بعدی'}
            </button>
          </div>

          {/* AI Output preview card */}
          {(aiResult || aiError) && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-500">خروجی هوش مصنوعی</span>
                {aiModelUsed && (
                  <span className="text-[9px] text-slate-400 font-bold bg-slate-50 px-2 py-0.5 rounded-md font-mono" title="مدل به کار رفته">{aiModelUsed.split('/').pop()}</span>
                )}
              </div>

              {aiError && (
                <div className="bg-red-50 border border-red-100 text-red-800 p-3 rounded-xl flex items-center gap-1.5 text-[10px] font-medium leading-relaxed">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiResult && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl text-[11px] leading-relaxed text-slate-700 font-mono whitespace-pre-wrap max-h-64 overflow-y-auto select-all" dir="auto">
                    {aiResult}
                  </div>
                  
                  {/* Insert Actions Panel */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* Insert into main Editor content */}
                    {aiAction === 'generate_section' && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiResult('content')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        <CornerDownLeft className="h-3 w-3" /> درج در ادیتور اصلی
                      </button>
                    )}

                    {/* Insert specific fields */}
                    {aiAction === 'generate_direct_answer' && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiResult('geoSummary')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        درج در خلاصه موتور پاسخگو
                      </button>
                    )}

                    {aiAction === 'generate_key_takeaways' && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiResult('keyTakeaways')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        درج در نکات کلیدی
                      </button>
                    )}

                    {aiAction === 'generate_faq' && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiResult('faqSection')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        درج در بخش FAQ
                      </button>
                    )}

                    {aiAction === 'generate_schema' && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiResult('structuredData')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        درج در اسکیما داده ساختاریافته
                      </button>
                    )}

                    {aiAction === 'generate_seo_metadata' && (
                      <button
                        type="button"
                        onClick={() => handleInsertAiResult('seoMetadata')}
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-1.5 rounded-lg text-[10px] flex items-center justify-center gap-1 transition-all"
                      >
                        درج در عنوان/دیسکریپشن متا
                      </button>
                    )}

                    {/* Copy to clipboard fallback */}
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(aiResult);
                        alert('محتوا با موفقیت در حافظه موقت کپی گردید.');
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold p-1.5 rounded-lg text-[10px]"
                      title="کپی محتوا"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
      )}

      {/* MODAL: ADD CATEGORY */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-black text-slate-800 text-xs">ثبت دسته‌بندی موضوعی جدید</h4>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddCategory} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">نام دسته‌بندی</label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: بازاریابی آنلاین"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs outline-hidden"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">اسلاگ یکتا (URL Slug)</label>
                <input
                  type="text"
                  required
                  value={newCatSlug}
                  onChange={(e) => setNewCatSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                  placeholder="online-marketing"
                  dir="ltr"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs outline-hidden font-mono text-left"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs">ثبت دسته‌بندی</button>
                <button type="button" onClick={() => setIsCategoryModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD TAG */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-sm overflow-hidden animate-scaleIn">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="font-black text-slate-800 text-xs">ثبت برچسب جدید</h4>
              <button onClick={() => setIsTagModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>
            <form onSubmit={handleAddTag} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 block">نام برچسب (کلیدواژه)</label>
                <input
                  type="text"
                  required
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="مثال: فروش اینترنتی"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-slate-800 rounded-xl px-3 py-2 text-xs outline-hidden"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button type="submit" className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 rounded-lg text-xs">ثبت برچسب</button>
                <button type="button" onClick={() => setIsTagModalOpen(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg text-xs">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
