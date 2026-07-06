'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Sparkles, Check, Store, Layers, ShieldCheck, Play, ArrowLeft, Heart, Award, Cpu } from 'lucide-react';

export default function DemoPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'apparel' | 'beauty' | 'digital' | 'wholesale'>('all');

  const demos = [
    {
      id: 'apparel',
      title: 'فروشگاه پوشاک مدرن (Bersana Fashion)',
      type: 'پوشاک و مد',
      desc: 'طراحی مینیمال و لوکس، گالری تصاویر پیشرفته، فیلترهای سایز و رنگ، و فرآیند خرید سریع در موبایل.',
      features: ['تنوع رنگ و سایز', 'سبد خرید هوشمند', 'اسلایدر و استوری زنده'],
      aiCapabilities: ['تولید خودکار ژورنال با پرامپت', 'تولید سئو و تگ‌های هوشمند پوشاک'],
      image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=600&auto=format&fit=crop',
      ctaLink: '/register?demo=fashion'
    },
    {
      id: 'beauty',
      title: 'فروشگاه آرایشی و زیبایی (Bersana Beauty)',
      type: 'آرایشی و بهداشتی',
      desc: 'نمایش بی‌نظیر جزئیات محصول، امتیازدهی و نظرات خریداران، و چرخ‌فلک برندهای برتر.',
      features: ['نظرات و امتیازات تصویری', 'دسته بندی برندها', 'سیستم تخفیف ویژه'],
      aiCapabilities: ['تولید خودکار توضیحات فنی لوازم آرایشی', 'پیشنهاد خودکار محصولات مکمل با RAG'],
      image: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?q=80&w=600&auto=format&fit=crop',
      ctaLink: '/register?demo=beauty'
    },
    {
      id: 'digital',
      title: 'فروشگاه کالای فایل و آموزش (Bersana Academy)',
      type: 'محصول دیجیتال',
      desc: 'سیستم ثبت لایسنس و ویدئوها، کاتالوگ فایلها، دانلود امن، گزارش فروش کالا دانلودی.',
      features: ['لینک‌های دانلود امن و IP-limited', 'گزارش دانلودهای خریدار', 'تحویل خودکار لایسنس'],
      aiCapabilities: ['تولید سیلابس و توضیحات درسی با AI', 'تولید FAQ کلیک‌خور کالا دانلودی'],
      image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600&auto=format&fit=crop',
      ctaLink: '/register?demo=academy'
    },
    {
      id: 'wholesale',
      title: 'فروشگاه عمده‌فروشی آنلاین (Bersana B2B)',
      type: 'عمده‌فروشی',
      desc: 'پنل تخصصی نمایندگان خرید، قیمت پله‌ای بر اساس تعداد (Wholesale Tiers)، MOQ و خرید اعتباری.',
      features: ['حداقل تعداد سفارش (MOQ)', 'لیست قیمت‌های پله‌ای', 'فروش فقط اعتباری / بیعانه'],
      aiCapabilities: ['تحلیل کمپین‌های فروش عمده', 'پیشنهاد قیمت پله‌ای بهینه بر اساس حاشیه سود'],
      image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop',
      ctaLink: '/register?demo=b2b'
    }
  ];

  const filteredDemos = activeTab === 'all' 
    ? demos 
    : demos.filter(d => d.id === activeTab);

  return (
    <div className="text-right font-sans min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      
      {/* Hero Section */}
      <section className="relative pt-16 pb-12 overflow-hidden text-center space-y-6">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-xs font-black">
            <Award className="w-4 h-4 text-blue-500" />
            <span>ویترین دموهای زنده و الهام‌بخش برسانا</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-950 dark:text-white leading-tight">
            دمو فروشگاه‌های هوشمند برسانا
          </h1>

          <p className="text-sm sm:text-md text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-2xl mx-auto">
            قبل از ثبت‌نام، نمونه فروشگاه‌ها را ببینید و با یک کلیک فروشگاهی مشابه برای کسب‌وکار خود بسازید.
          </p>
        </div>
      </section>

      {/* Filter Tabs */}
      <section className="pb-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl max-w-lg mx-auto mb-12 justify-between">
          {[
            { id: 'all', label: 'همه دموها' },
            { id: 'apparel', label: 'پوشاک' },
            { id: 'beauty', label: 'آرایشی' },
            { id: 'digital', label: 'محصول دیجیتال' },
            { id: 'wholesale', label: 'عمده‌فروشی' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-[10px] sm:text-xs font-black transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Demo Cards Grid */}
        <div className="grid sm:grid-cols-2 gap-8">
          {filteredDemos.map((demo) => (
            <div key={demo.id} className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-850 overflow-hidden flex flex-col justify-between shadow-xs hover:shadow-md transition-all group">
              <div className="relative h-56 w-full bg-slate-100 overflow-hidden">
                <img
                  src={demo.image}
                  alt={demo.title}
                  className="object-cover w-full h-full group-hover:scale-102 transition-transform duration-300"
                />
                <div className="absolute top-4 right-4 bg-blue-600 text-white text-[9px] font-black px-3 py-1.5 rounded-lg shadow-sm">
                  {demo.type}
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-xs sm:text-sm font-black text-slate-950 dark:text-white">{demo.title}</h3>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">{demo.desc}</p>
                </div>

                <div className="space-y-2">
                  <div className="text-[9px] font-black text-slate-400">امکانات فروشگاهی فعال:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {demo.features.map((f, i) => (
                      <span key={i} className="text-[9px] font-bold bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-1 rounded-lg">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/40 dark:border-blue-900/30 p-4 rounded-2xl">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-blue-700 dark:text-blue-400">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10" />
                    <span>هوش مصنوعی و RAG فعال:</span>
                  </div>
                  <ul className="text-[9px] text-slate-400 dark:text-slate-500 font-bold space-y-1 list-disc list-inside">
                    {demo.aiCapabilities.map((ai, i) => (
                      <li key={i}>{ai}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-slate-50 dark:border-slate-850 mt-auto">
                <Link href={demo.ctaLink} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-center block py-3 rounded-xl text-xs font-black shadow-md transition-all active:scale-95">
                  ساخت مشابه این دمو
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Customize explanation */}
      <section className="py-16 bg-white dark:bg-slate-900 border-t border-b border-slate-100 dark:border-slate-800/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="w-12 h-12 bg-orange-500/10 text-orange-500 rounded-2xl flex items-center justify-center mx-auto">
            <Cpu className="w-6 h-6" />
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-950 dark:text-white">هر دمو با یک پرامپت فارسی کاملاً شخصی‌سازی می‌شود</h2>
          <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-bold leading-relaxed max-w-xl mx-auto">
            پس از انتخاب هر دمو، شما محدود به ساختار آن نیستید. می‌توانید با تایپ پرامپت ساده (مانند «رنگ‌ها را لوکس‌تر کن»، «۲۰ محصول نمونه پوشاک بچه اضافه کن»، «کد تخفیف اولین خرید را بساز») کل چیدمان و محتوای دمو را زیر و رو کنید.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white">فروشگاهی دقیقاً شبیه دموهای بالا می‌خواهید؟</h2>
          <p className="text-xs sm:text-sm text-slate-500 font-bold">
            ساخت و پیکربندی اولیه به صورت خودکار و آنی در ۶۰ ثانیه به صورت رایگان صورت می‌گیرد.
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/register" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg">
              شروع رایگان ساخت فروشگاه
            </Link>
          </div>
        </div>
      </section>

    </div>
  );
}
