'use client';

import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ChevronRight, ChevronLeft, Calendar, Clock, BookOpen } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import BlogFallbackImage from '@/components/blog/BlogFallbackImage';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string;
  featuredImage: string | null;
  publishedAt: Date | string;
  viewCount: number;
  category: { id: string; name: string; slug: string } | null;
  author: { name: string; avatarUrl: string | null } | null;
  _count?: { comments: number };
}

interface BlogCarouselProps {
  posts: BlogPost[];
  title?: string;
  subtitle?: string;
}

export default function BlogCarousel({ posts, title, subtitle }: BlogCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: posts.length > 3, direction: 'rtl', align: 'start' }, [
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

  if (!posts || posts.length === 0) return null;

  // Format date helper
  const formatDate = (dateVal: Date | string) => {
    try {
      const date = new Date(dateVal);
      return date.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch (e) {
      return '';
    }
  };

  // Estimate read time based on content length
  const getReadTime = (content: string) => {
    const wordCount = content ? content.trim().split(/\s+/).length : 0;
    const minutes = Math.ceil(wordCount / 200); // Average 200 words per minute
    return minutes > 0 ? `${minutes} دقیقه` : '۱ دقیقه';
  };

  const noScroll = prevBtnDisabled && nextBtnDisabled;

  return (
    <section className="py-16 bg-white dark:bg-black border-t border-b border-gray-100 dark:border-gray-900" dir="rtl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div className="text-right">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white sm:text-3xl tracking-tight flex items-center gap-2">
              <BookOpen className="w-7 h-7 text-primary-600 dark:text-primary-400 shrink-0" />
              {title || 'آخرین مطالب وبلاگ'}
            </h2>
            {subtitle && (
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-bold">
                {subtitle}
              </p>
            )}
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center gap-2 self-end">
            <Link
              href="/blog"
              className="text-xs font-black text-primary-600 dark:text-primary-400 hover:underline ml-4"
            >
              مشاهده همه مطالب
            </Link>
            {posts.length > 1 && !noScroll && (
              <div className="flex items-center gap-2">
                <button
                  onClick={scrollNext}
                  className="p-2.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-95 shadow-sm"
                  aria-label="اسلاید بعدی"
                >
                  <ChevronRight size={18} />
                </button>
                <button
                  onClick={scrollPrev}
                  className="p-2.5 rounded-full border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 transition-all active:scale-95 shadow-sm"
                  aria-label="اسلاید قبلی"
                >
                  <ChevronLeft size={18} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Carousel Container */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y -mr-4">
            {posts.map((post) => {
              const readTime = getReadTime(post.content);
              const formattedDate = formatDate(post.publishedAt);
              const postUrl = `/blog/${post.slug}`;

              return (
                <div
                  key={post.id}
                  className="flex-[0_0_88%] sm:flex-[0_0_50%] lg:flex-[0_0_33.333%] pr-4 min-w-0"
                >
                  <article 
                    itemScope 
                    itemType="https://schema.org/BlogPosting"
                    className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-3xl p-4 flex flex-col justify-between h-full hover:-translate-y-1 hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-black/30 hover:border-gray-200 dark:hover:border-gray-800 transition-all duration-300 group"
                  >
                    <div>
                      {/* Image Container */}
                      <Link href={postUrl} className="block relative aspect-[16/10] w-full overflow-hidden rounded-2xl mb-4 bg-gray-100 dark:bg-gray-900">
                        {post.featuredImage ? (
                          <Image
                            src={post.featuredImage}
                            alt={post.title}
                            fill
                            sizes="(max-w-640px) 100vw, (max-w-1024px) 50vw, 33vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                            itemProp="image"
                          />
                        ) : (
                          <BlogFallbackImage title={post.title} categoryName={post.category?.name} variant="card" />
                        )}
                        
                        {/* Category Tag */}
                        {post.category && (
                          <span className="absolute top-3 right-3 z-10 text-[10px] font-black text-primary-600 dark:text-primary-400 bg-white/95 dark:bg-gray-900/95 px-3 py-1.5 rounded-full shadow-sm">
                            {post.category.name}
                          </span>
                        )}
                      </Link>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-[11px] text-gray-400 dark:text-gray-500 mb-2 font-bold">
                        <div className="flex items-center gap-1">
                          <Calendar size={12} />
                          <time dateTime={new Date(post.publishedAt).toISOString()} itemProp="datePublished">
                            {formattedDate}
                          </time>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          <span>{readTime} مطالعه</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-sm font-black text-gray-900 dark:text-white mb-2 leading-snug line-clamp-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                        <Link href={postUrl} itemProp="headline">
                          {post.title}
                        </Link>
                      </h3>

                      {/* Summary */}
                      {post.summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-4" itemProp="description">
                          {post.summary}
                        </p>
                      )}
                    </div>

                    {/* Footer / Author */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-900/50 mt-auto">
                      {post.author ? (
                        <div className="flex items-center gap-2" itemProp="author" itemScope itemType="https://schema.org/Person">
                          {post.author.avatarUrl ? (
                            <div className="relative w-6 h-6 rounded-full overflow-hidden">
                              <Image
                                src={post.author.avatarUrl}
                                alt={post.author.name}
                                fill
                                className="object-cover"
                                itemProp="image"
                              />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-primary-50 dark:bg-primary-950/30 flex items-center justify-center text-[10px] text-primary-600 dark:text-primary-400 font-bold">
                              {post.author.name.slice(0, 1)}
                            </div>
                          )}
                          <span className="text-[11px] text-gray-600 dark:text-gray-400 font-bold" itemProp="name">
                            {post.author.name}
                          </span>
                        </div>
                      ) : (
                        <div className="w-1" />
                      )}

                      <Link
                        href={postUrl}
                        className="text-[11px] font-black text-primary-600 dark:text-primary-400 flex items-center gap-1 group/btn"
                      >
                        ادامه مطلب
                        <span className="inline-block transition-transform duration-200 group-hover/btn:-translate-x-1">←</span>
                      </Link>
                    </div>
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
