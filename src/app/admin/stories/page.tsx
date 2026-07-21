// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import { Story } from '@/types';
import { 
  Plus, Trash2, Eye, EyeOff, Image as ImageIcon, Search, Edit, 
  Sparkles, Wand2, Check, AlertTriangle, Loader2, X, Link, Clock, 
  MapPin, FolderOpen, RefreshCw 
} from 'lucide-react';
import Image from 'next/image';
import MediaPicker from '@/components/MediaPicker';

export default function AdminStoriesPage() {
  const [stories, setStories] = useState<Story[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState<string>('all'); // 'all', 'both', 'custom', 'shop'
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Products & Blog Posts for AI Gallery Selector
  const [products, setProducts] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; slug: string }[]>([]);

  // AI Assistant State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [proposedActions, setProposedActions] = useState<any[]>([]);
  const [aiExplanation, setAiExplanation] = useState<string>('');
  const [aiWarnings, setAiWarnings] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Media Picker State
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [activeMediaField, setActiveMediaField] = useState<'mediaUrl' | 'thumbnailUrl' | null>(null);
  const [activeProposedIndex, setActiveProposedIndex] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    duration: 5,
    mediaUrl: '',
    thumbnailUrl: '',
    text: '',
    linkUrl: '',
    linkText: '',
    category: '',
    displayLocation: 'both' // 'shop', 'custom', 'both'
  });

  useEffect(() => {
    fetchStories();
    fetchCategories();
    fetchProductsAndPosts();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get('aiPrompt');
      if (promptParam) {
        setTimeout(() => {
          setAiPrompt(promptParam);
          document.getElementById('ai-assistant-section')?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    }
  }, []);

  async function fetchCategories() {
    try {
      const res = await fetch('/api/admin/categories');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.categories)) {
          setCategories(data.categories);
        }
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  }

  async function fetchProductsAndPosts() {
    try {
      const [productsRes, postsRes] = await Promise.all([
        fetch('/api/admin/products'),
        fetch('/api/admin/blog/posts')
      ]);
      if (productsRes.ok) {
        const data = await productsRes.json();
        if (data && Array.isArray(data.products)) {
          setProducts(data.products);
        }
      }
      if (postsRes.ok) {
        const data = await postsRes.json();
        if (data && Array.isArray(data.posts)) {
          setPosts(data.posts);
        }
      }
    } catch (error) {
      console.error('Failed to fetch products or posts:', error);
    }
  }

  async function fetchStories() {
    try {
      const res = await fetch('/api/stories');
      if (res.status === 401) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setStories(data);
      } else {
        console.error('Failed to fetch stories:', data);
        setStories([]);
      }
    } catch (error) {
      console.error('Failed to fetch stories:', error);
      setStories([]);
    } finally {
      setIsLoading(false);
    }
  }

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await fetch(`/api/stories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });
      fetchStories();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  const deleteStory = async (id: string) => {
    if (!confirm('آیا از حذف این استوری مطمئن هستید؟')) return;
    try {
      await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      fetchStories();
    } catch (error) {
      console.error('Failed to delete story:', error);
    }
  };

  const handleEditClick = (story: Story) => {
    setEditingStoryId(story.id);
    setFormData({
      title: story.title,
      duration: story.duration || 5,
      mediaUrl: story.mediaUrl,
      thumbnailUrl: story.thumbnailUrl,
      text: story.text || '',
      linkUrl: story.linkUrl || '',
      linkText: story.linkText || '',
      category: story.category || '',
      displayLocation: story.displayLocation || 'both'
    });
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveStory = async () => {
    if (!formData.title || !formData.mediaUrl || !formData.thumbnailUrl) {
      alert('لطفا فیلدهای ضروری (عنوان، لینک رسانه و کاور) را پر کنید.');
      return;
    }

    try {
      const url = editingStoryId ? `/api/stories/${editingStoryId}` : '/api/stories';
      const method = editingStoryId ? 'PUT' : 'POST';

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mediaType: formData.mediaUrl.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
        })
      });
      
      setIsAdding(false);
      setEditingStoryId(null);
      setFormData({
        title: '', duration: 5, mediaUrl: '', thumbnailUrl: '', text: '', linkUrl: '', linkText: '', category: '', displayLocation: 'both'
      });
      fetchStories();
    } catch (error) {
      console.error('Failed to save story:', error);
    }
  };

  const openMediaPicker = (field: 'mediaUrl' | 'thumbnailUrl', proposedIndex: number | null = null) => {
    setActiveMediaField(field);
    setActiveProposedIndex(proposedIndex);
    setShowMediaPicker(true);
  };

  const handleMediaSelect = (url: string) => {
    if (activeProposedIndex !== null) {
      // Update proposed action media
      setProposedActions(prev => {
        const updated = [...prev];
        if (activeMediaField) {
          updated[activeProposedIndex].data[activeMediaField] = url;
        }
        return updated;
      });
    } else if (activeMediaField) {
      setFormData(prev => ({ ...prev, [activeMediaField]: url }));
    }
    setShowMediaPicker(false);
    setActiveProposedIndex(null);
  };

  // AI Assistant Handlers
  const handleAiSubmit = async () => {
    if (!aiPrompt.trim() || isAiLoading) return;
    setIsAiLoading(true);
    setAiWarnings([]);
    setProposedActions([]);
    setAiExplanation('');

    try {
      const res = await fetch('/api/admin/stories/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: aiPrompt,
          stories
        })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطایی در پردازش هوش مصنوعی رخ داد.');
        return;
      }
      if (data.success) {
        setProposedActions(data.actions || []);
        setAiExplanation(data.explanation || '');
        setAiWarnings(data.warnings || []);
      } else {
        alert(data.explanation || 'هوش مصنوعی نتوانست دستور را پردازش کند.');
      }
    } catch (error) {
      console.error(error);
      alert('خطا در ارتباط با سرور.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleApplyProposedActions = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setSaveStatus('saving');
    setSaveError('');
    try {
      for (const action of proposedActions) {
        if (action.type === 'create') {
          const res = await fetch('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...action.data,
              mediaType: action.data.mediaUrl?.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
            })
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'خطا در ایجاد استوری');
          }
        } else if (action.type === 'update') {
          const res = await fetch(`/api/stories/${action.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...action.data,
              mediaType: action.data.mediaUrl?.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image'
            })
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'خطا در بروزرسانی استوری');
          }
        } else if (action.type === 'delete') {
          const res = await fetch(`/api/stories/${action.id}`, {
            method: 'DELETE'
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || 'خطا در حذف استوری');
          }
        } else if (action.type === 'create_discount') {
          // Call discounts API to create the discount code
          const discountRes = await fetch('/api/admin/discounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: action.data.code,
              discount: action.data.discount,
              type: action.data.type || 'percentage',
              firstOrderOnly: action.data.firstOrderOnly || false,
              isActive: action.data.isActive !== undefined ? action.data.isActive : true,
              maxUsesPerUser: action.data.maxUsesPerUser || 1
            })
          });
          
          if (!discountRes.ok) {
            const errData = await discountRes.json();
            // If it already exists, we can ignore it or log it
            if (errData.error && errData.error.includes('قبلاً تعریف شده است')) {
              console.log(`Discount code ${action.data.code} already exists, skipping creation.`);
            } else {
              throw new Error(errData.error || 'خطا در ایجاد کد تخفیف');
            }
          }
        }
      }
      setProposedActions([]);
      setAiExplanation('');
      setAiPrompt('');
      setSaveStatus('saved');
      fetchStories();
      alert('تغییرات با موفقیت اعمال و ذخیره شدند.');
    } catch (error: any) {
      console.error('Failed to apply actions:', error);
      setSaveError(error.message || 'برخی از تغییرات ممکن است به درستی ذخیره نشده باشند.');
      setSaveStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get source images (main image + gallery)
  const getSourceImages = (sourceId: string, sourceType: 'product' | 'post') => {
    if (sourceType === 'product') {
      const prod = products.find(p => p.id === sourceId);
      if (!prod) return [];
      let gallery: string[] = [];
      if (prod.galleryUrls) {
        try {
          gallery = typeof prod.galleryUrls === 'string' ? JSON.parse(prod.galleryUrls) : prod.galleryUrls;
        } catch (e) {
          gallery = [];
        }
      }
      const images = [];
      if (prod.imageUrl) images.push(prod.imageUrl);
      if (Array.isArray(gallery)) {
        gallery.forEach(url => {
          if (url && url !== prod.imageUrl) images.push(url);
        });
      }
      return images;
    } else if (sourceType === 'post') {
      const post = posts.find(p => p.id === sourceId);
      if (!post) return [];
      return post.featuredImage ? [post.featuredImage] : [];
    }
    return [];
  };

  const getSourceTitle = (sourceId: string, sourceType: 'product' | 'post') => {
    if (sourceType === 'product') {
      return products.find(p => p.id === sourceId)?.title || 'محصول مرتبط';
    } else if (sourceType === 'post') {
      return posts.find(p => p.id === sourceId)?.title || 'مقاله مرتبط';
    }
    return '';
  };

  const filteredStories = stories.filter(story => {
    const matchesSearch = story.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLocation = filterLocation === 'all' || story.displayLocation === filterLocation;
    return matchesSearch && matchesLocation;
  });

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* هدر صفحه */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
              <span className="p-2 bg-blue-600/10 text-blue-600 rounded-2xl dark:bg-blue-500/10 dark:text-blue-400">
                <Sparkles size={28} />
              </span>
              مدیریت استوری‌ها
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5">استوری‌های فروشگاه خود را به صورت دستی یا با کمک دستیار هوشمند ایجاد و مدیریت کنید.</p>
          </div>
          <button 
            onClick={() => {
              setIsAdding(!isAdding);
              setEditingStoryId(null);
              setFormData({
                title: '', duration: 5, mediaUrl: '', thumbnailUrl: '', text: '', linkUrl: '', linkText: '', category: '', displayLocation: 'both'
              });
              setProposedActions([]);
            }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl transition-all duration-200 w-full sm:w-auto justify-center shadow-md hover:shadow-blue-500/20"
          >
            {isAdding ? <X size={20} /> : <Plus size={20} />}
            <span className="font-bold text-sm">{isAdding ? 'بستن فرم دستی' : 'افزودن استوری دستی'}</span>
          </button>
        </div>

        {/* بخش دستیار هوشمند (AI Assistant) */}
        {!isAdding && (
          <div id="ai-assistant-section" className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-xs border border-purple-100 dark:border-purple-900/30 mb-8">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-purple-600 text-white">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-800 dark:text-white">دستیار هوشمند استوری (کنترل با پرامپت)</h2>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed mt-0.5">
                  با نوشتن دستورهای متنی ساده، استوری‌های جذاب از محصولات و مقالات بسازید یا استوری‌های موجود را ویرایش و حذف کنید!
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="مثال: از جدیدترین محصولم یک استوری با تخفیف ویژه بساز و دکمه خرید بذار..."
                  className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAiSubmit();
                    }
                  }}
                  disabled={isAiLoading}
                />
                <button
                  type="button"
                  disabled={isAiLoading || !aiPrompt.trim()}
                  onClick={handleAiSubmit}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>در حال پردازش...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>اعمال دستور</span>
                    </>
                  )}
                </button>
              </div>

              {/* Suggestions / Prompt Templates */}
              <div className="flex flex-wrap gap-1.5 pt-1.5">
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold self-center ml-1">پیشنهادها:</span>
                {[
                  { text: 'از آخرین محصول فروشگاه یک استوری جذاب بساز', label: 'ساخت استوری از آخرین محصول' },
                  { text: 'یک استوری برای جدیدترین مقاله وبلاگ ایجاد کن', label: 'ساخت استوری از آخرین مقاله' },
                  { text: 'مدت زمان تمام استوری‌ها را به ۱۰ ثانیه تغییر بده', label: 'تغییر مدت زمان استوری‌ها' }
                ].map((sug, idx) => (
                  <button
                    key={idx}
                    onClick={() => setAiPrompt(sug.text)}
                    className="text-[9px] bg-white hover:bg-purple-100 dark:bg-gray-900 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-100 dark:border-purple-900/40 px-2.5 py-1.5 rounded-lg transition-all cursor-pointer font-bold"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* نمایش پیشنهادات هوش مصنوعی (AI Proposed Actions) */}
        {proposedActions.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-blue-200 dark:border-blue-900/50 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-600 rounded-xl dark:bg-emerald-500/20 dark:text-emerald-400">
                  <Check size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">اقدامات پیشنهادی هوش مصنوعی</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">لطفاً تغییرات پیشنهادی زیر را بررسی، در صورت نیاز ویرایش و سپس ثبت نهایی کنید.</p>
                </div>
              </div>
              <button 
                onClick={() => { setProposedActions([]); setAiExplanation(''); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                title="انصراف"
              >
                <X size={20} />
              </button>
            </div>

            {/* توضیحات هوش مصنوعی */}
            {aiExplanation && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-4 rounded-2xl text-sm text-blue-800 dark:text-blue-300 leading-relaxed font-medium">
                💡 {aiExplanation}
              </div>
            )}

            {/* هشدارهای هوش مصنوعی */}
            {aiWarnings.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-4 rounded-2xl text-sm text-amber-800 dark:text-amber-300 space-y-1.5">
                <div className="flex items-center gap-2 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>هشدارهای منطقی:</span>
                </div>
                {aiWarnings.map((w, idx) => (
                  <p key={idx} className="text-xs pr-6">• {w}</p>
                ))}
              </div>
            )}

            {/* لیست کارت‌های تغییرات پیشنهادی */}
            <div className="space-y-6">
              {proposedActions.map((action, index) => {
                if (action.type === 'create_discount') {
                  return (
                    <div key={index} className="bg-gradient-to-tr from-amber-50 to-orange-50 dark:from-amber-950/10 dark:to-orange-950/10 p-6 rounded-2xl border border-amber-200 dark:border-amber-900/30 flex flex-col lg:flex-row gap-6 relative group">
                      <button 
                        onClick={() => setProposedActions(prev => prev.filter((_, i) => i !== index))}
                        className="absolute top-4 left-4 text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        title="حذف این مورد"
                      >
                        <Trash2 size={16} />
                      </button>

                      {/* پیش‌نمایش کارت تخفیف */}
                      <div className="w-full lg:w-64 shrink-0 flex flex-col items-center">
                        <span className="text-xs font-bold text-gray-400 mb-2">پیش‌نمایش کد تخفیف</span>
                        <div className="w-56 h-36 rounded-2xl overflow-hidden relative bg-gradient-to-r from-amber-500 to-orange-500 shadow-md border border-amber-400 flex flex-col justify-between p-4 text-white">
                          <div className="flex justify-between items-start">
                            <span className="text-[10px] font-bold bg-white/20 px-2 py-0.5 rounded-full">کارت تخفیف</span>
                            <span className="text-xs font-black">
                              {action.data?.type === 'percentage' ? `${action.data?.discount}٪` : `${action.data?.discount?.toLocaleString('fa-IR')} تومان`}
                            </span>
                          </div>
                          <div className="text-center my-2">
                            <span className="text-sm font-black tracking-widest bg-white text-orange-600 px-3 py-1 rounded-lg border-2 border-dashed border-orange-400 inline-block select-all">
                              {action.data?.code || 'COUPON'}
                            </span>
                          </div>
                          <div className="text-[9px] text-white/80 text-center font-bold">
                            {action.data?.firstOrderOnly ? 'مخصوص اولین خرید' : 'تخفیف عمومی'}
                          </div>
                        </div>
                      </div>

                      {/* فرم ویرایش کد تخفیف */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                            ایجاد کد تخفیف واقعی در سیستم
                          </span>
                          {action.data?.explanation && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {action.data.explanation}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">کد تخفیف (انگلیسی)</label>
                            <input 
                              type="text" 
                              value={action.data?.code || ''}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.code = e.target.value.toUpperCase();
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left font-mono" 
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">میزان تخفیف</label>
                            <input 
                              type="number" 
                              value={action.data?.discount || 0}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.discount = parseFloat(e.target.value) || 0;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">نوع تخفیف</label>
                            <select 
                              value={action.data?.type || 'percentage'}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.type = e.target.value;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                            >
                              <option value="percentage">درصدی</option>
                              <option value="flat">مبلغ ثابت (تومان)</option>
                            </select>
                          </div>
                          <div className="flex items-center gap-2 pt-5">
                            <input 
                              type="checkbox" 
                              id={`firstOrderOnly-${index}`}
                              checked={action.data?.firstOrderOnly || false}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.firstOrderOnly = e.target.checked;
                                  return updated;
                                });
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={`firstOrderOnly-${index}`} className="text-xs font-bold text-gray-600 dark:text-gray-300 select-none">
                              فقط برای اولین خرید معتبر باشد
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                const sourceImages = action.sourceId && action.sourceType ? getSourceImages(action.sourceId, action.sourceType) : [];
                const sourceTitle = action.sourceId && action.sourceType ? getSourceTitle(action.sourceId, action.sourceType) : '';
                
                return (
                  <div key={index} className="bg-gray-50 dark:bg-slate-950 p-5 rounded-2xl border border-gray-200 dark:border-gray-800/80 flex flex-col lg:flex-row gap-6 relative group">
                    <button 
                      onClick={() => setProposedActions(prev => prev.filter((_, i) => i !== index))}
                      className="absolute top-4 left-4 text-gray-400 hover:text-red-500 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      title="حذف این مورد"
                    >
                      <Trash2 size={16} />
                    </button>

                    {/* پیش‌نمایش استوری موبایل */}
                    <div className="w-full lg:w-64 shrink-0 flex flex-col items-center">
                      <span className="text-xs font-bold text-gray-400 mb-2">پیش‌نمایش استوری</span>
                      <div className="w-56 h-96 rounded-3xl overflow-hidden relative bg-slate-900 shadow-md border border-gray-300 dark:border-gray-800 flex flex-col justify-between p-4">
                        {/* هدر استوری */}
                        <div className="flex items-center gap-2 z-10 bg-gradient-to-b from-black/50 to-transparent absolute top-0 left-0 right-0 p-3">
                          <div className="w-7 h-7 rounded-full overflow-hidden relative border border-white/40">
                            <Image src={action.data?.thumbnailUrl || '/globe.svg'} alt="Cover" fill className="object-cover" />
                          </div>
                          <span className="text-[10px] text-white font-bold truncate">{action.data?.title || 'عنوان استوری'}</span>
                        </div>

                        {/* تصویر پس‌زمینه */}
                        {action.data?.mediaUrl ? (
                          <Image src={action.data.mediaUrl} alt="Media" fill className="object-cover opacity-80" />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-gray-500 text-xs">فاقد رسانه</div>
                        )}

                        {/* متن روی استوری */}
                        {action.data?.text && (
                          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 z-10 text-center">
                            <p className="text-white text-sm font-bold bg-black/40 px-3 py-2 rounded-xl backdrop-blur-sm leading-relaxed">
                              {action.data.text}
                            </p>
                          </div>
                        )}

                        {/* دکمه لینک در پایین */}
                        {action.data?.linkUrl && (
                          <div className="w-full z-10 mt-auto flex justify-center pb-2">
                            <div className="bg-white text-black text-[10px] font-extrabold px-5 py-2 rounded-full shadow-md truncate max-w-full">
                              {action.data.linkText || 'مشاهده لینک'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* فرم ویرایش تغییر پیشنهادی */}
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                          action.type === 'create' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' :
                          action.type === 'update' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                          'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
                        }`}>
                          {action.type === 'create' ? 'ایجاد جدید' : action.type === 'update' ? 'ویرایش موجود' : 'حذف استوری'}
                        </span>
                        {sourceTitle && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            مرتبط با: <strong className="text-gray-700 dark:text-gray-200">{sourceTitle}</strong>
                          </span>
                        )}
                      </div>

                      {action.type !== 'delete' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">عنوان استوری</label>
                            <input 
                              type="text" 
                              value={action.data?.title || ''}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.title = e.target.value;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">مدت زمان (ثانیه)</label>
                            <input 
                              type="number" 
                              value={action.data?.duration || 5}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.duration = parseInt(e.target.value) || 5;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                              dir="ltr"
                            />
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">متن روی استوری</label>
                            <input 
                              type="text" 
                              value={action.data?.text || ''}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.text = e.target.value;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">لینک دکمه</label>
                            <input 
                              type="text" 
                              value={action.data?.linkUrl || ''}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.linkUrl = e.target.value;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                              dir="ltr"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">متن دکمه</label>
                            <input 
                              type="text" 
                              value={action.data?.linkText || ''}
                              onChange={e => {
                                setProposedActions(prev => {
                                  const updated = [...prev];
                                  updated[index].data.linkText = e.target.value;
                                  return updated;
                                });
                              }}
                              className="w-full p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs" 
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">آدرس رسانه اصلی</label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text" 
                                value={action.data?.mediaUrl || ''}
                                onChange={e => {
                                  setProposedActions(prev => {
                                    const updated = [...prev];
                                    updated[index].data.mediaUrl = e.target.value;
                                    return updated;
                                  });
                                }}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                                dir="ltr"
                              />
                              <button 
                                onClick={() => openMediaPicker('mediaUrl', index)}
                                className="px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center"
                                title="انتخاب از رسانه‌ها"
                              >
                                <Search size={14} />
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">آدرس کاور استوری</label>
                            <div className="flex gap-1.5">
                              <input 
                                type="text" 
                                value={action.data?.thumbnailUrl || ''}
                                onChange={e => {
                                  setProposedActions(prev => {
                                    const updated = [...prev];
                                    updated[index].data.thumbnailUrl = e.target.value;
                                    return updated;
                                  });
                                }}
                                className="flex-1 p-2 border border-gray-300 dark:border-gray-800 rounded-xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xs text-left" 
                                dir="ltr"
                              />
                              <button 
                                onClick={() => openMediaPicker('thumbnailUrl', index)}
                                className="px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl transition-colors flex items-center justify-center"
                                title="انتخاب از رسانه‌ها"
                              >
                                <Search size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* گالری تصاویر محصول/مقاله جهت انتخاب سریع */}
                      {action.type !== 'delete' && sourceImages.length > 0 && (
                        <div className="border-t border-gray-200 dark:border-gray-800/80 pt-3 mt-3">
                          <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mb-2">
                            <ImageIcon size={14} className="text-blue-500" />
                            تصاویر موجود در گالری منبع (برای تغییر تصویر استوری کلیک کنید):
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {sourceImages.map((imgUrl, imgIdx) => (
                              <div 
                                key={imgIdx}
                                onClick={() => {
                                  setProposedActions(prev => {
                                    const updated = [...prev];
                                    updated[index].data.mediaUrl = imgUrl;
                                    updated[index].data.thumbnailUrl = imgUrl;
                                    return updated;
                                  });
                                }}
                                className={`w-14 h-14 rounded-xl overflow-hidden relative cursor-pointer border-2 transition-all ${
                                  action.data?.mediaUrl === imgUrl 
                                    ? 'border-blue-500 scale-105 ring-2 ring-blue-500/20' 
                                    : 'border-transparent hover:border-gray-400 dark:hover:border-gray-600'
                                }`}
                              >
                                <Image src={imgUrl} alt="Source Gallery" fill className="object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {saveError && (
              <div style={{ border: '1px solid var(--color-border-danger)', background: 'var(--color-background-danger)', padding: '12px 16px', borderRadius: '8px', color: 'var(--color-text-danger)' }} className="mb-4 font-bold text-xs text-right">
                ذخیره‌سازی ناموفق بود. تغییرات شما در این صفحه هنوز هستند. دوباره تلاش کنید یا صفحه را نبندید.
                <div className="mt-1 font-normal text-[10px]">{saveError}</div>
              </div>
            )}

            {/* دکمه‌های تایید نهایی پیشنهادات */}
            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-800 pt-5">
              <button 
                onClick={() => { setProposedActions([]); setAiExplanation(''); setSaveError(''); setSaveStatus('idle'); }}
                disabled={isLoading}
                className="px-6 py-3 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
              >
                انصراف و حذف همه
              </button>
              <button 
                onClick={handleApplyProposedActions}
                disabled={isLoading}
                data-testid="save-status"
                data-status-state={saveStatus}
                className="px-8 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-bold text-sm shadow-md hover:shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Check size={18} />
                {isLoading ? 'در حال ثبت نهایی...' : 'ثبت و اعمال نهایی تغییرات'}
              </button>
            </div>
          </div>
        )}

        {/* فرم دستی افزودن یا ویرایش استوری */}
        {isAdding && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-800/80 mb-8 animate-in fade-in slide-in-from-top-4">
            <h2 className="text-xl font-extrabold mb-6 text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-1.5 h-6 bg-blue-600 rounded-full inline-block"></span>
              {editingStoryId ? 'ویرایش استوری دستی' : 'ایجاد استوری دستی جدید'}
            </h2>
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">عنوان استوری *</label>
                  <input 
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                    placeholder="مثال: تخفیف تابستانه" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">مدت زمان نمایش (ثانیه)</label>
                  <input 
                    type="number" 
                    value={formData.duration}
                    onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 5})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left" 
                    dir="ltr" 
                    placeholder="5" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">فایل اصلی (تصویر/ویدیو) *</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.mediaUrl}
                      onChange={e => setFormData({...formData, mediaUrl: e.target.value})}
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left" 
                      dir="ltr" 
                      placeholder="https://..." 
                    />
                    <button 
                      onClick={() => openMediaPicker('mediaUrl')}
                      className="px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl transition-colors flex items-center justify-center"
                      title="انتخاب از رسانه‌ها"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">کاور (تصویر بندانگشتی) *</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={formData.thumbnailUrl}
                      onChange={e => setFormData({...formData, thumbnailUrl: e.target.value})}
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left" 
                      dir="ltr" 
                      placeholder="https://..." 
                    />
                    <button 
                      onClick={() => openMediaPicker('thumbnailUrl')}
                      className="px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl transition-colors flex items-center justify-center"
                      title="انتخاب از رسانه‌ها"
                    >
                      <Search size={20} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">متن روی استوری (اختیاری)</label>
                <input 
                  type="text" 
                  value={formData.text}
                  onChange={e => setFormData({...formData, text: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                  placeholder="مثال: ۵۰٪ تخفیف فقط امروز!" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">لینک دکمه (اختیاری)</label>
                  <input 
                    type="text" 
                    value={formData.linkUrl}
                    onChange={e => setFormData({...formData, linkUrl: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-left" 
                    dir="ltr" 
                    placeholder="https://..." 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">متن دکمه لینک</label>
                  <input 
                    type="text" 
                    value={formData.linkText}
                    onChange={e => setFormData({...formData, linkText: e.target.value})}
                    className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                    placeholder="مثال: خرید محصول" 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">دسته‌بندی مرتبط (اختیاری)</label>
                <select 
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer"
                >
                  <option value="">بدون دسته‌بندی</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.slug}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">با انتخاب دسته‌بندی، کلیک روی این استوری محصولات را فیلتر می‌کند.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">محل نمایش استوری</label>
                <select 
                  value={formData.displayLocation}
                  onChange={e => setFormData({...formData, displayLocation: e.target.value})}
                  className="w-full p-3 border border-gray-300 dark:border-gray-800 rounded-2xl bg-transparent dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm cursor-pointer font-bold"
                >
                  <option value="both">هر دو صفحه (لندینگ و فروشگاه)</option>
                  <option value="custom">فقط در لندینگ پیج اختصاصی (Landing)</option>
                  <option value="shop">فقط در ویترین فروشگاه (Shop)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { setIsAdding(false); setEditingStoryId(null); }} className="px-5 py-2.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl font-medium transition-colors">انصراف</button>
                <button onClick={handleSaveStory} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium shadow-sm transition-colors">
                  {editingStoryId ? 'به‌روزرسانی استوری' : 'ذخیره استوری'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* لیست استوری‌های موجود */}
        {proposedActions.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-md border border-gray-200 dark:border-gray-800/80 overflow-hidden">
            
            {/* بخش فیلتر و جستجو */}
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-80">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="جستجو در عنوان استوری..."
                  className="w-full pr-11 pl-4 py-2.5 border border-gray-200 dark:border-gray-800 dark:bg-slate-950 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
                <span className="text-xs font-bold text-gray-400 shrink-0">فیلتر محل نمایش:</span>
                <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full sm:w-auto">
                  {[
                    { value: 'all', label: 'همه' },
                    { value: 'both', label: 'هر دو صفحه' },
                    { value: 'custom', label: 'فقط لندینگ' },
                    { value: 'shop', label: 'فقط فروشگاه' }
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFilterLocation(opt.value)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        filterLocation === opt.value
                          ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-sm'
                          : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* جدول استوری‌ها */}
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-gray-50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-400 w-24">کاور استوری</th>
                    <th className="p-4 text-xs font-bold text-gray-400">عنوان و جزئیات</th>
                    <th className="p-4 text-xs font-bold text-gray-400">وضعیت نمایش</th>
                    <th className="p-4 text-xs font-bold text-gray-400">تاریخ ایجاد</th>
                    <th className="p-4 text-xs font-bold text-gray-400 text-left pl-6">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredStories.map(story => (
                    <tr key={story.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors group">
                      <td className="p-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden relative bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-800">
                          <Image src={story.thumbnailUrl?.startsWith('/') || story.thumbnailUrl?.startsWith('http') ? story.thumbnailUrl : '/globe.svg'} alt={story.title} fill className="object-cover" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900 dark:text-white text-sm">{story.title}</div>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {story.linkUrl && (
                            <span className="text-[10px] bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                              <Link size={10} />
                              دارای لینک
                            </span>
                          )}
                          <span className="text-[10px] bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                            <MapPin size={10} />
                            نمایش: {
                              story.displayLocation === 'custom' ? 'فقط لندینگ' :
                              story.displayLocation === 'shop' ? 'فقط فروشگاه' : 'هر دو صفحه'
                            }
                          </span>
                          {story.duration && (
                            <span className="text-[10px] bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1">
                              <Clock size={10} />
                              {story.duration} ثانیه
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          story.isActive 
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                        }`}>
                          {story.isActive ? 'فعال' : 'مخفی شده'}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-500 dark:text-gray-400 font-medium" dir="ltr">
                        {new Date(story.createdAt).toLocaleDateString('fa-IR')}
                      </td>
                      <td className="p-4 text-left pl-6">
                        <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleEditClick(story)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                            title="ویرایش استوری"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => toggleStatus(story.id, story.isActive)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                            title={story.isActive ? "مخفی کردن" : "نمایش دادن"}
                          >
                            {story.isActive ? <Eye size={18} /> : <EyeOff size={18} />}
                          </button>
                          <button 
                            onClick={() => deleteStory(story.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="حذف استوری"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStories.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                          <ImageIcon size={56} className="mb-4 opacity-20 text-blue-600" />
                          <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">هیچ استوری یافت نشد</p>
                          <p className="text-sm">با تغییر فیلترها یا جستجوی عبارت دیگر، مجدداً تلاش کنید.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showMediaPicker && (
        <MediaPicker 
          onSelect={handleMediaSelect} 
          onClose={() => setShowMediaPicker(false)} 
          title={activeMediaField === 'mediaUrl' ? 'انتخاب فایل اصلی' : 'انتخاب کاور'}
        />
      )}
    </div>
  );
}
