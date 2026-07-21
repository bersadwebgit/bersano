'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles } from 'lucide-react';

interface DemoItem {
  id: string;
  title: string;
  type: string;
  desc: string;
  features: string[];
  aiCapabilities: string[];
  image: string;
  ctaLink: string;
}

const DEMOS: DemoItem[] = [
  {
    id: 'apparel',
    title: 'فروشگاه پوشاک مدرن',
    type: 'پوشاک و مد',
    desc: 'طراحی مینیمال و لوکس، گالری تصاویر پیشرفته، فیلتر سایز و رنگ و خرید سریع در موبایل.',
    features: ['تنوع رنگ و سایز', 'سبد خرید هوشمند', 'اسلایدر و استوری زنده'],
    aiCapabilities: ['تولید خودکار ژورنال با پرامپت', 'تولید سئو و تگ‌های هوشمند پوشاک'],
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=fashion',
  },
  {
    id: 'beauty',
    title: 'فروشگاه آرایشی و زیبایی',
    type: 'آرایشی و بهداشتی',
    desc: 'نمایش دقیق جزئیات محصول، امتیاز و نظرات خریداران و چرخ‌فلک برندهای برتر.',
    features: ['نظرات و امتیاز تصویری', 'دسته‌بندی برندها', 'سیستم تخفیف ویژه'],
    aiCapabilities: ['تولید توضیحات فنی لوازم آرایشی', 'پیشنهاد محصولات مکمل با RAG'],
    image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=beauty',
  },
  {
    id: 'digital',
    title: 'فروشگاه فایل و آموزش',
    type: 'محصول دیجیتال',
    desc: 'ثبت لایسنس و ویدئو، کاتالوگ فایل، دانلود امن و گزارش فروش کالای دانلودی.',
    features: ['دانلود امن و محدودشده', 'گزارش دانلود خریدار', 'تحویل خودکار لایسنس'],
    aiCapabilities: ['تولید سیلابس و توضیحات درسی', 'تولید سوالات متداول کالای دانلودی'],
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=academy',
  },
  {
    id: 'wholesale',
    title: 'فروشگاه عمده‌فروشی (B2B)',
    type: 'عمده‌فروشی',
    desc: 'پنل نمایندگان، قیمت پله‌ای بر اساس تعداد، حداقل سفارش (MOQ) و خرید اعتباری.',
    features: ['حداقل سفارش (MOQ)', 'لیست قیمت پله‌ای', 'فروش اعتباری / بیعانه'],
    aiCapabilities: ['تحلیل کمپین فروش عمده', 'پیشنهاد قیمت پله‌ای بهینه'],
    image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop',
    ctaLink: '/register?demo=b2b',
  },
];

const TABS = [
  { id: 'all', label: 'همه دموها' },
  { id: 'apparel', label: 'پوشاک' },
  { id: 'beauty', label: 'آرایشی' },
  { id: 'digital', label: 'محصول دیجیتال' },
  { id: 'wholesale', label: 'عمده‌فروشی' },
] as const;

export default function DemoGallery() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('all');
  const filtered = activeTab === 'all' ? DEMOS : DEMOS.filter((d) => d.id === activeTab);

  return (
    <div>
      <div className="mx-auto mb-10 flex max-w-lg justify-between rounded-2xl bg-mk-surface-muted p-1.5">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={`rounded-xl px-3 py-2 text-[10px] font-black transition-all sm:text-xs ${
              activeTab === tab.id
                ? 'bg-mk-surface text-primary-600 shadow-sm'
                : 'text-mk-muted hover:text-mk-strong'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {filtered.map((demo) => (
          <article
            key={demo.id}
            className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-mk-line bg-mk-surface transition-all hover:shadow-[var(--mk-shadow-md)]"
          >
            <div className="relative h-52 w-full overflow-hidden bg-mk-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={demo.image}
                alt={`نمونه ${demo.title}`}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
              <span className="absolute right-4 top-4 rounded-lg bg-primary-600 px-3 py-1.5 text-[9px] font-black text-white">
                {demo.type}
              </span>
            </div>
            <div className="space-y-4 p-6">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-mk-strong dark:text-white">{demo.title}</h3>
                <p className="text-[11px] font-bold leading-relaxed text-mk-muted">{demo.desc}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {demo.features.map((f, i) => (
                  <span key={i} className="rounded-lg border border-mk-line bg-mk-surface-muted px-2.5 py-1 text-[9px] font-bold text-mk-muted">
                    {f}
                  </span>
                ))}
              </div>
              <div className="space-y-2 rounded-2xl border border-primary-500/15 bg-primary-50/50 p-4 dark:bg-primary-950/20">
                <div className="flex items-center gap-1.5 text-[9px] font-black text-primary-700 dark:text-primary-300">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                  هوش مصنوعی و RAG فعال:
                </div>
                <ul className="list-inside list-disc space-y-1 text-[9px] font-bold text-mk-muted">
                  {demo.aiCapabilities.map((ai, i) => (
                    <li key={i}>{ai}</li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="mt-auto border-t border-mk-line p-6 pt-4">
              <Link
                href={demo.ctaLink}
                data-analytics-event="demo_click"
                data-analytics-location={`demo_${demo.id}`}
                className="block w-full rounded-xl bg-primary-600 py-3 text-center text-xs font-black text-white shadow-md transition-all hover:bg-primary-700 active:scale-95"
              >
                ساخت مشابه این دمو
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
