'use client';

import { BookOpen, Sparkles, Newspaper } from 'lucide-react';

interface BlogFallbackImageProps {
  title: string;
  categoryName?: string | null;
  className?: string;
  variant?: 'cover' | 'card' | 'thumbnail';
}

export default function BlogFallbackImage({ 
  title, 
  categoryName, 
  className = '', 
  variant = 'card' 
}: BlogFallbackImageProps) {
  // Generate a deterministic color theme based on the title string
  // so that different articles get slightly different but consistent professional minimal gradients
  const getThemeColors = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % 4;
    
    const themes = [
      {
        bg: 'from-slate-50 via-indigo-50/30 to-slate-100 dark:from-slate-900 dark:via-indigo-950/10 dark:to-slate-950',
        accent: 'text-indigo-500/80 dark:text-indigo-400/60',
        badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-100/30 dark:border-indigo-900/20',
        glow: 'bg-indigo-400/5 dark:bg-indigo-500/5'
      },
      {
        bg: 'from-slate-50 via-violet-50/30 to-slate-100 dark:from-slate-900 dark:via-violet-950/10 dark:to-slate-950',
        accent: 'text-violet-500/80 dark:text-violet-400/60',
        badge: 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 border-violet-100/30 dark:border-violet-900/20',
        glow: 'bg-violet-400/5 dark:bg-violet-500/5'
      },
      {
        bg: 'from-slate-50 via-sky-50/30 to-slate-100 dark:from-slate-900 dark:via-sky-950/10 dark:to-slate-950',
        accent: 'text-sky-500/80 dark:text-sky-400/60',
        badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 border-sky-100/30 dark:border-sky-900/20',
        glow: 'bg-sky-400/5 dark:bg-sky-500/5'
      },
      {
        bg: 'from-slate-50 via-emerald-50/30 to-slate-100 dark:from-slate-900 dark:via-emerald-950/10 dark:to-slate-950',
        accent: 'text-emerald-500/80 dark:text-emerald-400/60',
        badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100/30 dark:border-emerald-900/20',
        glow: 'bg-emerald-400/5 dark:bg-emerald-500/5'
      }
    ];
    
    return themes[index];
  };

  const theme = getThemeColors(title);

  // 1. THUMBNAIL VARIANT (Very small, e.g. search suggestions)
  if (variant === 'thumbnail') {
    return (
      <div 
        className={`relative w-full h-full flex items-center justify-center overflow-hidden select-none bg-gradient-to-br ${theme.bg} ${className}`}
        dir="rtl"
      >
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:8px_8px] pointer-events-none" />
        <BookOpen className={`w-4 h-4 z-10 ${theme.accent}`} />
      </div>
    );
  }

  // 2. CARD VARIANT (Medium size, e.g. grid cards, related posts, carousel)
  if (variant === 'card') {
    return (
      <div 
        className={`relative w-full h-full flex flex-col justify-between p-4 sm:p-5 overflow-hidden select-none bg-gradient-to-br ${theme.bg} ${className}`}
        dir="rtl"
      >
        {/* Subtle Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:14px_14px] pointer-events-none" />
        
        {/* Soft Glowing Radial Gradient */}
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full blur-2xl pointer-events-none ${theme.glow}`} />

        {/* Top Section: Category Badge */}
        <div className="flex items-center justify-between z-10 w-full">
          {categoryName ? (
            <span className={`text-[8px] font-black px-2 py-1 rounded-lg border backdrop-blur-xs transition-colors ${theme.badge}`}>
              {categoryName}
            </span>
          ) : (
            <span className="text-[8px] font-black px-2 py-1 rounded-lg border backdrop-blur-xs bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200/30 dark:border-slate-800/20">
              آموزشی
            </span>
          )}
          <Newspaper className={`w-3.5 h-3.5 ${theme.accent}`} />
        </div>

        {/* Middle Section: Centered Title */}
        <div className="flex-1 flex flex-col justify-center items-center text-center px-2 py-2 z-10 w-full">
          <h2 className="text-[11px] sm:text-xs font-black text-slate-800 dark:text-slate-100 leading-relaxed line-clamp-3 drop-shadow-xs">
            {title}
          </h2>
        </div>

        {/* Bottom Section: Minimal Footer Accent */}
        <div className="flex items-center justify-between z-10 w-full border-t border-slate-200/10 dark:border-slate-800/10 pt-2 text-[8px] font-bold text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-0.5">
            <Sparkles className="w-2.5 h-3 text-amber-500/60" />
            <span>مجله</span>
          </div>
          <span>مطالعه</span>
        </div>
      </div>
    );
  }

  // 3. COVER VARIANT (Full details, e.g. main article page)
  return (
    <div 
      className={`relative w-full h-full flex flex-col justify-between p-6 sm:p-8 overflow-hidden select-none bg-gradient-to-br ${theme.bg} ${className}`}
      dir="rtl"
    >
      {/* Subtle Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      {/* Soft Glowing Radial Gradient */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 rounded-full blur-3xl pointer-events-none ${theme.glow}`} />

      {/* Top Section: Category Badge & Minimal Brand Icon */}
      <div className="flex items-center justify-between z-10 w-full">
        {categoryName ? (
          <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl border backdrop-blur-xs transition-colors ${theme.badge}`}>
            {categoryName}
          </span>
        ) : (
          <span className="text-[10px] font-black px-3 py-1.5 rounded-xl border backdrop-blur-xs bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 border-slate-200/30 dark:border-slate-800/20">
            مقاله آموزشی
          </span>
        )}
        <div className={`flex items-center gap-1 ${theme.accent}`}>
          <Newspaper className="w-4 h-4" />
        </div>
      </div>

      {/* Middle Section: Centered Title with Professional Layout */}
      <div className="flex-1 flex flex-col justify-center items-center text-center px-4 sm:px-8 py-4 z-10 max-w-3xl mx-auto w-full">
        <div className="relative">
          {/* Decorative quote mark/icon */}
          <BookOpen className={`w-8 h-8 mx-auto mb-3 opacity-20 ${theme.accent}`} />
          
          <h2 className="text-sm sm:text-base md:text-lg lg:text-xl font-black text-slate-800 dark:text-slate-100 leading-relaxed sm:leading-loose line-clamp-3 drop-shadow-xs">
            {title}
          </h2>
        </div>
      </div>

      {/* Bottom Section: Minimal Footer Accent */}
      <div className="flex items-center justify-between z-10 w-full border-t border-slate-200/20 dark:border-slate-800/20 pt-3 text-[9px] font-bold text-slate-400 dark:text-slate-500">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-amber-500/60" />
          <span>مطالعه هوشمند</span>
        </div>
        <span>مجله تخصصی</span>
      </div>
    </div>
  );
}
