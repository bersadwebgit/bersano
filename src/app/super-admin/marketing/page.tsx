'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Globe,
  Plus,
  Edit2,
  Trash2,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  FileText,
  DollarSign,
  Repeat,
  Image as ImageIcon,
  History,
  ExternalLink,
} from 'lucide-react';

type Tab = 'pages' | 'plans' | 'redirects' | 'media' | 'audit';

interface MarketingPageRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  noindex: boolean;
  updatedAt: string;
  publishedAt: string | null;
}

interface PlanRow {
  id: string;
  key: string;
  name: string;
  priceLabel: string;
  period: string;
  highlighted: boolean;
  isActive: boolean;
  order: number;
}

interface RedirectRow {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  enabled: boolean;
}

interface MediaRow {
  id: string;
  url: string;
  name: string;
  type: string;
  alt: string | null;
  createdAt: string;
}

interface AuditRow {
  id: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  published: { label: 'منتشر شده', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  draft: { label: 'پیش‌نویس', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  scheduled: { label: 'زمان‌بندی‌شده', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  archived: { label: 'بایگانی', cls: 'bg-slate-100 text-slate-400 border-slate-200' },
};

export default function MarketingCmsHub() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pages');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const [pages, setPages] = useState<MarketingPageRow[]>([]);
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [redirects, setRedirects] = useState<RedirectRow[]>([]);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);

  const flash = (setter: (v: string) => void, msg: string) => {
    setter(msg);
    setTimeout(() => setter(''), 3500);
  };

  const load = useCallback(async (t: Tab) => {
    setLoading(true);
    setError('');
    const endpoints: Record<Tab, string> = {
      pages: '/api/super-admin/marketing/pages',
      plans: '/api/super-admin/marketing/plans',
      redirects: '/api/super-admin/marketing/redirects',
      media: '/api/super-admin/marketing/media',
      audit: '/api/super-admin/marketing/audit',
    };
    try {
      const res = await fetch(endpoints[t]);
      if (res.status === 401) {
        router.push('/super-admin/login');
        return;
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || 'خطا در بارگذاری');
        return;
      }
      const data = await res.json();
      if (t === 'pages') setPages(data);
      else if (t === 'plans') setPlans(data);
      else if (t === 'redirects') setRedirects(data);
      else if (t === 'media') setMedia(data);
      else if (t === 'audit') setAudit(data);
    } catch {
      setError('خطای اتصال به سرور');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load(tab);
  }, [tab, load]);

  // ---- Page actions ----
  const createPage = async () => {
    const slug = prompt('نامک صفحه (انگلیسی، مثل landing-black-friday):')?.trim().toLowerCase();
    if (!slug) return;
    const title = prompt('عنوان صفحه:')?.trim();
    if (!title) return;
    try {
      const res = await fetch('/api/super-admin/marketing/pages', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug, title }),
      });
      const d = await res.json();
      if (!res.ok) return flash(setError, d.error || 'خطا در ایجاد صفحه');
      router.push(`/super-admin/marketing/pages/${d.id}`);
    } catch {
      flash(setError, 'خطای شبکه');
    }
  };

  const deletePage = async (id: string, title: string) => {
    if (!confirm(`حذف صفحه «${title}»؟ این عملیات بازگشت‌پذیر نیست.`)) return;
    const res = await fetch(`/api/super-admin/marketing/pages/${id}`, { method: 'DELETE' });
    if (res.ok) { flash(setSuccess, 'صفحه حذف شد'); load('pages'); }
    else { const d = await res.json().catch(() => ({})); flash(setError, d.error || 'خطا در حذف'); }
  };

  // ---- Plan actions ----
  const createPlan = async () => {
    const key = prompt('کلید پلن (انگلیسی، مثل start):')?.trim().toLowerCase();
    if (!key) return;
    const name = prompt('نام پلن:')?.trim();
    if (!name) return;
    const res = await fetch('/api/super-admin/marketing/plans', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key, name, order: plans.length }),
    });
    const d = await res.json();
    if (!res.ok) return flash(setError, d.error || 'خطا در ایجاد پلن');
    flash(setSuccess, 'پلن ساخته شد'); load('plans');
  };

  const togglePlan = async (p: PlanRow) => {
    const res = await fetch(`/api/super-admin/marketing/plans/${p.id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (res.ok) load('plans');
  };

  const deletePlan = async (id: string, name: string) => {
    if (!confirm(`حذف پلن «${name}»؟`)) return;
    const res = await fetch(`/api/super-admin/marketing/plans/${id}`, { method: 'DELETE' });
    if (res.ok) { flash(setSuccess, 'پلن حذف شد'); load('plans'); }
  };

  // ---- Redirect actions ----
  const createRedirect = async () => {
    const fromPath = prompt('مسیر مبدأ (مثل /old-page):')?.trim();
    if (!fromPath) return;
    const toPath = prompt('مسیر مقصد (مثل /new-page):')?.trim();
    if (!toPath) return;
    const res = await fetch('/api/super-admin/marketing/redirects', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fromPath, toPath, statusCode: 301 }),
    });
    const d = await res.json();
    if (!res.ok) return flash(setError, d.error || 'خطا در ایجاد ریدایرکت');
    flash(setSuccess, 'ریدایرکت ساخته شد'); load('redirects');
  };

  const deleteRedirect = async (id: string) => {
    if (!confirm('حذف این ریدایرکت؟')) return;
    const res = await fetch(`/api/super-admin/marketing/redirects/${id}`, { method: 'DELETE' });
    if (res.ok) { flash(setSuccess, 'حذف شد'); load('redirects'); }
  };

  // ---- Media actions ----
  const addMedia = async () => {
    const url = prompt('آدرس رسانه (URL کامل یا مسیر /...):')?.trim();
    if (!url) return;
    const name = prompt('نام رسانه:')?.trim();
    if (!name) return;
    const alt = prompt('متن جایگزین (alt) — برای سئو و دسترس‌پذیری:')?.trim() || '';
    const res = await fetch('/api/super-admin/marketing/media', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ url, name, alt }),
    });
    const d = await res.json();
    if (!res.ok) return flash(setError, d.error || 'خطا در ثبت رسانه');
    flash(setSuccess, 'رسانه ثبت شد'); load('media');
  };

  const deleteMedia = async (id: string) => {
    if (!confirm('حذف این رسانه از کتابخانه؟')) return;
    const res = await fetch(`/api/super-admin/marketing/media/${id}`, { method: 'DELETE' });
    if (res.ok) { flash(setSuccess, 'حذف شد'); load('media'); }
  };

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'pages', label: 'صفحات سایت', icon: FileText },
    { id: 'plans', label: 'پلن‌های قیمت', icon: DollarSign },
    { id: 'redirects', label: 'ریدایرکت‌ها', icon: Repeat },
    { id: 'media', label: 'کتابخانه رسانه', icon: ImageIcon },
    { id: 'audit', label: 'گزارش فعالیت', icon: History },
  ];

  const fdate = (d: string) => new Date(d).toLocaleDateString('fa-IR', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div>
            <Link href="/super-admin" className="flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 font-bold mb-2">
              <ArrowRight className="h-3.5 w-3.5" />
              داشبورد سوپر ادمین
            </Link>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Globe className="h-6 w-6 text-slate-700" />
              مدیریت سایت و صفحات فروش برسانا
            </h2>
            <p className="text-xs text-slate-500 mt-1">صفحات بازاریابی، پلن‌های قیمت، ریدایرکت‌ها، رسانه و گزارش فعالیت</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
          {tabs.map((t) => {
            const Ico = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Ico className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Notifications */}
        {success && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /><span>{success}</span>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" /><span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          {loading ? (
            <div className="flex flex-col justify-center items-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-slate-800 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-500 font-bold">در حال دریافت اطلاعات...</span>
            </div>
          ) : (
            <>
              {/* PAGES */}
              {tab === 'pages' && (
                <div>
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">{pages.length} صفحه</span>
                    <button onClick={createPage} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">
                      <Plus className="h-4 w-4" /> صفحه جدید
                    </button>
                  </div>
                  {pages.length === 0 ? (
                    <EmptyState text="هنوز صفحه‌ای در CMS ساخته نشده است. صفحات ثابت (خانه، قیمت‌گذاری و ...) از کد رندر می‌شوند؛ اینجا صفحات پویا/کمپین بسازید." />
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">عنوان</th>
                          <th className="px-6 py-4">وضعیت</th>
                          <th className="px-6 py-4">آخرین ویرایش</th>
                          <th className="px-6 py-4 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {pages.map((p) => {
                          const st = STATUS_LABELS[p.status] || STATUS_LABELS.draft;
                          return (
                            <tr key={p.id} className="hover:bg-slate-50/30">
                              <td className="px-6 py-4">
                                <div className="font-bold text-slate-900">{p.title}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5 select-all">/{p.slug}{p.noindex && ' · noindex'}</div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${st.cls}`}>{st.label}</span>
                              </td>
                              <td className="px-6 py-4 text-slate-500">{fdate(p.updatedAt)}</td>
                              <td className="px-6 py-4 text-left">
                                <div className="inline-flex items-center gap-2">
                                  <button onClick={() => router.push(`/super-admin/marketing/pages/${p.id}`)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg" title="ویرایش">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => deletePage(p.id, p.title)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" title="حذف">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* PLANS */}
              {tab === 'plans' && (
                <div>
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">{plans.length} پلن</span>
                    <button onClick={createPlan} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">
                      <Plus className="h-4 w-4" /> پلن جدید
                    </button>
                  </div>
                  {plans.length === 0 ? (
                    <EmptyState text="هیچ پلنی ثبت نشده است. تا زمانی که پلنی نسازید، صفحه قیمت‌گذاری از مقادیر پیش‌فرض کد استفاده می‌کند." />
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">پلن</th>
                          <th className="px-6 py-4">قیمت</th>
                          <th className="px-6 py-4">ترتیب</th>
                          <th className="px-6 py-4">وضعیت</th>
                          <th className="px-6 py-4 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {plans.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50/30">
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {p.name}
                                {p.highlighted && <span className="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded text-[9px]">پیشنهادی</span>}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.key}</div>
                            </td>
                            <td className="px-6 py-4 text-slate-600">{p.priceLabel} <span className="text-slate-400">{p.period}</span></td>
                            <td className="px-6 py-4 text-slate-500">{p.order}</td>
                            <td className="px-6 py-4">
                              <button onClick={() => togglePlan(p)} className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${p.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {p.isActive ? 'فعال' : 'غیرفعال'}
                              </button>
                            </td>
                            <td className="px-6 py-4 text-left">
                              <div className="inline-flex items-center gap-2">
                                <button onClick={() => router.push(`/super-admin/marketing/plans/${p.id}`)} className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg" title="ویرایش">
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => deletePlan(p.id, p.name)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" title="حذف">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* REDIRECTS */}
              {tab === 'redirects' && (
                <div>
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">{redirects.length} ریدایرکت</span>
                    <button onClick={createRedirect} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">
                      <Plus className="h-4 w-4" /> ریدایرکت جدید
                    </button>
                  </div>
                  {redirects.length === 0 ? (
                    <EmptyState text="هیچ ریدایرکتی تعریف نشده است. برای حفظ سئو هنگام تغییر آدرس صفحات، ریدایرکت 301 بسازید." />
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">از</th>
                          <th className="px-6 py-4">به</th>
                          <th className="px-6 py-4">کد</th>
                          <th className="px-6 py-4 text-left">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {redirects.map((r) => (
                          <tr key={r.id} className="hover:bg-slate-50/30">
                            <td className="px-6 py-4 font-mono text-[11px]">{r.fromPath}</td>
                            <td className="px-6 py-4 font-mono text-[11px] text-slate-500">{r.toPath}</td>
                            <td className="px-6 py-4">{r.statusCode}</td>
                            <td className="px-6 py-4 text-left">
                              <button onClick={() => deleteRedirect(r.id)} className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg" title="حذف">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* MEDIA */}
              {tab === 'media' && (
                <div>
                  <div className="flex justify-between items-center p-5 border-b border-slate-100">
                    <span className="text-xs font-bold text-slate-500">{media.length} رسانه</span>
                    <button onClick={addMedia} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold">
                      <Plus className="h-4 w-4" /> افزودن رسانه
                    </button>
                  </div>
                  {media.length === 0 ? (
                    <EmptyState text="کتابخانه رسانه خالی است. آدرس تصاویر/ویدیوها را اینجا ثبت کنید تا در صفحات استفاده شوند." />
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 p-5">
                      {media.map((m) => (
                        <div key={m.id} className="group relative rounded-xl border border-slate-100 overflow-hidden bg-slate-50">
                          {m.type === 'video' ? (
                            <div className="aspect-video flex items-center justify-center text-slate-400"><ImageIcon className="h-8 w-8" /></div>
                          ) : (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={m.url} alt={m.alt || m.name} className="aspect-video w-full object-cover" />
                          )}
                          <div className="p-2">
                            <div className="text-[11px] font-bold text-slate-700 truncate">{m.name}</div>
                            <div className="flex items-center justify-between mt-1">
                              <button onClick={() => navigator.clipboard?.writeText(m.url)} className="text-[10px] text-slate-400 hover:text-slate-700 font-mono truncate">کپی URL</button>
                              <button onClick={() => deleteMedia(m.id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* AUDIT */}
              {tab === 'audit' && (
                <div>
                  {audit.length === 0 ? (
                    <EmptyState text="هنوز فعالیتی ثبت نشده است." />
                  ) : (
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-50/50 text-slate-600 font-bold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">کاربر</th>
                          <th className="px-6 py-4">عملیات</th>
                          <th className="px-6 py-4">موجودیت</th>
                          <th className="px-6 py-4">تاریخ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {audit.map((a) => (
                          <tr key={a.id} className="hover:bg-slate-50/30">
                            <td className="px-6 py-4 font-bold text-slate-800">{a.actorName || 'نامشخص'}</td>
                            <td className="px-6 py-4">{a.action}</td>
                            <td className="px-6 py-4 text-slate-500">{a.entity}{a.entityId ? ` · ${a.entityId.slice(0, 6)}` : ''}</td>
                            <td className="px-6 py-4 text-slate-500">{new Date(a.createdAt).toLocaleString('fa-IR')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <ExternalLink className="h-3.5 w-3.5" />
          صفحات ثابت مثل «خانه» و «قیمت‌گذاری» همچنان از کد رندر می‌شوند و از طریق «پلن‌های قیمت» و تنظیمات سیستم قابل مدیریت‌اند.
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col justify-center items-center py-20 text-center px-6">
      <FileText className="h-12 w-12 text-slate-300 mb-3" />
      <p className="text-xs text-slate-500 max-w-md leading-relaxed">{text}</p>
    </div>
  );
}
