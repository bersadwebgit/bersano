'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowRight,
  Save,
  Eye,
  CheckCircle,
  AlertCircle,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Rocket,
  Clock,
  Archive,
  RotateCcw,
  History,
  Search,
  Layers,
  Loader2,
} from 'lucide-react';

const SECTION_TYPES = [
  { value: 'hero', label: 'هیرو (سربرگ اصلی)' },
  { value: 'featureGrid', label: 'شبکه ویژگی‌ها' },
  { value: 'pricing', label: 'جدول قیمت' },
  { value: 'comparison', label: 'جدول مقایسه' },
  { value: 'faq', label: 'سوالات متداول' },
  { value: 'cta', label: 'فراخوان اقدام (CTA)' },
  { value: 'trustBar', label: 'نوار اعتماد' },
  { value: 'richText', label: 'متن غنی (HTML)' },
  { value: 'stats', label: 'آمار' },
  { value: 'steps', label: 'مراحل' },
  { value: 'logos', label: 'لوگوها' },
];

interface Section {
  id: string;
  type: string;
  order: number;
  enabled: boolean;
  content: Record<string, any>;
  themeVariant: string;
  anchorId: string | null;
  visibility: string;
}

interface Revision {
  id: string;
  label: string | null;
  isAutosave: boolean;
  authorName: string | null;
  createdAt: string;
}

interface PageData {
  id: string;
  slug: string;
  title: string;
  status: string;
  metaTitle: string | null;
  metaDesc: string | null;
  canonicalUrl: string | null;
  ogImage: string | null;
  noindex: boolean;
  structuredData: string | null;
  scheduledAt: string | null;
  sections: Section[];
  revisions: Revision[];
}

export default function MarketingPageEditor() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRevisions, setShowRevisions] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');

  // SEO form
  const [seo, setSeo] = useState({ title: '', metaTitle: '', metaDesc: '', canonicalUrl: '', ogImage: '', noindex: false, structuredData: '' });

  const flash = (setter: (v: string) => void, msg: string) => { setter(msg); setTimeout(() => setter(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/super-admin/marketing/pages/${id}`);
      if (res.status === 401) { router.push('/super-admin/login'); return; }
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'خطا'); return; }
      const data: PageData = await res.json();
      setPage(data);
      setSeo({
        title: data.title || '',
        metaTitle: data.metaTitle || '',
        metaDesc: data.metaDesc || '',
        canonicalUrl: data.canonicalUrl || '',
        ogImage: data.ogImage || '',
        noindex: data.noindex,
        structuredData: data.structuredData || '',
      });
    } catch {
      setError('خطای اتصال');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const saveSeo = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/marketing/pages/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(seo),
      });
      const d = await res.json();
      if (!res.ok) return flash(setError, d.error || 'خطا در ذخیره');
      flash(setSuccess, 'اطلاعات سئو ذخیره شد');
      load();
    } catch { flash(setError, 'خطای شبکه'); }
    finally { setSaving(false); }
  };

  const addSection = async (type: string) => {
    const res = await fetch(`/api/super-admin/marketing/pages/${id}/sections`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, content: {} }),
    });
    const d = await res.json();
    if (!res.ok) return flash(setError, d.error || 'خطا در افزودن بخش');
    flash(setSuccess, 'بخش اضافه شد');
    load();
  };

  const updateSection = async (sectionId: string, payload: Record<string, any>) => {
    const res = await fetch(`/api/super-admin/marketing/sections/${sectionId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const d = await res.json();
    if (!res.ok) { flash(setError, d.error || 'خطا در ذخیره بخش'); return false; }
    return true;
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm('حذف این بخش؟')) return;
    const res = await fetch(`/api/super-admin/marketing/sections/${sectionId}`, { method: 'DELETE' });
    if (res.ok) { flash(setSuccess, 'بخش حذف شد'); load(); }
  };

  const reorder = async (index: number, dir: -1 | 1) => {
    if (!page) return;
    const sections = [...page.sections];
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    [sections[index], sections[target]] = [sections[target], sections[index]];
    setPage({ ...page, sections });
    const res = await fetch(`/api/super-admin/marketing/pages/${id}/sections`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ order: sections.map((s) => s.id) }),
    });
    if (!res.ok) { flash(setError, 'خطا در تغییر ترتیب'); load(); }
  };

  const doPublish = async (action: string, extra: Record<string, any> = {}) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/marketing/pages/${id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      });
      const d = await res.json();
      if (!res.ok) return flash(setError, d.error || 'خطا');
      flash(setSuccess, 'وضعیت به‌روزرسانی شد');
      load();
    } catch { flash(setError, 'خطای شبکه'); }
    finally { setSaving(false); }
  };

  const openPreview = async () => {
    const res = await fetch(`/api/super-admin/marketing/pages/${id}/preview`, { method: 'POST' });
    const d = await res.json();
    if (!res.ok) return flash(setError, d.error || 'خطا در ساخت پیش‌نمایش');
    window.open(d.url, '_blank');
  };

  const rollback = async (revisionId: string) => {
    if (!confirm('بازگردانی صفحه به این نسخه؟ وضعیت فعلی به‌صورت خودکار در نسخه‌ها ذخیره می‌شود.')) return;
    const res = await fetch(`/api/super-admin/marketing/revisions/${revisionId}/rollback`, { method: 'POST' });
    if (res.ok) { flash(setSuccess, 'صفحه بازگردانی شد'); setShowRevisions(false); load(); }
    else { const d = await res.json().catch(() => ({})); flash(setError, d.error || 'خطا در بازگردانی'); }
  };

  const snapshot = async () => {
    const label = prompt('برچسب این نسخه (اختیاری):')?.trim() || undefined;
    const res = await fetch(`/api/super-admin/marketing/pages/${id}/revisions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ label }),
    });
    if (res.ok) { flash(setSuccess, 'نسخه ذخیره شد'); load(); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-slate-800 animate-spin" />
          <span className="text-xs text-slate-500 font-bold">در حال بارگذاری صفحه...</span>
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <p className="text-sm text-slate-600 font-bold mb-3">صفحه یافت نشد</p>
          <Link href="/super-admin/marketing" className="text-xs text-primary-600 font-bold">بازگشت به لیست</Link>
        </div>
      </div>
    );
  }

  const STATUS_LABELS: Record<string, string> = { published: 'منتشر شده', draft: 'پیش‌نویس', scheduled: 'زمان‌بندی‌شده', archived: 'بایگانی' };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <Link href="/super-admin/marketing" className="flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 font-bold mb-2">
              <ArrowRight className="h-3.5 w-3.5" /> مدیریت سایت
            </Link>
            <h2 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-slate-700" />
              {page.title}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-slate-400 font-mono select-all">/{page.slug}</span>
              <span className="bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-md font-bold text-[10px]">{STATUS_LABELS[page.status]}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openPreview} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold">
              <Eye className="h-4 w-4" /> پیش‌نمایش
            </button>
            <button onClick={() => setShowRevisions((v) => !v)} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold">
              <History className="h-4 w-4" /> تاریخچه ({page.revisions.length})
            </button>
            {page.status !== 'published' ? (
              <button onClick={() => doPublish('publish')} disabled={saving} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                <Rocket className="h-4 w-4" /> انتشار
              </button>
            ) : (
              <button onClick={() => doPublish('unpublish')} disabled={saving} className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
                لغو انتشار
              </button>
            )}
            <button onClick={() => doPublish('archive')} disabled={saving} className="flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-500 px-3 py-2 rounded-xl text-xs font-bold">
              <Archive className="h-4 w-4" /> بایگانی
            </button>
          </div>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /><span>{success}</span></div>}
        {error && <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium"><AlertCircle className="h-4 w-4 text-red-600 shrink-0" /><span>{error}</span></div>}

        {/* Revisions panel */}
        {showRevisions && (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><History className="h-4 w-4" /> تاریخچه نسخه‌ها</h3>
              <button onClick={snapshot} className="text-xs font-bold text-primary-600 hover:text-primary-700">+ ذخیره نسخه فعلی</button>
            </div>
            {page.revisions.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">هنوز نسخه‌ای ذخیره نشده است.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {page.revisions.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div>
                      <div className="text-xs font-bold text-slate-700">{r.label || 'بدون برچسب'}{r.isAutosave && <span className="text-[10px] text-slate-400 mr-1">(خودکار)</span>}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{r.authorName || 'نامشخص'} · {new Date(r.createdAt).toLocaleString('fa-IR')}</div>
                    </div>
                    <button onClick={() => rollback(r.id)} className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg">
                      <RotateCcw className="h-3.5 w-3.5" /> بازگردانی
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Schedule */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-3"><Clock className="h-4 w-4" /> زمان‌بندی انتشار</h3>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="flex-1 w-full">
              <label className="text-[11px] font-bold text-slate-500 block mb-1">تاریخ و ساعت انتشار (آینده)</label>
              <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
            </div>
            <button onClick={() => scheduleAt && doPublish('schedule', { scheduledAt: new Date(scheduleAt).toISOString() })} disabled={!scheduleAt || saving} className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
              زمان‌بندی
            </button>
          </div>
          {page.scheduledAt && <p className="text-[11px] text-amber-600 font-bold mt-2">زمان‌بندی فعلی: {new Date(page.scheduledAt).toLocaleString('fa-IR')}</p>}
        </div>

        {/* SEO */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <h3 className="text-sm font-black text-slate-800 flex items-center gap-2 mb-4"><Search className="h-4 w-4" /> سئو و متادیتا</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="عنوان صفحه" value={seo.title} onChange={(v) => setSeo({ ...seo, title: v })} />
            <Field label="Meta Title (اختیاری)" value={seo.metaTitle} onChange={(v) => setSeo({ ...seo, metaTitle: v })} />
            <Field label="Meta Description" value={seo.metaDesc} onChange={(v) => setSeo({ ...seo, metaDesc: v })} textarea />
            <Field label="Canonical URL" value={seo.canonicalUrl} onChange={(v) => setSeo({ ...seo, canonicalUrl: v })} placeholder="https://bersana.ir/..." />
            <Field label="OG Image URL" value={seo.ogImage} onChange={(v) => setSeo({ ...seo, ogImage: v })} placeholder="https://..." />
            <div className="flex items-center gap-2 pt-6">
              <input id="noindex" type="checkbox" checked={seo.noindex} onChange={(e) => setSeo({ ...seo, noindex: e.target.checked })} className="h-4 w-4" />
              <label htmlFor="noindex" className="text-xs font-bold text-slate-600">noindex (از موتور جستجو پنهان شود)</label>
            </div>
            <div className="sm:col-span-2">
              <Field label="داده ساختاریافته JSON-LD (اختیاری، باید JSON معتبر باشد)" value={seo.structuredData} onChange={(v) => setSeo({ ...seo, structuredData: v })} textarea mono />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={saveSeo} disabled={saving} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
              <Save className="h-4 w-4" /> ذخیره سئو
            </button>
          </div>
        </div>

        {/* Sections */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2"><Layers className="h-4 w-4" /> بخش‌های صفحه ({page.sections.length})</h3>
            <div className="relative group">
              <button className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold">
                <Plus className="h-4 w-4" /> افزودن بخش
              </button>
              <div className="absolute left-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 max-h-72 overflow-auto">
                {SECTION_TYPES.map((t) => (
                  <button key={t.value} onClick={() => addSection(t.value)} className="w-full text-right px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {page.sections.length === 0 ? (
            <p className="text-xs text-slate-400 py-10 text-center">هنوز بخشی اضافه نشده است. با «افزودن بخش» شروع کنید.</p>
          ) : (
            <div className="space-y-3">
              {page.sections.map((s, idx) => (
                <SectionEditor
                  key={s.id}
                  section={s}
                  index={idx}
                  total={page.sections.length}
                  onReorder={reorder}
                  onUpdate={updateSection}
                  onDelete={deleteSection}
                  onSaved={() => { flash(setSuccess, 'بخش ذخیره شد'); load(); }}
                  onError={(m) => flash(setError, m)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, textarea, mono, placeholder }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; mono?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-500 block mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={mono ? 6 : 2} placeholder={placeholder} className={`w-full border border-slate-200 rounded-xl px-3 py-2 text-xs ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
      )}
    </div>
  );
}

function SectionEditor({ section, index, total, onReorder, onUpdate, onDelete, onSaved, onError }: {
  section: Section;
  index: number;
  total: number;
  onReorder: (index: number, dir: -1 | 1) => void;
  onUpdate: (id: string, payload: Record<string, any>) => Promise<boolean>;
  onDelete: (id: string) => void;
  onSaved: () => void;
  onError: (m: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [contentText, setContentText] = useState(JSON.stringify(section.content ?? {}, null, 2));
  const [themeVariant, setThemeVariant] = useState(section.themeVariant);
  const [anchorId, setAnchorId] = useState(section.anchorId || '');
  const [visibility, setVisibility] = useState(section.visibility);
  const [savingSec, setSavingSec] = useState(false);

  const typeLabel = SECTION_TYPES.find((t) => t.value === section.type)?.label || section.type;

  const toggleEnabled = async () => {
    await onUpdate(section.id, { enabled: !section.enabled });
    onSaved();
  };

  const save = async () => {
    let content: Record<string, any>;
    try {
      content = JSON.parse(contentText);
    } catch {
      onError('محتوای JSON معتبر نیست');
      return;
    }
    setSavingSec(true);
    const ok = await onUpdate(section.id, { content, themeVariant, anchorId, visibility });
    setSavingSec(false);
    if (ok) onSaved();
  };

  return (
    <div className={`border rounded-xl ${section.enabled ? 'border-slate-200' : 'border-dashed border-slate-300 bg-slate-50/50'}`}>
      <div className="flex items-center justify-between p-3">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <button onClick={() => onReorder(index, -1)} disabled={index === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
            <button onClick={() => onReorder(index, 1)} disabled={index === total - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
          </div>
          <button onClick={() => setOpen((v) => !v)} className="text-right">
            <div className="text-xs font-black text-slate-800">{typeLabel}</div>
            <div className="text-[10px] text-slate-400 font-mono">{section.type}{anchorId ? ` · #${anchorId}` : ''}{visibility !== 'all' ? ` · ${visibility}` : ''}</div>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleEnabled} className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${section.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
            {section.enabled ? 'فعال' : 'غیرفعال'}
          </button>
          <button onClick={() => setOpen((v) => !v)} className="text-slate-500 hover:text-slate-800 text-xs font-bold">{open ? 'بستن' : 'ویرایش'}</button>
          <button onClick={() => onDelete(section.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 p-4 space-y-3">
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">تم</label>
              <select value={themeVariant} onChange={(e) => setThemeVariant(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <option value="surface">روشن</option>
                <option value="muted">خاکستری</option>
                <option value="inverse">تیره</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">Anchor ID</label>
              <input value={anchorId} onChange={(e) => setAnchorId(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" dir="ltr" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-slate-500 block mb-1">نمایش در</label>
              <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs">
                <option value="all">همه دستگاه‌ها</option>
                <option value="desktop">فقط دسکتاپ</option>
                <option value="mobile">فقط موبایل</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 block mb-1">محتوای بخش (JSON)</label>
            <textarea value={contentText} onChange={(e) => setContentText(e.target.value)} rows={10} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono" dir="ltr" />
            <p className="text-[10px] text-slate-400 mt-1">فیلدهای هر نوع بخش (مثلاً برای هیرو: title، subtitle، primaryLabel، primaryHref) را به‌صورت JSON وارد کنید.</p>
          </div>
          <button onClick={save} disabled={savingSec} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-50">
            <Save className="h-4 w-4" /> ذخیره بخش
          </button>
        </div>
      )}
    </div>
  );
}
