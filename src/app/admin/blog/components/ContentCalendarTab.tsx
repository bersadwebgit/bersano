'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle,
  CalendarClock,
  Tag,
  Package,
  Lightbulb,
  Check,
  X,
  RotateCcw,
  FileText,
  Megaphone,
  Image as ImageIcon,
} from 'lucide-react';
import { gregorianToJalali } from '@/lib/jalali';

type CalendarItem = {
  id: string;
  type: 'blog' | 'story' | 'discount';
  pillar?: string;
  isEvergreen?: boolean;
  occasion: string;
  occasionDateJalali?: string;
  title: string;
  summary: string;
  keywords: string[];
  targetProductIds: string[];
  categoryId: string | null;
  suggestedPublishAt: string;
  rationale: string;
  status: 'suggested' | 'accepted' | 'dismissed';
  createdPostId?: string | null;
};

const JALALI_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const toFa = (input: string | number) =>
  String(input).replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);

function jalaliDayLabel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const { jm, jd } = gregorianToJalali(d);
  return `${toFa(jd)} ${JALALI_MONTHS[jm - 1]}`;
}

function jalaliMonthKey(iso: string): { key: string; label: string } {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return { key: 'unknown', label: 'نامشخص' };
  const { jy, jm } = gregorianToJalali(d);
  return { key: `${jy}-${jm}`, label: `${JALALI_MONTHS[jm - 1]} ${toFa(jy)}` };
}

const TYPE_META: Record<CalendarItem['type'], { label: string; icon: any; classes: string }> = {
  blog: { label: 'مقاله', icon: FileText, classes: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
  story: { label: 'استوری', icon: ImageIcon, classes: 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400' },
  discount: { label: 'تخفیف', icon: Megaphone, classes: 'bg-amber-500/10 text-amber-600 dark:text-amber-400' },
};

export default function ContentCalendarTab() {
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [productMap, setProductMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [monthsAhead, setMonthsAhead] = useState(3);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog/content-calendar');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setProductMap(data.productMap || {});
      }
    } catch (e) {
      console.error('[ERROR] [ContentCalendarLoad]:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/blog/content-calendar/ai-control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', monthsAhead }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.message || 'تولید تقویم محتوایی ناموفق بود.');
      } else {
        setItems(data.items || []);
        setSuccess(data.explanation || 'تقویم محتوایی با موفقیت تولید شد.');
        await load();
      }
    } catch (e) {
      setError('خطا در ارتباط با سرور.');
    } finally {
      setGenerating(false);
    }
  };

  const mutate = async (id: string, op: 'accept' | 'dismiss' | 'restore') => {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/admin/blog/content-calendar', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, op }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'عملیات ناموفق بود.');
      } else {
        setItems(data.items || []);
        if (op === 'accept') setSuccess('مقاله‌ی کامل تولید و به صورت زمان‌بندی‌شده ذخیره شد. برای بازبینی و انتشار، آن را باز کنید.');
      }
    } catch (e) {
      setError('خطا در ارتباط با سرور.');
    } finally {
      setBusyId(null);
    }
  };

  const visibleItems = items.filter((it) => it.status !== 'dismissed');
  const dismissedCount = items.filter((it) => it.status === 'dismissed').length;

  // Group visible items by Jalali month of the suggested publish date.
  const groups: { key: string; label: string; items: CalendarItem[] }[] = [];
  for (const it of visibleItems) {
    const { key, label } = jalaliMonthKey(it.suggestedPublishAt);
    let g = groups.find((x) => x.key === key);
    if (!g) {
      g = { key, label, items: [] };
      groups.push(g);
    }
    g.items.push(it);
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Control bar */}
      <div className="bg-gradient-to-tr from-emerald-50 to-teal-50 dark:from-emerald-950/10 dark:to-teal-950/10 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-900/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shrink-0">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white">تقویم محتوایی هوشمند</h2>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-bold leading-relaxed max-w-xl">
                با تحلیل پرفروش‌ها، ترافیک، نرخ تبدیل و مناسبت‌های پیشِ‌رو، یک برنامه‌ی محتوایی زمان‌بندی‌شده می‌سازد. با پذیرش هر پیشنهاد، مقاله‌ی کامل توسط هوش مصنوعی نوشته و به صورت زمان‌بندی‌شده ذخیره می‌شود.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={monthsAhead}
              onChange={(e) => setMonthsAhead(Number(e.target.value))}
              disabled={generating}
              className="px-3 py-2.5 border border-emerald-200 dark:border-emerald-900/40 dark:bg-slate-950 rounded-2xl text-xs font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value={1}>۱ ماه آینده</option>
              <option value={2}>۲ ماه آینده</option>
              <option value={3}>۳ ماه آینده</option>
              <option value={6}>۶ ماه آینده</option>
            </select>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-2xl transition-all font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  در حال تولید...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  {items.length > 0 ? 'تولید مجدد' : 'تولید تقویم محتوایی'}
                </>
              )}
            </button>
          </div>
        </div>

        {generating && (
          <div className="mt-4 bg-white/70 dark:bg-slate-900/40 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-3.5">
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              در حال تحلیل دیتای فروشگاه و مناسبت‌ها و طراحی تقویم محتوایی... این فرایند ممکن است تا حدود یک دقیقه طول بکشد.
            </p>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-3.5 rounded-2xl text-xs font-bold border border-red-100 dark:border-red-900/30 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-2xl text-xs font-bold border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center">
          <div className="inline-flex p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 mb-4">
            <CalendarDays className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-sm font-black text-slate-800 dark:text-white">هنوز تقویمی ساخته نشده است</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-bold max-w-md mx-auto leading-relaxed">
            با کلیک روی «تولید تقویم محتوایی»، هوش مصنوعی بر اساس دیتای واقعی فروشگاه و مناسبت‌های پیشِ‌رو، موضوعات هدفمندی پیشنهاد می‌دهد که ورودی و فروش شما را افزایش می‌دهند.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
                <span className="text-xs font-black text-slate-600 dark:text-slate-300 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center gap-1.5">
                  <CalendarClock className="w-3.5 h-3.5 text-emerald-500" />
                  {group.label}
                </span>
                <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {group.items.map((item) => {
                  const meta = TYPE_META[item.type];
                  const TypeIcon = meta.icon;
                  const isAccepted = item.status === 'accepted';
                  const targetNames = (item.targetProductIds || [])
                    .map((id) => productMap[id])
                    .filter(Boolean);
                  const deepLinkPrompt = encodeURIComponent(
                    `${item.title}. ${item.summary} (مرتبط با مناسبت ${item.occasion})`
                  );

                  return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-slate-900 border rounded-3xl p-5 shadow-sm flex flex-col gap-3 transition-all ${
                        isAccepted ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black ${meta.classes}`}>
                            <TypeIcon className="w-3 h-3" />
                            {meta.label}
                          </span>
                          {item.pillar && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {item.pillar}
                            </span>
                          )}
                          {!item.isEvergreen && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400">
                              {item.occasion}
                            </span>
                          )}
                          {isAccepted && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3 h-3" />
                              زمان‌بندی شد
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-black text-slate-400 whitespace-nowrap flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" />
                          {jalaliDayLabel(item.suggestedPublishAt)}
                        </span>
                      </div>

                      <h4 className="text-sm font-black text-slate-800 dark:text-white leading-relaxed">{item.title}</h4>

                      {item.summary && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{item.summary}</p>
                      )}

                      {item.keywords?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {item.keywords.map((kw, i) => (
                            <span key={i} className="inline-flex items-center gap-1 text-[9px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg">
                              <Tag className="w-2.5 h-2.5" />
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}

                      {targetNames.length > 0 && (
                        <div className="flex items-start gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-400">
                          <Package className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                          <span className="leading-relaxed">{targetNames.join('، ')}</span>
                        </div>
                      )}

                      {item.rationale && (
                        <div className="flex items-start gap-1.5 text-[10px] font-semibold text-indigo-600/90 dark:text-indigo-400/90 bg-indigo-50/60 dark:bg-indigo-950/20 p-2.5 rounded-xl">
                          <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{item.rationale}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 mt-auto">
                        {item.type === 'blog' ? (
                          isAccepted ? (
                            <Link
                              href={item.createdPostId ? `/admin/blog/${item.createdPostId}/edit` : '/admin/blog'}
                              className="flex-1 text-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[11px] font-black transition-all shadow-sm shadow-emerald-500/20"
                            >
                              تکمیل و انتشار مقاله
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => mutate(item.id, 'accept')}
                              disabled={busyId === item.id}
                              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[11px] font-black transition-all shadow-sm shadow-blue-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                              {busyId === item.id ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  در حال تولید مقاله...
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  پذیرش و تولید مقاله
                                </>
                              )}
                            </button>
                          )
                        ) : (
                          <Link
                            href={`/admin/${item.type === 'story' ? 'stories' : 'discounts'}?aiPrompt=${deepLinkPrompt}`}
                            className="flex-1 text-center px-4 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white rounded-2xl text-[11px] font-black transition-all shadow-sm shadow-fuchsia-500/20"
                          >
                            ساخت {meta.label}
                          </Link>
                        )}

                        {!isAccepted && (
                          <button
                            type="button"
                            onClick={() => mutate(item.id, 'dismiss')}
                            disabled={busyId === item.id}
                            title="رد پیشنهاد"
                            className="px-3 py-2.5 bg-slate-100 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-2xl transition-all disabled:opacity-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {dismissedCount > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-[11px] font-bold text-slate-400">{toFa(dismissedCount)} پیشنهاد رد شده</span>
                {items
                  .filter((it) => it.status === 'dismissed')
                  .map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => mutate(it.id, 'restore')}
                      disabled={busyId === it.id}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-emerald-600 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="w-3 h-3" />
                      {it.title.slice(0, 24)}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
