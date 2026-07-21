'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';

export default function StickyMobileCTA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsVisible(window.scrollY > 420);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div aria-hidden={!isVisible} className={`fixed inset-x-0 bottom-0 z-[80] p-3 transition-all duration-300 lg:hidden ${isVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-full opacity-0'}`}>
      <div className="mx-auto flex max-w-md items-center gap-2 rounded-[18px] border border-white/70 bg-white/90 p-1.5 shadow-[0_20px_60px_-20px_rgba(15,23,42,.45)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
        <Link href="/register" tabIndex={isVisible ? 0 : -1} className="marketing-primary-button flex-1 !min-h-11 !rounded-[13px] !py-2.5 !text-xs">
          <Sparkles className="size-4 text-amber-300" />
          <span>شروع رایگان — همین الان</span>
          <ArrowLeft className="size-4" />
        </Link>
      </div>
    </div>
  );
}
