'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronRight, ChevronLeft, Star } from 'lucide-react';

interface Review {
  id: string;
  rating: number;
  comment: string;
  isBuyer: boolean;
  images: string | null;
  createdAt: string;
  user: {
    name: string | null;
    avatarUrl: string | null;
  };
  product: {
    title: string;
  };
}

interface ReviewsCarouselProps {
  reviews: Review[];
  title?: string;
  subtitle?: string;
}

export default function ReviewsCarousel({ reviews, title, subtitle }: ReviewsCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, direction: 'rtl', align: 'start' }, [
    Autoplay({ delay: 6000, stopOnInteraction: false }),
  ]);

  const [prevBtnDisabled, setPrevBtnDisabled] = useState(true);
  const [nextBtnDisabled, setNextBtnDisabled] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi && emblaApi.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi && emblaApi.scrollNext(), [emblaApi]);

  const onSelect = useCallback((emblaApi: any) => {
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setPrevBtnDisabled(!emblaApi.canScrollPrev());
    setNextBtnDisabled(!emblaApi.canScrollNext());
  }, []);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect(emblaApi);
    emblaApi.on('reInit', onSelect);
    emblaApi.on('select', onSelect);
  }, [emblaApi, onSelect]);

  if (!reviews || reviews.length === 0) return null;

  return (
    <div className="py-16 bg-white dark:bg-gray-900 border-t border-b border-gray-100 dark:border-gray-800/50" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div className="text-right">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl tracking-tight">
              {title || 'نظرات مشتریان ما'}
            </h2>
            {subtitle && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-bold">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Navigation Buttons */}
          {reviews.length > 3 && (
            <div className="flex items-center gap-2 self-end">
              <button
                onClick={scrollNext}
                className="p-2.5 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all active:scale-95"
                aria-label="بعدی"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={scrollPrev}
                className="p-2.5 rounded-full border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 transition-all active:scale-95"
                aria-label="قبلی"
              >
                <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </div>

        {/* Carousel Container */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y -mr-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="flex-[0_0_100%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] pr-4 min-w-0"
              >
                <div className="h-full bg-gray-50/50 dark:bg-gray-950/40 border border-gray-100 dark:border-gray-800/60 rounded-2xl p-6 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700/80 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    {/* User Info & Rating */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        {review.user?.avatarUrl ? (
                          <div className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-100 dark:border-gray-800">
                            <img src={review.user.avatarUrl} alt="پروفایل" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-sm">
                            {review.user?.name ? review.user.name.charAt(0) : 'U'}
                          </div>
                        )}
                        <div>
                          <h4 className="text-xs font-black text-gray-900 dark:text-white">
                            {review.user?.name || 'کاربر مهمان'}
                          </h4>
                          {review.isBuyer && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded-full mt-0.5">
                              ✓ خریدار تأیید شده
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center text-yellow-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            fill={i < review.rating ? 'currentColor' : 'none'}
                            className={i < review.rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-700'}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Comment */}
                    <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-4 mb-4">
                      {review.comment}
                    </p>

                    {/* Review Images */}
                    {review.images && (() => {
                      try {
                        const parsedImages = JSON.parse(review.images);
                        if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                          return (
                            <div className="flex gap-1.5 mb-4">
                              {parsedImages.slice(0, 3).map((imgUrl, idx) => (
                                <div
                                  key={idx}
                                  className="relative w-12 h-12 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 bg-gray-100 cursor-pointer hover:opacity-90 transition-opacity"
                                  onClick={() => window.open(imgUrl, '_blank')}
                                >
                                  <img src={imgUrl} alt="تصویر نظر" className="w-full h-full object-cover" />
                                </div>
                              ))}
                            </div>
                          );
                        }
                      } catch (e) {}
                      return null;
                    })()}
                  </div>

                  {/* Footer */}
                  <div className="pt-4 border-t border-gray-100 dark:border-gray-800/50 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="truncate max-w-[180px]">
                      ثبت شده برای: <span className="font-bold text-gray-500 dark:text-gray-300">{review.product?.title}</span>
                    </span>
                    <span>{new Date(review.createdAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
