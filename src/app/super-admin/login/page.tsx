'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, Eye, EyeOff, RefreshCw, ArrowRight, Shield } from 'lucide-react';

export default function SuperAdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'خطا در ورود');
      }

      setInfo('احراز هویت با موفقیت انجام شد. در حال انتقال...');
      setTimeout(() => {
        router.push('/super-admin');
        router.refresh();
      }, 800);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center bg-slate-950 px-4 font-sans" dir="rtl">
      <div className="mx-auto w-full max-w-sm text-center">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-900 ring-1 ring-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-indigo-400" />
        </div>
        <h2 className="mt-5 text-2xl font-bold text-white">ورود مدیر کل</h2>
        <p className="mt-1.5 text-sm text-slate-500">دسترسی ریشه‌ای پلتفرم</p>
      </div>

      <div className="mx-auto mt-8 w-full max-w-sm rounded-3xl bg-slate-900/60 ring-1 ring-white/10 p-6 sm:p-8">

        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {info}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-xs font-medium text-slate-400">
              ایمیل
            </label>
            <div className="mt-1.5 relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <Mail className="h-4.5 w-4.5 text-slate-600" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pr-10 pl-3.5 py-3 rounded-xl border border-white/10 bg-slate-800/60 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-sm"
                placeholder="superadmin@example.com"
                dir="ltr"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-medium text-slate-400">
              رمز عبور
            </label>
            <div className="mt-1.5 relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
                <Lock className="h-4.5 w-4.5 text-slate-600" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pr-10 pl-10 py-3 rounded-xl border border-white/10 bg-slate-800/60 text-white placeholder-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all text-left font-mono tracking-widest text-sm"
                placeholder="••••••••"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'پنهان کردن رمز' : 'نمایش رمز'}
                className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-600 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2 text-sm"
          >
            {loading ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : 'ورود'}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-white/10 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-slate-600 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" /> بازگشت به سایت
          </Link>
        </div>
      </div>
    </div>
  );
}
