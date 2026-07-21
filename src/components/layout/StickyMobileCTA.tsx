'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

export default function StickyMobileCTA({
  label = 'شروع رایگان — همین الان',
  href = '/register',
}: {
  label?: string;
  href?: string;
}) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show sticky CTA after scrolling 400px down
      setIsVisible(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 p-3 bg-white/80 dark:bg-slate-950/80 backdrop-blur-lg border-t border-slate-100 dark:border-slate-800">
      <Link
        href={href}
        data-analytics-event="sticky_cta_click"
        data-analytics-location="sticky_mobile"
        className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full py-3.5 rounded-2xl text-sm font-black shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all"
      >
        <Sparkles className="w-4 h-4 text-amber-300 fill-amber-200 animate-pulse" />
        <span>{label}</span>
      </Link>
    </div>
  );
}
