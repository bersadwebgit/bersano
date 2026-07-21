'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, ChevronDown, Sparkles, Store } from 'lucide-react';

export default function MarketingHeader({ ctaLabel = 'شروع رایگان' }: { ctaLabel?: string }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: 'امکانات', href: '/features' },
    { name: 'هوش مصنوعی', href: '/ai' },
    { name: 'دمو', href: '/demo' },
    { name: 'تعرفه‌ها', href: '/pricing' },
  ];

  const solutions = [
    { name: 'فروشگاه اینستاگرامی', href: '/instagram-shop', desc: 'تبدیل مخاطبان دایرکت به خریدار وفادار' },
    { name: 'عمده‌فروشی', href: '/wholesale', desc: 'پنل اختصاصی B2B، قیمت پله‌ای و اعتبار' },
    { name: 'محصولات دیجیتال', href: '/digital-products', desc: 'فروش فایل، لایسنس و دوره با دانلود امن' },
    { name: 'پرداخت و ارسال', href: '/payments-shipping', desc: 'درگاه‌های محلی و سیستم‌های پیشرفته پستی' },
    { name: 'سئو و محتوا', href: '/seo-content', desc: 'تولید محتوا و رتبه گرفتن در گوگل با AI' },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-xs'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all">
                <Store className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight text-slate-900 dark:text-white">برسانا</span>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">فروشگاه‌ساز هوشمند</span>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-6">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`text-xs font-bold transition-colors ${
                    pathname === item.href
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.name}
                </Link>
              ))}

              {/* Solutions Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
                  onMouseEnter={() => setIsSolutionsOpen(true)}
                  className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                >
                  <span>راهکارها</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSolutionsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSolutionsOpen && (
                  <div
                    onMouseLeave={() => setIsSolutionsOpen(false)}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xl p-3 space-y-1 animate-fadeIn"
                  >
                    {solutions.map((sol) => (
                      <Link
                        key={sol.href}
                        href={sol.href}
                        onClick={() => setIsSolutionsOpen(false)}
                        className="block px-4 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-right group"
                      >
                        <div className="text-xs font-black text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {sol.name}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">
                          {sol.desc}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Blog Link */}
              <Link
                href="/blog"
                className={`text-xs font-bold transition-colors ${
                  pathname?.startsWith('/blog')
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                وبلاگ
              </Link>
            </nav>
          </div>

          {/* Action Buttons */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              href="/login"
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-4 py-2"
            >
              ورود
            </Link>
            <Link
              href="/register"
              data-analytics-event="hero_cta_click"
              data-analytics-location="header"
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-sm shadow-blue-500/10 hover:shadow-blue-500/25 transition-all active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-300 animate-pulse" />
              <span>{ctaLabel}</span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

        </div>
      </div>

      {/* Mobile Menu — compact floating overlay */}
      {isMobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 top-16 bg-black/20 dark:bg-black/40 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Panel */}
          <div className="lg:hidden absolute top-full left-0 right-0 z-50 bg-white/97 dark:bg-slate-950/97 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 shadow-xl">
            <div className="px-4 py-3 space-y-2.5">

              {/* Main nav — compact grid */}
              <div className="grid grid-cols-3 gap-1">
                {[...navigation, { name: 'وبلاگ', href: '/blog' }].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`text-center py-2 px-1 rounded-xl text-xs font-bold transition-colors ${
                      pathname === item.href || (item.href === '/blog' && pathname?.startsWith('/blog'))
                        ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/60'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>

              {/* Solutions — collapsible row */}
              <div className="border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setIsSolutionsOpen(!isSolutionsOpen)}
                  className="w-full flex items-center justify-between py-2.5 text-xs font-black text-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  <span>راهکارها</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} />
                </button>

                {isSolutionsOpen && (
                  <div className="grid grid-cols-2 gap-1 pb-2">
                    {solutions.map((sol) => (
                      <Link
                        key={sol.href}
                        href={sol.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-xs font-bold text-slate-600 dark:text-slate-300 py-2 px-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors truncate"
                      >
                        {sol.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-0.5 border-t border-slate-100 dark:border-slate-800 pt-2.5">
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                >
                  ورود
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-analytics-event="hero_cta_click"
                  data-analytics-location="header_mobile"
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-black shadow-sm shadow-blue-500/20 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 fill-amber-200" />
                  <span>{ctaLabel}</span>
                </Link>
              </div>

            </div>
          </div>
        </>
      )}
    </header>
  );
}
