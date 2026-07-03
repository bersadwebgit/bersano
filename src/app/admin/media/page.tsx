// [HARDENED] — validation, error isolation, save safety
'use client';

import { useState, useEffect } from 'react';
import { 
  Upload, 
  Image as ImageIcon, 
  Video, 
  Trash2, 
  X, 
  Save, 
  Edit2, 
  Sparkles, 
  CheckSquare, 
  Square, 
  Check, 
  Sliders, 
  HelpCircle,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react';
import Image from 'next/image';

interface Media {
  id: string;
  url: string;
  type: string;
  name: string;
  alt: string | null;
  size: number | null;
  createdAt: string;
  originalId?: string | null;
  originalUrl?: string | null;
}

export default function AdminMediaPage() {
  const [media, setMedia] = useState<Media[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [editName, setEditName] = useState('');
  const [editAlt, setEditAlt] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'processed' | 'original'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'largest' | 'smallest'>('newest');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Single BG Removal States
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [bgRemovalError, setBgRemovalError] = useState('');
  const [applySettingsOnSingleRemove, setApplySettingsOnSingleRemove] = useState(true);

  // Bulk Processing States
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkSuccess, setBulkSuccess] = useState(false);

  // Bulk Settings (fetched from shop defaults or set to standard)
  const [bulkSettings, setBulkSettings] = useState({
    removeBg: false,
    bgColor: '#ffffff',
    dimensions: 'square',
    subjectScale: 50,
    watermarkType: 'none',
    watermarkText: '',
    watermarkLogoUrl: '',
    watermarkOpacity: 0.25,
    watermarkPosition: 'center',
  });

  const [activePackage, setActivePackage] = useState<any>(null);
  const [bgRemovalCount, setBgRemovalCount] = useState<number>(0);

  // AI Control States
  const [promptInput, setPromptInput] = useState('');
  const [controlling, setControlling] = useState(false);
  const [controlError, setControlError] = useState('');
  const [controlSuccessMessage, setControlSuccessMessage] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const handleApplyAiControl = async () => {
    if (!promptInput.trim() || controlling) return;

    setControlling(true);
    setControlError('');
    setControlSuccessMessage('');
    setSaveStatus('saving');

    try {
      const res = await fetch('/api/admin/media/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطایی در کنترل هوشمند رسانه رخ داد.');
      }

      if (data.success) {
        if (data.requireConfirmation) {
          const userConfirmed = confirm(`دستیار هوشمند پیشنهاد می‌کند تغییرات زیر اعمال شود:\n\n${data.explanation}\n\nآیا با اعمال این تغییرات موافقت می‌کنید؟`);
          if (userConfirmed) {
            setControlling(true);
            setSaveStatus('saving');
            const confirmRes = await fetch('/api/admin/media/ai-control', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                confirmed: true,
                rawResult: data.rawResult,
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
              await fetchMedia();
              if (confirmData.processed && confirmData.processed.length > 0) {
                const bgRemovalCountIncrement = confirmData.processed.length;
                setBgRemovalCount(prev => prev + bgRemovalCountIncrement);
              }
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
          
          // Refresh the media list
          await fetchMedia();
          
          // If background removal occurred, update the count
          if (data.processed && data.processed.length > 0) {
            const bgRemovalCountIncrement = data.processed.length;
            setBgRemovalCount(prev => prev + bgRemovalCountIncrement);
          }
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

  useEffect(() => {
    fetchMedia();
    fetchShopDefaults();
    const dismissed = localStorage.getItem('hide_guide_media') === 'true';
    if (dismissed) setShowGuide(false);
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      setMedia(data);
    } catch (error) {
      console.error('Failed to fetch media:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShopDefaults = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setActivePackage(data.settings.package || null);
          setBgRemovalCount(data.settings.bgRemovalCount || 0);
          if (data.settings.imageProcessConfig) {
            try {
              const defaults = JSON.parse(data.settings.imageProcessConfig);
              setBulkSettings(prev => ({
                ...prev,
                ...defaults,
                removeBg: false, // always default bulk BG removal to false for safety
              }));
            } catch (e) {}
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch shop defaults:', error);
    }
  };

  const isFeatureEnabled = (featureKey: string): boolean => {
    if (!activePackage) {
      if (featureKey === 'physicalProducts') return true;
      return false;
    }
    try {
      const features = JSON.parse(activePackage.features);
      return !!features[featureKey];
    } catch (e) {
      return false;
    }
  };

  const getFeatureLimit = (featureKey: string): number => {
    if (!activePackage) return 0;
    try {
      const features = JSON.parse(activePackage.features);
      return parseInt(features[featureKey]) || 0;
    } catch (e) {
      return 0;
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setIsUploading(true);
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        await fetchMedia();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveBg = async () => {
    if (!selectedMedia) return;
    setIsRemovingBg(true);
    setBgRemovalError('');

    try {
      const endpoint = applySettingsOnSingleRemove ? '/api/admin/media/process' : '/api/admin/media/remove-bg';
      const body = applySettingsOnSingleRemove 
        ? {
            ...bulkSettings,
            mediaIds: [selectedMedia.id],
            removeBg: true
          }
        : {
            mediaId: selectedMedia.id
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        const finalMediaItem = applySettingsOnSingleRemove 
          ? (data.processed && data.processed.length > 0 ? data.processed[0] : null) 
          : data.media;

        if (finalMediaItem) {
          setMedia(prev => [finalMediaItem, ...prev]);
          setSelectedMedia(finalMediaItem);
          setEditName(finalMediaItem.name);
          setEditAlt(finalMediaItem.alt || '');
          // Increment the count locally
          setBgRemovalCount(prev => prev + 1);
        } else {
          setBgRemovalError(data.error || 'خطا در پردازش تصویر. لطفاً تنظیمات یا فایل خود را بررسی کنید.');
        }
      } else {
        setBgRemovalError(data.error || 'خطا در حذف پس‌زمینه.');
      }
    } catch (error) {
      console.error('Failed to remove background:', error);
      setBgRemovalError('خطای ارتباط با سرور.');
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleBulkProcess = async () => {
    if (selectedMediaIds.length === 0) return;
    setBulkProcessing(true);
    setBulkError('');
    setBulkSuccess(false);

    try {
      const res = await fetch('/api/admin/media/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mediaIds: selectedMediaIds,
          ...bulkSettings,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setBulkSuccess(true);
        // If bulk background removal was active, we should update bgRemovalCount with the processed count
        if (bulkSettings.removeBg) {
          setBgRemovalCount(prev => prev + selectedMediaIds.length);
        }
        setSelectedMediaIds([]);
        setIsBulkMode(false);
        await fetchMedia();
        setTimeout(() => {
          setIsBulkModalOpen(false);
          setBulkSuccess(false);
        }, 1500);
      } else {
        setBulkError(data.error || 'خطایی در پردازش دسته‌ای رخ داد.');
      }
    } catch (error) {
      console.error('Failed to run bulk processing:', error);
      setBulkError('خطای ارتباط با سرور در حین پردازش.');
    } finally {
      setBulkProcessing(false);
    }
  };

  const openMediaModal = (item: Media) => {
    if (isBulkMode) {
      // Toggle selection instead of opening modal
      toggleSelectMedia(item.id);
      return;
    }
    setSelectedMedia(item);
    setEditName(item.name);
    setEditAlt(item.alt || '');
  };

  const toggleSelectMedia = (id: string) => {
    setSelectedMediaIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const imageIds = filteredMedia.filter(m => m.type === 'image').map(m => m.id);
    if (selectedMediaIds.length === imageIds.length) {
      setSelectedMediaIds([]);
    } else {
      setSelectedMediaIds(imageIds);
    }
  };

  const closeMediaModal = () => {
    setSelectedMedia(null);
    setBgRemovalError('');
    setIsRemovingBg(false);
  };

  const handleSave = async () => {
    if (!selectedMedia) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/media/${selectedMedia.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName,
          alt: editAlt,
        }),
      });

      if (res.ok) {
        const updatedMedia = await res.json();
        setMedia(media.map(m => m.id === updatedMedia.id ? updatedMedia : m));
        setSelectedMedia(updatedMedia);
      }
    } catch (error) {
      console.error('Failed to update media:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMedia) return;
    if (!confirm('آیا از حذف این رسانه اطمینان دارید؟')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/media/${selectedMedia.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setMedia(media.filter(m => m.id !== selectedMedia.id));
        closeMediaModal();
      }
    } catch (error) {
      console.error('Failed to delete media:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleReplaceOriginal = async () => {
    if (!selectedMedia || !selectedMedia.originalId) return;
    if (!confirm('آیا از جایگزینی این تصویر با فایل اصلی قبلی اطمینان دارید؟ تصویر قبلی برای همیشه حذف شده و این تصویر جدید جایگزین آن در تمامی محصولات و صفحات خواهد شد.')) return;

    setIsReplacing(true);
    try {
      const res = await fetch('/api/admin/media/replace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          processedId: selectedMedia.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        alert('تصویر جدید با موفقیت جایگزین فایل اصلی قبلی شد و از لیست تکراری‌ها حذف گردید.');
        // Remove the processed media from list, and update original with new URL
        setMedia(prev => prev
          .filter(m => m.id !== selectedMedia.id)
          .map(m => m.id === selectedMedia.originalId ? { ...m, url: data.media.url, size: data.media.size, originalId: null, originalUrl: null } : m)
        );
        closeMediaModal();
      } else {
        alert(data.error || 'خطا در جایگزینی تصویر.');
      }
    } catch (error) {
      console.error('Failed to replace original media:', error);
      alert('خطای ارتباط با سرور.');
    } finally {
      setIsReplacing(false);
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return 'نامشخص';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredMedia = media.filter(item => {
    if (!item) return false;
    // Search query filter
    const matchesSearch = searchQuery.trim() === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.alt && item.alt.toLowerCase().includes(searchQuery.toLowerCase()));

    // Type filter
    const matchesType = filterType === 'all' || item.type === filterType;

    // Status filter
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'processed' && (item.originalId || item.originalUrl)) ||
      (filterStatus === 'original' && !item.originalId && !item.originalUrl);

    // Date filter
    let matchesDate = true;
    if (filterDate !== 'all') {
      const itemDate = new Date(item.createdAt);
      const now = new Date();
      if (filterDate === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesDate = itemDate >= today;
      } else if (filterDate === 'week') {
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        matchesDate = itemDate >= oneWeekAgo;
      } else if (filterDate === 'month') {
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = itemDate >= oneMonthAgo;
      }
    }

    return matchesSearch && matchesType && matchesStatus && matchesDate;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortBy === 'largest') {
      return (b.size || 0) - (a.size || 0);
    }
    if (sortBy === 'smallest') {
      return (a.size || 0) - (b.size || 0);
    }
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto pb-12" dir="rtl">
      
      {showGuide && (
        <div className="bg-blue-50/80 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-2xl p-4 flex items-start justify-between gap-4 select-none text-right mb-6">
          <div className="flex gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-blue-900 dark:text-blue-200">راهنمای کتابخانه رسانه 💡</h4>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed">
                تصاویر محصولات، اسلایدرها و فایل‌های فروشگاه را از این بخش مدیریت کنید. شما می‌توانید تصاویر جدید آپلود کنید، نام و متن جایگزین (Alt) آن‌ها را برای بهبود سئو ویرایش کنید، یا با استفاده از ابزار هوش مصنوعی پس‌زمینه تصاویر را با یک کلیک حذف کنید.
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setShowGuide(false);
              localStorage.setItem('hide_guide_media', 'true');
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">کتابخانه رسانه فروشگاه</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">تصاویر کالاها را آپلود، حذف، ویرایش یا به صورت هوشمند و دسته‌جمعی قالب‌بندی و استانداردسازی کنید.</p>
        </div>

        <div className="flex flex-wrap gap-3 w-full sm:w-auto">
          {/* Toggle Bulk Mode */}
          <button
            onClick={() => {
              setIsBulkMode(!isBulkMode);
              setSelectedMediaIds([]);
            }}
            className={`flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
              isBulkMode 
                ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40' 
                : 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
            }`}
          >
            {isBulkMode ? (
              <>
                <X size={16} />
                <span>لغو مدیریت دسته‌ای</span>
              </>
            ) : (
              <>
                <CheckSquare size={16} />
                <span>مدیریت دسته‌ای تصاویر</span>
              </>
            )}
          </button>

          {/* Upload Button */}
          <label className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl cursor-pointer transition-colors justify-center shadow-xs font-bold text-xs select-none">
            <Upload size={16} />
            <span>{isUploading ? 'در حال آپلود...' : 'آپلود فایل جدید'}</span>
            <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>
      </div>

      {/* AI Prompt Control - Smart Assistant */}
      <div className="bg-gradient-to-tr from-purple-50 to-indigo-50 dark:from-purple-950/10 dark:to-indigo-950/10 p-6 rounded-3xl shadow-xs border border-purple-100 dark:border-purple-900/30 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl bg-purple-600 text-white">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-800 dark:text-white">دستیار هوشمند رسانه (کنترل با پرامپت)</h2>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold leading-relaxed mt-0.5">
              با نوشتن دستورهای متنی ساده، تصاویر محصولات خود را ویرایش کنید! مثلاً پس‌زمینه را حذف کنید، واتر‌مارک بزنید، زمینه را سفید کنید و جایگزین عکس اصلی کنید.
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="مثال: عکس کفش نایک پس‌زمینه حذف بشه، واتر‌مارک بیاد، زمینه سفید بشه و جایگزین عکس اصلی بشه..."
              className="flex-1 px-4 py-3 border border-purple-200 dark:border-purple-900/40 dark:bg-gray-800/80 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none text-xs font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
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
              className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-xl transition-all font-bold text-xs cursor-pointer shadow-xs flex items-center gap-1.5 disabled:opacity-50 shrink-0"
            >
              {controlling ? (
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
              'عکس اول گالری پس‌زمینه حذف بشه، واتر‌مارک متنی "فروشگاه ما" بیاد و زمینه سفید بشه و جایگزین بشه',
              'عکس کفش نایک پس‌زمینه حذف بشه و زمینه سفید بشه و جایگزین عکس اصلی بشه',
              'همه عکس‌ها زمینه سفید بشن و ابعاد مربع بشه و جایگزین بشن'
            ].map((sug, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setPromptInput(sug)}
                className="text-[10px] bg-white hover:bg-purple-50 dark:bg-gray-800/50 dark:hover:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900/30 px-2.5 py-1.5 rounded-lg transition-colors font-semibold cursor-pointer"
              >
                {sug}
              </button>
            ))}
          </div>

          {controlError && (
            <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{controlError}</span>
            </div>
          )}

          {controlSuccessMessage && (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-xs font-semibold leading-relaxed border border-emerald-100 dark:border-emerald-900/30 flex items-start gap-2.5 animate-in fade-in duration-200">
              <Check className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-emerald-800 dark:text-emerald-300 mb-1">دستور با موفقیت اعمال شد:</p>
                <p className="text-[11px] opacity-90">{controlSuccessMessage}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bulk Action Subbar */}
      {isBulkMode && (
        <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 mb-6 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-3 text-xs font-bold">
            <button
              onClick={handleSelectAll}
              className="flex items-center gap-1 bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 px-3 py-1.5 rounded-lg transition-all"
            >
              {selectedMediaIds.length === filteredMedia.filter(m => m.type === 'image').length ? 'لغو انتخاب همه' : 'انتخاب همه تصاویر'}
            </button>
            <span className="text-slate-500 dark:text-slate-400">
              تعداد تصاویر انتخاب شده: <strong className="text-blue-600 dark:text-blue-400">{selectedMediaIds.length}</strong> عدد
            </span>
          </div>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            disabled={selectedMediaIds.length === 0}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:text-slate-400 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Sparkles size={15} />
            <span>پردازش گروهی هوشمند کاتالوگ ({selectedMediaIds.length})</span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-800 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-3">
          {/* Right: Search and Quick Type Filters */}
          <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در نام یا متن جایگزین..."
                className="w-full pl-3 pr-10 py-2.5 bg-gray-50 hover:bg-gray-100/50 focus:bg-white dark:bg-gray-950 dark:hover:bg-gray-900/50 dark:focus:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500/10 outline-none text-xs font-bold text-gray-900 dark:text-white transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
                <Search size={16} />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Quick Type Filter Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-950 p-1 rounded-xl border border-gray-200/50 dark:border-gray-800/50 self-start sm:self-auto">
              {(['all', 'image', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    filterType === type
                      ? 'bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                  }`}
                >
                  {type === 'all' ? 'همه' : type === 'image' ? 'تصاویر' : 'ویدیوها'}
                </button>
              ))}
            </div>
          </div>

          {/* Left: Advanced Filter Toggle & Reset */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            {/* Reset Filters (Visible if any filter is active) */}
            {(searchQuery || filterType !== 'all' || filterStatus !== 'all' || filterDate !== 'all' || sortBy !== 'newest') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                  setFilterStatus('all');
                  setFilterDate('all');
                  setSortBy('newest');
                }}
                className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors cursor-pointer"
              >
                <span>پاکسازی فیلترها</span>
              </button>
            )}

            {/* Toggle Advanced Filters Button */}
            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border font-bold text-xs cursor-pointer transition-all ${
                showAdvancedFilters
                  ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40'
                  : 'bg-white hover:bg-gray-50 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800'
              }`}
            >
              <Sliders size={14} />
              <span>فیلترهای پیشرفته</span>
              {(filterStatus !== 'all' || filterDate !== 'all' || sortBy !== 'newest') && (
                <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse"></span>
              )}
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-1 duration-200">
            {/* Status Filter */}
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 font-bold">وضعیت پردازش تصویر</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100/50 dark:bg-gray-950 dark:hover:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
              >
                <option value="all">همه تصاویر</option>
                <option value="original">تصاویر اصلی (ویرایش‌نشده)</option>
                <option value="processed">تصاویر پردازش‌شده (AI)</option>
              </select>
            </div>

            {/* Date Filter */}
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 font-bold">زمان آپلود</label>
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100/50 dark:bg-gray-950 dark:hover:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
              >
                <option value="all">همه زمان‌ها</option>
                <option value="today">امروز</option>
                <option value="week">یک هفته اخیر</option>
                <option value="month">یک ماه اخیر</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1.5 font-bold">مرتب‌سازی بر اساس</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-gray-50 hover:bg-gray-100/50 dark:bg-gray-950 dark:hover:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl outline-none text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer"
              >
                <option value="newest">جدیدترین‌ها</option>
                <option value="oldest">قدیمی‌ترین‌ها</option>
                <option value="largest">بزرگترین حجم</option>
                <option value="smallest">کوچکترین حجم</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Media Content Grid */}
      {isLoading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-2 text-gray-400 font-bold text-xs">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span>در حال بارگذاری رسانه‌ها...</span>
        </div>
      ) : media.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xs border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <ImageIcon size={64} className="mb-4 opacity-20" />
            <p className="text-sm font-black text-gray-900 dark:text-white mb-1.5">کتابخانه رسانه شما خالی است</p>
            <p className="text-xs">برای شروع، روی دکمه "آپلود فایل جدید" کلیک کنید.</p>
          </div>
        </div>
      ) : filteredMedia.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-xs border border-gray-200 dark:border-gray-800 p-12 text-center">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
            <Sliders size={48} className="mb-4 opacity-20 text-blue-500" />
            <p className="text-sm font-black text-gray-900 dark:text-white mb-1.5">هیچ رسانه‌ای با مشخصات فیلتر شده یافت نشد</p>
            <p className="text-xs mb-4">تغییراتی در فیلترهای خود ایجاد کنید یا فیلترها را پاکسازی کنید.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterType('all');
                setFilterStatus('all');
                setFilterDate('all');
                setSortBy('newest');
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              پاکسازی همه فیلترها
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {filteredMedia.map((item) => {
            const isSelected = selectedMediaIds.includes(item.id);
            return (
              <div 
                key={item.id} 
                onClick={() => openMediaModal(item)}
                className={`group relative aspect-square rounded-2xl overflow-hidden border bg-white dark:bg-gray-900 shadow-xs hover:shadow-md transition-all cursor-pointer ${
                  isBulkMode 
                    ? isSelected 
                      ? 'ring-4 ring-blue-500 border-blue-500' 
                      : 'border-gray-200 dark:border-gray-800'
                    : 'border-gray-200 dark:border-gray-800'
                }`}
              >
                {item.type === 'image' ? (
                  <Image src={item.url} alt={item.alt || item.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <Video size={32} className="text-gray-400" />
                  </div>
                )}
                
                {/* Bulk Select Overlay Checkbox */}
                {isBulkMode && item.type === 'image' && (
                  <div className="absolute top-2.5 right-2.5 z-10 transition-all">
                    {isSelected ? (
                      <div className="bg-blue-600 text-white p-1 rounded-lg">
                        <Check size={14} className="stroke-[3]" />
                      </div>
                    ) : (
                      <div className="bg-black/40 text-white/80 p-1.5 rounded-lg hover:bg-black/60">
                        <Square size={12} />
                      </div>
                    )}
                  </div>
                )}

                {/* Normal Overlay Info */}
                {!isBulkMode && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white text-[10px] font-bold truncate text-left" dir="ltr">{item.name}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Media Details Modal */}
      {selectedMedia && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={closeMediaModal}>
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Preview Section */}
            <div className="w-full md:w-2/3 bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative min-h-[300px] md:min-h-[500px]">
              {selectedMedia.type === 'image' ? (
                <div className="relative w-full h-full min-h-[300px] md:min-h-[500px]">
                  <Image 
                    src={selectedMedia.url} 
                    alt={selectedMedia.alt || selectedMedia.name} 
                    fill 
                    sizes="(max-width: 768px) 100vw, 66vw"
                    className="object-contain"
                  />
                </div>
              ) : (
                <video 
                  src={selectedMedia.url} 
                  controls 
                  className="max-w-full max-h-full rounded-lg"
                />
              )}
            </div>

            {/* Details Section */}
            <div className="w-full md:w-1/3 p-6 flex flex-col h-full overflow-y-auto border-t md:border-t-0 md:border-r border-slate-100 dark:border-slate-800 text-right">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">جزئیات رسانه کالا</h3>
                <button 
                  onClick={closeMediaModal}
                  className="p-1.5 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 flex-1 text-xs font-bold">
                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">نام فایل</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/10 dark:bg-slate-950 dark:text-white outline-none"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">متن جایگزین تصویر (Alt)</label>
                  <input 
                    type="text" 
                    value={editAlt}
                    onChange={(e) => setEditAlt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500/10 dark:bg-slate-950 dark:text-white outline-none"
                    placeholder="توضیح تصویر برای بهبود سئو کالا..."
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="grid grid-cols-2 gap-y-3.5 text-[11px]">
                    <div className="text-slate-400">تاریخ آپلود:</div>
                    <div className="text-slate-800 dark:text-white text-left font-mono" dir="ltr">
                      {new Date(selectedMedia.createdAt).toLocaleDateString('fa-IR')}
                    </div>
                    
                    <div className="text-slate-400">حجم فایل:</div>
                    <div className="text-slate-800 dark:text-white text-left font-mono" dir="ltr">
                      {formatSize(selectedMedia.size)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced BG Removal Box */}
              <div className="space-y-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                {bgRemovalError && (
                  <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-[10px] font-bold">
                    {bgRemovalError}
                  </div>
                )}

                {selectedMedia.type === 'image' && (() => {
                  const limit = getFeatureLimit('bgRemovalLimit');
                  const count = bgRemovalCount;
                  const isLimitReached = limit > 0 && count >= limit;
                  const isBgEnabled = isFeatureEnabled('bgRemovalEnabled');

                  if (!isBgEnabled) {
                    return (
                      <div className="bg-amber-50 text-amber-700 border border-amber-100 rounded-xl p-3 text-[10px] font-bold leading-relaxed text-right">
                        🔒 قابلیت حذف پس‌زمینه با هوش مصنوعی در پکیج فعلی شما فعال نیست.
                      </div>
                    );
                  }

                  if (isLimitReached) {
                    return (
                      <div className="bg-red-50 text-red-600 border border-red-100 rounded-xl p-3 text-[10px] font-bold leading-relaxed text-right">
                        ⚠️ سهمیه حذف پس‌زمینه با هوش مصنوعی پکیج شما به پایان رسیده است ({count} از {limit} مصرف شده). جهت افزایش سهمیه، لطفا پکیج خود را ارتقا دهید.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2.5">
                      <button
                        type="button"
                        onClick={handleRemoveBg}
                        disabled={isRemovingBg}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-400 disabled:to-slate-400 text-white px-4 py-3 rounded-xl font-bold text-xs transition-all shadow-xs cursor-pointer"
                      >
                        <Sparkles size={16} className={isRemovingBg ? 'animate-spin' : ''} />
                        <span>{isRemovingBg ? 'در حال حذف پس‌زمینه تصویر...' : 'حذف تک پس‌زمینه با هوش مصنوعی'}</span>
                      </button>

                      <label className="flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950/20 rounded-xl border border-slate-100 dark:border-slate-800 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={applySettingsOnSingleRemove}
                          onChange={(e) => setApplySettingsOnSingleRemove(e.target.checked)}
                          disabled={isRemovingBg}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500/10 cursor-pointer"
                        />
                        <span className="text-[10px] text-slate-600 dark:text-slate-400 font-bold leading-none select-none">
                          اعمال خودکار تنظیمات کاتالوگ (ابعاد، پس‌زمینه و...)
                        </span>
                      </label>
                    </div>
                  );
                })()}
              </div>

              {/* Replace with Original Option */}
              {selectedMedia.originalId && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-2xl border border-blue-100/50 dark:border-blue-900/40 text-right space-y-2">
                  <p className="text-[10px] text-blue-700 dark:text-blue-400 font-bold leading-relaxed">
                    ✨ این تصویر حاصل پردازش (حذف پس‌زمینه/ویرایش) است. آیا مایلید آن را با تصویر اصلیِ قبلی جایگزین کنید تا در تمامی بخش‌های سایت اعمال شود؟
                  </p>
                  <button
                    type="button"
                    onClick={handleReplaceOriginal}
                    disabled={isReplacing}
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white py-2 rounded-xl font-bold text-xs cursor-pointer transition-all shadow-sm"
                  >
                    <Save size={14} />
                    <span>{isReplacing ? 'در حال جایگزینی...' : 'جایگزینی با عکس قبلی'}</span>
                  </button>
                </div>
              )}

              {/* Primary Actions */}
              <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 text-xs font-bold cursor-pointer"
                >
                  <Save size={16} />
                  <span>{isSaving ? 'در حال ذخیره...' : 'ذخیره مشخصات'}</span>
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-900/40 px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                  title="حذف دائمی تصویر"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Processing Configuration Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs" onClick={() => !bulkProcessing && setIsBulkModalOpen(false)}>
          <div 
            className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col border border-slate-100 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center sticky top-0 bg-white dark:bg-slate-900 z-10">
              <div className="text-right">
                <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="text-blue-500 w-5 h-5" />
                  تنظیمات پردازش دسته‌ای تصاویر کاتالوگ ({selectedMediaIds.length} عکس)
                </h2>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">تغییرات را جهت اعمال گروهی و استانداردسازی بر روی تصاویر انتخاب‌شده پیکربندی کنید.</p>
              </div>
              <button 
                onClick={() => !bulkProcessing && setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleBulkProcess();
              }}
              className="p-6 space-y-5 overflow-y-auto max-h-[75vh] text-right text-xs font-bold"
            >
              {bulkError && (
                <div className="bg-red-50 text-red-600 border border-red-100 p-3.5 rounded-xl font-bold">
                  {bulkError}
                </div>
              )}

              {bulkSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-100 p-3.5 rounded-xl font-bold flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span>پردازش دسته‌ای با موفقیت کامل شد! گالری در حال بروزرسانی است...</span>
                </div>
              )}

              {bulkProcessing ? (
                <div className="py-12 flex flex-col justify-center items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                  <span className="text-slate-600 dark:text-slate-400">سیستم در حال بهینه‌سازی، برش، تغییر مقیاس سوژه و اعمال واتر‌مارک روی {selectedMediaIds.length} تصویر می‌باشد...</span>
                  <span className="text-[10px] text-slate-400">این عملیات ممکن است چند لحظه زمان ببرد. لطفاً مرورگر خود را نبندید.</span>
                </div>
              ) : (
                <>
                  {/* Background removal toggle option */}
                  {isFeatureEnabled('bgRemovalEnabled') ? (
                    <div className="flex items-center justify-between p-4 bg-blue-500/[0.03] dark:bg-blue-900/[0.05] rounded-2xl border border-blue-500/10 dark:border-blue-900/20">
                      <div className="space-y-0.5 ml-4">
                        <label className="block text-xs font-black text-blue-900 dark:text-blue-400">حذف پس‌زمینه با هوش مصنوعی (Poof AI)</label>
                        <span className="text-[10px] text-blue-500 dark:text-blue-500/80 font-bold leading-relaxed">با فعال‌سازی، پس‌زمینه تک‌تک تصاویر توسط هوش مصنوعی برداشته شده و سپس کادربندی دور سوژه اعمال می‌شود. (از سهمیه اشتراک کسر می‌گردد)</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBulkSettings({ ...bulkSettings, removeBg: !bulkSettings.removeBg })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none shrink-0 cursor-pointer ${
                          bulkSettings.removeBg ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            bulkSettings.removeBg ? '-translate-x-6' : '-translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ) : (
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-950/25 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 font-bold">
                      🔒 قابلیت حذف پس‌زمینه با هوش مصنوعی در پکیج اشتراک شما فعال نیست. پردازش‌های گروهیِ ابعاد، اسکیل و واتر‌مارک به صورت محلی و کاملاً رایگان انجام خواهند شد.
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Dimension Selection */}
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">ابعاد و نسبت تصویر خروجی (استاندارد کاتالوگ)</label>
                      <select
                        value={bulkSettings.dimensions}
                        onChange={(e) => setBulkSettings({ ...bulkSettings, dimensions: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                      >
                        <option value="square">مربع ۱:۱ (۱۰۰۰ × ۱۰۰۰ پیکسل)</option>
                        <option value="portrait">پرتره ۳:۴ (۱۰۰۰ × ۱۳۳۳ پیکسل)</option>
                        <option value="landscape">افقی ۴:۳ (۱۰۰۰ × ۷۵۰ پیکسل)</option>
                        <option value="original">ابعاد فابریک اصلی تصویر را حفظ کن</option>
                      </select>
                    </div>

                    {/* Default Background Color */}
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">رنگ پس‌زمینه زیر تصاویر</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={bulkSettings.bgColor}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, bgColor: e.target.value })}
                          className="h-9 w-9 rounded-xl cursor-pointer border border-slate-200 dark:border-slate-700 bg-transparent p-0 overflow-hidden shrink-0"
                        />
                        <input
                          type="text"
                          value={bulkSettings.bgColor}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, bgColor: e.target.value })}
                          className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none font-mono text-[11px] text-left"
                          dir="ltr"
                        />
                      </div>
                    </div>

                    {/* Subject Scale Range */}
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="text-[10px] text-slate-400 dark:text-slate-500">مقیاس استاندارد سوژه در مرکز تصویر (Scale & Centering)</label>
                        <span className="text-[10px] text-blue-600 font-mono">{bulkSettings.subjectScale}% کانوا</span>
                      </div>
                      <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950/20 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                        <input
                          type="range"
                          min="50"
                          max="95"
                          step="5"
                          value={bulkSettings.subjectScale}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, subjectScale: parseInt(e.target.value) || 50 })}
                          className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                      <p className="text-[9px] text-slate-400 mt-1 leading-relaxed">سوژه‌ها با استفاده از فریم ترنسپرنت (یا تشخیص حاشیه‌ها) به طور یکدست در ابعاد مشخص شده کوچیک یا بزرگ می‌شوند.</p>
                    </div>

                    {/* Watermark Selection */}
                    <div>
                      <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">افزودن واتر‌مارک هوشمند</label>
                      <select
                        value={bulkSettings.watermarkType}
                        onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkType: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                      >
                        <option value="none">بدون واتر‌مارک</option>
                        <option value="text">واتر‌مارک متنی (ساده)</option>
                        <option value="logo">واتر‌مارک لوگوی فروشگاه (تصویری)</option>
                      </select>
                    </div>
                  </div>

                  {/* Watermark TEXT settings fields */}
                  {bulkSettings.watermarkType === 'text' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">متن واتر‌مارک</label>
                        <input
                          type="text"
                          value={bulkSettings.watermarkText}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkText: e.target.value })}
                          placeholder="مثلا: فروشگاه کفش کتونی"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">موقعیت</label>
                        <select
                          value={bulkSettings.watermarkPosition}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkPosition: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                        >
                          <option value="center">وسط کادر (با زاویه)</option>
                          <option value="bottom-right">پایین راست</option>
                          <option value="bottom-left">پایین چپ</option>
                          <option value="top-right">بالا راست</option>
                          <option value="top-left">بالا چپ</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-slate-400 dark:text-slate-500">شفافیت واتر‌مارک</label>
                          <span className="text-[10px] font-mono text-blue-600 font-bold">{Math.round(bulkSettings.watermarkOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.4"
                          step="0.05"
                          value={bulkSettings.watermarkOpacity}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkOpacity: parseFloat(e.target.value) || 0.25 })}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Watermark LOGO settings fields */}
                  {bulkSettings.watermarkType === 'logo' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 dark:bg-slate-950/10 p-4 rounded-2xl border border-slate-100 dark:border-slate-850 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">مسیر لوگو (تصویر واتر‌مارک)</label>
                        <input
                          type="text"
                          value={bulkSettings.watermarkLogoUrl}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkLogoUrl: e.target.value })}
                          placeholder="/uploads/my-watermark.png"
                          dir="ltr"
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none text-left"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-400 dark:text-slate-500 mb-1">موقعیت</label>
                        <select
                          value={bulkSettings.watermarkPosition}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkPosition: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 dark:bg-slate-950 rounded-xl outline-none"
                        >
                          <option value="center">مرکز تصویر</option>
                          <option value="bottom-right">پایین راست</option>
                          <option value="bottom-left">پایین چپ</option>
                          <option value="top-right">بالا راست</option>
                          <option value="top-left">بالا چپ</option>
                        </select>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] text-slate-400 dark:text-slate-500">شفافیت لوگو</label>
                          <span className="text-[10px] font-mono text-blue-600 font-bold">{Math.round(bulkSettings.watermarkOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="0.4"
                          step="0.05"
                          value={bulkSettings.watermarkOpacity}
                          onChange={(e) => setBulkSettings({ ...bulkSettings, watermarkOpacity: parseFloat(e.target.value) || 0.25 })}
                          className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer accent-blue-600"
                        />
                      </div>
                    </div>
                  )}

                  {/* Actions buttons */}
                  <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 pb-2 border-t border-slate-50 dark:border-slate-850">
                    <button
                      type="submit"
                      disabled={bulkProcessing}
                      className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles size={16} />
                      <span>پردازش و استانداردسازی نهایی تصاویر کاتالوگ ({selectedMediaIds.length} عدد)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsBulkModalOpen(false)}
                      disabled={bulkProcessing}
                      className="px-5 bg-gray-100 hover:bg-gray-200 text-gray-600 dark:bg-gray-800 dark:hover:bg-gray-750 dark:text-gray-300 py-2.5 rounded-xl font-bold text-xs cursor-pointer transition-colors"
                    >
                      انصراف
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
