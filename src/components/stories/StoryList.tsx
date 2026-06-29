'use client';

import { useState, useEffect, useRef } from 'react';
import { Story } from '@/types';
import StoryViewer from './StoryViewer';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface StoryListProps {
  onSelectCategory?: (category: string) => void;
  selectedCategory?: string;
  onStoriesLoaded?: (count: number) => void;
  displayLocation?: 'shop' | 'custom' | 'both';
}

function StoryTitle({ title }: { title: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      const container = containerRef.current;
      const text = textRef.current;
      if (container && text) {
        // Temporarily reset styles to measure original content width
        const originalStyle = text.style.cssText;
        text.style.maxWidth = 'none';
        text.style.overflow = 'visible';
        text.style.textOverflow = 'clip';
        
        const scrollWidth = text.scrollWidth;
        const clientWidth = container.clientWidth;
        const overflow = scrollWidth - clientWidth;
        
        // Restore styles
        text.style.cssText = originalStyle;

        if (overflow > 1) {
          setIsOverflowing(true);
          text.style.setProperty('--overflow-width', `${overflow}px`);
        } else {
          setIsOverflowing(false);
          text.style.removeProperty('--overflow-width');
        }
      }
    };

    checkOverflow();
    const timer = setTimeout(checkOverflow, 400);

    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [title]);

  return (
    <div 
      ref={containerRef} 
      className="w-16 md:w-20 overflow-hidden whitespace-nowrap text-center relative flex justify-center"
    >
      <span 
        ref={textRef}
        className={`story-title-scroll inline-block text-[10px] md:text-[11px] text-gray-700 dark:text-gray-300 font-bold text-center w-full ${
          isOverflowing ? 'is-overflowing' : ''
        }`}
      >
        {title}
      </span>
    </div>
  );
}

export default function StoryList({ onSelectCategory, selectedCategory, onStoriesLoaded, displayLocation = 'both' }: StoryListProps = {}) {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryIndex, setSelectedStoryIndex] = useState<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    fetch('/api/stories')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStories(data);
          if (onStoriesLoaded) {
            // Filter active count matching location
            const activeCount = data.filter((s: any) => s.isActive && (s.displayLocation === displayLocation || s.displayLocation === 'both' || !s.displayLocation)).length;
            onStoriesLoaded(activeCount);
          }
        }
      })
      .catch(err => console.error(err));
  }, [onStoriesLoaded, displayLocation]);

  const activeStories = stories.filter(story => story.isActive && (story.displayLocation === displayLocation || story.displayLocation === 'both' || !story.displayLocation));

  const checkScrollable = () => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScroll(scrollWidth > clientWidth + 5);
    }
  };

  useEffect(() => {
    if (activeStories.length > 0) {
      const timer = setTimeout(() => {
        checkScrollable();
      }, 100);
      window.addEventListener('resize', checkScrollable);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', checkScrollable);
      };
    }
  }, [activeStories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const scrollAmount = clientWidth * 0.75;
      scrollContainerRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  if (activeStories.length === 0) {
    return null;
  }

  return (
    <div className="relative group w-full bg-white dark:bg-gray-900 py-4 border-b border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-[0_4px_20px_color-mix(in_srgb,var(--primary)_4%,transparent)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
      <div 
        ref={scrollContainerRef}
        onScroll={checkScrollable}
        className="flex overflow-x-auto gap-4 px-2 scrollbar-hide snap-x items-center scroll-smooth"
      >
        {activeStories.map((story, index) => (
          <div 
            key={story.id} 
            className="story-item flex flex-col items-center gap-1.5 cursor-pointer snap-start shrink-0"
            onClick={() => {
              setSelectedStoryIndex(index);
              if (story.category && onSelectCategory) {
                onSelectCategory(story.category);
              }
            }}
          >
            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full p-[2px] transition-all duration-300 ${
              selectedCategory === story.category && story.category 
                ? 'bg-primary-600 shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_40%,transparent)] scale-105' 
                : 'bg-story-ring hover:shadow-[0_0_10px_color-mix(in_srgb,var(--primary)_25%,transparent)] hover:scale-102'
            }`}>
              <div className="w-full h-full rounded-full border-2 border-white dark:border-gray-900 overflow-hidden relative bg-gray-200 dark:bg-gray-800">
                <Image 
                  src={story.thumbnailUrl?.startsWith('/') || story.thumbnailUrl?.startsWith('http') ? story.thumbnailUrl : '/globe.svg'} 
                  alt={story.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 64px, 80px"
                />
              </div>
            </div>
            <StoryTitle title={story.title} />
          </div>
        ))}
      </div>

      {canScroll && (
        <>
          {/* Right Button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-750 flex items-center justify-center border border-gray-200/60 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 shadow-md md:opacity-0 md:group-hover:opacity-100 hidden md:flex cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Scroll Right"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Left Button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-750 flex items-center justify-center border border-gray-200/60 dark:border-gray-700 text-gray-700 dark:text-gray-300 transition-all duration-200 shadow-md md:opacity-0 md:group-hover:opacity-100 hidden md:flex cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Scroll Left"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </>
      )}

      {selectedStoryIndex !== null && (
        <StoryViewer 
          stories={activeStories} 
          initialIndex={selectedStoryIndex} 
          onClose={() => setSelectedStoryIndex(null)} 
        />
      )}
    </div>
  );
}
