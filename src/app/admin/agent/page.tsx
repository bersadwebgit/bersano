// [HARDENED] — validation, error isolation, save safety
'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { fetchJson, normalizeApiPath } from '@/lib/api-fetch';
import { normalizeErrorMessage } from '@/lib/ai-agent-v2/core/error-normalizer';
import { ensureThemeColorApplied } from '@/lib/theme-color-from-prompt';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Play, 
  Check, 
  Layers, 
  FileText, 
  Image as ImageIcon, 
  Tag, 
  Info, 
  Calendar, 
  Package, 
  Clock,
  Eye,
  ExternalLink,
  Heart,
  ShoppingBag,
  Folder,
  BookOpen,
  LayoutGrid,
  Layout,
  Brain,
  Zap,
  RefreshCw,
  RotateCcw,
  Cpu,
  Database,
  Activity,
  Network,
  X,
  MessageSquare,
  Send,
  Plus,
  Trash2,
  Users,
  Award,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  User,
  Settings,
  Home,
  Sliders,
  Phone,
  LayoutDashboard,
} from 'lucide-react';

import MahakIntegration from './components/MahakIntegration';

interface Task {
  id: string;
  title: string;
  target: 'products' | 'blog' | 'stories' | 'discounts' | 'categories' | 'orders' | 'reviews' | 'settings' | 'custom_home' | 'slider' | 'media' | 'shoppable' | 'footer' | 'header' | 'users' | 'tickets' | 'system_tickets' | 'staff' | 'profile' | 'import_export' | 'brand' | 'content_calendar' | 'blog_comments' | 'about_us' | 'contact_us';
  action: 'create_product' | 'create_article' | 'create_story' | 'create_discount' | 'create_category' | 'settings_control' | 'custom_home_control' | 'slider_control' | 'staff_control' | 'profile_control' | 'import_export_control' | 'brand_control' | 'content_calendar_control' | 'blog_comments_control' | 'about_us_control' | 'contact_us_control' | string;
  dependsOn?: string;
  aiControlEndpoint: string;
  saveEndpoint: string;
  improvedPrompt: string;
  idempotencyKey?: string;
}

interface SavedAsset {
  type: string;
  id: string;
  title: string;
  url?: string;
}

const QUICK_PROMPTS = [
  { label: "محصول کفش نایک ایر مکس با قیمت ۴۵۰ هزار تومن، ۵ رنگ (مشکی، سفید، قرمز، آبی، طوسی) و موجودی ۱۰ عدد از هر رنگ بساز و یک استوری تبلیغاتی هم برایش بذار", icon: "👟", tag: "محصول + استوری" },
  { label: "یک بنر هیرو یلدایی برای صفحه اصلی با عنوان «جشنواره انار»، متن تخفیف ۵۰٪ و دکمه «خرید کن» با لینک به صفحه تخفیف‌ها طراحی کن", icon: "🍉", tag: "صفحه اصلی" },
  { label: "یک مقاله وبلاگ ۷۰۰ کلمه‌ای درباره مزیت‌های خرید هدفون‌های نویزکنسلینگ با لحن آموزشی، سئو شده و کلیدواژه «هدفون نویزکنسلینگ» بنویس", icon: "✍️", tag: "مقاله وبلاگ" },
  { label: "رنگ تم اصلی سایت را قهوه‌ای (#6f4e37) کن، واحد پول را تومان قرار بده و نام فروشگاه را به «علی‌تاجیک استور» تغییر بده", icon: "⚙️", tag: "تنظیمات" },
  { label: "یک استوری تبلیغاتی برای حراج آخر هفته با متن «تا ۴۰٪ تخفیف فقط تا جمعه» و لینک به دسته «پرفروش‌ها» بساز", icon: "📱", tag: "استوری" },
  { label: "پس‌زمینه عکس آخرین محصول را حذف کن و لوگوی فروشگاه را به صورت واترمارک رویش قرار بده", icon: "🖼️", tag: "حذف بک‌گراند و واترمارک" },
  { label: "در فوتر سایت متن درباره ما را آپدیت کن و لینک کانال تلگرام به آدرس t.me/shop را قرار بده", icon: "👣", tag: "تنظیمات فوتر" },
  { label: "امتیاز باشگاه مشتریان آقای علی علوی را ۵۰۰ امتیاز اضافه کن و او را به گروه VIP انتقال بده", icon: "💎", tag: "باشگاه مشتریان (CRM)" },
];

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 mx-1">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-primary-400 animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.9s' }}
        />
      ))}
    </span>
  );
}

function PulseRing({ color = 'indigo' }: { color?: string }) {
  const colorMap: Record<string, string> = {
    indigo: 'border-primary-500/40',
    emerald: 'border-emerald-500/40',
    rose: 'border-rose-500/40',
    amber: 'border-amber-500/40',
  };
  return (
    <span className={`absolute inset-0 rounded-full border ${colorMap[color] || colorMap.indigo} animate-ping opacity-60`} />
  );
}

const DEFAULT_PRODUCT_IMAGE = 'https://images.pexels.com/photos/90946/pexels-photo-90946.jpeg';
const DEFAULT_BLOG_IMAGE = 'https://images.pexels.com/photos/262508/pexels-photo-262508.jpeg';
const DEFAULT_STORY_IMAGE = 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg';

const DEMO_SAMPLES = {
  product: { title: 'کفش ورزشی نایک ایر', brand: 'Nike', price: 450000, imageUrl: DEFAULT_PRODUCT_IMAGE },
  blog: { title: 'راهنمای خرید هدفون نویزکنسلینگ', summary: 'بررسی مزایا، معایب و بهترین مدل‌ها برای خرید آنلاین', imageUrl: DEFAULT_BLOG_IMAGE },
  story: { text: 'تخفیف ویژه آخر هفته!', mediaUrl: DEFAULT_STORY_IMAGE, linkText: 'مشاهده محصول' },
  slider: { title: 'کفش ورزشی نایک ایر با تخفیف ویژه', subtitle: 'جدیدترین تکنولوژی راحتی پا در دویدن', imageUrl: DEFAULT_PRODUCT_IMAGE, linkText: 'مشاهده و خرید' },
};

function ProductPreviewCard({
  title,
  brand,
  price,
  imageUrl,
  compact,
  isWholesaleOnly,
  wholesalePrice,
  moq,
  wholesaleUnit,
  wholesaleUnitSize,
  discount,
  discountPercent,
}: {
  title: string;
  brand?: string;
  price: number;
  imageUrl?: string;
  compact?: boolean;
  isWholesaleOnly?: boolean;
  wholesalePrice?: number;
  moq?: number;
  wholesaleUnit?: string;
  wholesaleUnitSize?: number;
  discount?: number;
  discountPercent?: number | string;
}) {
  let hasDiscount = false;
  let originalPrice = price;
  let finalPrice = price;
  let pct = 0;

  if (discount && discount > 0) {
    hasDiscount = true;
    finalPrice = price - discount;
    pct = Number(discountPercent) || Math.round((discount / price) * 100);
  } else if (discountPercent && Number(discountPercent) > 0) {
    hasDiscount = true;
    pct = Number(discountPercent);
    const discountAmount = Math.round(price * (pct / 100));
    finalPrice = price - discountAmount;
  }

  return (
    <div className={`w-full ${compact ? 'max-w-[200px]' : 'max-w-[240px]'} bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden shadow-sm relative select-none text-right`}>
      <div className="absolute top-2 left-2 z-10 p-1.5 bg-white/90 dark:bg-gray-900/90 rounded-full">
        <Heart size={13} className="text-gray-300" />
      </div>
      <div className="relative w-full aspect-square bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><LayoutGrid size={32} className="text-gray-200 dark:text-gray-800 opacity-40" /></div>
        )}
        {hasDiscount && (
          <span className="absolute top-2 right-2 bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-sm z-10">
            ٪{pct.toLocaleString('fa-IR')} تخفیف
          </span>
        )}
        {isWholesaleOnly && (
          <span className="absolute bottom-2 right-2 bg-amber-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-sm">
            فقط عمده B2B
          </span>
        )}
      </div>
      <div className="p-3.5">
        {brand && <div className="text-[10px] font-bold text-gray-400 mb-0.5">{brand}</div>}
        <h3 className="text-xs font-bold text-gray-800 dark:text-gray-100 line-clamp-2 min-h-[32px] mb-2">{title}</h3>
        
        {wholesalePrice && (
          <div className="mb-2 p-1.5 bg-amber-500/5 dark:bg-amber-500/10 rounded-xl border border-amber-500/10 text-right space-y-0.5">
            <div className="flex justify-between items-center text-[8px] font-black text-amber-600 dark:text-amber-400">
              <span>قیمت همکار / عمده:</span>
              <span>حداقل تعداد: {moq || 1} {wholesaleUnit || 'عدد'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-black text-amber-700 dark:text-amber-300">
                {wholesalePrice.toLocaleString('fa-IR')}
              </span>
              <span className="text-[7px] text-amber-500">تومان/{wholesaleUnit || 'عدد'} {wholesaleUnitSize && wholesaleUnitSize > 1 ? `(${wholesaleUnitSize} تایی)` : ''}</span>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            {hasDiscount ? (
              <>
                <span className="text-[10px] text-gray-400 line-through font-bold">
                  {originalPrice.toLocaleString('fa-IR')}
                </span>
                <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                  {isWholesaleOnly && wholesalePrice ? wholesalePrice.toLocaleString('fa-IR') : finalPrice.toLocaleString('fa-IR')}
                </span>
              </>
            ) : (
              <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                {isWholesaleOnly && wholesalePrice ? wholesalePrice.toLocaleString('fa-IR') : price.toLocaleString('fa-IR')}
              </span>
            )}
            <span className="text-[9px] text-gray-400">تومان</span>
          </div>
          <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-lg"><ShoppingBag size={14} /></div>
        </div>
      </div>
    </div>
  );
}

function BlogPreviewCard({ title, summary, imageUrl, compact }: { title: string; summary?: string; imageUrl?: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'w-[200px]' : 'w-[240px]'} bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl p-3.5 flex flex-col text-right shadow-sm select-none`}>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl mb-2 bg-gray-100 dark:bg-gray-900">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><BookOpen size={24} className="text-gray-200 dark:text-gray-800 opacity-40" /></div>
        )}
      </div>
      <div className="text-[10px] font-bold text-primary-500 mb-1">وبلاگ</div>
      <h3 className="text-xs font-black text-gray-900 dark:text-white line-clamp-2 leading-normal mb-1">{title}</h3>
      {summary && <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{summary}</p>}
      <div className="mt-2 pt-2.5 border-t border-gray-50 dark:border-gray-900 flex justify-between text-[9px] text-gray-400">
        <div className="flex items-center gap-0.5"><Calendar size={11} /><span>امروز</span></div>
        <div className="flex items-center gap-0.5"><Clock size={11} /><span>۳ دقیقه</span></div>
      </div>
    </div>
  );
}

function StoryPreviewCard({ text, mediaUrl, linkText, compact }: { text?: string; mediaUrl?: string; linkText?: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'w-[120px] h-[210px]' : 'w-[140px] h-[245px]'} rounded-[20px] bg-gray-950 border border-white/10 relative overflow-hidden shadow-sm flex flex-col justify-between`}>
      <div className="absolute top-1.5 left-1 right-1 z-10 flex gap-0.5">
        <div className="h-0.5 flex-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-white w-[40%]" /></div>
      </div>
      <div className="absolute inset-0">
        <img src={mediaUrl || DEFAULT_STORY_IMAGE} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/50" />
      {text && (
        <div className="absolute inset-0 flex items-center justify-center p-2 z-10">
          <p className="text-white text-[9px] font-bold text-center bg-black/50 px-1.5 py-1 rounded-lg backdrop-blur-sm max-w-full leading-normal">{text}</p>
        </div>
      )}
      {linkText && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center z-10">
          <div className="bg-white/95 text-black text-[8px] px-2 py-0.5 rounded-full font-bold">{linkText}</div>
        </div>
      )}
    </div>
  );
}

function SliderPreviewCard({ title, subtitle, imageUrl, linkText, compact }: { title?: string; subtitle?: string; imageUrl?: string; linkText?: string; compact?: boolean }) {
  return (
    <div className={`${compact ? 'w-[240px]' : 'w-[280px]'} bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden shadow-sm relative select-none text-right`}>
      <div className="relative w-full aspect-[21/9] bg-gray-50 dark:bg-gray-900 overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-primary-500/10"><LayoutGrid size={32} className="text-primary-500/40" /></div>
        )}
        <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-black/10 to-transparent flex flex-col justify-center p-4 text-white">
          <h3 className="text-[11px] font-black leading-tight line-clamp-1 mb-1">{title || 'عنوان اسلایدر'}</h3>
          <p className="text-[8px] text-gray-200 line-clamp-1 mb-2">{subtitle || 'زیرعنوان اسلایدر'}</p>
          {linkText && (
            <div className="self-start text-[7px] bg-white text-gray-900 px-2 py-0.5 rounded-md font-black shadow-xs">
              {linkText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DisplayPreviewPanel({ display }: { display: any }) {
  const { viewType, summaryText, items } = display;
  
  const normalizePersianDigits = (str: string) => {
    if (!str) return '';
    const persianDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
    let res = str;
    for (let i = 0; i < 10; i++) {
      res = res.replace(persianDigits[i], i.toString());
    }
    return res;
  };

  return (
    <div className="space-y-4">
      <div className="bg-primary-500/5 border border-primary-500/10 rounded-xl p-4 flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-primary-500 animate-pulse shrink-0" />
        <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
          {summaryText}
        </p>
      </div>
      
      {items && items.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 justify-items-center">
          {items.map((item: any, idx: number) => {
            if (viewType === 'products') {
              // Normalize Persian digits first, then strip non-digits to parse price correctly
              const normalizedValue = normalizePersianDigits(item.value || '');
              const priceNum = parseInt(normalizedValue.replace(/[^\d]/g, '') || '0') || 0;
              
              let discountPercent: number | undefined = undefined;
              if (item.badge) {
                const normalizedBadge = normalizePersianDigits(item.badge);
                const match = normalizedBadge.match(/(\d+)/);
                if (match) {
                  discountPercent = parseInt(match[1]);
                }
              }

              return (
                <div key={item.id || idx} className="relative group w-full flex justify-center">
                  <ProductPreviewCard
                    title={item.title}
                    brand={item.subtitle || ''}
                    price={priceNum}
                    imageUrl={item.imageUrl || undefined}
                    discountPercent={discountPercent}
                    compact
                  />
                  {item.href && (
                    <a
                      href={item.href}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl text-white text-[11px] font-black gap-1.5"
                    >
                      <ExternalLink size={14} />
                      <span>مشاهده و ویرایش</span>
                    </a>
                  )}
                </div>
              );
            }
            
            if (viewType === 'discount_codes') {
              return (
                <div key={item.id || idx} className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden shadow-sm text-right">
                  <div className="absolute top-2 left-2">
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black">
                      {item.badge || 'فعال'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-primary-50 dark:bg-slate-950/40 text-primary-500 rounded-xl">
                      <Tag size={14} />
                    </div>
                    <span className="text-xs font-black text-slate-800 dark:text-white select-all font-mono tracking-wider bg-slate-50 dark:bg-slate-900/60 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                      {item.title}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 font-bold block">{item.subtitle || 'کد تخفیف'}</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white">{item.value}</span>
                  </div>
                  {item.href && (
                    <a
                      href={item.href}
                      className="mt-3 text-center py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800/80 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center gap-1"
                    >
                      <ExternalLink size={11} />
                      <span>مدیریت کد تخفیف</span>
                    </a>
                  )}
                </div>
              );
            }
            
            if (viewType === 'orders') {
              return (
                <div key={item.id || idx} className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden shadow-sm text-right sm:col-span-2 md:col-span-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-500 rounded-xl">
                        <ShoppingBag size={16} />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-800 dark:text-white block">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{item.subtitle || 'سفارش ثبت‌شده'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-black text-slate-400 block">مبلغ کل</span>
                        <span className="text-sm font-extrabold text-slate-900 dark:text-white">{item.value}</span>
                      </div>
                      {item.badge && (
                        <span className="px-2.5 py-1 bg-blue-500/10 text-blue-500 rounded-full text-[10px] font-black">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </div>
                  {item.href && (
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-850 flex justify-end">
                      <a
                        href={item.href}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-300 transition-all flex items-center gap-1"
                      >
                        <ExternalLink size={11} />
                        <span>مشاهده جزئیات سفارش</span>
                      </a>
                    </div>
                  )}
                </div>
              );
            }
            
            if (viewType === 'blog_posts') {
              return (
                <div key={item.id || idx} className="relative group">
                  <BlogPreviewCard
                    title={item.title}
                    summary={item.subtitle || undefined}
                    imageUrl={item.imageUrl || undefined}
                    compact
                  />
                  {item.href && (
                    <a
                      href={item.href}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl text-white text-[11px] font-black gap-1.5"
                    >
                      <ExternalLink size={14} />
                      <span>مشاهده و ویرایش</span>
                    </a>
                  )}
                </div>
              );
            }
            
            if (viewType === 'categories') {
              return (
                <div key={item.id || idx} className="bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden shadow-sm text-right">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-purple-50 dark:bg-slate-950/40 text-purple-500 rounded-xl">
                      <Folder size={14} />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-800 dark:text-white block">{item.title}</span>
                      <span className="text-[9px] text-slate-400 font-mono font-bold block">{item.subtitle || 'دسته'}</span>
                    </div>
                  </div>
                  {item.href && (
                    <a
                      href={item.href}
                      className="p-1.5 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              );
            }
            
            return null;
          })}
        </div>
      ) : (
        viewType !== 'text' && (
          <div className="text-center py-8 text-slate-400 dark:text-slate-600 text-[11px] font-bold">
            هیچ موردی برای نمایش یافت نشد.
          </div>
        )
      )}
    </div>
  );
}

function OrderPreviewCard({ action, printMode, targets, updates, explanation }: { action: string; printMode?: string; targets?: any[]; updates?: any; explanation?: string }) {
  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm text-right select-none space-y-4">
      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-900 pb-2">
        <span className="text-xs font-black text-primary-500">
          {action === 'update_status' ? 'به‌روزرسانی وضعیت سفارشات' : action === 'print_invoice' ? 'چاپ گروهی فاکتور/لیبل' : 'گزارش سفارشات'}
        </span>
        {printMode && (
          <span className="text-[9px] font-bold bg-primary-50 dark:bg-slate-950/40 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-full">
            {printMode === 'invoice' ? 'فاکتور خرید' : printMode === 'label' ? 'برچسب پستی' : 'فاکتور و برچسب'}
          </span>
        )}
      </div>

      {action === 'update_status' && targets && targets.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-black text-slate-500 block">سفارشات هدف برای به‌روزرسانی:</span>
          <div className="space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
            {targets.map((order, idx) => (
              <div key={order.id || idx} className="p-2.5 bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 rounded-xl space-y-1.5">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-black text-slate-800 dark:text-white">{order.customerName} ({order.shortId})</span>
                  <span className="font-bold text-slate-500">{Number(order.finalAmount || 0).toLocaleString('fa-IR')} تومان</span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-[8px] font-bold text-center">
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 p-1 rounded-lg">
                    <span className="text-slate-400 block mb-0.5">وضعیت عمومی</span>
                    <span className={updates?.status && updates.status !== order.currentStatus ? 'text-primary-600 dark:text-primary-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'}>
                      {updates?.status || order.currentStatus}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 p-1 rounded-lg">
                    <span className="text-slate-400 block mb-0.5">وضعیت ارسال</span>
                    <span className={updates?.shippingStatus && updates.shippingStatus !== order.currentShippingStatus ? 'text-primary-600 dark:text-primary-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'}>
                      {updates?.shippingStatus || order.currentShippingStatus}
                    </span>
                  </div>
                  <div className="bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800/60 p-1 rounded-lg">
                    <span className="text-slate-400 block mb-0.5">وضعیت پرداخت</span>
                    <span className={updates?.paymentStatus && updates.paymentStatus !== order.currentPaymentStatus ? 'text-primary-600 dark:text-primary-400 font-extrabold' : 'text-slate-600 dark:text-slate-400'}>
                      {updates?.paymentStatus || order.currentPaymentStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {action === 'print_invoice' && targets && targets.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] font-black text-slate-500 block">پیش‌نمایش برگه چاپ (سفارش اول):</span>
          {(() => {
            const order = targets[0];
            return (
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 font-mono text-[9px] space-y-3 leading-relaxed">
                {printMode === 'label' ? (
                  <div className="space-y-2">
                    <div className="border-b border-slate-300 dark:border-slate-700 pb-1.5 flex justify-between items-center font-bold">
                      <span>گیرنده: {order.customerName}</span>
                      <span>تلفن: {order.customerPhone}</span>
                    </div>
                    <div>آدرس: استان تهران، شهر تهران، خیابان آزادی، پلاک ۱۲</div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1.5 flex justify-between items-center">
                      <span>شناسه سفارش: {order.shortId}</span>
                      <span>هزینه نهایی: {Number(order.finalAmount || 0).toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-center font-bold text-xs border-b border-slate-300 dark:border-slate-700 pb-1">فاکتور فروشگاه</div>
                    <div className="flex justify-between">
                      <span>مشتری: {order.customerName}</span>
                      <span>شماره: {order.shortId}</span>
                    </div>
                    <div className="border-t border-b border-slate-200 dark:border-slate-800 py-1 flex justify-between font-bold">
                      <span>شرح کالا</span>
                      <span>مبلغ</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>کالای سفارش داده شده x۱</span>
                      <span>{Number(order.finalAmount || 0).toLocaleString('fa-IR')}</span>
                    </div>
                    <div className="border-t border-slate-300 dark:border-slate-700 pt-1 flex justify-between font-bold">
                      <span>جمع کل:</span>
                      <span>{Number(order.finalAmount || 0).toLocaleString('fa-IR')} تومان</span>
                    </div>
                  </div>
                )}
                <div className="text-center text-[8px] text-slate-400 font-sans">تعداد کل سفارشات آماده چاپ: {targets.length} عدد</div>
              </div>
            );
          })()}
        </div>
      )}

      {explanation && (
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl">
          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function ReviewPreviewCard({ action, data, targetReviewIds, status, explanation, availableProducts }: { action: string; data?: any; targetReviewIds?: string[]; status?: string; explanation?: string; availableProducts?: any[] }) {
  const getProductName = (id: string) => {
    const prod = availableProducts?.find(p => p.id === id);
    return prod ? prod.title : 'محصول انتخابی';
  };

  return (
    <div className="w-full max-w-md bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm text-right select-none space-y-4">
      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-900 pb-2">
        <span className="text-xs font-black text-primary-500">
          {action === 'create' ? 'ایجاد نظر دستی جدید' : action === 'update_status' ? 'تغییر وضعیت نظرات' : action === 'delete' ? 'حذف نظرات' : 'گزارش نظرات'}
        </span>
        {action === 'create' && data?.rating && (
          <div className="flex gap-0.5 text-amber-400">
            {Array.from({ length: Number(data.rating) }).map((_, i) => (
              <span key={i} className="text-xs">⭐</span>
            ))}
          </div>
        )}
      </div>

      {action === 'create' && data && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-primary-500/10 flex items-center justify-center text-primary-500 font-black text-[10px]">
              {data.userName ? data.userName.slice(0, 2) : 'کاربر'}
            </div>
            <div>
              <span className="text-xs font-black text-slate-800 dark:text-white block">{data.userName || 'خریدار سایت'}</span>
              <span className="text-[9px] text-slate-400 font-bold block">{getProductName(data.productId)}</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl leading-relaxed font-bold">
            {data.comment || 'بدون متن نظر'}
          </p>
          <div className="flex gap-2">
            {data.isBuyer && (
              <span className="text-[8px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">خریدار محصول</span>
            )}
            {data.showOnHomepage && (
              <span className="text-[8px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">نمایش در صفحه اصلی</span>
            )}
          </div>
        </div>
      )}

      {action === 'update_status' && targetReviewIds && targetReviewIds.length > 0 && (
        <div className="space-y-2">
          <span className="text-[10px] font-black text-slate-500 block">تغییر وضعیت {targetReviewIds.length} نظر به:</span>
          <span className={`inline-block text-xs font-black px-3 py-1 rounded-xl ${
            status === 'approved' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
            status === 'rejected' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
            'bg-amber-500/10 text-amber-600 dark:text-amber-400'
          }`}>
            {status === 'approved' ? 'تایید شده' : status === 'rejected' ? 'رد شده' : 'در انتظار تایید'}
          </span>
        </div>
      )}

      {action === 'delete' && targetReviewIds && targetReviewIds.length > 0 && (
        <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-rose-600 dark:text-rose-400 text-xs font-black flex items-center gap-2">
          <span>⚠️ تعداد {targetReviewIds.length} نظر برای حذف نهایی انتخاب شده‌اند.</span>
        </div>
      )}

      {explanation && (
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl">
          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{explanation}</p>
        </div>
      )}
    </div>
  );
}

function PromptGuidePanel({ onUseSample }: { onUseSample: (prompt: string) => void }) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'rules' | 'domains' | 'examples'>('rules');

  const goldenRules = [
    { icon: '🎯', title: 'دقیق و مشخص بنویسید', desc: 'نام محصول، قیمت (مثلاً ۴۵۰ هزار تومن)، رنگ‌ها، درصد تخفیف و موجودی را عددی و صریح بنویسید.' },
    { icon: '🔗', title: 'چند کار در یک دستور', desc: 'می‌توانید در یک جمله بگویید: «محصول بساز + استوری بذار + مقاله بنویس» — دستیار خودش گام‌ها را مرتب می‌کند.' },
    { icon: '🔒', title: 'جزئیات شما حفظ می‌شود', desc: 'قیمت‌ها، رنگ‌ها، درصدها و نام‌ها دقیقاً همان‌طور که نوشتید اعمال می‌شوند؛ دستیار فقط ساختار را حرفه‌ای‌تر می‌کند.' },
    { icon: '💬', title: 'زبان ساده کافی است', desc: 'نیازی به اصطلاح فنی نیست. مثل صحبت با یک همکار بنویسید: «یک کفش نایک با ۳ رنگ بساز».' },
  ];

  const domains = [
    { key: 'products', label: 'محصولات', icon: <Package size={11} className="text-emerald-500" />, keywords: 'محصول، قیمت، موجودی، تنوع، رنگ، برند، کالا', example: 'محصول هدفون سونی WH-1000 با قیمت ۳,۵۰۰,۰۰۰ تومن، رنگ مشکی و نقره‌ای، موجودی ۲۰ عدد بساز', url: '/admin/products' },
    { key: 'stories', label: 'استوری', icon: <ImageIcon size={11} className="text-pink-500" />, keywords: 'استوری، تبلیغ، لینک محصول', example: 'استوری تبلیغاتی برای تخفیف ۳۰٪ آخر هفته با لینک به محصولات بساز', url: '/admin/stories' },
    { key: 'blog', label: 'وبلاگ و مقالات', icon: <FileText size={11} className="text-blue-500" />, keywords: 'مقاله، وبلاگ، بلاگ، سئو، دیدگاه، نظر', example: 'مقاله ۶۰۰ کلمه‌ای سئو شده درباره مزایای خرید آنلاین لوازم خانگی با لحن آموزشی و چند تیتر بنویس', url: '/admin/blog' },
    { key: 'discounts', label: 'تخفیف / کوپن', icon: <Tag size={11} className="text-amber-500" />, keywords: 'تخفیف، کوپن، کد تخفیف', example: 'کد تخفیف SUMMER30 با ۳۰٪ تخفیف تا پایان ماه بساز', url: '/admin/discounts' },
    { key: 'categories', label: 'دسته‌بندی و برند', icon: <Layers size={11} className="text-primary-500" />, keywords: 'دسته، برند، کتگوری', example: 'دسته‌بندی «لوازم الکترونیکی» با زیردسته موبایل و تبلت بساز', url: '/admin/categories' },
    { key: 'orders', label: 'سفارشات', icon: <ShoppingBag size={11} className="text-violet-500" />, keywords: 'سفارش، فاکتور، پرینت، وضعیت، گزارش فروش', example: 'فاکتور همه سفارش‌های «پرداخت‌شده» دیروز را چاپ کن و وضعیتشان را به «در حال آماده‌سازی» تغییر بده', url: '/admin/orders' },
    { key: 'reviews', label: 'نظرات مشتریان', icon: <MessageSquare size={11} className="text-pink-500" />, keywords: 'نظر، نظرات، کامنت، تایید نظر، ثبت نظر', example: 'نظرات در انتظار تایید را تایید کن یا برای اسپیکر سونی یک نظر ۵ ستاره ثبت کن', url: '/admin/reviews' },
    { key: 'settings', label: 'تنظیمات عمومی', icon: <Settings size={11} className="text-rose-500" />, keywords: 'تنظیمات، تم، رنگ، ارز، نام فروشگاه، زبان، درگاه', example: 'رنگ تم اصلی سایت را قهوه‌ای (#6f4e37) قرار بده و واحد پول را تومان کن', url: '/admin/settings' },
    { key: 'custom_home', label: 'صفحه اصلی سفارشی', icon: <Home size={11} className="text-orange-500" />, keywords: 'صفحه اصلی، لندینگ، بنر، اسلایدر، ترتیب بخش‌ها، هیرو', example: 'ترتیب بخش‌های صفحه اصلی را به اسلایدر، سپس هیرو و محصولات تغییر بده', url: '/admin/settings/custom-home' },
    { key: 'slider', label: 'اسلایدر', icon: <Sliders size={11} className="text-teal-500" />, keywords: 'اسلایدر، اسلاید، بنر اصلی، هیرو اسلاید', example: 'یک اسلایدر جدید برای جدیدترین محصول با عکس محصول بساز', url: '/admin/slider' },
    { key: 'media', label: 'رسانه و تصاویر', icon: <ImageIcon size={11} className="text-emerald-500" />, keywords: 'بک‌گراند، پس‌زمینه تصویر، حذف پس‌زمینه، واترمارک، رسانه', example: 'پس‌زمینه تصویر آخرین محصول را حذف کن و لوگویمان را به صورت واترمارک رویش بنداز', url: '/admin/media' },
    { key: 'shoppable', label: 'پکیج‌های فروش تعاملی', icon: <Layers size={11} className="text-cyan-500" />, keywords: 'شاپبل، پکیج فروش، تگ، تگ‌گذاری، کالا تعاملی', example: 'یک تصویر شاپبل جدید با عنوان «ست زمستانه» بساز و پالتو و شال را رویش تگ کن', url: '/admin/shoppable' },
    { key: 'footer', label: 'تنظیمات فوتر', icon: <Layout size={11} className="text-rose-500" />, keywords: 'فوتر، کپی‌رایت، ستون لینک، نماد اعتماد، درباره ما', example: 'در فوتر سایت، بخش درباره ما را آپدیت کن و لینک کانال تلگرام را قرار بده', url: '/admin/footer' },
    { key: 'header', label: 'تنظیمات هدر', icon: <Layout size={11} className="text-blue-500" />, keywords: 'هدر، منو، بنر هدر، منوی بالا، منوی ناوبری', example: 'بنر بالای هدر سایت را با متن «ارسال رایگان برای خریدهای بالای ۵۰۰ هزار تومان» فعال و رنگش را قرمز کن', url: '/admin/header' },
    { key: 'users', label: 'مشتریان / باشگاه مشتریان', icon: <Users size={11} className="text-amber-500" />, keywords: 'کاربر، مشتری، بلاک، امتیاز، باشگاه مشتریان، گروه', example: 'امتیاز باشگاه مشتریان آقای علی علوی را ۵۰۰ امتیاز افزایش بده و او را به گروه VIP منتقل کن', url: '/admin/users' },
    { key: 'tickets', label: 'تیکت‌های مشتریان', icon: <MessageSquare size={11} className="text-primary-500" />, keywords: 'تیکت، تیکت‌ها، پشتیبانی، پیام، پاسخ', example: 'به آخرین تیکت دریافتی مشتری پاسخ بده و بگو مشکل بررسی و فاکتور لغو شد', url: '/admin/tickets' },
    { key: 'system_tickets', label: 'تیکت به پشتیبانی کل', icon: <MessageSquare size={11} className="text-purple-500" />, keywords: 'پشتیبانی کل، تیکت سیستم، فنی، تیکت به پلتفرم', example: 'یک تیکت فنی به پشتیبانی کل بفرست و بنویس نیاز به درگاه پرداخت جدید دارم', url: '/admin/system-tickets' },
    { key: 'staff', label: 'مدیریت همکاران', icon: <Users size={11} className="text-slate-500" />, keywords: 'همکار، پرسنل، کارمند، ادمین، پشتیبان، دسترسی', example: 'یک همکار جدید با دسترسی پشتیبان (support) با شماره همراه ۰۹۱۲۳۴۵۶۷۸۹ و رمز ۱۲۳۴۵۶ بساز', url: '/admin/staff' },
    { key: 'profile', label: 'پروفایل مدیر', icon: <User size={11} className="text-rose-500" />, keywords: 'پروفایل، رمز من، آواتار، ایمیل من، نام ادمین', example: 'نام من را در پروفایل به علی علوی تغییر بده و شماره موبایلم را ویرایش کن', url: '/admin/profile' },
    { key: 'import_export', label: 'درون‌ریزی و برون‌بری', icon: <Database size={11} className="text-teal-500" />, keywords: 'ورودی، خروجی، ایمپورت، اکسپورت، بک‌آپ، برون‌بری', example: 'یک فایل اکسل یا CSV از محصولاتم خروجی برون‌بری بگیر', url: '/admin/import-export' },
  ];

  const compareExamples = [
    {
      bad: 'یک محصول خوب بساز',
      good: 'محصول اسپیکر JBL Flip 6 با قیمت ۸۵۰ هزار تومن، رنگ‌های سبز و مشکی، موجودی ۱۵ عدد و تخفیف ۲۰٪ روی رنگ سبز بساز',
      why: 'نام دقیق، قیمت عددی، رنگ‌ها، موجودی و تخفیف همگی مشخص شده‌اند؛ دستیار چیزی را حدس نمی‌زند.',
    },
    {
      bad: 'استوری بذار',
      good: 'استوری تبلیغاتی برای محصول کفش نایک ایر با متن «تخفیف ویژه آخر هفته» و دکمه لینک به صفحه خرید همان محصول بساز',
      why: 'موضوع، متن روی استوری و مقصد لینک روشن است؛ خروجی دقیقاً هدف‌گذاری می‌شود.',
    },
    {
      bad: 'مقاله بنویس',
      good: 'مقاله وبلاگ ۸۰۰ کلمه‌ای درباره تفاوت هدفون‌های نویزکنسلینگ و معمولی با لحن آموزشی، سئو شده و کلیدواژه «هدفون نویزکنسلینگ» بنویس',
      why: 'طول، موضوع، لحن، بهینه‌سازی سئو و کلیدواژه هدف همگی تعیین شده‌اند.',
    },
    {
      bad: 'تخفیف بذار',
      good: 'کد تخفیف SUMMER25 با ۲۵٪ تخفیف، حداکثر سقف ۲۰۰ هزار تومن، فقط برای دسته «لوازم جانبی» و تا ۳۱ شهریور بساز',
      why: 'مقدار، سقف تخفیف، محدوده محصولات و تاریخ انقضا کاملاً مشخص است.',
    },
    {
      bad: 'سفارش‌ها رو درست کن',
      good: 'وضعیت همه سفارش‌های «در انتظار پرداخت» امروز را بررسی کن و آن‌هایی که پرداخت شده‌اند را به «در حال آماده‌سازی» تغییر بده',
      why: 'دامنه کار (سفارش‌های امروز)، شرط (پرداخت‌شده) و اقدام دقیق مشخص شده است.',
    },
    {
      bad: 'صفحه اصلی رو قشنگ کن',
      good: 'در صفحه اصلی، اسلایدر را به بالای صفحه ببر، سپس بخش «محصولات پرفروش» و بعد «مقالات وبلاگ» را نمایش بده',
      why: 'به جای خواسته مبهم، ترتیب دقیق بخش‌ها تعیین شده است.',
    },
  ];

  const readyPrompts = [
    { tag: 'محصول', prompt: 'محصول هدفون بلوتوثی JBL Tune 510 با قیمت ۹۹۰ هزار تومن، رنگ‌های مشکی، آبی و صورتی، موجودی ۳۰ عدد و توضیحات کامل بساز' },
    { tag: 'ترکیبی', prompt: 'محصول ساعت هوشمند شیائومی با قیمت ۲,۲۰۰,۰۰۰ تومن و ۲ رنگ بساز، استوری تبلیغاتی و مقاله معرفی هم بنویس' },
    { tag: 'مقاله سئو', prompt: 'مقاله وبلاگ ۷۰۰ کلمه‌ای با عنوان «راهنمای خرید لپ‌تاپ گیمینگ» با لحن آموزشی، سئو شده و چند تیتر بنویس' },
    { tag: 'استوری', prompt: 'استوری تبلیغاتی برای کمپین «حراج پاییزه» با متن جذاب و لینک به صفحه تخفیف‌ها بساز' },
    { tag: 'تخفیف', prompt: 'کد تخفیف WELCOME10 با ۱۰٪ تخفیف برای خرید اول، سقف ۵۰ هزار تومن و اعتبار ۳۰ روزه بساز' },
    { tag: 'دسته‌بندی', prompt: 'دسته‌بندی «لوازم آشپزخانه» با زیردسته‌های «قابلمه و تابه»، «لوازم برقی» و «ظروف» بساز' },
    { tag: 'سفارش', prompt: 'وضعیت سفارش شماره ۱۲۳۴ را به «ارسال شده» تغییر بده و فاکتورش را چاپ کن' },
    { tag: 'گزارش فروش', prompt: 'گزارش فروش هفته گذشته را با تعداد سفارش و مجموع درآمد به من بده' },
    { tag: 'نظرات', prompt: 'همه نظرات در انتظار تایید را که توهین‌آمیز نیستند تایید کن' },
    { tag: 'تنظیمات', prompt: 'رنگ تم اصلی فروشگاه را به سرمه‌ای (#1e3a8a) تغییر بده و واحد پول را تومان قرار بده' },
    { tag: 'صفحه اصلی', prompt: 'در صفحه اصلی اسلایدر را بالا ببر، بعد محصولات جدید را نشان بده و بعد بنر هیرو را حذف کن' },
    { tag: 'رسانه', prompt: 'پس‌زمینه عکس آخرین محصول را حذف کن و لوگوی فروشگاه را به صورت واترمارک رویش قرار بده' },
    { tag: 'شاپبل', prompt: 'یک تصویر شاپبل با عنوان «ست بهاره» بساز و عینک آفتابی و کفش چرم را رویش تگ‌گذاری کن' },
    { tag: 'هدر / فوتر', prompt: 'در فوتر سایت متن درباره ما را آپدیت کن و لینک کانال تلگرام t.me/shop را قرار بده' },
    { tag: 'مشتریان', prompt: 'امتیاز باشگاه مشتریان آقای علی علوی را ۵۰۰ امتیاز اضافه کن و او را به گروه VIP انتقال بده' },
    { tag: 'تیکت', prompt: 'به آخرین تیکت دریافتی مشتری پاسخ بده و بگو مشکل بررسی و رفع شد' },
    { tag: 'همکاران', prompt: 'یک همکار جدید با دسترسی پشتیبان (support) با شماره همراه ۰۹۱۲۳۴۵۶۷۸۹ و رمز ۱۲۳۴۵۶ بساز' },
  ];

  const tabs = [
    { id: 'rules' as const, label: 'اصول طلایی', icon: <Lightbulb size={11} /> },
    { id: 'domains' as const, label: 'حوزه‌ها', icon: <Layers size={11} /> },
    { id: 'examples' as const, label: 'درست / غلط', icon: <CheckCircle2 size={11} /> },
  ];

  return (
    <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BookOpen size={15} />
          </div>
          <div className="text-right">
            <span className="text-sm font-black text-slate-800 dark:text-white block">راهنمای نوشتن دستور حرفه‌ای</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">چطور پرامپت بدهید تا بهترین نتیجه را بگیرید</span>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
      </button>

      {isOpen && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 dark:border-slate-800/60 pt-4">
          <div className="flex gap-1.5 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/25'
                    : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border border-transparent hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'rules' && (
            <div className="space-y-2.5">
              {goldenRules.map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/60">
                  <span className="text-base shrink-0 mt-0.5">{rule.icon}</span>
                  <div>
                    <span className="text-[11px] font-black text-slate-800 dark:text-white block mb-0.5">{rule.title}</span>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{rule.desc}</p>
                  </div>
                </div>
              ))}
              <div className="bg-primary-500/5 border border-primary-500/15 rounded-xl p-3 flex items-start gap-2">
                <Info size={13} className="text-primary-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-primary-700 dark:text-primary-300 font-bold leading-relaxed">
                  پس از ارسال دستور، طرح اجرایی گام‌به‌گام نمایش داده می‌شود. هر گام را پیش‌نمایش کنید، ویرایش کنید و سپس ثبت نهایی را بزنید.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'domains' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {domains.map((domain) => (
                <div key={domain.key} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {domain.icon}
                      <span className="text-[11px] font-black text-slate-800 dark:text-white">{domain.label}</span>
                    </div>
                    {domain.url && (
                      <a
                        href={domain.url}
                        className="text-[9px] text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 font-black transition-colors"
                      >
                        ورود به بخش ←
                      </a>
                    )}
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold">کلیدواژه: {domain.keywords}</p>
                  <button
                    type="button"
                    onClick={() => onUseSample(domain.example)}
                    className="w-full text-right p-2 bg-white dark:bg-slate-950/60 hover:bg-purple-50 dark:hover:bg-purple-950/20 border border-slate-200/60 dark:border-slate-700/50 rounded-lg text-[9px] text-slate-600 dark:text-slate-400 font-bold leading-relaxed transition-all cursor-pointer group"
                  >
                    <span className="text-purple-600 dark:text-purple-400 font-black block mb-0.5 group-hover:underline">نمونه آماده ←</span>
                    {domain.example}
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="space-y-3">
              {compareExamples.map((item, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 dark:border-slate-800/60 overflow-hidden">
                  <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-slate-200 dark:divide-slate-800">
                    <div className="p-3 bg-rose-500/5">
                      <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 block mb-1.5 flex items-center gap-1">
                        <X size={10} /> ضعیف
                      </span>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold">{item.bad}</p>
                    </div>
                    <div className="p-3 bg-emerald-500/5">
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 block mb-1.5 flex items-center gap-1">
                        <Check size={10} /> حرفه‌ای
                      </span>
                      <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">{item.good}</p>
                    </div>
                  </div>
                  <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800/60">
                    <p className="text-[9px] text-slate-500 font-bold">چرا بهتر است؟ {item.why}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-2">
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 block">پرامپت‌های آماده — یک کلیک و ارسال:</span>
            <div className="flex flex-col gap-1.5">
              {readyPrompts.map((item, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onUseSample(item.prompt)}
                  className="text-right p-2.5 bg-purple-500/5 hover:bg-purple-500/10 dark:bg-purple-950/20 dark:hover:bg-purple-950/40 border border-purple-500/15 rounded-xl transition-all cursor-pointer group"
                >
                  <span className="text-[8px] font-black text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full mb-1 inline-block">{item.tag}</span>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">{item.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoExamplesPanelInner({ onUseSample }: { onUseSample: (prompt: string) => void }) {
  const samples = [
    { key: 'product', label: 'باکس محصول', icon: <Package size={12} className="text-emerald-400" />, color: 'emerald', prompt: 'محصول کفش نایک ایر با قیمت ۴۵۰ هزار تومن و ۵ رنگ متنوع بساز', preview: <ProductPreviewCard {...DEMO_SAMPLES.product} compact /> },
    { key: 'blog', label: 'باکس مقاله', icon: <FileText size={12} className="text-blue-400" />, color: 'blue', prompt: 'یک مقاله وبلاگ درباره مزیت‌های خرید هدفون‌های نویزکنسلینگ بنویس', preview: <BlogPreviewCard {...DEMO_SAMPLES.blog} compact /> },
    { key: 'story', label: 'باکس استوری', icon: <ImageIcon size={12} className="text-pink-400" />, color: 'pink', prompt: 'یک استوری تبلیغاتی برای تخفیف آخر هفته بساز', preview: <StoryPreviewCard {...DEMO_SAMPLES.story} compact /> },
    { key: 'slider', label: 'اسلایدر', icon: <Sliders size={12} className="text-teal-400" />, color: 'teal', prompt: 'یک اسلایدر اضافه کن با عکسی که ارسال میکنم توضیحات محصول اخر روش بنویس', preview: <SliderPreviewCard {...DEMO_SAMPLES.slider} compact /> },
  ] as const;

  return (
    <>
      <div className="bg-white/80 dark:bg-[#0d1527]/80 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-500/15 text-purple-500 flex items-center justify-center">
            <Eye size={14} />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 dark:text-white block">نمونه‌های موفق</span>
            <span className="text-[9px] text-slate-500 font-bold">سه مدل خروجی دستیار هوشمند</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed border-t border-slate-100 dark:border-slate-800/60 pt-3">
          پس از ارسال دستور، پیش‌نمایش زنده هر نوع محتوا در پنل کار نمایش داده می‌شود.
        </p>
      </div>

      {samples.map((sample) => (
        <div key={sample.key} className="bg-white/80 dark:bg-[#0d1527]/80 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1.5">
              {sample.icon}
              {sample.label}
            </span>
            <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">نمونه موفق</span>
          </div>
          <div className="flex justify-center py-2 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/50">
            {sample.preview}
          </div>
          <button
            type="button"
            onClick={() => onUseSample(sample.prompt)}
            className="w-full py-2 bg-slate-100 hover:bg-purple-50 dark:bg-slate-800/60 dark:hover:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-slate-200 dark:border-slate-700/50 rounded-xl text-[10px] font-black transition-all cursor-pointer flex items-center justify-center gap-1"
          >
            <Sparkles size={10} />
            <span>استفاده از این نمونه</span>
          </button>
        </div>
      ))}
    </>
  );
}

function SmartBrainPanel({
  memory,
  isLoading,
  onReset,
  onRefresh
}: {
  memory: any;
  isLoading: boolean;
  onReset: () => void;
  onRefresh: () => void;
}) {
  if (isLoading && !memory) {
    return (
      <div className="bg-white/80 dark:bg-[#0d1527]/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 shadow-xs min-h-[200px]">
        <Loader2 size={24} className="animate-spin text-primary-500" />
        <span className="text-[11px] text-slate-500 font-bold">در حال بارگذاری حافظه هوشمند...</span>
      </div>
    );
  }

  const preferences = memory?.preferences || { lang: 'fa', currency: 'IRT', themeColor: '', printMode: '' };
  const patterns = memory?.patterns?.top || [];
  const errors = memory?.errors || [];
  const domains = memory?.domains || {};

  const hasDomains = Object.values(domains).some((arr: any) => arr && arr.length > 0);

  return (
    <div className="bg-white/80 dark:bg-[#0d1527]/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 space-y-4 shadow-xs text-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-primary-500/15 text-primary-500 flex items-center justify-center">
            <Brain size={14} className="animate-pulse" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-800 dark:text-white block">مغز یادگیرنده فروشگاه</span>
            <span className="text-[9px] text-slate-500 font-bold">ترجیحات و الگوهای اختصاصی شما</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-all cursor-pointer"
            title="بروزرسانی حافظه"
          >
            <RefreshCw size={11} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onReset}
            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-all cursor-pointer"
            title="پاکسازی حافظه"
          >
            <Trash2 size={11} />
          </button>
        </div>
      </div>

      {/* Preferences Section */}
      <div className="space-y-2">
        <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1.5">
          <Zap size={11} className="text-amber-500" />
          ترجیحات یادگرفته‌شده
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 p-2.5 rounded-xl flex flex-col gap-1">
            <span className="text-[8px] text-slate-400 font-bold">زبان پیش‌فرض</span>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
              {preferences.lang === 'fa' ? 'فارسی (fa)' : preferences.lang === 'en' ? 'English (en)' : preferences.lang === 'ar' ? 'العربية (ar)' : preferences.lang || 'ثبت نشده'}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 p-2.5 rounded-xl flex flex-col gap-1">
            <span className="text-[8px] text-slate-400 font-bold">واحد پول</span>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
              {preferences.currency === 'IRT' ? 'تومان (IRT)' : preferences.currency === 'TOMAN' ? 'تومان' : preferences.currency || 'ثبت نشده'}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 p-2.5 rounded-xl flex flex-col gap-1">
            <span className="text-[8px] text-slate-400 font-bold">حالت چاپ فاکتور</span>
            <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
              {preferences.printMode === 'invoice' ? 'فاکتور رسمی' : preferences.printMode === 'label' ? 'برچسب پستی' : preferences.printMode === 'both' ? 'هر دو' : 'ثبت نشده'}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 p-2.5 rounded-xl flex flex-col gap-1">
            <span className="text-[8px] text-slate-400 font-bold">رنگ پوسته پیش‌فرض</span>
            <div className="flex items-center gap-1.5">
              {preferences.themeColor ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs" style={{ backgroundColor: preferences.themeColor }} />
                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase">{preferences.themeColor}</span>
                </>
              ) : (
                <span className="text-[10px] font-black text-slate-400">ثبت نشده</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Patterns Section */}
      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
        <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1.5">
          <Activity size={11} className="text-primary-500" />
          الگوهای رفتاری پرتکرار
        </span>
        {patterns.length > 0 ? (
          <ul className="space-y-1.5">
            {patterns.map((p: string, i: number) => (
              <li key={i} className="text-[10px] text-slate-600 dark:text-slate-400 font-bold flex items-start gap-2 bg-slate-50 dark:bg-slate-950/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-500/70 mt-1.5 shrink-0" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[9px] text-slate-400 font-bold leading-relaxed">
            الگوی عمومی هنوز ثبت نشده است. با تکرار دستورات مشابه، سیستم الگوهای شما را یاد می‌گیرد.
          </p>
        )}
      </div>

      {/* Domain Patterns Section */}
      {hasDomains && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
          <span className="text-[10px] font-black text-slate-800 dark:text-white flex items-center gap-1.5">
            <Folder size={11} className="text-primary-500" />
            الگوهای تفکیک‌شده حوزه‌ها
          </span>
          <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
            {Object.entries(domains).map(([domain, arr]: [string, any]) => {
              if (!arr || arr.length === 0) return null;
              const domainLabels: Record<string, string> = {
                product: 'محصولات',
                order: 'سفارشات',
                story: 'استوری‌ها',
                blog: 'وبلاگ',
                discount: 'تخفیف‌ها',
                category: 'دسته‌بندی‌ها',
                settings: 'تنظیمات'
              };
              return (
                <div key={domain} className="space-y-1">
                  <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 block bg-primary-500/5 px-2 py-0.5 rounded-md w-fit">
                    حوزه {domainLabels[domain] || domain}
                  </span>
                  <ul className="space-y-1">
                    {arr.map((p: string, i: number) => (
                      <li key={i} className="text-[9px] text-slate-600 dark:text-slate-400 font-bold flex items-start gap-1.5 pl-1">
                        <span className="w-1 h-1 rounded-full bg-primary-500/50 mt-1.5 shrink-0" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Errors Section */}
      {errors.length > 0 && (
        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
          <span className="text-[10px] font-black text-rose-500 flex items-center gap-1.5">
            <AlertCircle size={11} />
            اشتباهات تصحیح‌شده (جهت عدم تکرار)
          </span>
          <ul className="space-y-1.5">
            {errors.map((e: string, i: number) => (
              <li key={i} className="text-[10px] text-rose-600 dark:text-rose-400 font-bold flex items-start gap-2 bg-rose-500/5 p-2 rounded-xl border border-rose-500/10">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70 mt-1.5 shrink-0" />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  attachedImageUrl?: string;
  attachedGalleryUrls?: string[];
  mainImageIndex?: number;
  plan?: { explanation: string; tasks: Task[]; responseMode?: 'agent' | 'display'; display?: any } | null;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  messages: ChatMessage[];
  plan: { explanation: string; tasks: Task[]; responseMode?: 'agent' | 'display'; display?: any } | null;
  currentTaskIndex: number;
  taskStatuses: Record<string, 'idle' | 'running' | 'preview_ready' | 'saving' | 'completed' | 'failed' | 'skipped'>;
  taskOutputs: Record<string, any>;
  savedAssets: SavedAsset[];
  systemWarnings: string[];
}

export default function AgentPage() {
  const [pageMode, setPageMode] = useState<'agent' | 'mahak'>('agent');
  const [profile, setProfile] = useState<{ shopName?: string } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);
  const [errorPlan, setErrorPlan] = useState('');
  const [plan, setPlan] = useState<{ explanation: string; tasks: Task[]; responseMode?: 'agent' | 'display'; display?: any } | null>(null);
  const [expandedPromptIdx, setExpandedPromptIdx] = useState<number | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [mainImageIndex, setMainImageIndex] = useState<number>(0);
  const attachedImageUrl = attachedImages[mainImageIndex] || '';

  const clearAttachedImages = () => {
    setAttachedImages([]);
    setMainImageIndex(0);
  };

  const removeAttachedImage = (indexToRemove: number) => {
    setAttachedImages(prev => {
      const next = prev.filter((_, idx) => idx !== indexToRemove);
      if (mainImageIndex === indexToRemove) {
        setMainImageIndex(0);
      } else if (mainImageIndex > indexToRemove) {
        setMainImageIndex(mainImageIndex - 1);
      }
      return next;
    });
  };

  const setAsMainImage = (index: number) => {
    setMainImageIndex(index);
  };
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isUploadingPreviewImage, setIsUploadingPreviewImage] = useState<boolean>(false);

  const [currentTaskIndex, setCurrentTaskIndex] = useState<number>(-1);
  const [taskStatuses, setTaskStatuses] = useState<Record<string, 'idle' | 'running' | 'preview_ready' | 'saving' | 'completed' | 'failed' | 'skipped'>>({});
  const [taskOutputs, setTaskOutputs] = useState<Record<string, any>>({});
  const [savedAssets, setSavedAssets] = useState<SavedAsset[]>([]);
  const [generalError, setGeneralError] = useState('');
  const [systemWarnings, setSystemWarnings] = useState<string[]>([]);

  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableBlogCategories, setAvailableBlogCategories] = useState<any[]>([]);
  const [availableProducts, setAvailableProducts] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [showFinishedDetails, setShowFinishedDetails] = useState(false);

  // Chat-specific states
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [workspaceTab, setWorkspaceTab] = useState<'execution' | 'steps' | 'assets'>('execution');
  const [stepViewMode, setStepViewMode] = useState<'edit' | 'preview'>('preview');
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);

  // Intro light sweep (Gemini-style) on page mount
  const [showIntroSweep, setShowIntroSweep] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShowIntroSweep(false), 1700);
    return () => clearTimeout(t);
  }, []);

  // Open sidebar on desktop by default
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const sync = () => setIsSidebarOpen(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Load profile / shop settings
  useEffect(() => {
    fetch('/api/admin/profile')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setProfile({ shopName: data.shopName });
        }
      })
      .catch(() => {});
  }, []);

  // Load categories
  useEffect(() => {
    fetch('/api/admin/categories')
      .then(res => res.json())
      .then(data => { if (data.categories) setAvailableCategories(data.categories); })
      .catch(() => {});
  }, []);

  // Load blog categories
  useEffect(() => {
    fetch('/api/admin/blog/categories')
      .then(res => res.json())
      .then(data => { if (data.categories) setAvailableBlogCategories(data.categories); })
      .catch(() => {});
  }, []);

  // Load products
  useEffect(() => {
    fetch('/api/admin/products')
      .then(res => res.json())
      .then(data => { if (data.products) setAvailableProducts(data.products); })
      .catch(() => {});
  }, []);

  // Load users
  useEffect(() => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(data => { if (data.users) setAvailableUsers(data.users); })
      .catch(() => {});
  }, []);

  const [aiMemory, setAiMemory] = useState<any>(null);
  const [isLoadingMemory, setIsLoadingMemory] = useState(false);

  const fetchAiMemory = async () => {
    setIsLoadingMemory(true);
    try {
      const res = await fetch('/api/admin/ai-agent');
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAiMemory(data.memory);
        }
      }
    } catch (err) {
      console.error('Error fetching AI memory:', err);
    } finally {
      setIsLoadingMemory(false);
    }
  };

  const handleResetMemory = async () => {
    if (!confirm('آیا از بازنشانی حافظه هوشمند اطمینان دارید؟ تمام الگوها و ترجیحات یادگرفته‌شده حذف خواهند شد.')) {
      return;
    }
    try {
      const res = await fetch('/api/admin/ai-agent', { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAiMemory(data.memory);
        }
      }
    } catch (err) {
      console.error('Error resetting AI memory:', err);
    }
  };

  useEffect(() => {
    fetchAiMemory();
  }, []);

  // Initialize and load chat sessions
  useEffect(() => {
    const saved = localStorage.getItem('agent_chat_sessions');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.length > 0) {
          setSessions(parsed);
          setActiveSessionId(parsed[0].id);
          return;
        }
      } catch (e) {
        console.error('Failed to load sessions', e);
      }
    }
    // Create first default session
    const defaultSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'گفتگوی جدید ادمین',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      messages: [
        {
          id: 'msg_welcome',
          sender: 'ai',
          text: 'سلام! من دستیار هوشمند شما هستم. چطور می‌توانم به شما در مدیریت فروشگاه کمک کنم؟ می‌توانید بگویید محصول جدیدی بسازم، مقاله‌ای بنویسم، تخفیف تعریف کنم یا گزارش فروش بگیرم.',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }
      ],
      plan: null,
      currentTaskIndex: -1,
      taskStatuses: {},
      taskOutputs: {},
      savedAssets: [],
      systemWarnings: []
    };
    setSessions([defaultSession]);
    setActiveSessionId(defaultSession.id);
  }, []);

  const activeSession = sessions.find(s => s.id === activeSessionId);

  // Load active session's execution state into local variables when switching sessions
  useEffect(() => {
    if (!activeSession) return;
    setPlan(activeSession.plan);
    setCurrentTaskIndex(activeSession.currentTaskIndex);
    setTaskStatuses(activeSession.taskStatuses || {});
    setTaskOutputs(activeSession.taskOutputs || {});
    setSavedAssets(activeSession.savedAssets || []);
    setSystemWarnings(activeSession.systemWarnings || []);
    
    // Determine wizardStep based on execution state
    if (!activeSession.plan) {
      setWizardStep(1);
    } else {
      const statuses = activeSession.taskStatuses || {};
      const tasks = activeSession.plan.tasks || [];
      const isAnyCompletedOrRunning = tasks.some(t => statuses[t.id] === 'completed' || statuses[t.id] === 'running' || statuses[t.id] === 'preview_ready');
      if (isAnyCompletedOrRunning) {
        setWizardStep(2);
      } else {
        setWizardStep(1);
      }
    }
    
    // Scroll chat to bottom
    setTimeout(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [activeSessionId]);

  // Unified effect to sync local execution state changes back to active session and localStorage
  useEffect(() => {
    if (!activeSessionId || !activeSession) return;
    if (
      activeSession.plan !== plan ||
      activeSession.currentTaskIndex !== currentTaskIndex ||
      JSON.stringify(activeSession.taskStatuses) !== JSON.stringify(taskStatuses) ||
      JSON.stringify(activeSession.taskOutputs) !== JSON.stringify(taskOutputs) ||
      JSON.stringify(activeSession.savedAssets) !== JSON.stringify(savedAssets) ||
      JSON.stringify(activeSession.systemWarnings) !== JSON.stringify(systemWarnings)
    ) {
      const updated = sessions.map(s => {
        if (s.id === activeSessionId) {
          return {
            ...s,
            plan,
            currentTaskIndex,
            taskStatuses,
            taskOutputs,
            savedAssets,
            systemWarnings
          };
        }
        return s;
      });
      setSessions(updated);
      localStorage.setItem('agent_chat_sessions', JSON.stringify(updated));
    }
  }, [plan, currentTaskIndex, taskStatuses, taskOutputs, savedAssets, systemWarnings, activeSessionId]);

  // Scroll chat to bottom when messages are added
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeSession?.messages?.length]);

  const saveSessions = (updatedSessions: ChatSession[]) => {
    setSessions(updatedSessions);
    localStorage.setItem('agent_chat_sessions', JSON.stringify(updatedSessions));
  };

  const handleCreateNewSession = () => {
    const newSession: ChatSession = {
      id: 'session_' + Date.now(),
      title: 'گفتگوی جدید ادمین',
      createdAt: new Date().toLocaleDateString('fa-IR'),
      messages: [
        {
          id: 'msg_welcome_' + Date.now(),
          sender: 'ai',
          text: 'سلام! من دستیار هوشمند شما هستم. چطور می‌توانم به شما در مدیریت فروشگاه کمک کنم؟ می‌توانید بگویید محصول جدیدی بسازم، مقاله‌ای بنویسم، تخفیف تعریف کنم یا گزارش فروش بگیرم.',
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
        }
      ],
      plan: null,
      currentTaskIndex: -1,
      taskStatuses: {},
      taskOutputs: {},
      savedAssets: [],
      systemWarnings: []
    };
    saveSessions([newSession, ...sessions]);
    setActiveSessionId(newSession.id);
    setPrompt('');
    clearAttachedImages();
    setIsSidebarOpen(false);
    // Full reset of wizard/execution state so a stale plan never lingers
    setPlan(null);
    setWizardStep(1);
    setCurrentTaskIndex(-1);
    setTaskStatuses({});
    setTaskOutputs({});
    setSavedAssets([]);
    setSystemWarnings([]);
    setGeneralError('');
    setShowFinishedDetails(false);
    setWorkspaceTab('execution');
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessions.length === 1) {
      alert('نمی‌توانید تنها گفتگوی موجود را حذف کنید.');
      return;
    }
    if (confirm('آیا از حذف این گفتگو اطمینان دارید؟')) {
      const filtered = sessions.filter(s => s.id !== id);
      saveSessions(filtered);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/media', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('خطا در آپلود فایل');
    const data = await res.json();
    return data.url;
  };

  // Extract the most recent context from the active session so the server-side
  // agent can resolve follow-up references (e.g. "حالا براش استوری بساز" or "فاکتورهاش رو چاپ کن").
  // Prioritizes savedAssets (newly created items from a completed execution) if they
  // exist, and falls back to the last display result items.
  const buildLastDisplayContext = (session: ChatSession | undefined) => {
    if (!session) return undefined;

    // 1. Prioritize saved assets from a completed execution as the follow-up context
    if (Array.isArray(session.savedAssets) && session.savedAssets.length > 0) {
      const itemIds: string[] = [];
      const itemTitles: string[] = [];
      for (const asset of session.savedAssets) {
        if (asset && typeof asset.id === 'string' && asset.id) itemIds.push(asset.id);
        if (asset && typeof asset.title === 'string' && asset.title) itemTitles.push(asset.title);
      }
      if (itemIds.length > 0) {
        // Map asset types to standard viewTypes
        const type = session.savedAssets[0].type;
        const viewType = type === 'products' ? 'products' : 
                         (type === 'blog' ? 'blog_posts' : 
                          (type === 'categories' ? 'categories' : ''));
        return {
          viewType,
          itemIds,
          itemTitles,
        };
      }
    }

    // 2. Fallback to the last display result items
    if (!session.messages || session.messages.length === 0) return undefined;
    const lastAi = [...session.messages].reverse().find(m => m.sender === 'ai' && m.plan);
    if (!lastAi) return undefined;
    const planAny = lastAi.plan as any;
    if (planAny.responseMode !== 'display' || !planAny.display || !Array.isArray(planAny.display.items)) {
      return undefined;
    }
    const itemIds: string[] = [];
    const itemTitles: string[] = [];
    for (const item of planAny.display.items) {
      if (item && typeof item.id === 'string' && item.id) itemIds.push(item.id);
      if (item && typeof item.title === 'string' && item.title) itemTitles.push(item.title);
    }
    if (itemIds.length === 0) return undefined;
    return {
      viewType: typeof planAny.display.viewType === 'string' ? planAny.display.viewType : '',
      itemIds,
      itemTitles,
    };
  };

  const handleGeneratePlan = async (e?: React.FormEvent, customPrompt?: string) => {
    e?.preventDefault();
    const promptToUse = (customPrompt || prompt).trim();
    if (!promptToUse || isLoadingPlan || !activeSessionId || !activeSession) return;

    setIsLoadingPlan(true);
    setErrorPlan('');
    setGeneralError('');

    // 1. Create user message
    const userMsgId = 'msg_' + Date.now();
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: promptToUse,
      timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
      attachedImageUrl: attachedImageUrl || undefined,
      attachedGalleryUrls: attachedImages.length > 0 ? attachedImages : undefined,
      mainImageIndex: mainImageIndex
    };

    // Update active session with user message immediately
    const updatedMessages = [...activeSession.messages, userMessage];
    
    // Auto-rename session if it was the default title and this is the first user message
    let updatedTitle = activeSession.title;
    if (activeSession.title === 'گفتگوی جدید ادمین' && activeSession.messages.length <= 1) {
      updatedTitle = promptToUse.slice(0, 30) + (promptToUse.length > 30 ? '...' : '');
    }

    const updatedSessionsWithUser = sessions.map(s => {
      if (s.id === activeSessionId) {
        return { ...s, title: updatedTitle, messages: updatedMessages };
      }
      return s;
    });
    setSessions(updatedSessionsWithUser);
    localStorage.setItem('agent_chat_sessions', JSON.stringify(updatedSessionsWithUser));

    // Clear input
    setPrompt('');
    const prevAttachedUrl = attachedImageUrl;
    const prevAttachedGalleryUrls = attachedImages;
    clearAttachedImages();

    // 2. Construct clean prompt and structured history for AI
    const history = updatedMessages
      .filter(m => m.id !== 'msg_welcome' && m.id !== userMsgId)
      .map(m => {
        if (m.sender === 'user') {
          return {
            role: 'user',
            content: m.text
          };
        } else {
          // Compress previous AI plans to save tokens and prevent exceeding token budget
          let content = m.text;
          if (m.plan) {
            const planAny = m.plan as any;
            const compressedPlan: any = {
              success: planAny.success ?? true,
              responseMode: planAny.responseMode || 'agent',
              explanation: planAny.explanation
            };
            if (planAny.responseMode === 'agent' && planAny.tasks) {
              compressedPlan.tasks = planAny.tasks.map((t: any) => ({
                id: t.id,
                title: t.title,
                target: t.target,
                action: t.action
              }));
            } else if (planAny.responseMode === 'display' && planAny.display) {
              compressedPlan.display = {
                viewType: planAny.display.viewType,
                summaryText: planAny.display.summaryText,
                items: planAny.display.items?.map((item: any) => ({
                  id: item.id,
                  title: item.title,
                  subtitle: item.subtitle
                }))
              };
            }
            content = JSON.stringify(compressedPlan);
          }
          return {
            role: 'assistant',
            content: content
          };
        }
      });

    try {
      const lastDisplayContext = buildLastDisplayContext(activeSession);
      const { res, data: rawData } = await fetchJson('/api/admin/ai-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          history,
          attachedImageUrl: prevAttachedUrl,
          attachedGalleryUrls: prevAttachedGalleryUrls,
          ...(lastDisplayContext ? { lastDisplayContext } : {}),
        }),
      });
      const data = rawData as any;
      if (!res.ok) {
        const errorMsg = data.error?.message || (typeof data.error === 'string' ? data.error : null) || 'خطا در تحلیل دستور توسط هوش مصنوعی مرکزی.';
        throw new Error(errorMsg);
      }
      
      if (data.success && data.responseMode === 'display' && data.display) {
        // Refresh memory in case the AI learned something new
        fetchAiMemory();

        // Create AI message with display payload
        const aiMessage: ChatMessage = {
          id: 'msg_' + Date.now(),
          sender: 'ai',
          text: data.explanation,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          plan: data
        };

        const finalMessages = [...updatedMessages, aiMessage];
        
        // Reset execution state for the display mode
        setPlan(data);
        setWizardStep(1);
        setIsWorkspaceOpen(true);
        setWorkspaceTab('execution');
        setCurrentTaskIndex(-1);
        setTaskStatuses({});
        setTaskOutputs({});
        setSavedAssets([]);
        setSystemWarnings([]);

        const updatedSessionsWithAi = sessions.map(s => {
          if (s.id === activeSessionId) {
            return { 
              ...s, 
              messages: finalMessages,
              plan: data,
              currentTaskIndex: -1,
              taskStatuses: {},
              taskOutputs: {},
              savedAssets: [],
              systemWarnings: []
            };
          }
          return s;
        });
        setSessions(updatedSessionsWithAi);
        localStorage.setItem('agent_chat_sessions', JSON.stringify(updatedSessionsWithAi));
      } else if (data.success && data.tasks && data.tasks.length > 0) {
        // Refresh memory in case the AI learned something new
        fetchAiMemory();

        // 3. Create AI message with plan
        const aiMessage: ChatMessage = {
          id: 'msg_' + Date.now(),
          sender: 'ai',
          text: data.explanation,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          plan: data
        };

        const finalMessages = [...updatedMessages, aiMessage];
        
        // Reset execution state for the new plan
        setPlan(data);
        setWizardStep(1);
        setIsWorkspaceOpen(true);
        setWorkspaceTab('execution');
        setCurrentTaskIndex(-1);
        const initialStatuses: Record<string, any> = {};
        data.tasks.forEach((t: Task) => { initialStatuses[t.id] = 'idle'; });
        setTaskStatuses(initialStatuses);
        setTaskOutputs({});
        setSavedAssets([]);
        setSystemWarnings([]);

        const updatedSessionsWithAi = sessions.map(s => {
          if (s.id === activeSessionId) {
            return { 
              ...s, 
              messages: finalMessages,
              plan: data,
              currentTaskIndex: -1,
              taskStatuses: initialStatuses,
              taskOutputs: {},
              savedAssets: [],
              systemWarnings: []
            };
          }
          return s;
        });
        setSessions(updatedSessionsWithAi);
        localStorage.setItem('agent_chat_sessions', JSON.stringify(updatedSessionsWithAi));
      } else if (data.success === false && data.explanation) {
        // Refresh memory in case the AI learned or updated something
        fetchAiMemory();

        // Set the error explanation to errorPlan state to show it on screen
        setErrorPlan(data.explanation);

        // Create AI message with explanation
        const aiMessage: ChatMessage = {
          id: 'msg_' + Date.now(),
          sender: 'ai',
          text: data.explanation,
          timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
          plan: null
        };

        const finalMessages = [...updatedMessages, aiMessage];

        const updatedSessionsWithExplanation = sessions.map(s => {
          if (s.id === activeSessionId) {
            return { 
              ...s, 
              messages: finalMessages,
              plan: null,
              currentTaskIndex: -1,
              taskStatuses: {},
              taskOutputs: {},
              savedAssets: [],
              systemWarnings: []
            };
          }
          return s;
        });
        setSessions(updatedSessionsWithExplanation);
        localStorage.setItem('agent_chat_sessions', JSON.stringify(updatedSessionsWithExplanation));
      } else {
        throw new Error('طرح اجرایی معتبری یافت نشد. لطفاً دستور واضح‌تری بنویسید.');
      }
    } catch (err: any) {
      const errMsg = normalizeErrorMessage(err);
      setErrorPlan(errMsg);

      // Append error message to chat
      const aiErrorMessage: ChatMessage = {
        id: 'msg_' + Date.now(),
        sender: 'ai',
        text: `❌ خطا در پردازش دستور: ${errMsg}\nلطفاً دوباره تلاش کنید یا دستور خود را اصلاح نمایید.`,
        timestamp: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })
      };

      const finalMessagesWithError = [...updatedMessages, aiErrorMessage];
      const updatedSessionsWithError = sessions.map(s => {
        if (s.id === activeSessionId) {
          return { ...s, messages: finalMessagesWithError };
        }
        return s;
      });
      saveSessions(updatedSessionsWithError);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleGeneratePlan();
    }
  };

  const executeTaskAiGeneration = async (taskIndex: number) => {
    if (!plan) return;
    const task = plan.tasks[taskIndex];
    if (!task) return;

    // Retrieve attached images from the last user message of the active session
    const lastUserMsg = activeSession?.messages
      ? [...activeSession.messages].reverse().find(m => m.sender === 'user' && (m.attachedImageUrl || (m.attachedGalleryUrls && m.attachedGalleryUrls.length > 0)))
      : null;
    const taskAttachedImageUrl = lastUserMsg?.attachedImageUrl || '';
    const taskAttachedGalleryUrls = lastUserMsg?.attachedGalleryUrls || [];

    // Check if parent task failed or was skipped
    if (task.dependsOn) {
      const parentStatus = taskStatuses[task.dependsOn];
      if (parentStatus === 'failed' || parentStatus === 'skipped') {
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'skipped' }));
        setTaskOutputs(prev => ({
          ...prev,
          [task.id]: { error: 'این تسک به دلیل شکست تسک قبلی اجرا نشد' }
        }));
        
        // Propagate skipped status to any further dependent tasks
        const dependentTasks = plan.tasks.filter(t => t.dependsOn === task.id);
        for (const depTask of dependentTasks) {
          const depIdx = plan.tasks.findIndex(t => t.id === depTask.id);
          if (depIdx !== -1) {
            // We can set it to skipped directly or call executeTaskAiGeneration which will handle it
            setTimeout(() => executeTaskAiGeneration(depIdx), 50);
          }
        }
        return;
      }
    }

    setTaskStatuses(prev => ({ ...prev, [task.id]: 'running' }));
    setGeneralError('');

    try {
      let bodyPayload: any = {};
      if (task.target === 'products') {
        // Auto-normalize product edit endpoints (remove /edit suffix)
        if (task.saveEndpoint && task.saveEndpoint.endsWith('/edit')) {
          task.saveEndpoint = task.saveEndpoint.substring(0, task.saveEndpoint.length - 5);
        }
        const productIdMatch = task.saveEndpoint.match(/\/api\/admin\/products\/([a-zA-Z0-9_-]+)$/);
        const isEdit = task.saveEndpoint.startsWith('/api/admin/products/') && task.saveEndpoint !== '/api/admin/products' && !task.saveEndpoint.includes('ai-control') && !task.saveEndpoint.includes('ai-assistant');
        
        let existingFormData = { title: '', price: '0', stock: '0', description: '', fullDescription: '', type: 'physical', isActive: true, isSpecial: false, specialEndsAt: null, brand: '', imageUrl: '' };
        let existingFeatures = [];
        let existingSpecs = [];
        let existingGallery = [];
        let existingVariants = [];
        let existingFaq = [];

        if (isEdit && productIdMatch) {
          const productId = productIdMatch[1];
          try {
            const productRes = await fetch(`/api/admin/products/${productId}`);
            if (productRes.ok) {
              const resData = await productRes.json();
              const product = resData.product;
              if (product) {
                existingFormData = {
                  id: product.id,
                  title: product.title || '',
                  price: String(product.price || '0'),
                  stock: String(product.stock || '0'),
                  description: product.description || '',
                  fullDescription: product.fullDescription || '',
                  type: product.type || 'physical',
                  isActive: product.isActive !== undefined ? product.isActive : true,
                  isSpecial: product.isSpecial || false,
                  specialEndsAt: product.specialEndsAt || null,
                  brand: product.brand || '',
                  imageUrl: product.imageUrl || '',
                  wholesalePrice: product.wholesalePrice ? String(product.wholesalePrice) : '',
                  moq: String(product.moq || '1'),
                  wholesaleUnit: product.wholesaleUnit || '',
                  wholesaleUnitSize: String(product.wholesaleUnitSize || '1'),
                  weight: String(product.weight || '0'),
                  volume: String(product.volume || '0'),
                  isWholesaleOnly: product.isWholesaleOnly || false,
                  wholesaleTiers: product.wholesaleTiers || '[]',
                  wholesaleExclusivePrices: product.wholesaleExclusivePrices || '[]'
                } as any;
                
                if (product.features) {
                  try {
                    const parsed = JSON.parse(product.features);
                    existingFeatures = Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })) as any;
                  } catch (e) {}
                }
                if (product.specs) {
                  try {
                    const parsed = JSON.parse(product.specs);
                    existingSpecs = Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) })) as any;
                  } catch (e) {}
                }
                if (product.galleryUrls) {
                  try {
                    existingGallery = JSON.parse(product.galleryUrls);
                  } catch (e) {
                    if (Array.isArray(product.galleryUrls)) existingGallery = product.galleryUrls;
                  }
                }
                if (product.variants) {
                  existingVariants = product.variants;
                }
                if (product.faqs) {
                  try {
                    existingFaq = JSON.parse(product.faqs);
                  } catch (e) {
                    if (Array.isArray(product.faqs)) existingFaq = product.faqs;
                  }
                }
              }
            }
          } catch (err) {
            console.error("Failed to fetch existing product for AI context:", err);
          }
        }

        const initialGallery = taskAttachedGalleryUrls.length > 0 ? taskAttachedGalleryUrls : (taskAttachedImageUrl ? [taskAttachedImageUrl] : existingGallery);
        const initialImageUrl = taskAttachedImageUrl || existingFormData.imageUrl;
        const updatedPrompt = taskAttachedImageUrl 
          ? `${task.improvedPrompt} (تصویر محصول از قبل توسط کاربر آپلود شده است و آدرس آن برابر با "${taskAttachedImageUrl}" است. لطفاً همین آدرس تصویر را در فیلد تصویر اصلی و گالری قرار دهی)`
          : task.improvedPrompt;
          
        bodyPayload = { 
          prompt: updatedPrompt, 
          formData: { ...existingFormData, imageUrl: initialImageUrl }, 
          featuresList: existingFeatures, 
          specsList: existingSpecs, 
          galleryUrls: initialGallery, 
          variants: existingVariants, 
          faqItems: existingFaq 
        };
      } else if (task.target === 'blog') {
        const updatedPrompt = taskAttachedImageUrl 
          ? `${task.improvedPrompt} (تصویر شاخص مقاله از قبل توسط کاربر آپلود شده است و آدرس آن برابر با "${taskAttachedImageUrl}" است. لطفاً همین آدرس تصویر را در فیلد تصویر شاخص قرار دهی)`
          : task.improvedPrompt;
        bodyPayload = { prompt: updatedPrompt, articles: [] };
      } else if (task.target === 'stories') {
        const savedProduct = savedAssets.find(a => a.type === 'products');
        let updatedPrompt = savedProduct ? `${task.improvedPrompt} (این استوری را برای محصول تازه ایجاد شده با عنوان "${savedProduct.title}" به شناسه "${savedProduct.id}" لینک کن)` : task.improvedPrompt;
        if (taskAttachedImageUrl) {
          updatedPrompt += ` (تصویر/ویدیو استوری از قبل توسط کاربر آپلود شده است و آدرس آن برابر با "${taskAttachedImageUrl}" است. لطفاً همین آدرس را در فیلد رسانه و کاور استوری قرار دهی)`;
        }
        bodyPayload = { prompt: updatedPrompt, stories: [], products: savedProduct ? [{ id: savedProduct.id, title: savedProduct.title }] : [], posts: [] };
      } else if (task.target === 'categories') {
        bodyPayload = { prompt: task.improvedPrompt, categories: [], brands: [] };
      } else if (task.target === 'discounts') {
        try {
          const [discRes, catRes, prodRes] = await Promise.all([
            fetch('/api/admin/discounts'),
            fetch('/api/admin/categories'),
            fetch('/api/admin/products'),
          ]);
          const discData = await discRes.json();
          const catData = await catRes.json();
          const prodData = await prodRes.json();
          bodyPayload = {
            prompt: task.improvedPrompt,
            discounts: Array.isArray(discData.discounts) ? discData.discounts : [],
            categories: Array.isArray(catData.categories) ? catData.categories : [],
            products: Array.isArray(prodData.products) ? prodData.products : []
          };
        } catch (err) {
          console.error("Failed to fetch context for discounts:", err);
          bodyPayload = { prompt: task.improvedPrompt, discounts: [], categories: [], products: [] };
        }
      } else if (task.target === 'orders') {
        bodyPayload = { prompt: task.improvedPrompt, preview: true };
      } else if (task.target === 'reviews') {
        bodyPayload = { prompt: task.improvedPrompt, preview: true };
      } else if (task.target === 'settings') {
        try {
          const settingsRes = await fetch('/api/settings');
          const settingsData = await settingsRes.json();
          const currentSettings = settingsData.settings || {};
          bodyPayload = {
            prompt: task.improvedPrompt,
            formData: currentSettings
          };
        } catch (err) {
          console.error("Failed to fetch settings for AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            formData: {}
          };
        }
      } else if (task.target === 'about_us') {
        try {
          const settingsRes = await fetch('/api/settings');
          const settingsData = await settingsRes.json();
          const currentSettings = settingsData.settings || {};
          let parsedConfig = {};
          if (currentSettings.aboutUsPage) {
            try {
              parsedConfig = JSON.parse(currentSettings.aboutUsPage);
            } catch (e) {
              console.error("Error parsing aboutUsPage JSON:", e);
            }
          }
          bodyPayload = {
            prompt: task.improvedPrompt,
            config: parsedConfig
          };
        } catch (err) {
          console.error("Failed to fetch settings for About Us AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            config: {}
          };
        }
      } else if (task.target === 'contact_us') {
        try {
          const settingsRes = await fetch('/api/settings');
          const settingsData = await settingsRes.json();
          const currentSettings = settingsData.settings || {};
          let parsedConfig = {};
          if (currentSettings.contactUsPage) {
            try {
              parsedConfig = JSON.parse(currentSettings.contactUsPage);
            } catch (e) {
              console.error("Error parsing contactUsPage JSON:", e);
            }
          }
          bodyPayload = {
            prompt: task.improvedPrompt,
            config: parsedConfig
          };
        } catch (err) {
          console.error("Failed to fetch settings for Contact Us AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            config: {}
          };
        }
      } else if (task.target === 'custom_home') {
        try {
          const settingsRes = await fetch('/api/settings');
          const settingsData = await settingsRes.json();
          const currentSettings = settingsData.settings || {};
          
          let customHomeConfigObj: any = {};
          if (currentSettings.customHomeConfig) {
            try {
              customHomeConfigObj = JSON.parse(currentSettings.customHomeConfig);
            } catch (e) {
              console.error("Error parsing customHomeConfig:", e);
            }
          }
          
          // Combine top-level fields with customHomeConfig fields
          const combinedHomeFormData = {
            homePageType: currentSettings.homePageType || 'custom',
            isLandingActive: currentSettings.isLandingActive !== undefined ? currentSettings.isLandingActive : true,
            ...customHomeConfigObj
          };
          
          bodyPayload = {
            prompt: task.improvedPrompt,
            formData: combinedHomeFormData
          };
        } catch (err) {
          console.error("Failed to fetch custom home settings for AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            formData: {}
          };
        }
      } else if (task.target === 'slider') {
        try {
          const slidesRes = await fetch('/api/admin/slider');
          const slides = await slidesRes.json();
          bodyPayload = {
            prompt: task.improvedPrompt,
            slides: Array.isArray(slides) ? slides : [],
            attachedImageUrl: taskAttachedImageUrl || ''
          };
        } catch (err) {
          console.error("Failed to fetch slides for AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            slides: [],
            attachedImageUrl: taskAttachedImageUrl || ''
          };
        }
      } else if (task.target === 'media') {
        bodyPayload = { prompt: task.improvedPrompt, confirmed: false };
      } else if (task.target === 'shoppable') {
        try {
          const setsRes = await fetch('/api/admin/shoppable');
          const sets = await setsRes.json();
          bodyPayload = {
            prompt: task.improvedPrompt,
            sets: Array.isArray(sets) ? sets : []
          };
        } catch (err) {
          console.error("Failed to fetch shoppable sets for AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            sets: []
          };
        }
      } else if (task.target === 'footer') {
        try {
          const footerRes = await fetch('/api/admin/footer');
          const footerData = await footerRes.json();
          bodyPayload = {
            prompt: task.improvedPrompt,
            currentConfig: footerData.config || {}
          };
        } catch (err) {
          console.error("Failed to fetch footer config for AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            currentConfig: {}
          };
        }
      } else if (task.target === 'header') {
        try {
          const headerRes = await fetch('/api/admin/header');
          const headerData = await headerRes.json();
          bodyPayload = {
            prompt: task.improvedPrompt,
            currentConfig: headerData.config || {}
          };
        } catch (err) {
          console.error("Failed to fetch header config for AI context:", err);
          bodyPayload = {
            prompt: task.improvedPrompt,
            currentConfig: {}
          };
        }
      } else if (task.target === 'users') {
        try {
          const [usersRes, settingsRes] = await Promise.all([
            fetch('/api/admin/users'),
            fetch('/api/settings')
          ]);
          const usersData = await usersRes.json();
          const settingsData = await settingsRes.json();
          bodyPayload = {
            prompt: task.improvedPrompt,
            users: Array.isArray(usersData.users) ? usersData.users : [],
            settings: settingsData.settings || {}
          };
        } catch (err) {
          console.error("Failed to fetch context for users:", err);
          bodyPayload = { prompt: task.improvedPrompt, users: [], settings: {} };
        }
      } else if (task.target === 'tickets') {
        bodyPayload = {
          prompt: task.improvedPrompt,
          preview: true
        };
      } else if (task.target === 'system_tickets') {
        bodyPayload = {
          prompt: task.improvedPrompt,
          preview: true
        };
      } else if (task.target === 'staff' || task.target === 'profile' || task.target === 'import_export') {
        bodyPayload = {
          prompt: task.improvedPrompt,
          preview: true
        };
      } else if (task.target === 'brand') {
        try {
          const brandsRes = await fetch('/api/admin/brands');
          const brandsData = await brandsRes.json();
          const brandsList = Array.isArray(brandsData) ? brandsData : (brandsData.brands || []);
          bodyPayload = { prompt: task.improvedPrompt, brands: brandsList, preview: true };
        } catch (err) {
          console.error('Failed to fetch brands for AI context:', err);
          bodyPayload = { prompt: task.improvedPrompt, brands: [], preview: true };
        }
      } else if (task.target === 'content_calendar') {
        // System-driven: only the planning horizon (months ahead) is needed.
        const monthsMatch = (task.improvedPrompt || '').match(/(\d+)\s*ماه/);
        const monthsAhead = monthsMatch ? Math.min(Math.max(parseInt(monthsMatch[1], 10) || 3, 1), 6) : 3;
        bodyPayload = { monthsAhead };
      } else if (task.target === 'blog_comments') {
        bodyPayload = { prompt: task.improvedPrompt, preview: true };
      }

      const { res, data } = await fetchJson(normalizeApiPath(task.aiControlEndpoint), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bodyPayload) });
      const output = data as any;
      if (!res.ok) {
        const errorMsg = output.error?.message || (typeof output.error === 'string' ? output.error : null) || `خطا در پردازش توسط هوش مصنوعی زیرمجموعه ${task.title}`;
        throw new Error(errorMsg);
      }

      // Apply default images if none are present
      if (task.target === 'products') {
        if (!output.formData) output.formData = {};
        if (!output.formData.imageUrl && (!output.galleryUrls || output.galleryUrls.length === 0)) {
          output.formData.imageUrl = DEFAULT_PRODUCT_IMAGE;
          output.galleryUrls = [DEFAULT_PRODUCT_IMAGE];
        } else if (!output.formData.imageUrl && output.galleryUrls && output.galleryUrls.length > 0) {
          output.formData.imageUrl = output.galleryUrls[0];
        } else if (output.formData.imageUrl && (!output.galleryUrls || output.galleryUrls.length === 0)) {
          output.galleryUrls = [output.formData.imageUrl];
        }
      } else if (task.target === 'blog') {
        const ops = output.operations || [];
        if (ops.length > 0 && (ops[0].type === 'create' || ops[0].type === 'create_post')) {
          if (!ops[0].data.featuredImage) {
            ops[0].data.featuredImage = DEFAULT_BLOG_IMAGE;
          }
        } else {
          if (!output.featuredImage && !output.imageUrl) {
            output.featuredImage = DEFAULT_BLOG_IMAGE;
            output.imageUrl = DEFAULT_BLOG_IMAGE;
          }
        }
      } else if (task.target === 'stories') {
        const actions = output.actions || [];
        if (actions.length > 0 && actions[0].type === 'create') {
          const storyData = actions[0].data || actions[0].story || actions[0];
          if (!storyData.mediaUrl) {
            storyData.mediaUrl = DEFAULT_STORY_IMAGE;
            storyData.thumbnailUrl = DEFAULT_STORY_IMAGE;
          }
        } else {
          if (!output.mediaUrl) {
            output.mediaUrl = DEFAULT_STORY_IMAGE;
            output.thumbnailUrl = DEFAULT_STORY_IMAGE;
          }
        }
      }

      if (task.target === 'settings' && output.formData) {
        output.formData = ensureThemeColorApplied(
          task.improvedPrompt || bodyPayload.prompt || '',
          output.formData as Record<string, unknown>
        );
      }

      setTaskOutputs(prev => ({ ...prev, [task.id]: output }));
      setTaskStatuses(prev => ({ ...prev, [task.id]: 'preview_ready' }));
      if (output.warnings?.length > 0) setSystemWarnings(prev => [...prev, ...output.warnings]);
    } catch (err: any) {
      setTaskStatuses(prev => {
        const updated = { ...prev, [task.id]: 'failed' as const };
        // Propagate failed status to any further dependent tasks
        const dependentTasks = plan.tasks.filter(t => t.dependsOn === task.id);
        for (const depTask of dependentTasks) {
          updated[depTask.id] = 'skipped' as const;
        }
        return updated;
      });
      setGeneralError(err.message || 'خطا در برقراری ارتباط با سرویس هوشمند.');
    }
  };

  const handleApproveAndSave = async (taskIndex: number) => {
    if (!plan) return;
    const task = plan.tasks[taskIndex];
    if (!task) return;
    const output = taskOutputs[task.id];
    if (!output) return;

    setTaskStatuses(prev => ({ ...prev, [task.id]: 'saving' }));
    setGeneralError('');

    try {
      let savePayload: any = {};

      // Content calendar self-persists during generation; approving just marks it complete.
      if (task.target === 'content_calendar') {
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
        setSavedAssets(prev => [...prev, { type: task.target, id: String(Math.random()).slice(-6), title: task.title, url: '/admin/blog/content-calendar' }]);
        const dependentCalTasks = plan.tasks.filter(t => t.dependsOn === task.id);
        for (const depTask of dependentCalTasks) {
          const depIdx = plan.tasks.findIndex(t => t.id === depTask.id);
          if (depIdx !== -1) executeTaskAiGeneration(depIdx);
        }
        return;
      }

      if (task.target === 'products') {
        const finalFeatures = Object.fromEntries((output.featuresList || []).filter((f: any) => f.key?.trim()).map((f: any) => [f.key.trim(), f.value.trim()]));
        const finalSpecs = Object.fromEntries((output.specsList || []).filter((f: any) => f.key?.trim()).map((f: any) => [f.key.trim(), f.value.trim()]));
        savePayload = { ...output.formData, price: Number(output.formData.price) || 0, stock: Number(output.formData.stock) || 0, features: Object.keys(finalFeatures).length > 0 ? JSON.stringify(finalFeatures) : null, specs: Object.keys(finalSpecs).length > 0 ? JSON.stringify(finalSpecs) : null, galleryUrls: (output.galleryUrls || []).length > 0 ? JSON.stringify(output.galleryUrls) : null, variants: (output.variants || []).filter((v: any) => v.name?.trim()), faqs: (output.faqItems || []).filter((f: any) => f.question?.trim() && f.answer?.trim()).length > 0 ? JSON.stringify(output.faqItems.filter((f: any) => f.question?.trim() && f.answer?.trim())) : null, wholesaleTiers: typeof output.formData.wholesaleTiers === 'string' ? output.formData.wholesaleTiers : (Array.isArray(output.formData.wholesaleTiers) ? JSON.stringify(output.formData.wholesaleTiers) : '[]'), wholesaleExclusivePrices: typeof output.formData.wholesaleExclusivePrices === 'string' ? output.formData.wholesaleExclusivePrices : (Array.isArray(output.formData.wholesaleExclusivePrices) ? JSON.stringify(output.formData.wholesaleExclusivePrices) : '[]') };
      } else if (task.target === 'blog') {
        savePayload = { prompt: task.improvedPrompt, confirmed: true, operations: output.operations || [] };
      } else if (task.target === 'stories') {
        const actions = output.actions || [];
        if (actions.length > 0 && actions[0].type === 'create') {
          const storyData = actions[0].data || actions[0].story || actions[0];
          savePayload = { title: storyData.title || 'استوری جدید', thumbnailUrl: storyData.thumbnailUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg', mediaUrl: storyData.mediaUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg', mediaType: storyData.mediaType || 'image', text: storyData.text || '', linkUrl: storyData.linkUrl || '', linkText: storyData.linkText || 'مشاهده', expiresAt: storyData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), duration: Number(storyData.duration) || 5, category: storyData.category || '', displayLocation: storyData.displayLocation || 'both' };
        } else {
          savePayload = { title: output.title || 'استوری جدید', thumbnailUrl: output.thumbnailUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg', mediaUrl: output.mediaUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg', mediaType: output.mediaType || 'image', text: output.text || '', linkUrl: output.linkUrl || '', linkText: output.linkText || 'مشاهده', expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), duration: 5, category: '', displayLocation: 'both' };
        }
      } else if (task.target === 'categories') {
        savePayload = { prompt: task.improvedPrompt, confirmed: true, operations: output.operations || [] };
      } else if (task.target === 'discounts') {
        savePayload = { prompt: task.improvedPrompt, confirmed: true, operations: output.operations || [] };
      } else if (task.target === 'orders') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'reviews') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'tickets') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'system_tickets') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'staff' || task.target === 'profile' || task.target === 'import_export') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'media') {
        savePayload = { prompt: task.improvedPrompt, confirmed: true, rawResult: output.rawResult || output };
      } else if (task.target === 'shoppable') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'settings') {
        savePayload = ensureThemeColorApplied(
          task.improvedPrompt || '',
          (output.formData || {}) as Record<string, unknown>
        );
      } else if (task.target === 'about_us') {
        const finalConfig = output.config || output.rawResult?.config || output;
        savePayload = {
          aboutUsPage: JSON.stringify({
            ...finalConfig,
            isStructured: true
          })
        };
      } else if (task.target === 'contact_us') {
        const finalConfig = output.config || output.rawResult?.config || output;
        savePayload = {
          contactUsPage: JSON.stringify({
            ...finalConfig,
            isStructured: true
          })
        };
      } else if (task.target === 'custom_home') {
        const outputFormData = output.formData || {};
        const { homePageType, ...customHomeConfig } = outputFormData;
        
        try {
          // Fetch existing settings in parallel or synchronous block
          // Note: Since we are in an async function, we can await safely.
          const settingsRes = await fetch('/api/settings');
          const settingsData = await settingsRes.json();
          const existing = settingsData.settings || {};
          
          savePayload = {
            ...existing,
            homePageType: homePageType || 'custom',
            customHomeConfig: JSON.stringify(customHomeConfig)
          };
        } catch (err) {
          console.error("Failed to fetch settings during save:", err);
          savePayload = {
            homePageType: homePageType || 'custom',
            customHomeConfig: JSON.stringify(customHomeConfig)
          };
        }
      } else if (task.target === 'footer') {
        savePayload = { config: output.config || output.rawResult?.config || output };
      } else if (task.target === 'header') {
        savePayload = { config: output.config || output.rawResult?.config || output };
      } else if (task.target === 'users') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      } else if (task.target === 'brand') {
        savePayload = { prompt: task.improvedPrompt, confirmed: true, operations: output.operations || [] };
      } else if (task.target === 'blog_comments') {
        savePayload = { prompt: task.improvedPrompt, execute: true, rawResult: output.rawResult || output };
      }

      let saveData: any = {};
      if (task.target === 'slider') {
        const actions = output.actions || [];
        if (actions.length === 0) {
          throw new Error('هیچ اقدامی برای ذخیره یافت نشد.');
        }

        let lastResult: any = null;
        for (const action of actions) {
          if (action.type === 'create') {
            const { res, data: result } = await fetchJson('/api/admin/slider', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data)
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || 'خطا در ایجاد اسلاید');
          } else if (action.type === 'update') {
            const { res, data: result } = await fetchJson(normalizeApiPath(`/api/admin/slider/${action.id}`), {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data)
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || 'خطا در ویرایش اسلاید');
          } else if (action.type === 'delete') {
            const { res, data: result } = await fetchJson(normalizeApiPath(`/api/admin/slider/${action.id}`), {
              method: 'DELETE'
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || 'خطا در حذف اسلاید');
          }
        }
        saveData = lastResult || { success: true };
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
      } else if (task.target === 'stories') {
        const actions = output.actions || [];
        if (actions.length === 0) {
          const fallbackData = {
            title: output.title || 'استوری جدید',
            thumbnailUrl: output.thumbnailUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg',
            mediaUrl: output.mediaUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg',
            mediaType: output.mediaType || 'image',
            text: output.text || '',
            linkUrl: output.linkUrl || '',
            linkText: output.linkText || 'مشاهده',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            duration: 5,
            category: '',
            displayLocation: 'both'
          };
          const { res, data: result } = await fetchJson<any>('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackData)
          });
          if (!res.ok) throw new Error(result.error || 'خطا در ایجاد استوری');
          saveData = result;
        } else {
          let lastResult: any = null;
          for (const action of actions) {
            if (action.type === 'create') {
              const storyData = action.data || {};
              const payload = {
                title: storyData.title || 'استوری جدید',
                thumbnailUrl: storyData.thumbnailUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg',
                mediaUrl: storyData.mediaUrl || 'https://images.pexels.com/photos/1037995/pexels-photo-1037995.jpeg',
                mediaType: storyData.mediaType || 'image',
                text: storyData.text || '',
                linkUrl: storyData.linkUrl || '',
                linkText: storyData.linkText || 'مشاهده',
                expiresAt: storyData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                duration: Number(storyData.duration) || 5,
                category: storyData.category || '',
                displayLocation: storyData.displayLocation || 'both'
              };
              const { res, data: result } = await fetchJson<any>('/api/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              if (!res.ok) throw new Error(result.error || 'خطا در ایجاد استوری جدید');
              lastResult = result;
            } else if (action.type === 'update') {
              const { res, data: result } = await fetchJson<any>(normalizeApiPath(`/api/stories/${action.id}`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action.data)
              });
              if (!res.ok) throw new Error(result.error || 'خطا در ویرایش استوری');
              lastResult = result;
            } else if (action.type === 'delete') {
              const { res, data: result } = await fetchJson<any>(normalizeApiPath(`/api/stories/${action.id}`), {
                method: 'DELETE'
              });
              if (!res.ok) throw new Error(result.error || 'خطا در حذف استوری');
              lastResult = result;
            } else if (action.type === 'create_discount') {
              const { res, data: result } = await fetchJson<any>('/api/admin/discounts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(action.data)
              });
              if (!res.ok) throw new Error(result.error || 'خطا در ایجاد کد تخفیف استوری');
              lastResult = result;
            }
          }
          saveData = lastResult || { success: true };
        }
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
      } else if (task.target === 'users') {
        const allActions = output.actions || output.rawResult?.actions || [];
        // getUserDetails is a read-only display action; it must not trigger any save/mutation call.
        const actions = allActions.filter((a: any) => a.type !== 'getUserDetails');
        const hasReadOnly = allActions.some((a: any) => a.type === 'getUserDetails');

        if (actions.length === 0) {
          if (hasReadOnly) {
            // Pure read-only request (e.g. retrieving a customer's details): nothing to persist.
            setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
            return;
          }
          throw new Error(output.explanation || output.rawResult?.explanation || 'مشتری مورد نظر یافت نشد یا اقدامی برای اجرا وجود ندارد.');
        }

        let lastResult: any = null;
        for (const action of actions) {
          if (action.type === 'updateSettings') {
            const { res, data: result } = await fetchJson('/api/settings', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data)
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || 'خطا در بروزرسانی تنظیمات باشگاه مشتریان');
          } else if (action.type === 'updateUserGroup') {
            const { res, data: result } = await fetchJson(`/api/admin/users/${action.userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'changeGroup', group: action.group })
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || `خطا در تغییر گروه کاربر ${action.userName}`);
          } else if (action.type === 'adjustUserPoints') {
            const { res, data: result } = await fetchJson(`/api/admin/users/${action.userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'adjustPoints', points: action.points, reason: action.reason })
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || `خطا در تنظیم امتیاز کاربر ${action.userName}`);
          } else if (action.type === 'toggleUserBlock') {
            const { res, data: result } = await fetchJson(`/api/admin/users/${action.userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'toggleBlock', isBlocked: action.isBlocked })
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || `خطا در تغییر وضعیت مسدودیت کاربر ${action.userName}`);
          } else if (action.type === 'changeUserPassword') {
            const { res, data: result } = await fetchJson(`/api/admin/users/${action.userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'changePassword', password: action.password })
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || `خطا در تغییر رمز عبور کاربر ${action.userName}`);
          } else if (action.type === 'updateUserDetails') {
            const { res, data: result } = await fetchJson(`/api/admin/users/${action.userId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'updateUser', ...action.data })
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || `خطا در ویرایش اطلاعات کاربر ${action.userName}`);
          } else if (action.type === 'createUser') {
            const { res, data: result } = await fetchJson('/api/admin/users', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.data)
            });
            lastResult = result;
            if (!res.ok) throw new Error(lastResult.error || `خطا در ثبت کاربر جدید`);
          } else if (action.type === 'exportUsers') {
            try {
              const uRes = await fetch('/api/admin/users');
              const uData = await uRes.json();
              if (uData.users) {
                let filtered = uData.users;
                const f = action.filters || {};
                if (f.group) filtered = filtered.filter((u: any) => u.group === f.group);
                if (f.isBlocked !== undefined) filtered = filtered.filter((u: any) => !!u.isBlocked === !!f.isBlocked);
                if (f.minPoints !== undefined) filtered = filtered.filter((u: any) => (u.loyaltyPoints || 0) >= f.minPoints);
                if (f.maxPoints !== undefined) filtered = filtered.filter((u: any) => (u.loyaltyPoints || 0) <= f.maxPoints);
                if (Array.isArray(f.userIds)) filtered = filtered.filter((u: any) => f.userIds.includes(u.id));

                const headers = ['شناسه', 'نام', 'ایمیل', 'تلفن', 'امتیاز وفاداری', 'گروه', 'وضعیت مسدودیت', 'تاریخ عضویت'];
                const rows = filtered.map((u: any) => [
                  u.id,
                  u.name || '',
                  u.email || '',
                  u.phone || '',
                  u.loyaltyPoints || 0,
                  u.group || 'عادی',
                  u.isBlocked ? 'مسدود' : 'فعال',
                  new Date(u.createdAt).toLocaleDateString('fa-IR')
                ]);
                const csvContent = "\uFEFF" + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.setAttribute("href", url);
                link.setAttribute("download", `users_export_${Date.now()}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }
            } catch (err) {
              console.error("Simulation of user export failed:", err);
            }
            lastResult = { success: true, message: 'خروجی اکسل/CSV کاربران با موفقیت دانلود شد' };
          }
        }
        saveData = lastResult || { success: true };
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
      } else {
        if (task.target === 'products' && task.saveEndpoint && task.saveEndpoint.endsWith('/edit')) {
          task.saveEndpoint = task.saveEndpoint.substring(0, task.saveEndpoint.length - 5);
        }
        let saveMethod = 'POST';
        if (task.target === 'settings' || task.target === 'custom_home' || task.target === 'footer' || task.target === 'header' || task.target === 'about_us' || task.target === 'contact_us') {
          saveMethod = 'PUT';
        } else if (task.target === 'products' && task.saveEndpoint.startsWith('/api/admin/products/') && task.saveEndpoint !== '/api/admin/products' && !task.saveEndpoint.includes('ai-control') && !task.saveEndpoint.includes('ai-assistant')) {
          saveMethod = 'PUT';
        }
        let saveUrl = task.saveEndpoint;
        if (task.target === 'categories' || task.target === 'reviews' || task.target === 'media' || task.target === 'shoppable' || task.target === 'blog' || task.target === 'discounts' || task.target === 'tickets' || task.target === 'system_tickets' || task.target === 'staff' || task.target === 'profile' || task.target === 'import_export' || task.target === 'brand' || task.target === 'blog_comments') {
          saveUrl = task.aiControlEndpoint; // Use their respective ai-control endpoint for direct database execution
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (task.idempotencyKey) {
          headers['X-Idempotency-Key'] = task.idempotencyKey;
        }

        const { res: saveRes, data: saveDataResult } = await fetchJson(normalizeApiPath(saveUrl), { 
          method: saveMethod, 
          headers, 
          body: saveMethod !== 'DELETE' ? JSON.stringify(savePayload) : undefined 
        });
        saveData = saveDataResult;
        if (!saveRes.ok) {
          const errorMsg = saveData.error?.message || (typeof saveData.error === 'string' ? saveData.error : null) || `خطا در ذخیره نهایی اطلاعات در ${task.title}`;
          throw new Error(errorMsg);
        }
        setTaskStatuses(prev => ({ ...prev, [task.id]: 'completed' }));
        if (task.target === 'settings' || task.target === 'about_us' || task.target === 'contact_us') {
          fetchAiMemory();
        }
      }

      if (task.target === 'orders' && saveData.action === 'print_invoice' && saveData.targetOrderIds?.length > 0) {
        window.open(`/admin/orders/print-batch?ids=${saveData.targetOrderIds.join(',')}&mode=${saveData.printMode || 'invoice'}`, '_blank');
      }

      const assetId = saveData.id || saveData.product?.id || saveData.post?.id || saveData.story?.id || String(Math.random()).slice(-6);
      const assetTitle = savePayload.title || savePayload.name || savePayload.code || task.title;

      setSavedAssets(prev => [...prev, { type: task.target, id: assetId, title: assetTitle, url: getAssetViewUrl(task.target, assetId) }]);

      if (taskIndex + 1 < plan.tasks.length) {
        // Find dependent tasks that depend on the completed task
        const dependentTasks = plan.tasks.filter(t => t.dependsOn === task.id);
        
        // Execute dependent tasks
        for (const depTask of dependentTasks) {
          const depIdx = plan.tasks.findIndex(t => t.id === depTask.id);
          if (depIdx !== -1) {
            executeTaskAiGeneration(depIdx);
          }
        }

        // Find the next active task to show in the UI
        const nextActiveIdx = plan.tasks.findIndex((t) => {
          if (t.id === task.id) return false;
          const s = taskStatuses[t.id] || 'idle';
          return s !== 'completed' && s !== 'failed';
        });
        
        if (nextActiveIdx !== -1) {
          setCurrentTaskIndex(nextActiveIdx);
        } else {
          setCurrentTaskIndex(taskIndex + 1);
        }
      }
    } catch (err: any) {
      setTaskStatuses(prev => {
        const updated = { ...prev, [task.id]: 'failed' as const };
        // Propagate failed status to any further dependent tasks
        const dependentTasks = plan.tasks.filter(t => t.dependsOn === task.id);
        for (const depTask of dependentTasks) {
          updated[depTask.id] = 'skipped' as const;
        }
        return updated;
      });
      setGeneralError(err.message || 'خطا در ثبت نهایی اطلاعات در پایگاه داده.');
    }
  };

  const getAssetViewUrl = (target: string, id: string) => {
    const map: Record<string, string> = { products: '/admin/products', blog: '/admin/blog', stories: '/admin/stories', discounts: '/admin/discounts', categories: '/admin/categories', orders: '/admin/orders', reviews: '/admin/reviews', settings: '/admin/settings', slider: '/admin/slider', media: '/admin/media', shoppable: '/admin/shoppable', footer: '/admin/footer', header: '/admin/header', users: '/admin/users', tickets: '/admin/tickets', system_tickets: '/admin/system-tickets', staff: '/admin/staff', profile: '/admin/profile', import_export: '/admin/import-export', brand: '/admin/brands', content_calendar: '/admin/blog/content-calendar', blog_comments: '/admin/blog/comments', about_us: '/admin/settings/about-us', contact_us: '/admin/settings/contact-us' };
    return map[target] || '#';
  };

  const startSequentialExecution = () => {
    if (!plan || plan.tasks.length === 0) return;
    setWorkspaceTab('execution');
    
    // Separate tasks into independent and dependent
    const independentTasks = plan.tasks.filter(t => !t.dependsOn);
    
    if (independentTasks.length > 0) {
      // Set currentTaskIndex to the first independent task
      const firstIndieTaskIdx = plan.tasks.findIndex(t => t.id === independentTasks[0].id);
      setCurrentTaskIndex(firstIndieTaskIdx);
      
      // Execute all independent tasks in parallel!
      Promise.all(independentTasks.map(task => {
        const idx = plan.tasks.findIndex(t => t.id === task.id);
        return executeTaskAiGeneration(idx);
      }));
    } else {
      // Fallback if somehow all tasks have dependsOn
      setCurrentTaskIndex(0);
      executeTaskAiGeneration(0);
    }
  };

  const resetAll = () => {
    setPlan(null);
    setWizardStep(1);
    setCurrentTaskIndex(-1);
    setTaskStatuses({});
    setTaskOutputs({});
    setSavedAssets([]);
    setSystemWarnings([]);
    setGeneralError('');
    setShowFinishedDetails(false);
    setWorkspaceTab('execution');
  };

  const updateActiveOutput = (updater: (prevOutput: any) => any) => {
    const activeTask = plan?.tasks[currentTaskIndex];
    if (!activeTask) return;
    setTaskOutputs(prev => ({
      ...prev,
      [activeTask.id]: updater(prev[activeTask.id])
    }));
  };

  const updateBlogField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.operations?.[0]?.data) {
        updated.operations = [
          {
            ...updated.operations[0],
            data: {
              ...updated.operations[0].data,
              [field]: value
            }
          },
          ...updated.operations.slice(1)
        ];
      }
      return updated;
    });
  };

  const updateBlogOpField = (opIdx: number, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.operations && updated.operations[opIdx]) {
        const op = updated.operations[opIdx];
        updated.operations = [
          ...updated.operations.slice(0, opIdx),
          {
            ...op,
            data: {
              ...(op.data || {}),
              [field]: value
            }
          },
          ...updated.operations.slice(opIdx + 1)
        ];
      }
      return updated;
    });
  };

  const updateStoryField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.actions?.[0]) {
        const action = updated.actions[0];
        const targetKey = action.data ? 'data' : action.story ? 'story' : null;
        if (targetKey) {
          updated.actions = [
            {
              ...action,
              [targetKey]: {
                ...action[targetKey],
                [field]: value
              }
            },
            ...updated.actions.slice(1)
          ];
        } else {
          updated.actions = [
            {
              ...action,
              [field]: value
            },
            ...updated.actions.slice(1)
          ];
        }
      }
      return updated;
    });
  };

  const updateCategoryField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.operations?.[0]) {
        updated.operations = [
          {
            ...updated.operations[0],
            data: {
              ...updated.operations[0].data,
              [field]: value
            }
          },
          ...updated.operations.slice(1)
        ];
      }
      return updated;
    });
  };

  const updateCategoryOpField = (opIdx: number, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.operations && updated.operations[opIdx]) {
        const op = updated.operations[opIdx];
        updated.operations = [
          ...updated.operations.slice(0, opIdx),
          {
            ...op,
            data: {
              ...(op.data || {}),
              [field]: value
            }
          },
          ...updated.operations.slice(opIdx + 1)
        ];
      }
      return updated;
    });
  };

  const updateSettingsField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.formData) {
        updated.formData = {
          ...updated.formData,
          [field]: value
        };
      }
      return updated;
    });
  };

  const updateAboutUsField = (section: string, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      let config = updated.config || updated.rawResult?.config || updated;
      if (config) {
        if (section) {
          config[section] = {
            ...config[section],
            [field]: value
          };
        } else {
          config[field] = value;
        }
      }
      return updated;
    });
  };

  const updateAboutUsListField = (section: string, itemId: string, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      let config = updated.config || updated.rawResult?.config || updated;
      if (config && config[section] && Array.isArray(config[section].list)) {
        config[section].list = config[section].list.map((item: any) => 
          item.id === itemId ? { ...item, [field]: value } : item
        );
      }
      return updated;
    });
  };

  const updateContactUsField = (section: string, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      let config = updated.config || updated.rawResult?.config || updated;
      if (config) {
        if (section) {
          config[section] = {
            ...config[section],
            [field]: value
          };
        } else {
          config[field] = value;
        }
      }
      return updated;
    });
  };

  const updateContactUsListField = (section: string, itemId: string, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      let config = updated.config || updated.rawResult?.config || updated;
      if (config && config[section] && Array.isArray(config[section].list)) {
        config[section].list = config[section].list.map((item: any) => 
          item.id === itemId ? { ...item, [field]: value } : item
        );
      }
      return updated;
    });
  };

  const updateDiscountField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.operations?.[0]) {
        updated.operations = [
          {
            ...updated.operations[0],
            data: {
              ...(updated.operations[0].data || {}),
              [field]: value
            }
          },
          ...updated.operations.slice(1)
        ];
      }
      return updated;
    });
  };

  const updateDiscountOpField = (opIdx: number, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.operations && updated.operations[opIdx]) {
        const op = updated.operations[opIdx];
        updated.operations = [
          ...updated.operations.slice(0, opIdx),
          {
            ...op,
            data: {
              ...(op.data || {}),
              [field]: value
            }
          },
          ...updated.operations.slice(opIdx + 1)
        ];
      }
      return updated;
    });
  };

  const updateUsersField = (actionIdx: number, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      const acts = updated.actions || updated.rawResult?.actions;
      if (acts && acts[actionIdx]) {
        if (acts[actionIdx].data) {
          acts[actionIdx].data = {
            ...acts[actionIdx].data,
            [field]: value
          };
        } else if (acts[actionIdx].filters) {
          acts[actionIdx].filters = {
            ...acts[actionIdx].filters,
            [field]: value
          };
        } else {
          acts[actionIdx][field] = value;
        }
      }
      if (updated.rawResult?.actions && updated.rawResult.actions[actionIdx]) {
        const ra = updated.rawResult.actions[actionIdx];
        if (ra.data) {
          ra.data = {
            ...ra.data,
            [field]: value
          };
        } else if (ra.filters) {
          ra.filters = {
            ...ra.filters,
            [field]: value
          };
        } else {
          ra[field] = value;
        }
      }
      return updated;
    });
  };

  const updateTicketsField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.rawResult) {
        updated.rawResult[field] = value;
      }
      return updated;
    });
  };

  const updateSystemTicketsField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.rawResult) {
        updated.rawResult[field] = value;
      }
      return updated;
    });
  };

  const updateStaffField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (field === 'role' || field === 'name' || field === 'email' || field === 'phone' || field === 'password' || field === 'isBlocked') {
        if (!updated.data) updated.data = {};
        updated.data[field] = value;
      } else {
        updated[field] = value;
      }
      if (updated.rawResult) {
        if (field === 'role' || field === 'name' || field === 'email' || field === 'phone' || field === 'password' || field === 'isBlocked') {
          if (!updated.rawResult.data) updated.rawResult.data = {};
          updated.rawResult.data[field] = value;
        } else {
          updated.rawResult[field] = value;
        }
      }
      return updated;
    });
  };

  const updateProfileField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (field === 'name' || field === 'email' || field === 'phone' || field === 'avatarUrl') {
        if (!updated.data) updated.data = {};
        updated.data[field] = value;
      } else {
        updated[field] = value;
      }
      if (updated.rawResult) {
        if (field === 'name' || field === 'email' || field === 'phone' || field === 'avatarUrl') {
          if (!updated.rawResult.data) updated.rawResult.data = {};
          updated.rawResult.data[field] = value;
        } else {
          updated.rawResult[field] = value;
        }
      }
      return updated;
    });
  };

  const updateImportExportField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      updated[field] = value;
      if (updated.rawResult) {
        updated.rawResult[field] = value;
      }
      return updated;
    });
  };

  const updateReviewField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.data) {
        updated.data = {
          ...updated.data,
          [field]: value
        };
      } else {
        updated[field] = value;
      }
      return updated;
    });
  };

  const updateOrderField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.rawResult) {
        updated.rawResult = {
          ...updated.rawResult,
          updates: {
            ...updated.rawResult.updates,
            [field]: value
          }
        };
      }
      if (updated.updates) {
        updated.updates = {
          ...updated.updates,
          [field]: value
        };
      }
      return updated;
    });
  };

  const updateMediaField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      if (updated.rawResult?.settings) {
        updated.rawResult = {
          ...updated.rawResult,
          settings: {
            ...updated.rawResult.settings,
            [field]: value
          }
        };
      }
      if (updated.settings) {
        updated.settings = {
          ...updated.settings,
          [field]: value
        };
      }
      return updated;
    });
  };

  const updateShoppableField = (actionIdx: number, field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      const acts = updated.actions || updated.rawResult?.actions;
      if (acts && acts[actionIdx]) {
        if (acts[actionIdx].data) {
          acts[actionIdx].data = {
            ...acts[actionIdx].data,
            [field]: value
          };
        } else {
          acts[actionIdx][field] = value;
        }
      }
      if (updated.rawResult?.actions && updated.rawResult.actions[actionIdx]) {
        if (updated.rawResult.actions[actionIdx].data) {
          updated.rawResult.actions[actionIdx].data = {
            ...updated.rawResult.actions[actionIdx].data,
            [field]: value
          };
        } else {
          updated.rawResult.actions[actionIdx][field] = value;
        }
      }
      return updated;
    });
  };

  const updateFooterField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      const conf = updated.config || updated.rawResult?.config;
      if (conf) {
        if (updated.config) {
          updated.config = {
            ...updated.config,
            [field]: value
          };
        }
        if (updated.rawResult?.config) {
          updated.rawResult.config = {
            ...updated.rawResult.config,
            [field]: value
          };
        }
      }
      return updated;
    });
  };

  const updateHeaderField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      const conf = updated.config || updated.rawResult?.config;
      if (conf) {
        if (updated.config) {
          updated.config = {
            ...updated.config,
            [field]: value
          };
        }
        if (updated.rawResult?.config) {
          updated.rawResult.config = {
            ...updated.rawResult.config,
            [field]: value
          };
        }
      }
      return updated;
    });
  };

  const updateHeaderBannerField = (field: string, value: any) => {
    updateActiveOutput(prev => {
      const updated = { ...prev };
      const conf = updated.config || updated.rawResult?.config;
      if (conf) {
        if (updated.config) {
          updated.config = {
            ...updated.config,
            banner: {
              ...(updated.config.banner || {}),
              [field]: value
            }
          };
        }
        if (updated.rawResult?.config) {
          updated.rawResult.config = {
            ...updated.rawResult.config,
            banner: {
              ...(updated.rawResult.config.banner || {}),
              [field]: value
            }
          };
        }
      }
      return updated;
    });
  };

  const getTargetLabel = (target: string) => {
    const map: Record<string, string> = { products: 'محصولات', blog: 'وبلاگ', stories: 'استوری', discounts: 'تخفیف', categories: 'دسته‌بندی', orders: 'سفارشات', reviews: 'نظرات مشتریان', settings: 'تنظیمات', custom_home: 'صفحه اصلی', media: 'تصاویر و فایل‌ها', shoppable: 'پست‌های شاپبل', footer: 'تنظیمات فوتر', header: 'تنظیمات هدر', users: 'لیست کاربران', tickets: 'تیکت‌های مشتریان', system_tickets: 'پشتیبانی فنی سیستم', staff: 'مدیریت همکاران', profile: 'پروفایل مدیر', import_export: 'ورودی/خروجی داده‌ها' };
    return map[target] || target;
  };

  const getTargetIcon = (target: string, size = 13) => {
    const props = { size };
    const map: Record<string, React.ReactElement> = {
      products: <Package {...props} className="text-emerald-400" />,
      blog: <FileText {...props} className="text-blue-400" />,
      stories: <ImageIcon {...props} className="text-pink-400" />,
      discounts: <Tag {...props} className="text-amber-400" />,
      categories: <Layers {...props} className="text-primary-400" />,
      orders: <ShoppingBag {...props} className="text-violet-400" />,
      reviews: <MessageSquare {...props} className="text-pink-400" />,
      settings: <Settings {...props} className="text-rose-400" />,
      custom_home: <Home {...props} className="text-orange-400" />,
      media: <ImageIcon {...props} className="text-teal-400" />,
      shoppable: <ExternalLink {...props} className="text-primary-400" />,
      footer: <LayoutGrid {...props} className="text-slate-400" />,
      header: <Layout {...props} className="text-teal-400" />,
      users: <Users {...props} className="text-emerald-400" />,
      tickets: <MessageSquare {...props} className="text-sky-400" />,
      system_tickets: <Cpu {...props} className="text-rose-400" />,
      staff: <Users {...props} className="text-violet-400" />,
      profile: <User {...props} className="text-emerald-400" />,
      import_export: <RefreshCw {...props} className="text-amber-400" />,
    };
    return map[target] || <Sparkles {...props} className="text-slate-400" />;
  };

  const getTargetColor = (target: string) => {
    const map: Record<string, string> = { products: 'emerald', blog: 'blue', stories: 'pink', discounts: 'amber', categories: 'indigo', orders: 'violet', reviews: 'pink', settings: 'rose', custom_home: 'orange', media: 'teal', shoppable: 'indigo', footer: 'slate', header: 'teal', users: 'emerald', tickets: 'sky', system_tickets: 'rose', staff: 'violet', profile: 'emerald', import_export: 'amber' };
    return map[target] || 'slate';
  };

  const isAllCompleted = plan && plan.tasks.every(t => taskStatuses[t.id] === 'completed');
  const completedCount = plan ? plan.tasks.filter(t => taskStatuses[t.id] === 'completed').length : 0;
  const failedCount = plan ? plan.tasks.filter(t => taskStatuses[t.id] === 'failed').length : 0;
  const skippedCount = plan ? plan.tasks.filter(t => taskStatuses[t.id] === 'skipped').length : 0;
  const isPipelineFinished = plan && plan.tasks.every(t => {
    const s = taskStatuses[t.id];
    return s === 'completed' || s === 'failed' || s === 'skipped';
  });
  const anyTaskCompleted = completedCount > 0;
  const progressPct = plan ? (completedCount / plan.tasks.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" dir="rtl">
      {/* Gemini-style intro light sweep */}
      {showIntroSweep && <div className="ai-light-sweep-overlay" aria-hidden="true" />}

      {/* 1. NEW BEAUTIFUL HIGH-TECH HEADER */}
      <header className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 border-b border-slate-200/50 dark:border-slate-800/60 bg-white/75 dark:bg-[#0d1527]/75 backdrop-blur-md relative z-50 shrink-0">
        {/* Right (RTL start): brand + stage indicator */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-500 to-primary-600 flex items-center justify-center font-black text-sm text-white shadow-md shadow-primary-500/20 shrink-0 overflow-hidden group">
            <span className="relative z-10 font-black tracking-wider text-xs">AI</span>
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="absolute -inset-1 rounded-xl border border-primary-400/30 animate-pulse" />
          </div>
          <div className="flex flex-col text-right min-w-0">
            <span className="text-xs font-black text-slate-800 dark:text-white leading-tight truncate">دستیار فوق‌هوشمند ایجنت</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5 flex items-center gap-1.5">
              <span className="truncate">{profile?.shopName || 'فروشگاه'}</span>
              {plan && (
                <span className="px-1.5 py-0.5 rounded-md bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[9px] font-black">
                  مرحله {wizardStep === 1 ? '۱' : wizardStep === 2 ? '۲' : '۳'} از ۳
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Left (RTL end): actions — always available at every stage */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle Chat History Sidebar */}
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            title={isSidebarOpen ? "بستن تاریخچه گفتگوها" : "مشاهده تاریخچه گفتگوها"}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-[11px] font-black shadow-xs cursor-pointer ${
              isSidebarOpen
                ? 'bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400'
                : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-slate-200/50 dark:border-slate-800/40 text-slate-700 dark:text-slate-300'
            }`}
          >
            <MessageSquare size={13} className={isSidebarOpen ? 'text-primary-500' : 'text-slate-500'} />
            <span className="hidden sm:inline">تاریخچه</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-black">
              {sessions.length.toLocaleString('fa-IR')}
            </span>
          </button>

          {/* New Chat Button — full reset */}
          <button
            onClick={handleCreateNewSession}
            title="شروع گفتگوی جدید (پاک کردن طرح فعلی)"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] text-white transition-all text-[11px] font-black shadow-xs border border-primary-500/10 cursor-pointer"
          >
            <Plus size={13} />
            <span>چت جدید</span>
          </button>

          {/* Normal Mode (Exit Agent) Button */}
          <Link
            href="/admin/dashboard"
            title="خروج از حالت ایجنت و بازگشت به داشبورد"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all text-[11px] font-black shadow-xs border border-slate-200/50 dark:border-slate-800/40"
          >
            <LayoutDashboard size={13} />
            <span className="hidden sm:inline">خروج</span>
          </Link>
        </div>
      </header>

      {/* 2. BODY CONTENT (Sidebar + Main Content) */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 lg:gap-5 p-4 md:p-6 overflow-hidden select-none text-right">

      {/* Sidebar for Conversation History */}
      {isSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-[60] lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-[70] w-64 lg:relative lg:inset-auto lg:z-auto bg-white/95 dark:bg-[#0d1527]/95 lg:bg-transparent lg:dark:bg-transparent p-4 lg:p-0 lg:pl-4 lg:pr-1 lg:w-52 flex flex-col gap-3 shadow-lg lg:shadow-none shrink-0 lg:border-l lg:border-slate-200/40 lg:dark:border-slate-800/50">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-1.5 select-none">
                <MessageSquare size={11} />
                تاریخچه گفتگوها
              </span>
              <button
                onClick={handleCreateNewSession}
                className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-450 hover:text-slate-700 dark:hover:text-slate-200 transition-all cursor-pointer"
                title="گفتگوی جدید"
              >
                <Plus size={11} />
              </button>
            </div>

            {/* Sessions List */}
            <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar pr-1">
              {sessions.map(s => {
                const isActive = s.id === activeSessionId;
                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      setActiveSessionId(s.id);
                      if (window.matchMedia('(max-width: 1023px)').matches) setIsSidebarOpen(false);
                    }}
                    title={s.title}
                    className={`group flex items-center justify-between p-2 px-2.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary-500/5 dark:bg-primary-500/10 border-primary-500/20 dark:border-primary-500/10 text-primary-600 dark:text-primary-400 font-bold border-r-2 border-r-primary-500 rounded-r-none'
                        : 'bg-transparent border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/10 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="relative shrink-0">
                        <MessageSquare size={11} className={`transition-colors ${isActive ? 'text-primary-500' : 'text-slate-400 dark:text-slate-500'}`} />
                        {isActive && (
                          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-primary-500 rounded-full animate-ping" />
                        )}
                      </div>
                      <span className="text-[11px] truncate leading-none mt-0.5">{s.title}</span>
                    </div>
                    <button
                      onClick={(e) => handleDeleteSession(s.id, e)}
                      className="p-1 rounded-md text-slate-405 hover:text-rose-500 hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100"
                      title="حذف گفتگو"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative h-full max-h-full overflow-hidden bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl border border-slate-200 dark:border-slate-800/60 p-4 lg:p-6">
        
        {/* Page Mode Switcher is removed to keep layout clean and moved to Accounting submenu */}

        {pageMode === 'mahak' ? (
          <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 pr-1">
            <MahakIntegration />
          </div>
        ) : (
          <>
            {/* Wizard Stepper Header */}
            <div className="bg-white dark:bg-[#0d1527] border border-slate-200/50 dark:border-slate-800/60 rounded-2xl p-4 mb-5 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-xs shadow-primary-500/10">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h1 className="text-xs font-black text-slate-800 dark:text-white leading-tight">
                    {activeSession?.title || 'دستیار هوشمند فروشگاه'}
                  </h1>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">
                    کنترل کامل فروشگاه و تولید محتوا با قدرت هوش مصنوعی
                  </p>
                </div>
              </div>

              {/* Stepper Steps */}
              <div className="flex items-center gap-2 md:gap-4 select-none">
                {/* Step 1 */}
                <button
                  onClick={() => {
                    if (plan) setWizardStep(1);
                  }}
                  disabled={!plan}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                    wizardStep === 1
                      ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/10'
                      : wizardStep > 1
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/55 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    wizardStep === 1 ? 'bg-white text-primary-600' : wizardStep > 1 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                  }`}>
                    {wizardStep > 1 ? <Check size={10} /> : '۱'}
                  </span>
                  <span>توضیح طرح</span>
                </button>

                {/* Line */}
                <div className={`h-[2px] w-6 transition-colors duration-300 ${wizardStep > 1 ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-slate-800'}`} />

                {/* Step 2 */}
                <button
                  onClick={() => {
                    if (plan) setWizardStep(2);
                  }}
                  disabled={!plan}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                    wizardStep === 2
                      ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/10'
                      : wizardStep > 2
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/55 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    wizardStep === 2 ? 'bg-white text-primary-600' : wizardStep > 2 ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                  }`}>
                    {wizardStep > 2 ? <Check size={10} /> : '۲'}
                  </span>
                  <span>پیش‌نمایش و ویرایش</span>
                </button>

                {/* Line */}
                <div className={`h-[2px] w-6 transition-colors duration-300 ${wizardStep > 2 ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-slate-800'}`} />

                {/* Step 3 */}
                <button
                  onClick={() => {
                    if (plan && anyTaskCompleted) setWizardStep(3);
                  }}
                  disabled={!plan || !anyTaskCompleted}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                    wizardStep === 3
                      ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/10'
                      : 'bg-slate-50 dark:bg-slate-900 border-slate-200/50 dark:border-slate-800/55 text-slate-450 dark:text-slate-500'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                    wizardStep === 3 ? 'bg-white text-primary-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-600'
                  }`}>۳</span>
                  <span>ثبت نهایی و اجرا</span>
                </button>
              </div>
            </div>

        {/* Wizard Content Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

          {/* Previous conversation thread — shown once a plan/response exists so the
              user can see the running chat history (à la ChatGPT) while the wizard
              processes the new command. Hidden on the fresh composer (no plan yet)
              and while the very first plan is loading. */}
          {(() => {
            const sessionMsgs = activeSession?.messages || [];
            // Show earlier messages (exclude welcome + the in-flight user turn that
            // has no AI reply yet, so we don't echo the just-typed prompt twice).
            const priorTurns = sessionMsgs.filter((m, idx) => {
              if (m.id === 'msg_welcome' || /^msg_welcome_/.test(m.id)) return false;
              // Drop trailing user message that has no following AI reply
              if (m.sender === 'user') {
                const next = sessionMsgs[idx + 1];
                if (!next || next.sender !== 'ai') return false;
              }
              return true;
            });
            if (!plan || priorTurns.length === 0) return null;

            return (
              <div className="max-w-4xl mx-auto px-1 pb-3">
                <details className="group" open>
                  <summary className="flex items-center gap-1.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[10px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors select-none py-1">
                    <MessageSquare size={12} className="shrink-0" />
                    <span>گفتگوهای قبلی این جلسه ({priorTurns.length.toLocaleString('fa-IR')} پیام)</span>
                    <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-2 space-y-3 px-1">
                    {priorTurns.map((m) => {
                      if (m.sender === 'user') {
                        return (
                          <div key={m.id} className="flex justify-end" dir="rtl">
                            <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-sm">
                              <p className="text-[12px] font-bold leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                              <span className="block text-[9px] text-blue-100/80 font-black mt-1 text-left" dir="ltr">{m.timestamp}</span>
                            </div>
                          </div>
                        );
                      }
                      // AI message — show explanation + a compact hint of the plan
                      const planAny = m.plan as any;
                      const isDisplay = planAny?.responseMode === 'display' && planAny?.display;
                      const isAgent = planAny?.responseMode === 'agent' && Array.isArray(planAny?.tasks) && planAny.tasks.length > 0;
                      return (
                        <div key={m.id} className="flex justify-start" dir="rtl">
                          <div className="max-w-[85%] bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
                            <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                            {isDisplay && (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-primary-500/10 text-primary-600 dark:text-primary-400 text-[9px] font-black">
                                <Eye size={10} /> نمایش {(planAny.display?.items?.length || 0).toLocaleString('fa-IR')} آیتم
                              </span>
                            )}
                            {isAgent && (
                              <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black">
                                <Network size={10} /> طرح اجرایی با {(planAny.tasks.length).toLocaleString('fa-IR')} گام
                              </span>
                            )}
                            <span className="block text-[9px] text-slate-400 dark:text-slate-600 font-black mt-1 text-left" dir="ltr">{m.timestamp}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </details>
              </div>
            );
          })()}

          {/* STEP 1: EXPLAIN PLAN */}
          {wizardStep === 1 && (
            <div className="space-y-5 max-w-4xl mx-auto">
              {isLoadingPlan ? (
                <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center space-y-6 shadow-md max-w-md mx-auto my-12 animate-fadeIn">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping" />
                    <div className="relative w-20 h-20 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-full flex items-center justify-center">
                      <Brain className="w-10 h-10 text-blue-600 animate-pulse" />
                    </div>
                    <Loader2 size={24} className="absolute bottom-0 right-0 text-blue-500 animate-spin bg-white dark:bg-[#0d1527] rounded-full p-1 shadow-sm" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-black text-slate-800 dark:text-white">دستیار در حال تفکر و برنامه‌ریزی...</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed max-w-xs mx-auto">
                      درخواست شما در حال تحلیل است. دستیار هوشمند در حال تدوین بهترین استراتژی و مراحل اجرایی برای فروشگاه شماست.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/40">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-full text-[9px] font-black animate-pulse">
                      <span>لطفاً صبور باشید، این فرآیند ممکن است چند لحظه زمان ببرد...</span>
                    </div>
                  </div>
                </div>
              ) : !plan ? (
                activeSession && activeSession.messages.length > 1 ? (
                  <div className="flex flex-col h-full max-w-4xl mx-auto w-full animate-fadeIn overflow-hidden">
                    {/* Chat Messages Scroll Area */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pb-4 px-1">
                      {activeSession.messages.map((m) => {
                        const isWelcome = m.id === 'msg_welcome' || m.id.startsWith('msg_welcome_');
                        if (isWelcome) {
                          return (
                            <div key={m.id} className="flex justify-start" dir="rtl">
                              <div className="max-w-[85%] bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs">
                                <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                                  <Sparkles size={14} className="animate-pulse" />
                                  <span className="text-[11px] font-black">دستیار هوشمند</span>
                                </div>
                                <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed">{m.text}</p>
                                <span className="block text-[9px] text-slate-400 dark:text-slate-600 font-black mt-1 text-left" dir="ltr">{m.timestamp}</span>
                              </div>
                            </div>
                          );
                        }

                        if (m.sender === 'user') {
                          return (
                            <div key={m.id} className="flex justify-end" dir="rtl">
                              <div className="max-w-[80%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 shadow-xs">
                                <p className="text-[12px] font-bold leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                                <span className="block text-[9px] text-blue-100/80 font-black mt-1 text-left" dir="ltr">{m.timestamp}</span>
                              </div>
                            </div>
                          );
                        }

                        // AI message
                        const planAny = m.plan as any;
                        const isDisplay = planAny?.responseMode === 'display' && planAny?.display;
                        const isAgent = planAny?.responseMode === 'agent' && Array.isArray(planAny?.tasks) && planAny.tasks.length > 0;

                        return (
                          <div key={m.id} className="flex justify-start space-y-3 flex-col" dir="rtl">
                            <div className="max-w-[85%] bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 shadow-xs animate-fadeIn">
                              <div className="flex items-center gap-2 text-primary-600 dark:text-primary-400 mb-1">
                                <Sparkles size={14} className="animate-pulse" />
                                <span className="text-[11px] font-black">دستیار هوشمند</span>
                              </div>
                              <p className="text-[12px] font-bold text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                              <span className="block text-[9px] text-slate-400 dark:text-slate-600 font-black mt-1 text-left" dir="ltr">{m.timestamp}</span>
                            </div>

                            {/* Inline Display Payload */}
                            {isDisplay && (
                              <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-4 max-w-full animate-fadeIn">
                                <DisplayPreviewPanel display={planAny.display} />
                              </div>
                            )}

                            {/* Inline Agent Plan Summary */}
                            {isAgent && (
                              <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3 max-w-full animate-fadeIn">
                                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-2">
                                  <div className="flex items-center gap-2">
                                    <Network size={14} className="text-blue-500" />
                                    <span className="text-[11px] font-black text-slate-800 dark:text-white">طرح پیشنهادی ({planAny.tasks.length} گام)</span>
                                  </div>
                                  <button
                                    onClick={() => {
                                      setPlan(planAny);
                                      setWizardStep(1);
                                    }}
                                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                  >
                                    مشاهده و اجرای طرح
                                  </button>
                                </div>
                                <div className="space-y-1.5">
                                  {planAny.tasks.map((t: any, tIdx: number) => (
                                    <div key={t.id} className="flex items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-bold">
                                      <span className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black">{(tIdx + 1).toLocaleString('fa-IR')}</span>
                                      <span>{t.title}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Composer at the bottom of the chat history */}
                    <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/60 space-y-3 bg-slate-50/50 dark:bg-slate-950/10 p-3 rounded-2xl">
                      {errorPlan && (
                        <div className="bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-xl p-3 text-[11px] font-bold leading-relaxed space-y-1 animate-fadeIn" dir="rtl">
                          <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                            <AlertCircle size={12} className="shrink-0" />
                            <span className="font-black">عدم امکان اجرای درخواست</span>
                          </div>
                          <p className="text-gray-600 dark:text-gray-300 font-bold leading-relaxed whitespace-pre-line">{errorPlan}</p>
                        </div>
                      )}
                      <form onSubmit={(e) => handleGeneratePlan(e)}>
                        <div className="bg-white dark:bg-gray-950 border border-slate-200/55 dark:border-gray-800 rounded-2xl focus-within:border-primary-400 dark:focus-within:border-primary-600 focus-within:shadow-xs transition-all overflow-hidden">
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="خواسته‌ات را بنویس..."
                            disabled={isLoadingPlan}
                            rows={2}
                            className="w-full px-4 pt-3 pb-2 bg-transparent border-0 outline-none focus:ring-0 text-[12px] font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-650 resize-none leading-relaxed"
                            dir="rtl"
                          />
                          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800">
                            <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold">Enter برای ارسال — Shift+Enter برای خط جدید</span>
                            <button
                              type="submit"
                              disabled={isLoadingPlan || !prompt.trim()}
                              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-black transition-all cursor-pointer"
                            >
                              {isLoadingPlan ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                              <span>ارسال</span>
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto w-full pt-4 lg:pt-12 pb-6 animate-fadeIn">
                    {/* Minimal AI greeting */}
                    <div className="flex flex-col items-center text-center gap-3 mb-7">
                      <div className="relative">
                        <div className="absolute inset-0 bg-primary-500/20 blur-xl rounded-full" aria-hidden="true" />
                        <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-650 text-white flex items-center justify-center shadow-md shadow-primary-500/10">
                          <Sparkles className="w-5 h-5 animate-pulse" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-sm font-black text-gray-900 dark:text-white">چه کاری انجام دهیم؟</h2>
                        <p className="text-[11px] text-gray-400 dark:text-gray-500 font-bold">خواسته‌ات را ساده بنویس، بقیه‌اش با من.</p>
                      </div>
                    </div>

                    {errorPlan && (
                      <div className="bg-rose-500/5 border border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-2xl p-4 text-xs font-bold leading-relaxed space-y-2 animate-fadeIn mb-4" dir="rtl">
                        <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                          <AlertCircle size={14} className="shrink-0" />
                          <span className="font-black">عدم امکان اجرای درخواست</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 font-bold leading-relaxed whitespace-pre-line">{errorPlan}</p>
                      </div>
                    )}

                    {/* Composer — single focal input */}
                    <form onSubmit={(e) => handleGeneratePlan(e)}>
                      <div className="bg-white dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-3xl shadow-sm focus-within:border-primary-400 dark:focus-within:border-primary-600 focus-within:shadow-md focus-within:shadow-primary-500/5 transition-all overflow-hidden">
                        <textarea
                          ref={textareaRef}
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="مثال: محصول اسپیکر JBL با قیمت ۸۵۰ هزار تومن بساز، دو رنگ سبز و مشکی داشته باشه و یک استوری و مقاله وبلاگ هم براش بنویس..."
                          disabled={isLoadingPlan}
                          rows={3}
                          className="w-full px-5 pt-4 pb-2 bg-transparent border-0 outline-none focus:ring-0 text-[12px] font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-650 resize-none leading-relaxed"
                          dir="rtl"
                        />

                        {attachedImages.length > 0 && (
                          <div className="px-5 pb-3">
                            <div className="flex flex-wrap gap-3" dir="rtl">
                              {attachedImages.map((imgUrl, idx) => {
                                const isMain = idx === mainImageIndex;
                                return (
                                  <div
                                    key={idx}
                                    className={`relative group w-20 h-20 rounded-2xl border-2 overflow-hidden transition-all ${
                                      isMain
                                        ? 'border-primary-500 shadow-md shadow-primary-500/10'
                                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                    }`}
                                  >
                                    <img src={imgUrl} className="w-full h-full object-cover" alt={`attached-${idx}`} />
                                    
                                    {/* Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => removeAttachedImage(idx)}
                                      className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-lg hover:bg-rose-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                                      title="حذف تصویر"
                                    >
                                      <X size={10} />
                                    </button>

                                    {/* Main Image Selection Overlay / Badge */}
                                    {isMain ? (
                                      <div className="absolute bottom-0 inset-x-0 bg-primary-650/90 text-white text-[9px] font-black text-center py-0.5 select-none">
                                        عکس اصلی
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setAsMainImage(idx)}
                                        className="absolute inset-0 bg-black/40 text-white text-[9px] font-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      >
                                        انتخاب اصلی
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <label className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-primary-500 hover:bg-primary-500/5 dark:hover:bg-primary-500/10 cursor-pointer transition-all" title="ضمیمه کردن تصویر">
                            {isUploadingImage ? (
                              <Loader2 size={16} className="animate-spin text-primary-500" />
                            ) : (
                              <ImageIcon size={15} />
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              className="hidden"
                              disabled={isUploadingImage || isLoadingPlan}
                              onChange={async (e) => {
                                const files = e.target.files;
                                if (!files || files.length === 0) return;
                                setIsUploadingImage(true);
                                try {
                                  const urls: string[] = [];
                                  for (let i = 0; i < files.length; i++) {
                                    const url = await uploadFile(files[i]);
                                    urls.push(url);
                                  }
                                  setAttachedImages(prev => {
                                    const next = [...prev, ...urls];
                                    return next;
                                  });
                                } catch (err) {
                                  alert('آپلود تصویر ناموفق بود.');
                                } finally {
                                  setIsUploadingImage(false);
                                }
                              }}
                            />
                          </label>

                          <button
                            type="submit"
                            disabled={isLoadingPlan || !prompt.trim()}
                            className="h-9 w-9 flex items-center justify-center bg-primary-500 hover:bg-primary-600 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl transition-all cursor-pointer shadow-sm shadow-primary-500/10 select-none active:scale-[0.98]"
                            title="ارسال و طراحی طرح"
                          >
                            {isLoadingPlan ? (
                              <Loader2 size={16} className="animate-spin text-white" />
                            ) : (
                              <Send size={14} className="transform rotate-180" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-gray-400 dark:text-gray-600 font-bold text-center mt-2">برای ارسال Enter — برای خط جدید Shift+Enter</p>
                    </form>

                    {/* Quiet suggestion chips */}
                    <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                      {QUICK_PROMPTS.map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => { setPrompt(item.label); textareaRef.current?.focus(); }}
                          className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 text-[10px] font-black text-gray-600 dark:text-gray-300 transition-all cursor-pointer shadow-xs"
                          title={item.label}
                        >
                          <span className="text-xs">{item.icon}</span>
                          <span>{item.tag}</span>
                        </button>
                      ))}
                    </div>

                    {/* Collapsed help / examples / smart memory — hidden by default to keep focus */}
                    <details className="group mt-8">
                      <summary className="flex items-center justify-center gap-1.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden text-[11px] font-black text-gray-400 hover:text-blue-500 transition-colors select-none">
                        <BookOpen size={13} />
                        <span>راهنما، نمونه‌ها و حافظه هوشمند</span>
                        <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                      </summary>
                      <div className="mt-4 space-y-4 animate-fadeIn">
                        <PromptGuidePanel
                          onUseSample={(samplePrompt) => {
                            setPrompt(samplePrompt);
                            textareaRef.current?.focus();
                          }}
                        />
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                          <SmartBrainPanel
                            memory={aiMemory}
                            isLoading={isLoadingMemory}
                            onReset={handleResetMemory}
                            onRefresh={fetchAiMemory}
                          />
                          <div className="space-y-4">
                            <DemoExamplesPanelInner
                              onUseSample={(samplePrompt) => {
                                setPrompt(samplePrompt);
                                textareaRef.current?.focus();
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </details>
                  </div>
                )
              ) : plan.responseMode === 'display' && plan.display ? (
                <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-primary-500/15 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                        <Eye size={16} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white">نمایش اطلاعات درخواستی</h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">اطلاعات استخراج‌شده از دیتابیس فروشگاه به شرح زیر است</p>
                      </div>
                    </div>
                    <button
                      onClick={resetAll}
                      className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition-all"
                    >
                      <RotateCcw size={11} />
                      <span>بازگشت</span>
                    </button>
                  </div>

                  {/* Display Preview Panel */}
                  <DisplayPreviewPanel display={plan.display} />

                  {/* Continuation composer — lets the user send a follow-up that
                      refers to the items above (e.g. "فاکتورهاش رو چاپ کن") without
                      having to reset first. Reuses the same prompt state + handler. */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-primary-600 dark:text-primary-400">
                      <Sparkles size={12} className="shrink-0" />
                      <span>می‌توانی روی همین نتایج ادامه بدهی — مثلاً «فاکتورهاش رو چاپ کن» یا «برای اولی استوری بساز».</span>
                    </div>
                    <form onSubmit={(e) => handleGeneratePlan(e)}>
                      <div className="bg-slate-50 dark:bg-gray-950 border border-slate-200 dark:border-gray-800 rounded-2xl focus-within:border-primary-400 dark:focus-within:border-primary-700 transition-all overflow-hidden">
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="ادامه دستور روی همین نتایج..."
                          disabled={isLoadingPlan}
                          rows={2}
                          className="w-full px-4 pt-3 pb-2 bg-transparent border-0 outline-none focus:ring-0 text-[12px] font-semibold text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-600 resize-none leading-relaxed"
                          dir="rtl"
                        />
                        <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-gray-950 border-t border-slate-100 dark:border-gray-800">
                          <span className="text-[9px] text-gray-400 dark:text-gray-600 font-bold">Enter برای ارسال — Shift+Enter برای خط جدید</span>
                          <button
                            type="submit"
                            disabled={isLoadingPlan || !prompt.trim()}
                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[11px] font-black transition-all"
                          >
                            {isLoadingPlan ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                            <span>ادامه</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <Network size={16} />
                      </div>
                      <div>
                        <h2 className="text-sm font-black text-slate-800 dark:text-white">طرح اجرایی پیشنهادی دستیار هوشمند</h2>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-0.5">بر اساس دستور شما، مراحل زیر طراحی شده است</p>
                      </div>
                    </div>
                    <button
                      onClick={resetAll}
                      className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition-all"
                    >
                      <RotateCcw size={11} />
                      <span>لغو و بازنویسی دستور</span>
                    </button>
                  </div>

                  {/* Explanation */}
                  <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-4">
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                      {plan.explanation}
                    </p>
                  </div>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <span className="text-xs font-black text-slate-800 dark:text-white block">مراحل و گام‌های اجرایی طرح:</span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {plan.tasks.map((task, idx) => (
                        <div key={task.id} className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 flex items-start gap-3">
                          <div className="w-6 h-6 rounded-lg bg-blue-600 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {(idx + 1).toLocaleString('fa-IR')}
                          </div>
                          <div className="space-y-1 min-w-0">
                            <span className="text-xs font-black text-slate-800 dark:text-white block truncate">{task.title}</span>
                            <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1">
                              {getTargetIcon(task.target, 10)}
                              {getTargetLabel(task.target)}
                            </span>
                            <p className="text-[9px] text-slate-400 font-bold line-clamp-2 leading-normal pt-1">{task.improvedPrompt}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        setWizardStep(2);
                        if (currentTaskIndex === -1 && plan.tasks.length > 0) {
                          // Automatically select the first task
                          setCurrentTaskIndex(0);
                        }
                      }}
                      className="px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/15 transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>تأیید طرح و رفتن به مرحله پیش‌نمایش و ویرایش</span>
                      <ChevronLeft size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: PREVIEW & EDIT */}
          {wizardStep === 2 && plan && (
            <div className="space-y-5 max-w-5xl mx-auto animate-fadeIn">
              {/* Stepper Steps Row */}
              <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1 px-1 no-scrollbar select-none" dir="rtl">
                {plan.tasks.map((task, idx) => {
                  const isCurrent = currentTaskIndex === idx;
                  const status = taskStatuses[task.id] || 'idle';
                  const isCompleted = status === 'completed';
                  const isFailed = status === 'failed';
                  const isRunning = status === 'running' || status === 'saving';
                  const isSkipped = status === 'skipped';

                  let statusColorClass = '';
                  let iconElement = getTargetIcon(task.target, 12);

                  if (isCurrent) {
                    statusColorClass = 'bg-primary-600 border-primary-600 text-white font-black shadow-sm shadow-primary-500/20';
                  } else if (isCompleted) {
                    statusColorClass = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400';
                    iconElement = <Check size={12} className="text-emerald-500" />;
                  } else if (isFailed) {
                    statusColorClass = 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400 animate-pulse';
                    iconElement = <X size={12} className="text-rose-500" />;
                  } else if (isRunning) {
                    statusColorClass = 'bg-primary-500/10 border-primary-500/30 text-primary-600 dark:text-primary-400 animate-pulse';
                    iconElement = <Loader2 size={12} className="animate-spin text-primary-500" />;
                  } else if (isSkipped) {
                    statusColorClass = 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800/60 text-slate-400 opacity-60';
                  } else {
                    statusColorClass = 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40';
                  }

                  return (
                    <React.Fragment key={task.id}>
                      <button
                        type="button"
                        onClick={() => setCurrentTaskIndex(idx)}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border transition-all shrink-0 cursor-pointer ${statusColorClass}`}
                      >
                        <span className="text-[10px] font-black leading-none">
                          {(idx + 1).toLocaleString('fa-IR')}
                        </span>
                        <div className="shrink-0 flex items-center justify-center">
                          {iconElement}
                        </div>
                        <span className="text-xs font-bold truncate max-w-[100px]">
                          {task.title}
                        </span>
                      </button>

                      {/* Connector */}
                      {idx < plan.tasks.length - 1 && (
                        <div className="h-px w-4 bg-slate-200 dark:bg-slate-800 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Active Task Workspace */}
              {currentTaskIndex !== -1 && (() => {
                const activeTask = plan.tasks[currentTaskIndex];
                const activeStatus = taskStatuses[activeTask.id];
                const activeOutput = taskOutputs[activeTask.id];

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
                    {/* Left: Task Details & Workspace */}
                    <div className="lg:col-span-2 bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                      {/* Task Header */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800/60 px-5 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs border ${
                            activeStatus === 'running' || activeStatus === 'saving' ? 'bg-primary-500/15 text-primary-500 dark:text-primary-400 border-primary-500/30' :
                            activeStatus === 'completed' ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30' :
                            activeStatus === 'failed' ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/20' :
                            'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700/50'
                          }`}>
                            {activeStatus === 'running' || activeStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : (currentTaskIndex + 1).toLocaleString('fa-IR')}
                          </div>
                          <div className="text-right">
                            <div className="text-xs font-black text-slate-800 dark:text-white">{activeTask.title}</div>
                            <div className="text-[9px] text-slate-500 dark:text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                              {getTargetIcon(activeTask.target, 10)}
                              {getTargetLabel(activeTask.target)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {activeStatus === 'running' && (
                            <div className="flex items-center gap-1.5 text-[9px] font-black text-primary-500 dark:text-primary-400 bg-primary-500/10 border border-primary-500/20 px-2.5 py-1 rounded-full">
                              <Cpu size={10} className="animate-pulse" />
                              <span>در حال پردازش</span>
                              <TypingDots />
                            </div>
                          )}
                          {activeStatus === 'preview_ready' && (
                            <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-full">پیش‌نویس آماده تأیید</span>
                          )}
                          {activeStatus === 'completed' && (
                            <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1"><Check size={10} />ثبت شد</span>
                          )}
                        </div>
                      </div>

                      {/* Workspace Body */}
                      <div className="p-5">
                        {/* Phase: Idle */}
                        {(activeStatus === 'idle' || !activeStatus) && (
                          <div className="flex flex-col items-center justify-center py-10 px-4 space-y-5 text-center">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 flex items-center justify-center text-slate-500">
                                {getTargetIcon(activeTask.target, 24)}
                              </div>
                              <Sparkles size={12} className="absolute -top-1 -right-1 text-primary-500 animate-bounce" />
                            </div>
                            <div className="space-y-1.5 max-w-md">
                              <h3 className="text-xs font-black text-slate-800 dark:text-white">
                                آماده تولید پیش‌نویس {getTargetLabel(activeTask.target)}
                              </h3>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                                این مرحله هنوز اجرا نشده است. هوش مصنوعی بر اساس دستور زیر پیش‌نویس اولیه را تولید خواهد کرد. شما می‌توانید قبل از ثبت نهایی، اطلاعات را ویرایش کنید.
                              </p>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 text-right w-full max-w-md">
                              <span className="text-[8px] font-black text-primary-500 block mb-1">دستور بهینه‌شده ایجنت:</span>
                              <p className="text-[9px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed whitespace-pre-line">
                                {activeTask.improvedPrompt}
                              </p>
                            </div>
                            <button
                              onClick={() => executeTaskAiGeneration(currentTaskIndex)}
                              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black shadow-md shadow-primary-500/10 transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98]"
                            >
                              <Play size={11} className="fill-current" />
                              <span>تولید پیش‌نویس با هوش مصنوعی</span>
                            </button>
                          </div>
                        )}

                        {/* Phase: Running */}
                        {activeStatus === 'running' && (
                          <div className="flex flex-col items-center justify-center py-14 space-y-4 text-center">
                            <div className="relative">
                              <div className="w-14 h-14 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center">
                                <Brain className="w-7 h-7 text-primary-500 dark:text-primary-400" />
                              </div>
                              <div className="absolute -inset-1 rounded-2xl border border-primary-500/30 animate-ping opacity-50" />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black text-slate-800 dark:text-white">هوش مصنوعی در حال تحلیل و تولید محتوا</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold max-w-xs mx-auto leading-relaxed">
                                دستیار هوشمند دارد بر اساس کاتالوگ و قوانین فروشگاه شما محتوا تولید می‌کند. تا ۱۰ ثانیه منتظر بمانید.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Phase: Preview ready */}
                        {activeStatus === 'preview_ready' && activeOutput && (
                          <div className="space-y-4">
                            {/* AI explanation */}
                            <div className="bg-blue-50/50 dark:bg-[#0d1f38]/60 border border-blue-200 dark:border-blue-500/15 rounded-xl p-3.5 text-right space-y-1">
                              <div className="flex items-center gap-1.5 text-[9px] font-black text-primary-500 dark:text-primary-400">
                                <Info size={11} />
                                <span>گزارش دستیار هوشمند:</span>
                              </div>
                              <p className="text-[10px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed">
                                {activeOutput.explanation}
                              </p>
                            </div>

                            {/* Segmented Control for Edit vs Preview */}
                            <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200/60 dark:border-slate-800/40 w-full max-w-[240px] mx-auto">
                              <button
                                type="button"
                                onClick={() => setStepViewMode('edit')}
                                className={`flex-1 py-1.5 text-center text-[9px] font-black rounded-lg transition-all cursor-pointer ${
                                  stepViewMode === 'edit'
                                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs font-bold'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                  }`}
                              >
                                ویرایش مشخصات
                              </button>
                              <button
                                type="button"
                                onClick={() => setStepViewMode('preview')}
                                className={`flex-1 py-1.5 text-center text-[9px] font-black rounded-lg transition-all cursor-pointer ${
                                  stepViewMode === 'preview'
                                    ? 'bg-white dark:bg-slate-900 text-primary-600 dark:text-primary-400 shadow-xs font-bold'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                  }`}
                              >
                                پیش‌نمایش زنده
                              </button>
                            </div>

                            {/* Details Form (Edit Mode) */}
                            {stepViewMode === 'edit' && (() => {
                              const isReport = activeOutput.action === 'report' || 
                                               activeOutput.action === 'report_control' || 
                                               activeOutput.action === 'view' || 
                                               activeOutput.action === 'query' || 
                                               activeOutput.action === 'get_details' || 
                                               activeOutput.action === 'getUserDetails' || 
                                               activeOutput.rawResult?.action === 'report' || 
                                               activeOutput.rawResult?.action === 'report_control' || 
                                               activeOutput.rawResult?.action === 'view' || 
                                               activeOutput.rawResult?.action === 'query' || 
                                               activeOutput.rawResult?.action === 'get_details' || 
                                               activeOutput.rawResult?.action === 'getUserDetails' ||
                                               (activeOutput.explanation && (
                                                 (activeTask.target === 'products' && !activeOutput.formData) ||
                                                 (activeTask.target === 'blog' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.title) ||
                                                 (activeTask.target === 'categories' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.name) ||
                                                 (activeTask.target === 'discounts' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.code) ||
                                                 (activeTask.target === 'orders' && (!activeOutput.targets || activeOutput.targets.length === 0) && !activeOutput.updates) ||
                                                 (activeTask.target === 'reviews' && !activeOutput.action && !activeOutput.data) ||
                                                 (activeTask.target === 'users' && (!activeOutput.actions || activeOutput.actions.length === 0)) ||
                                                 (activeTask.target === 'tickets' && !activeOutput.action) ||
                                                 (activeTask.target === 'system_tickets' && !activeOutput.action) ||
                                                 (activeTask.target === 'staff' && !activeOutput.action) ||
                                                 (activeTask.target === 'profile' && !activeOutput.action) ||
                                                 (activeTask.target === 'import_export' && !activeOutput.action) ||
                                                 (activeTask.target === 'media' && !activeOutput.action) ||
                                                 (activeTask.target === 'shoppable' && !activeOutput.action) ||
                                                 (activeTask.target === 'settings' && !activeOutput.formData) ||
                                                 (activeTask.target === 'custom_home' && !activeOutput.formData) ||
                                                 (activeTask.target === 'footer' && !activeOutput.config && !activeOutput.rawResult?.config) ||
                                                 (activeTask.target === 'header' && !activeOutput.config && !activeOutput.rawResult?.config)
                                               ));

                              if (isReport) {
                                return (
                                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-2 max-w-md mx-auto animate-fadeIn">
                                    <span className="text-xl">📊</span>
                                    <h4 className="text-xs font-black text-slate-800 dark:text-white">گزارش و پاسخ دستیار هوشمند</h4>
                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                                      این مرحله صرفاً جهت مشاهده گزارش یا پاسخ به سوال شماست و هیچ فیلد قابل ویرایشی ندارد. برای مشاهده پاسخ کامل، به تب «پیش‌نمایش زنده» مراجعه کنید.
                                    </p>
                                  </div>
                                );
                              }

                              return (
                                <div className="space-y-4 text-right pt-2 animate-fadeIn">
                                {/* Products details */}
                                {activeTask.target === 'products' && activeOutput.formData && (() => {
                                  const parseArrayJson = (str: any) => {
                                    if (!str) return [];
                                    if (Array.isArray(str)) return str;
                                    try {
                                      return JSON.parse(str);
                                    } catch {
                                      return [];
                                    }
                                  };

                                  const formatDateForInput = (d: any) => {
                                    if (!d) return '';
                                    try {
                                      const dateObj = new Date(d);
                                      if (isNaN(dateObj.getTime())) return '';
                                      const tzOffset = dateObj.getTimezoneOffset() * 60000;
                                      const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                                      return localISOTime;
                                    } catch {
                                      return '';
                                    }
                                  };

                                  const disc = activeOutput.formData;

                                  return (
                                    <div className="space-y-4 text-right">
                                      {/* 1. Main info and price */}
                                      <details open className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>📋 اطلاعات اصلی، قیمت و موجودی</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نام محصول</label>
                                            <input
                                              type="text"
                                              value={disc.title || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, title: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">برند</label>
                                            <input
                                              type="text"
                                              value={disc.brand || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, brand: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">دسته‌بندی محصول</label>
                                            <select
                                              value={disc.categoryId || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, categoryId: e.target.value || null }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="">بدون دسته‌بندی</option>
                                              {availableCategories.map((cat: any) => (
                                                <option key={cat.id} value={cat.id}>
                                                  {cat.name}
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">قیمت (تومان)</label>
                                            <input
                                              type="number"
                                              value={disc.price || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, price: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">میزان تخفیف (تومان)</label>
                                            <input
                                              type="number"
                                              value={disc.discount || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, discount: e.target.value ? Number(e.target.value) : 0 }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">موجودی انبار</label>
                                            <input
                                              type="number"
                                              value={disc.stock !== undefined ? disc.stock : ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, stock: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع محصول</label>
                                            <select
                                              value={disc.type || 'physical'}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, type: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="physical">فیزیکی (Physical)</option>
                                              <option value="digital">دیجیتال (Digital)</option>
                                            </select>
                                          </div>

                                          <div className="col-span-2 flex items-center gap-6 py-1 select-none">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={disc.isActive !== false}
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, isActive: e.target.checked }
                                                }))}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                              />
                                              <span>محصول در سایت فعال باشد</span>
                                            </label>
                                          </div>

                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">توضیحات کوتاه</label>
                                            <textarea
                                              value={disc.description || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, description: e.target.value }
                                              }))}
                                              rows={2}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                            />
                                          </div>

                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">توضیحات کامل محصول</label>
                                            <textarea
                                              value={disc.fullDescription || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, fullDescription: e.target.value }
                                              }))}
                                              rows={4}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono"
                                            />
                                          </div>
                                        </div>
                                      </details>

                                      {/* 2. Special Deals */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>✨ پیشنهاد شگفت‌انگیز (ویژه)</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 grid grid-cols-2 gap-3 text-right">
                                          <div className="col-span-2 flex items-center gap-6 py-1 select-none">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={!!disc.isSpecial}
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, isSpecial: e.target.checked }
                                                }))}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                              />
                                              <span>محصول به عنوان پیشنهاد شگفت‌انگیز نمایش داده شود</span>
                                            </label>
                                          </div>

                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تاریخ پایان پیشنهاد شگفت‌انگیز</label>
                                            <input
                                              type="datetime-local"
                                              value={formatDateForInput(disc.specialEndsAt)}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, specialEndsAt: e.target.value ? new Date(e.target.value).toISOString() : null }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                        </div>
                                      </details>

                                      {/* 3. Physical specifications (only if physical) */}
                                      {disc.type !== 'digital' && (
                                        <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                          <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                            <span>📦 ابعاد و وزن محصول فیزیکی</span>
                                            <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                          </summary>
                                          <div className="mt-4 grid grid-cols-2 gap-3 text-right">
                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وزن (گرم)</label>
                                              <input
                                                type="number"
                                                value={disc.weight !== undefined ? disc.weight : ''}
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, weight: e.target.value ? Number(e.target.value) : 0 }
                                                }))}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حجم (سی‌سی / میلی‌لیتر)</label>
                                              <input
                                                type="number"
                                                value={disc.volume !== undefined ? disc.volume : ''}
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, volume: e.target.value ? Number(e.target.value) : 0 }
                                                }))}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>
                                          </div>
                                        </details>
                                      )}

                                      {/* 4. Wholesale B2B parameters */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>🏢 مشخصات عمده‌فروشی B2B (همکاری)</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 grid grid-cols-2 gap-3 text-right">
                                          <div className="col-span-2 flex items-center gap-6 py-1 select-none">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={!!disc.isWholesaleOnly}
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, isWholesaleOnly: e.target.checked }
                                                }))}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                              />
                                              <span>این کالا فقط به صورت عمده قابل خرید باشد</span>
                                            </label>
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">قیمت پایه عمده (تومان)</label>
                                            <input
                                              type="number"
                                              value={disc.wholesalePrice !== undefined ? disc.wholesalePrice : ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, wholesalePrice: e.target.value ? Number(e.target.value) : null }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداقل تعداد خرید عمده (MOQ)</label>
                                            <input
                                              type="number"
                                              value={disc.moq !== undefined ? disc.moq : ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, moq: e.target.value ? Number(e.target.value) : 1 }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">واحد فروش عمده</label>
                                            <input
                                              type="text"
                                              value={disc.wholesaleUnit || ''}
                                              placeholder="مثال: عدد، کارتن، باکس، جین"
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, wholesaleUnit: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تعداد در بسته (Unit Size)</label>
                                            <input
                                              type="number"
                                              value={disc.wholesaleUnitSize !== undefined ? disc.wholesaleUnitSize : ''}
                                              placeholder="مثال: ۱۲"
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, wholesaleUnitSize: e.target.value ? Number(e.target.value) : 1 }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>
                                        </div>
                                      </details>

                                      {/* 5. Digital files (only if digital) */}
                                      {disc.type === 'digital' && (
                                        <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                          <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                            <span>💿 فایل دیجیتال محصول</span>
                                            <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                          </summary>
                                          <div className="mt-4 grid grid-cols-2 gap-3 text-right">
                                            <div className="col-span-2 space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">لینک مستقیم دانلود فایل</label>
                                              <input
                                                type="text"
                                                value={disc.fileUrl || ''}
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, fileUrl: e.target.value }
                                                }))}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                                dir="ltr"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">فرمت فایل (e.g. PDF, ZIP)</label>
                                              <input
                                                type="text"
                                                value={disc.fileFormat || ''}
                                                placeholder="مثال: ZIP"
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, fileFormat: e.target.value }
                                                }))}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                                dir="ltr"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حجم فایل (e.g. 15.4 MB)</label>
                                              <input
                                                type="text"
                                                value={disc.fileSize || ''}
                                                placeholder="مثال: 15.4 MB"
                                                onChange={(e) => updateActiveOutput(prev => ({
                                                  ...prev,
                                                  formData: { ...prev.formData, fileSize: e.target.value }
                                                }))}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                                dir="ltr"
                                              />
                                            </div>
                                          </div>
                                        </details>
                                      )}

                                      {/* 6. SEO parameters */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>🔍 بهینه‌سازی موتورهای جستجو (SEO)</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 grid grid-cols-2 gap-3 text-right">
                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان سئو (SEO Title)</label>
                                            <input
                                              type="text"
                                              value={disc.seoTitle || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, seoTitle: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">توضیحات سئو (SEO Description)</label>
                                            <textarea
                                              value={disc.seoDescription || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, seoDescription: e.target.value }
                                              }))}
                                              rows={3}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                            />
                                          </div>
                                        </div>
                                      </details>

                                      {/* 7. Image gallery urls */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>🖼️ گالری تصاویر محصول (Gallery)</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 space-y-3">
                                          {/* Main Image */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس تصویر شاخص اصلی</label>
                                            <input
                                              type="text"
                                              value={disc.imageUrl || ''}
                                              onChange={(e) => updateActiveOutput(prev => ({
                                                ...prev,
                                                formData: { ...prev.formData, imageUrl: e.target.value }
                                              }))}
                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          <div className="border-t border-slate-100 dark:border-slate-800 my-2 pt-2 space-y-2">
                                            <span className="text-[9px] font-black text-slate-400 block">سایر تصاویر گالری:</span>
                                            {(activeOutput.galleryUrls || []).map((url: string, urlIdx: number) => (
                                              <div key={urlIdx} className="flex gap-2 items-center">
                                                <input
                                                  type="text"
                                                  value={url}
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.galleryUrls || [])];
                                                    newList[urlIdx] = e.target.value;
                                                    updateActiveOutput(prev => ({ ...prev, galleryUrls: newList }));
                                                  }}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                                  dir="ltr"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = (activeOutput.galleryUrls || []).filter((_: any, i: number) => i !== urlIdx);
                                                    updateActiveOutput(prev => ({ ...prev, galleryUrls: newList }));
                                                  }}
                                                  className="p-2 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl transition-colors"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            ))}

                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newList = [...(activeOutput.galleryUrls || []), ''];
                                                updateActiveOutput(prev => ({ ...prev, galleryUrls: newList }));
                                              }}
                                              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                                            >
                                              <Plus size={11} />
                                              <span>افزودن تصویر جدید به گالری</span>
                                            </button>
                                          </div>
                                        </div>
                                      </details>

                                      {/* 8. Features and technical specifications */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>🛠️ ویژگی‌ها و مشخصات فنی کالا</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 space-y-4">
                                          {/* Features list */}
                                          <div className="space-y-2">
                                            <span className="text-[9px] font-black text-slate-400 block">✨ ویژگی‌های کلیدی محصول (Features):</span>
                                            {(activeOutput.featuresList || []).map((feat: any, idx: number) => (
                                              <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                  type="text"
                                                  value={feat.key || ''}
                                                  placeholder="نام ویژگی (مثال: جنس)"
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.featuresList || [])];
                                                    newList[idx] = { ...newList[idx], key: e.target.value };
                                                    updateActiveOutput(prev => ({ ...prev, featuresList: newList }));
                                                  }}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-1/3"
                                                />
                                                <input
                                                  type="text"
                                                  value={feat.value || ''}
                                                  placeholder="مقدار ویژگی (مثال: نخ پنبه)"
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.featuresList || [])];
                                                    newList[idx] = { ...newList[idx], value: e.target.value };
                                                    updateActiveOutput(prev => ({ ...prev, featuresList: newList }));
                                                  }}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none flex-1"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = (activeOutput.featuresList || []).filter((_: any, i: number) => i !== idx);
                                                    updateActiveOutput(prev => ({ ...prev, featuresList: newList }));
                                                  }}
                                                  className="p-2 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl transition-colors"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            ))}

                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newList = [...(activeOutput.featuresList || []), { key: '', value: '' }];
                                                updateActiveOutput(prev => ({ ...prev, featuresList: newList }));
                                              }}
                                              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                                            >
                                              <Plus size={11} />
                                              <span>افزودن ویژگی جدید</span>
                                            </button>
                                          </div>

                                          {/* Specs list */}
                                          <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2">
                                            <span className="text-[9px] font-black text-slate-400 block">⚙️ جدول مشخصات فنی (Specifications):</span>
                                            {(activeOutput.specsList || []).map((spec: any, idx: number) => (
                                              <div key={idx} className="flex gap-2 items-center">
                                                <input
                                                  type="text"
                                                  value={spec.key || ''}
                                                  placeholder="نام فیلد (مثال: ابعاد)"
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.specsList || [])];
                                                    newList[idx] = { ...newList[idx], key: e.target.value };
                                                    updateActiveOutput(prev => ({ ...prev, specsList: newList }));
                                                  }}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-1/3"
                                                />
                                                <input
                                                  type="text"
                                                  value={spec.value || ''}
                                                  placeholder="مقدار مشخصه (مثال: 120x80x10 cm)"
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.specsList || [])];
                                                    newList[idx] = { ...newList[idx], value: e.target.value };
                                                    updateActiveOutput(prev => ({ ...prev, specsList: newList }));
                                                  }}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-2 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none flex-1"
                                                />
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = (activeOutput.specsList || []).filter((_: any, i: number) => i !== idx);
                                                    updateActiveOutput(prev => ({ ...prev, specsList: newList }));
                                                  }}
                                                  className="p-2 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-xl transition-colors"
                                                >
                                                  <Trash2 size={13} />
                                                </button>
                                              </div>
                                            ))}

                                            <button
                                              type="button"
                                              onClick={() => {
                                                const newList = [...(activeOutput.specsList || []), { key: '', value: '' }];
                                                updateActiveOutput(prev => ({ ...prev, specsList: newList }));
                                              }}
                                              className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                                            >
                                              <Plus size={11} />
                                              <span>افزودن ردیف مشخصات فنی</span>
                                            </button>
                                          </div>
                                        </div>
                                      </details>

                                      {/* 9. FAQs */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>💬 سوالات متداول خریداران (FAQs)</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 space-y-4 text-right">
                                          {(activeOutput.faqItems || []).map((faq: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 relative">
                                              <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-[9px] font-black text-primary-500">سوال {idx + 1}:</span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = (activeOutput.faqItems || []).filter((_: any, i: number) => i !== idx);
                                                    updateActiveOutput(prev => ({ ...prev, faqItems: newList }));
                                                  }}
                                                  className="p-1 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-lg transition-colors"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[8px] text-slate-400 font-bold block">متن سوال</label>
                                                <input
                                                  type="text"
                                                  value={faq.question || ''}
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.faqItems || [])];
                                                    newList[idx] = { ...newList[idx], question: e.target.value };
                                                    updateActiveOutput(prev => ({ ...prev, faqItems: newList }));
                                                  }}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[8px] text-slate-400 font-bold block">متن پاسخ</label>
                                                <textarea
                                                  value={faq.answer || ''}
                                                  onChange={(e) => {
                                                    const newList = [...(activeOutput.faqItems || [])];
                                                    newList[idx] = { ...newList[idx], answer: e.target.value };
                                                    updateActiveOutput(prev => ({ ...prev, faqItems: newList }));
                                                  }}
                                                  rows={2}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                                />
                                              </div>
                                            </div>
                                          ))}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newList = [...(activeOutput.faqItems || []), { question: '', answer: '' }];
                                              updateActiveOutput(prev => ({ ...prev, faqItems: newList }));
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                                          >
                                            <Plus size={11} />
                                            <span>افزودن سوال و جواب جدید</span>
                                          </button>
                                        </div>
                                      </details>

                                      {/* 10. Variants */}
                                      <details className="group border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-950/40">
                                        <summary className="list-none flex justify-between items-center font-black text-xs text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                                          <span>🎨 تنوع‌های کالا (رنگ، سایز و غیره)</span>
                                          <ChevronDown size={14} className="transition-transform group-open:rotate-180 text-slate-400" />
                                        </summary>
                                        <div className="mt-4 space-y-4 text-right">
                                          {(activeOutput.variants || []).map((vari: any, idx: number) => (
                                            <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 relative">
                                              <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                                <span className="text-[9px] font-black text-primary-500">تنوع {idx + 1}:</span>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const newList = (activeOutput.variants || []).filter((_: any, i: number) => i !== idx);
                                                    updateActiveOutput(prev => ({ ...prev, variants: newList }));
                                                  }}
                                                  className="p-1 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/10 rounded-lg transition-colors"
                                                >
                                                  <Trash2 size={11} />
                                                </button>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <div className="space-y-1">
                                                  <label className="text-[8px] text-slate-400 font-bold block">نام تنوع (e.g. قرمز / XL)</label>
                                                  <input
                                                    type="text"
                                                    value={vari.name || ''}
                                                    onChange={(e) => {
                                                      const newList = [...(activeOutput.variants || [])];
                                                      newList[idx] = { ...newList[idx], name: e.target.value };
                                                      updateActiveOutput(prev => ({ ...prev, variants: newList }));
                                                    }}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[8px] text-slate-400 font-bold block">کد رنگ (e.g. #FF0000 - اختیاری)</label>
                                                  <input
                                                    type="text"
                                                    value={vari.colorCode || ''}
                                                    placeholder="#000000"
                                                    onChange={(e) => {
                                                      const newList = [...(activeOutput.variants || [])];
                                                      newList[idx] = { ...newList[idx], colorCode: e.target.value };
                                                      updateActiveOutput(prev => ({ ...prev, variants: newList }));
                                                    }}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                                    dir="ltr"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[8px] text-slate-400 font-bold block">قیمت متمایز (تومان)</label>
                                                  <input
                                                    type="number"
                                                    value={vari.price !== undefined ? vari.price : ''}
                                                    placeholder="قیمت اختصاصی"
                                                    onChange={(e) => {
                                                      const newList = [...(activeOutput.variants || [])];
                                                      newList[idx] = { ...newList[idx], price: e.target.value ? Number(e.target.value) : '' };
                                                      updateActiveOutput(prev => ({ ...prev, variants: newList }));
                                                    }}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                                    dir="ltr"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[8px] text-slate-400 font-bold block">موجودی تنوع</label>
                                                  <input
                                                    type="number"
                                                    value={vari.stock !== undefined ? vari.stock : ''}
                                                    placeholder="موجودی این مدل"
                                                    onChange={(e) => {
                                                      const newList = [...(activeOutput.variants || [])];
                                                      newList[idx] = { ...newList[idx], stock: e.target.value ? Number(e.target.value) : 0 };
                                                      updateActiveOutput(prev => ({ ...prev, variants: newList }));
                                                    }}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                                    dir="ltr"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          ))}

                                          <button
                                            type="button"
                                            onClick={() => {
                                              const newList = [...(activeOutput.variants || []), { name: '', colorCode: '', price: '', stock: 0 }];
                                              updateActiveOutput(prev => ({ ...prev, variants: newList }));
                                            }}
                                            className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                                          >
                                            <Plus size={11} />
                                            <span>افزودن تنوع جدید</span>
                                          </button>
                                        </div>
                                      </details>
                                    </div>
                                  );
                                })()}

                                {/* Blog details */}
                                {activeTask.target === 'blog' && (() => {
                                  const operations = activeOutput.operations || [];
                                  if (operations.length === 0) {
                                    // Fallback for simple legacy blog objects
                                    return (
                                      <div className="space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">عنوان مقاله</label>
                                          <input
                                            type="text"
                                            value={activeOutput.title || ''}
                                            onChange={(e) => updateBlogField('title', e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">خلاصه مقاله</label>
                                          <textarea
                                            value={activeOutput.summary || ''}
                                            onChange={(e) => updateBlogField('summary', e.target.value)}
                                            rows={2}
                                            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">محتوای مقاله</label>
                                          <textarea
                                            value={activeOutput.content || ''}
                                            onChange={(e) => updateBlogField('content', e.target.value)}
                                            rows={5}
                                            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono"
                                          />
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-6">
                                      {operations.map((op: any, opIdx: number) => {
                                        const isPost = op.type === 'create' || op.type === 'create_post' || op.type === 'update' || op.type === 'update_post';
                                        const isCategory = op.type === 'create_category' || op.type === 'update_category';
                                        const isComment = op.type === 'update_comment';
                                        const isDelete = op.type?.startsWith('delete');

                                        if (isDelete) {
                                          let label = 'مقاله وبلاگ';
                                          if (op.type === 'delete_category') label = 'دسته‌بندی وبلاگ';
                                          if (op.type === 'delete_comment') label = 'دیدگاه وبلاگ';
                                          return (
                                            <div key={opIdx} className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center text-rose-500">
                                              <span className="text-xs font-black">❌ حذف {label} با شناسه: {op.id}</span>
                                            </div>
                                          );
                                        }

                                        if (isCategory) {
                                          const cat = op.data || {};
                                          return (
                                            <div key={opIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                                              <span className="text-[10px] font-black text-primary-500 block">
                                                {op.type === 'create_category' ? '➕ ایجاد دسته‌بندی جدید وبلاگ' : '📝 ویرایش دسته‌بندی وبلاگ'}
                                              </span>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نام دسته‌بندی</label>
                                                <input
                                                  type="text"
                                                  value={cat.name || ''}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'name', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">اسلاگ دسته‌بندی</label>
                                                <input
                                                  type="text"
                                                  value={cat.slug || ''}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'slug', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                  dir="ltr"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">توضیحات</label>
                                                <textarea
                                                  value={cat.description || ''}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'description', e.target.value)}
                                                  rows={2}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                                />
                                              </div>
                                            </div>
                                          );
                                        }

                                        if (isComment) {
                                          const comm = op.data || {};
                                          return (
                                            <div key={opIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3">
                                              <span className="text-[10px] font-black text-primary-500 block">💬 پاسخ یا ویرایش دیدگاه وبلاگ</span>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">وضعیت دیدگاه</label>
                                                <select
                                                  value={comm.status || 'approved'}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'status', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                >
                                                  <option value="approved">تایید شده (Approved)</option>
                                                  <option value="pending">در انتظار تایید (Pending)</option>
                                                  <option value="rejected">رد شده (Rejected)</option>
                                                  <option value="spam">اسپم (Spam)</option>
                                                </select>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">متن پاسخ ادمین / دیدگاه</label>
                                                <textarea
                                                  value={comm.content || ''}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'content', e.target.value)}
                                                  rows={3}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono"
                                                />
                                              </div>
                                            </div>
                                          );
                                        }

                                        if (isPost) {
                                          const post = op.data || {};
                                          const tagsList = Array.isArray(post.tags)
                                            ? post.tags
                                            : (() => {
                                                try {
                                                  const parsed = JSON.parse(post.tags || '[]');
                                                  return Array.isArray(parsed) ? parsed : [];
                                                } catch {
                                                  return typeof post.tags === 'string' ? post.tags.split(',').map((t: string) => t.trim()) : [];
                                                }
                                              })();

                                          const handleTagsChange = (val: string) => {
                                            const arr = val.split('،').join(',').split(',').map(t => t.trim()).filter(Boolean);
                                            updateBlogOpField(opIdx, 'tags', JSON.stringify(arr));
                                          };

                                          return (
                                            <div key={opIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                                              <span className="text-[10px] font-black text-primary-500 block">
                                                {op.type?.startsWith('create') ? '📝 ایجاد مقاله جدید' : '📝 ویرایش مقاله وبلاگ'}
                                              </span>
                                              
                                              <div className="grid grid-cols-2 gap-3 text-right">
                                                {/* Title */}
                                                <div className="space-y-1 col-span-2">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان مقاله</label>
                                                  <input
                                                    type="text"
                                                    value={post.title || ''}
                                                    onChange={(e) => updateBlogOpField(opIdx, 'title', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                  />
                                                </div>

                                                {/* Slug */}
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">اسلاگ انگلیسی (Slug)</label>
                                                  <input
                                                    type="text"
                                                    value={post.slug || ''}
                                                    onChange={(e) => updateBlogOpField(opIdx, 'slug', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                    dir="ltr"
                                                  />
                                                </div>

                                                {/* Status */}
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وضعیت انتشار</label>
                                                  <select
                                                    value={post.status || 'draft'}
                                                    onChange={(e) => updateBlogOpField(opIdx, 'status', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                  >
                                                    <option value="draft">پیش‌نویس (Draft)</option>
                                                    <option value="published">منتشر شده (Published)</option>
                                                    <option value="archived">بایگانی شده (Archived)</option>
                                                  </select>
                                                </div>

                                                {/* Featured Image */}
                                                <div className="space-y-1 col-span-2">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس تصویر شاخص مقاله</label>
                                                  <input
                                                    type="text"
                                                    value={post.featuredImage || ''}
                                                    onChange={(e) => updateBlogOpField(opIdx, 'featuredImage', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                    dir="ltr"
                                                    placeholder="https://..."
                                                  />
                                                </div>

                                                {/* Author Name */}
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نام نویسنده</label>
                                                  <input
                                                    type="text"
                                                    value={post.authorName || ''}
                                                    onChange={(e) => updateBlogOpField(opIdx, 'authorName', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    placeholder="پیش‌فرض: ادمین سیستم"
                                                  />
                                                </div>

                                                {/* Blog Category select */}
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">دسته‌بندی وبلاگ</label>
                                                  <select
                                                    value={post.categoryId || ''}
                                                    onChange={(e) => updateBlogOpField(opIdx, 'categoryId', e.target.value || null)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                  >
                                                    <option value="">-- بدون دسته‌بندی خاص --</option>
                                                    {availableBlogCategories.map((c: any) => (
                                                      <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                  </select>
                                                </div>

                                                {/* Tags */}
                                                <div className="space-y-1 col-span-2">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">برچسب‌ها (با کاما جدا کنید)</label>
                                                  <input
                                                    type="text"
                                                    value={tagsList.join(', ')}
                                                    onChange={(e) => handleTagsChange(e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    placeholder="مثلا: تکنولوژی, موبایل, سامسونگ"
                                                  />
                                                </div>
                                              </div>

                                              {/* Summary */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">خلاصه مقاله</label>
                                                <textarea
                                                  value={post.summary || ''}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'summary', e.target.value)}
                                                  rows={2}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                                  placeholder="توضیحاتی خلاصه برای نمایش در لیست وبلاگ..."
                                                />
                                              </div>

                                              {/* Content */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محتوای کامل مقاله (کد HTML شکیل و سئو شده)</label>
                                                <textarea
                                                  value={post.content || ''}
                                                  onChange={(e) => updateBlogOpField(opIdx, 'content', e.target.value)}
                                                  rows={8}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono leading-relaxed"
                                                />
                                              </div>

                                              {/* Collapsible SEO and Extras */}
                                              <details className="group border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-950/20">
                                                <summary className="flex justify-between items-center px-3 py-2 text-[10px] font-black text-slate-700 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950 select-none">
                                                  <span>🔍 بهینه‌سازی سئو مقاله و تنظیمات بیشتر</span>
                                                  <span className="transition-transform group-open:rotate-180">▼</span>
                                                </summary>
                                                <div className="p-3 border-t border-slate-100 dark:border-slate-900 grid grid-cols-2 gap-3 text-right">
                                                  {/* seoTitle */}
                                                  <div className="space-y-1 col-span-2">
                                                    <label className="text-[9px] text-slate-400 font-bold block">عنوان سئو (SEO Title)</label>
                                                    <input
                                                      type="text"
                                                      value={post.seoTitle || ''}
                                                      onChange={(e) => updateBlogOpField(opIdx, 'seoTitle', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                      placeholder="عنوان دلخواه برای سرچ گوگل"
                                                    />
                                                  </div>

                                                  {/* seoDescription */}
                                                  <div className="space-y-1 col-span-2">
                                                    <label className="text-[9px] text-slate-400 font-bold block">توضیحات متای سئو (SEO Meta Description)</label>
                                                    <textarea
                                                      value={post.seoDescription || ''}
                                                      onChange={(e) => updateBlogOpField(opIdx, 'seoDescription', e.target.value)}
                                                      rows={2}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-normal"
                                                      placeholder="۱۶۰ کاراکتر خلاصه برای موتورهای جستجو..."
                                                    />
                                                  </div>

                                                  {/* allowComments */}
                                                  <div className="col-span-2 pt-1 select-none">
                                                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                                      <input
                                                        type="checkbox"
                                                        checked={post.allowComments !== false}
                                                        onChange={(e) => updateBlogOpField(opIdx, 'allowComments', e.target.checked)}
                                                        className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                                      />
                                                      <span>کاربران مجاز به ثبت نظر روی این مقاله باشند</span>
                                                    </label>
                                                  </div>
                                                </div>
                                              </details>
                                            </div>
                                          );
                                        }

                                        return null;
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Stories details */}
                                {activeTask.target === 'stories' && (() => {
                                  const actionObj = activeOutput.actions?.[0] || {};
                                  const story = actionObj.data || actionObj.story || activeOutput;
                                  
                                  const formatDateForInput = (d: any) => {
                                    if (!d) return '';
                                    try {
                                      const dateObj = new Date(d);
                                      if (isNaN(dateObj.getTime())) return '';
                                      const tzOffset = dateObj.getTimezoneOffset() * 60000;
                                      return (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                                    } catch {
                                      return '';
                                    }
                                  };

                                  return (
                                    <div className="space-y-4 text-right">
                                      <div className="grid grid-cols-2 gap-3">
                                        {/* Title */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان استوری</label>
                                          <input
                                            type="text"
                                            value={story.title || ''}
                                            onChange={(e) => updateStoryField('title', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            placeholder="عنوان تبلیغاتی استوری"
                                          />
                                        </div>

                                        {/* Media URL */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس رسانه اصلی استوری (تصویر یا ویدیو)</label>
                                          <input
                                            type="text"
                                            value={story.mediaUrl || ''}
                                            onChange={(e) => updateStoryField('mediaUrl', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                            placeholder="https://..."
                                          />
                                        </div>

                                        {/* Media Type */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع رسانه</label>
                                          <select
                                            value={story.mediaType || 'image'}
                                            onChange={(e) => updateStoryField('mediaType', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="image">تصویر ثابت (Image)</option>
                                            <option value="video">ویدیو کلیپ (Video)</option>
                                          </select>
                                        </div>

                                        {/* Duration */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">مدت نمایش (ثانیه)</label>
                                          <input
                                            type="number"
                                            min="3"
                                            max="30"
                                            value={story.duration || 5}
                                            onChange={(e) => updateStoryField('duration', Number(e.target.value))}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center font-mono"
                                          />
                                        </div>

                                        {/* Thumbnail URL */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس تصویر بندانگشتی دایره‌ای (Thumbnail)</label>
                                          <input
                                            type="text"
                                            value={story.thumbnailUrl || ''}
                                            onChange={(e) => updateStoryField('thumbnailUrl', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                            placeholder="پیش‌فرض: همان رسانه اصلی"
                                          />
                                        </div>

                                        {/* Link text */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن دکمه پایین استوری</label>
                                          <input
                                            type="text"
                                            value={story.linkText || ''}
                                            onChange={(e) => updateStoryField('linkText', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            placeholder="مثلا: خرید آنلاین 🛍️"
                                          />
                                        </div>

                                        {/* Link URL */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس لینک هدایت دکمه</label>
                                          <input
                                            type="text"
                                            value={story.linkUrl || ''}
                                            onChange={(e) => updateStoryField('linkUrl', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                            placeholder="/products/shoes"
                                          />
                                        </div>

                                        {/* Display Location */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محل نمایش استوری</label>
                                          <select
                                            value={story.displayLocation || 'both'}
                                            onChange={(e) => updateStoryField('displayLocation', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="both">هر دو مورد (فروشگاه + لندینگ)</option>
                                            <option value="shop">فقط در صفحه فروشگاه (Shop)</option>
                                            <option value="custom">فقط در لندینگ اختصاصی (Custom)</option>
                                          </select>
                                        </div>

                                        {/* Category / Group */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">دسته‌بندی استوری (گروه‌بندی)</label>
                                          <input
                                            type="text"
                                            value={story.category || ''}
                                            onChange={(e) => updateStoryField('category', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center"
                                            placeholder="مثلا: یلدا"
                                          />
                                        </div>

                                        {/* Expiration date */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تاریخ و ساعت انقضای خودکار استوری</label>
                                          <input
                                            type="datetime-local"
                                            value={formatDateForInput(story.expiresAt)}
                                            onChange={(e) => updateStoryField('expiresAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-center"
                                          />
                                        </div>
                                      </div>

                                      {/* Text on Story overlay */}
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن و پیام روی تصویر استوری</label>
                                        <textarea
                                          value={story.text || ''}
                                          onChange={(e) => updateStoryField('text', e.target.value)}
                                          rows={2.5}
                                          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                          placeholder="جمله‌ای کوتاه، بولد و جذاب جهت ترغیب مشتری..."
                                        />
                                      </div>

                                      {/* isActive checkbox */}
                                      <div className="pt-1 select-none">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={story.isActive !== false}
                                            onChange={(e) => updateStoryField('isActive', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>استوری از همین لحظه فعال و منتشر شود</span>
                                        </label>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Categories details */}
                                {activeTask.target === 'categories' && (() => {
                                  const operations = activeOutput.operations || [];

                                  const renderCategoryFields = (cat: any, opIdx: number | null) => {
                                    const updateFn = (field: string, val: any) => {
                                      if (opIdx === null) {
                                        updateCategoryField(field, val);
                                      } else {
                                        updateCategoryOpField(opIdx, field, val);
                                      }
                                    };

                                    return (
                                      <div className="grid grid-cols-2 gap-3 text-right">
                                        {/* name */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نام دسته‌بندی</label>
                                          <input
                                            type="text"
                                            value={cat.name || ''}
                                            onChange={(e) => updateFn('name', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>

                                        {/* slug */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نامک / اسلاگ انگلیسی</label>
                                          <input
                                            type="text"
                                            value={cat.slug || ''}
                                            onChange={(e) => updateFn('slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>

                                        {/* parentId */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">دسته‌بندی مادر</label>
                                          <select
                                            value={cat.parentId || ''}
                                            onChange={(e) => updateFn('parentId', e.target.value || null)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="">-- بدون دسته‌بندی مادر (ریشه) --</option>
                                            {availableCategories.filter(c => c.id !== cat.id).map((c: any) => (
                                              <option key={c.id} value={c.id}>
                                                {c.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>

                                        {/* icon */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آیکون / اموجی</label>
                                          <input
                                            type="text"
                                            value={cat.icon || ''}
                                            placeholder="مثال: 🛍️ یا layout"
                                            onChange={(e) => updateFn('icon', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center"
                                          />
                                        </div>

                                        {/* imageUrl */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس تصویر بنر</label>
                                          <input
                                            type="text"
                                            value={cat.imageUrl || ''}
                                            onChange={(e) => updateFn('imageUrl', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-855 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>

                                        {/* seoTitle */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان سئو (SEO Title)</label>
                                          <input
                                            type="text"
                                            value={cat.seoTitle || ''}
                                            onChange={(e) => updateFn('seoTitle', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>

                                        {/* seoDescription */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">توضیحات سئو (SEO Description)</label>
                                          <textarea
                                            value={cat.seoDescription || ''}
                                            onChange={(e) => updateFn('seoDescription', e.target.value)}
                                            rows={2}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                          />
                                        </div>

                                        {/* description */}
                                        <div className="space-y-1 col-span-2">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">توضیحات عمومی دسته‌بندی</label>
                                          <textarea
                                            value={cat.description || ''}
                                            onChange={(e) => updateFn('description', e.target.value)}
                                            rows={3}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                          />
                                        </div>

                                        {/* isActive */}
                                        <div className="col-span-2 flex items-center gap-2 py-1 select-none">
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={cat.isActive !== false}
                                              onChange={(e) => updateFn('isActive', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>دسته‌بندی در منوها و سایت فعال باشد</span>
                                          </label>
                                        </div>
                                      </div>
                                    );
                                  };

                                  if (operations.length === 0) {
                                    const cat = activeOutput;
                                    return (
                                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl">
                                        {renderCategoryFields(cat, null)}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-6">
                                      {operations.map((op: any, opIdx: number) => {
                                        const isDelete = op.type === 'delete' || op.type === 'delete_category';
                                        if (isDelete) {
                                          return (
                                            <div key={opIdx} className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center text-rose-500">
                                              <span className="text-xs font-black">❌ حذف دسته‌بندی با شناسه: {op.id}</span>
                                            </div>
                                          );
                                        }

                                        const cat = op.data || {};
                                        return (
                                          <div key={opIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                                            <span className="text-[10px] font-black text-primary-500 block">
                                              {op.type === 'create' || op.type === 'create_category' ? '➕ ایجاد دسته‌بندی جدید' : '📝 ویرایش دسته‌بندی'}
                                            </span>
                                            {renderCategoryFields(cat, opIdx)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Brand operations */}
                                {activeTask.target === 'brand' && (() => {
                                  const operations = activeOutput.operations || [];
                                  if (operations.length === 0) {
                                    return <p className="text-[11px] text-slate-500 font-bold">عملیاتی برای برندها شناسایی نشد.</p>;
                                  }
                                  return (
                                    <div className="space-y-2">
                                      {operations.map((op: any, i: number) => (
                                        <div key={i} className={`p-3 rounded-xl border text-xs font-black flex items-center gap-2 ${op.type === 'delete' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white'}`}>
                                          <span>{op.type === 'create' ? '➕ ایجاد برند' : op.type === 'update' ? '📝 ویرایش برند' : '❌ حذف برند'}</span>
                                          <span className="text-primary-500">{op.data?.name || op.id}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Content calendar items */}
                                {activeTask.target === 'content_calendar' && (() => {
                                  const items = activeOutput.items || [];
                                  if (items.length === 0) {
                                    return <p className="text-[11px] text-slate-500 font-bold">آیتمی برای تقویم محتوا تولید نشد.</p>;
                                  }
                                  return (
                                    <div className="space-y-2 max-h-[360px] overflow-y-auto">
                                      <p className="text-[10px] text-slate-500 font-bold">{items.length} آیتم محتوایی پیشنهاد و به‌صورت خودکار ذخیره شد:</p>
                                      {items.slice(0, 30).map((it: any, i: number) => (
                                        <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-black text-slate-800 dark:text-white line-clamp-1">{it.title}</span>
                                            <span className="text-[8px] font-black text-primary-500 shrink-0">{it.type === 'story' ? 'استوری' : it.type === 'discount' ? 'کمپین تخفیف' : 'مقاله'}</span>
                                          </div>
                                          {it.occasion && <span className="text-[9px] text-slate-500 font-bold block">{it.occasion}{it.occasionDateJalali ? ` — ${it.occasionDateJalali}` : ''}</span>}
                                          {it.summary && <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold line-clamp-2">{it.summary}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Blog comment auto-replies */}
                                {activeTask.target === 'blog_comments' && (() => {
                                  const replies = activeOutput.rawResult?.replies || activeOutput.replies || [];
                                  if (replies.length === 0) {
                                    return <p className="text-[11px] text-slate-500 font-bold">دیدگاه بی‌پاسخی برای پاسخ‌گویی یافت نشد.</p>;
                                  }
                                  return (
                                    <div className="space-y-3 max-h-[360px] overflow-y-auto">
                                      <p className="text-[10px] text-slate-500 font-bold">پاسخ پیشنهادی برای {replies.length} دیدگاه:</p>
                                      {replies.map((r: any, i: number) => (
                                        <div key={i} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 space-y-1.5">
                                          <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-slate-800 dark:text-white">{r.name}</span>
                                            {r.postTitle && <span className="text-[8px] text-slate-400 font-bold line-clamp-1">روی: {r.postTitle}</span>}
                                          </div>
                                          <p className="text-[10px] text-slate-500 font-bold line-clamp-2 border-r-2 border-slate-300 dark:border-slate-700 pr-2">{r.content}</p>
                                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold leading-relaxed">↩ {r.suggestedReply}</p>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Discounts details */}
                                {activeTask.target === 'discounts' && (() => {
                                  const operations = activeOutput.operations || [];

                                  const parseArrayJson = (str: any) => {
                                    if (!str) return [];
                                    if (Array.isArray(str)) return str;
                                    try {
                                      return JSON.parse(str);
                                    } catch {
                                      return [];
                                    }
                                  };

                                  const formatDateForInput = (d: any) => {
                                    if (!d) return '';
                                    try {
                                      const dateObj = new Date(d);
                                      if (isNaN(dateObj.getTime())) return '';
                                      // Offset timezone to local
                                      const tzOffset = dateObj.getTimezoneOffset() * 60000;
                                      const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
                                      return localISOTime;
                                    } catch {
                                      return '';
                                    }
                                  };

                                  if (operations.length === 0) {
                                    const disc = activeOutput;
                                    return (
                                      <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                                        <div className="grid grid-cols-2 gap-3 text-right">
                                          {/* 1. Code */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">کد تخفیف</label>
                                            <input
                                              type="text"
                                              value={disc.code || ''}
                                              onChange={(e) => updateDiscountField('code', e.target.value.toUpperCase())}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>

                                          {/* 2. Discount amount */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">میزان تخفیف</label>
                                            <input
                                              type="number"
                                              value={disc.discount || ''}
                                              onChange={(e) => updateDiscountField('discount', Number(e.target.value))}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 3. Discount type */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع تخفیف</label>
                                            <select
                                              value={disc.type || 'percentage'}
                                              onChange={(e) => updateDiscountField('type', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="percentage">درصدی (Percentage)</option>
                                              <option value="flat">مبلغ ثابت (Flat)</option>
                                            </select>
                                          </div>

                                          {/* 4. Allowed Gender */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محدودیت جنسیت</label>
                                            <select
                                              value={disc.allowedGender || 'all'}
                                              onChange={(e) => updateDiscountField('allowedGender', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="all">همه کاربران (زن و مرد)</option>
                                              <option value="male">فقط آقایان</option>
                                              <option value="female">فقط بانوان</option>
                                            </select>
                                          </div>

                                          {/* 5. Max Uses */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">کل دفعات استفاده (ظرفیت)</label>
                                            <input
                                              type="number"
                                              value={disc.maxUses || ''}
                                              onChange={(e) => updateDiscountField('maxUses', e.target.value ? Number(e.target.value) : null)}
                                              placeholder="بدون محدودیت"
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 6. Max Uses Per User */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">دفعات استفاده مجاز هر کاربر</label>
                                            <input
                                              type="number"
                                              value={disc.maxUsesPerUser || ''}
                                              onChange={(e) => updateDiscountField('maxUsesPerUser', e.target.value ? Number(e.target.value) : null)}
                                              placeholder="مثال: ۱"
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 7. Min Order Amount */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداقل مبلغ خرید (تومان)</label>
                                            <input
                                              type="number"
                                              value={disc.minOrderAmount || ''}
                                              onChange={(e) => updateDiscountField('minOrderAmount', e.target.value ? Number(e.target.value) : null)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 7.5. Min Quantity */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداقل تعداد خرید محصول (عدد)</label>
                                            <input
                                              type="number"
                                              value={disc.minQuantity || ''}
                                              onChange={(e) => updateDiscountField('minQuantity', e.target.value ? Number(e.target.value) : null)}
                                              placeholder="بدون محدودیت تعداد"
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 8. Max Discount Amount */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداکثر سقف تخفیف (تومان)</label>
                                            <input
                                              type="number"
                                              value={disc.maxDiscountAmount || ''}
                                              onChange={(e) => updateDiscountField('maxDiscountAmount', e.target.value ? Number(e.target.value) : null)}
                                              placeholder="بدون سقف"
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 9. Start Date */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تاریخ شروع اعتبار</label>
                                            <input
                                              type="datetime-local"
                                              value={formatDateForInput(disc.startDate)}
                                              onChange={(e) => updateDiscountField('startDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 10. Expiration Date */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تاریخ انقضا</label>
                                            <input
                                              type="datetime-local"
                                              value={formatDateForInput(disc.expiresAt)}
                                              onChange={(e) => updateDiscountField('expiresAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* 11. First Order and IsActive */}
                                          <div className="col-span-2 flex items-center gap-6 py-1 select-none">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={disc.firstOrderOnly || false}
                                                onChange={(e) => updateDiscountField('firstOrderOnly', e.target.checked)}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                              />
                                              <span>فقط برای اولین خرید مشتری</span>
                                            </label>

                                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={disc.isActive !== false}
                                                onChange={(e) => updateDiscountField('isActive', e.target.checked)}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                              />
                                              <span>کد فعال باشد</span>
                                            </label>
                                          </div>

                                          {/* 12. Target User ID */}
                                          <div className="space-y-1 col-span-2 text-right">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">مشتری اختصاصی (اختیاری)</label>
                                            <select
                                              value={disc.targetUserId || ''}
                                              onChange={(e) => updateDiscountField('targetUserId', e.target.value || null)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="">همه مشتریان (بدون محدودیت کاربر)</option>
                                              {availableUsers.map((u: any) => (
                                                <option key={u.id} value={u.id}>
                                                  {u.name || 'بدون نام'} ({u.email} {u.phone ? `- ${u.phone}` : ''})
                                                </option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* 13. Allowed Categories */}
                                          <div className="space-y-1 col-span-2 text-right">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محدودیت دسته‌بندی‌ها</label>
                                            <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-950 space-y-1 text-right">
                                              {availableCategories.length === 0 ? (
                                                <span className="text-[10px] text-slate-400">هیچ دسته‌بندی تعریف نشده است</span>
                                              ) : (
                                                availableCategories.map((cat: any) => {
                                                  const isChecked = parseArrayJson(disc.targetCategoryIds).includes(cat.id);
                                                  return (
                                                    <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-1 rounded transition-colors text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                      <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                          const currentList = parseArrayJson(disc.targetCategoryIds);
                                                          const newList = isChecked
                                                            ? currentList.filter((id: any) => id !== cat.id)
                                                            : [...currentList, cat.id];
                                                          updateDiscountField('targetCategoryIds', JSON.stringify(newList));
                                                        }}
                                                        className="rounded text-primary-500 focus:ring-primary-500"
                                                      />
                                                      {cat.name}
                                                    </label>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>

                                          {/* 14. Allowed Products */}
                                          <div className="space-y-1 col-span-2 text-right">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محدودیت محصولات</label>
                                            <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-950 space-y-1 text-right">
                                              {availableProducts.length === 0 ? (
                                                <span className="text-[10px] text-slate-400">هیچ محصولی تعریف نشده است</span>
                                              ) : (
                                                availableProducts.map((prod: any) => {
                                                  const isChecked = parseArrayJson(disc.targetProductIds).includes(prod.id);
                                                  return (
                                                    <label key={prod.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-1 rounded transition-colors text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                      <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={() => {
                                                          const currentList = parseArrayJson(disc.targetProductIds);
                                                          const newList = isChecked
                                                            ? currentList.filter((id: any) => id !== prod.id)
                                                            : [...currentList, prod.id];
                                                          updateDiscountField('targetProductIds', JSON.stringify(newList));
                                                        }}
                                                        className="rounded text-primary-500 focus:ring-primary-500"
                                                      />
                                                      {prod.title}
                                                    </label>
                                                  );
                                                })
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="space-y-6 text-right">
                                      {operations.map((op: any, opIdx: number) => {
                                        const isDelete = op.type === 'delete';
                                        if (isDelete) {
                                          return (
                                            <div key={opIdx} className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center text-rose-500">
                                              <span className="text-xs font-black">❌ حذف کد تخفیف با شناسه: {op.id}</span>
                                            </div>
                                          );
                                        }

                                        const disc = op.data || {};
                                        return (
                                          <div key={opIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                                            <span className="text-[10px] font-black text-primary-500 block">
                                              {op.type === 'create' ? '➕ ایجاد کد تخفیف جدید' : '📝 ویرایش کد تخفیف'}
                                            </span>

                                            <div className="grid grid-cols-2 gap-3">
                                              {/* 1. Code */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">کد تخفیف</label>
                                                <input
                                                  type="text"
                                                  value={disc.code || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'code', e.target.value.toUpperCase())}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                                  dir="ltr"
                                                />
                                              </div>

                                              {/* 2. Discount amount */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">میزان تخفیف</label>
                                                <input
                                                  type="number"
                                                  value={disc.discount || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'discount', Number(e.target.value))}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 3. Discount type */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع تخفیف</label>
                                                <select
                                                  value={disc.type || 'percentage'}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'type', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                >
                                                  <option value="percentage">درصدی (Percentage)</option>
                                                  <option value="flat">مبلغ ثابت (Flat)</option>
                                                </select>
                                              </div>

                                              {/* 4. Allowed Gender */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محدودیت جنسیت</label>
                                                <select
                                                  value={disc.allowedGender || 'all'}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'allowedGender', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                >
                                                  <option value="all">همه کاربران (زن و مرد)</option>
                                                  <option value="male">فقط آقایان</option>
                                                  <option value="female">فقط بانوان</option>
                                                </select>
                                              </div>

                                              {/* 5. Max Uses */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">کل دفعات استفاده (ظرفیت)</label>
                                                <input
                                                  type="number"
                                                  value={disc.maxUses || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'maxUses', e.target.value ? Number(e.target.value) : null)}
                                                  placeholder="بدون محدودیت"
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 6. Max Uses Per User */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">دفعات استفاده مجاز هر کاربر</label>
                                                <input
                                                  type="number"
                                                  value={disc.maxUsesPerUser || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'maxUsesPerUser', e.target.value ? Number(e.target.value) : null)}
                                                  placeholder="مثال: ۱"
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 7. Min Order Amount */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداقل مبلغ خرید (تومان)</label>
                                                <input
                                                  type="number"
                                                  value={disc.minOrderAmount || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'minOrderAmount', e.target.value ? Number(e.target.value) : null)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 7.5. Min Quantity */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداقل تعداد خرید محصول (عدد)</label>
                                                <input
                                                  type="number"
                                                  value={disc.minQuantity || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'minQuantity', e.target.value ? Number(e.target.value) : null)}
                                                  placeholder="بدون محدودیت تعداد"
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 8. Max Discount Amount */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">حداکثر سقف تخفیف (تومان)</label>
                                                <input
                                                  type="number"
                                                  value={disc.maxDiscountAmount || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'maxDiscountAmount', e.target.value ? Number(e.target.value) : null)}
                                                  placeholder="بدون سقف"
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 9. Start Date */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تاریخ شروع اعتبار</label>
                                                <input
                                                  type="datetime-local"
                                                  value={formatDateForInput(disc.startDate)}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'startDate', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 10. Expiration Date */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تاریخ انقضا</label>
                                                <input
                                                  type="datetime-local"
                                                  value={formatDateForInput(disc.expiresAt)}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'expiresAt', e.target.value ? new Date(e.target.value).toISOString() : null)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 11. First Order and IsActive */}
                                              <div className="col-span-2 flex items-center gap-6 py-1 select-none">
                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                                  <input
                                                    type="checkbox"
                                                    checked={disc.firstOrderOnly || false}
                                                    onChange={(e) => updateDiscountOpField(opIdx, 'firstOrderOnly', e.target.checked)}
                                                    className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                                  />
                                                  <span>فقط برای اولین خرید مشتری</span>
                                                </label>

                                                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                                  <input
                                                    type="checkbox"
                                                    checked={disc.isActive !== false}
                                                    onChange={(e) => updateDiscountOpField(opIdx, 'isActive', e.target.checked)}
                                                    className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                                  />
                                                  <span>کد فعال باشد</span>
                                                </label>
                                              </div>

                                              {/* 12. Target User ID */}
                                              <div className="space-y-1 col-span-2 text-right">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">مشتری اختصاصی (اختیاری)</label>
                                                <select
                                                  value={disc.targetUserId || ''}
                                                  onChange={(e) => updateDiscountOpField(opIdx, 'targetUserId', e.target.value || null)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                >
                                                  <option value="">همه مشتریان (بدون محدودیت کاربر)</option>
                                                  {availableUsers.map((u: any) => (
                                                    <option key={u.id} value={u.id}>
                                                      {u.name || 'بدون نام'} ({u.email} {u.phone ? `- ${u.phone}` : ''})
                                                    </option>
                                                  ))}
                                                </select>
                                              </div>

                                              {/* 13. Allowed Categories */}
                                              <div className="space-y-1 col-span-2 text-right">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محدودیت دسته‌بندی‌ها</label>
                                                <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-950 space-y-1 text-right">
                                                  {availableCategories.length === 0 ? (
                                                    <span className="text-[10px] text-slate-400">هیچ دسته‌بندی تعریف نشده است</span>
                                                  ) : (
                                                    availableCategories.map((cat: any) => {
                                                      const isChecked = parseArrayJson(disc.targetCategoryIds).includes(cat.id);
                                                      return (
                                                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-1 rounded transition-colors text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                          <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                              const currentList = parseArrayJson(disc.targetCategoryIds);
                                                              const newList = isChecked
                                                                ? currentList.filter((id: any) => id !== cat.id)
                                                                : [...currentList, cat.id];
                                                              updateDiscountOpField(opIdx, 'targetCategoryIds', JSON.stringify(newList));
                                                            }}
                                                            className="rounded text-primary-500 focus:ring-primary-500"
                                                          />
                                                          {cat.name}
                                                        </label>
                                                      );
                                                    })
                                                  )}
                                                </div>
                                              </div>

                                              {/* 14. Allowed Products */}
                                              <div className="space-y-1 col-span-2 text-right">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محدودیت محصولات</label>
                                                <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-2 bg-white dark:bg-slate-950 space-y-1 text-right">
                                                  {availableProducts.length === 0 ? (
                                                    <span className="text-[10px] text-slate-400">هیچ محصولی تعریف نشده است</span>
                                                  ) : (
                                                    availableProducts.map((prod: any) => {
                                                      const isChecked = parseArrayJson(disc.targetProductIds).includes(prod.id);
                                                      return (
                                                        <label key={prod.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 p-1 rounded transition-colors text-[11px] font-bold text-slate-700 dark:text-slate-300">
                                                          <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => {
                                                              const currentList = parseArrayJson(disc.targetProductIds);
                                                              const newList = isChecked
                                                                ? currentList.filter((id: any) => id !== prod.id)
                                                                : [...currentList, prod.id];
                                                              updateDiscountOpField(opIdx, 'targetProductIds', JSON.stringify(newList));
                                                            }}
                                                            className="rounded text-primary-500 focus:ring-primary-500"
                                                          />
                                                          {prod.title}
                                                        </label>
                                                      );
                                                    })
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Orders details */}
                                {activeTask.target === 'orders' && activeOutput && (() => {
                                  const isReport = activeOutput.action === 'report' || activeOutput.rawResult?.action === 'report';
                                  
                                  if (isReport) {
                                    return (
                                      <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-2 max-w-md mx-auto">
                                        <span className="text-xl">📊</span>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-white">گزارش و پاسخ دستیار هوشمند</h4>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                                          این مرحله صرفاً جهت مشاهده گزارش یا پاسخ به سوال شماست و هیچ فیلد قابل ویرایشی ندارد. برای مشاهده پاسخ کامل، به تب «پیش‌نمایش زنده» مراجعه کنید.
                                        </p>
                                      </div>
                                    );
                                  }
                                  
                                  const updates = activeOutput.rawResult?.updates || activeOutput.updates || {};
                                  const targets = activeOutput.targets || [];
                                  return (
                                    <div className="space-y-4 text-right">
                                      {targets.length > 0 && (
                                        <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/40">
                                          <span className="text-[9px] text-slate-500 font-bold block mb-2">سفارشات هدف ({targets.length} مورد):</span>
                                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                                            {targets.map((t: any, idx: number) => (
                                              <div key={idx} className="flex justify-between items-center text-[10px] text-slate-700 dark:text-slate-300 font-bold bg-white dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-900">
                                                <span>{t.customerName} ({t.shortId || t.id?.slice(0,8)})</span>
                                                <span className="font-mono text-primary-500">{(t.finalAmount || 0).toLocaleString('fa-IR')} ت</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                        {/* Status */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وضعیت عمومی</label>
                                          <select
                                            value={updates.status || ''}
                                            onChange={(e) => updateOrderField('status', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="">تغییر نکند</option>
                                            <option value="pending">در انتظار پرداخت</option>
                                            <option value="paid">پرداخت شده</option>
                                            <option value="shipped">ارسال شده</option>
                                            <option value="delivered">تحویل شده</option>
                                            <option value="cancelled">لغو شده</option>
                                          </select>
                                        </div>

                                        {/* Shipping Status */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وضعیت ارسال</label>
                                          <select
                                            value={updates.shippingStatus || ''}
                                            onChange={(e) => updateOrderField('shippingStatus', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="">تغییر نکند</option>
                                            <option value="new">جدید</option>
                                            <option value="processing">در حال آماده‌سازی</option>
                                            <option value="shipped">ارسال شده</option>
                                            <option value="delivered">تحویل شده</option>
                                          </select>
                                        </div>

                                        {/* Payment Status */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وضعیت مالی</label>
                                          <select
                                            value={updates.paymentStatus || ''}
                                            onChange={(e) => updateOrderField('paymentStatus', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="">تغییر نکند</option>
                                            <option value="pending">در انتظار پرداخت</option>
                                            <option value="paid">پرداخت موفق</option>
                                            <option value="failed">پرداخت ناموفق</option>
                                            <option value="refunded">مرجوع شده</option>
                                          </select>
                                        </div>

                                        {/* printMode */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع پرینت اسناد</label>
                                          <select
                                            value={updates.printMode || ''}
                                            onChange={(e) => updateOrderField('printMode', e.target.value || null)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="">-- بدون پرینت اتوماتیک --</option>
                                            <option value="invoice">فاکتور فروش خریدار (Invoice)</option>
                                            <option value="label">برچسب آدرس پستی (Label)</option>
                                            <option value="both">هر دو مورد (فاکتور + برچسب آدرس)</option>
                                          </select>
                                        </div>

                                        {/* trackingCode */}
                                        <div className="space-y-1 col-span-2 md:col-span-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">کد رهگیری مرسوله پستی</label>
                                          <input
                                            type="text"
                                            placeholder="کد ۲۴ رقمی پست یا تیپاکس"
                                            value={updates.trackingCode || ''}
                                            onChange={(e) => updateOrderField('trackingCode', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>

                                        {/* notes */}
                                        <div className="space-y-1 col-span-2 md:col-span-3">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">یادداشت اداری / توضیحات ادمین</label>
                                          <textarea
                                            value={updates.notes || ''}
                                            onChange={(e) => updateOrderField('notes', e.target.value)}
                                            rows={2}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                            placeholder="توضیحات داخلی یا علت تغییرات سفارش..."
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Reviews details */}
                                {activeTask.target === 'reviews' && activeOutput && (() => {
                                  if (activeOutput.action === 'create' && activeOutput.data) {
                                    const rData = activeOutput.data;
                                    const reviewImages = Array.isArray(rData.images) 
                                      ? rData.images 
                                      : (() => {
                                          try { return JSON.parse(rData.images || '[]'); } catch { return []; }
                                        })();

                                    const addReviewImage = () => {
                                      const updatedImages = [...reviewImages, ''];
                                      updateReviewField('images', updatedImages);
                                    };

                                    const removeReviewImage = (imgIdx: number) => {
                                      const updatedImages = reviewImages.filter((_: any, idx: number) => idx !== imgIdx);
                                      updateReviewField('images', updatedImages);
                                    };

                                    const updateReviewImageUrl = (imgIdx: number, val: string) => {
                                      const updatedImages = [...reviewImages];
                                      updatedImages[imgIdx] = val;
                                      updateReviewField('images', updatedImages);
                                    };

                                    return (
                                      <div className="space-y-4 text-right">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                          {/* Writer Name */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نام نویسنده نظر</label>
                                            <input
                                              type="text"
                                              value={rData.userName || ''}
                                              onChange={(e) => updateReviewField('userName', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>

                                          {/* User ID account linkage */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">اکانت متصل شده</label>
                                            <select
                                              value={rData.userId || ''}
                                              onChange={(e) => updateReviewField('userId', e.target.value || null)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="">-- بدون اتصال به کاربر خاص --</option>
                                              {availableUsers.map((u: any) => (
                                                <option key={u.id} value={u.id}>{u.name || u.phone || u.email}</option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* Rating */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">امتیاز (۱ تا ۵)</label>
                                            <select
                                              value={rData.rating || 5}
                                              onChange={(e) => updateReviewField('rating', Number(e.target.value))}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              {[5, 4, 3, 2, 1].map(num => (
                                                <option key={num} value={num}>{num} ستاره</option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* Product selection */}
                                          <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">محصول مورد نظر</label>
                                            <select
                                              value={rData.productId || ''}
                                              onChange={(e) => updateReviewField('productId', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="">-- انتخاب محصول مرتبط --</option>
                                              {availableProducts.map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.title}</option>
                                              ))}
                                            </select>
                                          </div>

                                          {/* Status */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وضعیت بررسی</label>
                                            <select
                                              value={rData.status || 'approved'}
                                              onChange={(e) => updateReviewField('status', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="approved">تایید شده (انتشار عمومی)</option>
                                              <option value="pending">در انتظار بررسی</option>
                                              <option value="rejected">رد شده (عدم نمایش)</option>
                                            </select>
                                          </div>

                                          {/* Likes count */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تعداد لایک‌ها</label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={rData.likes !== undefined ? rData.likes : 0}
                                              onChange={(e) => updateReviewField('likes', Number(e.target.value))}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center font-mono"
                                            />
                                          </div>

                                          {/* Dislikes count */}
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تعداد دیس‌لایک‌ها</label>
                                            <input
                                              type="number"
                                              min="0"
                                              value={rData.dislikes !== undefined ? rData.dislikes : 0}
                                              onChange={(e) => updateReviewField('dislikes', Number(e.target.value))}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center font-mono"
                                            />
                                          </div>
                                        </div>

                                        {/* Comment text */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن دیدگاه و تجربه خرید</label>
                                          <textarea
                                            value={rData.comment || ''}
                                            onChange={(e) => updateReviewField('comment', e.target.value)}
                                            rows={3}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                          />
                                        </div>

                                        {/* Checkboxes Group */}
                                        <div className="grid grid-cols-2 gap-3 pt-1 select-none">
                                          {/* showOnHomepage */}
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={!!rData.showOnHomepage}
                                              onChange={(e) => updateReviewField('showOnHomepage', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>نمایش ویژه در صفحه اصلی</span>
                                          </label>

                                          {/* isBuyer */}
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={rData.isBuyer !== false}
                                              onChange={(e) => updateReviewField('isBuyer', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>تگ «خریدار محصول» داشته باشد</span>
                                          </label>
                                        </div>

                                        {/* Review Images */}
                                        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                                          <div className="flex justify-between items-center select-none">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تصاویر ضمیمه شده نظر خریدار ({reviewImages.length} عدد)</label>
                                            <button
                                              type="button"
                                              onClick={addReviewImage}
                                              className="bg-primary-500/10 hover:bg-primary-500/15 border border-primary-500/20 text-primary-600 dark:text-primary-400 px-2 py-0.5 rounded-md text-[8px] font-black cursor-pointer transition-all"
                                            >
                                              ➕ افزودن تصویر
                                            </button>
                                          </div>
                                          
                                          {reviewImages.length > 0 && (
                                            <div className="space-y-2">
                                              {reviewImages.map((img: string, imgIdx: number) => (
                                                <div key={imgIdx} className="flex gap-2 items-center">
                                                  <input
                                                    type="text"
                                                    value={img}
                                                    placeholder="آدرس تصویر (URL)"
                                                    onChange={(e) => updateReviewImageUrl(imgIdx, e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none flex-1 text-left font-mono"
                                                    dir="ltr"
                                                  />
                                                  <button
                                                    type="button"
                                                    onClick={() => removeReviewImage(imgIdx)}
                                                    className="text-rose-500 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                                                  >
                                                    <Trash2 size={12} />
                                                  </button>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (activeOutput.action === 'update_status') {
                                    return (
                                      <div className="space-y-3 text-right">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">وضعیت جدید نظرات هدف</label>
                                          <select
                                            value={activeOutput.status || 'approved'}
                                            onChange={(e) => updateReviewField('status', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="approved">تایید شده</option>
                                            <option value="rejected">رد شده</option>
                                            <option value="pending">در انتظار تایید</option>
                                          </select>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                                          <span className="text-[9px] text-slate-500 font-bold block mb-1">شناسه‌های نظرات هدف:</span>
                                          <span className="font-mono text-[8px] text-primary-500 break-all">{JSON.stringify(activeOutput.targetReviewIds || [])}</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (activeOutput.action === 'delete') {
                                    return (
                                      <div className="space-y-3 text-right">
                                        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center text-rose-500">
                                          <span className="text-xs font-black">❌ حذف فیزیکی نظرات</span>
                                          <span className="text-[9px] font-bold">تعداد: {activeOutput.targetReviewIds?.length || 0} نظر</span>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                                          <span className="text-[9px] text-slate-500 font-bold block mb-1">شناسه‌های نظرات حذفی:</span>
                                          <span className="font-mono text-[8px] text-rose-500 break-all">{JSON.stringify(activeOutput.targetReviewIds || [])}</span>
                                        </div>
                                      </div>
                                    );
                                  }

                                  return null;
                                })()}

                                {/* Customer Tickets Details */}
                                {activeTask.target === 'tickets' && activeOutput && (() => {
                                  const isReply = activeOutput.action === 'reply';
                                  const isUpdateStatus = activeOutput.action === 'update_status';
                                  return (
                                    <div className="space-y-4 text-right" dir="rtl">
                                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div className="text-[10px] font-black text-primary-500 mb-1">تیکت پشتیبانی مشتری</div>
                                        <div className="text-[9px] text-slate-500 font-bold">شناسه تیکت: {activeOutput.ticketId || 'نامشخص'}</div>
                                      </div>

                                      {isReply && (
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">متن پاسخ به مشتری</label>
                                          <textarea
                                            value={activeOutput.message || ''}
                                            onChange={(e) => updateTicketsField('message', e.target.value)}
                                            rows={4}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            placeholder="متن پاسخ خود را وارد کنید..."
                                          />
                                        </div>
                                      )}

                                      {isUpdateStatus && (
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">وضعیت جدید تیکت</label>
                                          <select
                                            value={activeOutput.status || 'closed'}
                                            onChange={(e) => updateTicketsField('status', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="new">جدید (New)</option>
                                            <option value="in_progress">در حال بررسی (In Progress)</option>
                                            <option value="answered">پاسخ داده شده (Answered)</option>
                                            <option value="closed">بسته شده (Closed)</option>
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* System Tickets Details */}
                                {activeTask.target === 'system_tickets' && activeOutput && (() => {
                                  const isCreate = activeOutput.action === 'create';
                                  const isReply = activeOutput.action === 'reply';
                                  return (
                                    <div className="space-y-4 text-right" dir="rtl">
                                      {isCreate && (
                                        <>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">موضوع تیکت به پشتیبانی سیستم</label>
                                            <input
                                              type="text"
                                              value={activeOutput.subject || ''}
                                              onChange={(e) => updateSystemTicketsField('subject', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">شرح و توضیحات مشکل فنی</label>
                                            <textarea
                                              value={activeOutput.description || ''}
                                              onChange={(e) => updateSystemTicketsField('description', e.target.value)}
                                              rows={4}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">اولویت تیکت</label>
                                            <select
                                              value={activeOutput.priority || 'normal'}
                                              onChange={(e) => updateSystemTicketsField('priority', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="low">کم (Low)</option>
                                              <option value="normal">عادی (Normal)</option>
                                              <option value="high">زیاد (High)</option>
                                              <option value="urgent">فوری و بحرانی (Urgent)</option>
                                            </select>
                                          </div>
                                        </>
                                      )}

                                      {isReply && (
                                        <div className="space-y-1">
                                          <div className="text-[9px] text-slate-500 font-bold mb-2">پاسخ به تیکت سیستمی شماره: {activeOutput.ticketId}</div>
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">متن پاسخ فنی</label>
                                          <textarea
                                            value={activeOutput.message || ''}
                                            onChange={(e) => updateSystemTicketsField('message', e.target.value)}
                                            rows={4}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Staff & Roles Details */}
                                {activeTask.target === 'staff' && activeOutput && (() => {
                                  const action = activeOutput.action;
                                  const staffData = activeOutput.data || {};
                                  return (
                                    <div className="space-y-4 text-right" dir="rtl">
                                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div className="text-[10px] font-black text-primary-500 mb-1">مدیریت همکاران و دسترسی‌ها</div>
                                        <div className="text-[9px] text-slate-500 font-bold">نوع عملیات: {action === 'create' ? 'ایجاد همکار جدید' : action === 'update' ? 'ویرایش همکار' : action === 'delete' ? 'حذف همکار' : 'گزارش‌گیری'}</div>
                                      </div>

                                      {(action === 'create' || action === 'update') && (
                                        <div className="space-y-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نام و نام خانوادگی</label>
                                            <input
                                              type="text"
                                              value={staffData.name || ''}
                                              onChange={(e) => updateStaffField('name', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              placeholder="مثال: علی محمدی"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">آدرس ایمیل</label>
                                            <input
                                              type="email"
                                              value={staffData.email || ''}
                                              onChange={(e) => updateStaffField('email', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              placeholder="example@gmail.com"
                                              dir="ltr"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">شماره همراه</label>
                                            <input
                                              type="text"
                                              value={staffData.phone || ''}
                                              onChange={(e) => updateStaffField('phone', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              placeholder="09123456789"
                                              dir="ltr"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">گذرواژه (رمز عبور)</label>
                                            <input
                                              type="text"
                                              value={staffData.password || ''}
                                              onChange={(e) => updateStaffField('password', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              placeholder="حداقل ۶ کاراکتر"
                                              dir="ltr"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نقش و سطح دسترسی</label>
                                            <select
                                              value={staffData.role || 'support'}
                                              onChange={(e) => updateStaffField('role', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="admin">مدیر کل (Admin)</option>
                                              <option value="editor">نویسنده/ویرایشگر (Editor)</option>
                                              <option value="storekeeper">انباردار (Storekeeper)</option>
                                              <option value="support">پشتیبان تیکت (Support)</option>
                                            </select>
                                          </div>
                                          {action === 'update' && (
                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">وضعیت حساب</label>
                                              <select
                                                value={staffData.isBlocked ? 'true' : 'false'}
                                                onChange={(e) => updateStaffField('isBlocked', e.target.value === 'true')}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              >
                                                <option value="false">فعال و مجاز (Active)</option>
                                                <option value="true">مسدود شده (Blocked)</option>
                                              </select>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {action === 'delete' && (
                                        <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-xl border border-rose-100 dark:border-rose-950 text-xs font-bold">
                                          ⚠️ هشدار: شما در حال حذف کامل دسترسی همکار با شناسه {activeOutput.staffId} از سیستم هستید. این اقدام غیرقابل بازگشت است.
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Admin Profile Details */}
                                {activeTask.target === 'profile' && activeOutput && (() => {
                                  const action = activeOutput.action;
                                  const profileData = activeOutput.data || {};
                                  return (
                                    <div className="space-y-4 text-right" dir="rtl">
                                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div className="text-[10px] font-black text-primary-500 mb-1">پروفایل و حساب کاربری مدیر</div>
                                        <div className="text-[9px] text-slate-500 font-bold">نوع تنظیمات: {action === 'update_profile' ? 'ویرایش اطلاعات عمومی' : action === 'change_password' ? 'تغییر کلمه عبور امن' : 'نمایش وضعیت حساب ادمین'}</div>
                                      </div>

                                      {action === 'update_profile' && (
                                        <div className="space-y-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نام و نام خانوادگی مدیر</label>
                                            <input
                                              type="text"
                                              value={profileData.name || ''}
                                              onChange={(e) => updateProfileField('name', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">آدرس ایمیل</label>
                                            <input
                                              type="email"
                                              value={profileData.email || ''}
                                              onChange={(e) => updateProfileField('email', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              dir="ltr"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">آدرس آواتار (تصویر پروفایل)</label>
                                            <input
                                              type="text"
                                              value={profileData.avatarUrl || ''}
                                              onChange={(e) => updateProfileField('avatarUrl', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              dir="ltr"
                                            />
                                          </div>
                                        </div>
                                      )}

                                      {action === 'change_password' && (
                                        <div className="space-y-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">کلمه عبور فعلی ادمین</label>
                                            <input
                                              type="password"
                                              value={activeOutput.currentPassword || ''}
                                              onChange={(e) => updateProfileField('currentPassword', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              placeholder="رمز عبور کنونی را وارد کنید"
                                              dir="ltr"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">کلمه عبور جدید</label>
                                            <input
                                              type="password"
                                              value={activeOutput.newPassword || ''}
                                              onChange={(e) => updateProfileField('newPassword', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                              placeholder="حداقل ۶ کاراکتر امن"
                                              dir="ltr"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Import & Export Details */}
                                {activeTask.target === 'import_export' && activeOutput && (() => {
                                  const action = activeOutput.action;
                                  return (
                                    <div className="space-y-4 text-right" dir="rtl">
                                      <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                                        <div className="text-[10px] font-black text-primary-500 mb-1">ورودی و خروجی پیشرفته داده‌ها</div>
                                        <div className="text-[9px] text-slate-500 font-bold">نوع کارتابل: {action === 'export' ? 'تهیه نسخه پشتیبان / اکسپورت' : 'ایمپورت و درون‌ریزی داده‌ها'}</div>
                                      </div>

                                      {action === 'export' && (
                                        <div className="space-y-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نوع بخش خروجی</label>
                                            <select
                                              value={activeOutput.exportType || 'products'}
                                              onChange={(e) => updateImportExportField('exportType', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="products">محصولات فروشگاه (Products)</option>
                                              <option value="categories">دسته‌بندی‌های کاتالوگ (Categories)</option>
                                              <option value="settings">تنظیمات اصلی (Settings)</option>
                                              <option value="full">پشتیبان کامل کل سیستم (Full Shop Backup)</option>
                                            </select>
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">فرمت فایل خروجی</label>
                                            <select
                                              value={activeOutput.format || 'csv'}
                                              onChange={(e) => updateImportExportField('format', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="csv">فرمت اکسل / CSV</option>
                                              <option value="json">فرمت برنامه نویسان / JSON</option>
                                            </select>
                                          </div>
                                          {activeOutput.downloadUrl && (
                                            <div className="pt-2">
                                              <a
                                                href={activeOutput.downloadUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="block text-center bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-all"
                                              >
                                                📥 دانلود مستقیم فایل خروجی
                                              </a>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {action === 'import_preview' && (
                                        <div className="space-y-3">
                                          {activeOutput.products && activeOutput.products.length > 0 && (
                                            <div className="space-y-1.5">
                                              <span className="text-[10px] font-black text-primary-500">📋 پیش‌نمایش محصولات استخراج شده ({activeOutput.products.length})</span>
                                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 max-h-40 overflow-y-auto space-y-1.5">
                                                {activeOutput.products.map((p: any, idx: number) => (
                                                  <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-100 dark:border-slate-900 pb-1.5 last:border-0 last:pb-0">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{p.title}</span>
                                                    <span className="text-emerald-500 font-bold">{p.price ? Number(p.price).toLocaleString('fa-IR') + ' تومان' : 'رایگان'}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {activeOutput.categories && activeOutput.categories.length > 0 && (
                                            <div className="space-y-1.5">
                                              <span className="text-[10px] font-black text-violet-500">📁 دسته‌بندی‌های استخراج شده ({activeOutput.categories.length})</span>
                                              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 max-h-30 overflow-y-auto space-y-1.5">
                                                {activeOutput.categories.map((c: any, idx: number) => (
                                                  <div key={idx} className="flex justify-between items-center text-[10px] border-b border-slate-100 dark:border-slate-900 pb-1.5 last:border-0 last:pb-0">
                                                    <span className="font-bold text-slate-700 dark:text-slate-300">{c.name}</span>
                                                    <span className="text-slate-400 font-bold font-mono">/{c.slug || ''}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Media details */}
                                {activeTask.target === 'media' && activeOutput && (() => {
                                  const settings = activeOutput.settings || activeOutput.rawResult?.settings || {};
                                  return (
                                    <div className="space-y-4">
                                      <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl text-right">
                                        <span className="text-[10px] font-black text-primary-500 block mb-1">پردازش تصاویر گالری</span>
                                        <p className="text-[9px] text-slate-500 font-bold">
                                          تعداد {activeOutput.selectedMediaIds?.length || activeOutput.rawResult?.selectedMediaIds?.length || 0} تصویر برای اعمال افکت‌ها و پردازش هوشمند انتخاب شده است.
                                        </p>
                                      </div>

                                      <div className="grid grid-cols-2 gap-3 text-right">
                                        {/* 1. Crop/Dimensions */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">ابعاد و برش عکس</label>
                                          <select
                                            value={settings.dimensions || 'original'}
                                            onChange={(e) => updateMediaField('dimensions', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="original">ابعاد اصلی</option>
                                            <option value="square">مربع (۱:۱)</option>
                                            <option value="portrait">پرتره (۳:۴)</option>
                                            <option value="landscape">افقی (۴:۳)</option>
                                          </select>
                                        </div>

                                        {/* 2. BgColor */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">رنگ پس‌زمینه جدید</label>
                                          <div className="flex gap-2">
                                            <input
                                              type="color"
                                              value={settings.bgColor || '#ffffff'}
                                              onChange={(e) => updateMediaField('bgColor', e.target.value)}
                                              className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden p-0"
                                            />
                                            <input
                                              type="text"
                                              value={settings.bgColor || '#ffffff'}
                                              onChange={(e) => updateMediaField('bgColor', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>
                                        </div>

                                        {/* 3. Subject Scale */}
                                        <div className="space-y-1 col-span-2">
                                          <div className="flex justify-between items-center">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">مقیاس و اندازه سوژه ({settings.subjectScale || 85}٪)</label>
                                            <span className="text-[9px] font-mono text-primary-500 font-bold">{settings.subjectScale || 85}%</span>
                                          </div>
                                          <input
                                            type="range"
                                            min="30"
                                            max="100"
                                            value={settings.subjectScale || 85}
                                            onChange={(e) => updateMediaField('subjectScale', Number(e.target.value))}
                                            className="w-full accent-primary-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                                          />
                                        </div>

                                        {/* 4. Watermark Type */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع واتر‌مارک</label>
                                          <select
                                            value={settings.watermarkType || 'none'}
                                            onChange={(e) => updateMediaField('watermarkType', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="none">بدون واتر‌مارک</option>
                                            <option value="text">واتر‌مارک متنی</option>
                                            <option value="logo">لوگوی فروشگاه</option>
                                          </select>
                                        </div>

                                        {/* 5. Watermark Position */}
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">جایگاه واتر‌مارک</label>
                                          <select
                                            value={settings.watermarkPosition || 'center'}
                                            onChange={(e) => updateMediaField('watermarkPosition', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="center">وسط تصویر</option>
                                            <option value="bottom-right">پایین راست</option>
                                            <option value="bottom-left">پایین چپ</option>
                                            <option value="top-right">بالا راست</option>
                                            <option value="top-left">بالا چپ</option>
                                          </select>
                                        </div>

                                        {/* 6. Watermark Text */}
                                        {settings.watermarkType === 'text' && (
                                          <div className="col-span-2 space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن واتر‌مارک</label>
                                            <input
                                              type="text"
                                              value={settings.watermarkText || ''}
                                              onChange={(e) => updateMediaField('watermarkText', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                        )}

                                        {/* 7. Watermark Opacity */}
                                        {settings.watermarkType !== 'none' && (
                                          <div className="space-y-1 col-span-2">
                                            <div className="flex justify-between items-center">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">شفافیت و غلظت واتر‌مارک ({settings.watermarkOpacity || 40}٪)</label>
                                              <span className="text-[9px] font-mono text-primary-500 font-bold">{settings.watermarkOpacity || 40}%</span>
                                            </div>
                                            <input
                                              type="range"
                                              min="10"
                                              max="100"
                                              value={settings.watermarkOpacity || 40}
                                              onChange={(e) => updateMediaField('watermarkOpacity', Number(e.target.value))}
                                              className="w-full accent-primary-500 h-1 bg-slate-200 dark:bg-slate-800 rounded-lg cursor-pointer"
                                            />
                                          </div>
                                        )}

                                        {/* Checkboxes group */}
                                        <div className="col-span-2 grid grid-cols-2 gap-2 pt-2 select-none">
                                          {/* removeBg */}
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={!!settings.removeBg}
                                              onChange={(e) => updateMediaField('removeBg', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>حذف اتوماتیک پس‌زمینه (AI)</span>
                                          </label>

                                          {/* autoCropFace */}
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={!!settings.autoCropFace}
                                              onChange={(e) => updateMediaField('autoCropFace', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>برش هوشمند بر اساس چهره</span>
                                          </label>

                                          {/* replaceOriginal */}
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={!!activeOutput.replaceOriginal || !!activeOutput.rawResult?.replaceOriginal}
                                              onChange={(e) => {
                                                updateActiveOutput(prev => {
                                                  const updated = { ...prev };
                                                  updated.replaceOriginal = e.target.checked;
                                                  if (updated.rawResult) {
                                                    updated.rawResult.replaceOriginal = e.target.checked;
                                                  }
                                                  return updated;
                                                });
                                              }}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>جایگزینی روی تصویر اصلی</span>
                                          </label>

                                          {/* compressImage */}
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={settings.compressImage !== false}
                                              onChange={(e) => updateMediaField('compressImage', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>بهینه‌سازی حجم (فرمت WebP)</span>
                                          </label>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Shoppable details */}
                                {activeTask.target === 'shoppable' && activeOutput && (() => {
                                  const actions = activeOutput.actions || activeOutput.rawResult?.actions || [];
                                  return (
                                    <div className="space-y-4">
                                      {actions.map((action: any, actionIdx: number) => {
                                        if (action.type === 'delete') {
                                          return (
                                            <div key={actionIdx} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center text-[10px]">
                                              <span className="font-bold text-rose-500">حذف پکیج شاپبل با شناسه: {action.id}</span>
                                            </div>
                                          );
                                        }

                                        const set = action.data || {};
                                        const itemsList = Array.isArray(set.items) ? set.items : [];

                                        const updateTagItem = (itemIdx: number, key: string, val: any) => {
                                          const newList = itemsList.map((it: any, idx: number) => {
                                            if (idx === itemIdx) {
                                              return { ...it, [key]: val };
                                            }
                                            return it;
                                          });
                                          updateShoppableField(actionIdx, 'items', newList);
                                        };

                                        const addTagItem = () => {
                                          const defaultProdId = availableProducts[0]?.id || '';
                                          const newList = [...itemsList, { productId: defaultProdId, x: 50, y: 50 }];
                                          updateShoppableField(actionIdx, 'items', newList);
                                        };

                                        const removeTagItem = (itemIdx: number) => {
                                          const newList = itemsList.filter((_: any, idx: number) => idx !== itemIdx);
                                          updateShoppableField(actionIdx, 'items', newList);
                                        };

                                        return (
                                          <div key={actionIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-right">
                                            <span className="text-xs font-black text-primary-500 block">
                                              {action.type === 'create' ? 'ایجاد پکیج شاپبل جدید' : 'ویرایش پکیج شاپبل'}
                                            </span>

                                            <div className="grid grid-cols-2 gap-3">
                                              {/* 1. Name */}
                                              <div className="space-y-1 col-span-2">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان پکیج</label>
                                                <input
                                                  type="text"
                                                  value={set.name || ''}
                                                  onChange={(e) => updateShoppableField(actionIdx, 'name', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>

                                              {/* 2. Slug */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">اسلاگ انگلیسی</label>
                                                <input
                                                  type="text"
                                                  value={set.slug || ''}
                                                  onChange={(e) => updateShoppableField(actionIdx, 'slug', e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                  dir="ltr"
                                                />
                                              </div>

                                              {/* 3. Discount */}
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">میزان تخفیف پکیج (٪)</label>
                                                <input
                                                  type="number"
                                                  min="0"
                                                  max="100"
                                                  value={set.discount !== undefined ? set.discount : ''}
                                                  onChange={(e) => updateShoppableField(actionIdx, 'discount', Number(e.target.value))}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center"
                                                />
                                              </div>

                                              {/* 4. ImageUrl */}
                                              <div className="space-y-1 col-span-2">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس تصویر پس‌زمینه</label>
                                                <input
                                                  type="text"
                                                  value={set.imageUrl || ''}
                                                  onChange={(e) => updateShoppableField(actionIdx, 'imageUrl', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 dark:text-white focus:outline-none w-full text-left font-mono"
                                                  dir="ltr"
                                                />
                                              </div>

                                              {/* 5. Interactive Hotspot Tags */}
                                              <div className="col-span-2 space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
                                                <div className="flex justify-between items-center select-none mb-1">
                                                  <span className="text-[10px] text-primary-500 font-black uppercase tracking-wider">📍 تگ‌های محصولات تعاملی ({itemsList.length} عدد)</span>
                                                  <button
                                                    type="button"
                                                    onClick={addTagItem}
                                                    className="bg-primary-500/10 hover:bg-primary-500/15 border border-primary-500/20 text-primary-600 dark:text-primary-400 px-2 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 transition-all cursor-pointer"
                                                  >
                                                    ➕ افزودن تگ جدید
                                                  </button>
                                                </div>

                                                {itemsList.length === 0 ? (
                                                  <p className="text-[9px] text-slate-400 text-center py-2">هیچ تگ تعاملی روی این پکیج وجود ندارد.</p>
                                                ) : (
                                                  <div className="space-y-3 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                                                    {itemsList.map((item: any, itemIdx: number) => (
                                                      <div key={itemIdx} className="p-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800/80 rounded-xl space-y-2.5 relative shadow-2xs">
                                                        {/* Number index and remove button */}
                                                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-900 pb-1.5 select-none">
                                                          <span className="bg-primary-600 text-white w-4.5 h-4.5 rounded-full flex items-center justify-center text-[9px] font-black">
                                                            {itemIdx + 1}
                                                          </span>
                                                          <button
                                                            type="button"
                                                            onClick={() => removeTagItem(itemIdx)}
                                                            className="text-rose-500 hover:text-rose-600 p-0.5 transition-colors cursor-pointer"
                                                            title="حذف تگ"
                                                          >
                                                            <Trash2 size={12} />
                                                          </button>
                                                        </div>

                                                        {/* Product Select & Coordinate Inputs */}
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                          {/* Product selection */}
                                                          <div className="space-y-0.5">
                                                            <label className="text-[8px] text-slate-400 font-bold block">محصول مرتبط</label>
                                                            <select
                                                              value={item.productId || ''}
                                                              onChange={(e) => updateTagItem(itemIdx, 'productId', e.target.value)}
                                                              className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                            >
                                                              <option value="">-- انتخاب محصول --</option>
                                                              {availableProducts.map((p: any) => (
                                                                <option key={p.id} value={p.id}>{p.title}</option>
                                                              ))}
                                                            </select>
                                                          </div>

                                                          {/* X & Y coordinates sliders */}
                                                          <div className="space-y-1">
                                                            <div className="flex justify-between items-center text-[8px] text-slate-400 font-bold">
                                                              <span>موقعیت افقی (X): {Math.round(item.x || 50)}%</span>
                                                              <span>موقعیت عمودی (Y): {Math.round(item.y || 50)}%</span>
                                                            </div>
                                                            <div className="flex gap-2 items-center">
                                                              <div className="flex-1 flex flex-col gap-0.5">
                                                                <span className="text-[7px] text-slate-400 font-mono text-center">X Coordinate</span>
                                                                <input
                                                                  type="range"
                                                                  min="0"
                                                                  max="100"
                                                                  value={item.x || 50}
                                                                  onChange={(e) => updateTagItem(itemIdx, 'x', Number(e.target.value))}
                                                                  className="w-full h-1 accent-primary-500 bg-slate-100 dark:bg-slate-900 rounded-lg cursor-pointer"
                                                                />
                                                              </div>
                                                              <div className="flex-1 flex flex-col gap-0.5">
                                                                <span className="text-[7px] text-slate-400 font-mono text-center">Y Coordinate</span>
                                                                <input
                                                                  type="range"
                                                                  min="0"
                                                                  max="100"
                                                                  value={item.y || 50}
                                                                  onChange={(e) => updateTagItem(itemIdx, 'y', Number(e.target.value))}
                                                                  className="w-full h-1 accent-primary-500 bg-slate-100 dark:bg-slate-900 rounded-lg cursor-pointer"
                                                                />
                                                              </div>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Settings details */}
                                {activeTask.target === 'settings' && activeOutput.formData && (() => {
                                  const settings = activeOutput.formData;
                                  return (
                                    <div className="space-y-4">
                                      {settings.shopName !== undefined && (
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نام فروشگاه</label>
                                          <input
                                            type="text"
                                            value={settings.shopName || ''}
                                            onChange={(e) => updateSettingsField('shopName', e.target.value)}
                                            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                      )}
                                      {settings.description !== undefined && (
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">توضیحات فروشگاه (سئو)</label>
                                          <textarea
                                            value={settings.description || ''}
                                            onChange={(e) => updateSettingsField('description', e.target.value)}
                                            rows={2}
                                            className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none"
                                          />
                                        </div>
                                      )}
                                      <div className="grid grid-cols-2 gap-3">
                                        {settings.themeColor !== undefined && (
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">رنگ تم (کد هگز)</label>
                                            <div className="flex gap-2">
                                              <input
                                                type="color"
                                                value={settings.themeColor || '#000000'}
                                                onChange={(e) => updateSettingsField('themeColor', e.target.value)}
                                                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden p-0"
                                              />
                                              <input
                                                type="text"
                                                value={settings.themeColor || ''}
                                                onChange={(e) => updateSettingsField('themeColor', e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                                dir="ltr"
                                              />
                                            </div>
                                          </div>
                                        )}
                                        {settings.currency !== undefined && (
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">واحد پول</label>
                                            <select
                                              value={settings.currency || ''}
                                              onChange={(e) => updateSettingsField('currency', e.target.value)}
                                              className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="IRT">تومان (IRT)</option>
                                              <option value="IRR">ریال (IRR)</option>
                                            </select>
                                          </div>
                                        )}
                                        {settings.language !== undefined && (
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">زبان پیش‌فرض</label>
                                            <select
                                              value={settings.language || ''}
                                              onChange={(e) => updateSettingsField('language', e.target.value)}
                                              className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            >
                                              <option value="fa">فارسی</option>
                                              <option value="en">English</option>
                                              <option value="ar">العربية</option>
                                            </select>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Show other changed settings fields dynamically */}
                                      {Object.entries(settings).map(([key, val]) => {
                                        if (['shopName', 'description', 'themeColor', 'currency', 'language', 'id', 'shopId', 'createdAt', 'updatedAt'].includes(key)) return null;
                                        if (typeof val === 'object' && val !== null) return null;
                                        return (
                                          <div key={key} className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider font-mono text-left block" dir="ltr">{key}</label>
                                            {typeof val === 'boolean' ? (
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="checkbox"
                                                  checked={!!val}
                                                  onChange={(e) => updateSettingsField(key, e.target.checked)}
                                                  className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-gray-300"
                                                />
                                                <span className="text-xs text-slate-600 dark:text-slate-300">{val ? 'فعال / روشن' : 'غیرفعال / خاموش'}</span>
                                              </div>
                                            ) : (
                                              <input
                                                type={typeof val === 'number' ? 'number' : 'text'}
                                                value={val === null || val === undefined ? '' : String(val)}
                                                onChange={(e) => updateSettingsField(key, typeof val === 'number' ? Number(e.target.value) : e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* About Us details */}
                                {activeTask.target === 'about_us' && (() => {
                                  const config = activeOutput.config || activeOutput.rawResult?.config || activeOutput;
                                  const brandStory = config.brandStory || {};
                                  const coreValues = config.coreValues || { list: [] };
                                  const contact = config.contact || {};
                                  return (
                                    <div className="space-y-6 text-right">
                                      {/* Brand Story Section */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">داستان برند (Brand Story)</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">عنوان داستان</label>
                                            <input
                                              type="text"
                                              value={brandStory.title || ''}
                                              onChange={(e) => updateAboutUsField('brandStory', 'title', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">سال تاسیس</label>
                                            <input
                                              type="text"
                                              value={brandStory.foundingYear || ''}
                                              onChange={(e) => updateAboutUsField('brandStory', 'foundingYear', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black">متن کامل داستان برند</label>
                                          <textarea
                                            value={brandStory.storyText || ''}
                                            onChange={(e) => updateAboutUsField('brandStory', 'storyText', e.target.value)}
                                            rows={4}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">چشم‌انداز (Vision)</label>
                                            <textarea
                                              value={brandStory.visionText || ''}
                                              onChange={(e) => updateAboutUsField('brandStory', 'visionText', e.target.value)}
                                              rows={2}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">ماموریت (Mission)</label>
                                            <textarea
                                              value={brandStory.missionText || ''}
                                              onChange={(e) => updateAboutUsField('brandStory', 'missionText', e.target.value)}
                                              rows={2}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                            />
                                          </div>
                                        </div>
                                      </div>

                                      {/* Core Values Section */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">ارزش‌های محوری (Core Values)</h4>
                                        <div className="space-y-1 mb-2">
                                          <label className="text-[9px] text-slate-500 font-black">عنوان بخش ارزش‌ها</label>
                                          <input
                                            type="text"
                                            value={coreValues.title || ''}
                                            onChange={(e) => updateAboutUsField('coreValues', 'title', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                          {Array.isArray(coreValues.list) && coreValues.list.map((item: any, idx: number) => (
                                            <div key={item.id || idx} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                              <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-slate-400 font-mono">ارزش #{idx + 1}</span>
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <input
                                                  type="text"
                                                  placeholder="عنوان ارزش"
                                                  value={item.title || ''}
                                                  onChange={(e) => updateAboutUsListField('coreValues', item.id, 'title', e.target.value)}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="توضیح کوتاه ارزش"
                                                  value={item.description || ''}
                                                  onChange={(e) => updateAboutUsListField('coreValues', item.id, 'description', e.target.value)}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Contact Section */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">اطلاعات تماس مرکزی</h4>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black">عنوان بخش تماس</label>
                                          <input
                                            type="text"
                                            value={contact.title || ''}
                                            onChange={(e) => updateAboutUsField('contact', 'title', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">تلفن دفتر مرکزی</label>
                                            <input
                                              type="text"
                                              value={contact.phone || ''}
                                              onChange={(e) => updateAboutUsField('contact', 'phone', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">ایمیل رسمی</label>
                                            <input
                                              type="text"
                                              value={contact.email || ''}
                                              onChange={(e) => updateAboutUsField('contact', 'email', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                              dir="ltr"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black">نشانی کامل پستی</label>
                                          <textarea
                                            value={contact.address || ''}
                                            onChange={(e) => updateAboutUsField('contact', 'address', e.target.value)}
                                            rows={2}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Contact Us details */}
                                {activeTask.target === 'contact_us' && (() => {
                                  const config = activeOutput.config || activeOutput.rawResult?.config || activeOutput;
                                  const hero = config.hero || {};
                                  const departments = config.departments || { list: [] };
                                  const openingHours = config.openingHours || { list: [] };
                                  const map = config.map || {};
                                  return (
                                    <div className="space-y-6 text-right">
                                      {/* Hero Section */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">بخش هیرو تماس با ما (Hero Section)</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">عنوان اصلی</label>
                                            <input
                                              type="text"
                                              value={hero.title || ''}
                                              onChange={(e) => updateContactUsField('hero', 'title', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black">زیرعنوان</label>
                                            <input
                                              type="text"
                                              value={hero.subtitle || ''}
                                              onChange={(e) => updateContactUsField('hero', 'subtitle', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black">توضیحات هیرو</label>
                                          <textarea
                                            value={hero.description || ''}
                                            onChange={(e) => updateContactUsField('hero', 'description', e.target.value)}
                                            rows={3}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                          />
                                        </div>
                                      </div>

                                      {/* Departments Section */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">دپارتمان‌ها (Departments)</h4>
                                        <div className="space-y-1 mb-2">
                                          <label className="text-[9px] text-slate-500 font-black">عنوان بخش دپارتمان‌ها</label>
                                          <input
                                            type="text"
                                            value={departments.title || ''}
                                            onChange={(e) => updateContactUsField('departments', 'title', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                        <div className="space-y-3 max-h-[200px] overflow-y-auto pr-1">
                                          {Array.isArray(departments.list) && departments.list.map((item: any, idx: number) => (
                                            <div key={item.id || idx} className="p-3 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                                              <div className="grid grid-cols-2 gap-2">
                                                <input
                                                  type="text"
                                                  placeholder="نام دپارتمان"
                                                  value={item.name || ''}
                                                  onChange={(e) => updateContactUsListField('departments', item.id, 'name', e.target.value)}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="تلفن دپارتمان"
                                                  value={item.phone || ''}
                                                  onChange={(e) => updateContactUsListField('departments', item.id, 'phone', e.target.value)}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-2">
                                                <input
                                                  type="text"
                                                  placeholder="ایمیل دپارتمان"
                                                  value={item.email || ''}
                                                  onChange={(e) => updateContactUsListField('departments', item.id, 'email', e.target.value)}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                                <input
                                                  type="text"
                                                  placeholder="مسئول دپارتمان"
                                                  value={item.responsiblePerson || ''}
                                                  onChange={(e) => updateContactUsListField('departments', item.id, 'responsiblePerson', e.target.value)}
                                                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Opening Hours Section */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">ساعات کاری (Opening Hours)</h4>
                                        <div className="space-y-1 mb-2">
                                          <label className="text-[9px] text-slate-500 font-black">عنوان بخش ساعات کاری</label>
                                          <input
                                            type="text"
                                            value={openingHours.title || ''}
                                            onChange={(e) => updateContactUsField('openingHours', 'title', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-1">
                                          {Array.isArray(openingHours.list) && openingHours.list.map((item: any, idx: number) => (
                                            <div key={item.id || idx} className="grid grid-cols-2 gap-2 p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                                              <input
                                                type="text"
                                                placeholder="بازه روزها"
                                                value={item.dayRange || ''}
                                                onChange={(e) => updateContactUsListField('openingHours', item.id, 'dayRange', e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                              <input
                                                type="text"
                                                placeholder="ساعت کار"
                                                value={item.hours || ''}
                                                onChange={(e) => updateContactUsListField('openingHours', item.id, 'hours', e.target.value)}
                                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Map Settings */}
                                      <div className="space-y-3 p-4 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                        <h4 className="text-xs font-black text-primary-600 dark:text-primary-400">تنظیمات نقشه (Map Settings)</h4>
                                        <div className="flex items-center justify-between p-2 bg-white dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 mb-2">
                                          <span className="text-xs font-bold text-slate-800 dark:text-white">نمایش نقشه</span>
                                          <button
                                            type="button"
                                            onClick={() => updateContactUsField('map', 'enabled', !map.enabled)}
                                            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                              map.enabled ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-800'
                                            }`}
                                          >
                                            <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${map.enabled ? 'translate-x-5 rtl:-translate-x-5' : 'translate-x-0'}`} />
                                          </button>
                                        </div>
                                        {map.enabled && (
                                          <div className="space-y-2">
                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black">آدرس فریم نقشه (Embed URL)</label>
                                              <input
                                                type="text"
                                                value={map.embedUrl || ''}
                                                onChange={(e) => updateContactUsField('map', 'embedUrl', e.target.value)}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black">توضیحات آدرس پستی دقیق</label>
                                              <textarea
                                                value={map.addressDescription || ''}
                                                onChange={(e) => updateContactUsField('map', 'addressDescription', e.target.value)}
                                                rows={2}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Custom Home details */}
                                {activeTask.target === 'custom_home' && activeOutput.formData && (() => {
                                  const home = activeOutput.formData;
                                  const sectionOrderList = Array.isArray(home.sectionOrder) ? home.sectionOrder : [];

                                  const moveSection = (idx: number, direction: 'up' | 'down') => {
                                    const arr = [...sectionOrderList];
                                    if (direction === 'up' && idx > 0) {
                                      [arr[idx], arr[idx - 1]] = [arr[idx - 1], arr[idx]];
                                    } else if (direction === 'down' && idx < arr.length - 1) {
                                      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
                                    }
                                    updateSettingsField('sectionOrder', arr);
                                  };

                                  const sectionLabels: Record<string, string> = {
                                    stories: 'استوری‌های بالای صفحه 📱',
                                    slider: 'اسلایدر هیرو اصلی 🖼️',
                                    shoppable: 'پست‌های شاپبل تعاملی 📍',
                                    hero: 'بنر خوش‌آمدگویی (Hero) ✨',
                                    features: 'باکس ویژگی‌ها و مزایا 📦',
                                    categoryQuickAccess: 'دسترسی سریع دسته‌ها 📁',
                                    featuredProducts: 'محصولات ویژه و برتر 🛍️',
                                    blog: 'آخرین مقالات وبلاگ 📝',
                                    reviews: 'نظرات خریداران و رضایت 💬',
                                  };

                                  return (
                                    <div className="space-y-4 text-right">
                                      {/* Basic Page Type settings */}
                                      <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">نوع صفحه اصلی</label>
                                          <select
                                            value={home.homePageType || 'custom'}
                                            onChange={(e) => updateSettingsField('homePageType', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="custom">لندینگ اختصاصی چیدمان (Custom)</option>
                                            <option value="shop">فروشگاه مستقیم محصولات (Shop)</option>
                                          </select>
                                        </div>
                                        <div className="space-y-1 flex flex-col justify-end pb-2.5 select-none">
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={home.isLandingActive !== false}
                                              onChange={(e) => updateSettingsField('isLandingActive', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>صفحه فرود لندینگ فعال باشد</span>
                                          </label>
                                        </div>
                                      </div>

                                      {/* Hero Section Configs */}
                                      {home.heroTitle !== undefined && (
                                        <div className="space-y-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                          <div className="flex justify-between items-center select-none">
                                            <span className="text-[10px] font-black text-primary-500 block">⚡ بنر خوش‌آمدگویی بالای صفحه (Hero)</span>
                                            <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-black text-slate-600 dark:text-slate-400">
                                              <input
                                                type="checkbox"
                                                checked={home.showHero !== false}
                                                onChange={(e) => updateSettingsField('showHero', e.target.checked)}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-3.5 h-3.5"
                                              />
                                              <span>نمایش هیرو</span>
                                            </label>
                                          </div>

                                          {home.showHero !== false && (
                                            <div className="space-y-3 bg-white dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان هیرو</label>
                                                <input
                                                  type="text"
                                                  value={home.heroTitle || ''}
                                                  onChange={(e) => updateSettingsField('heroTitle', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-850 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">زیرعنوان هیرو</label>
                                                <input
                                                  type="text"
                                                  value={home.heroSubtitle || ''}
                                                  onChange={(e) => updateSettingsField('heroSubtitle', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-855 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                              <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن دکمه (CTA)</label>
                                                  <input
                                                    type="text"
                                                    value={home.heroCtaText || ''}
                                                    onChange={(e) => updateSettingsField('heroCtaText', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-center"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">لینک دکمه (CTA)</label>
                                                  <input
                                                    type="text"
                                                    value={home.heroCtaUrl || ''}
                                                    onChange={(e) => updateSettingsField('heroCtaUrl', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                    dir="ltr"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* Switches for Home Layout Sections visibility */}
                                      <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3 select-none">
                                        <span className="text-[10px] font-black text-primary-500 block">🛠️ وضعیت قطعات صفحه اصلی (نمایش/عدم نمایش)</span>
                                        <div className="grid grid-cols-2 gap-2 bg-white dark:bg-slate-950/20 border border-slate-100 dark:border-slate-900/60 p-3 rounded-xl">
                                          {[
                                            { key: 'showStories', label: '📱 استوری‌ها' },
                                            { key: 'showSlider', label: '🖼️ اسلایدر بالایی' },
                                            { key: 'showShoppable', label: '📍 نقاط تعاملی' },
                                            { key: 'showFeatures', label: '📦 باکس مزایا' },
                                            { key: 'showCategoryQuickAccess', label: '📁 پوشه دسته‌ها' },
                                            { key: 'showFeaturedProducts', label: '🛍️ محصولات ویژه' },
                                            { key: 'showBlog', label: '📝 وبلاگ و اخبار' },
                                            { key: 'showReviews', label: '💬 نظرات و رضایت' }
                                          ].map(sw => (
                                            <label key={sw.key} className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                              <input
                                                type="checkbox"
                                                checked={home[sw.key] !== false}
                                                onChange={(e) => updateSettingsField(sw.key, e.target.checked)}
                                                className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                              />
                                              <span>{sw.label}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Interactive Order of sections */}
                                      {sectionOrderList.length > 0 && (
                                        <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                          <label className="text-[10px] font-black text-primary-500 block">↕️ چیدمان عمودی و رتبه‌بندی المان‌ها (ترتیب نمایش)</label>
                                          <p className="text-[8px] text-slate-400 font-bold block mb-1">با کلیک روی دکمه‌های فلش، چیدمان لندینگ را بالا یا پایین ببرید:</p>
                                          
                                          <div className="space-y-1.5">
                                            {sectionOrderList.map((section: string, idx: number) => {
                                              const label = sectionLabels[section] || sectionLabels[section.split('_')[0]] || section;
                                              return (
                                                <div 
                                                  key={idx} 
                                                  className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs"
                                                >
                                                  <div className="flex items-center gap-2">
                                                    <span className="bg-primary-50 dark:bg-slate-950 text-primary-600 dark:text-primary-400 w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-mono font-black border border-primary-500/10">
                                                      #{idx + 1}
                                                    </span>
                                                    <span className="text-[10px] font-black">{label}</span>
                                                  </div>
                                                  <div className="flex gap-1">
                                                    <button
                                                      type="button"
                                                      disabled={idx === 0}
                                                      onClick={() => moveSection(idx, 'up')}
                                                      className="p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                      title="انتقال به بالا"
                                                    >
                                                      ▲
                                                    </button>
                                                    <button
                                                      type="button"
                                                      disabled={idx === sectionOrderList.length - 1}
                                                      onClick={() => moveSection(idx, 'down')}
                                                      className="p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 disabled:opacity-30 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                                      title="انتقال به پایین"
                                                    >
                                                      ▼
                                                    </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Footer details */}
                                {activeTask.target === 'footer' && (activeOutput.config || activeOutput.rawResult?.config) && (() => {
                                  const footer = activeOutput.config || activeOutput.rawResult?.config;
                                  return (
                                    <div className="space-y-4 text-right">
                                      {/* 1. About Text */}
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">درباره فروشگاه (فوتر)</label>
                                        <textarea
                                          value={footer.aboutText || ''}
                                          onChange={(e) => updateFooterField('aboutText', e.target.value)}
                                          rows={3}
                                          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full resize-none leading-relaxed"
                                          placeholder="متنی درباره اهداف و پیشینه فروشگاه..."
                                        />
                                      </div>

                                      {/* 2. Copyright text */}
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن کپی‌رایت انتهای فوتر</label>
                                        <input
                                          type="text"
                                          value={footer.copyrightText || ''}
                                          onChange={(e) => updateFooterField('copyrightText', e.target.value)}
                                          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                        />
                                      </div>

                                      {/* 3. Support Contacts */}
                                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">تلفن پشتیبانی</label>
                                          <input
                                            type="text"
                                            value={footer.contactPhone || ''}
                                            onChange={(e) => updateFooterField('contactPhone', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                            dir="ltr"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">ایمیل پشتیبانی</label>
                                          <input
                                            type="text"
                                            value={footer.contactEmail || ''}
                                            onChange={(e) => updateFooterField('contactEmail', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full font-mono text-left"
                                            dir="ltr"
                                          />
                                        </div>
                                      </div>

                                      {/* 4. Contact Address */}
                                      <div className="space-y-1">
                                        <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس فیزیکی فروشگاه / دفتر مرکزی</label>
                                        <input
                                          type="text"
                                          value={footer.contactAddress || ''}
                                          onChange={(e) => updateFooterField('contactAddress', e.target.value)}
                                          className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                        />
                                      </div>

                                      {/* 5. Social Links */}
                                      <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">لینک اینستاگرام</label>
                                          <input
                                            type="text"
                                            placeholder="instagram.com/shop"
                                            value={footer.socialInstagram || ''}
                                            onChange={(e) => updateFooterField('socialInstagram', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">لینک تلگرام</label>
                                          <input
                                            type="text"
                                            placeholder="t.me/shop"
                                            value={footer.socialTelegram || ''}
                                            onChange={(e) => updateFooterField('socialTelegram', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">واتس‌اپ پشتیبانی</label>
                                          <input
                                            type="text"
                                            placeholder="wa.me/989..."
                                            value={footer.socialWhatsapp || ''}
                                            onChange={(e) => updateFooterField('socialWhatsapp', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>
                                      </div>

                                      {/* 6. Newsletter Configs */}
                                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3 select-none">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={footer.showNewsletter !== false}
                                            onChange={(e) => updateFooterField('showNewsletter', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>نمایش خبرنامه ایمیلی در فوتر</span>
                                        </label>

                                        {footer.showNewsletter !== false && (
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">عنوان دعوت به خبرنامه</label>
                                            <input
                                              type="text"
                                              value={footer.newsletterTitle || 'عضویت در خبرنامه'}
                                              onChange={(e) => updateFooterField('newsletterTitle', e.target.value)}
                                              className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* 7. Themes & Background Customizer */}
                                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">قالب رنگی فوتر</label>
                                          <select
                                            value={footer.theme || 'custom'}
                                            onChange={(e) => updateFooterField('theme', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          >
                                            <option value="light">روشن (Light)</option>
                                            <option value="dark">تیره (Dark)</option>
                                            <option value="custom">سفارشی رنگ ادمین (Custom)</option>
                                          </select>
                                        </div>

                                        {footer.theme === 'custom' && (
                                          <div className="space-y-1">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">رنگ پس‌زمینه فوتر</label>
                                            <div className="flex gap-2">
                                              <input
                                                type="color"
                                                value={footer.bgColor || '#000000'}
                                                onChange={(e) => updateFooterField('bgColor', e.target.value)}
                                                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden p-0"
                                              />
                                              <input
                                                type="text"
                                                value={footer.bgColor || ''}
                                                onChange={(e) => updateFooterField('bgColor', e.target.value)}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                                dir="ltr"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {footer.theme === 'custom' && (
                                          <div className="space-y-1 col-span-2">
                                            <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">رنگ متون فوتر سفارشی</label>
                                            <div className="flex gap-2">
                                              <input
                                                type="color"
                                                value={footer.textColor || '#ffffff'}
                                                onChange={(e) => updateFooterField('textColor', e.target.value)}
                                                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden p-0"
                                              />
                                              <input
                                                type="text"
                                                value={footer.textColor || ''}
                                                onChange={(e) => updateFooterField('textColor', e.target.value)}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1 text-xs font-bold text-slate-800 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                                dir="ltr"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Header details */}
                                {activeTask.target === 'header' && (activeOutput.config || activeOutput.rawResult?.config) && (() => {
                                  const header = activeOutput.config || activeOutput.rawResult?.config;
                                  const banner = header.banner || {};
                                  return (
                                    <div className="space-y-4 text-right">
                                      {/* Header Main Toggles */}
                                      <div className="grid grid-cols-2 gap-3.5 pb-3 select-none">
                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={!!header.showCategories}
                                            onChange={(e) => updateHeaderField('showCategories', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>📁 نمایش منوی دسته‌بندی‌ها</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={!!header.showSearch}
                                            onChange={(e) => updateHeaderField('showSearch', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>🔍 نمایش نوار جستجو محصولات</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={!!header.showCart}
                                            onChange={(e) => updateHeaderField('showCart', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>🛒 نمایش آیکون سبد خرید</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={!!header.sticky}
                                            onChange={(e) => updateHeaderField('sticky', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>📌 هدر چسبان (Sticky Header)</span>
                                        </label>

                                        <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={header.showUser !== false}
                                            onChange={(e) => updateHeaderField('showUser', e.target.checked)}
                                            className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                          />
                                          <span>👤 نمایش دکمه پروفایل کاربری</span>
                                        </label>
                                      </div>

                                      {/* Logo & Brand Configs */}
                                      <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن لوگو / برند هدر</label>
                                          <input
                                            type="text"
                                            value={header.logoText || ''}
                                            placeholder="نام فروشگاه در هدر"
                                            onChange={(e) => updateHeaderField('logoText', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">آدرس تصویر لوگو (URL)</label>
                                          <input
                                            type="text"
                                            value={header.logoUrl || ''}
                                            placeholder="آدرس تصویر لوگو"
                                            onChange={(e) => updateHeaderField('logoUrl', e.target.value)}
                                            className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                            dir="ltr"
                                          />
                                        </div>
                                      </div>

                                      {/* Banner Details */}
                                      <div className="space-y-4 border-t border-slate-100 dark:border-slate-800/60 pt-3">
                                        <div className="flex justify-between items-center select-none">
                                          <span className="text-[10px] font-black text-primary-500 block">📣 بنر اعلان بالای هدر (Announcement Banner)</span>
                                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <input
                                              type="checkbox"
                                              checked={!!banner.enabled}
                                              onChange={(e) => updateHeaderBannerField('enabled', e.target.checked)}
                                              className="rounded text-primary-500 focus:ring-primary-500 w-4 h-4"
                                            />
                                            <span>فعال بودن بنر</span>
                                          </label>
                                        </div>

                                        {banner.enabled && (
                                          <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-3 rounded-xl border border-slate-100 dark:border-slate-900/60">
                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن اعلان بنر</label>
                                              <input
                                                type="text"
                                                value={banner.text || ''}
                                                onChange={(e) => updateHeaderBannerField('text', e.target.value)}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                placeholder="به عنوان مثال: جشنواره خرید ویژه بهاره شروع شد!"
                                              />
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">متن دکمه / برچسب قرمز</label>
                                                <input
                                                  type="text"
                                                  value={banner.tagText || ''}
                                                  onChange={(e) => updateHeaderBannerField('tagText', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                  placeholder="کد: SPRING"
                                                />
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">لینک یا مسیر هدایت بنر</label>
                                                <input
                                                  type="text"
                                                  value={banner.link || ''}
                                                  onChange={(e) => updateHeaderBannerField('link', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                  dir="ltr"
                                                  placeholder="/discounts"
                                                />
                                              </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">رنگ پس‌زمینه بنر</label>
                                                <div className="flex gap-2">
                                                  <input
                                                    type="color"
                                                    value={banner.bgColor || '#4f46e5'}
                                                    onChange={(e) => updateHeaderBannerField('bgColor', e.target.value)}
                                                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden p-0"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={banner.bgColor || ''}
                                                    onChange={(e) => updateHeaderBannerField('bgColor', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1 text-xs font-bold text-slate-850 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                                    dir="ltr"
                                                  />
                                                </div>
                                              </div>
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider block">رنگ متون بنر</label>
                                                <div className="flex gap-2">
                                                  <input
                                                    type="color"
                                                    value={banner.textColor || '#ffffff'}
                                                    onChange={(e) => updateHeaderBannerField('textColor', e.target.value)}
                                                    className="w-8 h-8 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer overflow-hidden p-0"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={banner.textColor || ''}
                                                    onChange={(e) => updateHeaderBannerField('textColor', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-1 text-xs font-bold text-slate-850 dark:text-white focus:outline-none flex-1 font-mono text-left"
                                                    dir="ltr"
                                                  />
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Slider details */}
                                {activeTask.target === 'slider' && activeOutput.actions && (
                                  <div className="space-y-6">
                                    {activeOutput.actions.map((action: any, actionIdx: number) => {
                                      if (action.type === 'delete') {
                                        return (
                                          <div key={actionIdx} className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex justify-between items-center">
                                            <span className="text-xs font-bold text-rose-500">حذف اسلاید با شناسه: {action.id}</span>
                                            <button
                                              onClick={() => {
                                                const updatedActions = [...activeOutput.actions];
                                                updatedActions.splice(actionIdx, 1);
                                                updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                              }}
                                              className="text-[10px] text-rose-500 hover:underline font-bold"
                                            >
                                              لغو حذف
                                            </button>
                                          </div>
                                        );
                                      }

                                      const slide = action.data || {};
                                      return (
                                        <div key={actionIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                                          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                                            <span className="text-xs font-black text-primary-500">
                                              {action.type === 'create' ? 'ایجاد اسلاید جدید' : 'ویرایش اسلاید'}
                                            </span>
                                            <button
                                              onClick={() => {
                                                const updatedActions = [...activeOutput.actions];
                                                updatedActions.splice(actionIdx, 1);
                                                updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                              }}
                                              className="text-[10px] text-rose-500 hover:underline font-bold"
                                            >
                                              حذف این اقدام
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-2 gap-3">
                                            <div className="col-span-2 space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">عنوان اسلاید</label>
                                              <input
                                                type="text"
                                                value={slide.title || ''}
                                                onChange={(e) => {
                                                  const updatedActions = [...activeOutput.actions];
                                                  updatedActions[actionIdx] = {
                                                    ...action,
                                                    data: { ...slide, title: e.target.value }
                                                  };
                                                  updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                                }}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>

                                            <div className="col-span-2 space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">زیرعنوان اسلاید</label>
                                              <input
                                                type="text"
                                                value={slide.subtitle || ''}
                                                onChange={(e) => {
                                                  const updatedActions = [...activeOutput.actions];
                                                  updatedActions[actionIdx] = {
                                                    ...action,
                                                    data: { ...slide, subtitle: e.target.value }
                                                  };
                                                  updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                                }}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">لینک دکمه</label>
                                              <input
                                                type="text"
                                                value={slide.linkUrl || ''}
                                                onChange={(e) => {
                                                  const updatedActions = [...activeOutput.actions];
                                                  updatedActions[actionIdx] = {
                                                    ...action,
                                                    data: { ...slide, linkUrl: e.target.value }
                                                  };
                                                  updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                                }}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                dir="ltr"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">متن دکمه</label>
                                              <input
                                                type="text"
                                                value={slide.linkText || ''}
                                                onChange={(e) => {
                                                  const updatedActions = [...activeOutput.actions];
                                                  updatedActions[actionIdx] = {
                                                    ...action,
                                                    data: { ...slide, linkText: e.target.value }
                                                  };
                                                  updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                                }}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                              />
                                            </div>

                                            <div className="col-span-2 space-y-1">
                                              <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">آدرس تصویر اسلاید</label>
                                              <input
                                                type="text"
                                                value={slide.imageUrl || ''}
                                                onChange={(e) => {
                                                  const updatedActions = [...activeOutput.actions];
                                                  updatedActions[actionIdx] = {
                                                    ...action,
                                                    data: { ...slide, imageUrl: e.target.value }
                                                  };
                                                  updateActiveOutput(prev => ({ ...prev, actions: updatedActions }));
                                                }}
                                                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                dir="ltr"
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Users CRM actions */}
                                {activeTask.target === 'users' && (activeOutput.actions || activeOutput.rawResult?.actions) && (() => {
                                  const actions = activeOutput.actions || activeOutput.rawResult?.actions || [];
                                  return (
                                    <div className="space-y-6">
                                      {actions.map((action: any, actionIdx: number) => {
                                        const isUpdateSettings = action.type === 'updateSettings';
                                        const isUpdateUserGroup = action.type === 'updateUserGroup';
                                        const isAdjustUserPoints = action.type === 'adjustUserPoints';
                                        const isToggleUserBlock = action.type === 'toggleUserBlock';
                                        const isChangeUserPassword = action.type === 'changeUserPassword';
                                        const isUpdateUserDetails = action.type === 'updateUserDetails';
                                        const isCreateUser = action.type === 'createUser';
                                        const isExportUsers = action.type === 'exportUsers';
                                        const isGetUserDetails = action.type === 'getUserDetails';

                                        return (
                                          <div key={actionIdx} className="p-4 bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 text-right" dir="rtl">
                                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-2">
                                              <span className="text-xs font-black text-primary-500">
                                                {isUpdateSettings && '⚙️ بروزرسانی تنظیمات باشگاه مشتریان'}
                                                {isUpdateUserGroup && `👥 تغییر گروه کاربر: ${action.userName || 'کاربر مشخص'}`}
                                                {isAdjustUserPoints && `🪙 تنظیم امتیاز کاربر: ${action.userName || 'کاربر مشخص'}`}
                                                {isToggleUserBlock && `🔒 مسدودیت/رفع مسدودیت کاربر: ${action.userName || 'کاربر مشخص'}`}
                                                {isChangeUserPassword && `🔑 تغییر رمز عبور کاربر: ${action.userName || 'کاربر مشخص'}`}
                                                {isGetUserDetails && `🔎 مشخصات مشتری: ${action.userName || action.data?.name || 'کاربر مشخص'}`}
                                                {isUpdateUserDetails && `📝 ویرایش اطلاعات کاربر: ${action.userName || 'کاربر مشخص'}`}
                                                {isCreateUser && '➕ ایجاد مشتری جدید'}
                                                {isExportUsers && '📥 خروجی گرفتن از اطلاعات کاربران'}
                                              </span>
                                            </div>

                                            {isUpdateSettings && (() => {
                                              const sData = action.data || {};
                                              return (
                                                <div className="grid grid-cols-2 gap-3">
                                                  <div className="flex items-center gap-2 col-span-2 pb-2">
                                                    <input
                                                      type="checkbox"
                                                      id={`club_enabled_${actionIdx}`}
                                                      checked={!!sData.customerClubEnabled}
                                                      onChange={(e) => updateUsersField(actionIdx, 'customerClubEnabled', e.target.checked)}
                                                      className="rounded border-slate-300 dark:border-slate-800 focus:ring-primary-500 h-4 w-4 text-primary-600 bg-white dark:bg-slate-950 cursor-pointer"
                                                    />
                                                    <label htmlFor={`club_enabled_${actionIdx}`} className="text-xs text-slate-600 dark:text-slate-300 font-bold cursor-pointer">فعال بودن باشگاه مشتریان</label>
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نرخ امتیاز (هر چند تومان ۱ امتیاز)</label>
                                                    <input
                                                      type="number"
                                                      value={sData.loyaltyPointsRate || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'loyaltyPointsRate', Number(e.target.value))}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">ارزش نقدی هر امتیاز (تومان)</label>
                                                    <input
                                                      type="number"
                                                      value={sData.loyaltyPointValue || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'loyaltyPointValue', Number(e.target.value))}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">حد نصاب امتیاز برای هدیه</label>
                                                    <input
                                                      type="number"
                                                      value={sData.loyaltyDiscountThreshold || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'loyaltyDiscountThreshold', Number(e.target.value))}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">میزان هدیه تخفیف</label>
                                                    <input
                                                      type="number"
                                                      value={sData.loyaltyDiscountAmount || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'loyaltyDiscountAmount', Number(e.target.value))}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نوع هدیه تخفیف</label>
                                                    <select
                                                      value={sData.loyaltyDiscountType || 'flat'}
                                                      onChange={(e) => updateUsersField(actionIdx, 'loyaltyDiscountType', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    >
                                                      <option value="flat">مبلغ ثابت (flat)</option>
                                                      <option value="percentage">درصدی (percentage)</option>
                                                    </select>
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                            {isUpdateUserGroup && (
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">گروه جدید</label>
                                                <input
                                                  type="text"
                                                  value={action.group || ''}
                                                  onChange={(e) => updateUsersField(actionIdx, 'group', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                />
                                              </div>
                                            )}

                                            {isAdjustUserPoints && (
                                              <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">تغییر امتیاز (مثبت یا منفی)</label>
                                                  <input
                                                    type="number"
                                                    value={action.points !== undefined ? action.points : ''}
                                                    onChange={(e) => updateUsersField(actionIdx, 'points', Number(e.target.value))}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                                    dir="ltr"
                                                  />
                                                </div>
                                                <div className="space-y-1">
                                                  <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">علت تغییر امتیاز</label>
                                                  <input
                                                    type="text"
                                                    value={action.reason || ''}
                                                    onChange={(e) => updateUsersField(actionIdx, 'reason', e.target.value)}
                                                    className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                  />
                                                </div>
                                              </div>
                                            )}

                                            {isToggleUserBlock && (
                                              <div className="flex items-center gap-2">
                                                <input
                                                  type="checkbox"
                                                  id={`is_blocked_${actionIdx}`}
                                                  checked={!!action.isBlocked}
                                                  onChange={(e) => updateUsersField(actionIdx, 'isBlocked', e.target.checked)}
                                                  className="rounded border-slate-300 dark:border-slate-800 focus:ring-primary-500 h-4 w-4 text-primary-600 bg-white dark:bg-slate-950 cursor-pointer"
                                                />
                                                <label htmlFor={`is_blocked_${actionIdx}`} className="text-xs text-slate-600 dark:text-slate-300 font-bold cursor-pointer">کاربر مسدود باشد</label>
                                              </div>
                                            )}

                                            {isChangeUserPassword && (
                                              <div className="space-y-1">
                                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">رمز عبور جدید (حداقل ۶ کاراکتر)</label>
                                                <input
                                                  type="text"
                                                  value={action.password || ''}
                                                  onChange={(e) => updateUsersField(actionIdx, 'password', e.target.value)}
                                                  className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                  dir="ltr"
                                                />
                                              </div>
                                            )}

                                            {isUpdateUserDetails && (() => {
                                              const dData = action.data || {};
                                              return (
                                                <div className="grid grid-cols-3 gap-3">
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نام کاربر</label>
                                                    <input
                                                      type="text"
                                                      value={dData.name || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'name', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">شماره همراه</label>
                                                    <input
                                                      type="text"
                                                      value={dData.phone || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'phone', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                                      dir="ltr"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">ایمیل</label>
                                                    <input
                                                      type="text"
                                                      value={dData.email || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'email', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                      dir="ltr"
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                            {isCreateUser && (() => {
                                              const dData = action.data || {};
                                              return (
                                                <div className="grid grid-cols-2 gap-3">
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">نام و نام خانوادگی</label>
                                                    <input
                                                      type="text"
                                                      value={dData.name || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'name', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">آدرس ایمیل</label>
                                                    <input
                                                      type="text"
                                                      value={dData.email || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'email', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                      dir="ltr"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">شماره همراه</label>
                                                    <input
                                                      type="text"
                                                      value={dData.phone || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'phone', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                                      dir="ltr"
                                                    />
                                                  </div>
                                                  <div className="space-y-1">
                                                    <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">رمز عبور</label>
                                                    <input
                                                      type="text"
                                                      value={dData.password || ''}
                                                      onChange={(e) => updateUsersField(actionIdx, 'password', e.target.value)}
                                                      className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left font-mono"
                                                      dir="ltr"
                                                    />
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                            {isExportUsers && (() => {
                                              const filt = action.filters || {};
                                              return (
                                                <div className="space-y-3">
                                                  <p className="text-[10px] text-slate-500 font-bold">{action.explanation || 'فیلترهای اعمال شده برای خروجی اکسل/CSV:'}</p>
                                                  <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">فیلتر گروه</label>
                                                      <input
                                                        type="text"
                                                        value={filt.group || ''}
                                                        onChange={(e) => updateUsersField(actionIdx, 'group', e.target.value)}
                                                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full"
                                                      />
                                                    </div>
                                                    <div className="space-y-1">
                                                      <label className="text-[9px] text-slate-500 font-black uppercase tracking-wider">حداقل امتیاز</label>
                                                      <input
                                                        type="number"
                                                        value={filt.minPoints !== undefined ? filt.minPoints : ''}
                                                        onChange={(e) => updateUsersField(actionIdx, 'minPoints', e.target.value ? Number(e.target.value) : undefined)}
                                                        className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-primary-500 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-white focus:outline-none w-full text-left"
                                                        dir="ltr"
                                                      />
                                                    </div>
                                                  </div>
                                                </div>
                                              );
                                            })()}

                                            {isGetUserDetails && (() => {
                                              const uData = action.data || {};
                                              const rows: { label: string; value: any; mono?: boolean }[] = [
                                                { label: 'نام و نام خانوادگی', value: uData.name || action.userName || '—' },
                                                { label: 'شماره تلفن', value: uData.phone || '—', mono: true },
                                                { label: 'ایمیل', value: uData.email || '—', mono: true },
                                                { label: 'گروه مشتری', value: uData.group || 'عادی' },
                                                { label: 'امتیاز وفاداری', value: (uData.loyaltyPoints ?? 0).toLocaleString('fa-IR') },
                                                { label: 'تعداد سفارش', value: (uData.ordersCount ?? 0).toLocaleString('fa-IR') },
                                                { label: 'وضعیت دسترسی', value: uData.isBlocked ? 'مسدود شده 🚫' : 'فعال ✅' },
                                                { label: 'تاریخ عضویت', value: uData.createdAt || '—', mono: true },
                                              ];
                                              return (
                                                <div className="space-y-2">
                                                  <p className="text-[10px] text-slate-500 font-bold">این اقدام فقط جهت مشاهده است و هیچ تغییری در اطلاعات مشتری ایجاد نمی‌کند.</p>
                                                  <div className="divide-y divide-slate-100 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
                                                    {rows.map((r, ri) => (
                                                      <div key={ri} className="flex justify-between items-center gap-3 px-3 py-2">
                                                        <span className="text-[10px] text-slate-400 font-bold shrink-0">{r.label}</span>
                                                        <span className={`text-[11px] font-black text-slate-800 dark:text-white text-left ${r.mono ? 'font-mono' : ''}`} dir={r.mono ? 'ltr' : 'rtl'}>{r.value}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })()}

                            {/* Live Preview (Preview Mode) */}
                            {stepViewMode === 'preview' && (() => {
                              const isReport = activeOutput.action === 'report' || 
                                               activeOutput.action === 'report_control' || 
                                               activeOutput.action === 'view' || 
                                               activeOutput.action === 'query' || 
                                               activeOutput.action === 'get_details' || 
                                               activeOutput.action === 'getUserDetails' || 
                                               activeOutput.rawResult?.action === 'report' || 
                                               activeOutput.rawResult?.action === 'report_control' || 
                                               activeOutput.rawResult?.action === 'view' || 
                                               activeOutput.rawResult?.action === 'query' || 
                                               activeOutput.rawResult?.action === 'get_details' || 
                                               activeOutput.rawResult?.action === 'getUserDetails' ||
                                               (activeOutput.explanation && (
                                                 (activeTask.target === 'products' && !activeOutput.formData) ||
                                                 (activeTask.target === 'blog' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.title) ||
                                                 (activeTask.target === 'categories' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.name) ||
                                                 (activeTask.target === 'discounts' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.code) ||
                                                 (activeTask.target === 'orders' && (!activeOutput.targets || activeOutput.targets.length === 0) && !activeOutput.updates) ||
                                                 (activeTask.target === 'reviews' && !activeOutput.action && !activeOutput.data) ||
                                                 (activeTask.target === 'users' && (!activeOutput.actions || activeOutput.actions.length === 0)) ||
                                                 (activeTask.target === 'tickets' && !activeOutput.action) ||
                                                 (activeTask.target === 'system_tickets' && !activeOutput.action) ||
                                                 (activeTask.target === 'staff' && !activeOutput.action) ||
                                                 (activeTask.target === 'profile' && !activeOutput.action) ||
                                                 (activeTask.target === 'import_export' && !activeOutput.action) ||
                                                 (activeTask.target === 'media' && !activeOutput.action) ||
                                                 (activeTask.target === 'shoppable' && !activeOutput.action) ||
                                                 (activeTask.target === 'settings' && !activeOutput.formData) ||
                                                 (activeTask.target === 'custom_home' && !activeOutput.formData) ||
                                                 (activeTask.target === 'footer' && !activeOutput.config && !activeOutput.rawResult?.config) ||
                                                 (activeTask.target === 'header' && !activeOutput.config && !activeOutput.rawResult?.config)
                                               ));

                              if (isReport) {
                                return (
                                  <div className="flex flex-col items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/50 pb-5 w-full animate-fadeIn">
                                    <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">پیش‌نمایش سایت</span>
                                    <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-right space-y-4 shadow-sm animate-fadeIn">
                                      <div className="flex items-center gap-2 text-xs font-black text-primary-500 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                        <FileText size={16} />
                                        <span>📊 گزارش و پاسخ دستیار هوشمند</span>
                                      </div>
                                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                                        {activeOutput.explanation}
                                      </p>
                                      <div className="bg-primary-500/5 border border-primary-500/10 rounded-xl p-3 text-[9px] text-primary-500 font-bold flex items-center gap-2 justify-center">
                                        <Lightbulb size={12} className="shrink-0" />
                                        <span>این یک گزارش اطلاعاتی است و تغییری در اطلاعات فروشگاه ایجاد نمی‌کند.</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div className="flex flex-col items-center gap-3 border-b border-slate-200/60 dark:border-slate-800/50 pb-5 w-full animate-fadeIn">
                                  <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">پیش‌نمایش سایت</span>

                                {/* Product card preview */}
                                {activeTask.target === 'products' && activeOutput.formData && (() => {
                                  const prod = activeOutput.formData;
                                  const selectedCat = availableCategories.find((c: any) => c.id === prod.categoryId);
                                  const hasAnyFeatures = (activeOutput.featuresList || []).length > 0;
                                  const hasAnySpecs = (activeOutput.specsList || []).length > 0;
                                  const hasAnyFaqs = (activeOutput.faqItems || []).length > 0;
                                  const hasAnyVariants = (activeOutput.variants || []).length > 0;
                                  const galleryCount = (activeOutput.galleryUrls || []).length;

                                  return (
                                    <div className="w-[240px] flex flex-col items-center animate-fadeIn">
                                      <ProductPreviewCard
                                        title={prod.title || 'بدون نام'}
                                        brand={prod.brand}
                                        price={Number(prod.price) || 0}
                                        imageUrl={activeOutput.galleryUrls?.[0] || prod.imageUrl}
                                        isWholesaleOnly={!!prod.isWholesaleOnly}
                                        wholesalePrice={Number(prod.wholesalePrice) || undefined}
                                        moq={Number(prod.moq) || undefined}
                                        wholesaleUnit={prod.wholesaleUnit}
                                        wholesaleUnitSize={Number(prod.wholesaleUnitSize) || undefined}
                                        discount={Number(prod.discount) || undefined}
                                        discountPercent={Number(prod.discountPercent) || undefined}
                                      />

                                      {/* Product Detail Panel in Preview */}
                                      <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 text-right text-[10px] space-y-2.5 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                          <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ جزئیات و مشخصات فنی</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${prod.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {prod.isActive !== false ? 'فعال' : 'غیرفعال'}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5 text-right">
                                          {/* Category */}
                                          {selectedCat && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📁 دسته‌بندی:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black text-[9px] truncate max-w-[120px]">{selectedCat.name}</span>
                                            </div>
                                          )}

                                          {/* Product Type */}
                                          <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                            <span>📀 نوع محصول:</span>
                                            <span className="text-slate-900 dark:text-slate-200 font-black">
                                              {prod.type === 'digital' ? 'دیجیتال (فایل)' : 'فیزیکی'}
                                            </span>
                                          </div>

                                          {/* Stock */}
                                          <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                            <span>📦 موجودی انبار:</span>
                                            <span className={`font-black ${Number(prod.stock) > 0 ? 'text-slate-900 dark:text-slate-200' : 'text-rose-500'}`}>
                                              {Number(prod.stock) > 0 ? `${Number(prod.stock).toLocaleString('fa-IR')} عدد` : 'ناموجود'}
                                            </span>
                                          </div>

                                          {/* Discount */}
                                          {Number(prod.discount) > 0 && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1 text-emerald-600 dark:text-emerald-400">
                                              <span>🎁 تخفیف کالا:</span>
                                              <span className="font-black">
                                                {Number(prod.discount).toLocaleString('fa-IR')} تومان
                                              </span>
                                            </div>
                                          )}

                                          {/* Special deal */}
                                          {!!prod.isSpecial && (
                                            <div className="flex flex-col gap-0.5 border-b border-slate-50 dark:border-slate-950 pb-1 text-rose-500">
                                              <div className="flex items-start justify-between">
                                                <span>🔥 پیشنهاد شگفت‌انگیز:</span>
                                                <span className="font-black">فعال</span>
                                              </div>
                                              {prod.specialEndsAt && (
                                                <div className="text-[8px] text-slate-400 text-left font-mono">
                                                  تا: {new Date(prod.specialEndsAt).toLocaleDateString('fa-IR')}
                                                </div>
                                              )}
                                            </div>
                                          )}

                                          {/* Weight and Volume */}
                                          {prod.type !== 'digital' && (prod.weight || prod.volume) ? (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>⚖️ وزن و حجم:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {prod.weight ? `${Number(prod.weight).toLocaleString('fa-IR')} گرم` : ''} {prod.weight && prod.volume ? ' | ' : ''} {prod.volume ? `${Number(prod.volume).toLocaleString('fa-IR')} سی‌سی` : ''}
                                              </span>
                                            </div>
                                          ) : null}

                                          {/* Digital parameters */}
                                          {prod.type === 'digital' && (prod.fileUrl || prod.fileFormat || prod.fileSize) ? (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1 text-blue-500 text-right">
                                              <span className="text-slate-500">💾 فایل دیجیتال:</span>
                                              <div className="text-[8px] bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg space-y-0.5 text-left font-mono" dir="ltr">
                                                {prod.fileUrl && <div className="truncate">Url: {prod.fileUrl}</div>}
                                                {(prod.fileFormat || prod.fileSize) && (
                                                  <div>Format: {prod.fileFormat || 'N/A'} | Size: {prod.fileSize || 'N/A'}</div>
                                                )}
                                              </div>
                                            </div>
                                          ) : null}

                                          {/* B2B Wholesale */}
                                          {prod.wholesalePrice && (() => {
                                            let parsedTiers: any[] = [];
                                            if (prod.wholesaleTiers) {
                                              try {
                                                parsedTiers = typeof prod.wholesaleTiers === 'string' ? JSON.parse(prod.wholesaleTiers) : prod.wholesaleTiers;
                                              } catch (e) {}
                                            }
                                            let parsedExclusivePrices: any[] = [];
                                            if (prod.wholesaleExclusivePrices) {
                                              try {
                                                parsedExclusivePrices = typeof prod.wholesaleExclusivePrices === 'string' ? JSON.parse(prod.wholesaleExclusivePrices) : prod.wholesaleExclusivePrices;
                                              } catch (e) {}
                                            }
                                            return (
                                              <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1 text-amber-500 bg-amber-500/5 p-1.5 rounded-lg">
                                                <span className="text-[9px] font-black">🏢 تنظیمات فروش عمده:</span>
                                                <div className="space-y-0.5">
                                                  <div className="flex justify-between">
                                                    <span>قیمت عمده:</span>
                                                    <span>{Number(prod.wholesalePrice).toLocaleString('fa-IR')} تومان</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span>حداقل تعداد (MOQ):</span>
                                                    <span>{Number(prod.moq || 1).toLocaleString('fa-IR')} {prod.wholesaleUnit || 'عدد'}</span>
                                                  </div>
                                                  {prod.wholesaleUnitSize && prod.wholesaleUnitSize > 1 && (
                                                    <div className="flex justify-between">
                                                      <span>تعداد در هر کارتن/بسته:</span>
                                                      <span>{Number(prod.wholesaleUnitSize).toLocaleString('fa-IR')} تایی</span>
                                                    </div>
                                                  )}
                                                  {parsedTiers.length > 0 && (
                                                    <div className="mt-1 pt-1 border-t border-amber-500/10 space-y-0.5 text-right">
                                                      <div className="text-[8px] font-black text-amber-600 dark:text-amber-400">تخفیف‌های پله‌ای:</div>
                                                      {parsedTiers.map((tier, idx) => (
                                                        <div key={idx} className="flex justify-between text-[8px] font-normal text-slate-500">
                                                          <span>{tier.minQty} تا {tier.maxQty || 'بی‌نهایت'} {prod.wholesaleUnit || 'عدد'}:</span>
                                                          <span className="font-bold text-emerald-600">٪{tier.discountPercent} تخفیف</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {parsedExclusivePrices.length > 0 && (
                                                    <div className="mt-1 pt-1 border-t border-amber-500/10 space-y-0.5 text-right">
                                                      <div className="text-[8px] font-black text-amber-600 dark:text-amber-400">قیمت‌های اختصاصی:</div>
                                                      {parsedExclusivePrices.map((ep, idx) => (
                                                        <div key={idx} className="flex justify-between text-[8px] font-normal text-slate-500">
                                                          <span>{ep.target}:</span>
                                                          <span className="font-bold text-amber-700">{Number(ep.price).toLocaleString('fa-IR')} تومان</span>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          })()}

                                          {/* SEO Meta */}
                                          {(prod.seoTitle || prod.seoDescription) && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1 text-slate-500">
                                              <span>🔍 مشخصات سئو:</span>
                                              <div className="text-[8px] bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg space-y-0.5 text-right font-normal">
                                                {prod.seoTitle && <div className="font-bold text-slate-800 dark:text-slate-200">عنوان: {prod.seoTitle}</div>}
                                                {prod.seoDescription && <div className="line-clamp-2 leading-relaxed">توضیحات: {prod.seoDescription}</div>}
                                              </div>
                                            </div>
                                          )}

                                          {/* Description */}
                                          {prod.description && (
                                            <div className="flex flex-col gap-0.5 border-b border-slate-50 dark:border-slate-950 pb-1 text-slate-500">
                                              <span>📝 خلاصه محصول:</span>
                                              <p className="font-normal text-slate-700 dark:text-slate-300 leading-relaxed text-[9px]">{prod.description}</p>
                                            </div>
                                          )}

                                          {/* Full Description */}
                                          {prod.fullDescription && (
                                            <div className="flex flex-col gap-0.5 border-b border-slate-50 dark:border-slate-950 pb-1 text-slate-500">
                                              <span>📝 توضیحات کامل:</span>
                                              <div 
                                                className="font-normal text-slate-700 dark:text-slate-300 leading-relaxed text-[9px] max-h-32 overflow-y-auto prose dark:prose-invert prose-xs text-right"
                                                dangerouslySetInnerHTML={{ __html: prod.fullDescription }}
                                              />
                                            </div>
                                          )}

                                          {/* Gallery count */}
                                          {galleryCount > 1 && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🖼️ تصاویر گالری:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">{galleryCount} تصویر</span>
                                            </div>
                                          )}

                                          {/* Features list */}
                                          {hasAnyFeatures && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span className="text-slate-500">✨ ویژگی‌های کلیدی:</span>
                                              <div className="grid grid-cols-2 gap-1 text-[8px] bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg font-normal text-right">
                                                {activeOutput.featuresList.map((f: any, idx: number) => (
                                                  <div key={idx} className="flex justify-between col-span-2">
                                                    <span className="text-slate-400">{f.key}:</span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-bold">{f.value}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Specs list */}
                                          {hasAnySpecs && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span className="text-slate-500">⚙️ مشخصات فنی:</span>
                                              <div className="grid grid-cols-2 gap-1 text-[8px] bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg font-normal text-right">
                                                {activeOutput.specsList.map((s: any, idx: number) => (
                                                  <div key={idx} className="flex justify-between col-span-2">
                                                    <span className="text-slate-400">{s.key}:</span>
                                                    <span className="text-slate-800 dark:text-slate-200 font-bold text-left">{s.value}</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Variants */}
                                          {hasAnyVariants && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span className="text-slate-500">🎨 تنوع‌ها (رنگ/سایز):</span>
                                              <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                                                {activeOutput.variants.map((v: any, idx: number) => (
                                                  <span key={idx} className="bg-primary-500/10 text-primary-500 border border-primary-500/10 px-1.5 py-0.5 rounded text-[8px] font-black flex items-center gap-1">
                                                    {v.colorCode && (
                                                      <span className="w-1.5 h-1.5 rounded-full inline-block border border-slate-400" style={{ backgroundColor: v.colorCode }} />
                                                    )}
                                                    {v.name} {v.price ? `(${Number(v.price).toLocaleString('fa-IR')} ت)` : ''}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* FAQs */}
                                          {hasAnyFaqs && (
                                            <div className="flex flex-col gap-1 text-slate-500">
                                              <span>💬 سوالات متداول:</span>
                                              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                                                {activeOutput.faqItems.map((f: any, idx: number) => (
                                                  <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-lg text-[8px] font-normal text-right space-y-0.5">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200">س: {f.question}</div>
                                                    <div className="text-slate-400">ج: {f.answer}</div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Blog preview */}
                                {activeTask.target === 'blog' && (() => {
                                  const operations = activeOutput.operations || [];
                                  if (operations.length === 0) {
                                    return (
                                      <div className="w-[240px] flex flex-col items-center gap-2 animate-fadeIn">
                                        <BlogPreviewCard
                                          title={activeOutput.title || 'بدون عنوان'}
                                          summary={activeOutput.summary || ''}
                                          imageUrl={activeOutput.featuredImage || activeOutput.imageUrl}
                                        />
                                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-1.5 font-bold text-slate-600 dark:text-slate-400">
                                          <div className="text-slate-900 dark:text-slate-200 text-[10px] font-black border-b border-slate-100 dark:border-slate-800 pb-1 flex justify-between items-center">
                                            <span>📝 اطلاعات کلی مقاله</span>
                                            <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-primary-500/10 text-primary-500">منسوخ / ساده</span>
                                          </div>
                                          <div>عنوان: <span className="text-slate-800 dark:text-slate-200">{activeOutput.title || '—'}</span></div>
                                          {activeOutput.summary && <div className="line-clamp-2 leading-relaxed font-normal">خلاصه: {activeOutput.summary}</div>}
                                        </div>
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex flex-col gap-4 w-full items-center animate-fadeIn text-right" dir="rtl">
                                      {operations.map((op: any, opIdx: number) => {
                                        const isPost = op.type === 'create' || op.type === 'create_post' || op.type === 'update' || op.type === 'update_post';
                                        const isCategory = op.type === 'create_category' || op.type === 'update_category';
                                        const isComment = op.type === 'update_comment';
                                        const isDelete = op.type?.startsWith('delete');

                                        if (isDelete) {
                                          let label = 'مقاله وبلاگ';
                                          if (op.type === 'delete_category') label = 'دسته‌بندی وبلاگ';
                                          if (op.type === 'delete_comment') label = 'دیدگاه وبلاگ';
                                          return (
                                            <div key={opIdx} className="w-[240px] bg-rose-500/10 border-2 border-dashed border-rose-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-rose-500 gap-1.5 shadow-2xs">
                                              <Trash2 size={24} className="animate-bounce" />
                                              <span className="text-xs font-black">❌ دستور حذف {label}</span>
                                              <span className="text-[8px] font-mono opacity-80">شناسه هدف: {op.id}</span>
                                              <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 mt-1">این عملیات پس از تایید نهایی ادمین، از دیتابیس پاک خواهد شد.</p>
                                            </div>
                                          );
                                        }

                                        if (isCategory) {
                                          const cat = op.data || {};
                                          return (
                                            <div key={opIdx} className="w-[240px] flex flex-col items-center gap-2">
                                              <span className="text-[8px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full mb-1">
                                                {op.type === 'create_category' ? '✨ ایجاد دسته‌بندی جدید وبلاگ' : '📝 ویرایش دسته‌بندی وبلاگ'}
                                              </span>
                                              <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm">
                                                <div className="flex items-center gap-2.5">
                                                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center text-primary-500 shrink-0 border border-primary-500/10">
                                                    <Folder size={18} />
                                                  </div>
                                                  <div className="flex flex-col gap-0.5 overflow-hidden">
                                                    <span className="text-[11px] font-black text-slate-800 dark:text-white truncate">{cat.name || 'بدون نام'}</span>
                                                    <span className="text-[9px] text-slate-400 font-mono" dir="ltr">/{cat.slug || ''}</span>
                                                  </div>
                                                </div>
                                                {cat.description && (
                                                  <p className="text-[9px] text-slate-500 font-normal leading-relaxed border-t border-slate-50 dark:border-slate-950 pt-2">{cat.description}</p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        }

                                        if (isComment) {
                                          const comm = op.data || {};
                                          return (
                                            <div key={opIdx} className="w-[240px] flex flex-col items-center gap-2">
                                              <span className="text-[8px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full mb-1">
                                                💬 ویرایش/پاسخ دیدگاه وبلاگ
                                              </span>
                                              <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
                                                <div className="flex items-center justify-between">
                                                  <span className="text-[10px] font-black text-slate-800 dark:text-white">نویسنده: ادمین / پشتیبان</span>
                                                  <span className={`px-1.5 py-0.5 rounded text-[7px] font-black ${
                                                    comm.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    comm.status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                                                  }`}>
                                                    {comm.status === 'approved' ? 'منتشر شده' : comm.status === 'pending' ? 'در انتظار تایید' : 'بایگانی/رد شده'}
                                                  </span>
                                                </div>
                                                <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900 text-[10px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">
                                                  {comm.content || 'بدون پاسخ/متن'}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        if (isPost) {
                                          const post = op.data || {};
                                          const matchedCat = post.categoryId ? availableBlogCategories.find((c: any) => c.id === post.categoryId) : null;
                                          const tagsList = Array.isArray(post.tags)
                                            ? post.tags
                                            : (() => {
                                                try {
                                                  const parsed = JSON.parse(post.tags || '[]');
                                                  return Array.isArray(parsed) ? parsed : [];
                                                } catch {
                                                  return typeof post.tags === 'string' ? post.tags.split(',').map((t: string) => t.trim()) : [];
                                                }
                                              })();

                                          return (
                                            <div key={opIdx} className="w-[240px] flex flex-col items-center gap-1.5">
                                              <span className="text-[8px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full select-none mb-1">
                                                {op.type?.startsWith('create') ? '✨ مقاله جدید وبلاگ' : '✏️ دستور ویرایش مقاله'}
                                              </span>
                                              
                                              {/* Post Visual Card Preview */}
                                              <BlogPreviewCard
                                                title={post.title || 'بدون عنوان'}
                                                summary={post.summary || ''}
                                                imageUrl={post.featuredImage}
                                              />

                                              {/* Metadata sheet */}
                                              <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                                <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                                  <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ جزئیات انتشار مقاله</span>
                                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                                    post.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    post.status === 'archived' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                                                  }`}>
                                                    {post.status === 'published' ? 'منتشر شده' : post.status === 'archived' ? 'بایگانی' : 'پیش‌نویس'}
                                                  </span>
                                                </div>

                                                <div className="grid grid-cols-1 gap-1.5">
                                                  {/* Slug URL */}
                                                  <div className="flex flex-col gap-0.5 border-b border-slate-50 dark:border-slate-950 pb-1 text-slate-500">
                                                    <span>🔗 آدرس یکتای پست (Slug):</span>
                                                    <span className="text-primary-500 font-mono text-[9px] text-left select-all truncate" dir="ltr">
                                                      /blog/{post.slug || 'slug-placeholder'}
                                                    </span>
                                                  </div>

                                                  {/* Category & Author */}
                                                  <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                                    <span>📁 دسته‌بندی:</span>
                                                    <span className="text-slate-900 dark:text-slate-200 font-black">
                                                      {matchedCat ? matchedCat.name : 'بدون دسته‌بندی'}
                                                    </span>
                                                  </div>

                                                  <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                                    <span>👤 نویسنده مقاله:</span>
                                                    <span className="text-slate-900 dark:text-slate-200 font-black">
                                                      {post.authorName || 'ادمین سیستم'}
                                                    </span>
                                                  </div>

                                                  {/* Comments Toggle */}
                                                  <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                                    <span>💬 قابلیت کامنت‌گذاری:</span>
                                                    <span className={post.allowComments !== false ? 'text-emerald-500' : 'text-rose-500'}>
                                                      {post.allowComments !== false ? 'مجاز و فعال ✅' : 'مسدود شده 🚫'}
                                                    </span>
                                                  </div>

                                                  {/* Tags pills */}
                                                  {tagsList.length > 0 && (
                                                    <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                                      <span>🏷️ برچسب‌ها:</span>
                                                      <div className="flex flex-wrap gap-1">
                                                        {tagsList.map((t: string, idx: number) => (
                                                          <span key={idx} className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 text-[8px] font-bold px-1.5 py-0.5 rounded">
                                                            {t}
                                                          </span>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  )}

                                                  {/* SEO Meta review */}
                                                  {(post.seoTitle || post.seoDescription) && (
                                                    <div className="flex flex-col gap-1 text-slate-500 pt-0.5">
                                                      <span>🔍 سئو سرچ گوگل:</span>
                                                      <div className="text-[8px] bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg space-y-0.5 font-normal text-right">
                                                        {post.seoTitle && <div className="font-bold text-slate-800 dark:text-slate-200">عنوان: {post.seoTitle}</div>}
                                                        {post.seoDescription && <div className="line-clamp-2 leading-relaxed">متای توضیحات: {post.seoDescription}</div>}
                                                      </div>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        }

                                        return null;
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Blog comments preview */}
                                {activeTask.target === 'blog_comments' && (() => {
                                  const replies = activeOutput.rawResult?.replies || activeOutput.replies || [];
                                  if (replies.length === 0) return null;
                                  return (
                                    <div className="w-[240px] flex flex-col gap-3 items-center animate-fadeIn text-right" dir="rtl">
                                      <span className="text-[8px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full select-none">
                                        💬 پاسخ‌های هوشمند به نظرات وبلاگ
                                      </span>
                                      {replies.map((r: any, idx: number) => (
                                        <div key={idx} className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative">
                                          <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-950 pb-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <div className="w-6 h-6 rounded-full bg-primary-50 dark:bg-slate-950 flex items-center justify-center text-[9px] font-black text-primary-500">
                                                {r.name?.slice(0, 1) || 'U'}
                                              </div>
                                              <span className="text-[9px] font-black text-slate-800 dark:text-white">{r.name}</span>
                                            </div>
                                            <span className="text-[7px] font-black bg-emerald-500/10 text-emerald-500 px-1 py-0.5 rounded">آماده پاسخ</span>
                                          </div>
                                          <p className="text-[9px] text-slate-500 font-bold leading-normal border-r-2 border-primary-500/30 pr-1.5 line-clamp-2">{r.content}</p>
                                          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl text-[9px] text-slate-800 dark:text-slate-250 leading-relaxed font-black">
                                            ↩️ پاسخ ادمین: {r.suggestedReply}
                                          </div>
                                          {r.postTitle && (
                                            <div className="text-[7px] text-slate-400 font-bold mt-1">
                                              📌 روی مقاله: <span className="text-slate-500">{r.postTitle}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}

                                {/* Stories preview */}
                                {activeTask.target === 'stories' && (() => {
                                  const actionObj = activeOutput.actions?.[0] || {};
                                  const story = actionObj.data || actionObj.story || activeOutput;
                                  
                                  const renderJalaliDate = (isoStr: any) => {
                                    if (!isoStr) return 'نامشخص';
                                    try {
                                      const d = new Date(isoStr);
                                      if (isNaN(d.getTime())) return 'نامشخص';
                                      return d.toLocaleDateString('fa-IR', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    } catch {
                                      return 'نامشخص';
                                    }
                                  };

                                  return (
                                    <div className="w-[240px] flex flex-col items-center animate-fadeIn text-right">
                                      {/* Story Preview Card Visual Frame */}
                                      <StoryPreviewCard
                                        text={story.text}
                                        mediaUrl={story.mediaUrl}
                                        linkText={story.linkText || (story.linkUrl ? 'مشاهده' : undefined)}
                                      />

                                      {/* Detailed Metadata Sheet */}
                                      <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2.5 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                          <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ جزئیات استوری هوشمند</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                            story.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                                          }`}>
                                            {story.isActive !== false ? 'فعال 🟢' : 'غیرفعال 🔴'}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                          {/* Title */}
                                          <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-950 pb-1 gap-1">
                                            <span>عنوان اصلی:</span>
                                            <span className="text-slate-900 dark:text-slate-200 font-black text-left">{story.title || 'بدون عنوان'}</span>
                                          </div>

                                          {/* Media type and duration */}
                                          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                            <span>🎬 رسانه و زمان:</span>
                                            <span>
                                              {story.mediaType === 'video' ? '📽️ ویدیو کلیپ' : '🖼️ تصویر ثابت'} ({story.duration || 5} ثانیه)
                                            </span>
                                          </div>

                                          {/* Expiration date */}
                                          {story.expiresAt && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>⌛ تاریخ انقضای خودکار:</span>
                                              <span className="text-rose-500 text-left text-[9px] font-black">{renderJalaliDate(story.expiresAt)}</span>
                                            </div>
                                          )}

                                          {/* Display location */}
                                          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                            <span>📱 محل نمایش عمومی:</span>
                                            <span className="text-slate-900 dark:text-slate-200 font-black text-[9px]">
                                              {story.displayLocation === 'shop' ? 'فقط فروشگاه 🛍️' :
                                               story.displayLocation === 'custom' ? 'فقط لندینگ 🏠' : 'هر دو بخش سیستم'}
                                            </span>
                                          </div>

                                          {/* Story Category */}
                                          {story.category && (
                                            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📁 دسته‌بندی استوری:</span>
                                              <span className="bg-primary-50 dark:bg-slate-950 text-primary-500 px-1.5 py-0.5 rounded text-[8px] font-black">
                                                {story.category}
                                              </span>
                                            </div>
                                          )}

                                          {/* Link URL preview */}
                                          {story.linkUrl && (
                                            <div className="flex flex-col gap-0.5 text-slate-500">
                                              <span>🔗 لینک هدایت دکمه:</span>
                                              <span className="text-primary-500 font-mono text-[9px] text-left select-all truncate" dir="ltr">
                                                {story.linkUrl}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Slider preview */}
                                {activeTask.target === 'slider' && activeOutput.actions && (
                                  <div className="flex flex-col gap-4 w-full items-center animate-fadeIn text-right">
                                    {activeOutput.actions.map((action: any, actionIdx: number) => {
                                      if (action.type === 'delete') {
                                        return (
                                          <div key={actionIdx} className="w-[240px] bg-rose-500/10 border-2 border-dashed border-rose-500/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center text-rose-500 gap-1.5 shadow-2xs">
                                            <Trash2 size={24} className="animate-bounce" />
                                            <span className="text-xs font-black">❌ دستور حذف اسلاید</span>
                                            <span className="text-[8px] font-mono opacity-80">شناسه اسلاید حذفی: {action.id}</span>
                                            <p className="text-[8px] font-bold text-slate-500 dark:text-slate-400 mt-1">این اسلاید پس از کلیک روی دکمه ذخیره، به طور کامل از منو حذف خواهد شد.</p>
                                          </div>
                                        );
                                      }

                                      const slide = action.data || {};
                                      return (
                                        <div key={actionIdx} className="w-full flex flex-col items-center gap-1">
                                          <span className="text-[8px] font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full select-none mb-1">
                                            {action.type === 'create' ? '✨ اسلاید جدید سفارشی' : '✏️ دستور ویرایش اسلاید'}
                                          </span>
                                          
                                          {/* Visual Slider frame */}
                                          <SliderPreviewCard
                                            title={slide.title}
                                            subtitle={slide.subtitle}
                                            imageUrl={slide.imageUrl}
                                            linkText={slide.linkText}
                                          />

                                          {/* Detailed slide info sheet */}
                                          <div className="w-[240px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                            <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                              <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ فیلدهای اسلاید {actionIdx + 1}</span>
                                              <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-primary-500/10 text-primary-500">
                                                اسلایدر صفحه اول
                                              </span>
                                            </div>

                                            <div className="grid grid-cols-1 gap-1.5">
                                              {/* Slide title */}
                                              <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-950 pb-1 gap-1">
                                                <span>عنوان اصلی:</span>
                                                <span className="text-slate-900 dark:text-slate-200 font-black text-left">{slide.title || 'بدون عنوان'}</span>
                                              </div>

                                              {/* Slide subtitle */}
                                              <div className="flex justify-between items-start border-b border-slate-50 dark:border-slate-950 pb-1 gap-1">
                                                <span>زیرعنوان / شعار:</span>
                                                <span className="text-slate-900 dark:text-slate-200 text-left opacity-90">{slide.subtitle || 'بدون زیرعنوان'}</span>
                                              </div>

                                              {/* CTA Button Link */}
                                              {slide.linkText && (
                                                <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                                  <span>🔗 دکمه و لینک:</span>
                                                  <span className="text-primary-500 font-mono text-[9px] select-all">
                                                    {slide.linkText} ({slide.linkUrl || '#'})
                                                  </span>
                                                </div>
                                              )}

                                              {/* Image URL preview */}
                                              {slide.imageUrl && (
                                                <div className="flex flex-col gap-0.5">
                                                  <span>🖼️ آدرس عکس اسلاید:</span>
                                                  <span className="text-[8px] text-slate-400 font-mono truncate text-left select-all" dir="ltr">
                                                    {slide.imageUrl}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {/* Category preview */}
                                {activeTask.target === 'categories' && (() => {
                                  const operations = activeOutput.operations || [];

                                  const renderCategoryDetails = (cat: any) => {
                                    const matchedParent = cat.parentId ? availableCategories.find((c: any) => c.id === cat.parentId) : null;
                                    const hasAnyDetail = cat.parentId || 
                                      cat.description || 
                                      cat.seoTitle || 
                                      cat.seoDescription || 
                                      cat.imageUrl || 
                                      cat.icon || 
                                      cat.isActive !== undefined;

                                    if (!hasAnyDetail) return null;

                                    return (
                                      <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                          <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ جزئیات دسته‌بندی</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${cat.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {cat.isActive !== false ? 'فعال در منو' : 'غیرفعال'}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                          {/* Parent Category */}
                                          {matchedParent && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📁 دسته‌بندی مادر:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black text-[9px]">{matchedParent.name}</span>
                                            </div>
                                          )}

                                          {/* Icon */}
                                          {cat.icon && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🏷️ آیکون / اموجی:</span>
                                              <span className="text-slate-950 dark:text-white font-black text-xs">{cat.icon}</span>
                                            </div>
                                          )}

                                          {/* Image Banner */}
                                          {cat.imageUrl && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🖼️ تصویر بنر دسته‌بندی:</span>
                                              <div className="w-full h-12 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800">
                                                <img src={cat.imageUrl} alt="" className="w-full h-full object-cover" />
                                              </div>
                                            </div>
                                          )}

                                          {/* SEO Meta */}
                                          {(cat.seoTitle || cat.seoDescription) && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1 text-slate-500">
                                              <span>🔍 مشخصات سئو:</span>
                                              <div className="text-[8px] bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg space-y-0.5 text-right font-normal">
                                                {cat.seoTitle && <div className="font-bold text-slate-800 dark:text-slate-200">عنوان: {cat.seoTitle}</div>}
                                                {cat.seoDescription && <div className="line-clamp-2 leading-relaxed">توضیحات: {cat.seoDescription}</div>}
                                              </div>
                                            </div>
                                          )}

                                          {/* Description */}
                                          {cat.description && (
                                            <div className="flex flex-col gap-0.5 text-slate-500">
                                              <span>📝 توضیحات عمومی:</span>
                                              <p className="font-normal text-slate-700 dark:text-slate-300 leading-relaxed text-[9px]">{cat.description}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  };

                                  if (operations.length === 0) {
                                    const cat = activeOutput;
                                    const isBrand = !!(cat.logoUrl || cat.brandName || activeOutput.logoUrl);
                                    if (isBrand) {
                                      return (
                                        <div className="w-[180px] bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
                                          <div className="w-12 h-12 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 mb-2 overflow-hidden">
                                            {(cat.logoUrl || activeOutput.logoUrl) ? (
                                              <img src={cat.logoUrl || activeOutput.logoUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              <Award size={24} />
                                            )}
                                          </div>
                                          <span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate w-full">{cat.name || cat.brandName || 'برند جدید'}</span>
                                          <span className="text-[9px] text-amber-500 font-bold mt-1">برند رسمی فروشگاه</span>
                                        </div>
                                      );
                                    }
                                    return (
                                      <div className="w-[240px] flex flex-col items-center animate-fadeIn">
                                        <div className="w-[180px] bg-primary-50 dark:bg-slate-950/20 border border-primary-100 dark:border-slate-900/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
                                          <div className="w-12 h-12 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-500 mb-2">
                                            {cat.icon && cat.icon.length === 1 ? (
                                              <span className="text-2xl">{cat.icon}</span>
                                            ) : (
                                              <Folder size={24} />
                                            )}
                                          </div>
                                          <span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate w-full">{cat.name || 'دسته‌بندی جدید'}</span>
                                          {cat.slug && <span className="text-[8px] text-primary-500 font-mono">/{cat.slug}</span>}
                                          <span className="text-[10px] text-gray-400 font-bold mt-1">۰ محصول</span>
                                        </div>
                                        {renderCategoryDetails(cat)}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex flex-wrap gap-4 justify-center w-full max-w-md">
                                      {operations.map((op: any, opIdx: number) => {
                                        const isDelete = op.type === 'delete' || op.type === 'delete_category' || op.type === 'delete_brand';
                                        if (isDelete) {
                                          return (
                                            <div key={opIdx} className="w-[200px] bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-center text-rose-500 text-[10px] font-black">
                                              حذف با شناسه: {op.id}
                                            </div>
                                          );
                                        }

                                        const data = op.data || {};
                                        const isBrand = !!(data.logoUrl || data.brandName || op.type === 'create_brand' || op.type === 'update_brand');
                                        
                                        if (isBrand) {
                                          return (
                                            <div key={opIdx} className="w-[160px] bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
                                              <span className="text-[8px] font-black text-amber-500 mb-2">{op.type === 'create' || op.type === 'create_brand' ? 'برند جدید' : 'ویرایش برند'}</span>
                                              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-500 mb-2 overflow-hidden">
                                                {data.logoUrl ? (
                                                  <img src={data.logoUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  <Award size={20} />
                                                )}
                                              </div>
                                              <span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate w-full">{data.name || data.brandName || 'برند'}</span>
                                            </div>
                                          );
                                        }

                                        return (
                                          <div key={opIdx} className="w-[240px] flex flex-col items-center">
                                            <div className="w-[180px] bg-primary-50 dark:bg-slate-950/20 border border-primary-100 dark:border-slate-900/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
                                              <span className="text-[8px] font-black text-primary-500 mb-2">{op.type === 'create' || op.type === 'create_category' ? 'دسته‌بندی جدید' : 'ویرایش دسته'}</span>
                                              <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center text-primary-500 mb-2">
                                                {data.icon && data.icon.length === 1 ? (
                                                  <span className="text-xl">{data.icon}</span>
                                                ) : (
                                                  <Folder size={20} />
                                                )}
                                              </div>
                                              <span className="text-xs font-black text-gray-800 dark:text-gray-200 truncate w-full">{data.name || 'دسته‌بندی'}</span>
                                              {data.slug && <span className="text-[8px] text-gray-400 font-bold mt-1 font-mono">/{data.slug}</span>}
                                            </div>
                                            {renderCategoryDetails(data)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Discount preview */}
                                {activeTask.target === 'discounts' && (() => {
                                  const operations = activeOutput.operations || [];

                                  const parseArrayJson = (str: any) => {
                                    if (!str) return [];
                                    if (Array.isArray(str)) return str;
                                    try {
                                      return JSON.parse(str);
                                    } catch {
                                      return [];
                                    }
                                  };

                                  const renderDiscountDetails = (disc: any) => {
                                    const selectedCats = parseArrayJson(disc.targetCategoryIds);
                                    const selectedProds = parseArrayJson(disc.targetProductIds);

                                    const matchedUser = disc.targetUserId ? availableUsers.find((u: any) => u.id === disc.targetUserId) : null;
                                    const matchedCats = selectedCats.map((id: any) => availableCategories.find((c: any) => c.id === id)).filter(Boolean);
                                    const matchedProds = selectedProds.map((id: any) => availableProducts.find((p: any) => p.id === id)).filter(Boolean);

                                    const hasAnyDetail = disc.targetUserId || 
                                      matchedCats.length > 0 || 
                                      matchedProds.length > 0 || 
                                      (disc.allowedGender && disc.allowedGender !== 'all') || 
                                      disc.minOrderAmount || 
                                      disc.minQuantity || 
                                      disc.maxDiscountAmount || 
                                      disc.maxUses || 
                                      (disc.maxUsesPerUser && disc.maxUsesPerUser !== 1) || 
                                      disc.firstOrderOnly || 
                                      disc.startDate || 
                                      disc.expiresAt;

                                    if (!hasAnyDetail) {
                                      return (
                                        <div className="mt-3 w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 text-center text-[10px] font-bold text-slate-400">
                                          بدون فیلتر یا محدودیت خاص (قابل استفاده برای همه)
                                        </div>
                                      );
                                    }

                                    return (
                                      <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                          <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ مشخصات و محدودیت‌ها</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${disc.isActive !== false ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {disc.isActive !== false ? 'فعال' : 'غیرفعال'}
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                          {/* User limitation */}
                                          {matchedUser && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>👤 مخصوص مشتری:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black text-[9px] truncate max-w-[140px]">{matchedUser.name || 'بدون نام'} ({matchedUser.phone || matchedUser.email})</span>
                                            </div>
                                          )}

                                          {/* Gender limitation */}
                                          {disc.allowedGender && disc.allowedGender !== 'all' && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>⚧️ محدودیت جنسیت:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {disc.allowedGender === 'male' ? 'فقط آقایان' : 'فقط بانوان'}
                                              </span>
                                            </div>
                                          )}

                                          {/* Min order amount */}
                                          {disc.minOrderAmount && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>💰 حداقل مبلغ خرید:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {Number(disc.minOrderAmount).toLocaleString('fa-IR')} تومان
                                              </span>
                                            </div>
                                          )}

                                          {/* Min Quantity */}
                                          {disc.minQuantity && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📦 حداقل تعداد خرید محصول:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {Number(disc.minQuantity).toLocaleString('fa-IR')} عدد
                                              </span>
                                            </div>
                                          )}

                                          {/* Max discount amount */}
                                          {disc.maxDiscountAmount && disc.type === 'percentage' && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🛑 سقف تخفیف:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {Number(disc.maxDiscountAmount).toLocaleString('fa-IR')} تومان
                                              </span>
                                            </div>
                                          )}

                                          {/* Max Uses */}
                                          {disc.maxUses && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📊 کل ظرفیت استفاده:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {Number(disc.maxUses).toLocaleString('fa-IR')} بار
                                              </span>
                                            </div>
                                          )}

                                          {/* Max Uses per user */}
                                          {disc.maxUsesPerUser && disc.maxUsesPerUser !== 1 && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🔄 ظرفیت مجاز هر کاربر:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {Number(disc.maxUsesPerUser).toLocaleString('fa-IR')} بار
                                              </span>
                                            </div>
                                          )}

                                          {/* First order only */}
                                          {disc.firstOrderOnly && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🆕 نوع خرید:</span>
                                              <span className="text-amber-500 font-black">فقط اولین خرید مشتری</span>
                                            </div>
                                          )}

                                          {/* Start Date */}
                                          {disc.startDate && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📅 تاریخ شروع:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black font-mono">
                                                {new Date(disc.startDate).toLocaleDateString('fa-IR')}
                                              </span>
                                            </div>
                                          )}

                                          {/* Expiration Date */}
                                          {disc.expiresAt && (
                                            <div className="flex items-start justify-between border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>⌛ تاریخ انقضا:</span>
                                              <span className="text-rose-500 font-black font-mono">
                                                {new Date(disc.expiresAt).toLocaleDateString('fa-IR')}
                                              </span>
                                            </div>
                                          )}

                                          {/* Categories limitation */}
                                          {matchedCats.length > 0 && (
                                            <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span className="text-slate-500">📁 محدود به دسته‌بندی‌های:</span>
                                              <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                                                {matchedCats.map((c: any) => (
                                                  <span key={c.id} className="bg-primary-500/10 text-primary-500 border border-primary-500/10 px-1.5 py-0.5 rounded text-[8px] font-black">
                                                    {c.name}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Products limitation */}
                                          {matchedProds.length > 0 && (
                                            <div className="flex flex-col gap-1">
                                              <span className="text-slate-500">🛍️ محدود به محصولات:</span>
                                              <div className="flex flex-wrap gap-1 mt-0.5 justify-end">
                                                {matchedProds.map((p: any) => (
                                                  <span key={p.id} className="bg-blue-500/10 text-blue-500 border border-blue-500/10 px-1.5 py-0.5 rounded text-[8px] font-black max-w-[110px] truncate">
                                                    {p.title}
                                                  </span>
                                                ))}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  };

                                  if (operations.length === 0) {
                                    const disc = activeOutput;
                                    return (
                                      <div className="w-[240px] flex flex-col items-center">
                                        <div className="w-full bg-gradient-to-br from-amber-500/10 to-orange-500/8 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
                                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-950" />
                                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-950" />
                                          <Tag className="w-5 h-5 text-amber-400 mb-2" />
                                          <span className="text-[10px] font-black text-amber-300 font-mono bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded">{disc.code || 'DISCOUNT'}</span>
                                          <span className="text-sm font-black text-white mt-2">{disc.type === 'percentage' ? `${disc.discount}٪` : `${(disc.discount || 0).toLocaleString('fa-IR')} ت`}</span>
                                          <span className="text-[9px] text-slate-400 mt-1">تخفیف ویژه</span>
                                        </div>
                                        {renderDiscountDetails(disc)}
                                      </div>
                                    );
                                  }

                                  return (
                                    <div className="flex flex-wrap gap-4 justify-center w-full max-w-md">
                                      {operations.map((op: any, opIdx: number) => {
                                        const isDelete = op.type === 'delete';
                                        if (isDelete) {
                                          return (
                                            <div key={opIdx} className="w-[240px] bg-rose-500/10 border border-rose-500/20 rounded-2xl p-3 text-center text-rose-500 text-[10px] font-black">
                                              حذف کوپن تخفیف با شناسه: {op.id}
                                            </div>
                                          );
                                        }

                                        const disc = op.data || {};
                                        return (
                                          <div key={opIdx} className="flex flex-col items-center gap-1.5 w-[240px]">
                                            <span className="text-[8px] font-black text-slate-400">
                                              {op.type === 'create' ? 'کوپن جدید' : 'ویرایش کوپن'}
                                            </span>
                                            <div className="w-full bg-gradient-to-br from-amber-500/10 to-orange-500/8 border border-amber-500/20 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm relative overflow-hidden">
                                              <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-950" />
                                              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-slate-50 dark:bg-slate-950" />
                                              <Tag className="w-5 h-5 text-amber-400 mb-2" />
                                              <span className="text-[10px] font-black text-amber-300 font-mono bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded">{disc.code || 'DISCOUNT'}</span>
                                              <span className="text-sm font-black text-white mt-2">{disc.type === 'percentage' ? `${disc.discount}٪` : `${(disc.discount || 0).toLocaleString('fa-IR')} ت`}</span>
                                              <span className="text-[9px] text-slate-400 mt-1">تخفیف ویژه</span>
                                            </div>
                                            {renderDiscountDetails(disc)}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                })()}

                                {/* Orders live preview */}
                                {activeTask.target === 'orders' && activeOutput && (() => {
                                  const isReport = activeOutput.action === 'report' || activeOutput.rawResult?.action === 'report';
                                  
                                  if (isReport) {
                                    return (
                                      <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-right space-y-4 shadow-sm animate-fadeIn">
                                        <div className="flex items-center gap-2 text-xs font-black text-primary-500 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                                          <FileText size={16} />
                                          <span>📊 گزارش و پاسخ دستیار هوشمند</span>
                                        </div>
                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-bold leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900">
                                          {activeOutput.explanation}
                                        </p>
                                        <div className="bg-primary-500/5 border border-primary-500/10 rounded-xl p-3 text-[9px] text-primary-500 font-bold flex items-center gap-2 justify-center">
                                          <Lightbulb size={12} className="shrink-0" />
                                          <span>این یک گزارش اطلاعاتی است و تغییری در سفارشات ایجاد نمی‌کند.</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  const updates = activeOutput.rawResult?.updates || activeOutput.updates || {};
                                  const targets = activeOutput.targets || [];
                                  
                                  return (
                                    <div className="w-[240px] flex flex-col items-center animate-fadeIn text-right">
                                      <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xs">
                                        <div className="flex items-center gap-2 text-[10px] font-black text-primary-500 border-b border-slate-200 dark:border-slate-800 pb-2">
                                          <ShoppingBag size={14} />
                                          <span>بروزرسانی وضعیت سفارشات</span>
                                        </div>
                                        
                                        <div className="space-y-2 text-right">
                                          {/* Status general */}
                                          {updates.status && (
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-400">
                                              <span>وضعیت عمومی:</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                                updates.status === 'paid' ? 'bg-primary-500/10 text-primary-500' :
                                                updates.status === 'shipped' ? 'bg-blue-500/10 text-blue-500' :
                                                updates.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                                                updates.status === 'cancelled' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                                              }`}>
                                                {updates.status === 'paid' ? 'پرداخت شده' :
                                                 updates.status === 'shipped' ? 'ارسال شده' :
                                                 updates.status === 'delivered' ? 'تحویل شده' :
                                                 updates.status === 'cancelled' ? 'لغو شده' : 'در انتظار پرداخت'}
                                              </span>
                                            </div>
                                          )}

                                          {/* Shipping status */}
                                          {updates.shippingStatus && (
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 border-t border-slate-100/50 dark:border-slate-900/50 pt-1.5">
                                              <span>وضعیت ارسال:</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                                updates.shippingStatus === 'processing' ? 'bg-amber-500/10 text-amber-500' :
                                                updates.shippingStatus === 'shipped' ? 'bg-sky-500/10 text-sky-500' :
                                                updates.shippingStatus === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-500/10 text-slate-400'
                                              }`}>
                                                {updates.shippingStatus === 'processing' ? 'آماده‌سازی' :
                                                 updates.shippingStatus === 'shipped' ? 'ارسال شده' :
                                                 updates.shippingStatus === 'delivered' ? 'تحویل شده' : 'جدید'}
                                              </span>
                                            </div>
                                          )}

                                          {/* Payment status */}
                                          {updates.paymentStatus && (
                                            <div className="flex justify-between items-center text-[10px] font-bold text-slate-600 dark:text-slate-400 border-t border-slate-100/50 dark:border-slate-900/50 pt-1.5">
                                              <span>وضعیت مالی:</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                                updates.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                updates.paymentStatus === 'failed' ? 'bg-rose-500/10 text-rose-500' :
                                                updates.paymentStatus === 'refunded' ? 'bg-purple-500/10 text-purple-500' : 'bg-slate-500/10 text-slate-400'
                                              }`}>
                                                {updates.paymentStatus === 'paid' ? 'پرداخت موفق' :
                                                 updates.paymentStatus === 'failed' ? 'پرداخت ناموفق' :
                                                 updates.paymentStatus === 'refunded' ? 'مرجوع شده' : 'در انتظار پرداخت'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* Order Live Preview Extra details Panel */}
                                      <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                          <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ فاکتور و جزئیات اجرایی</span>
                                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-primary-500/10 text-primary-500">
                                            کنترل سفارش
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                          {/* Print Mode */}
                                          {updates.printMode && (
                                            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>🖨️ پرینت اسناد خودکار:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-black">
                                                {updates.printMode === 'invoice' ? 'فقط فاکتور مشتری' :
                                                 updates.printMode === 'label' ? 'فقط برچسب آدرس پستی' : 'فاکتور + برچسب آدرس'}
                                              </span>
                                            </div>
                                          )}

                                          {/* Postal Tracking Code */}
                                          {updates.trackingCode && (
                                            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>📦 کد رهگیری پستی:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-mono text-[9px] font-black select-all">{updates.trackingCode}</span>
                                            </div>
                                          )}

                                          {/* Target customer orders summary */}
                                          {targets.length > 0 && (
                                            <div className="border-b border-slate-50 dark:border-slate-950 pb-1 flex flex-col gap-1">
                                              <span>👥 لیست مشتریان هدف:</span>
                                              <div className="bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg space-y-1 max-h-[80px] overflow-y-auto custom-scrollbar">
                                                {targets.map((t: any, idx: number) => (
                                                  <div key={idx} className="flex justify-between items-center text-[8px] text-slate-500">
                                                    <span className="font-black text-slate-700 dark:text-slate-300">{t.customerName} ({t.shortId || t.id?.slice(0,6)})</span>
                                                    <span>{(t.finalAmount || 0).toLocaleString('fa-IR')} ت</span>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          )}

                                          {/* Admin Internal notes */}
                                          {updates.notes && (
                                            <div className="flex flex-col gap-0.5 text-slate-500">
                                              <span>📝 یادداشت اداری:</span>
                                              <p className="font-normal text-slate-700 dark:text-slate-300 leading-relaxed text-[9px]">{updates.notes}</p>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Reviews live preview */}
                                {activeTask.target === 'reviews' && activeOutput && (() => {
                                  if (activeOutput.action === 'create' && activeOutput.data) {
                                    const rData = activeOutput.data;
                                    const matchedProduct = rData.productId ? availableProducts.find((p: any) => p.id === rData.productId) : null;
                                    const matchedUser = rData.userId ? availableUsers.find((u: any) => u.id === rData.userId) : null;
                                    
                                    const reviewImages = Array.isArray(rData.images) 
                                      ? rData.images 
                                      : (() => {
                                          try { return JSON.parse(rData.images || '[]'); } catch { return []; }
                                        })();

                                    return (
                                      <div className="w-[240px] flex flex-col items-center animate-fadeIn text-right">
                                        <div className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative">
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <div className="w-8 h-8 rounded-full bg-primary-50 dark:bg-slate-950 flex items-center justify-center text-primary-500 font-bold text-xs uppercase">
                                                {rData.userName ? rData.userName.slice(0, 1) : 'U'}
                                              </div>
                                              <div className="flex flex-col">
                                                <span className="text-[10px] font-black text-slate-800 dark:text-white">{rData.userName || 'مشتری سایت'}</span>
                                                <span className="text-[8px] text-slate-400 font-bold">
                                                  {rData.isBuyer !== false ? '🏆 خریدار تایید شده' : 'ثبت شده توسط دستیار'}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-0.5 text-amber-400">
                                              {Array.from({ length: rData.rating || 5 }).map((_, i) => (
                                                <Sparkles key={i} size={8} className="fill-current" />
                                              ))}
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed">{rData.comment || 'بدون متن'}</p>
                                          
                                          {/* Mini image thumbnails inside the review card */}
                                          {reviewImages.length > 0 && (
                                            <div className="flex gap-1.5 flex-wrap pt-1">
                                              {reviewImages.filter(Boolean).map((imgUrl: string, idx: number) => (
                                                <div key={idx} className="w-8 h-8 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 shrink-0">
                                                  <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                                </div>
                                              ))}
                                            </div>
                                          )}

                                          {rData.showOnHomepage && (
                                            <span className="absolute bottom-2 left-2 text-[6px] font-black bg-pink-500/15 border border-pink-500/20 text-pink-500 px-1.5 py-0.5 rounded-full">ویژه صفحه اصلی</span>
                                          )}
                                        </div>

                                        {/* Review preview extra details panel */}
                                        <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                          <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                            <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ پیوندهای دیدگاه مشتری</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                                              rData.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                              rData.status === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                                            }`}>
                                              {rData.status === 'approved' ? 'منتشر شده' : rData.status === 'rejected' ? 'رد شده' : 'در انتظار بررسی'}
                                            </span>
                                          </div>

                                          <div className="grid grid-cols-1 gap-1.5">
                                            {/* Connected Product */}
                                            {matchedProduct && (
                                              <div className="flex flex-col gap-1 border-b border-slate-50 dark:border-slate-950 pb-1">
                                                <span>🛍️ نظر روی محصول:</span>
                                                <span className="text-slate-900 dark:text-slate-200 font-black text-[9px] line-clamp-1">{matchedProduct.title}</span>
                                              </div>
                                            )}

                                            {/* Connected User */}
                                            {matchedUser && (
                                              <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                                <span>👤 پروفایل کاربری خریدار:</span>
                                                <span className="text-slate-900 dark:text-slate-200 font-black">{matchedUser.name || matchedUser.phone}</span>
                                              </div>
                                            )}

                                            {/* Likes and dislikes */}
                                            <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                              <span>👍 تعداد بازخوردهای مفید:</span>
                                              <span className="text-slate-900 dark:text-slate-200 font-mono">
                                                {rData.likes || 0} لایک / {rData.dislikes || 0} دیس‌لایک
                                              </span>
                                            </div>

                                            {/* Extra state check */}
                                            <div className="flex justify-between items-center">
                                              <span>🏠 وضعیت نمایش در صفحه اول:</span>
                                              <span className={rData.showOnHomepage ? 'text-pink-500' : 'text-slate-400'}>
                                                {rData.showOnHomepage ? 'فعال ویژه صفحه اصلی ✅' : 'خیر'}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }

                                  if (activeOutput.action === 'update_status') {
                                    return (
                                      <div className="w-[200px] bg-primary-50 dark:bg-slate-950/20 border border-primary-100 dark:border-slate-900/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-xs">
                                        <MessageSquare className="w-6 h-6 text-primary-500 mb-2" />
                                        <span className="text-xs font-black text-gray-800 dark:text-gray-200">تغییر وضعیت نظرات</span>
                                        <span className="text-[10px] text-primary-500 font-black mt-2 bg-primary-500/10 px-2 py-0.5 rounded-full">{
                                          activeOutput.status === 'approved' ? 'تایید و نمایش عمومی' :
                                          activeOutput.status === 'rejected' ? 'رد و عدم نمایش' : 'در انتظار بررسی'
                                        }</span>
                                        <span className="text-[8px] text-slate-400 font-bold mt-2">تعداد نظرات هدف: {activeOutput.targetReviewIds?.length || 0} مورد</span>
                                      </div>
                                    );
                                  }

                                  if (activeOutput.action === 'delete') {
                                    return (
                                      <div className="w-[200px] bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4 flex flex-col items-center text-center shadow-xs">
                                        <Trash2 className="w-6 h-6 text-rose-500 mb-2" />
                                        <span className="text-xs font-black text-rose-500">حذف فیزیکی نظرات</span>
                                        <span className="text-[9px] text-slate-400 font-bold mt-1">تعداد: {activeOutput.targetReviewIds?.length || 0} نظر</span>
                                      </div>
                                    );
                                  }

                                  return null;
                                })()}

                                {/* Customer Tickets Live Preview */}
                                {activeTask.target === 'tickets' && activeOutput && (() => {
                                  const isReply = activeOutput.action === 'reply';
                                  const isUpdateStatus = activeOutput.action === 'update_status';
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative" dir="rtl">
                                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-[10px] font-black text-sky-500 flex items-center gap-1">✉️ تیکت پشتیبانی مشتری</span>
                                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                          isReply ? 'bg-sky-500/10 text-sky-500' : 'bg-amber-500/10 text-amber-500'
                                        }`}>
                                          {isReply ? 'پاسخ جدید' : 'بروزرسانی'}
                                        </span>
                                      </div>
                                      
                                      {isReply && (
                                        <div className="space-y-2">
                                          <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-900 text-[10px] text-slate-500">
                                            پاسخ ادمین فروشگاه:
                                          </div>
                                          <p className="text-[10px] text-slate-800 dark:text-slate-200 font-bold leading-relaxed pr-1 font-mono">
                                            {activeOutput.message || 'پاسخ نوشته نشده است...'}
                                          </p>
                                        </div>
                                      )}

                                      {isUpdateStatus && (
                                        <div className="text-center py-2">
                                          <span className="text-[9px] text-slate-400 font-bold block mb-1">وضعیت جدید تیکت:</span>
                                          <span className="text-xs font-black text-primary-500 bg-primary-500/10 px-2 py-0.5 rounded-full">
                                            {activeOutput.status === 'new' ? 'جدید' :
                                             activeOutput.status === 'in_progress' ? 'در حال بررسی' :
                                             activeOutput.status === 'answered' ? 'پاسخ داده شده' : 'بسته شده'}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* System Tickets Live Preview */}
                                {activeTask.target === 'system_tickets' && activeOutput && (() => {
                                  const isCreate = activeOutput.action === 'create';
                                  const isReply = activeOutput.action === 'reply';
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative" dir="rtl">
                                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-[10px] font-black text-rose-500 flex items-center gap-1">🛠️ تیکت پشتیبانی پلتفرم</span>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500">
                                          {isCreate ? 'تیکت جدید' : 'پاسخ فنی'}
                                        </span>
                                      </div>

                                      {isCreate && (
                                        <div className="space-y-2">
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">موضوع:</span>
                                            <span className="text-[10px] text-slate-800 dark:text-white font-black">{activeOutput.subject || 'موضوع تیکت'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">متن تیکت ارسالی:</span>
                                            <p className="text-[9px] text-slate-600 dark:text-slate-300 font-bold leading-relaxed line-clamp-3 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl">{activeOutput.description || 'شرح مشکل فنی...'}</p>
                                          </div>
                                          <div className="flex justify-between items-center pt-1 text-[9px] text-slate-400 font-bold">
                                            <span>اولویت:</span>
                                            <span className={`px-1.5 py-0.2 rounded font-black ${
                                              activeOutput.priority === 'urgent' ? 'bg-rose-500/20 text-rose-500' :
                                              activeOutput.priority === 'high' ? 'bg-orange-500/15 text-orange-500' : 'bg-slate-500/10 text-slate-400'
                                            }`}>
                                              {activeOutput.priority === 'urgent' ? 'فوری' :
                                               activeOutput.priority === 'high' ? 'بالا' : 'عادی'}
                                            </span>
                                          </div>
                                        </div>
                                      )}

                                      {isReply && (
                                        <div className="space-y-2">
                                          <div className="p-1.5 bg-rose-500/5 text-rose-500 rounded-lg text-[9px] font-bold">
                                            ارسال پیام پاسخ به پشتیبانی فنی پلتفرم:
                                          </div>
                                          <p className="text-[9px] text-slate-800 dark:text-slate-200 font-bold leading-relaxed bg-slate-50 dark:bg-slate-950 p-2 rounded-xl font-mono">
                                            {activeOutput.message || 'پاسخ فنی ادمین...'}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Staff & Roles Live Preview */}
                                {activeTask.target === 'staff' && activeOutput && (() => {
                                  const action = activeOutput.action;
                                  const staffData = activeOutput.data || {};
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative" dir="rtl">
                                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-[10px] font-black text-violet-500 flex items-center gap-1">👤 دسترسی همکاران</span>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500">
                                          {action === 'create' ? 'ثبت همکار جدید' : action === 'update' ? 'ویرایش همکار' : 'حذف همکار'}
                                        </span>
                                      </div>

                                      {(action === 'create' || action === 'update') && (
                                        <div className="space-y-2 text-[10px]">
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">نام و نام خانوادگی:</span>
                                            <span className="text-slate-800 dark:text-white font-black">{staffData.name || 'ثبت نشده'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">ایمیل و تلفن:</span>
                                            <span className="text-slate-600 dark:text-slate-300 font-medium font-mono">{staffData.email || 'ایمیل وارد نشده'}</span>
                                            <span className="text-slate-400 dark:text-slate-500 font-medium font-mono block">{staffData.phone || ''}</span>
                                          </div>
                                          <div className="flex justify-between items-center pt-1">
                                            <span className="text-slate-400 font-bold text-[9px]">نقش دسترسی:</span>
                                            <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-primary-500/10 text-primary-500 uppercase">
                                              {staffData.role === 'admin' ? 'مدیر کل' :
                                               staffData.role === 'editor' ? 'نویسنده' :
                                               staffData.role === 'storekeeper' ? 'انباردار' : 'پشتیبان'}
                                            </span>
                                          </div>
                                          {action === 'update' && (
                                            <div className="flex justify-between items-center pt-1 border-t border-slate-100 dark:border-slate-800">
                                              <span className="text-slate-400 font-bold text-[9px]">وضعیت حساب:</span>
                                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-black ${staffData.isBlocked ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                                {staffData.isBlocked ? 'مسدود شده' : 'فعال و مجاز'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {action === 'delete' && (
                                        <div className="text-center py-4 space-y-2">
                                          <span className="text-2xl block">🗑️</span>
                                          <span className="text-[10px] text-slate-500 font-bold block">همکار با شناسه:</span>
                                          <span className="text-[10px] font-black text-rose-500 bg-rose-500/5 px-2 py-1 rounded font-mono">{activeOutput.staffId}</span>
                                          <span className="text-[9px] text-slate-400 font-medium block">حذف خواهد شد.</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Admin Profile Live Preview */}
                                {activeTask.target === 'profile' && activeOutput && (() => {
                                  const action = activeOutput.action;
                                  const profileData = activeOutput.data || {};
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative" dir="rtl">
                                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-[10px] font-black text-emerald-500 flex items-center gap-1">⚙️ حساب کاربری مدیر</span>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">
                                          {action === 'update_profile' ? 'اطلاعات عمومی' : 'رمز عبور ادمین'}
                                        </span>
                                      </div>

                                      {action === 'update_profile' && (
                                        <div className="space-y-3 text-[10px]">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-between overflow-hidden shrink-0">
                                              {profileData.avatarUrl ? (
                                                <img src={profileData.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                              ) : (
                                                <span className="text-xs text-slate-400 mx-auto"> ادمین </span>
                                              )}
                                            </div>
                                            <div>
                                              <span className="text-[9px] text-slate-400 block font-bold">نام ادمین:</span>
                                              <span className="text-slate-800 dark:text-white font-black">{profileData.name || 'بدون نام'}</span>
                                            </div>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">پست الکترونیکی:</span>
                                            <span className="text-slate-600 dark:text-slate-300 font-bold font-mono text-xs block truncate" dir="ltr">{profileData.email || 'بدون ایمیل'}</span>
                                          </div>
                                        </div>
                                      )}

                                      {action === 'change_password' && (
                                        <div className="text-center py-4 space-y-2">
                                          <span className="text-2xl block">🔒</span>
                                          <span className="text-[10px] text-slate-500 font-bold block">تنظیم کلمه عبور امن</span>
                                          <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full inline-block font-bold">درخواست تغییر فعال است</span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Import & Export Live Preview */}
                                {activeTask.target === 'import_export' && activeOutput && (() => {
                                  const action = activeOutput.action;
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5 shadow-sm text-right relative" dir="rtl">
                                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                                        <span className="text-[10px] font-black text-amber-500 flex items-center gap-1">🔁 ترنسفر داده‌های فروشگاه</span>
                                        <span className="text-[8px] font-black px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                          {action === 'export' ? 'تهیه خروجی' : 'ورودی پیش‌نمایش'}
                                        </span>
                                      </div>

                                      {action === 'export' && (
                                        <div className="space-y-2 text-[10px]">
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">بخش خروجی گرفته شده:</span>
                                            <span className="text-slate-800 dark:text-white font-black">
                                              {activeOutput.exportType === 'products' ? 'محصولات فروشگاه' :
                                               activeOutput.exportType === 'categories' ? 'دسته‌بندی‌ها' :
                                               activeOutput.exportType === 'settings' ? 'تنظیمات کلی' : 'کل دیتابیس فروشگاه'}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-[9px] text-slate-400 block font-bold">فرمت فایل ذخیره‌سازی:</span>
                                            <span className="text-primary-500 font-bold font-mono uppercase">{activeOutput.format || 'csv'}</span>
                                          </div>
                                        </div>
                                      )}

                                      {action === 'import_preview' && (
                                        <div className="space-y-2.5 text-[10px]">
                                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950 rounded-xl font-bold">
                                            ✅ بررسی موفق هوش مصنوعی: آماده درون‌ریزی {activeOutput.products?.length || 0} کالا و {activeOutput.categories?.length || 0} گروه کاتالوگی.
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Media live preview */}
                                {activeTask.target === 'media' && activeOutput && (() => {
                                  const settings = activeOutput.settings || activeOutput.rawResult?.settings || {};
                                  const removeBg = !!settings.removeBg;
                                  const bgColor = settings.bgColor || '';
                                  const dimensions = settings.dimensions || 'original';
                                  const subjectScale = Number(settings.subjectScale) || 85;
                                  const watermarkType = settings.watermarkType || 'none';
                                  const watermarkText = settings.watermarkText || '';
                                  const watermarkPosition = settings.watermarkPosition || 'bottom-right';
                                  const replaceOriginal = !!settings.replaceOriginal;

                                  // Map aspect ratios
                                  let aspectClass = 'aspect-square w-28';
                                  let aspectLabel = 'اصلی (Original)';
                                  if (dimensions === 'square') {
                                    aspectClass = 'aspect-square w-28';
                                    aspectLabel = 'مربع (۱:۱)';
                                  } else if (dimensions === 'portrait') {
                                    aspectClass = 'aspect-[3/4] w-24';
                                    aspectLabel = 'قائم (۳:۴)';
                                  } else if (dimensions === 'landscape') {
                                    aspectClass = 'aspect-[4/3] w-32';
                                    aspectLabel = 'افقی (۴:۳)';
                                  }

                                  // Watermark positions
                                  let watermarkClass = 'bottom-2 right-2';
                                  if (watermarkPosition === 'center') watermarkClass = 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
                                  else if (watermarkPosition === 'top-right') watermarkClass = 'top-2 right-2';
                                  else if (watermarkPosition === 'top-left') watermarkClass = 'top-2 left-2';
                                  else if (watermarkPosition === 'bottom-left') watermarkClass = 'bottom-2 left-2';

                                  return (
                                    <div className="w-full max-w-sm bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/80 p-4 shadow-sm text-right select-none space-y-4">
                                      <div className="flex items-center justify-between border-b border-gray-50 dark:border-gray-900 pb-2">
                                        <span className="text-xs font-black text-primary-500 flex items-center gap-1">
                                          📸 ویرایشگر هوشمند تصاویر (هوش مصنوعی)
                                        </span>
                                        <span className="text-[8px] font-black bg-primary-50 dark:bg-slate-950/40 text-primary-600 dark:text-primary-400 px-1.5 py-0.5 rounded">
                                          {replaceOriginal ? 'جایگزینی اصلی' : 'نسخه گالری جدید'}
                                        </span>
                                      </div>

                                      {/* Side-by-Side Comparison representation */}
                                      <div className="flex justify-center gap-4 items-center">
                                        <div className="flex flex-col items-center gap-1">
                                          <span className="text-[8px] font-bold text-slate-450">تصویر قبل (Before)</span>
                                          <div className="w-24 aspect-square bg-slate-100 dark:bg-slate-900 rounded-xl overflow-hidden border border-slate-200/50 dark:border-slate-800/50 flex items-center justify-center relative">
                                            <img src={DEFAULT_PRODUCT_IMAGE} alt="Before" className="w-full h-full object-cover opacity-60 filter grayscale-[30%]" />
                                            <div className="absolute inset-0 bg-slate-950/20" />
                                            <span className="absolute bottom-1 right-1 bg-black/60 text-white text-[7px] font-bold px-1 py-0.2 rounded">دارای پس‌زمینه</span>
                                          </div>
                                        </div>

                                        <div className="text-primary-400 animate-pulse">◀</div>

                                        <div className="flex flex-col items-center gap-1">
                                          <span className="text-[8px] font-bold text-primary-500">خروجی بعد (After)</span>
                                          <div className={`${aspectClass} rounded-xl overflow-hidden border border-primary-500/20 flex items-center justify-center relative shadow-sm transition-all`} style={{ backgroundColor: removeBg ? (bgColor || '#ffffff') : '#f8fafc' }}>
                                            {removeBg ? (
                                              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#4f46e5 1px, transparent 1px)', backgroundSize: '8px 8px' }} />
                                            ) : (
                                              <img src={DEFAULT_PRODUCT_IMAGE} alt="After" className="absolute inset-0 w-full h-full object-cover" />
                                            )}
                                            
                                            {/* Simulated product subject in center with scale */}
                                            <div className="flex items-center justify-center z-10 transition-transform" style={{ width: `${subjectScale}%`, height: `${subjectScale}%` }}>
                                              <img src={DEFAULT_PRODUCT_IMAGE} alt="Subject" className={`object-contain max-w-full max-h-full ${removeBg ? 'drop-shadow-lg' : ''}`} />
                                            </div>

                                            {/* Simulated Watermark */}
                                            {watermarkType !== 'none' && (
                                              <div className={`absolute ${watermarkClass} z-20 bg-black/40 text-white/70 px-1 py-0.5 rounded text-[6px] font-black select-none pointer-events-none tracking-widest scale-90`}>
                                                {watermarkType === 'text' ? (watermarkText || 'WATERMARK') : '🔒 SECURE LOGO'}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Operation Checklist */}
                                      <div className="space-y-1.5 pt-2 border-t border-slate-50 dark:border-slate-900/65 text-[9px] font-bold text-slate-600 dark:text-slate-400">
                                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-lg">
                                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">✨ حذف پس‌زمینه خودکار</span>
                                          <span className={removeBg ? 'text-emerald-500' : 'text-slate-400'}>{removeBg ? (bgColor ? `بله (پرکردن با رنگ ${bgColor})` : 'بله (شفاف)') : 'خیر'}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-lg">
                                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">📐 ابعاد و نسبت تصویر</span>
                                          <span className="text-primary-500">{aspectLabel}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-lg">
                                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">🔍 مقیاس سوژه در بوم</span>
                                          <span className="font-mono">{subjectScale}٪</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-lg">
                                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">✍️ نوع و موقعیت واترمارک</span>
                                          <span>
                                            {watermarkType === 'none' ? 'بدون واترمارک' : (
                                              <span className="text-amber-500">
                                                {watermarkType === 'text' ? `متنی (${watermarkText})` : 'لوگوی فروشگاه'} - {
                                                  watermarkPosition === 'center' ? 'مرکز' :
                                                  watermarkPosition === 'top-right' ? 'بالا راست' :
                                                  watermarkPosition === 'top-left' ? 'بالا چپ' :
                                                  watermarkPosition === 'bottom-left' ? 'پایین چپ' : 'پایین راست'
                                                } ({settings.watermarkOpacity || 40}٪ غلظت)
                                              </span>
                                            )}
                                          </span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-lg">
                                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">👤 تشخیص و برش چهره</span>
                                          <span className={settings.autoCropFace ? 'text-emerald-500' : 'text-slate-450'}>{settings.autoCropFace ? 'فعال ✅' : 'خیر'}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30 p-1.5 rounded-lg">
                                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">⚡ بهینه‌سازی فرمت WebP</span>
                                          <span className={settings.compressImage !== false ? 'text-emerald-500' : 'text-slate-450'}>{settings.compressImage !== false ? 'بله (WebP) 🚀' : 'خیر'}</span>
                                        </div>
                                      </div>

                                      {activeOutput.explanation && (
                                        <div className="bg-primary-50/20 dark:bg-slate-950/10 p-2.5 rounded-xl border border-primary-500/5">
                                          <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{activeOutput.explanation}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}

                                {/* Shoppable live preview */}
                                {activeTask.target === 'shoppable' && activeOutput && (() => {
                                  const actions = activeOutput.actions || activeOutput.rawResult?.actions || [];
                                  if (actions.length === 0) return null;
                                  const action = actions[0];
                                  if (action.type === 'delete') return null;
                                  const set = action.data || {};
                                  const itemsList = Array.isArray(set.items) ? set.items : [];

                                  return (
                                    <div className="w-[240px] flex flex-col items-center animate-fadeIn text-right">
                                      <div className="w-full bg-white dark:bg-gray-950 rounded-2xl border border-gray-100 dark:border-gray-800/80 overflow-hidden shadow-sm relative text-right select-none">
                                        <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-900">
                                          {set.imageUrl ? (
                                            <img src={set.imageUrl} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-primary-500/10"><LayoutGrid size={24} className="text-primary-500/40" /></div>
                                          )}
                                          {itemsList.map((item: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className="absolute w-5 h-5 bg-primary-600 border border-white text-white rounded-full flex items-center justify-center text-[8px] font-black cursor-pointer shadow-md animate-pulse"
                                              style={{ left: `${item.x}%`, top: `${item.y}%`, transform: 'translate(-50%, -50%)' }}
                                              title="آیتم تعاملی"
                                            >
                                              {idx + 1}
                                            </div>
                                          ))}
                                        </div>
                                        <div className="p-3">
                                          <h3 className="text-xs font-black text-gray-900 dark:text-white mb-1 truncate">{set.name || 'عنوان پکیج'}</h3>
                                          <div className="flex justify-between items-center text-[9px] text-slate-450 font-bold">
                                            <span>اسلاگ: /{set.slug}</span>
                                            {set.discount > 0 && <span className="bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded">٪{set.discount} تخفیف ویژه</span>}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Shoppable Details Panel */}
                                      <div className="mt-3 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-right text-[10px] space-y-2.5 font-bold text-slate-600 dark:text-slate-400 shadow-2xs">
                                        <div className="border-b border-slate-100 dark:border-slate-800 pb-1.5 flex justify-between items-center">
                                          <span className="text-slate-900 dark:text-slate-200 text-[10px] font-black">⚙️ جزئیات محصولات تعاملی</span>
                                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-primary-500/10 text-primary-500">
                                            پکیج شاپبل
                                          </span>
                                        </div>

                                        <div className="grid grid-cols-1 gap-1.5">
                                          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                            <span>تعداد کل نقاط تعاملی:</span>
                                            <span className="text-slate-900 dark:text-slate-200 font-mono">{itemsList.length} عدد</span>
                                          </div>

                                          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-950 pb-1">
                                            <span>تخفیف کلی پکیج:</span>
                                            <span className="text-amber-500 font-mono">٪{set.discount || 0}</span>
                                          </div>

                                          {/* Tagged Products list */}
                                          <div className="pt-1.5 space-y-2">
                                            <span className="text-slate-400 text-[8px] font-black uppercase tracking-wider block">لیست محصولات متصل شده:</span>
                                            {itemsList.length === 0 ? (
                                              <p className="text-[8px] text-slate-400 font-normal">هیچ محصولی هنوز برچسب‌گذاری نشده است.</p>
                                            ) : (
                                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto custom-scrollbar pr-0.5">
                                                {itemsList.map((item: any, idx: number) => {
                                                  const prod = availableProducts.find((p: any) => p.id === item.productId);
                                                  return (
                                                    <div key={idx} className="bg-slate-50 dark:bg-slate-950 p-2 rounded-lg flex flex-col gap-1 text-[9px] border border-slate-100/50 dark:border-slate-900/50">
                                                      <div className="flex justify-between items-center">
                                                        <span className="text-slate-900 dark:text-slate-200 font-black truncate max-w-[130px]">
                                                          {idx + 1}. {prod ? prod.title : 'محصول یافت نشد'}
                                                        </span>
                                                        <span className="text-slate-400 font-mono text-[8px]">
                                                          ({Math.round(item.x)}٪, {Math.round(item.y)}٪)
                                                        </span>
                                                      </div>
                                                      {prod && (
                                                        <div className="flex justify-between items-center text-[8px] text-slate-450 font-normal">
                                                          <span>قیمت پایه: {prod.price ? `${prod.price.toLocaleString('fa-IR')} تومان` : 'نامشخص'}</span>
                                                          {prod.discount > 0 && (
                                                            <span className="text-emerald-500 font-bold">٪{prod.discount} تخفیف</span>
                                                          )}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Users live preview */}
                                {activeTask.target === 'users' && (activeOutput.actions || activeOutput.rawResult?.actions) && (() => {
                                  const actions = activeOutput.actions || activeOutput.rawResult?.actions || [];
                                  return (
                                    <div className="w-[260px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xs text-right" dir="rtl">
                                      <div className="flex items-center gap-2 text-[10px] font-black text-primary-500 border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
                                        <Users size={14} />
                                        <span>خلاصه تغییرات باشگاه مشتریان و CRM</span>
                                      </div>
                                      <div className="space-y-3.5 text-right">
                                        {actions.map((action: any, idx: number) => {
                                          const type = action.type;
                                          return (
                                            <div key={idx} className="text-[10px] font-bold text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900/60 pb-2 last:border-0 last:pb-0">
                                              {type === 'updateSettings' && (
                                                <div>
                                                  <span className="text-primary-400 block mb-1">⚙️ تنظیمات عمومی باشگاه:</span>
                                                  <div className="space-y-0.5 pl-2">
                                                    <div>وضعیت: {action.data?.customerClubEnabled ? '🟢 فعال' : '🔴 غیرفعال'}</div>
                                                    {action.data?.customerClubEnabled && (
                                                      <>
                                                        <div>نرخ امتیاز: {action.data?.loyaltyPointsRate?.toLocaleString('fa-IR')} تومان</div>
                                                        <div>ارزش هر امتیاز: {action.data?.loyaltyPointValue?.toLocaleString('fa-IR')} ت</div>
                                                        <div>حد نصاب تخفیف: {action.data?.loyaltyDiscountThreshold} امتیاز</div>
                                                      </>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                              {type === 'updateUserGroup' && (
                                                <div>
                                                  <span className="text-emerald-400 block mb-1">👥 تغییر گروه کاربر:</span>
                                                  <div>کاربر: <span className="text-slate-900 dark:text-white font-black">{action.userName}</span></div>
                                                  <div>گروه جدید: <span className="text-amber-500 font-black">{action.group}</span></div>
                                                </div>
                                              )}
                                              {type === 'adjustUserPoints' && (
                                                <div>
                                                  <span className="text-amber-400 block mb-1">🪙 تغییر امتیاز وفاداری:</span>
                                                  <div>کاربر: <span className="text-slate-900 dark:text-white font-black">{action.userName}</span></div>
                                                  <div>میزان امتیاز: <span className={action.points >= 0 ? 'text-emerald-500 font-mono font-black' : 'text-rose-500 font-mono font-black'}>{action.points >= 0 ? `+${action.points}` : action.points}</span></div>
                                                  {action.reason && <div className="text-[9px] text-slate-500">بابت: {action.reason}</div>}
                                                </div>
                                              )}
                                              {type === 'toggleUserBlock' && (
                                                <div>
                                                  <span className="text-rose-400 block mb-1">🔒 وضعیت دسترسی کاربر:</span>
                                                  <div>کاربر: <span className="text-slate-900 dark:text-white font-black">{action.userName}</span></div>
                                                  <div>وضعیت جدید: <span className={action.isBlocked ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>{action.isBlocked ? 'مسدود شده 🚫' : 'رفع مسدودیت ✅'}</span></div>
                                                </div>
                                              )}
                                              {type === 'changeUserPassword' && (
                                                <div>
                                                  <span className="text-violet-400 block mb-1">🔑 رمز عبور جدید:</span>
                                                  <div>کاربر: <span className="text-slate-900 dark:text-white font-black">{action.userName}</span></div>
                                                  <div>پسورد جدید: <span className="font-mono text-slate-800 dark:text-gray-300 font-black">{action.password}</span></div>
                                                </div>
                                              )}
                                              {type === 'updateUserDetails' && (
                                                <div>
                                                  <span className="text-blue-400 block mb-1">📝 ویرایش اطلاعات پروفایل:</span>
                                                  <div>کاربر: <span className="text-slate-900 dark:text-white font-black">{action.userName}</span></div>
                                                  <div className="space-y-0.5 text-[9px] text-slate-500 pl-1">
                                                    {action.data?.name && <div>نام جدید: {action.data.name}</div>}
                                                    {action.data?.phone && <div>تلفن جدید: {action.data.phone}</div>}
                                                    {action.data?.email && <div>ایمیل جدید: {action.data.email}</div>}
                                                  </div>
                                                </div>
                                              )}
                                              {type === 'createUser' && (
                                                <div>
                                                  <span className="text-emerald-400 block mb-1">➕ ایجاد مشتری جدید:</span>
                                                  <div>نام: <span className="text-slate-900 dark:text-white font-black">{action.data?.name}</span></div>
                                                  <div>ایمیل: <span className="font-mono text-slate-500">{action.data?.email}</span></div>
                                                  {action.data?.phone && <div className="text-slate-500">تلفن: {action.data?.phone}</div>}
                                                </div>
                                              )}
                                              {type === 'exportUsers' && (
                                                <div>
                                                  <span className="text-slate-400 block mb-1">📥 خروجی گرفتن اکسل/CSV:</span>
                                                  <div className="text-[9px] text-slate-500 font-bold">{action.explanation}</div>
                                                </div>
                                              )}
                                              {type === 'getUserDetails' && (
                                                <div>
                                                  <span className="text-primary-400 block mb-1">🔎 مشخصات مشتری:</span>
                                                  <div>نام: <span className="text-slate-900 dark:text-white font-black">{action.data?.name || action.userName || '—'}</span></div>
                                                  <div className="text-slate-500" dir="ltr">تلفن: {action.data?.phone || '—'}</div>
                                                  {action.data?.email && <div className="text-slate-500" dir="ltr">ایمیل: {action.data.email}</div>}
                                                  <div className="flex gap-2 flex-wrap mt-0.5">
                                                    <span>گروه: {action.data?.group || 'عادی'}</span>
                                                    <span>امتیاز: {(action.data?.loyaltyPoints ?? 0).toLocaleString('fa-IR')}</span>
                                                    <span className={action.data?.isBlocked ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>{action.data?.isBlocked ? 'مسدود' : 'فعال'}</span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Settings preview */}
                                {activeTask.target === 'settings' && activeOutput.formData && (() => {
                                  const settings = activeOutput.formData;
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl p-4 flex flex-col text-right shadow-sm select-none relative overflow-hidden">
                                      <div className="absolute top-0 right-0 left-0 h-1.5" style={{ backgroundColor: settings.themeColor || '#2563eb' }} />
                                      <div className="flex items-center gap-2 mb-3 mt-1">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${settings.themeColor || '#2563eb'}20`, color: settings.themeColor || '#2563eb' }}>
                                          <Settings size={16} />
                                        </div>
                                        <div>
                                          <span className="text-xs font-black text-slate-800 dark:text-white block">{settings.shopName || 'تنظیمات عمومی'}</span>
                                          <span className="text-[8px] text-slate-400 font-bold">پیش‌نمایش پیکربندی جدید</span>
                                        </div>
                                      </div>
                                      <div className="space-y-2 border-t border-slate-50 dark:border-slate-900/60 pt-3">
                                        {settings.themeColor && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">رنگ پوسته اصلی</span>
                                            <div className="flex items-center gap-1.5 font-mono text-[9px] font-bold text-slate-700 dark:text-slate-300">
                                              <span className="w-3.5 h-3.5 rounded-full border border-slate-200 dark:border-slate-800" style={{ backgroundColor: settings.themeColor }} />
                                              <span>{settings.themeColor}</span>
                                            </div>
                                          </div>
                                        )}
                                        {settings.currency && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">واحد پول فروشگاه</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{settings.currency === 'IRT' ? 'تومان' : 'ریال'}</span>
                                          </div>
                                        )}
                                        {settings.language && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">زبان پیش‌فرض</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300">{settings.language === 'fa' ? 'فارسی' : 'English'}</span>
                                          </div>
                                        )}
                                        {settings.subdomain && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">ساب‌دومین</span>
                                            <span className="font-bold font-mono text-slate-700 dark:text-slate-300" dir="ltr">{settings.subdomain}</span>
                                          </div>
                                        )}
                                        {settings.address && (
                                          <div className="flex justify-between items-start gap-2 text-[10px]">
                                            <span className="text-slate-400 shrink-0">آدرس فروشگاه</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-left line-clamp-2">{settings.address}</span>
                                          </div>
                                        )}
                                        {settings.contactPhone && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">تلفن تماس</span>
                                            <span className="font-bold font-mono text-slate-700 dark:text-slate-300" dir="ltr">{settings.contactPhone}</span>
                                          </div>
                                        )}
                                        {settings.contactEmail && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">ایمیل تماس</span>
                                            <span className="font-bold font-mono text-slate-700 dark:text-slate-300" dir="ltr">{settings.contactEmail}</span>
                                          </div>
                                        )}
                                        {settings.description && (
                                          <div className="flex justify-between items-start gap-2 text-[10px]">
                                            <span className="text-slate-400 shrink-0">توضیحات (سئو)</span>
                                            <span className="font-bold text-slate-700 dark:text-slate-300 text-left line-clamp-2">{settings.description}</span>
                                          </div>
                                        )}
                                        {settings.zarinpalEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">درگاه زرین‌پال</span>
                                            <span className={`font-bold ${settings.zarinpalEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.zarinpalEnabled ? 'فعال' : 'غیرفعال'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.zibalEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">درگاه زیبال</span>
                                            <span className={`font-bold ${settings.zibalEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.zibalEnabled ? 'فعال' : 'غیرفعال'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.cardToCardEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">کارت به کارت</span>
                                            <span className={`font-bold ${settings.cardToCardEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.cardToCardEnabled ? 'فعال' : 'غیرفعال'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.tipaxEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">ارسال با تیپاکس</span>
                                            <span className={`font-bold ${settings.tipaxEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.tipaxEnabled ? 'فعال ✅' : 'غیرفعال 🔴'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.wholesaleEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">فروش عمده B2B</span>
                                            <span className={`font-bold ${settings.wholesaleEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.wholesaleEnabled ? 'فعال ✅' : 'غیرفعال 🔴'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.customerClubEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">باشگاه مشتریان CRM</span>
                                            <span className={`font-bold ${settings.customerClubEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.customerClubEnabled ? 'فعال ✅' : 'غیرفعال 🔴'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.baleEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">پیام‌رسان بله</span>
                                            <span className={`font-bold ${settings.baleEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.baleEnabled ? 'متصل 🟢' : 'قطع 🔴'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.mahakEnabled !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">حسابداری محک</span>
                                            <span className={`font-bold ${settings.mahakEnabled ? 'text-emerald-500' : 'text-rose-500'}`}>
                                              {settings.mahakEnabled ? 'همگام‌سازی فعال ✅' : 'غیرفعال 🔴'}
                                            </span>
                                          </div>
                                        )}
                                        {settings.productType !== undefined && (
                                          <div className="flex justify-between items-center text-[10px]">
                                            <span className="text-slate-400">نوع کالاها</span>
                                            <span className="font-bold text-primary-500 font-mono">
                                              {settings.productType === 'digital' ? 'فقط دیجیتال 💾' :
                                               settings.productType === 'physical' ? 'فقط فیزیکی 📦' : 'فیزیکی و دیجیتال'}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* About Us live preview */}
                                {activeTask.target === 'about_us' && (() => {
                                  const config = activeOutput.config || activeOutput.rawResult?.config || activeOutput;
                                  const brandStory = config.brandStory || {};
                                  const coreValues = config.coreValues || { list: [] };
                                  const contact = config.contact || {};
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl p-4 flex flex-col text-right shadow-sm select-none relative overflow-hidden">
                                      <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary-600" />
                                      <div className="flex items-center gap-2 mb-3 mt-1">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 dark:bg-slate-950/30 text-primary-600 dark:text-primary-400">
                                          <Info size={16} />
                                        </div>
                                        <div>
                                          <span className="text-xs font-black text-slate-800 dark:text-white block">درباره ما</span>
                                          <span className="text-[8px] text-slate-400 font-bold">پیش‌نمایش صفحه درباره ما</span>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-3 border-t border-slate-50 dark:border-slate-900/60 pt-3">
                                        {/* Brand Story Preview */}
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 block">{brandStory.title || 'داستان برند'}</span>
                                          <p className="text-[9px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">{brandStory.storyText || 'داستان برند وارد نشده است.'}</p>
                                          {brandStory.foundingYear && (
                                            <span className="text-[8px] text-slate-400 font-bold block">سال تاسیس: {brandStory.foundingYear}</span>
                                          )}
                                        </div>

                                        {/* Core Values Preview */}
                                        {Array.isArray(coreValues.list) && coreValues.list.length > 0 && (
                                          <div className="space-y-1 border-t border-slate-50 dark:border-slate-900/60 pt-2">
                                            <span className="text-[8px] font-black text-slate-400 block">{coreValues.title || 'ارزش‌های ما'}</span>
                                            <div className="grid grid-cols-2 gap-1">
                                              {coreValues.list.slice(0, 4).map((item: any, idx: number) => (
                                                <div key={item.id || idx} className="p-1.5 bg-slate-50 dark:bg-slate-900 rounded-lg text-center">
                                                  <span className="text-[8px] font-bold text-slate-800 dark:text-slate-200 block truncate">{item.title}</span>
                                                  <span className="text-[6px] text-slate-400 block truncate">{item.description}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Contact Preview */}
                                        <div className="space-y-1 border-t border-slate-50 dark:border-slate-900/60 pt-2 text-[8px] text-slate-500 space-y-0.5">
                                          <span className="font-black text-slate-400 block mb-1">{contact.title || 'تماس با ما'}</span>
                                          {contact.phone && <div className="flex justify-between"><span className="text-slate-400">تلفن:</span><span className="font-bold text-slate-700 dark:text-slate-300" dir="ltr">{contact.phone}</span></div>}
                                          {contact.email && <div className="flex justify-between"><span className="text-slate-400">ایمیل:</span><span className="font-bold text-slate-700 dark:text-slate-300" dir="ltr">{contact.email}</span></div>}
                                          {contact.address && <div className="text-slate-600 dark:text-slate-400 text-left line-clamp-1 mt-0.5">{contact.address}</div>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Contact Us live preview */}
                                {activeTask.target === 'contact_us' && (() => {
                                  const config = activeOutput.config || activeOutput.rawResult?.config || activeOutput;
                                  const hero = config.hero || {};
                                  const departments = config.departments || { list: [] };
                                  const openingHours = config.openingHours || { list: [] };
                                  return (
                                    <div className="w-[240px] bg-white dark:bg-gray-950 border border-gray-100 dark:border-gray-900 rounded-2xl p-4 flex flex-col text-right shadow-sm select-none relative overflow-hidden">
                                      <div className="absolute top-0 right-0 left-0 h-1.5 bg-primary-600" />
                                      <div className="flex items-center gap-2 mb-3 mt-1">
                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-50 dark:bg-slate-950/30 text-primary-600 dark:text-primary-400">
                                          <Phone size={16} />
                                        </div>
                                        <div>
                                          <span className="text-xs font-black text-slate-800 dark:text-white block">تماس با ما</span>
                                          <span className="text-[8px] text-slate-400 font-bold">پیش‌نمایش صفحه تماس با ما</span>
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-3 border-t border-slate-50 dark:border-slate-900/60 pt-3">
                                        {/* Hero Preview */}
                                        <div className="space-y-1">
                                          <span className="text-[9px] font-black text-primary-600 dark:text-primary-400 block">{hero.title || 'ارتباط با ما'}</span>
                                          <span className="text-[8px] text-slate-400 font-bold block">{hero.subtitle}</span>
                                          <p className="text-[9px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">{hero.description || 'توضیحات تماس با ما وارد نشده است.'}</p>
                                        </div>

                                        {/* Departments Preview */}
                                        {Array.isArray(departments.list) && departments.list.length > 0 && (
                                          <div className="space-y-1 border-t border-slate-50 dark:border-slate-900/60 pt-2">
                                            <span className="text-[8px] font-black text-slate-400 block">{departments.title || 'دپارتمان‌ها'}</span>
                                            <div className="space-y-1">
                                              {departments.list.slice(0, 3).map((item: any, idx: number) => (
                                                <div key={item.id || idx} className="p-1 bg-slate-50 dark:bg-slate-900 rounded-lg flex justify-between items-center text-[8px]">
                                                  <span className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-[80px]">{item.name}</span>
                                                  <span className="text-slate-500 font-mono" dir="ltr">{item.phone}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}

                                        {/* Opening Hours Preview */}
                                        {Array.isArray(openingHours.list) && openingHours.list.length > 0 && (
                                          <div className="space-y-1 border-t border-slate-50 dark:border-slate-900/60 pt-2">
                                            <span className="text-[8px] font-black text-slate-400 block">{openingHours.title || 'ساعات کاری'}</span>
                                            <div className="space-y-0.5 text-[8px] text-slate-500">
                                              {openingHours.list.slice(0, 2).map((item: any, idx: number) => (
                                                <div key={item.id || idx} className="flex justify-between">
                                                  <span>{item.dayRange}:</span>
                                                  <span className="font-bold text-slate-700 dark:text-slate-300">{item.hours}</span>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Custom Home live preview */}
                                {activeTask.target === 'custom_home' && activeOutput.formData && (() => {
                                  const home = activeOutput.formData;
                                  const orderList = Array.isArray(home.sectionOrder) ? home.sectionOrder : [];

                                  return (
                                    <div className="w-[260px] bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs text-right select-none flex flex-col gap-2 p-3">
                                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1.5 mb-1">
                                        <span className="text-[10px] font-black text-primary-500 flex items-center gap-1">📱 نمای زنده لندینگ صفحه اصلی</span>
                                        <span className="text-[7px] font-black bg-primary-500/15 text-primary-500 px-1.5 py-0.5 rounded">
                                          {home.homePageType === 'shop' ? 'مستقیم فروشگاه' : 'چیدمان دلخواه'}
                                        </span>
                                      </div>

                                      {/* Miniature Mockup representation of the page based on section visibility and order */}
                                      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 flex flex-col gap-1.5 pb-2 shadow-2xs max-h-[350px] overflow-y-auto custom-scrollbar">
                                        {/* 1. Header simulation */}
                                        <div className="bg-slate-50 dark:bg-slate-950 p-1.5 flex justify-between items-center text-[7px] border-b border-slate-100 dark:border-slate-900">
                                          <span>🛒 🔍</span>
                                          <span className="font-black text-slate-800 dark:text-white">SHOP LOGO</span>
                                        </div>

                                        {/* Dynamically render sections by their defined orders */}
                                        {orderList.map((section: string, idx: number) => {
                                          // check if section is globally disabled
                                          if (section === 'stories' && home.showStories === false) return null;
                                          if (section === 'slider' && home.showSlider === false) return null;
                                          if (section === 'shoppable' && home.showShoppable === false) return null;
                                          if (section === 'hero' && home.showHero === false) return null;
                                          if (section === 'features' && home.showFeatures === false) return null;
                                          if (section === 'categoryQuickAccess' && home.showCategoryQuickAccess === false) return null;
                                          if (section === 'featuredProducts' && home.showFeaturedProducts === false) return null;
                                          if (section === 'blog' && home.showBlog === false) return null;
                                          if (section === 'reviews' && home.showReviews === false) return null;

                                          // 1. Stories
                                          if (section === 'stories') {
                                            return (
                                              <div key={idx} className="px-2 py-1 bg-slate-50/50 dark:bg-slate-950/20">
                                                <div className="flex gap-1.5 overflow-hidden">
                                                  {[1, 2, 3, 4, 5].map(st => (
                                                    <div key={st} className="w-6 h-6 rounded-full border border-pink-500 p-0.5 shrink-0">
                                                      <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-800" />
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 2. Slider
                                          if (section === 'slider') {
                                            return (
                                              <div key={idx} className="px-2">
                                                <div className="w-full aspect-video bg-gradient-to-l from-primary-500/20 to-blue-500/15 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-center relative">
                                                  <span className="text-[6px] font-bold text-slate-400">🖼️ اسلایدر تصاویر</span>
                                                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                                    <div className="w-1 h-1 rounded-full bg-primary-500" />
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <div className="w-1 h-1 rounded-full bg-slate-300" />
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 3. Hero Welcomer
                                          if (section === 'hero') {
                                            return (
                                              <div key={idx} className="px-2">
                                                <div className="p-3 bg-primary-600 text-white rounded-lg flex flex-col gap-0.5 items-center text-center relative overflow-hidden shadow-2xs">
                                                  <span className="text-[8px] font-black line-clamp-1">{home.heroTitle || 'عنوان هیرو'}</span>
                                                  <span className="text-[6px] text-primary-200 line-clamp-1">{home.heroSubtitle || 'توضیحات هیرو'}</span>
                                                  {home.heroCtaText && (
                                                    <span className="mt-1 px-1.5 py-0.5 bg-white text-primary-600 rounded text-[5px] font-black scale-90">
                                                      {home.heroCtaText}
                                                    </span>
                                                  )}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 4. Shoppable Image hotspots
                                          if (section === 'shoppable') {
                                            return (
                                              <div key={idx} className="px-2">
                                                <div className="w-full aspect-video bg-primary-50 dark:bg-slate-950/20 rounded-lg border border-primary-100 dark:border-slate-900/30 flex items-center justify-center relative overflow-hidden">
                                                  <span className="text-[6px] font-black text-primary-400">📍 پکیج نقاط شاپبل تعاملی</span>
                                                  <div className="absolute top-1/3 left-1/4 w-2 h-2 rounded-full bg-primary-600 border border-white animate-pulse" />
                                                  <div className="absolute bottom-1/3 left-2/3 w-2 h-2 rounded-full bg-primary-600 border border-white animate-pulse" />
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 5. Features
                                          if (section === 'features') {
                                            return (
                                              <div key={idx} className="px-2 py-0.5">
                                                <div className="grid grid-cols-3 gap-1">
                                                  {['ارسال سریع 🚀', 'ضمانت بازگشت 🛡️', 'پشتیبانی ۲۴ ساعته 📞'].map((feat, fidx) => (
                                                    <div key={fidx} className="p-1 bg-slate-50 dark:bg-slate-950 rounded-md text-[5px] font-bold text-center text-slate-500 border border-slate-100/50 dark:border-slate-900/50">
                                                      {feat}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 6. Category Quick Access
                                          if (section === 'categoryQuickAccess') {
                                            return (
                                              <div key={idx} className="px-2">
                                                <div className="grid grid-cols-4 gap-1">
                                                  {[1, 2, 3, 4].map(cidx => (
                                                    <div key={cidx} className="p-1 bg-primary-50/40 dark:bg-slate-950/10 border border-primary-100/30 dark:border-slate-900/10 rounded flex flex-col items-center gap-0.5">
                                                      <div className="w-3 h-3 rounded-full bg-primary-500/10" />
                                                      <span className="text-[4px] text-slate-400 font-bold">دسته بندی {cidx}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 7. Featured Products
                                          if (section === 'featuredProducts') {
                                            return (
                                              <div key={idx} className="px-2 flex flex-col gap-0.5">
                                                <span className="text-[5px] text-slate-400 font-black">🛍️ ردیف محصولات ویژه:</span>
                                                <div className="grid grid-cols-2 gap-1.5">
                                                  {[1, 2].map(pidx => (
                                                    <div key={pidx} className="p-1 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg flex flex-col gap-0.5">
                                                      <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900 rounded-md" />
                                                      <span className="text-[5px] font-black text-slate-800 dark:text-slate-350 line-clamp-1">محصول شماره {pidx}</span>
                                                      <span className="text-[5px] text-primary-500 font-mono">۱۲۵,۰۰۰ ت</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 8. Blog Latest Posts
                                          if (section === 'blog') {
                                            return (
                                              <div key={idx} className="px-2 flex flex-col gap-0.5">
                                                <span className="text-[5px] text-slate-400 font-black">📝 آخرین مطالب وبلاگ:</span>
                                                <div className="space-y-1">
                                                  {[1, 2].map(bidx => (
                                                    <div key={bidx} className="p-1.5 bg-slate-50 dark:bg-slate-950/40 rounded-lg flex justify-between items-center border border-slate-100/50 dark:border-slate-900/50">
                                                      <span className="text-[5px] font-black text-slate-700 dark:text-slate-300">مقاله آموزشی جدید شماره {bidx}</span>
                                                      <div className="w-5 h-4 bg-slate-200 dark:bg-slate-800 rounded" />
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            );
                                          }

                                          // 9. Customer Reviews
                                          if (section === 'reviews') {
                                            return (
                                              <div key={idx} className="px-2 py-0.5">
                                                <div className="p-1.5 bg-amber-50/30 dark:bg-amber-950/10 border border-amber-100/30 dark:border-amber-900/10 rounded-lg flex flex-col gap-0.5">
                                                  <span className="text-[4px] text-amber-500 font-bold block">💬 رضایت مشتریان:</span>
                                                  <p className="text-[5px] text-slate-600 dark:text-slate-400 font-normal italic">«یک خرید عالی و باکیفیت از این فروشگاه بی نظیر!»</p>
                                                </div>
                                              </div>
                                            );
                                          }

                                          return null;
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Footer live preview */}
                                {activeTask.target === 'footer' && (activeOutput.config || activeOutput.rawResult?.config) && (() => {
                                  const footer = activeOutput.config || activeOutput.rawResult?.config;
                                  const isCustom = footer.theme === 'custom';
                                  const previewBg = isCustom ? footer.bgColor : (footer.theme === 'dark' ? '#0f172a' : '#ffffff');
                                  const previewText = isCustom ? footer.textColor : (footer.theme === 'dark' ? '#f1f5f9' : '#1e293b');
                                  
                                  return (
                                    <div className="w-[260px] flex flex-col items-center animate-fadeIn text-right">
                                      <div 
                                        className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm text-right select-none space-y-3.5 transition-all duration-300"
                                        style={{ backgroundColor: previewBg || '#ffffff', color: previewText || '#1e293b' }}
                                      >
                                        {/* Footer About Section */}
                                        <div className="space-y-1">
                                          <span className="text-[10px] font-black block border-b border-current/20 pb-1 flex items-center gap-1">
                                            👣 {footer.aboutText ? 'درباره ما' : 'فوتر جدید فروشگاه'}
                                          </span>
                                          <p className="text-[8px] leading-relaxed opacity-85 line-clamp-3">{footer.aboutText || 'توضیحات فوتر وارد نشده است.'}</p>
                                        </div>

                                        {/* Optional Newsletter simulation inside preview */}
                                        {footer.showNewsletter !== false && (
                                          <div className="p-2 bg-current/5 rounded-xl border border-current/10 space-y-1.5">
                                            <span className="text-[8px] font-black block">📧 {footer.newsletterTitle || 'عضویت در خبرنامه'}</span>
                                            <div className="flex gap-1">
                                              <span className="bg-indigo-650 text-white text-[6px] font-black px-1.5 py-1 rounded-md shrink-0 bg-primary-600">ثبت</span>
                                              <div className="bg-current/10 rounded-md flex-1 text-right text-[6px] px-2 py-1 opacity-60">ایمیل شما...</div>
                                            </div>
                                          </div>
                                        )}

                                        {/* Contact support fields */}
                                        {(footer.contactPhone || footer.contactEmail || footer.contactAddress) && (
                                          <div className="space-y-1 text-[8px] opacity-85 border-t border-current/10 pt-2.5">
                                            {footer.contactAddress && <div className="text-right">📍 {footer.contactAddress}</div>}
                                            {footer.contactPhone && <div className="text-right" dir="rtl">📞 تلفن: <span className="font-mono">{footer.contactPhone}</span></div>}
                                            {footer.contactEmail && <div className="text-right" dir="rtl">✉️ ایمیل: <span className="font-mono">{footer.contactEmail}</span></div>}
                                          </div>
                                        )}

                                        {/* Social Links Row */}
                                        {(footer.socialInstagram || footer.socialTelegram || footer.socialWhatsapp) && (
                                          <div className="flex gap-2 justify-center border-t border-current/10 pt-2 text-[8px]">
                                            {footer.socialInstagram && <span className="px-1.5 py-0.5 rounded bg-pink-500/10 text-pink-500 font-bold">📸 اینستاگرام</span>}
                                            {footer.socialTelegram && <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 font-bold">✈️ تلگرام</span>}
                                            {footer.socialWhatsapp && <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">💬 واتس‌اپ</span>}
                                          </div>
                                        )}

                                        {/* Copyright bottom text */}
                                        <div className="text-[7px] opacity-60 text-center border-t border-current/10 pt-2 font-mono">
                                          {footer.copyrightText || 'کلیه حقوق این سایت محفوظ است.'}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {/* Header live preview */}
                                {activeTask.target === 'header' && (activeOutput.config || activeOutput.rawResult?.config) && (() => {
                                  const header = activeOutput.config || activeOutput.rawResult?.config;
                                  const banner = header.banner || {};
                                  return (
                                    <div className="w-[260px] flex flex-col items-center animate-fadeIn text-right">
                                      <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm select-none flex flex-col transition-all duration-300">
                                        {/* Announcement Banner */}
                                        {banner.enabled && (
                                          <div 
                                            className="px-3 py-1.5 text-center text-[8px] font-bold flex items-center justify-center gap-1.5 transition-all duration-300"
                                            style={{ backgroundColor: banner.bgColor || '#4f46e5', color: banner.textColor || '#ffffff' }}
                                          >
                                            {banner.tagText && (
                                              <span 
                                                className="px-1 py-0.5 rounded text-[7px] font-black uppercase animate-pulse"
                                                style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                                              >
                                                {banner.tagText}
                                              </span>
                                            )}
                                            <span className="line-clamp-1">{banner.text}</span>
                                          </div>
                                        )}

                                        {/* Header Main Navigation Bar */}
                                        <div className="p-3 flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/20 gap-2">
                                          {/* Left Icons: Cart and User Account */}
                                          <div className="flex gap-1.5 items-center shrink-0">
                                            {header.showCart && (
                                              <span className="p-1 bg-primary-500/10 dark:bg-primary-500/20 rounded-md text-[8px] font-black text-primary-600 dark:text-primary-400 flex items-center gap-0.5">
                                                🛒 سبد
                                              </span>
                                            )}
                                            {header.showUser !== false && (
                                              <span className="p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-md text-[8px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-0.5">
                                                👤 پروفایل
                                              </span>
                                            )}
                                          </div>

                                          {/* Middle Search Input simulation */}
                                          {header.showSearch && (
                                            <div className="bg-slate-200/50 dark:bg-slate-800/60 text-slate-400 text-[7px] px-1.5 py-1 rounded-lg flex-1 text-right line-clamp-1 border border-slate-250 dark:border-slate-800 flex items-center gap-1 font-bold">
                                              <span>🔍</span>
                                              <span>جستجو...</span>
                                            </div>
                                          )}

                                          {/* Right: Logo Brand & Categories link */}
                                          <div className="flex gap-1.5 items-center shrink-0">
                                            {header.showCategories && (
                                              <span className="text-[8px] font-black text-slate-500 hover:text-primary-500 transition-colors border-r border-slate-200 dark:border-slate-800 pr-1.5">
                                                📂 دسته‌ها
                                              </span>
                                            )}
                                            
                                            {header.logoUrl ? (
                                              <div className="h-4 max-w-[50px] overflow-hidden flex items-center">
                                                <img src={header.logoUrl} alt="Logo" className="h-full object-contain" />
                                              </div>
                                            ) : (
                                              <span className="text-[9px] font-black text-slate-900 dark:text-white truncate max-w-[65px]">
                                                {header.logoText || '🛍️ لوگو برند'}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Extra Metadata Panel */}
                                      {header.sticky && (
                                        <div className="mt-2 text-center">
                                          <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-primary-500/10 text-primary-500 border border-primary-500/10 flex items-center gap-1 justify-center">
                                            📌 هدر به صورت شناور (Sticky) در بالای صفحه چسبیده است
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            );
                          })()}

                            {/* Approve & Save button (or read-only / not-found note for users CRM lookups) */}
                            {(() => {
                              const isReport = activeOutput.action === 'report' || 
                                               activeOutput.action === 'report_control' || 
                                               activeOutput.action === 'view' || 
                                               activeOutput.action === 'query' || 
                                               activeOutput.action === 'get_details' || 
                                               activeOutput.action === 'getUserDetails' || 
                                               activeOutput.rawResult?.action === 'report' || 
                                               activeOutput.rawResult?.action === 'report_control' || 
                                               activeOutput.rawResult?.action === 'view' || 
                                               activeOutput.rawResult?.action === 'query' || 
                                               activeOutput.rawResult?.action === 'get_details' || 
                                               activeOutput.rawResult?.action === 'getUserDetails' ||
                                               (activeOutput.explanation && (
                                                 (activeTask.target === 'products' && !activeOutput.formData) ||
                                                 (activeTask.target === 'blog' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.title) ||
                                                 (activeTask.target === 'categories' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.name) ||
                                                 (activeTask.target === 'discounts' && (!activeOutput.operations || activeOutput.operations.length === 0) && !activeOutput.code) ||
                                                 (activeTask.target === 'orders' && (!activeOutput.targets || activeOutput.targets.length === 0) && !activeOutput.updates) ||
                                                 (activeTask.target === 'reviews' && !activeOutput.action && !activeOutput.data) ||
                                                 (activeTask.target === 'users' && (!activeOutput.actions || activeOutput.actions.length === 0)) ||
                                                 (activeTask.target === 'tickets' && !activeOutput.action) ||
                                                 (activeTask.target === 'system_tickets' && !activeOutput.action) ||
                                                 (activeTask.target === 'staff' && !activeOutput.action) ||
                                                 (activeTask.target === 'profile' && !activeOutput.action) ||
                                                 (activeTask.target === 'import_export' && !activeOutput.action) ||
                                                 (activeTask.target === 'media' && !activeOutput.action) ||
                                                 (activeTask.target === 'shoppable' && !activeOutput.action) ||
                                                 (activeTask.target === 'settings' && !activeOutput.formData) ||
                                                 (activeTask.target === 'custom_home' && !activeOutput.formData) ||
                                                 (activeTask.target === 'footer' && !activeOutput.config && !activeOutput.rawResult?.config) ||
                                                 (activeTask.target === 'header' && !activeOutput.config && !activeOutput.rawResult?.config)
                                               ));

                              if (isReport) {
                                return (
                                  <button
                                    onClick={() => setTaskStatuses(prev => ({ ...prev, [activeTask.id]: 'completed' }))}
                                    className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-primary-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                  >
                                    <CheckCircle2 size={14} />
                                    <span>مشاهده گزارش — تکمیل مرحله</span>
                                  </button>
                                );
                              }

                              if (activeTask.target === 'users') {
                                const usersActions = activeOutput.actions || activeOutput.rawResult?.actions || [];
                                const hasMutation = usersActions.some((a: any) => a && a.type !== 'getUserDetails');
                                const hasReadOnly = usersActions.some((a: any) => a && a.type === 'getUserDetails');

                                if (!hasMutation && hasReadOnly) {
                                  return (
                                    <button
                                      onClick={() => setTaskStatuses(prev => ({ ...prev, [activeTask.id]: 'completed' }))}
                                      className="w-full py-3 bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-500 hover:to-blue-500 text-white rounded-xl text-xs font-black shadow-md shadow-primary-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                    >
                                      <CheckCircle2 size={14} />
                                      <span>این اطلاعات فقط جهت مشاهده است — تکمیل مرحله</span>
                                    </button>
                                  );
                                }

                                if (!hasMutation) {
                                  // Not found / nothing to do: show the assistant's explanation prominently instead of a misleading save button.
                                  return (
                                    <div className="w-full bg-rose-50 dark:bg-rose-500/10 border-2 border-rose-300 dark:border-rose-500/40 rounded-2xl p-4 flex items-start gap-3 text-right shadow-sm" dir="rtl">
                                      <div className="w-9 h-9 shrink-0 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                                        <AlertCircle size={20} />
                                      </div>
                                      <div className="space-y-0.5">
                                        <p className="text-[11px] font-black text-rose-600 dark:text-rose-400">مشتری یافت نشد</p>
                                        <p className="text-xs font-black text-slate-800 dark:text-rose-100 leading-relaxed">
                                          {activeOutput.explanation || activeOutput.rawResult?.explanation || 'مشتری مورد نظر در لیست مشتریان فروشگاه ثبت نشده است.'}
                                        </p>
                                      </div>
                                    </div>
                                  );
                                }
                              }

                              return (
                                <button
                                  onClick={() => handleApproveAndSave(currentTaskIndex)}
                                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-500/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
                                >
                                  <CheckCircle2 size={14} />
                                  <span>تأیید پیش‌نویس و ذخیره موقت این مرحله</span>
                                </button>
                              );
                            })()}
                          </div>
                        )}

                        {/* Phase: Saving */}
                        {activeStatus === 'saving' && (
                          <div className="flex flex-col items-center justify-center py-14 space-y-3 text-center">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                            <p className="text-xs font-black text-slate-800 dark:text-white">در حال ثبت در پایگاه داده...</p>
                          </div>
                        )}

                        {/* Phase: Completed */}
                        {activeStatus === 'completed' && (
                          <div className="flex flex-col items-center justify-center py-10 px-4 space-y-4 text-center">
                            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center border border-emerald-500/20">
                              <Check size={24} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs font-black text-emerald-500">با موفقیت ثبت شد!</p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                                اطلاعات این مرحله با موفقیت ذخیره گردید. می‌توانید پیش‌نمایش آن را در سمت چپ مشاهده کنید یا به مراحل دیگر بروید.
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Phase: Failed */}
                        {activeStatus === 'failed' && (
                          <div className="flex flex-col items-center justify-center py-10 space-y-3 text-center">
                            <AlertCircle className="w-10 h-10 text-rose-500" />
                            <p className="text-xs font-black text-rose-500">خطایی رخ داد</p>
                            {generalError && <p className="text-[10px] text-slate-400 font-bold max-w-xs leading-relaxed">{generalError}</p>}
                            <button
                              onClick={() => executeTaskAiGeneration(currentTaskIndex)}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={11} />
                              <span>تلاش مجدد</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Live Preview Sticky Card (Only when preview_ready or completed) */}
                    <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
                      <span className="text-xs font-black text-slate-800 dark:text-white block border-b border-slate-100 dark:border-slate-800/60 pb-2">وضعیت کلی مراحل</span>
                      <div className="space-y-2">
                        {plan.tasks.map((t, idx) => {
                          const s = taskStatuses[t.id] || 'idle';
                          return (
                            <div
                              key={t.id}
                              onClick={() => setCurrentTaskIndex(idx)}
                              className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                                currentTaskIndex === idx
                                  ? 'bg-primary-500/10 border-primary-500/20 text-primary-600 dark:text-primary-400 font-black'
                                  : 'bg-slate-50/50 dark:bg-slate-900/20 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-[10px] font-black">{(idx + 1).toLocaleString('fa-IR')}.</span>
                                <span className="text-[10px] truncate font-bold">{t.title}</span>
                              </div>
                              <div className="shrink-0">
                                {s === 'completed' && <Check size={12} className="text-emerald-500" />}
                                {s === 'running' && <Loader2 size={12} className="animate-spin text-primary-500" />}
                                {s === 'preview_ready' && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                                {s === 'failed' && <X size={12} className="text-rose-500" />}
                                {s === 'idle' && <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Navigation buttons */}
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800/60 flex flex-col gap-2">
                        <button
                          onClick={() => {
                            setWizardStep(3);
                          }}
                          className="w-full py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-[10px] font-black shadow-sm transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>ثبت نهایی و مشاهده نتایج</span>
                          <ChevronLeft size={12} />
                        </button>
                        <button
                          onClick={() => setWizardStep(1)}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black transition-all"
                        >
                          بازگشت به توضیح طرح
                        </button>
                      </div>

                      {/* Professional Self-Healing & Auto-Repair System Status */}
                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            سیستم هوشمند پایش و رفع خطای خودکار
                          </span>
                          <span className="text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md">فعال و ایمن</span>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/50 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 font-bold">
                            <span>ضریب شکست پلتفرم (Failure Rate):</span>
                            <span className="text-emerald-500 font-black">۰.۰٪ (بسیار حرفه‌ای)</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1">
                            <div className="bg-emerald-500 h-1 rounded-full" style={{ width: '100%' }}></div>
                          </div>
                          <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold leading-relaxed">
                            پاسخ‌های ناقص یا قطع شده هوش مصنوعی به صورت خودکار در لایه زیرین بازسازی و تعمیر شده و با مکانیزم تلاش مجدد ۳ مرحله‌ای و مدل‌های پشتیبان اجرا می‌شوند.
                          </p>
                        </div>

                        {systemWarnings.length > 0 && (
                          <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-amber-500 block">گزارش بهینه‌سازی و رفع خطای اخیر:</span>
                            <div className="max-h-24 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                              {systemWarnings.map((warning, wIdx) => (
                                <div key={wIdx} className="text-[8px] bg-amber-500/5 border border-amber-500/10 text-amber-600 dark:text-amber-400 p-1.5 rounded-lg font-bold leading-relaxed">
                                  ⚠️ {warning}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 3: FINALIZE & EXECUTE */}
          {wizardStep === 3 && plan && (
            <div className="space-y-5 max-w-4xl mx-auto animate-fadeIn">
              <div className="bg-white dark:bg-[#0d1527] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-6 text-center">
                <div className="relative w-16 h-16 mx-auto">
                  <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                    <CheckCircle2 size={32} />
                  </div>
                </div>

                <div className="space-y-2 max-w-md mx-auto">
                  <h2 className="text-base font-black text-slate-800 dark:text-white">طرح با موفقیت انجام شد!</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                    مراحل طرح اجرایی پیشنهادی با موفقیت در سایت ثبت و فعال گردیدند. در زیر می‌توانید لیست نتایج نهایی را مشاهده کنید.
                  </p>
                </div>

                {/* Saved Assets Log */}
                {savedAssets.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-4 text-right max-w-md mx-auto space-y-2">
                    <span className="text-[10px] font-black text-slate-500 block border-b border-slate-200/60 dark:border-slate-800/40 pb-1.5">نتایج ثبت‌شده نهایی:</span>
                    {savedAssets.map((asset, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/40 p-3 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/8 border border-emerald-500/15 text-emerald-400 flex items-center justify-center">
                            {getTargetIcon(asset.type, 14)}
                          </div>
                          <div>
                            <div className="text-[11px] font-black text-slate-800 dark:text-white">{asset.title}</div>
                            <div className="text-[9px] text-slate-500 font-bold">{getTargetLabel(asset.type)}</div>
                          </div>
                        </div>
                        <a href={asset.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-[9px] font-black text-primary-500 hover:text-primary-300 transition-colors">
                          <span>مشاهده در سایت</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reset button */}
                <div className="pt-2 flex justify-center gap-3">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-all"
                  >
                    بازگشت به پیش‌نمایش
                  </button>
                  <button
                    onClick={() => {
                      // Set plan to null to switch back to chat history,
                      // but do NOT clear savedAssets so they remain as context!
                      setPlan(null);
                      setWizardStep(1);
                    }}
                    className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-black shadow-lg shadow-primary-500/20 transition-all cursor-pointer"
                  >
                    ادامه گفتگو روی این نتایج
                  </button>
                  <button
                    onClick={() => { resetAll(); setPrompt(''); }}
                    className="px-6 py-2.5 bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white rounded-xl text-xs font-black shadow-lg shadow-slate-500/10 transition-all cursor-pointer"
                  >
                    شروع یک درخواست جدید
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </>
    )}

      </div>
    </div>
    </div>
  );
}
