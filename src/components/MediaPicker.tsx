'use client';

import { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Video, Trash2, X, Check, Sparkles } from 'lucide-react';
import Image from 'next/image';

interface Media {
  id: string;
  url: string;
  type: string;
  name: string;
  createdAt: string;
}

interface MediaPickerProps {
  onSelect: (url: string, type: string) => void;
  onClose: () => void;
  title?: string;
  accepts?: string;
}

export default function MediaPicker({ onSelect, onClose, title = "انتخاب رسانه", accepts = "image/*,video/*" }: MediaPickerProps) {
  const [media, setMedia] = useState<Media[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemovingBgId, setIsRemovingBgId] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<any>(null);
  const [activePackage, setActivePackage] = useState<any>(null);
  const [bgRemovalCount, setBgRemovalCount] = useState<number>(0);

  const handleRemoveBg = async (mediaId: string) => {
    setIsRemovingBgId(mediaId);
    try {
      const endpoint = defaults ? '/api/admin/media/process' : '/api/admin/media/remove-bg';
      const body = defaults 
        ? {
            ...defaults,
            mediaIds: [mediaId],
            removeBg: true,
          }
        : {
            mediaId
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && (data.success || data.id || data.processed)) {
        // Increment count locally
        setBgRemovalCount(prev => prev + 1);
        
        const processedItem = defaults ? (data.processed ? data.processed[0] : null) : data.media;
        if (processedItem && processedItem.id && processedItem.originalId) {
          if (confirm('تصویر بدون پس‌زمینه با موفقیت ایجاد شد. آیا مایلید این تصویر جدید را به عنوان جایگزین کامل تصویر قبلی در تمامی بخش‌های سایت قرار دهید و فایل تکراری را حذف کنید؟')) {
            try {
              const replaceRes = await fetch('/api/admin/media/replace', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  processedId: processedItem.id,
                }),
              });
              if (replaceRes.ok) {
                alert('تصویر جدید با موفقیت جایگزین فایل قبلی شد.');
              }
            } catch (err) {
              console.error('Failed to replace original image from media picker:', err);
            }
          }
        }
        
        // Refresh the list so the new image is shown at the top!
        await fetchMedia();
      } else {
        alert(data.error || 'خطا در حذف پس‌زمینه.');
      }
    } catch (error) {
      console.error('Failed to remove background:', error);
      alert('خطای ارتباط با سرور.');
    } finally {
      setIsRemovingBgId(null);
    }
  };

  useEffect(() => {
    fetchMedia();
    fetchShopDefaults();
  }, []);

  const fetchShopDefaults = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setActivePackage(data.settings.package || null);
          setBgRemovalCount(data.settings.bgRemovalCount || 0);
          if (data.settings.imageProcessConfig) {
            setDefaults(JSON.parse(data.settings.imageProcessConfig));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

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

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <label className="flex items-center justify-center gap-2 w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl cursor-pointer transition-colors font-medium shadow-sm">
            <Upload size={20} />
            <span>{isUploading ? 'در حال آپلود...' : 'آپلود فایل جدید'}</span>
            <input type="file" className="hidden" accept={accepts} onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : media.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
              <ImageIcon size={48} className="mb-4 opacity-20" />
              <p>هیچ رسانه‌ای یافت نشد. فایلی آپلود کنید.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {media.map((item) => (
                <div 
                  key={item.id} 
                  className="group relative aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                  onClick={() => onSelect(item.url, item.type)}
                >
                  {item.type === 'image' ? (
                    <Image src={item.url} alt={item.name} fill sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw" className="object-cover" />
                  ) : item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <Video size={32} className="text-white/50" />
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-500">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                      <span className="text-xs max-w-[80%] text-center truncate">{item.name}</span>
                    </div>
                  )}
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-blue-600 text-white p-2 rounded-full transform scale-75 group-hover:scale-100 transition-transform">
                      <Check size={24} />
                    </div>
                  </div>

                  {/* Background Removal Button */}
                  {item.type === 'image' && (() => {
                    // Check if feature is enabled and limit is not reached
                    let isBgEnabled = false;
                    let isLimitReached = false;
                    
                    if (activePackage) {
                      try {
                        const features = JSON.parse(activePackage.features);
                        isBgEnabled = !!features.bgRemovalEnabled;
                        const limit = parseInt(features.bgRemovalLimit) || 0;
                        isLimitReached = limit > 0 && bgRemovalCount >= limit;
                      } catch(e){}
                    }

                    if (!isBgEnabled || isLimitReached) return null;

                    return (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveBg(item.id);
                        }}
                        disabled={isRemovingBgId !== null}
                        className={`absolute bottom-2 left-2 p-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white z-10 transition-all cursor-pointer flex items-center justify-center ${
                          isRemovingBgId === item.id ? 'opacity-100 scale-100' : 'opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100'
                        }`}
                        title={isRemovingBgId === item.id ? "در حال حذف پس‌زمینه..." : "حذف پس‌زمینه با هوش مصنوعی"}
                      >
                        <Sparkles size={14} className={isRemovingBgId === item.id ? 'animate-spin' : ''} />
                      </button>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
