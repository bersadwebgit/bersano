'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  CreditCard,
  FileText,
  Menu,
  PackageOpen,
  Sparkles,
  Store,
  UsersRound,
  X,
} from 'lucide-react';
import BersanaBrand from '@/components/marketing/BersanaBrand';

const navigation = [
  { name: 'امکانات', href: '/features' },
  { name: 'هوش مصنوعی', href: '/ai' },
  { name: 'دمو', href: '/demo' },
  { name: 'تعرفه‌ها', href: '/pricing' },
];

const solutions = [
  { name: 'فروشگاه اینستاگرامی', href: '/instagram-shop', desc: 'تبدیل مخاطبان دایرکت به خریدار وفادار', icon: Store },
  { name: 'عمده‌فروشی', href: '/wholesale', desc: 'پنل اختصاصی B2B، قیمت پله‌ای و اعتبار', icon: UsersRound },
  { name: 'محصولات دیجیتال', href: '/digital-products', desc: 'فروش فایل، لایسنس و دوره با دانلود امن', icon: PackageOpen },
  { name: 'پرداخت و ارسال', href: '/payments-shipping', desc: 'درگاه‌های محلی و سیستم‌های پیشرفته پستی', icon: CreditCard },
  { name: 'سئو و محتوا', href: '/seo-content', desc: 'تولید محتوا و رتبه گرفتن در گوگل با AI', icon: FileText },
];

export default function MarketingHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);
  const solutionsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 12);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsSolutionsOpen(false);
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (solutionsRef.current && !solutionsRef.current.contains(event.target as Node)) {
        setIsSolutionsOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const isActive = (href: string) => pathname === href || (href === '/blog' && pathname?.startsWith('/blog'));
  const solutionsActive = solutions.some((item) => isActive(item.href));

  return (
    <header className={`marketing-header sticky top-0 z-[90] transition-all duration-300 ${isScrolled || isMobileMenuOpen ? 'is-scrolled' : ''}`}>
      <Link href="#main-content" className="marketing-skip-link">رفتن به محتوای اصلی</Link>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-4 lg:h-[76px]">
          <BersanaBrand className="relative z-10" />

          <nav aria-label="ناوبری اصلی" className="hidden items-center rounded-2xl border border-slate-200/70 bg-white/70 p-1 shadow-[0_10px_35px_-25px_rgba(15,23,42,.45)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/65 lg:flex">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
                className={`marketing-nav-link ${isActive(item.href) ? 'is-active' : ''}`}
              >
                {item.name}
              </Link>
            ))}

            <div ref={solutionsRef} className="relative">
              <button
                type="button"
                onClick={() => setIsSolutionsOpen((open) => !open)}
                aria-expanded={isSolutionsOpen}
                aria-controls="marketing-solutions-menu"
                className={`marketing-nav-link gap-1 ${solutionsActive ? 'is-active' : ''}`}
              >
                <span>راهکارها</span>
                <ChevronDown className={`size-3.5 transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} />
              </button>

              {isSolutionsOpen && (
                <div
                  id="marketing-solutions-menu"
                  className="absolute right-1/2 top-[calc(100%+14px)] w-[610px] translate-x-1/2 rounded-[24px] border border-slate-200/80 bg-white/95 p-3 shadow-[0_30px_80px_-28px_rgba(15,23,42,.35)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/95"
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {solutions.map((solution) => (
                      <Link key={solution.href} href={solution.href} onClick={() => setIsSolutionsOpen(false)} className="group flex gap-3 rounded-2xl p-3 text-right transition-colors hover:bg-blue-50/70 dark:hover:bg-blue-950/25">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200/70 bg-white text-slate-500 transition-colors group-hover:border-blue-200 group-hover:text-blue-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                          <solution.icon className="size-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[11px] font-black text-slate-800 transition-colors group-hover:text-blue-700 dark:text-slate-100 dark:group-hover:text-blue-400">{solution.name}</span>
                          <span className="mt-1 block text-[9px] font-medium leading-5 text-slate-400">{solution.desc}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/blog" aria-current={isActive('/blog') ? 'page' : undefined} className={`marketing-nav-link ${isActive('/blog') ? 'is-active' : ''}`}>
              وبلاگ
            </Link>
          </nav>

          <div className="hidden items-center gap-1.5 lg:flex">
            <Link href="/login" className="rounded-xl px-4 py-2.5 text-[11px] font-extrabold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white">
              ورود
            </Link>
            <Link href="/register" className="marketing-primary-button !min-h-10 !rounded-xl !px-4 !py-2.5 !text-[11px]">
              <Sparkles className="size-3.5 text-amber-300" />
              <span>ساخت فروشگاه رایگان</span>
              <ArrowLeft className="size-3.5" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((open) => !open)}
            aria-label={isMobileMenuOpen ? 'بستن منو' : 'باز کردن منو'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="marketing-mobile-menu"
            className="relative z-10 grid size-10 place-items-center rounded-xl border border-slate-200/80 bg-white/80 text-slate-700 shadow-sm outline-none transition hover:border-blue-200 hover:text-blue-600 focus-visible:ring-4 focus-visible:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 lg:hidden"
          >
            {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div id="marketing-mobile-menu" className="lg:hidden">
          <button type="button" aria-label="بستن منو" onClick={() => setIsMobileMenuOpen(false)} className="fixed inset-0 top-[68px] z-[-1] bg-slate-950/25 backdrop-blur-[2px]" />
          <div className="absolute inset-x-3 top-[calc(100%+8px)] max-h-[calc(100dvh-92px)] overflow-y-auto rounded-[24px] border border-slate-200/80 bg-white/97 p-3 shadow-[0_30px_80px_-24px_rgba(15,23,42,.42)] backdrop-blur-2xl dark:border-slate-800 dark:bg-slate-950/97 sm:inset-x-6">
            <nav aria-label="ناوبری موبایل" className="grid grid-cols-2 gap-1.5">
              {[...navigation, { name: 'وبلاگ', href: '/blog' }].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setIsMobileMenuOpen(false)} className={`rounded-xl px-3 py-3 text-center text-[11px] font-extrabold transition-colors ${isActive(item.href) ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700 dark:bg-slate-900 dark:text-slate-200'}`}>
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="my-3 h-px bg-slate-100 dark:bg-slate-800" />
            <p className="mb-2 px-1 text-[10px] font-black text-slate-400">راهکارها</p>
            <div className="space-y-1">
              {solutions.map((solution) => (
                <Link key={solution.href} href={solution.href} onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-colors ${isActive(solution.href) ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400' : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'}`}>
                  <span className="grid size-8 place-items-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"><solution.icon className="size-4" /></span>
                  <span>
                    <span className="block text-[11px] font-black">{solution.name}</span>
                    <span className="mt-0.5 block text-[9px] font-medium text-slate-400">{solution.desc}</span>
                  </span>
                </Link>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link href="/login" onClick={() => setIsMobileMenuOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 text-[11px] font-black text-slate-700 dark:border-slate-800 dark:text-slate-200">ورود</Link>
              <Link href="/register" onClick={() => setIsMobileMenuOpen(false)} className="marketing-primary-button !min-h-11 !rounded-xl !px-3 !py-2.5 !text-[11px]"><Sparkles className="size-3.5 text-amber-300" />ساخت فروشگاه رایگان</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
