'use client';

import { useState, useEffect } from 'react';
import { Trash2, CheckCircle, XCircle, Search, Filter, Plus, X, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface Review {
  id: string;
  rating: number;
  comment: string;
  status: string;
  isBuyer: boolean;
  showOnHomepage: boolean;
  images: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
  product: {
    title: string;
    imageUrl: string | null;
  };
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual review creation states
  const [products, setProducts] = useState<any[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualReview, setManualReview] = useState({
    productId: '',
    userName: '',
    avatarUrl: '',
    rating: 5,
    comment: '',
    isBuyer: true,
    showOnHomepage: false,
    images: [] as string[]
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);

  useEffect(() => {
    if (showAddModal && products.length === 0) {
      fetchProducts();
    }
  }, [showAddModal]);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/admin/products');
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (e) {
      console.error('Error fetching products:', e);
    }
  };

  const handleManualImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    const newImages = [...manualReview.images];

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

    setManualReview(prev => ({ ...prev, images: newImages }));
    setUploadingImage(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', files[0]);

    try {
      const res = await fetch('/api/reviews/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.url) {
        setManualReview(prev => ({ ...prev, avatarUrl: data.url }));
      } else {
        alert(data.error || 'خطا در آپلود عکس پروفایل');
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور هنگام آپلود عکس پروفایل');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const removeManualImage = (index: number) => {
    setManualReview(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualReview.productId || !manualReview.comment) {
      alert('لطفاً محصول و متن نظر را وارد کنید.');
      return;
    }

    setSubmittingManual(true);
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualReview)
      });

      if (res.ok) {
        setShowAddModal(false);
        setManualReview({
          productId: '',
          userName: '',
          avatarUrl: '',
          rating: 5,
          comment: '',
          isBuyer: true,
          showOnHomepage: false,
          images: []
        });
        fetchReviews(); // Refresh reviews list
      } else {
        const data = await res.json();
        alert(data.error || 'خطا در ثبت نظر');
      }
    } catch (err) {
      alert('خطا در ارتباط با سرور');
    } finally {
      setSubmittingManual(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter]);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reviews?status=${statusFilter}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.reviews) setReviews(data.reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleHomepageDisplay = async (id: string, currentVal: boolean) => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ showOnHomepage: !currentVal })
      });
      if (res.ok) {
        setReviews(reviews.map(r => r.id === id ? { ...r, showOnHomepage: !currentVal } : r));
      }
    } catch (error) {
      console.error('Error updating review homepage display:', error);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setReviews(reviews.map(r => r.id === id ? { ...r, status } : r));
      }
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm('آیا از حذف این نظر مطمئن هستید؟')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setReviews(reviews.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const filteredReviews = reviews.filter(r => 
    r.comment.includes(searchQuery) || 
    r.product.title.includes(searchQuery) ||
    (r.user.name && r.user.name.includes(searchQuery))
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">مدیریت نظرات</h1>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={18} /> ثبت نظر دستی
        </button>
      </div>

      {/* AI Prompt Control - Smart Assistant */}
      <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black text-slate-800 dark:text-white">دستیار هوشمند نظرات (کنترل با پرامپت)</h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed">
              با نوشتن دستورهای متنی به زبان ساده، نظرات مشتریان را تایید، رد یا حذف کنید، نظرات دستی جدید بسازید و گزارش‌های تحلیلی دریافت کنید!
            </p>
          </div>
        </div>
        <a
          href="/admin/agent"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white hover:from-indigo-500 hover:to-pink-500 transition-all font-black text-xs shadow-md hover:shadow-indigo-500/20 hover:-translate-y-0.5 active:scale-95 shrink-0"
        >
          <Sparkles size={13} className="animate-pulse text-pink-200" />
          <span>انتقال به حالت ایجنت یکپارچه ✨</span>
        </a>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-4 md:p-6">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="جستجو در نظرات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full md:w-48 pl-4 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="all">همه نظرات</option>
              <option value="pending">در انتظار تایید (ثبت شده توسط مشتریان)</option>
              <option value="approved">تایید شده (نمایش در صفحه محصول)</option>
              <option value="rejected">رد شده</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            هیچ نظری یافت نشد.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div key={review.id} className="border border-gray-100 dark:border-gray-800 rounded-xl p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {/* Product Info */}
                  <div className="flex items-center gap-4 md:w-1/4 shrink-0">
                    <div className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden relative">
                      {review.product.imageUrl ? (
                        <Image src={review.product.imageUrl} alt={review.product.title} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">بدون عکس</div>
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-gray-900 dark:text-white line-clamp-2">{review.product.title}</p>
                    </div>
                  </div>

                  {/* Review Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        {review.user.avatarUrl ? (
                          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800">
                            <img src={review.user.avatarUrl} alt="پروفایل" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold text-xs">
                            {review.user.name ? review.user.name.charAt(0) : 'U'}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">
                            {review.user.name || 'کاربر مهمان'}
                          </span>
                          {review.isBuyer && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px] rounded-full font-bold border border-emerald-200/50 dark:border-emerald-900/30">
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                              خریدار تأیید شده
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <svg key={i} xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill={i < review.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={i < review.rating ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        ))}
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                      {review.comment}
                    </p>

                    {review.images && (() => {
                      try {
                        const parsedImages = JSON.parse(review.images);
                        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-2 mb-4">
                              {parsedImages.map((imgUrl, idx) => (
                                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-50 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(imgUrl, '_blank')}>
                                  <img src={imgUrl} alt="تصویر نظر" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                    
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      ثبت شده در: {new Date(review.createdAt).toLocaleDateString('fa-IR')}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 md:w-32 border-t md:border-t-0 md:border-r border-gray-100 dark:border-gray-800 pt-4 md:pt-0 md:pr-4">
                    {review.status === 'pending' && (
                      <div className="flex gap-2 w-full">
                        <button 
                          onClick={() => updateStatus(review.id, 'approved')}
                          className="flex-1 flex items-center justify-center gap-1 bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 px-3 py-2 rounded-lg text-sm transition-colors"
                          title="تایید"
                        >
                          <CheckCircle size={16} /> تایید
                        </button>
                        <button 
                          onClick={() => updateStatus(review.id, 'rejected')}
                          className="flex-1 flex items-center justify-center gap-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 px-3 py-2 rounded-lg text-sm transition-colors"
                          title="رد"
                        >
                          <XCircle size={16} /> رد
                        </button>
                      </div>
                    )}
                    {review.status === 'approved' && (
                      <div className="w-full text-center px-3 py-2 rounded-lg text-sm bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 mb-1">
                        تایید شده
                      </div>
                    )}
                    {review.status === 'rejected' && (
                      <div className="w-full text-center px-3 py-2 rounded-lg text-sm bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 mb-1">
                        رد شده
                      </div>
                    )}

                    {/* Toggle Homepage Display Switch */}
                    {review.status === 'approved' && (
                      <button
                        onClick={() => toggleHomepageDisplay(review.id, review.showOnHomepage)}
                        className={`w-full text-center px-3 py-2 rounded-lg text-xs font-bold transition-all border ${
                          review.showOnHomepage
                            ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/40 dark:text-blue-400'
                            : 'bg-gray-50 border-gray-100 text-gray-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                        }`}
                      >
                        {review.showOnHomepage ? '✓ نمایش در صفحه اصلی' : 'نمایش در صفحه اصلی'}
                      </button>
                    )}
                    <button 
                      onClick={() => deleteReview(review.id)}
                      className="w-full flex items-center justify-center gap-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 px-3 py-2 rounded-lg text-sm transition-colors"
                    >
                      <Trash2 size={16} /> حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Review Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-100 dark:border-gray-800 p-6 relative">
            <button 
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">ثبت نظر دستی جدید</h2>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              {/* Product Selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">انتخاب محصول</label>
                <select
                  required
                  value={manualReview.productId}
                  onChange={(e) => setManualReview(prev => ({ ...prev, productId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">-- انتخاب کنید --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>

              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">نام مشتری</label>
                <input 
                  type="text"
                  placeholder="مثال: علی رضایی"
                  value={manualReview.userName}
                  onChange={(e) => setManualReview(prev => ({ ...prev, userName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Profile Picture / Avatar */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">عکس پروفایل مشتری (اختیاری)</label>
                <div className="flex items-center gap-4">
                  <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-full cursor-pointer hover:border-blue-500 hover:bg-blue-50/10 transition-colors overflow-hidden relative">
                    {manualReview.avatarUrl ? (
                      <img src={manualReview.avatarUrl} alt="پروفایل" className="w-full h-full object-cover" />
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        <span className="text-[8px] text-gray-500 mt-1">آپلود عکس</span>
                      </>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleAvatarUpload} 
                      className="hidden" 
                      disabled={uploadingAvatar}
                    />
                  </label>
                  {manualReview.avatarUrl && (
                    <button 
                      type="button"
                      onClick={() => setManualReview(prev => ({ ...prev, avatarUrl: '' }))}
                      className="text-xs text-red-500 hover:text-red-600 font-bold"
                    >
                      حذف عکس پروفایل
                    </button>
                  )}
                  {uploadingAvatar && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  )}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">امتیاز (۱ تا ۵)</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button 
                      key={star} 
                      type="button"
                      onClick={() => setManualReview(prev => ({ ...prev, rating: star }))}
                      className="p-1 focus:outline-none transition-transform hover:scale-110"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={star <= manualReview.rating ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={star <= manualReview.rating ? "text-yellow-400" : "text-gray-300"}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">متن نظر</label>
                <textarea 
                  rows={4} 
                  required
                  placeholder="دیدگاه مشتری را وارد کنید..."
                  value={manualReview.comment}
                  onChange={(e) => setManualReview(prev => ({ ...prev, comment: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                ></textarea>
              </div>

              {/* Verified Buyer Checkbox */}
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={manualReview.isBuyer}
                    onChange={(e) => setManualReview(prev => ({ ...prev, isBuyer: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">خریدار تأیید شده</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={manualReview.showOnHomepage}
                    onChange={(e) => setManualReview(prev => ({ ...prev, showOnHomepage: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-bold">نمایش در صفحه اصلی سایت</span>
                </label>
              </div>

              {/* Image Upload */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">تصاویر نظر (اختیاری)</label>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="w-16 h-16 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span className="text-[8px] text-gray-500 mt-1">افزودن عکس</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple 
                      onChange={handleManualImageUpload} 
                      className="hidden" 
                      disabled={uploadingImage}
                    />
                  </label>

                  {manualReview.images.map((imgUrl, index) => (
                    <div key={index} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800">
                      <img src={imgUrl} alt="آپلود شده" className="w-full h-full object-cover" />
                      <button 
                        type="button"
                        onClick={() => removeManualImage(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}

                  {uploadingImage && (
                    <div className="w-16 h-16 flex items-center justify-center border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-800">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="submit"
                  disabled={submittingManual}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-70"
                >
                  {submittingManual ? 'در حال ثبت...' : 'ثبت نظر'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
