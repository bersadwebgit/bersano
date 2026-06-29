'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Review {
  id: string;
  rating: number;
  comment: string;
  isBuyer: boolean;
  createdAt: string;
  likes?: number;
  dislikes?: number;
  images?: string | null;
  user: {
    name: string | null;
  };
}

interface ProductTabsProps {
  productId: string;
  fullDescription?: string | null;
  specs?: string | null;
  reviews?: Review[];
  faqs?: string | null;
}

function cleanAndFormatDescription(desc: string | null | undefined): string {
  if (!desc) return '';
  
  let clean = desc;
  const blogCards: string[] = [];
  
  // Extract blog cards/links first to prevent them from being stripped during cleaning
  while (true) {
    const match = clean.match(/<div\s+[^>]*class="[^"]*bg-blue-50[^"]*"[^>]*>/);
    if (!match || match.index === undefined) {
      break;
    }
    
    const index = match.index;
    let openDivs = 0;
    let endIndex = -1;
    
    for (let i = index; i < clean.length; i++) {
      if (clean.substring(i, i + 4) === '<div') {
        openDivs++;
      } else if (clean.substring(i, i + 6) === '</div>') {
        openDivs--;
        if (openDivs === 0) {
          endIndex = i + 6;
          break;
        }
      }
    }
    
    if (endIndex !== -1) {
      const card = clean.substring(index, endIndex);
      blogCards.push(card);
      clean = clean.substring(0, index) + clean.substring(endIndex);
    } else {
      break;
    }
  }

  const searchTerms = [
    'اطلاعات تکمیلی یافت شده',
    '### اطلاعات تکمیلی',
    'اطلاعات تکمیلی'
  ];
  
  for (const term of searchTerms) {
    const index = clean.indexOf(term);
    if (index !== -1) {
      const before = clean.substring(0, index);
      const lastH3 = before.lastIndexOf('<h3');
      if (lastH3 !== -1) {
        clean = clean.substring(0, lastH3).trim();
      } else {
        clean = before.trim();
      }
      break;
    }
  }
  
  // Remove trailing horizontal lines or markdown separators
  clean = clean.replace(/<hr\s*\/?>\s*$/, '').replace(/---\s*$/, '').trim();
  
  // Spacing fix: Check if it's HTML. If it is HTML, do not replace \n with <br/>.
  const isHtml = /<\/?[a-z][\s\S]*>/i.test(clean);
  let formatted = isHtml ? clean : clean.replace(/\n/g, '<br/>');

  // Append any extracted blog cards back to the end of the formatted HTML
  if (blogCards.length > 0) {
    const separator = formatted.trim() ? '<p><br /></p>' : '';
    formatted = formatted.trim() + separator + blogCards.join('<p><br /></p>');
  }

  return formatted;
}

function normalizeKeyValuePairs(data: any): Record<string, string> {
  if (!data) return {};
  
  let parsed: any;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      return {};
    }
  } else {
    parsed = data;
  }

  if (!parsed) return {};

  if (Array.isArray(parsed)) {
    const result: Record<string, string> = {};
    for (const item of parsed) {
      if (item && typeof item === 'object') {
        const k = item.key || item.name || item.label;
        const v = item.value;
        if (k && v !== undefined && v !== null) {
          result[String(k).trim()] = String(v).trim();
        }
      }
    }
    return result;
  }

  if (typeof parsed === 'object') {
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v !== undefined && v !== null && typeof v !== 'object') {
        result[k.trim()] = String(v).trim();
      } else if (v && typeof v === 'object') {
        const item = v as any;
        const subKey = item.key || item.name || k;
        const subVal = item.value !== undefined ? item.value : JSON.stringify(item);
        result[String(subKey).trim()] = String(subVal).trim();
      }
    }
    return result;
  }

  return {};
}

export default function ProductTabs({ productId, fullDescription, specs, reviews = [], faqs }: ProductTabsProps) {
  const [activeTab, setActiveTab] = useState<'desc' | 'specs' | 'reviews' | 'faqs'>('specs');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'most_liked' | 'most_disliked'>('newest');
  const [ratingFilter, setRatingFilter] = useState<'all' | '5' | 'negative'>('all');
  const [onlyWithImages, setOnlyWithImages] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [localInteractions, setLocalInteractions] = useState<Record<string, 'like' | 'dislike' | null>>({});
  const router = useRouter();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newImages = [...uploadedImages];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch('/api/reviews/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (res.ok && data.url) {
          newImages.push(data.url);
        } else {
          alert(data.error || 'خطا در آپلود تصویر');
        }
      } catch (err) {
        alert('خطا در ارتباط با سرور هنگام آپلود تصویر');
      }
    }

    setUploadedImages(newImages);
    setUploadingImage(false);
  };

  const removeUploadedImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const saved = localStorage.getItem('review_interactions');
    if (saved) {
      try {
        setLocalInteractions(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: '', type: '' });

    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment, images: uploadedImages }),
      });
      const data = await res.json();

      if (res.ok) {
        setMessage({ text: data.message, type: 'success' });
        setComment('');
        setRating(5);
        setUploadedImages([]);
        setTimeout(() => {
          setShowReviewForm(false);
          router.refresh();
        }, 3000);
      } else {
        setMessage({ text: data.error, type: 'error' });
      }
    } catch (_error) {
      setMessage({ text: 'خطا در ارتباط با سرور', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedSpecs = normalizeKeyValuePairs(specs);

  let parsedFaqs: { question: string; answer: string }[] = [];
  try {
    if (faqs) parsedFaqs = JSON.parse(faqs);
  } catch (e) {}

  const filteredReviews = reviews.filter(review => {
    // Rating Filter
    if (ratingFilter === '5' && review.rating !== 5) return false;
    if (ratingFilter === 'negative' && review.rating > 3) return false;

    // Only with images Filter
    if (onlyWithImages) {
      if (!review.images) return false;
      try {
        const parsedImages = JSON.parse(review.images);
        if (!Array.isArray(parsedImages) || parsedImages.length === 0) return false;
      } catch (e) {
        return false;
      }
    }

    return true;
  });

  const sortedReviews = [...filteredReviews].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'most_liked':
        return (b.likes || 0) - (a.likes || 0);
      case 'most_disliked':
        return (b.dislikes || 0) - (a.dislikes || 0);
      default:
        return 0;
    }
  });

  const handleInteraction = async (reviewId: string, type: 'like' | 'dislike') => {
    const current = localInteractions[reviewId];
    let action = '';
    let newType: 'like' | 'dislike' | null = null;

    if (current === type) {
      action = type === 'like' ? 'remove_like' : 'remove_dislike';
      newType = null;
    } else if (current) {
      action = type === 'like' ? 'switch_to_like' : 'switch_to_dislike';
      newType = type;
    } else {
      action = type;
      newType = type;
    }

    const newInteractions = { ...localInteractions, [reviewId]: newType };
    setLocalInteractions(newInteractions);
    localStorage.setItem('review_interactions', JSON.stringify(newInteractions));

    try {
      const res = await fetch(`/api/reviews/${reviewId}/interact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        router.refresh();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="mt-8 bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden lg:col-span-2 w-full max-w-6xl mx-auto">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-100 dark:border-gray-800 overflow-x-auto hide-scrollbar">
        <button 
          onClick={() => setActiveTab('specs')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-bold text-center transition-colors border-b-2 ${activeTab === 'specs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          مشخصات فنی
        </button>
        <button 
          onClick={() => setActiveTab('desc')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-bold text-center transition-colors border-b-2 ${activeTab === 'desc' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          نقد و بررسی
        </button>
        <button 
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 min-w-[120px] py-3 text-xs font-bold text-center transition-colors border-b-2 ${activeTab === 'reviews' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
        >
          نظرات کاربران
        </button>
        {parsedFaqs.length > 0 && (
          <button 
            onClick={() => setActiveTab('faqs')}
            className={`flex-1 min-w-[120px] py-3 text-xs font-bold text-center transition-colors border-b-2 ${activeTab === 'faqs' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            سوالات متداول
          </button>
        )}
      </div>

      {/* Tabs Content */}
      <div className="p-4 lg:p-6">
        {/* Description Tab */}
        {activeTab === 'desc' && (
          <div className="animate-in fade-in duration-300">
            <div>
              <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-3">معرفی کامل محصول</h3>
              {fullDescription ? (
                <div 
                  className="text-xs max-w-none text-gray-600 dark:text-gray-400 leading-loose text-justify break-words [&>p]:mb-4 [&>h1]:text-sm [&>h1]:font-bold [&>h1]:mb-4 [&>h2]:text-xs [&>h2]:font-bold [&>h2]:mb-3 [&>h3]:text-xs [&>h3]:font-bold [&>h3]:mb-2 [&>ul]:list-disc [&>ul]:mr-5 [&>ul]:mb-4 [&>ol]:list-decimal [&>ol]:mr-5 [&>ol]:mb-4 [&_img]:max-w-full md:[&_img]:max-w-[400px] [&_img]:max-h-[350px] [&_img]:h-auto [&_img]:mx-auto [&_img]:rounded-xl [&_img]:shadow-sm [&_img]:my-4 [&_img]:border [&_img]:border-slate-100/50 dark:[&_img]:border-slate-800/80 [&_img]:object-contain [&_img]:block transition-transform duration-300 hover:[&_img]:scale-[1.01]"
                  dangerouslySetInnerHTML={{ __html: cleanAndFormatDescription(fullDescription) }}
                />
              ) : (
                <p className="text-gray-500 italic">نقد و بررسی کاملی برای این محصول ثبت نشده است.</p>
              )}
            </div>
          </div>
        )}

        {/* Specs Tab */}
        {activeTab === 'specs' && (
          <div className="animate-in fade-in duration-300">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-4">مشخصات فنی</h3>
            {Object.keys(parsedSpecs).length > 0 ? (
              <div className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                {Object.entries(parsedSpecs).map(([key, value], index) => (
                  <div key={key} className={`flex flex-col sm:flex-row p-3 gap-2 sm:gap-4 ${index !== Object.keys(parsedSpecs).length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''} ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : 'bg-white dark:bg-gray-900'}`}>
                    <div className="sm:w-1/3 text-gray-500 font-medium text-xs">{key}</div>
                    <div className="sm:w-2/3 text-gray-900 dark:text-white break-words text-xs">{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">مشخصات فنی برای این محصول ثبت نشده است.</p>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div className="animate-in fade-in duration-300">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-bold text-gray-900 dark:text-white">نظرات کاربران</h3>
              <button 
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-4 py-2 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg font-bold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                {showReviewForm ? 'انصراف' : 'ثبت نظر جدید'}
              </button>
            </div>
            
            {showReviewForm && (
              <form onSubmit={handleReviewSubmit} className="mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2">امتیاز شما</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(star => (
                      <button 
                        key={star} 
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 focus:outline-none transition-transform hover:scale-110"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={star <= rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={star <= rating ? "text-yellow-400" : "text-gray-300"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mb-4">
                  <label htmlFor="comment" className="block text-xs font-bold text-gray-900 dark:text-white mb-2">دیدگاه شما</label>
                  <textarea 
                    id="comment" 
                    rows={4} 
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white resize-none text-xs"
                    placeholder="نقطه نظرات خود را درباره این محصول بنویسید..."
                  ></textarea>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-900 dark:text-white mb-2">تصاویر محصول (اختیاری)</label>
                  <div className="flex flex-wrap gap-3 items-center">
                    <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/10 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                      <span className="text-[10px] text-gray-500 mt-1">افزودن عکس</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={handleImageUpload} 
                        className="hidden" 
                        disabled={uploadingImage}
                      />
                    </label>

                    {uploadedImages.map((imgUrl, index) => (
                      <div key={index} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                        <img src={imgUrl} alt="آپلود شده" className="w-full h-full object-cover" />
                        <button 
                          type="button"
                          onClick={() => removeUploadedImage(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}

                    {uploadingImage && (
                      <div className="w-20 h-20 flex items-center justify-center border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      </div>
                    )}
                  </div>
                </div>
                
                {message.text && (
                  <div className={`p-3 rounded-xl mb-4 text-xs font-medium ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400'}`}>
                    {message.text}
                  </div>
                )}
                
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-70 disabled:cursor-not-allowed text-xs"
                >
                  {isSubmitting ? 'در حال ثبت...' : 'ثبت دیدگاه'}
                </button>
              </form>
            )}

            {reviews.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-gray-50 dark:bg-gray-800/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Sort */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">مرتب‌سازی:</span>
                      <select 
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'most_liked' | 'most_disliked')}
                        className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-700 dark:text-gray-300"
                      >
                        <option value="newest">جدیدترین</option>
                        <option value="oldest">قدیمی‌ترین</option>
                        <option value="most_liked">بیشترین لایک</option>
                        <option value="most_disliked">بیشترین دیسلایک</option>
                      </select>
                    </div>

                    {/* Rating Filter */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">امتیاز:</span>
                      <select 
                        value={ratingFilter}
                        onChange={(e) => setRatingFilter(e.target.value as 'all' | '5' | 'negative')}
                        className="text-xs bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 cursor-pointer text-gray-700 dark:text-gray-300"
                      >
                        <option value="all">همه امتیازها</option>
                        <option value="5">فقط ۵ ستاره</option>
                        <option value="negative">نظرات منفی (۳ ستاره و کمتر)</option>
                      </select>
                    </div>
                  </div>

                  {/* Only with images */}
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={onlyWithImages}
                      onChange={(e) => setOnlyWithImages(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">فقط نظرات عکس‌دار</span>
                  </label>
                </div>
                <div className="space-y-4">
                  {sortedReviews.map(review => {
                    const interaction = localInteractions[review.id];
                    
                    // We don't add the interaction locally because the server already updated it and router.refresh() fetches the latest count
                    const likesCount = review.likes || 0;
                    const dislikesCount = review.dislikes || 0;
                    
                    return (
                      <div 
                        key={review.id} 
                        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                          review.isBuyer 
                            ? 'bg-emerald-50/[0.15] dark:bg-emerald-950/[0.05] border-emerald-100/60 dark:border-emerald-900/30 shadow-sm' 
                            : 'bg-gray-50/40 dark:bg-gray-850/15 border-gray-100 dark:border-gray-800/70 shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold">
                            {review.user.name ? review.user.name.charAt(0) : 'U'}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-gray-900 dark:text-white">{review.user.name || 'کاربر مهمان'}</span>
                                {review.isBuyer && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] rounded-full font-bold border border-emerald-200/50 dark:border-emerald-900/30">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                                    خریدار تأیید شده
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-1">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-0.5">
                                  {[1, 2, 3, 4, 5].map(star => (
                                    <svg key={star} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={star <= review.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={star <= review.rating ? "text-yellow-400" : "text-gray-300"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                                  ))}
                                </div>
                                <span className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString('fa-IR')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-700 dark:text-gray-300 text-sm leading-loose break-words whitespace-pre-wrap pl-2 pr-2 sm:pr-12">
                          {review.comment}
                        </p>
                        
                        {review.images && (() => {
                          try {
                            const parsedImages = JSON.parse(review.images);
                            if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                              return (
                                <div className="flex flex-wrap gap-2 mt-3 pl-2 sm:pl-12">
                                  {parsedImages.map((imgUrl, idx) => (
                                    <div key={idx} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(imgUrl, '_blank')}>
                                      <img src={imgUrl} alt="تصویر نظر" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}
                        <div className="flex items-center justify-end gap-4 mt-3 pl-2">
                          <button 
                            onClick={() => handleInteraction(review.id, 'like')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-200 border text-xs font-bold ${
                              interaction === 'like' 
                                ? 'border-transparent bg-emerald-500 text-white shadow-sm shadow-emerald-500/25' 
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 dark:hover:border-emerald-900/40 dark:hover:bg-emerald-950/20 dark:hover:text-emerald-400'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={interaction === 'like' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg>
                            <span className="text-xs font-medium" style={{ minWidth: '0.5rem', textAlign: 'center' }}>{likesCount || '۰'}</span>
                          </button>
                          <button 
                            onClick={() => handleInteraction(review.id, 'dislike')}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full transition-all duration-200 border text-xs font-medium ${
                              interaction === 'dislike' 
                                ? 'border-transparent bg-rose-500 text-white shadow-sm shadow-rose-500/25' 
                                : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-400 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/20 dark:hover:text-rose-400'
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={interaction === 'dislike' ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path></svg>
                            <span className="text-xs font-medium" style={{ minWidth: '0.5rem', textAlign: 'center' }}>{dislikesCount || '۰'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-gray-400 mb-3"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 10h8"/><path d="M8 14h4"/></svg>
                <p className="text-gray-500 text-xs font-medium">اولین نفری باشید که نظر می‌دهید!</p>
              </div>
            )}
          </div>
        )}

        {/* FAQs Tab */}
        {activeTab === 'faqs' && parsedFaqs.length > 0 && (
          <div className="animate-in fade-in duration-300">
            <h3 className="text-xs font-bold text-gray-900 dark:text-white mb-4">پرسش و پاسخ‌های متداول</h3>
            <div className="space-y-4 text-right">
              {parsedFaqs.map((faq, index) => (
                <div key={index} className="p-4 bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl border border-gray-100/50 dark:border-gray-800/30">
                  <h4 className="text-xs font-black text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-2">
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black">؟</span>
                    {faq.question}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-loose pr-7">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}