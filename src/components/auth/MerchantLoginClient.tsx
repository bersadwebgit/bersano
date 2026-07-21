'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, ArrowRight, Sparkles, Check, Store } from 'lucide-react';

function getBaseDomain(host: string): string {
  if (!host) return 'localhost:3000';
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}(?::[0-9]+)?$/;
  if (ipRegex.test(host)) return host;

  const hostParts = host.split(':');
  const domainAndSubdomains = hostParts[0];
  const port = hostParts[1] ? `:${hostParts[1]}` : '';

  const parts = domainAndSubdomains.split('.');
  const tld = parts[parts.length - 1].toLowerCase();

  const localTLDs = ['localhost', 'local', 'test', 'dev', 'lan'];
  if (localTLDs.includes(tld) || domainAndSubdomains.toLowerCase() === 'localhost') {
    return `localhost${port}`;
  }
  
  if (parts.length <= 2) return host;
  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  
  const isSLD = ['com', 'co', 'org', 'net', 'gov', 'edu'].includes(secondLast.toLowerCase());
  if (isSLD && parts.length >= 3) {
    return `${parts[parts.length - 3]}.${secondLast}.${last}${port}`;
  }
  return `${secondLast}.${last}${port}`;
}

export default function MerchantLoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState('localhost:3000');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(getBaseDomain(window.location.host));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/merchant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setInfo('ورود با موفقیت انجام شد. در حال انتقال به پنل مدیریت...');
        
        // Redirect to merchant's subdomain dashboard
        setTimeout(() => {
          const protocol = window.location.protocol;
          window.location.href = `${protocol}//${data.subdomain}.${origin}/admin`;
        }, 1000);
      } else {
        setError(data.error || 'مشخصات وارد شده نادرست است.');
      }
    } catch {
      setError('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="merchant-auth-page min-h-screen bg-slate-50 dark:bg-slate-950 font-sans flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 text-right">
      <div className="merchant-auth-card w-full max-w-md bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-lg font-black text-slate-900 dark:text-white">برسانا</span>
              <span className="text-[10px] font-bold text-blue-600">ورود فروشندگان و مدیران</span>
            </div>
          </Link>
          <h2 className="text-lg font-black text-slate-950 dark:text-white pt-2">ورود به پنل مدیریت فروشگاه</h2>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-xs font-bold border border-red-100/50 dark:border-red-900/30 flex items-center gap-2">
            <Check className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {info && (
          <div className="bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 p-4 rounded-2xl text-xs font-bold border border-blue-100/50 dark:border-blue-900/30 flex items-center gap-2 animate-pulse">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>{info}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">آدرس ایمیل شما</label>
            <div className="relative">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all text-left dir-ltr font-mono"
                dir="ltr"
              />
              <Mail className="w-4.5 h-4.5 absolute top-3.5 left-4 text-slate-400" />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">رمز عبور ثابت</label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="********"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:ring-2 focus:ring-blue-500/10 focus:bg-white focus:border-blue-500 outline-none text-xs font-semibold text-slate-900 dark:text-white transition-all text-left dir-ltr font-mono"
                dir="ltr"
              />
              <Lock className="w-4.5 h-4.5 absolute top-3.5 left-4 text-slate-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-2xl text-xs font-black shadow-lg shadow-blue-500/10 transition-all flex items-center justify-center gap-1.5 disabled:opacity-75 cursor-pointer pt-4"
          >
            {loading ? 'در حال ورود...' : 'ورود به پنل مدیریت'}
          </button>
        </form>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-400 font-bold">
            هنوز فروشگاهی نساخته‌اید؟{' '}
            <Link href="/register" className="text-blue-600 hover:underline">
              ثبت نام و ساخت فروشگاه هوشمند
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
