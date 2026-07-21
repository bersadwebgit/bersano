import Link from 'next/link';
import { Store, ShieldCheck, Camera, Send, Briefcase, Play } from 'lucide-react';
import type { ContactInfoConfig, SocialLinksConfig, LegalInfoConfig } from '@/lib/marketing-globals';
import { getMarketingGlobalsDefaults } from '@/lib/marketing-globals';

interface MarketingFooterProps {
  contact?: ContactInfoConfig;
  social?: SocialLinksConfig;
  legal?: LegalInfoConfig;
}

export default function MarketingFooter({ contact, social, legal }: MarketingFooterProps) {
  const defaults = getMarketingGlobalsDefaults();
  const c = contact || defaults.contact;
  const s = social || defaults.social;
  const l = legal || defaults.legal;
  const currentYear = new Date().getFullYear();

  const productLinks = [
    { name: 'امکانات اصلی', href: '/features' },
    { name: 'هوش مصنوعی (AI/RAG)', href: '/ai' },
    { name: 'نمونه دموها', href: '/demo' },
    { name: 'تعرفه‌ها و قیمت', href: '/pricing' },
  ];

  const solutionsLinks = [
    { name: 'فروشگاه اینستاگرامی', href: '/instagram-shop' },
    { name: 'سامانه عمده‌فروشی', href: '/wholesale' },
    { name: 'فروش فایل و لایسنس', href: '/digital-products' },
    { name: 'پرداخت و ارسال', href: '/payments-shipping' },
    { name: 'سئو و تولید محتوا', href: '/seo-content' },
  ];

  const resourcesLinks = [
    { name: 'مقالات وبلاگ', href: '/blog' },
    { name: 'سوالات متداول', href: '/faq' },
    { name: 'درباره ما', href: '/about' },
    { name: 'ارتباط با ما', href: '/contact' },
  ];

  const legalLinks = [
    { name: 'قوانین و مقررات', href: '/terms' },
    { name: 'حریم خصوصی', href: '/privacy' },
  ];

  const socialItems = [
    { href: s.instagram, icon: Camera, label: 'اینستاگرام' },
    { href: s.telegram, icon: Send, label: 'تلگرام' },
    { href: s.linkedin, icon: Briefcase, label: 'لینکدین' },
    { href: s.youtube, icon: Play, label: 'یوتیوب' },
  ].filter((item) => item.href);

  return (
    <footer className="border-t border-slate-800 bg-slate-900 py-16 text-slate-400 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 border-b border-slate-800 pb-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand Info */}
          <div className="space-y-6 lg:col-span-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
                <Store className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black text-white">برسانا</span>
                <span className="text-[10px] font-bold text-blue-400">فروشگاه‌ساز هوشمند</span>
              </div>
            </Link>
            <p className="max-w-sm text-xs font-bold leading-relaxed text-slate-400">
              برسانا پلتفرم فروشگاه‌ساز هوشمند است؛ فروشگاه آنلاین خود را می‌سازید و آن را با گفت‌وگوی
              ساده فارسی مدیریت می‌کنید — از ثبت محصول و تولید محتوا تا سئو و تحلیل فروش.
            </p>
            {socialItems.length > 0 && (
              <div className="flex items-center gap-3 pt-1">
                {socialItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-700 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
                  >
                    <item.icon className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Product links */}
          <nav aria-label="امکانات پلتفرم" className="space-y-4 lg:col-span-2">
            <h2 className="text-xs font-black tracking-wider text-white">امکانات پلتفرم</h2>
            <ul className="space-y-2.5 text-xs font-bold">
              {productLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Solutions links */}
          <nav aria-label="راهکارها" className="space-y-4 lg:col-span-2">
            <h2 className="text-xs font-black tracking-wider text-white">راهکارها</h2>
            <ul className="space-y-2.5 text-xs font-bold">
              {solutionsLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Resources + legal */}
          <nav aria-label="منابع" className="space-y-4 lg:col-span-2">
            <h2 className="text-xs font-black tracking-wider text-white">منابع و پشتیبانی</h2>
            <ul className="space-y-2.5 text-xs font-bold">
              {[...resourcesLinks, ...legalLinks].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition-colors hover:text-white">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contact / Trust */}
          <div className="space-y-4 text-right lg:col-span-2">
            <h2 className="text-xs font-black tracking-wider text-white">ارتباط با ما</h2>
            <div className="space-y-2 text-xs font-bold text-slate-400">
              {c.address && <p>{c.address}</p>}
              {c.phone && <p className="dir-ltr text-right">{c.phone}</p>}
              {c.email && (
                <p className="dir-ltr text-right">
                  <a href={`mailto:${c.email}`} className="hover:text-white">
                    {c.email}
                  </a>
                </p>
              )}
              {c.hours && <p className="text-[11px] text-slate-500">{c.hours}</p>}
            </div>
            {(l.enamadUrl || l.samandehiUrl) && (
              <div className="flex gap-2 pt-2">
                {l.enamadUrl && (
                  <a href={l.enamadUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-400 transition-colors hover:border-slate-600">
                    اینماد
                  </a>
                )}
                {l.samandehiUrl && (
                  <a href={l.samandehiUrl} target="_blank" rel="noopener noreferrer" className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-[10px] font-bold text-slate-400 transition-colors hover:border-slate-600">
                    ساماندهی
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center justify-between gap-4 pt-8 text-xs font-bold text-slate-500 sm:flex-row">
          <p className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />© {currentYear} {l.companyName}. تمامی حقوق محفوظ است.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/compare/custom-website" className="transition-colors hover:text-slate-300">
              مقایسه با سایت اختصاصی
            </Link>
            <Link href="/compare/instagram" className="transition-colors hover:text-slate-300">
              مقایسه با اینستاگرام
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
