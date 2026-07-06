'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BottomNav from '@/components/layout/BottomNav';
import { Phone, Mail, Lock, ArrowRight, RefreshCw, Sparkles, Check } from 'lucide-react';

export default function CustomerLoginClient({ shopName }: { shopName: string }) {
  const router = useRouter();
  const [loginMethod, setLoginMethod] = useState<'otp' | 'password'>('otp');
  
  // OTP States
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  
  // Password States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Global States
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // OTP Inputs Refs
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer Countdown Effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // Format countdown timer (e.g. 120 -> 02:00)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle OTP digit changes
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtpValues = [...otpValues];
    newOtpValues[index] = value;
    setOtpValues(newOtpValues);

    if (value && index < 4) {
      otpRefs.current[index + 1]?.focus();
    }

    const fullCode = newOtpValues.join('');
    if (fullCode.length === 5) {
      handleVerifyOtp(undefined, fullCode);
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpValues[index] && index > 0) {
        const newOtpValues = [...otpValues];
        newOtpValues[index - 1] = '';
        setOtpValues(newOtpValues);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newOtpValues = [...otpValues];
        newOtpValues[index] = '';
        setOtpValues(newOtpValues);
      }
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setOtpSent(true);
        setTimer(120);
        setInfo('کد تایید با موفقیت پیامک شد.');
        setOtpValues(['', '', '', '', '']);
        setTimeout(() => {
          otpRefs.current[0]?.focus();
        }, 100);
      } else {
        setError(data.error || 'خطایی در ارسال کد تایید رخ داد');
      }
    } catch (err) {
      setError('خطا در برقراری ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent, codeOverride?: string) => {
    if (e) e.preventDefault();
    const finalCode = codeOverride || otpValues.join('');

    if (finalCode.length < 5) {
      setError('لطفاً کد تایید ۵ رقمی را کامل وارد کنید.');
      return;
    }

    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: finalCode }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setInfo('با موفقیت وارد شدید! در حال انتقال...');
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || 'کد تایید معتبر نیست');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setIsSuccess(true);
        setInfo('با موفقیت وارد شدید! در حال انتقال...');
        setTimeout(() => {
          router.push('/profile');
          router.refresh();
        }, 1000);
      } else {
        setError(data.error || 'ایمیل یا رمز عبور اشتباه است');
      }
    } catch (err) {
      setError('خطا در ارتباط با سرور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans pb-24 text-right">
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">ورود خریدار - {shopName}</h1>
      </header>

      <main className="p-4 flex justify-center mt-10">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">ورود به حساب کاربری</h2>
          
          {/* Method Selector */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl mb-6">
            <button
              onClick={() => { setLoginMethod('otp'); setError(''); setInfo(''); }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${loginMethod === 'otp' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
            >
              کد تایید پیامکی (OTP)
            </button>
            <button
              onClick={() => { setLoginMethod('password'); setError(''); setInfo(''); }}
              className={`flex-1 py-2 text-center text-xs font-bold rounded-lg transition-all cursor-pointer ${loginMethod === 'password' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs' : 'text-gray-500'}`}
            >
              رمز عبور ثابت
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 text-center">
              {error}
            </div>
          )}

          {info && (
            <div className="mb-4 p-3 bg-blue-50 text-blue-600 rounded-xl text-sm border border-blue-100 text-center">
              {info}
            </div>
          )}

          {loginMethod === 'otp' ? (
            !otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    شماره موبایل
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09123456789"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left dir-ltr"
                    />
                    <Phone className="w-5 h-5 absolute top-3.5 left-4 text-gray-400" />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-75"
                >
                  {loading ? 'در حال ارسال...' : 'ارسال کد تایید'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                    کد تایید پیامک شده را وارد کنید
                  </label>
                  <div className="flex gap-2 justify-center" dir="ltr">
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        type="text"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        ref={(el) => { otpRefs.current[idx] = el; }}
                        className="w-12 h-12 text-center text-lg font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || isSuccess}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-75"
                >
                  {loading ? 'در حال تایید...' : 'ورود'}
                </button>

                <div className="text-center">
                  {timer > 0 ? (
                    <span className="text-xs text-gray-400">ارسال مجدد پس از: {formatTime(timer)}</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      className="text-xs text-blue-600 font-bold hover:underline cursor-pointer"
                    >
                      ارسال مجدد کد پیامکی
                    </button>
                  )}
                </div>
              </form>
            )
          ) : (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  آدرس ایمیل
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left dir-ltr"
                  />
                  <Mail className="w-5 h-5 absolute top-3.5 left-4 text-gray-400" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  رمز عبور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-left dir-ltr"
                  />
                  <Lock className="w-5 h-5 absolute top-3.5 left-4 text-gray-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || isSuccess}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg transition-all disabled:opacity-75"
              >
                {loading ? 'در حال ورود...' : 'ورود'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            حساب کاربری ندارید؟ <Link href="/register" className="text-blue-600 font-bold hover:underline">ثبت نام کنید</Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
