import Link from 'next/link';
import { Check, Clock3, Mail } from 'lucide-react';
import BersanaBrand from '@/components/marketing/BersanaBrand';

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
  { name: 'قوانین و مقررات', href: '/terms' },
  { name: 'حریم خصوصی', href: '/privacy' },
];

export default function MarketingFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="marketing-footer relative overflow-hidden border-t border-slate-800 bg-[#07101f] text-slate-400">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-blue-500/70 to-transparent" />
      <div className="pointer-events-none absolute -right-40 -top-40 size-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-10 border-b border-white/8 pb-12 md:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="space-y-5 lg:col-span-4">
            <BersanaBrand inverse />
            <p className="max-w-sm text-[11px] font-medium leading-6 text-slate-400">
              برسانا پلتفرم فروشگاه‌ساز هوشمند است؛ فروشگاه آنلاین خود را می‌سازید و آن را با گفت‌وگوی ساده فارسی مدیریت می‌کنید — از ثبت محصول و تولید محتوا تا سئو و تحلیل فروش.
            </p>
          </div>

          {[
            { title: 'امکانات پلتفرم', links: productLinks },
            { title: 'راهکارها', links: solutionsLinks },
            { title: 'منابع و پشتیبانی', links: resourcesLinks },
          ].map((column) => (
            <div key={column.title} className="lg:col-span-2">
              <h2 className="mb-4 text-[11px] font-black text-white">{column.title}</h2>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="group inline-flex items-center gap-1.5 text-[10px] font-semibold transition-colors hover:text-white">
                      <Check className="size-3 text-slate-600 transition-colors group-hover:text-blue-400" />
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="lg:col-span-2">
            <h2 className="mb-4 text-[11px] font-black text-white">ارتباط با ما</h2>
            <ul className="space-y-3 text-[10px] font-semibold leading-5">
              <li className="flex items-center gap-2"><Mail className="size-3.5 text-blue-400" /><span dir="ltr">support@bersana.ir</span></li>
              <li className="flex items-center gap-2"><Clock3 className="size-3.5 text-blue-400" /><span>شنبه تا پنج‌شنبه، ۹ تا ۱۸</span></li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 pt-7 text-center text-[10px] font-semibold text-slate-500 sm:flex-row sm:text-right">
          <p>© {currentYear} برسانا. تمامی حقوق محفوظ است.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            <Link href="/compare/custom-website" className="transition-colors hover:text-slate-300">مقایسه با سایت اختصاصی</Link>
            <Link href="/compare/instagram" className="transition-colors hover:text-slate-300">مقایسه با اینستاگرام</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
