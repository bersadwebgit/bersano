'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowRight, Save, CheckCircle, AlertCircle, DollarSign, Loader2 } from 'lucide-react';

interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  audience: string | null;
  priceLabel: string;
  period: string;
  annualPriceLabel: string;
  badge: string | null;
  ctaText: string;
  ctaLink: string;
  features: string[];
  highlighted: boolean;
  isActive: boolean;
  order: number;
}

export default function PlanEditor() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [featuresText, setFeaturesText] = useState('');

  const flash = (setter: (v: string) => void, msg: string) => { setter(msg); setTimeout(() => setter(''), 3500); };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/super-admin/marketing/plans');
      if (res.status === 401) { router.push('/super-admin/login'); return; }
      const all: Plan[] = await res.json();
      const found = all.find((p) => p.id === id) || null;
      setPlan(found);
      if (found) setFeaturesText((found.features || []).join('\n'));
    } catch { setError('خطای اتصال'); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { if (id) load(); }, [id, load]);

  const save = async () => {
    if (!plan) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/super-admin/marketing/plans/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...plan, features: featuresText }),
      });
      const d = await res.json();
      if (!res.ok) return flash(setError, d.error || 'خطا در ذخیره');
      flash(setSuccess, 'پلن ذخیره شد');
    } catch { flash(setError, 'خطای شبکه'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl"><Loader2 className="h-8 w-8 text-slate-800 animate-spin" /></div>;
  if (!plan) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="text-center"><p className="text-sm text-slate-600 font-bold mb-3">پلن یافت نشد</p><Link href="/super-admin/marketing" className="text-xs text-primary-600 font-bold">بازگشت</Link></div>
    </div>
  );

  const up = (patch: Partial<Plan>) => setPlan({ ...plan, ...patch });

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <Link href="/super-admin/marketing" className="flex items-center gap-0.5 text-xs text-slate-500 hover:text-slate-800 font-bold mb-2"><ArrowRight className="h-3.5 w-3.5" /> مدیریت سایت</Link>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><DollarSign className="h-5 w-5 text-slate-700" /> ویرایش پلن: {plan.name}</h2>
          <span className="text-[10px] text-slate-400 font-mono">{plan.key}</span>
        </div>

        {success && <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium"><CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" /><span>{success}</span></div>}
        {error && <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-medium"><AlertCircle className="h-4 w-4 text-red-600 shrink-0" /><span>{error}</span></div>}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 grid sm:grid-cols-2 gap-4">
          <F label="نام پلن" value={plan.name} onChange={(v) => up({ name: v })} />
          <F label="مخاطب (audience)" value={plan.audience || ''} onChange={(v) => up({ audience: v })} />
          <F label="برچسب قیمت" value={plan.priceLabel} onChange={(v) => up({ priceLabel: v })} placeholder="رایگان / ۲۹۰,۰۰۰" />
          <F label="دوره" value={plan.period} onChange={(v) => up({ period: v })} placeholder="تومان / ماهانه" />
          <F label="برچسب قیمت سالانه" value={plan.annualPriceLabel} onChange={(v) => up({ annualPriceLabel: v })} />
          <F label="بَج (badge)" value={plan.badge || ''} onChange={(v) => up({ badge: v })} placeholder="محبوب‌ترین" />
          <F label="متن دکمه" value={plan.ctaText} onChange={(v) => up({ ctaText: v })} />
          <F label="لینک دکمه" value={plan.ctaLink} onChange={(v) => up({ ctaLink: v })} placeholder="/register" />
          <div className="sm:col-span-2"><F label="توضیح کوتاه" value={plan.description || ''} onChange={(v) => up({ description: v })} textarea /></div>
          <div className="sm:col-span-2">
            <label className="text-[11px] font-bold text-slate-500 block mb-1">ویژگی‌ها (هر خط یک مورد)</label>
            <textarea value={featuresText} onChange={(e) => setFeaturesText(e.target.value)} rows={7} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
          </div>
          <F label="ترتیب" value={String(plan.order)} onChange={(v) => up({ order: Number(v) || 0 })} />
          <div className="flex items-center gap-6 pt-6">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={plan.highlighted} onChange={(e) => up({ highlighted: e.target.checked })} className="h-4 w-4" /> پیشنهادی</label>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={plan.isActive} onChange={(e) => up({ isActive: e.target.checked })} className="h-4 w-4" /> فعال</label>
          </div>
        </div>

        <button onClick={save} disabled={saving} className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50">
          <Save className="h-4 w-4" /> ذخیره پلن
        </button>
      </div>
    </div>
  );
}

function F({ label, value, onChange, textarea, placeholder }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-[11px] font-bold text-slate-500 block mb-1">{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} placeholder={placeholder} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs" />
      )}
    </div>
  );
}
