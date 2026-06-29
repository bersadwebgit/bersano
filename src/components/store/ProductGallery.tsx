'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X, ZoomIn } from 'lucide-react';

interface ProductGalleryProps {
  mainImageUrl: string | null;
  galleryUrls?: string | null;
  title: string;
  discount?: number | null;
}

export default function ProductGallery({ mainImageUrl, galleryUrls, title, discount }: ProductGalleryProps) {
  let gallery: string[] = [];
  if (mainImageUrl) {
    gallery.push(mainImageUrl);
  }

  try {
    if (galleryUrls) {
      const parsed = JSON.parse(galleryUrls);
      if (Array.isArray(parsed)) {
        gallery = [...gallery, ...parsed];
      }
    }
  } catch (e) {}

  // Deduplicate while keeping order (main image may also appear in gallery list)
  gallery = Array.from(new Set(gallery.filter(Boolean)));

  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [mainImageUrl]);

  const hasMultiple = gallery.length > 1;

  const goTo = useCallback((index: number) => {
    if (gallery.length === 0) return;
    const next = (index + gallery.length) % gallery.length;
    setActiveIndex(next);
  }, [gallery.length]);

  const goNext = useCallback(() => goTo(activeIndex + 1), [activeIndex, goTo]);
  const goPrev = useCallback(() => goTo(activeIndex - 1), [activeIndex, goTo]);

  // Keyboard navigation inside the zoom lightbox
  useEffect(() => {
    if (!isZoomOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomOpen(false);
      // In RTL, ArrowRight goes to previous image, ArrowLeft to next
      if (e.key === 'ArrowRight') goPrev();
      if (e.key === 'ArrowLeft') goNext();
    };
    window.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = '';
    };
  }, [isZoomOpen, goNext, goPrev]);

  return (
    <div className="w-full">
      {/* Main Image */}
      <div className="group relative w-full aspect-square bg-white dark:bg-gray-800/40 rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800">
        {gallery.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            className="absolute inset-0 w-full h-full cursor-zoom-in"
            aria-label="بزرگ‌نمایی تصویر"
          >
            <Image
              src={gallery[activeIndex]}
              alt={`${title} - تصویر ${activeIndex + 1}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              priority={activeIndex === 0}
            />
          </button>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
            بدون عکس
          </div>
        )}

        {/* Discount badge */}
        {(discount ?? 0) > 0 && (
          <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-red-500/25 z-10">
            ٪{discount.toLocaleString('fa-IR')} تخفیف
          </div>
        )}

        {/* Zoom hint */}
        {gallery.length > 0 && (
          <div className="absolute top-4 right-4 bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm text-gray-600 dark:text-gray-300 p-2 rounded-xl shadow-sm z-10 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
            <ZoomIn className="w-4 h-4" />
          </div>
        )}

        {/* Navigation arrows */}
        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              aria-label="تصویر قبلی"
              className="absolute top-1/2 right-3 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm text-gray-700 dark:text-gray-200 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-all active:scale-90 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              aria-label="تصویر بعدی"
              className="absolute top-1/2 left-3 -translate-y-1/2 z-10 w-9 h-9 flex items-center justify-center bg-white/85 dark:bg-gray-900/85 backdrop-blur-sm text-gray-700 dark:text-gray-200 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-900 transition-all active:scale-90 md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Image counter */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 bg-gray-900/70 text-white text-[11px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
              {(activeIndex + 1).toLocaleString('fa-IR')} / {gallery.length.toLocaleString('fa-IR')}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="flex gap-2.5 mt-4 overflow-x-auto hide-scrollbar pb-2 shrink-0">
          {gallery.map((url, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`نمایش تصویر ${index + 1}`}
              className={`relative w-16 h-16 md:w-20 md:h-20 shrink-0 rounded-2xl overflow-hidden border-2 bg-white dark:bg-gray-800/40 transition-all ${
                activeIndex === index
                  ? 'border-blue-600 dark:border-blue-500 ring-2 ring-blue-600/15'
                  : 'border-gray-100 dark:border-gray-800 opacity-70 hover:opacity-100 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <Image
                src={url}
                alt={`${title} - بندانگشتی ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Zoom Lightbox (portaled to body so it always covers the viewport) */}
      {mounted && isZoomOpen && gallery.length > 0 && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white shrink-0">
            <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-full">
              {(activeIndex + 1).toLocaleString('fa-IR')} / {gallery.length.toLocaleString('fa-IR')}
            </span>
            <button
              type="button"
              onClick={() => setIsZoomOpen(false)}
              aria-label="بستن"
              className="w-10 h-10 flex items-center justify-center bg-white/10 hover:bg-white/20 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Image area */}
          <div className="relative flex-1 flex items-center justify-center px-4 pb-4" onClick={(e) => e.stopPropagation()}>
            <Image
              src={gallery[activeIndex]}
              alt={`${title} - تصویر ${activeIndex + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />

            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="تصویر قبلی"
                  className="absolute top-1/2 right-4 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label="تصویر بعدی"
                  className="absolute top-1/2 left-4 -translate-y-1/2 z-10 w-11 h-11 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-all active:scale-90"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip in lightbox */}
          {hasMultiple && (
            <div className="flex gap-2 justify-center p-4 overflow-x-auto hide-scrollbar shrink-0" onClick={(e) => e.stopPropagation()}>
              {gallery.map((url, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative w-14 h-14 shrink-0 rounded-xl overflow-hidden border-2 bg-white/5 transition-all ${
                    activeIndex === index ? 'border-white' : 'border-transparent opacity-50 hover:opacity-100'
                  }`}
                >
                  <Image src={url} alt={`بندانگشتی ${index + 1}`} fill sizes="56px" className="object-contain p-1" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
