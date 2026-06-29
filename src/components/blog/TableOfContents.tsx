'use client';

import { useState, useEffect, useMemo } from 'react';
import { Menu, ChevronDown, ChevronUp, ArrowUp, Hash } from 'lucide-react';

interface TableOfContentsProps {
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentHtml: string;
  mobileOnly?: boolean;
  desktopOnly?: boolean;
}

interface HeadingItem {
  id: string;
  text: string;
  level: number;
}

interface NumberedHeadingItem extends HeadingItem {
  number: string;
}

// Helper to convert English digits to Persian digits
const toPersianDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[0-9]/g, (w) => persianDigits[parseInt(w)]);
};

export default function TableOfContents({ contentRef, contentHtml, mobileOnly, desktopOnly }: TableOfContentsProps) {
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [showNumbering, setShowNumbering] = useState<boolean>(false);
  const [isOpenMobile, setIsOpenMobile] = useState<boolean>(false);
  const [showBackToTop, setShowBackToTop] = useState<boolean>(false);

  // Parse headings from HTML content
  useEffect(() => {
    if (!contentRef.current) return;

    const headingElements = contentRef.current.querySelectorAll('h2, h3');
    const parsedHeadings: HeadingItem[] = [];

    headingElements.forEach((element, idx) => {
      const text = element.textContent || '';
      const level = element.tagName.toLowerCase() === 'h2' ? 2 : 3;
      
      // Ensure the heading element has a unique ID for scrolling
      let id = element.getAttribute('id');
      if (!id) {
        id = `article-heading-${idx}`;
        element.setAttribute('id', id);
      }

      parsedHeadings.push({ id, text, level });
    });

    setHeadings(parsedHeadings);

    // Initial active heading calculation after a short timeout to let rendering finish
    const timer = setTimeout(() => {
      if (parsedHeadings.length > 0) {
        setActiveId(parsedHeadings[0].id);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [contentRef, contentHtml]);

  // Track active heading and floating "Back to Top" visibility during scroll
  useEffect(() => {
    const handleScroll = () => {
      // 1. "Back to Top" visibility
      setShowBackToTop(window.scrollY > 400);

      // 2. Active Heading Tracking
      if (!contentRef.current || headings.length === 0) return;

      const headingElements = Array.from(contentRef.current.querySelectorAll('h2, h3'));
      if (headingElements.length === 0) return;

      // Calculate the offset (sticky header + padding)
      const header = document.querySelector('header');
      const headerHeight = header ? header.getBoundingClientRect().height : 72;
      const offset = headerHeight + 40; // 40px buffer

      // Find the current heading
      let currentActiveId = headingElements[0].getAttribute('id') || '';

      for (const el of headingElements) {
        const rect = el.getBoundingClientRect();
        // If the element's top is above our offset threshold, it's the current active one
        if (rect.top <= offset) {
          currentActiveId = el.getAttribute('id') || '';
        } else {
          // Since headings are ordered, we can stop once we find one below the threshold
          break;
        }
      }

      if (currentActiveId) {
        setActiveId(currentActiveId);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // Run once on mount / headings change
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [headings, contentRef]);

  // Calculate numbers for headings dynamically based on present levels (e.g., handles H3-only or H2+H3 elegantly)
  const numberedHeadings = useMemo<NumberedHeadingItem[]>(() => {
    if (headings.length === 0) return [];

    // Find unique levels present in headings to determine hierarchy
    const uniqueLevels = Array.from(new Set(headings.map((h) => h.level))).sort((a, b) => a - b);

    let h1Count = 0; // highest level count
    let h2Count = 0; // second highest level count
    let h3Count = 0; // third highest level count

    return headings.map((item) => {
      const levelIndex = uniqueLevels.indexOf(item.level);

      if (levelIndex === 0) {
        h1Count++;
        h2Count = 0;
        h3Count = 0;
        return { ...item, number: `${h1Count}` };
      } else if (levelIndex === 1) {
        h2Count++;
        h3Count = 0;
        return { ...item, number: `${h1Count}.${h2Count}` };
      } else {
        h3Count++;
        return { ...item, number: `${h1Count}.${h2Count}.${h3Count}` };
      }
    });
  }, [headings]);

  // Handle smooth scroll to heading
  const scrollToHeading = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (!element) return;

    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });

    // Close mobile accordion after selection
    setIsOpenMobile(false);
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  if (headings.length === 0) return null;

  return (
    <>
      {/* 1. DESKTOP VIEW (Sidebar, Sticky) */}
      {!mobileOnly && (
        <div className="hidden lg:block lg:sticky lg:top-24 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-5 shadow-sm space-y-4 max-h-[calc(100vh-8rem)] overflow-y-auto">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <h3 className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1.5">
              <Menu className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
              در این مقاله می‌خوانید
            </h3>
            
            {/* Toggle Numbering Option */}
            <button 
              onClick={() => setShowNumbering(!showNumbering)}
              title={showNumbering ? "غیرفعال‌سازی شماره‌گذاری" : "فعال‌سازی شماره‌گذاری"}
              className={`p-1.5 rounded-lg transition-colors border ${
                showNumbering 
                  ? 'bg-indigo-600/10 border-indigo-500/20 text-indigo-600' 
                  : 'bg-gray-50 border-gray-100 hover:bg-gray-100 text-gray-400 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Heading Links with Elegant Progress Indicator */}
          <nav className="relative space-y-1">
            {numberedHeadings.map((item) => {
              const isActive = activeId === item.id;
              const uniqueLevels = Array.from(new Set(headings.map((h) => h.level))).sort((a, b) => a - b);
              const levelIndex = uniqueLevels.indexOf(item.level);
              const isSubHeading = levelIndex > 0;

              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={(e) => scrollToHeading(item.id, e)}
                  className={`relative group flex items-start gap-2 py-2 px-3.5 rounded-xl transition-all duration-200 text-xs ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-50/50 dark:bg-indigo-950/20'
                      : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 font-bold hover:bg-gray-50/50 dark:hover:bg-gray-800/30'
                  }`}
                  style={{ 
                    paddingRight: isSubHeading ? `${(levelIndex * 1.1) + 0.875}rem` : '0.875rem'
                  }}
                >
                  {/* Active Indicator Strip on the Right side */}
                  {isActive && (
                    <span className="absolute right-0 top-2 bottom-2 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-l-full animate-in fade-in zoom-in-y duration-200" />
                  )}

                  {showNumbering && (
                    <span className={`font-mono text-[10px] flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-gray-300 dark:text-gray-600'}`}>
                      {toPersianDigits(item.number)}.
                    </span>
                  )}
                  <span className="line-clamp-2 leading-relaxed">{item.text}</span>
                </a>
              );
            })}
          </nav>

          {/* Back to Top Quick Action */}
          <button
            onClick={scrollToTop}
            className="w-full flex items-center justify-center gap-1.5 py-2 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800/40 dark:hover:bg-gray-800 border border-gray-100/50 dark:border-gray-800/80 rounded-xl text-[10px] font-black text-gray-500 dark:text-gray-300 transition-all hover:text-indigo-600 dark:hover:text-indigo-400"
          >
            <ArrowUp className="w-3.5 h-3.5" />
            بازگشت به بالای صفحه
          </button>
        </div>
      )}

      {/* 2. MOBILE VIEW (Accordion, Collapsible) */}
      {!desktopOnly && (
        <div className="block lg:hidden bg-gray-50/60 dark:bg-gray-900/30 border border-gray-100/80 dark:border-gray-800/60 rounded-2xl overflow-hidden mb-6">
          {/* Accordion Trigger Header */}
          <button
            onClick={() => setIsOpenMobile(!isOpenMobile)}
            className="w-full flex items-center justify-between p-4 focus:outline-none"
          >
            <span className="text-xs font-black text-gray-800 dark:text-white flex items-center gap-1.5">
              <Menu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              فهرست مطالب این مقاله
            </span>
            <div className="flex items-center gap-2">
              {activeId && !isOpenMobile && (
                <span className="text-[10px] font-bold text-indigo-650 bg-indigo-600/10 px-2.5 py-1 rounded-lg line-clamp-1 max-w-[150px]">
                  {headings.find(h => h.id === activeId)?.text}
                </span>
              )}
              {isOpenMobile ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
          </button>

          {/* Accordion Content */}
          {isOpenMobile && (
            <div className="border-t border-gray-100 dark:border-gray-800/60 p-4 space-y-4 bg-white dark:bg-gray-950/20 animate-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 pb-2 border-b border-gray-100 dark:border-gray-800/60">
                <span>جهت پرش به بخش مورد نظر کلیک کنید:</span>
                <button 
                  onClick={() => setShowNumbering(!showNumbering)}
                  className="flex items-center gap-1 text-indigo-600 hover:underline"
                >
                  <Hash className="w-3 h-3" />
                  {showNumbering ? 'حذف شماره‌گذاری' : 'شماره‌گذاری'}
                </button>
              </div>

              <nav className="space-y-1">
                {numberedHeadings.map((item) => {
                  const isActive = activeId === item.id;
                  const uniqueLevels = Array.from(new Set(headings.map((h) => h.level))).sort((a, b) => a - b);
                  const levelIndex = uniqueLevels.indexOf(item.level);
                  const isSubHeading = levelIndex > 0;

                  return (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      onClick={(e) => scrollToHeading(item.id, e)}
                      className={`relative flex items-start gap-2 py-2 px-3 rounded-xl transition-all duration-200 text-xs ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400 font-extrabold bg-indigo-600/5'
                          : 'text-gray-500 dark:text-gray-400 font-bold hover:bg-gray-50/50'
                      }`}
                      style={{ 
                        paddingRight: isSubHeading ? `${(levelIndex * 1) + 0.75}rem` : '0.75rem'
                      }}
                    >
                      {isActive && (
                        <span className="absolute right-0 top-1.5 bottom-1.5 w-1 bg-indigo-600 dark:bg-indigo-400 rounded-l-full" />
                      )}

                      {showNumbering && (
                        <span className="font-mono text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">
                          {toPersianDigits(item.number)}.
                        </span>
                      )}
                      <span>{item.text}</span>
                    </a>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      )}

      {/* 3. FLOATING BACK TO TOP BUTTON (Mobile & Desktop) */}
      {showBackToTop && (
        <button
          onClick={scrollToTop}
          title="بازگشت به بالا"
          className="fixed bottom-6 left-6 z-50 p-3.5 bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-full shadow-lg shadow-indigo-500/20 transition-all duration-300 hover:scale-110 active:scale-95 animate-in fade-in zoom-in-50"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
